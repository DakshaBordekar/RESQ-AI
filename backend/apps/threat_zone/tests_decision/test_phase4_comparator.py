"""
RESQ-ENG-PLAN-2026-002 — PHASE 4 VERIFICATION TEST SUITE
Differential Scenario Comparison Engine Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.scenario_comparator import compare_scenarios
from apps.threat_zone.decision_engine.dtos import ScenarioComparisonDTO
from apps.threat_zone.physics_engine import run_hazard_model


class Phase4ScenarioComparatorTestCase(unittest.TestCase):

    def test_facility_a_vs_facility_b_differential_analysis(self):
        """Compare Facility A (LPG BLEVE) against Facility B (Diesel Pool Fire)."""
        scenario_a = {
            "facility_name": "Facility A — LPG Sphere",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 135.0,
        }
        scenario_b = {
            "facility_name": "Facility B — Diesel Pool Fire",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 20.0,
            "tank_height_m": 10.0,
            "fill_fraction": 0.80,
            "fuel_type": "DIESEL",
            "bund_present": True,
            "bund_diameter_m": 25.0,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 135.0,
        }

        res_a = run_hazard_model(scenario_a)
        res_b = run_hazard_model(scenario_b)

        comparison = compare_scenarios(res_a, res_b)

        self.assertIsInstance(comparison, ScenarioComparisonDTO)
        self.assertEqual(comparison.facility_a_name, "Facility A — LPG Sphere")
        self.assertEqual(comparison.facility_b_name, "Facility B — Diesel Pool Fire")

        # BLEVE power release rate must vastly exceed pool fire power release rate (>10x)
        self.assertGreater(comparison.power_release_rate_ratio, 10.0)

        # Blast TNT delta must be positive (BLEVE has blast, Diesel pool fire has 0 blast)
        self.assertGreater(comparison.blast_tnt_delta_kg, 0.0)

        # Comparative narrative text checks
        self.assertIn("Facility A — LPG Sphere", comparison.comparative_analysis_text)
        self.assertIn("Facility B — Diesel Pool Fire", comparison.comparative_analysis_text)
        self.assertIn("Kinematic Disparity Ratio", comparison.comparative_analysis_text)


if __name__ == "__main__":
    unittest.main()
