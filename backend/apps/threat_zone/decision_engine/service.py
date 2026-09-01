"""
RESQ-ENG-PLAN-2026-002 — Decision Engine Master Service Facade
Orchestrates end-to-end flow from scenario input -> Engineer 1 Physics -> Multi-Factor Triage ->
16-Sector Directional Intelligence -> Sensitivity Analysis -> Uncertainty Buffer -> Explainability.
"""

from datetime import datetime, timezone
from typing import Dict, Any, Optional

from apps.threat_zone.physics_engine.pipeline import run_hazard_model, HazardModelResultDTO
from .dtos import (
    DecisionSupportReportDTO,
    ScenarioComparisonDTO,
    SensitivityAnalysisDTO,
    UncertaintyAssessmentDTO,
)
from .severity_triage import build_severity_breakdown, evaluate_operational_severity
from .approach_intelligence import evaluate_directional_intelligence
from .sensitivity_engine import evaluate_sensitivity_analysis
from .uncertainty_layer import evaluate_uncertainty_assessment
from .explainability_engine import generate_explainability_report
from .scenario_comparator import compare_scenarios


def compute_decision_support_report(
    scenario_data: Dict[str, Any],
    compute_sensitivity: bool = True,
    compute_uncertainty: bool = True,
    generate_explanation: bool = True,
) -> DecisionSupportReportDTO:
    """
    Generate comprehensive operational decision support intelligence for a given incident scenario.
    """
    # 1. Execute Engineer 1 Physics Engine
    # Run spatial grid and monte carlo if uncertainty is requested
    physics_res: HazardModelResultDTO = run_hazard_model(
        scenario_data,
        include_spatial_grid=True,
        run_monte_carlo=compute_uncertainty,
        monte_carlo_samples=100 if compute_uncertainty else 0,
    )

    # 2. Multi-Factor Severity Breakdown
    severity_breakdown = build_severity_breakdown(physics_res.radii, physics_res.polygons)

    # 3. 16-Sector Directional Intelligence
    directional = evaluate_directional_intelligence(
        scenario=physics_res.scenario,
        source=physics_res.source,
        material=physics_res.material,
        radii=physics_res.radii,
    )

    # 4. Deterministic Sensitivity Sweep (Optional)
    sensitivity_dto: Optional[SensitivityAnalysisDTO] = None
    if compute_sensitivity:
        sensitivity_dto = evaluate_sensitivity_analysis(scenario_data, physics_res)

    # 5. Uncertainty & Safety Buffer (Optional)
    uncertainty_dto: Optional[UncertaintyAssessmentDTO] = None
    if compute_uncertainty:
        uncertainty_dto = evaluate_uncertainty_assessment(physics_res)

    # 6. Explainability Audit Trail
    explainability_dto = generate_explainability_report(
        result=physics_res,
        directional=directional,
        sensitivity=sensitivity_dto,
    )

    # 7. Operational Summary
    max_red = float(physics_res.radii.combined_red_m)
    max_green = float(physics_res.radii.combined_green_m)
    primary_threat = "RED_CRITICAL" if max_red > 0.0 else "GREEN_ADVISORY"

    if physics_res.material.material_id in ("LPG", "LNG") and (physics_res.radii.blast_green_m > 0.0 or physics_res.radii.blast_red_m > 0.0):
        dominant_mech = "COMPOUND_BLEVE_AND_SHOCKWAVE"
    elif physics_res.radii.blast_red_m > 0.0 or physics_res.radii.blast_green_m > 0.0:
        dominant_mech = "BLAST_OVERPRESSURE_SHOCKWAVE"
    else:
        dominant_mech = "SUSTAINED_THERMAL_RADIATION"

    standoff_m = round(max_green * 1.15, 1)

    summary = {
        "primary_threat_level": primary_threat,
        "dominant_hazard_mechanism": dominant_mech,
        "max_lethal_radius_m": round(max_red, 1),
        "max_evacuation_radius_m": round(max_green, 1),
        "optimal_ingress_bearing_deg": directional.optimal_bearing_deg,
        "optimal_ingress_cardinal": directional.optimal_sector,
        "recommended_standoff_distance_m": standoff_m,
    }

    timestamp_str = datetime.now(timezone.utc).isoformat()

    return DecisionSupportReportDTO(
        provenance_hash=physics_res.provenance_hash,
        execution_timestamp_utc=timestamp_str,
        operational_summary=summary,
        severity_breakdown=severity_breakdown,
        directional_intelligence=directional,
        sensitivity_analysis=sensitivity_dto,
        uncertainty_assessment=uncertainty_dto,
        explainability_report=explainability_dto,
    )


def compute_differential_comparison(
    scenario_a_data: Dict[str, Any],
    scenario_b_data: Dict[str, Any],
) -> ScenarioComparisonDTO:
    """
    Execute differential physics and consequence comparison between two scenarios.
    """
    res_a = run_hazard_model(scenario_a_data, include_spatial_grid=False, run_monte_carlo=False)
    res_b = run_hazard_model(scenario_b_data, include_spatial_grid=False, run_monte_carlo=False)
    return compare_scenarios(res_a, res_b)
