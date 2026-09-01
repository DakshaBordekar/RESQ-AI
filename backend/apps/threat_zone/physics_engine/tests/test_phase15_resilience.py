"""
RESQ-ENG-SPEC-2026-001 — PHASE 15 VERIFICATION TEST SUITE
Resilience, Hardening, Input Sanitization & Concurrent Thread-Safety
"""

import math
import unittest
from concurrent.futures import ThreadPoolExecutor

from apps.threat_zone.physics_engine import (
    run_hazard_model,
    HazardModelResultDTO,
    validate_and_build_scenario,
    PhysicsEngineException,
    DomainException,
    InvalidCoordinatesException,
    InvalidWindDirectionException,
)


class Phase15ResilienceTestCase(unittest.TestCase):

    def test_nan_and_inf_inputs_rejected(self):
        """NaN and Infinity values in numeric input fields must raise PhysicsEngineException."""
        corrupt_inputs = [
            {"latitude": float("nan"), "longitude": 80.2350, "tank_diameter_m": 20.0, "fuel_type": "DIESEL"},
            {"latitude": 13.0300, "longitude": float("inf"), "tank_diameter_m": 20.0, "fuel_type": "DIESEL"},
            {"latitude": 13.0300, "longitude": 80.2350, "tank_diameter_m": float("nan"), "fuel_type": "DIESEL"},
            {"latitude": 13.0300, "longitude": 80.2350, "tank_diameter_m": 20.0, "fuel_type": "DIESEL", "wind_speed_ms": float("nan")},
        ]

        for payload in corrupt_inputs:
            with self.assertRaises(PhysicsEngineException):
                run_hazard_model(payload)

    def test_corrupt_and_unknown_material_graceful_handling(self):
        """Unknown or corrupt material identifiers must raise well-typed PhysicsEngineException."""
        with self.assertRaises(PhysicsEngineException):
            run_hazard_model({
                "latitude": 13.0300,
                "longitude": 80.2350,
                "tank_diameter_m": 20.0,
                "fuel_type": "UNOBTANIUM_3000",
            })

    def test_out_of_range_meteorology_rejected(self):
        """Negative wind speed or out-of-range wind directions must raise PhysicsEngineException."""
        # Negative wind speed
        with self.assertRaises(PhysicsEngineException):
            run_hazard_model({
                "latitude": 13.0300,
                "longitude": 80.2350,
                "tank_diameter_m": 20.0,
                "fuel_type": "DIESEL",
                "wind_speed_ms": -5.0,
            })

        # Wind direction >= 360
        with self.assertRaises(PhysicsEngineException):
            run_hazard_model({
                "latitude": 13.0300,
                "longitude": 80.2350,
                "tank_diameter_m": 20.0,
                "fuel_type": "DIESEL",
                "wind_direction_deg": 400.0,
            })

    def test_concurrent_multithreaded_execution_safety(self):
        """50 concurrent threads executing distinct scenarios must complete without race conditions or state corruption."""
        scenarios = [
            {
                "latitude": 13.0300 + (i * 0.001),
                "longitude": 80.2350 + (i * 0.001),
                "tank_diameter_m": 15.0 + (i % 10),
                "fuel_type": "DIESEL" if i % 2 == 0 else "GASOLINE",
                "wind_speed_ms": 3.0 + (i % 5),
                "wind_direction_deg": float((i * 15) % 360),
            }
            for i in range(50)
        ]

        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = [executor.submit(run_hazard_model, scen) for scen in scenarios]
            results = [f.result() for f in futures]

        self.assertEqual(len(results), 50)
        for idx, res in enumerate(results):
            self.assertIsInstance(res, HazardModelResultDTO)
            self.assertEqual(res.scenario.facility.latitude, 13.0300 + (idx * 0.001))
            self.assertGreater(res.radii.combined_green_m, 0.0)


if __name__ == "__main__":
    unittest.main()
