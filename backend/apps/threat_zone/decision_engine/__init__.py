"""
RESQ-AI Decision Support & Operational Intelligence Layer (AI Engineer 2)
Specification: RESQ-ENG-PLAN-2026-002 Revision 1.0.0
"""

from .dtos import (
    DominantHazardType,
    ApproachSectorClassification,
    SensitivityDriverType,
    OperationalSeverityDTO,
    SeverityBreakdownTierDTO,
    ApproachSectorIntelligenceDTO,
    DirectionalIntelligenceDTO,
    SensitivityParameterDTO,
    SensitivityAnalysisDTO,
    UncertaintyAssessmentDTO,
    ScenarioComparisonDTO,
    ExplainabilityReportDTO,
    DecisionSupportReportDTO,
)
from .severity_triage import (
    classify_thermal_flux_rank,
    classify_blast_overpressure_rank,
    evaluate_operational_severity,
    build_severity_breakdown,
)
from .approach_intelligence import evaluate_directional_intelligence
from .scenario_comparator import compare_scenarios
from .sensitivity_engine import evaluate_sensitivity_analysis
from .uncertainty_layer import evaluate_uncertainty_assessment
from .explainability_engine import generate_explainability_report
from .llm_explainer import generate_executive_narrative
from .service import compute_decision_support_report, compute_differential_comparison

__all__ = [
    "DominantHazardType",
    "ApproachSectorClassification",
    "SensitivityDriverType",
    "OperationalSeverityDTO",
    "SeverityBreakdownTierDTO",
    "ApproachSectorIntelligenceDTO",
    "DirectionalIntelligenceDTO",
    "SensitivityParameterDTO",
    "SensitivityAnalysisDTO",
    "UncertaintyAssessmentDTO",
    "ScenarioComparisonDTO",
    "ExplainabilityReportDTO",
    "DecisionSupportReportDTO",
    "classify_thermal_flux_rank",
    "classify_blast_overpressure_rank",
    "evaluate_operational_severity",
    "build_severity_breakdown",
    "evaluate_directional_intelligence",
    "compare_scenarios",
    "evaluate_sensitivity_analysis",
    "evaluate_uncertainty_assessment",
    "generate_explainability_report",
    "generate_executive_narrative",
    "compute_decision_support_report",
    "compute_differential_comparison",
]
