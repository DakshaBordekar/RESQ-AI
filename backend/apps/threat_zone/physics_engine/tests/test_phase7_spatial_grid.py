"""
RESQ-ENG-SPEC-2026-001 — PHASE 7 VERIFICATION TEST SUITE
Spatial Hazard-Field Model (2D Meshgrid Generation, Performance & Point Consistency)
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine.models.spatial_grid import (
    HazardGridDTO,
    generate_hazard_grid,
)
from apps.threat_zone.physics_engine.models.point_evaluator import evaluate_point
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import DomainException


class Phase7SpatialGridTestCase(unittest.TestCase):

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

    def test_grid_mesh_dimensions_exact(self):
        """2000m extent with 25m step must yield exactly 161 x 161 = 25,921 nodes."""
        grid = generate_hazard_grid(
            self.scenario,
            self.source,
            self.material,
            extent_m=2000.0,
            resolution_m=25.0,
        )
        self.assertEqual(len(grid.x_coords), 161)
        self.assertEqual(len(grid.y_coords), 161)
        self.assertEqual(grid.shape, (161, 161))
        self.assertEqual(grid.total_nodes, 25921)
        self.assertEqual(grid.x_coords[0], -2000.0)
        self.assertEqual(grid.x_coords[-1], 2000.0)

    def test_spatial_grid_matches_point_evaluator(self):
        """Spot check grid nodes against direct point evaluations (100% numerical consistency)."""
        grid = generate_hazard_grid(
            self.scenario,
            self.source,
            self.material,
            extent_m=1000.0,
            resolution_m=50.0,
            receiver_height_m=0.0,
        )
        # Spot check node at x = 150m, y = 200m
        # x_coords: [-1000, -950, ..., 0, ..., 150, ..., 1000]
        ix = int(np.where(np.isclose(grid.x_coords, 150.0))[0][0])
        iy = int(np.where(np.isclose(grid.y_coords, 200.0))[0][0])

        grid_flux = grid.thermal_flux_grid[iy, ix]
        grid_blast = grid.blast_overpressure_grid_kpa[iy, ix]

        point_res = evaluate_point(self.scenario, self.source, self.material, x_m=150.0, y_m=200.0, z_m=0.0)

        self.assertAlmostEqual(grid_flux, point_res.thermal_flux_kw_m2, places=4)
        self.assertAlmostEqual(grid_blast, point_res.blast_overpressure_kpa, places=4)

    def test_zone_area_hierarchical_nesting(self):
        """Zone surface areas must follow strict subset nesting: A_green >= A_yellow >= A_orange >= A_red."""
        grid = generate_hazard_grid(
            self.scenario,
            self.source,
            self.material,
            extent_m=1500.0,
            resolution_m=25.0,
        )
        areas = grid.zone_areas_m2
        self.assertGreaterEqual(areas["green_advisory_m2"], areas["yellow_moderate_m2"])
        self.assertGreaterEqual(areas["yellow_moderate_m2"], areas["orange_severe_m2"])
        self.assertGreaterEqual(areas["orange_severe_m2"], areas["red_critical_m2"])
        self.assertGreater(areas["red_critical_m2"], 0.0)

    def test_invalid_grid_parameters_raise_exception(self):
        """Resolution < 5m or extent > 10,000m must raise DomainException."""
        with self.assertRaises(DomainException):
            generate_hazard_grid(self.scenario, self.source, self.material, resolution_m=2.0)

        with self.assertRaises(DomainException):
            generate_hazard_grid(self.scenario, self.source, self.material, extent_m=15000.0)


if __name__ == "__main__":
    unittest.main()
