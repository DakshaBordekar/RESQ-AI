"""
RESQ-ENG-PLAN-2026-002 — 16-Sector Directional Exposure & Ingress Intelligence (Phase 3)
Evaluates cumulative radial line-integral exposures across 16 compass bearings, identifying optimal
upwind ingress corridors, lateral staging areas, and downwind exclusion zones.
"""

import math
from typing import List, Tuple
from .dtos import (
    ApproachSectorIntelligenceDTO,
    DirectionalIntelligenceDTO,
    ApproachSectorClassification,
)
from apps.threat_zone.physics_engine.scenario.dtos import ScenarioInputDTO
from apps.threat_zone.physics_engine.source.dtos import SourceTermsDTO
from apps.threat_zone.physics_engine.materials.dtos import MaterialPropertiesDTO
from apps.threat_zone.physics_engine.models.severity import HazardZoneRadiiDTO
from apps.threat_zone.physics_engine.models.point_evaluator import evaluate_point


_SECTOR_CARDINALS = [
    ("N", 0.0),
    ("NNE", 22.5),
    ("NE", 45.0),
    ("ENE", 67.5),
    ("E", 90.0),
    ("ESE", 112.5),
    ("SE", 135.0),
    ("SSE", 157.5),
    ("S", 180.0),
    ("SSW", 202.5),
    ("SW", 225.0),
    ("WSW", 247.5),
    ("W", 270.0),
    ("WNW", 292.5),
    ("NW", 315.0),
    ("NNW", 337.5),
]


def _angular_difference_deg(deg1: float, deg2: float) -> float:
    """Compute minimal angular difference in degrees between two azimuths [0..180]."""
    diff = abs((deg1 - deg2) % 360.0)
    return min(diff, 360.0 - diff)


def evaluate_directional_intelligence(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    radii: HazardZoneRadiiDTO,
    r_max_m: float = 2000.0,
    r_step_m: float = 25.0,
) -> DirectionalIntelligenceDTO:
    """
    Perform 16-sector line-integral risk evaluation and generate tactical approach recommendations.
    """
    # Meteorological convention: wind_direction_deg is where wind comes FROM (upwind origin)
    upwind_bearing_deg = float(scenario.atmosphere.wind_direction_deg % 360.0)
    downwind_bearing_deg = float((upwind_bearing_deg + 180.0) % 360.0)

    # Downwind exclusion arc: +/- 45 degrees around downwind vector
    exclusion_arc_start_deg = float((downwind_bearing_deg - 45.0) % 360.0)
    exclusion_arc_end_deg = float((downwind_bearing_deg + 45.0) % 360.0)

    is_calm = scenario.atmosphere.wind_speed_ms < 0.5
    raw_integrals: List[float] = []
    max_safe_distances: List[float] = []

    # Reference damage denominators for unit-free line integration
    q_ref = 4.7   # kW/m^2 (Injury threshold)
    dp_ref = 6.9  # kPa (Projectile / window breakage threshold)

    n_steps = max(1, int(r_max_m / r_step_m))

    for cardinal, azimuth in _SECTOR_CARDINALS:
        azimuth_rad = math.radians(azimuth)
        sin_az = math.sin(azimuth_rad)
        cos_az = math.cos(azimuth_rad)

        sector_integral = 0.0
        safe_dist = radii.combined_green_m

        for step_idx in range(1, n_steps + 1):
            r = step_idx * r_step_m
            x = r * sin_az
            y = r * cos_az

            pt = evaluate_point(scenario, source, material, x_m=x, y_m=y)
            sector_integral += ((pt.thermal_flux_kw_m2 / q_ref) + (pt.blast_overpressure_kpa / dp_ref)) * (r_step_m / r_max_m)

            # Check forward safe boundary limit (where flux is within yellow threshold)
            if pt.thermal_flux_kw_m2 <= q_ref and pt.blast_overpressure_kpa <= dp_ref:
                safe_dist = min(safe_dist, r)

        raw_integrals.append(sector_integral)
        max_safe_distances.append(max(0.0, float(safe_dist)))

    min_int = min(raw_integrals)
    max_int = max(raw_integrals)
    span = max_int - min_int

    sectors: List[ApproachSectorIntelligenceDTO] = []
    min_exposure_idx = 0
    min_exposure_val = 1000.0

    for idx, (cardinal, azimuth) in enumerate(_SECTOR_CARDINALS):
        if is_calm or span < 1e-4:
            exposure_score = 10.0  # Isotropic baseline
        else:
            exposure_score = float(100.0 * (raw_integrals[idx] - min_int) / span)

        # Angular offset from downwind direction
        downwind_offset = _angular_difference_deg(azimuth, downwind_bearing_deg)
        upwind_offset = _angular_difference_deg(azimuth, upwind_bearing_deg)

        if not is_calm and downwind_offset <= 45.0:
            classification = ApproachSectorClassification.DOWNWIND_EXCLUSION_ZONE.value
            advice = "STRICT EXCLUSION. Direct downwind plume trajectory carries maximum thermal radiation and toxic smoke."
            safe_dist_m = 0.0
        elif is_calm or upwind_offset <= 45.0:
            classification = ApproachSectorClassification.OPTIMAL_UPWIND_CORRIDOR.value
            advice = "RECOMMENDED TACTICAL ROUTE. Upwind ingress minimizes thermal exposure and avoids downwind smoke plume."
            safe_dist_m = max_safe_distances[idx]
        elif exposure_score < 40.0:
            classification = ApproachSectorClassification.ACCEPTABLE_CROSSWIND.value
            advice = "ACCEPTABLE CROSSWIND STAGING. Lateral positioning suitable for secondary containment and perimeter control."
            safe_dist_m = max_safe_distances[idx]
        else:
            classification = ApproachSectorClassification.HAZARDOUS_CROSSWIND.value
            advice = "HAZARDOUS CROSSWIND SECTOR. High thermal flux and potential wind-shear plume drift."
            safe_dist_m = max_safe_distances[idx]

        if exposure_score < min_exposure_val:
            min_exposure_val = exposure_score
            min_exposure_idx = idx

        sectors.append(
            ApproachSectorIntelligenceDTO(
                cardinal=cardinal,
                azimuth_deg=azimuth,
                exposure_score=round(exposure_score, 1),
                classification=classification,
                max_safe_approach_distance_m=round(safe_dist_m, 1),
                operational_advice=advice,
            )
        )

    optimal_sector_cardinal, optimal_bearing = _SECTOR_CARDINALS[min_exposure_idx]

    return DirectionalIntelligenceDTO(
        optimal_sector=optimal_sector_cardinal,
        optimal_bearing_deg=optimal_bearing,
        upwind_bearing_deg=round(upwind_bearing_deg, 1),
        downwind_bearing_deg=round(downwind_bearing_deg, 1),
        exclusion_arc_start_deg=round(exclusion_arc_start_deg, 1),
        exclusion_arc_end_deg=round(exclusion_arc_end_deg, 1),
        sectors=sectors,
    )
