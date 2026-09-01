"""
RESQ-ENG-SPEC-2026-001 — Safe Approach Route Vector Generator (Phase 10)
Calculates tactical ingress sectors, upwind/crosswind approach corridors, and downwind exclusion zones.
"""

import math
from dataclasses import dataclass, asdict
from enum import Enum
from typing import List, Dict, Any, Tuple
import numpy as np

from ..core.constants import PI
from ..core.wind import calculate_wind_transport_vector, wind_direction_to_cardinal
from ..core.units import normalize_angle_360
from ..core.exceptions import DomainException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .severity import HazardZoneRadiiDTO
from .point_evaluator import evaluate_point


class ApproachSafetyStatus(str, Enum):
    SAFE_UPWIND = "SAFE_UPWIND"
    ACCEPTABLE_CROSSWIND = "ACCEPTABLE_CROSSWIND"
    CAUTION = "CAUTION"
    HAZARDOUS_DOWNWIND = "HAZARDOUS_DOWNWIND"


@dataclass(frozen=True)
class ApproachSectorDTO:
    """Tactical evaluation of an emergency approach sector."""
    bearing_deg: float
    cardinal_direction: str
    safety_status: ApproachSafetyStatus
    is_recommended: bool
    is_prohibited: bool
    max_thermal_flux_at_green_boundary_kw_m2: float
    max_overpressure_at_green_boundary_kpa: float
    description: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "bearing_deg": self.bearing_deg,
            "cardinal_direction": self.cardinal_direction,
            "safety_status": self.safety_status.value,
            "is_recommended": self.is_recommended,
            "is_prohibited": self.is_prohibited,
            "max_thermal_flux_at_green_boundary_kw_m2": self.max_thermal_flux_at_green_boundary_kw_m2,
            "max_overpressure_at_green_boundary_kpa": self.max_overpressure_at_green_boundary_kpa,
            "description": self.description,
        }


@dataclass(frozen=True)
class SafeApproachPlanDTO:
    """Comprehensive emergency tactical approach advisory."""
    wind_origin_met_deg: float
    wind_downwind_deg: float
    wind_speed_ms: float
    recommended_upwind_bearing_deg: float
    secondary_crosswind_bearings_deg: List[float]
    exclusion_sector_start_deg: float
    exclusion_sector_end_deg: float
    sectors: List[ApproachSectorDTO]
    tactical_advisories: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "wind_origin_met_deg": self.wind_origin_met_deg,
            "wind_downwind_deg": self.wind_downwind_deg,
            "wind_speed_ms": self.wind_speed_ms,
            "recommended_upwind_bearing_deg": self.recommended_upwind_bearing_deg,
            "secondary_crosswind_bearings_deg": self.secondary_crosswind_bearings_deg,
            "exclusion_sector_start_deg": self.exclusion_sector_start_deg,
            "exclusion_sector_end_deg": self.exclusion_sector_end_deg,
            "sectors": [s.to_dict() for s in self.sectors],
            "tactical_advisories": self.tactical_advisories,
        }


