"""
RESQ-ENG-SPEC-2026-001 — Multi-Criteria Severity & Zone Classification Model (Phase 8)
Standardized consequence thresholds (API 521, CCPS, FEMA 426) & inverse distance solvers.
"""

import math
from dataclasses import dataclass, asdict
from enum import Enum
from typing import Dict, Any, Tuple, Optional
import numpy as np

from ..core.constants import (
    THERMAL_THRESHOLDS_KW_M2,
    BLAST_THRESHOLDS_KPA,
    MIN_STANDOFF_DISTANCE_M,
    MAX_CALCULATION_DISTANCE_M,
)
from ..core.exceptions import DomainException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .thermal import (
    calculate_thomas_flame_length,
    calculate_surface_emissive_power,
    calculate_incident_thermal_flux,
)
from .blast import (
    calculate_tnt_equivalent_mass,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
)


class HazardLevel(str, Enum):
    RED_CRITICAL = "RED_CRITICAL"
    ORANGE_SEVERE = "ORANGE_SEVERE"
    YELLOW_MODERATE = "YELLOW_MODERATE"
    GREEN_ADVISORY = "GREEN_ADVISORY"
    SAFE = "SAFE"


@dataclass(frozen=True)
class SeverityClassificationDTO:
    """Multi-hazard discrete classification output."""
    thermal_flux_kw_m2: float
    blast_overpressure_kpa: float
    thermal_level: HazardLevel
    blast_level: HazardLevel
    combined_level: HazardLevel
    thermal_description: str
    blast_description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "thermal_flux_kw_m2": self.thermal_flux_kw_m2,
            "blast_overpressure_kpa": self.blast_overpressure_kpa,
            "thermal_level": self.thermal_level.value,
            "blast_level": self.blast_level.value,
            "combined_level": self.combined_level.value,
            "thermal_description": self.thermal_description,
            "blast_description": self.blast_description,
        }


@dataclass(frozen=True)
class HazardZoneRadiiDTO:
    """Exact standoff boundary radii for each hazard zone [m]."""
    thermal_red_m: float
    thermal_orange_m: float
    thermal_yellow_m: float
    thermal_green_m: float

    blast_red_m: float
    blast_orange_m: float
    blast_yellow_m: float
    blast_green_m: float

    combined_red_m: float
    combined_orange_m: float
    combined_yellow_m: float
    combined_green_m: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def classify_severity(
    thermal_flux_kw_m2: float,
    blast_overpressure_kpa: float,
) -> SeverityClassificationDTO:
    """
    Map continuous thermal radiation flux and blast overpressure to discrete hazard levels.
    """
    # 1. Thermal Level
    if thermal_flux_kw_m2 >= THERMAL_THRESHOLDS_KW_M2["RED"]:
        t_lvl = HazardLevel.RED_CRITICAL
        t_desc = "100% lethality in 1 min; structural failure of process equipment."
    elif thermal_flux_kw_m2 >= THERMAL_THRESHOLDS_KW_M2["ORANGE"]:
        t_lvl = HazardLevel.ORANGE_SEVERE
        t_desc = "Second-degree burn injury in 20 seconds; severe pain."
    elif thermal_flux_kw_m2 >= THERMAL_THRESHOLDS_KW_M2["YELLOW"]:
        t_lvl = HazardLevel.YELLOW_MODERATE
        t_desc = "Second-degree burn injury in 30 seconds; pain threshold in 15 seconds."
    elif thermal_flux_kw_m2 >= THERMAL_THRESHOLDS_KW_M2["GREEN"]:
        t_lvl = HazardLevel.GREEN_ADVISORY
        t_desc = "Public safety advisory threshold; prolonged exposure without pain."
    else:
        t_lvl = HazardLevel.SAFE
        t_desc = "Within safe operational background limit."

    # 2. Blast Level
    if blast_overpressure_kpa >= BLAST_THRESHOLDS_KPA["RED"]:
        b_lvl = HazardLevel.RED_CRITICAL
        b_desc = "Total structural destruction, heavy process equipment displacement."
    elif blast_overpressure_kpa >= BLAST_THRESHOLDS_KPA["ORANGE"]:
        b_lvl = HazardLevel.ORANGE_SEVERE
        b_desc = "Major structural damage, partial building collapse, severe injuries."
    elif blast_overpressure_kpa >= BLAST_THRESHOLDS_KPA["YELLOW"]:
        b_lvl = HazardLevel.YELLOW_MODERATE
        b_desc = "Partial wall and roof failure, widespread window shattering."
    elif blast_overpressure_kpa >= BLAST_THRESHOLDS_KPA["GREEN"]:
        b_lvl = HazardLevel.GREEN_ADVISORY
        b_desc = "Occasional window glass breakage; public boundary safety limit."
    else:
        b_lvl = HazardLevel.SAFE
        b_desc = "Within safe acoustic limit."

    # 3. Combined Level (Worst-Case)
    rank_map = {
        HazardLevel.SAFE: 0,
        HazardLevel.GREEN_ADVISORY: 1,
        HazardLevel.YELLOW_MODERATE: 2,
        HazardLevel.ORANGE_SEVERE: 3,
        HazardLevel.RED_CRITICAL: 4,
    }
    inv_map = {v: k for k, v in rank_map.items()}
    c_lvl = inv_map[max(rank_map[t_lvl], rank_map[b_lvl])]

    return SeverityClassificationDTO(
        thermal_flux_kw_m2=float(thermal_flux_kw_m2),
        blast_overpressure_kpa=float(blast_overpressure_kpa),
        thermal_level=t_lvl,
        blast_level=b_lvl,
        combined_level=c_lvl,
        thermal_description=t_desc,
        blast_description=b_desc,
    )


