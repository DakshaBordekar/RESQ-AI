"""
RESQ-ENG-PLAN-2026-002 — Multi-Factor Severity Classification Engine (Phase 2)
Evaluates thermal radiation and blast overpressure independently against standardized domain criteria
and fuses them into an operational severity rank preserving physical unit integrity.
"""

import math
from typing import Dict, Any
from .dtos import (
    OperationalSeverityDTO,
    SeverityBreakdownTierDTO,
    DominantHazardType,
)
from apps.threat_zone.physics_engine.core.constants import (
    THERMAL_THRESHOLDS_KW_M2,
    BLAST_THRESHOLDS_KPA,
)
from apps.threat_zone.physics_engine.core.exceptions import (
    DomainException,
    NegativeConsequenceException,
)
from apps.threat_zone.physics_engine.models.severity import HazardZoneRadiiDTO
from apps.threat_zone.physics_engine.models.threat_polygons import HazardPolygonsDTO


_RANK_TO_TIER = {
    4: "RED_CRITICAL",
    3: "ORANGE_SEVERE",
    2: "YELLOW_MODERATE",
    1: "GREEN_ADVISORY",
    0: "SAFE",
}

_TACTICAL_DIRECTIVES = {
    "RED_CRITICAL": "NO ENTRY. Complete structural destruction and 100% lethality threshold.",
    "ORANGE_SEVERE": "IMMEDIATE EVACUATION. Heavy protective equipment required for life-safety rescue.",
    "YELLOW_MODERATE": "CONTROLLED TACTICAL PERIMETER. First-aid post and ambulance staging boundary.",
    "GREEN_ADVISORY": "PUBLIC SAFETY BOUNDARY. Incident Command Post and media staging location.",
    "SAFE": "UNRESTRICTED ACCESS. No thermal or overpressure hazard present.",
}


def classify_thermal_flux_rank(thermal_flux_kw_m2: float) -> int:
    """Classify thermal radiation intensity [kW/m^2] into discrete ordinal rank [0..4]."""
    if math.isnan(thermal_flux_kw_m2) or math.isinf(thermal_flux_kw_m2):
        raise DomainException("Thermal flux cannot be NaN or Infinite.")
    if thermal_flux_kw_m2 < -1e-6:
        raise NegativeConsequenceException(f"Thermal flux cannot be negative: {thermal_flux_kw_m2} kW/m^2")

    q = max(0.0, float(thermal_flux_kw_m2))
    if q >= THERMAL_THRESHOLDS_KW_M2["RED"]:
        return 4
    elif q >= THERMAL_THRESHOLDS_KW_M2["ORANGE"]:
        return 3
    elif q >= THERMAL_THRESHOLDS_KW_M2["YELLOW"]:
        return 2
    elif q >= THERMAL_THRESHOLDS_KW_M2["GREEN"]:
        return 1
    else:
        return 0


def classify_blast_overpressure_rank(blast_overpressure_kpa: float) -> int:
    """Classify blast peak overpressure [kPa] into discrete ordinal rank [0..4]."""
    if math.isnan(blast_overpressure_kpa) or math.isinf(blast_overpressure_kpa):
        raise DomainException("Blast overpressure cannot be NaN or Infinite.")
    if blast_overpressure_kpa < -1e-6:
        raise NegativeConsequenceException(f"Blast overpressure cannot be negative: {blast_overpressure_kpa} kPa")

    dp = max(0.0, float(blast_overpressure_kpa))
    if dp >= BLAST_THRESHOLDS_KPA["RED"]:
        return 4
    elif dp >= BLAST_THRESHOLDS_KPA["ORANGE"]:
        return 3
    elif dp >= BLAST_THRESHOLDS_KPA["YELLOW"]:
        return 2
    elif dp >= BLAST_THRESHOLDS_KPA["GREEN"]:
        return 1
    else:
        return 0


def evaluate_operational_severity(
    thermal_flux_kw_m2: float,
    blast_overpressure_kpa: float,
) -> OperationalSeverityDTO:
    """
    Evaluate combined multi-hazard operational triage rank without cross-unit max.
    Fused rank = max(Rank_thermal, Rank_blast).
    """
    thermal_rank = classify_thermal_flux_rank(thermal_flux_kw_m2)
    blast_rank = classify_blast_overpressure_rank(blast_overpressure_kpa)

    rank = max(thermal_rank, blast_rank)
    tier = _RANK_TO_TIER[rank]

    if thermal_rank > blast_rank:
        dominant_hazard = DominantHazardType.THERMAL.value
    elif blast_rank > thermal_rank:
        dominant_hazard = DominantHazardType.BLAST.value
    elif rank > 0:
        dominant_hazard = DominantHazardType.COMPOUND.value
    else:
        dominant_hazard = DominantHazardType.NONE.value

    directive = _TACTICAL_DIRECTIVES[tier]

    return OperationalSeverityDTO(
        tier=tier,
        rank=rank,
        thermal_rank=thermal_rank,
        blast_rank=blast_rank,
        dominant_hazard=dominant_hazard,
        tactical_directive=directive,
    )


def build_severity_breakdown(
    radii: HazardZoneRadiiDTO,
    polygons: HazardPolygonsDTO,
) -> Dict[str, SeverityBreakdownTierDTO]:
    """
    Construct comprehensive 4-tier operational severity breakdown combining radii, areas, and directives.
    """
    return {
        "red_critical": SeverityBreakdownTierDTO(
            tier_name="RED_CRITICAL",
            nominal_radius_m=radii.combined_red_m,
            enclosed_area_m2=polygons.red_critical.area_m2,
            thermal_threshold_kw_m2=THERMAL_THRESHOLDS_KW_M2["RED"],
            blast_threshold_kpa=BLAST_THRESHOLDS_KPA["RED"],
            tactical_directive=_TACTICAL_DIRECTIVES["RED_CRITICAL"],
        ),
        "orange_severe": SeverityBreakdownTierDTO(
            tier_name="ORANGE_SEVERE",
            nominal_radius_m=radii.combined_orange_m,
            enclosed_area_m2=polygons.orange_severe.area_m2,
            thermal_threshold_kw_m2=THERMAL_THRESHOLDS_KW_M2["ORANGE"],
            blast_threshold_kpa=BLAST_THRESHOLDS_KPA["ORANGE"],
            tactical_directive=_TACTICAL_DIRECTIVES["ORANGE_SEVERE"],
        ),
        "yellow_moderate": SeverityBreakdownTierDTO(
            tier_name="YELLOW_MODERATE",
            nominal_radius_m=radii.combined_yellow_m,
            enclosed_area_m2=polygons.yellow_moderate.area_m2,
            thermal_threshold_kw_m2=THERMAL_THRESHOLDS_KW_M2["YELLOW"],
            blast_threshold_kpa=BLAST_THRESHOLDS_KPA["YELLOW"],
            tactical_directive=_TACTICAL_DIRECTIVES["YELLOW_MODERATE"],
        ),
        "green_advisory": SeverityBreakdownTierDTO(
            tier_name="GREEN_ADVISORY",
            nominal_radius_m=radii.combined_green_m,
            enclosed_area_m2=polygons.green_advisory.area_m2,
            thermal_threshold_kw_m2=THERMAL_THRESHOLDS_KW_M2["GREEN"],
            blast_threshold_kpa=BLAST_THRESHOLDS_KPA["GREEN"],
            tactical_directive=_TACTICAL_DIRECTIVES["GREEN_ADVISORY"],
        ),
    }