def generate_safe_approach_plan(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    radii: HazardZoneRadiiDTO,
    sector_resolution_deg: float = 22.5,
    exclusion_half_angle_deg: float = 45.0,
) -> SafeApproachPlanDTO:
    """
    Generate tactical responder ingress vectors based on wind dynamics and threat boundaries:
    - Primary recommended vector: Upwind approach (heading FROM meteorological wind azimuth)
    - Secondary vectors: Crosswind approaches (+/- 90° from upwind)
    - Exclusion sector: Downwind transport cone (+/- exclusion_half_angle_deg around downwind angle)
    """
    wind_speed = scenario.atmosphere.wind_speed_ms
    wind_origin_deg = scenario.atmosphere.wind_direction_deg

    _, _, downwind_deg = calculate_wind_transport_vector(wind_speed, wind_origin_deg)

    # 1. Key Tactical Bearings
    # Upwind bearing: Approach from the direction the wind comes FROM (0° relative to wind origin)
    upwind_bearing = normalize_angle_360(wind_origin_deg)
    crosswind_1 = normalize_angle_360(wind_origin_deg + 90.0)
    crosswind_2 = normalize_angle_360(wind_origin_deg - 90.0)

    # Exclusion cone: centered at downwind_deg with half-angle
    exclusion_start = normalize_angle_360(downwind_deg - exclusion_half_angle_deg)
    exclusion_end = normalize_angle_360(downwind_deg + exclusion_half_angle_deg)

    # 2. Evaluate all 16 sectors around facility (22.5° steps)
    angles = np.arange(0.0, 360.0, sector_resolution_deg)
    sectors: List[ApproachSectorDTO] = []

    # Stand-off distance for sector check is at outer boundary (green zone + 10%)
    check_r = max(100.0, radii.combined_green_m * 1.1)

    for bearing in angles:
        b_deg = float(bearing)
        cardinal = wind_direction_to_cardinal(b_deg)

        # Angular offset from downwind direction (0 = exact downwind, 180 = exact upwind)
        diff_from_downwind = abs(((b_deg - downwind_deg + 180.0) % 360.0) - 180.0)
        diff_from_upwind = abs(((b_deg - upwind_bearing + 180.0) % 360.0) - 180.0)

        # Calculate consequence at boundary point in this sector
        b_rad = math.radians(b_deg)
        x_m = check_r * math.sin(b_rad)
        y_m = check_r * math.cos(b_rad)
        pt_res = evaluate_point(scenario, source, material, x_m, y_m)

        # Classification
        if diff_from_upwind <= 30.0:
            status = ApproachSafetyStatus.SAFE_UPWIND
            is_rec = True
            is_proh = False
            desc = "Optimal tactical approach corridor. Head into the wind so flame, heat, and smoke blow away."
        elif diff_from_downwind <= exclusion_half_angle_deg:
            status = ApproachSafetyStatus.HAZARDOUS_DOWNWIND
            is_rec = False
            is_proh = True
            desc = "STRICT EXCLUSION SECTOR. Downwind path directly in the path of flame tilt, smoke plume, and combustion gases."
        elif abs(diff_from_upwind - 90.0) <= 25.0:
            status = ApproachSafetyStatus.ACCEPTABLE_CROSSWIND
            is_rec = False
            is_proh = False
            desc = "Acceptable secondary crosswind ingress corridor. Monitor wind shifts closely."
        else:
            status = ApproachSafetyStatus.CAUTION
            is_rec = False
            is_proh = False
            desc = "Marginal approach corridor. Intermediate wind alignment requires continuous exposure monitoring."

        sectors.append(ApproachSectorDTO(
            bearing_deg=b_deg,
            cardinal_direction=cardinal,
            safety_status=status,
            is_recommended=is_rec,
            is_prohibited=is_proh,
            max_thermal_flux_at_green_boundary_kw_m2=float(pt_res.thermal_flux_kw_m2),
            max_overpressure_at_green_boundary_kpa=float(pt_res.blast_overpressure_kpa),
            description=desc,
        ))

    # 3. Tactical Advisories
    advisories = [
        f"PRIMARY INGRESS: Approach facility from bearing {upwind_bearing:.1f}° ({wind_direction_to_cardinal(upwind_bearing)}) UPWIND.",
        f"SECONDARY INGRESS: Crosswind approaches from {crosswind_1:.1f}° ({wind_direction_to_cardinal(crosswind_1)}) and {crosswind_2:.1f}° ({wind_direction_to_cardinal(crosswind_2)}).",
        f"EXCLUSION ZONE: Prohibit responder entry between {exclusion_start:.1f}° and {exclusion_end:.1f}° DOWNWIND.",
        f"MINIMUM STAGING DISTANCE: Staging area must remain outside GREEN threat zone (> {radii.combined_green_m:.1f} m from center).",
    ]

    return SafeApproachPlanDTO(
        wind_origin_met_deg=float(wind_origin_deg),
        wind_downwind_deg=float(downwind_deg),
        wind_speed_ms=float(wind_speed),
        recommended_upwind_bearing_deg=float(upwind_bearing),
        secondary_crosswind_bearings_deg=[float(crosswind_1), float(crosswind_2)],
        exclusion_sector_start_deg=float(exclusion_start),
        exclusion_sector_end_deg=float(exclusion_end),
        sectors=sectors,
        tactical_advisories=advisories,
    )
