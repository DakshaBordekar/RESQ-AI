"""
RESQ-ENG-SPEC-2026-001 — Point Consequence Evaluation Engine (Phase 6)
Deterministic, atomic multi-hazard point evaluation decoupled from spatial grids and UI.
"""

import math
from dataclasses import dataclass, asdict, field
from typing import Dict, Any, List, Optional
import numpy as np

from ..core.constants import (
    MODEL_VERSION,
    MIN_STANDOFF_DISTANCE_M,
    PI,
)
from ..core.exceptions import (
    DomainException,
    InvalidCoordinatesException,
)
from ..core.units import normalize_angle_360
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .thermal import evaluate_thermal_radiation
from .blast import evaluate_blast_overpressure


# Spatial validity domain limit for screening mode [m]
MAX_SPATIAL_EXTENT_M: float = 25000.0


@dataclass(frozen=True)
class PointEvaluationDTO:
    """Atomic multi-hazard consequence result at a spatial receiver coordinate."""
    x_m: float
    y_m: float
    z_m: float
    distance_m: float
    bearing_deg: float
    thermal_flux_kw_m2: float
    blast_overpressure_kpa: float
    blast_overpressure_psi: float
    thermal_band: str
    blast_band: str
    combined_band: str
    model_version: str = MODEL_VERSION
    warnings: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _classify_preliminary_thermal_band(flux_kw_m2: float) -> str:
    """Preliminary thermal hazard band classification pursuant to API 521."""
    if flux_kw_m2 >= 37.5:
        return "RED_CRITICAL"
    elif flux_kw_m2 >= 9.5:
        return "ORANGE_SEVERE"
    elif flux_kw_m2 >= 4.7:
        return "YELLOW_MODERATE"
    elif flux_kw_m2 >= 1.4:
        return "GREEN_ADVISORY"
    else:
        return "NONE"


def _classify_preliminary_blast_band(overpressure_kpa: float) -> str:
    """Preliminary blast hazard band classification pursuant to CCPS / FEMA."""
    if overpressure_kpa >= 70.0:
        return "RED_CRITICAL"
    elif overpressure_kpa >= 20.7:
        return "ORANGE_SEVERE"
    elif overpressure_kpa >= 6.9:
        return "YELLOW_MODERATE"
    elif overpressure_kpa >= 2.0:
        return "GREEN_ADVISORY"
    else:
        return "NONE"


def _combine_bands(thermal_band: str, blast_band: str) -> str:
    """Multi-criteria worst-case decision band combination."""
    rank_map = {
        "NONE": 0,
        "GREEN_ADVISORY": 1,
        "YELLOW_MODERATE": 2,
        "ORANGE_SEVERE": 3,
        "RED_CRITICAL": 4,
    }
    inv_map = {v: k for k, v in rank_map.items()}

    t_rank = rank_map.get(thermal_band, 0)
    b_rank = rank_map.get(blast_band, 0)
    max_rank = max(t_rank, b_rank)
    return inv_map[max_rank]


def evaluate_point(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    x_m: float,
    y_m: float,
    z_m: float = 0.0,
) -> PointEvaluationDTO:
    """
    Atomic point consequence evaluation:
    Calculates distance, bearing, thermal radiation flux, blast overpressure,
    and severity classifications for an arbitrary receiver at (x, y, z).
    """
    if abs(x_m) > MAX_SPATIAL_EXTENT_M or abs(y_m) > MAX_SPATIAL_EXTENT_M:
        raise InvalidCoordinatesException(
            f"Receiver coordinate ({x_m}, {y_m}) m exceeds spatial domain limit +/-{MAX_SPATIAL_EXTENT_M} m."
        )

    # Calculate 3D radial distance and azimuth
    r_ground = math.sqrt(x_m ** 2 + y_m ** 2)
    r_3d = math.sqrt(x_m ** 2 + y_m ** 2 + z_m ** 2)
    r_safe = max(MIN_STANDOFF_DISTANCE_M, r_3d)

    # Compass bearing (0° = North (+y), 90° = East (+x))
    # atan2(x, y) gives azimuth from North clockwise
    bearing_rad = math.atan2(x_m, y_m)
    bearing_deg = normalize_angle_360(math.degrees(bearing_rad))

    warnings: List[str] = []

    # 1. Thermal Radiation Evaluation
    thermal_res = evaluate_thermal_radiation(scenario, source, material, r_safe)
    thermal_flux = thermal_res.incident_flux_kw_m2

    # 2. Blast Overpressure Evaluation
    blast_res = evaluate_blast_overpressure(scenario, source, material, r_safe)
    blast_kpa = blast_res.overpressure_kpa
    blast_psi = blast_res.overpressure_psi

    if not blast_res.is_within_validity_range:
        warnings.append(f"Scaled blast distance Z={blast_res.scaled_distance_z:.2f} m/kg^(1/3) is outside calibrated model range [0.5, 50.0].")

    # 3. Severity Band Mapping
    t_band = _classify_preliminary_thermal_band(thermal_flux)
    b_band = _classify_preliminary_blast_band(blast_kpa)
    c_band = _combine_bands(t_band, b_band)

    return PointEvaluationDTO(
        x_m=float(x_m),
        y_m=float(y_m),
        z_m=float(z_m),
        distance_m=float(r_3d),
        bearing_deg=float(bearing_deg),
        thermal_flux_kw_m2=float(thermal_flux),
        blast_overpressure_kpa=float(blast_kpa),
        blast_overpressure_psi=float(blast_psi),
        thermal_band=t_band,
        blast_band=b_band,
        combined_band=c_band,
        model_version=MODEL_VERSION,
        warnings=warnings,
    )
