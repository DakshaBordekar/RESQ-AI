"""
RESQ-ENG-PLAN-2026-002 — Decision Engine Data Transfer Objects (Immutable)
Defines all structured, typed data contracts for AI Engineer 2's operational decision support layer.
"""

from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from enum import Enum


class DominantHazardType(str, Enum):
    THERMAL = "THERMAL"
    BLAST = "BLAST"
    COMPOUND = "COMPOUND"
    NONE = "NONE"


class ApproachSectorClassification(str, Enum):
    OPTIMAL_UPWIND_CORRIDOR = "OPTIMAL_UPWIND_CORRIDOR"
    ACCEPTABLE_CROSSWIND = "ACCEPTABLE_CROSSWIND"
    HAZARDOUS_CROSSWIND = "HAZARDOUS_CROSSWIND"
    DOWNWIND_EXCLUSION_ZONE = "DOWNWIND_EXCLUSION_ZONE"


class SensitivityDriverType(str, Enum):
    PRIMARY_DRIVER = "PRIMARY_DRIVER"
    SECONDARY_FACTOR = "SECONDARY_FACTOR"
    NEGLIGIBLE = "NEGLIGIBLE"


@dataclass(frozen=True)
class OperationalSeverityDTO:
    """Multi-factor unit-safe operational severity rating for a single point or zone."""
    tier: str
    rank: int
    thermal_rank: int
    blast_rank: int
    dominant_hazard: str
    tactical_directive: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SeverityBreakdownTierDTO:
    """Detailed operational breakdown for a specific severity zone band."""
    tier_name: str
    nominal_radius_m: float
    enclosed_area_m2: float
    thermal_threshold_kw_m2: float
    blast_threshold_kpa: float
    tactical_directive: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ApproachSectorIntelligenceDTO:
    """Operational exposure and ingress rating for one of 16 compass sectors."""
    cardinal: str
    azimuth_deg: float
    exposure_score: float
    classification: str
    max_safe_approach_distance_m: float
    operational_advice: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DirectionalIntelligenceDTO:
    """Comprehensive directional ingress and staging plan across all compass bearings."""
    optimal_sector: str
    optimal_bearing_deg: float
    upwind_bearing_deg: float
    downwind_bearing_deg: float
    exclusion_arc_start_deg: float
    exclusion_arc_end_deg: float
    sectors: List[ApproachSectorIntelligenceDTO]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "optimal_sector": self.optimal_sector,
            "optimal_bearing_deg": self.optimal_bearing_deg,
            "upwind_bearing_deg": self.upwind_bearing_deg,
            "downwind_bearing_deg": self.downwind_bearing_deg,
            "exclusion_arc_start_deg": self.exclusion_arc_start_deg,
            "exclusion_arc_end_deg": self.exclusion_arc_end_deg,
            "sectors": [s.to_dict() for s in self.sectors],
        }


@dataclass(frozen=True)
class SensitivityParameterDTO:
    """Localized gradient and elasticity evaluation for a single input parameter."""
    parameter_name: str
    baseline_value: float
    perturbed_value: float
    delta_radius_m: float
    elasticity_percent: float
    driver_classification: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class SensitivityAnalysisDTO:
    """Deterministic sensitivity sweep output identifying primary risk drivers."""
    baseline_green_radius_m: float
    parameters: List[SensitivityParameterDTO]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "baseline_green_radius_m": self.baseline_green_radius_m,
            "parameters": [p.to_dict() for p in self.parameters],
        }


@dataclass(frozen=True)
class UncertaintyAssessmentDTO:
    """Probabilistic confidence rating and operational safety buffer standoff margin."""
    nominal_radius_m: float
    p5_radius_m: float
    p50_radius_m: float
    p95_radius_m: float
    safety_buffer_margin_m: float
    confidence_rating: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ScenarioComparisonDTO:
    """Analytical differential matrix between two distinct facility configurations."""
    facility_a_name: str
    facility_b_name: str
    energy_release_ratio: float
    power_release_rate_ratio: float
    blast_tnt_delta_kg: float
    max_radius_delta_m: float
    comparative_analysis_text: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ExplainabilityReportDTO:
    """Deterministic audit trail answering the 6 core operational questions."""
    zone_dimension_rationale: str
    spatial_asymmetry_rationale: str
    approach_rationale: str
    dominant_hazard_rationale: str
    scenario_comparison_rationale: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class DecisionSupportReportDTO:
    """Master consequence management & operational intelligence payload."""
    provenance_hash: str
    execution_timestamp_utc: str
    operational_summary: Dict[str, Any]
    severity_breakdown: Dict[str, SeverityBreakdownTierDTO]
    directional_intelligence: DirectionalIntelligenceDTO
    explainability_report: ExplainabilityReportDTO
    sensitivity_analysis: Optional[SensitivityAnalysisDTO] = None
    uncertainty_assessment: Optional[UncertaintyAssessmentDTO] = None

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "provenance_hash": self.provenance_hash,
            "execution_timestamp_utc": self.execution_timestamp_utc,
            "operational_summary": self.operational_summary,
            "severity_breakdown": {k: v.to_dict() for k, v in self.severity_breakdown.items()},
            "directional_intelligence": self.directional_intelligence.to_dict(),
            "explainability_report": self.explainability_report.to_dict(),
        }
        if self.sensitivity_analysis is not None:
            d["sensitivity_analysis"] = self.sensitivity_analysis.to_dict()
        if self.uncertainty_assessment is not None:
            d["uncertainty_assessment"] = self.uncertainty_assessment.to_dict()
        return d
