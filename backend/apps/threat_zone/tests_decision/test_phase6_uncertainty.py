"""
RESQ-ENG-PLAN-2026-002 — PHASE 6 VERIFICATION TEST SUITE
Uncertainty & Operational Safety Buffer Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.uncertainty_layer import evaluate_uncertainty_assessment
from apps.threat_zone.decision_engine.dtos import UncertaintyAssessmentDTO
from apps.threat_zone.physics_engine import run_hazard_model


class Phase6UncertaintyLayerTestCase(unittest.TestCase):

    def test_uncertainty_with_monte_carlo(self):
        raw_scenario = {
            "facility_name": "LPG Sphere Tank",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 6.0,
            "wind_direction_deg": 135.0,
        }
        res = run_hazard_model(raw_scenario, run_monte_carlo=True, monte_carlo_samples=100)
        uncertainty = evaluate_uncertainty_assessment(res)

        self.assertIsInstance(uncertainty, UncertaintyAssessmentDTO)
        self.assertGreaterEqual(uncertainty.p95_radius_m, uncertainty.p50_radius_m)
        self.assertGreaterEqual(uncertainty.p50_radius_m, uncertainty.p5_radius_m)
        self.assertGreaterEqual(uncertainty.safety_buffer_margin_m, 0.0)
        self.assertIn(uncertainty.confidence_rating, [
            "HIGH_CONFIDENCE_P95_BOUNDED",
            "MODERATE_UNCERTAINTY_RECOMMEND_EXPANDED_BUFFER",
            "HIGH_VARIABILITY_EXPAND_EXCLUSION_PERIMETER"
        ])

    def test_uncertainty_fallback_without_monte_carlo(self):
        raw_scenario = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 15.0,
            "fill_fraction": 0.50,
            "fuel_type": "DIESEL",
            "wind_speed_ms": 4.0,
            "wind_direction_deg": 90.0,
        }
        res = run_hazard_model(raw_scenario, run_monte_carlo=False)
        uncertainty = evaluate_uncertainty_assessment(res)

        self.assertIsInstance(uncertainty, UncertaintyAssessmentDTO)
        self.assertGreater(uncertainty.p95_radius_m, uncertainty.p50_radius_m)
        self.assertGreater(uncertainty.safety_buffer_margin_m, 0.0)


if __name__ == "__main__":
    unittest.main()
