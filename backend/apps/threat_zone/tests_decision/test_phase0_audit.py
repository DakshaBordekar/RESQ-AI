"""
RESQ-ENG-PLAN-2026-002 — PHASE 0 VERIFICATION TEST SUITE
Architecture & Interface Freeze Audit
"""

import unittest
from apps.threat_zone.physics_engine import (
    run_hazard_model,
    HazardModelResultDTO,
    ScenarioInputDTO,
    MaterialPropertiesDTO,
    SourceTermsDTO,
    HazardZoneRadiiDTO,
    HazardPolygonsDTO,
    HazardGridDTO,
    SafeApproachPlanDTO,
    MonteCarloResultDTO,
    validate_and_build_scenario,
    MaterialRegistry,
)


class Phase0ArchitectureAuditTestCase(unittest.TestCase):

    def test_physics_engine_interface_availability(self):
        """Verify that all core Engineer 1 physical models, DTOs, and registry are cleanly importable."""
        self.assertTrue(callable(run_hazard_model))
        self.assertTrue(callable(validate_and_build_scenario))
        self.assertTrue(callable(MaterialRegistry.get))

    def test_pipeline_output_contract_completeness(self):
        """Verify that Engineer 1's master pipeline produces all structured fields required by Engineer 2."""
        raw_scenario = {
            "facility_name": "Audit Facility A - LPG",
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

        result = run_hazard_model(
            raw_scenario,
            include_spatial_grid=True,
            grid_extent_m=500.0,
            grid_resolution_m=50.0,
            run_monte_carlo=True,
            monte_carlo_samples=100,
        )

        self.assertIsInstance(result, HazardModelResultDTO)
        self.assertIsInstance(result.scenario, ScenarioInputDTO)
        self.assertIsInstance(result.material, MaterialPropertiesDTO)
        self.assertIsInstance(result.source, SourceTermsDTO)
        self.assertIsInstance(result.radii, HazardZoneRadiiDTO)
        self.assertIsInstance(result.polygons, HazardPolygonsDTO)
        self.assertIsInstance(result.spatial_grid, HazardGridDTO)
        self.assertIsInstance(result.safe_approach, SafeApproachPlanDTO)
        self.assertIsInstance(result.monte_carlo, MonteCarloResultDTO)
        self.assertIsNotNone(result.provenance_hash)
        self.assertGreater(len(result.provenance_hash), 0)


if __name__ == "__main__":
    unittest.main()
