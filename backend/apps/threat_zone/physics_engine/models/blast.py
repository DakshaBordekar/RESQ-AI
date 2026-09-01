"""
RESQ-ENG-SPEC-2026-001 — Blast Overpressure Model (EQ-BLAST-01 to EQ-BLAST-03)
TNT Equivalency & Sadovsky Peak Overpressure (Sadovsky 1952, Hopkinson-Cranz 1915/1926)
"""

import math
from dataclasses import dataclass, asdict
from typing import Tuple, Union, Dict, Any
import numpy as np

from ..core.constants import (
    ATMOSPHERIC_PRESSURE_BAR,
    ATMOSPHERIC_PRESSURE_KPA,
    TNT_ENERGY_J_KG,
)
from ..core.units import kpa_to_psi
from ..core.exceptions import DomainException, NegativeConsequenceException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO


# Numerical clamping limits
MIN_SCALED_DISTANCE_Z: float = 0.5  # m/kg^(1/3)
MAX_SCALED_DISTANCE_Z: float = 50.0  # m/kg^(1/3)
MAX_OVERPRESSURE_CAP_KPA: float = 2000.0  # 20 bar (Mach stem limit)


@dataclass(frozen=True)
class BlastResultDTO:
    """Calculated blast overpressure parameters at receiver standoff."""
    standoff_distance_m: float
    equivalent_tnt_mass_kg: float
    scaled_distance_z: float
    overpressure_bar: float
    overpressure_kpa: float
    overpressure_psi: float
    is_within_validity_range: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def calculate_tnt_equivalent_mass(
    participating_vapor_mass_kg: float,
    heat_of_combustion_j_kg: float,
    explosion_yield_factor: float,
    tnt_energy_j_kg: float = TNT_ENERGY_J_KG,
) -> float:
    """
    EQ-BLAST-01: Equivalent TNT explosive mass.

    Formula:
        W_TNT = (M_vapor * Delta_Hc * eta_explosion) / Delta_H_TNT

    Outputs:
        W_TNT [kg]
    """
    if participating_vapor_mass_kg <= 0.0:
        return 0.0
    if heat_of_combustion_j_kg <= 0.0:
        raise DomainException(f"Heat of combustion must be positive, got {heat_of_combustion_j_kg}")
    if explosion_yield_factor <= 0.0:
        raise DomainException(f"Explosion yield factor must be positive, got {explosion_yield_factor}")

    w_tnt = (participating_vapor_mass_kg * heat_of_combustion_j_kg * explosion_yield_factor) / tnt_energy_j_kg
    return float(w_tnt)


def calculate_scaled_distance(
    r_target_m: Union[float, np.ndarray],
    w_tnt_kg: float,
) -> Union[float, np.ndarray]:
    """
    EQ-BLAST-02: Hopkinson-Cranz scaled distance.

    Formula:
        Z = R_target / (W_TNT)^(1/3)

    Outputs:
        Z [m/kg^(1/3)]
    """
    if w_tnt_kg <= 0.0:
        if isinstance(r_target_m, (int, float)):
            return float("inf")
        else:
            return np.full_like(r_target_m, np.inf, dtype=np.float64)

    w_cube_root = w_tnt_kg ** (1.0 / 3.0)

    if isinstance(r_target_m, (int, float)):
        r_safe = max(1.0, float(r_target_m))
        return float(r_safe / w_cube_root)
    else:
        r_arr = np.asarray(r_target_m, dtype=np.float64)
        r_safe = np.maximum(1.0, r_arr)
        return r_safe / w_cube_root


def calculate_sadovsky_overpressure(
    z_scaled: Union[float, np.ndarray],
) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray], Union[float, np.ndarray]]:
    """
    EQ-BLAST-03: Sadovsky Closed-Form Peak Incident Blast Overpressure.

    Formula:
        Delta_P_bar = P0 * [ 0.084/Z + 0.27/(Z^2) + 0.70/(Z^3) ]
        Delta_P_kPa = Delta_P_bar * 100.0
        Delta_P_psi = Delta_P_kPa * 0.1450377

    Clamping:
        Z < 0.5: clamp to 20.0 bar (2000.0 kPa, Mach stem physical limit)

    Outputs:
        (delta_p_bar, delta_p_kpa, delta_p_psi)
    """
    if isinstance(z_scaled, (int, float)):
        z = float(z_scaled)
        if math.isinf(z) or z > 1e6:
            return 0.0, 0.0, 0.0
        if z <= 0.0:
            raise DomainException(f"Scaled distance Z must be positive, got {z}")

        if z < MIN_SCALED_DISTANCE_Z:
            p_kpa = MAX_OVERPRESSURE_CAP_KPA
            p_bar = p_kpa / 100.0
            p_psi = kpa_to_psi(p_kpa)
            return float(p_bar), float(p_kpa), float(p_psi)

        # Sadovsky cubic polynomial in 1/Z
        p_bar = ATMOSPHERIC_PRESSURE_BAR * (
            (0.084 / z) + (0.27 / (z ** 2)) + (0.70 / (z ** 3))
        )
        p_kpa = p_bar * 100.0
        p_psi = kpa_to_psi(p_kpa)
        return float(p_bar), float(p_kpa), float(p_psi)
    else:
        z_arr = np.asarray(z_scaled, dtype=np.float64)
        if np.any(z_arr <= 0.0):
            raise DomainException("Scaled distance array contains values <= 0.")

        # Compute polynomial where valid
        z_safe = np.maximum(MIN_SCALED_DISTANCE_Z, z_arr)
        p_bar_arr = ATMOSPHERIC_PRESSURE_BAR * (
            (0.084 / z_safe) + (0.27 / (z_safe ** 2)) + (0.70 / (z_safe ** 3))
        )
        p_kpa_arr = p_bar_arr * 100.0

        # Apply Mach stem cap for Z < 0.5
        p_kpa_arr = np.where(z_arr < MIN_SCALED_DISTANCE_Z, MAX_OVERPRESSURE_CAP_KPA, p_kpa_arr)
        p_kpa_arr = np.where(np.isinf(z_arr), 0.0, p_kpa_arr)

        p_bar_arr = p_kpa_arr / 100.0
        p_psi_arr = p_kpa_arr * 0.1450377377
        return p_bar_arr, p_kpa_arr, p_psi_arr


def evaluate_blast_overpressure(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    r_target_m: float,
) -> BlastResultDTO:
    """
    Evaluate blast consequence at stand-off distance r_target_m.
    """
    w_tnt = calculate_tnt_equivalent_mass(
        participating_vapor_mass_kg=source.participating_vapor_mass_kg,
        heat_of_combustion_j_kg=material.heat_of_combustion_j_kg,
        explosion_yield_factor=scenario.release.explosion_yield_factor,
    )

    z = calculate_scaled_distance(r_target_m, w_tnt)
    p_bar, p_kpa, p_psi = calculate_sadovsky_overpressure(z)

    is_valid = MIN_SCALED_DISTANCE_Z <= z <= MAX_SCALED_DISTANCE_Z if w_tnt > 0 else True

    return BlastResultDTO(
        standoff_distance_m=float(r_target_m),
        equivalent_tnt_mass_kg=float(w_tnt),
        scaled_distance_z=float(z) if not math.isinf(z) else 999999.0,
        overpressure_bar=float(p_bar),
        overpressure_kpa=float(p_kpa),
        overpressure_psi=float(p_psi),
        is_within_validity_range=is_valid,
    )
