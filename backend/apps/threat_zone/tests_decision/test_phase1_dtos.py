"""
RESQ-ENG-PLAN-2026-002 — PHASE 1 VERIFICATION TEST SUITE
Decision DTOs & Schema Definitions Test Suite
"""

import json
import unittest
from apps.threat_zone.decision_engine.dtos import (
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
    DominantHazardType,
    ApproachSectorClassification,
    SensitivityDriverType,
)


class Phase1DecisionDTOTestCase(unittest.TestCase):

    def test_operational_severity_dto_immutability(self):
        dto = OperationalSeverityDTO(
            tier="RED_CRITICAL",
            rank=4,
            thermal_rank=4,
            blast_rank=2,
            dominant_hazard=DominantHazardType.THERMAL.value,
            tactical_directive="NO ENTRY.",
        )
        self.assertEqual(dto.tier, "RED_CRITICAL")
        self.assertEqual(dto.rank, 4)
        with self.assertRaises(Exception):
            dto.rank = 3  # Frozen dataclass mutation must fail

    def test_decision_support_report_dto_json_serialization(self):
        sev_breakdown = {
            "red_critical": SeverityBreakdownTierDTO(
                tier_name="RED_CRITICAL",
                nominal_radius_m=86.4,
                enclosed_area_m2=23450.0,
                thermal_threshold_kw_m2=37.5,
                blast_threshold_kpa=70.0,
                tactical_directive="NO ENTRY",
            )
        }
        sectors = [
            ApproachSectorIntelligenceDTO(
                cardinal="NW",
                azimuth_deg=315.0,
                exposure_score=5.2,
                classification=ApproachSectorClassification.OPTIMAL_UPWIND_CORRIDOR.value,
                max_safe_approach_distance_m=295.0,
                operational_advice="Recommended ingress.",
            )
        ]
        directional = DirectionalIntelligenceDTO(
            optimal_sector="NW",
            optimal_bearing_deg=315.0,
            upwind_bearing_deg=315.0,
            downwind_bearing_deg=135.0,
            exclusion_arc_start_deg=90.0,
            exclusion_arc_end_deg=180.0,
            sectors=sectors,
        )
        expl = ExplainabilityReportDTO(
            zone_dimension_rationale="BLEVE explosion size...",
            spatial_asymmetry_rationale="Wind tilt causes SE plume...",
            approach_rationale="NW has 95% lower flux...",
            dominant_hazard_rationale="Thermal radiation dominates far field.",
        )
        report = DecisionSupportReportDTO(
            provenance_hash="abc123hash",
            execution_timestamp_utc="2026-09-01T15:30:00Z",
            operational_summary={"primary_threat_level": "RED_CRITICAL"},
            severity_breakdown=sev_breakdown,
            directional_intelligence=directional,
            explainability_report=expl,
        )

        d = report.to_dict()
        self.assertEqual(d["provenance_hash"], "abc123hash")
        # Ensure json dumps succeeds cleanly
        serialized = json.dumps(d)
        self.assertIn("RED_CRITICAL", serialized)
        self.assertIn("OPTIMAL_UPWIND_CORRIDOR", serialized)


if __name__ == "__main__":
    unittest.main()