def _solve_thermal_radius_bisection(
    target_flux_kw_m2: float,
    d_pool_m: float,
    l_flame_m: float,
    e_p_kw_m2: float,
    relative_humidity: float,
    ambient_temp_k: float,
) -> float:
    """
    Bracketed bisection solver to determine exact distance R where incident flux equals target threshold.
    """
    # Check if flame emissive power can even reach target flux
    if e_p_kw_m2 < target_flux_kw_m2:
        return 0.0

    r_pool_edge = d_pool_m * 0.5
    f_at_edge = calculate_incident_thermal_flux(
        r_pool_edge + 0.1, d_pool_m, l_flame_m, e_p_kw_m2, relative_humidity, ambient_temp_k
    )

    if f_at_edge < target_flux_kw_m2:
        return 0.0

    r_low = r_pool_edge + 0.01
    r_high = MAX_CALCULATION_DISTANCE_M

    # Check outer bracket
    f_high = calculate_incident_thermal_flux(
        r_high, d_pool_m, l_flame_m, e_p_kw_m2, relative_humidity, ambient_temp_k
    )
    if f_high >= target_flux_kw_m2:
        return r_high

    # Perform bisection (50 iterations = machine precision < 1mm)
    for _ in range(50):
        r_mid = (r_low + r_high) * 0.5
        f_mid = calculate_incident_thermal_flux(
            r_mid, d_pool_m, l_flame_m, e_p_kw_m2, relative_humidity, ambient_temp_k
        )
        if f_mid > target_flux_kw_m2:
            r_low = r_mid
        else:
            r_high = r_mid

    return float((r_low + r_high) * 0.5)


def _solve_blast_radius_bisection(
    target_kpa: float,
    w_tnt_kg: float,
) -> float:
    """
    Solve exact distance R where Sadovsky blast overpressure equals target threshold.
    """
    if w_tnt_kg <= 0.0:
        return 0.0

    r_low = 1.0
    r_high = MAX_CALCULATION_DISTANCE_M

    z_low = calculate_scaled_distance(r_low, w_tnt_kg)
    _, p_low, _ = calculate_sadovsky_overpressure(z_low)

    if p_low < target_kpa:
        return 0.0

    z_high = calculate_scaled_distance(r_high, w_tnt_kg)
    _, p_high, _ = calculate_sadovsky_overpressure(z_high)
    if p_high >= target_kpa:
        return r_high

    # Perform bisection
    for _ in range(50):
        r_mid = (r_low + r_high) * 0.5
        z_mid = calculate_scaled_distance(r_mid, w_tnt_kg)
        _, p_mid, _ = calculate_sadovsky_overpressure(z_mid)
        if p_mid > target_kpa:
            r_low = r_mid
        else:
            r_high = r_mid

    return float((r_low + r_high) * 0.5)


