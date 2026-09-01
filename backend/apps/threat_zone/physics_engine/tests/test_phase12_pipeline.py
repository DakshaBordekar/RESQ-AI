"""
RESQ-ENG-SPEC-2026-001 — PHASE 12 VERIFICATION TEST SUITE
Comprehensive Pipeline Orchestration Engine (End-to-End Orchestration & GeoJSON Serialization)
"""

import unittest
from apps.threat_zone.physics_engine import (
    run_hazard_model,
    HazardModelResultDTO,
    ScenarioInputDTO,
    validate_and_build_scenario,
)


class Phase12PipelineTestCase(unittest.TestCase):

    def setUp(self):
        self.raw_input = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 270.0,
        }

    def test_run_hazard_model_from_dict_success(self):
        """Pipeline must ingest raw dictionary and produce complete HazardModelResultDTO."""
        result = run_hazard_model(self.raw_input)

        self.assertIsInstance(result, HazardModelResultDTO)
        self.assertEqual(result.model_version, "2.0.0")
        self.assertEqual(result.specification_id, "RESQ-ENG-SPEC-2026-001")
        self.assertIsNotNone(result.provenance_hash)
        self.assertGreater(result.radii.combined_green_m, 0.0)
        self.assertTrue(result.polygons.green_advisory.is_closed)
        self.assertEqual(len(result.safe_approach.sectors), 16)
        self.assertIsNone(result.spatial_grid)
        self.assertIsNone(result.monte_carlo)

    def test_run_hazard_model_from_dto_with_grid_and_monte_carlo(self):
        """Pipeline with full optional spatial grid and Monte Carlo execution enabled."""
        scenario_dto = validate_and_build_scenario(self.raw_input)
        result = run_hazard_model(
            scenario_dto,
            include_spatial_grid=True,
            grid_extent_m=500.0,
            grid_resolution_m=50.0,
            run_monte_carlo=True,
            monte_carlo_samples=100,
        )

        self.assertIsNotNone(result.spatial_grid)
        self.assertEqual(result.spatial_grid.extent_m, 500.0)
        self.assertIsNotNone(result.monte_carlo)
        self.assertEqual(result.monte_carlo.n_samples, 100)

    def test_geojson_serialization_contract(self):
        """Verify GeoJSON conversion adheres to RFC 7946 specification with 4 polygon features."""
        result = run_hazard_model(self.raw_input)
        geojson = result.to_geojson()

        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertEqual(len(geojson["features"]), 4)

        for feat in geojson["features"]:
            self.assertEqual(feat["type"], "Feature")
            self.assertEqual(feat["geometry"]["type"], "Polygon")
            coords = feat["geometry"]["coordinates"][0]
            # GeoJSON coordinates format: [longitude, latitude]
            self.assertEqual(coords[0], coords[-1])
            self.assertIn("hazard_level", feat["properties"])
            self.assertIn("nominal_radius_m", feat["properties"])
            self.assertIn("stroke", feat["properties"])

    def test_provenance_hash_determinism(self):
        """Calling pipeline multiple times on identical input yields bitwise identical provenance signature."""
        res1 = run_hazard_model(self.raw_input)
        res2 = run_hazard_model(self.raw_input)

        self.assertEqual(res1.provenance_hash, res2.provenance_hash)
        self.assertEqual(len(res1.provenance_hash), 64)


if __name__ == "__main__":
    unittest.main()
