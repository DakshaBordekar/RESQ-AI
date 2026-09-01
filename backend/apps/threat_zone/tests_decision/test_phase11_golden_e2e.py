"""
RESQ-ENG-PLAN-2026-002 — PHASE 11 VERIFICATION TEST SUITE
End-to-End Golden Disaster Scenarios & Concurrency QA
"""

import unittest
from concurrent.futures import ThreadPoolExecutor
from apps.threat_zone.decision_engine.service import (
    compute_decision_support_report,
    compute_differential_comparison,
)
from apps.threat_zone.decision_engine.dtos import (
    DecisionSupportReportDTO,
    ScenarioComparisonDTO,
)


class Phase11GoldenE2ETestCase(unittest.TestCase):

    def test_golden_facility_a_lpg_bleve_end_to_end(self):
        scenario = {
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
        report = compute_decision_support_report(
            scenario_data=scenario,
            compute_sensitivity=True,
            compute_uncertainty=True,
            generate_explanation=True,
        )

        self.assertIsInstance(report, DecisionSupportReportDTO)
        self.assertEqual(report.operational_summary["primary_threat_level"], "RED_CRITICAL")
        self.assertEqual(report.operational_summary["dominant_hazard_mechanism"], "COMPOUND_BLEVE_AND_SHOCKWAVE")
        self.assertGreater(report.operational_summary["max_lethal_radius_m"], 30.0)
        self.assertGreater(report.operational_summary["max_evacuation_radius_m"], 200.0)

        # Directional checks
        self.assertEqual(len(report.directional_intelligence.sectors), 16)
        self.assertEqual(report.directional_intelligence.upwind_bearing_deg, 135.0)

        # Sensitivity checks
        self.assertIsNotNone(report.sensitivity_analysis)
        self.assertGreater(len(report.sensitivity_analysis.parameters), 0)

        # Uncertainty checks
        self.assertIsNotNone(report.uncertainty_assessment)
        self.assertGreaterEqual(report.uncertainty_assessment.p95_radius_m, report.uncertainty_assessment.p50_radius_m)

        # Explainability checks
        self.assertIn("Chennai Petrochem LPG Sphere", report.explainability_report.zone_dimension_rationale)

    def test_golden_facility_b_diesel_pool_fire_end_to_end(self):
        scenario = {
            "facility_name": "Chennai Fuel Terminal - Diesel Bund",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 20.0,
            "tank_height_m": 10.0,
            "fill_fraction": 0.80,
            "fuel_type": "DIESEL",
            "bund_present": True,
            "bund_diameter_m": 25.0,
            "wind_speed_ms": 7.0,
            "wind_direction_deg": 180.0,
        }
        report = compute_decision_support_report(
            scenario_data=scenario,
            compute_sensitivity=True,
            compute_uncertainty=False,
            generate_explanation=True,
        )

        self.assertIsInstance(report, DecisionSupportReportDTO)
        self.assertEqual(report.operational_summary["dominant_hazard_mechanism"], "SUSTAINED_THERMAL_RADIATION")
        self.assertEqual(report.directional_intelligence.upwind_bearing_deg, 180.0)
        self.assertEqual(report.directional_intelligence.downwind_bearing_deg, 0.0)

    def test_differential_scenario_comparison_e2e(self):
        scenario_a = {
            "facility_name": "Facility A LPG",
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
        scenario_b = {
            "facility_name": "Facility B Diesel",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 20.0,
            "tank_height_m": 10.0,
            "fill_fraction": 0.80,
            "fuel_type": "DIESEL",
            "bund_present": True,
            "bund_diameter_m": 25.0,
            "wind_speed_ms": 6.0,
            "wind_direction_deg": 135.0,
        }
        comparison = compute_differential_comparison(scenario_a, scenario_b)
        self.assertIsInstance(comparison, ScenarioComparisonDTO)
        self.assertGreater(comparison.power_release_rate_ratio, 1.0)
        self.assertGreater(comparison.blast_tnt_delta_kg, 0.0)

    def test_multithreaded_concurrency_stress(self):
        """Execute 20 concurrent threads running complete decision support pipelines simultaneously."""
        scenario = {
            "facility_name": "Concurrent Load Facility",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 10.0,
            "fill_fraction": 0.75,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 90.0,
        }

        def _worker():
            return compute_decision_support_report(
                scenario_data=scenario,
                compute_sensitivity=True,
                compute_uncertainty=False,
                generate_explanation=True,
            )

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(_worker) for _ in range(20)]
            results = [f.result() for f in futures]

        self.assertEqual(len(results), 20)
        prov_hashes = [r.provenance_hash for r in results]
        # All 20 threads must produce bitwise identical provenance hashes (deterministic!)
        self.assertEqual(len(set(prov_hashes)), 1)


if __name__ == "__main__":
    unittest.main()