def calculate_hazard_zone_radii(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
) -> HazardZoneRadiiDTO:
    """
    Determine exact threshold distance radii for all standard hazard bands.
    Guarantees strict physical monotonicity: R_green >= R_yellow >= R_orange >= R_red >= 0.0.
    """
    # 1. Thermal Flame Parameters
    l_flame, _ = calculate_thomas_flame_length(
        d_pool_m=source.effective_pool_diameter_m,
        mass_burning_flux_kg_m2_s=source.mass_burning_flux_kg_m2_s,
        wind_speed_ms=scenario.atmosphere.wind_speed_ms,
        vapor_density_kg_m3=material.vapor_density_kg_m3,
    )
    e_p = calculate_surface_emissive_power(
        d_pool_m=source.effective_pool_diameter_m,
        e_soot_kw_m2=material.soot_emissive_power_kw_m2,
        e_luminous_kw_m2=material.luminous_emissive_power_kw_m2,
        s_soot_extinction_m_inv=material.soot_extinction_coefficient_m_inv,
    )

    t_red_r = _solve_thermal_radius_bisection(
        THERMAL_THRESHOLDS_KW_M2["RED"],
        source.effective_pool_diameter_m,
        l_flame,
        e_p,
        scenario.atmosphere.relative_humidity,
        scenario.atmosphere.ambient_temperature_k,
    )
    t_orange_r = _solve_thermal_radius_bisection(
        THERMAL_THRESHOLDS_KW_M2["ORANGE"],
        source.effective_pool_diameter_m,
        l_flame,
        e_p,
        scenario.atmosphere.relative_humidity,
        scenario.atmosphere.ambient_temperature_k,
    )
    t_yellow_r = _solve_thermal_radius_bisection(
        THERMAL_THRESHOLDS_KW_M2["YELLOW"],
        source.effective_pool_diameter_m,
        l_flame,
        e_p,
        scenario.atmosphere.relative_humidity,
        scenario.atmosphere.ambient_temperature_k,
    )
    t_green_r = _solve_thermal_radius_bisection(
        THERMAL_THRESHOLDS_KW_M2["GREEN"],
        source.effective_pool_diameter_m,
        l_flame,
        e_p,
        scenario.atmosphere.relative_humidity,
        scenario.atmosphere.ambient_temperature_k,
    )

    # Enforce thermal monotonicity
    t_orange_r = max(t_orange_r, t_red_r)
    t_yellow_r = max(t_yellow_r, t_orange_r)
    t_green_r = max(t_green_r, t_yellow_r)

    # 2. Blast Shock Wave Radii
    w_tnt = calculate_tnt_equivalent_mass(
        participating_vapor_mass_kg=source.participating_vapor_mass_kg,
        heat_of_combustion_j_kg=material.heat_of_combustion_j_kg,
        explosion_yield_factor=scenario.release.explosion_yield_factor,
    )

    b_red_r = _solve_blast_radius_bisection(BLAST_THRESHOLDS_KPA["RED"], w_tnt)
    b_orange_r = _solve_blast_radius_bisection(BLAST_THRESHOLDS_KPA["ORANGE"], w_tnt)
    b_yellow_r = _solve_blast_radius_bisection(BLAST_THRESHOLDS_KPA["YELLOW"], w_tnt)
    b_green_r = _solve_blast_radius_bisection(BLAST_THRESHOLDS_KPA["GREEN"], w_tnt)

    # Enforce blast monotonicity
    b_orange_r = max(b_orange_r, b_red_r)
    b_yellow_r = max(b_yellow_r, b_orange_r)
    b_green_r = max(b_green_r, b_yellow_r)

    # 3. Combined Worst-Case Radii Envelope
    c_red_r = max(t_red_r, b_red_r)
    c_orange_r = max(t_orange_r, b_orange_r)
    c_yellow_r = max(t_yellow_r, b_yellow_r)
    c_green_r = max(t_green_r, b_green_r)

    return HazardZoneRadiiDTO(
        thermal_red_m=float(t_red_r),
        thermal_orange_m=float(t_orange_r),
        thermal_yellow_m=float(t_yellow_r),
        thermal_green_m=float(t_green_r),
        blast_red_m=float(b_red_r),
        blast_orange_m=float(b_orange_r),
        blast_yellow_m=float(b_yellow_r),
        blast_green_m=float(b_green_r),
        combined_red_m=float(c_red_r),
        combined_orange_m=float(c_orange_r),
        combined_yellow_m=float(c_yellow_r),
        combined_green_m=float(c_green_r),
    )
