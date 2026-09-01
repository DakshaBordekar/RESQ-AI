"""
RESQ-ENG-PLAN-2026-002 — PHASE 5 VERIFICATION TEST SUITE
Deterministic Sensitivity Gradient Engine Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.sensitivity_engine import evaluate_sensitivity_analysis
from apps.threat_zone.decision_engine.dtos import SensitivityAnalysisDTO
from apps.threat_zone.physics_engine import run_hazard_model


class Phase5SensitivityEngineTestCase(unittest.TestCase):

    def test_lpg_bleve_sensitivity_sweep(self):
        """Execute sensitivity sweep on LPG BLEVE scenario."""
        raw_scenario = {
            "facility_name": "LPG Sphere Tank",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.80,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 135.0,
        }
        res = run_hazard_model(raw_scenario)
        sens = evaluate_sensitivity_analysis(raw_scenario, res)

        self.assertIsInstance(sens, SensitivityAnalysisDTO)
        self.assertGreater(sens.baseline_green_radius_m, 0.0)
        self.assertGreaterEqual(len(sens.parameters), 3)

        # Check parameter names
        names = [p.parameter_name for p in sens.parameters]
        self.assertIn("fill_fraction", names)
        self.assertIn("tank_diameter_m", names)
        self.assertIn("wind_speed_ms", names)

        # Increasing tank diameter must increase hazard radius
        diam_p = next(p for p in sens.parameters if p.parameter_name == "tank_diameter_m")
        self.assertGreater(diam_p.delta_radius_m, 0.0)
        self.assertGreater(diam_p.elasticity_percent, 0.0)


if __name__ == "__main__":
    unittest.main()
