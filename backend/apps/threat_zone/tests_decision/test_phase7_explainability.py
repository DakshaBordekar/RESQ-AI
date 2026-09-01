"""
RESQ-ENG-PLAN-2026-002 — PHASE 7 VERIFICATION TEST SUITE
Deterministic Explainability Engine Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.explainability_engine import generate_explainability_report
from apps.threat_zone.decision_engine.approach_intelligence import evaluate_directional_intelligence
from apps.threat_zone.decision_engine.sensitivity_engine import evaluate_sensitivity_analysis
from apps.threat_zone.decision_engine.scenario_comparator import compare_scenarios
from apps.threat_zone.decision_engine.dtos import ExplainabilityReportDTO
from apps.threat_zone.physics_engine import run_hazard_model


class Phase7ExplainabilityEngineTestCase(unittest.TestCase):

    def test_explainability_report_synthesis(self):
        raw_scenario = {
            "facility_name": "Chennai Petrochem LPG Sphere",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 6.5,
            "wind_direction_deg": 135.0,
        }
        res = run_hazard_model(raw_scenario)
        dir_intel = evaluate_directional_intelligence(res.scenario, res.source, res.material, res.radii)
        sens = evaluate_sensitivity_analysis(raw_scenario, res)

        expl = generate_explainability_report(res, dir_intel, sensitivity=sens)

        self.assertIsInstance(expl, ExplainabilityReportDTO)

        # Assert factual references in generated text
        self.assertIn("Chennai Petrochem LPG Sphere", expl.zone_dimension_rationale)
        self.assertIn("BLEVE fireball", expl.zone_dimension_rationale)
        self.assertIn("6.5 m/s", expl.spatial_asymmetry_rationale)
        self.assertIn("135°", expl.spatial_asymmetry_rationale)
        self.assertIn("optimal tactical ingress", expl.approach_rationale)
        self.assertIsNotNone(expl.dominant_hazard_rationale)


if __name__ == "__main__":
    unittest.main()
