"""
RESQ-ENG-SPEC-2026-001 — PHASE 9 VERIFICATION TEST SUITE
Geometric Threat Zone Boundary Generator (Closed Polygon Rings & Wind Shifts)
"""

import math
import unittest

from apps.threat_zone.physics_engine.models.threat_polygons import (
    ThreatPolygonDTO,
    HazardPolygonsDTO,
    generate_single_zone_polygon,
    generate_all_hazard_polygons,
)
from apps.threat_zone.physics_engine.models.severity import calculate_hazard_zone_radii
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import DomainException


class Phase9ThreatPolygonsTestCase(unittest.TestCase):

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
            "wind_direction_deg": 270.0,  # Blowing East (90 deg)
        })
        self.material = MaterialRegistry.get("LPG")
        self.source = characterize_source(self.scenario, self.material)
        self.radii = calculate_hazard_zone_radii(self.scenario, self.source, self.material)

    def test_polygons_closure_and_vertex_count(self):
        """All generated hazard zone polygons must be strictly closed with vertex_count == 73 (72 + 1)."""
        polys = generate_all_hazard_polygons(
            self.scenario, self.source, self.material, self.radii, n_vertices=72
        )

        for poly in [polys.red_critical, polys.orange_severe, polys.yellow_moderate, polys.green_advisory]:
            self.assertTrue(poly.is_closed)
            self.assertEqual(len(poly.coordinates), 73)
            self.assertEqual(poly.vertex_count, 73)
            self.assertEqual(poly.coordinates[0], poly.coordinates[-1])
            self.assertGreater(poly.area_m2, 0.0)

    def test_polygon_area_hierarchical_nesting(self):
        """Polygon surface areas must follow strict subset nesting: A_green >= A_yellow >= A_orange >= A_red."""
        polys = generate_all_hazard_polygons(
            self.scenario, self.source, self.material, self.radii
        )
        self.assertGreaterEqual(polys.green_advisory.area_m2, polys.yellow_moderate.area_m2)
        self.assertGreaterEqual(polys.yellow_moderate.area_m2, polys.orange_severe.area_m2)
        self.assertGreaterEqual(polys.orange_severe.area_m2, polys.red_critical.area_m2)

    def test_wind_tilt_downwind_centroid_displacement(self):
        """West wind (blowing East) must shift polygon centroid eastward (mean lon > origin lon)."""
        polys = generate_all_hazard_polygons(
            self.scenario, self.source, self.material, self.radii
        )
        # Average longitude of polygon vertices
        lons = [pt[1] for pt in polys.green_advisory.coordinates[:-1]]
        mean_lon = sum(lons) / len(lons)

        # Facility origin is at lon = 80.2350
        # Wind blowing East -> mean longitude should be shifted East (> 80.2350)
        self.assertGreater(mean_lon, 80.2350)

    def test_zero_radius_polygon_handling(self):
        """Zero radius zone produces valid closed 2-point polygon without exception."""
        poly_zero = generate_single_zone_polygon(
            origin_lat=13.0300,
            origin_lon=80.2350,
            radius_m=0.0,
            level_name="RED_CRITICAL",
        )
        self.assertTrue(poly_zero.is_closed)
        self.assertEqual(poly_zero.nominal_radius_m, 0.0)
        self.assertEqual(poly_zero.area_m2, 0.0)
        self.assertEqual(poly_zero.coordinates[0], poly_zero.coordinates[-1])

    def test_vertex_count_minimum_validation(self):
        """Vertex count < 36 must raise DomainException."""
        with self.assertRaises(DomainException):
            generate_single_zone_polygon(
                origin_lat=13.0300,
                origin_lon=80.2350,
                radius_m=100.0,
                level_name="RED_CRITICAL",
                n_vertices=20,
            )


if __name__ == "__main__":
    unittest.main()
