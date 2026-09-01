"""
RESQ-ENG-SPEC-2026-001 — PHASE 6 VERIFICATION TEST SUITE
Point Consequence Evaluation Model (Multi-Hazard Atomic Evaluation & Determinism)
"""

import math
import unittest

from apps.threat_zone.physics_engine.models.point_evaluator import (
    PointEvaluationDTO,
    evaluate_point,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import InvalidCoordinatesException


class Phase6PointEvaluationTestCase(unittest.TestCase):

    def setUp(self):
        self.scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 270.0,
        })
        self.material = MaterialRegistry.get("LPG")
        self.source = characterize_source(self.scenario, self.material)

    def test_origin_point_evaluation_singularity_safety(self):
        """Evaluating origin point (0, 0, 0) must trap distance singularity and return valid DTO."""
        res = evaluate_point(self.scenario, self.source, self.material, x_m=0.0, y_m=0.0, z_m=0.0)
        self.assertEqual(res.distance_m, 0.0)
        self.assertFalse(math.isnan(res.thermal_flux_kw_m2))
        self.assertFalse(math.isnan(res.blast_overpressure_kpa))
        self.assertGreater(res.thermal_flux_kw_m2, 0.0)
        self.assertEqual(res.blast_overpressure_kpa, 2000.0)  # Near-field Mach stem cap
        self.assertEqual(res.combined_band, "RED_CRITICAL")

    def test_bearing_calculation_cardinal_axes(self):
        """Verify polar bearing calculations in compass coordinates (0°=N, 90°=E, 180°=S, 270°=W)."""
        # North: (0, 100) -> 0.0°
        res_n = evaluate_point(self.scenario, self.source, self.material, x_m=0.0, y_m=100.0)
        self.assertEqual(res_n.bearing_deg, 0.0)
        self.assertEqual(res_n.distance_m, 100.0)

        # East: (100, 0) -> 90.0°
        res_e = evaluate_point(self.scenario, self.source, self.material, x_m=100.0, y_m=0.0)
        self.assertEqual(res_e.bearing_deg, 90.0)
        self.assertEqual(res_e.distance_m, 100.0)

        # South: (0, -100) -> 180.0°
        res_s = evaluate_point(self.scenario, self.source, self.material, x_m=0.0, y_m=-100.0)
        self.assertEqual(res_s.bearing_deg, 180.0)
        self.assertEqual(res_s.distance_m, 100.0)

        # West: (-100, 0) -> 270.0°
        res_w = evaluate_point(self.scenario, self.source, self.material, x_m=-100.0, y_m=0.0)
        self.assertEqual(res_w.bearing_deg, 270.0)
        self.assertEqual(res_w.distance_m, 100.0)

    def test_point_evaluator_deterministic_reproducibility(self):
        """10 consecutive point evaluations with identical inputs must produce bitwise identical results."""
        results = [
            evaluate_point(self.scenario, self.source, self.material, x_m=150.0, y_m=75.0, z_m=1.5)
            for _ in range(10)
        ]
        baseline = results[0]
        for res in results[1:]:
            self.assertEqual(res.thermal_flux_kw_m2, baseline.thermal_flux_kw_m2)
            self.assertEqual(res.blast_overpressure_kpa, baseline.blast_overpressure_kpa)
            self.assertEqual(res.combined_band, baseline.combined_band)
            self.assertEqual(res.distance_m, baseline.distance_m)
            self.assertEqual(res.bearing_deg, baseline.bearing_deg)

    def test_out_of_domain_coordinates_raise_exception(self):
        """Coordinates exceeding +/- 25,000m must raise InvalidCoordinatesException."""
        with self.assertRaises(InvalidCoordinatesException):
            evaluate_point(self.scenario, self.source, self.material, x_m=30000.0, y_m=0.0)

        with self.assertRaises(InvalidCoordinatesException):
            evaluate_point(self.scenario, self.source, self.material, x_m=0.0, y_m=-26000.0)


if __name__ == "__main__":
    unittest.main()
