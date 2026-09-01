"""
========================================================================================
RESQ-AI DER-02 THREAT-ZONE ESTIMATION ENGINE — GOLDEN BRUTAL REGRESSION TEST SUITE
Architected by: 35-Year Veteran Principal QA Automation & Physics Validation Lead
========================================================================================
This test suite executes exhaustive, brutal stress testing across physics models, thermodynamic
limits, wind vector skewing, coordinate geometry, API protocols, and edge-case boundary conditions.
"""

import math

import pytest
from apps.threat_zone.services.blast_model import calculate_blast_overpressure
from apps.threat_zone.services.bleve_fireball_model import calculate_bleve_fireball
from apps.threat_zone.services.pool_fire_model import calculate_pool_fire_zones
from apps.threat_zone.services.safe_vector_solver import (
    calculate_safe_approach_vector,
)
from django.test import TestCase
from rest_framework.test import APIClient


class BrutalGoldenQATestCase(TestCase):

  def setUp(self):
    self.client = APIClient()

  # ====================================================================================
  # SECTION 1: ANALYTICAL PHYSICS MATH & FORMULA PRECISION TESTS
  # ====================================================================================

  def test_roberts_fireball_exact_analytical_precision(self):
    """Verifies Roberts Correlations (rf = 3.86 * M^0.325, tf = 0.825 * M^0.26) across 5 orders of magnitude."""
    test_masses = [100.0, 1000.0, 40000.0, 100000.0, 1000000.0]

    for M in test_masses:
      res = calculate_bleve_fireball(mass_kg=M, fuel_type="LPG")
      expected_rf = round(3.86 * (M**0.325), 1)
      expected_tf = round(0.825 * (M**0.26), 1)

      self.assertEqual(
          res["fireball_radius_m"],
          expected_rf,
          f"Fireball radius mismatch for mass {M}",
      )
      self.assertEqual(
          res["fireball_duration_s"],
          expected_tf,
          f"Fireball duration mismatch for mass {M}",
      )
      self.assertFalse(
          math.isnan(res["total_energy_gj"]),
          f"NaN detected in total energy for mass {M}",
      )
      self.assertFalse(
          math.isinf(res["total_energy_gj"]),
          f"Infinity detected in total energy for mass {M}",
      )

  def test_thomas_1963_flame_height_scaling_and_bounds(self):
    """Verifies Thomas (1963) Non-Dimensional Flame Height scaling and physical bounds."""
    for D in [2.0, 10.0, 30.0, 100.0]:
      res = calculate_pool_fire_zones(
          diameter_m=D,
          fuel_type="Gasoline",
          wind_speed_ms=5.0,
          wind_direction_deg=90.0,
      )
      H = res["flame_height_m"]
      self.assertGreater(
          H,
          D * 0.5,
          f"Flame height H={H} must be physically greater than 0.5*D for pool D={D}",
      )
      self.assertLess(
          H,
          D * 10.0,
          f"Flame height H={H} exceeds physical scaling limit for pool D={D}",
      )

  def test_welker_sliepcevich_flame_tilt_bounds(self):
    """Verifies Welker & Sliepcevich Flame Tilt angle remains strictly bounded in [0, 90] degrees."""
    for wind_speed in [0.0, 1.0, 10.0, 30.0, 60.0, 120.0]:
      res = calculate_pool_fire_zones(
          diameter_m=20.0,
          fuel_type="Gasoline",
          wind_speed_ms=wind_speed,
          wind_direction_deg=0.0,
      )
      tilt = res["flame_tilt_deg"]
      self.assertGreaterEqual(
          tilt,
          0.0,
          f"Tilt angle {tilt} cannot be negative at wind speed {wind_speed}",
      )
      self.assertLessEqual(
          tilt,
          90.0,
          f"Tilt angle {tilt} cannot exceed 90 degrees at wind speed"
          f" {wind_speed}",
      )

  def test_brode_1955_blast_overpressure_monotonic_decrease(self):
    """Verifies Brode (1955) blast overpressure strictly decreases with distance (d P / d r < 0)."""
    res = calculate_blast_overpressure(
        mass_kg=40000.0, fuel_type="LPG", yield_factor=0.04
    )
    red_r = res["bands"]["red_lethal"]["max_radius_m"]  # 83 kPa threshold
    orange_r = res["bands"]["orange_serious"][
        "max_radius_m"
    ]  # 17 kPa threshold
    yellow_r = res["bands"]["yellow_evacuate"][
        "max_radius_m"
    ]  # 3.5 kPa threshold

    self.assertLess(
        red_r,
        orange_r,
        f"Lethal overpressure radius ({red_r}m) must be smaller than serious"
        f" threat radius ({orange_r}m)",
    )
    self.assertLess(
        orange_r,
        yellow_r,
        f"Serious threat overpressure radius ({orange_r}m) must be smaller than"
        f" evacuation radius ({yellow_r}m)",
    )

  # ====================================================================================
  # SECTION 2: COMPUTATIONAL GEOMETRY & COORDINATE MESH INTEGRITY TESTS
  # ====================================================================================

  def test_polygon_closure_and_coordinate_validity(self):
    """Verifies every generated threat polygon is a closed ring with valid lat/lon coordinates."""
    res = calculate_pool_fire_zones(
        diameter_m=30.0,
        fuel_type="Gasoline",
        wind_speed_ms=12.0,
        wind_direction_deg=135.0,
    )

    for band_name, band_data in res["bands"].items():
      poly = band_data["polygon"]
      self.assertGreaterEqual(
          len(poly),
          37,
          f"Polygon {band_name} must contain at least 37 sample points",
      )

      # Topological closure check: First point == Last point
      first_pt = poly[0]
      last_pt = poly[-1]
      self.assertAlmostEqual(
          first_pt[0],
          last_pt[0],
          places=6,
          msg=f"Polygon {band_name} latitude not closed",
      )
      self.assertAlmostEqual(
          first_pt[1],
          last_pt[1],
          places=6,
          msg=f"Polygon {band_name} longitude not closed",
      )

      # Valid GPS Boundary Assertions (-90 <= lat <= 90, -180 <= lon <= 180)
      for idx, pt in enumerate(poly):
        lat, lon = pt[0], pt[1]
        self.assertTrue(
            -90.0 <= lat <= 90.0,
            f"Invalid latitude {lat} at index {idx} in {band_name}",
        )
        self.assertTrue(
            -180.0 <= lon <= 180.0,
            f"Invalid longitude {lon} at index {idx} in {band_name}",
        )
        self.assertFalse(
            math.isnan(lat) or math.isnan(lon),
            f"NaN detected in coordinate index {idx} in {band_name}",
        )

  def test_wind_warping_downwind_vs_upwind_skewing(self):
    """Verifies high wind speed stretches the downwind radius compared to the upwind radius."""
    wind_dir = 90.0  # Wind blowing to the East (90 degrees)
    res = calculate_pool_fire_zones(
        diameter_m=25.0,
        fuel_type="Gasoline",
        wind_speed_ms=20.0,
        wind_direction_deg=wind_dir,
    )

    # Downwind point is at 90 deg (East), Upwind point is at 270 deg (West)
    poly = res["bands"]["red_lethal"]["polygon"]
    origin_lat, origin_lon = 13.0300, 80.2350

    # Find vertex at East (90 deg) and West (270 deg)
    east_pt = poly[9]  # 90 degrees step
    west_pt = poly[27]  # 270 degrees step

    dist_east = abs(east_pt[1] - origin_lon)
    dist_west = abs(west_pt[1] - origin_lon)

    self.assertGreater(
        dist_east,
        dist_west,
        f"Downwind distance ({dist_east}) must exceed upwind distance"
        f" ({dist_west}) under 20 m/s wind",
    )

  def test_safe_approach_vector_exact_inverse_heading(self):
    """Verifies safe approach vector is exactly (wind_dir + 180) % 360 across all 8 cardinal quadrants."""
    test_angles = [
        (0.0, 180.0, "S"),
        (45.0, 225.0, "SW"),
        (90.0, 270.0, "W"),
        (135.0, 315.0, "NW"),
        (180.0, 0.0, "N"),
        (225.0, 45.0, "NE"),
        (270.0, 90.0, "E"),
        (315.0, 135.0, "SE"),
    ]

    for wind_dir, expected_safe_deg, expected_cardinal in test_angles:
      res = calculate_safe_approach_vector(wind_direction_deg=wind_dir)
      self.assertEqual(
          res["safe_angle_deg"],
          expected_safe_deg,
          f"Failed safe angle calculation for wind {wind_dir}°",
      )
      self.assertEqual(
          res["cardinal_direction"],
          expected_cardinal,
          f"Failed cardinal direction for wind {wind_dir}°",
      )

  # ====================================================================================
  # SECTION 3: EXTREME THERMODYNAMIC STRESS & EDGE-CASE BOUNDARY TESTS
  # ====================================================================================

  def test_extreme_zero_wind_symmetry(self):
    """Verifies zero wind (0 m/s) produces a perfectly symmetric non-displaced hazard zone."""
    res = calculate_pool_fire_zones(
        diameter_m=20.0,
        fuel_type="Gasoline",
        wind_speed_ms=0.0,
        wind_direction_deg=0.0,
    )
    self.assertEqual(res["downwind_displacement_m"], 0.0)
    self.assertEqual(res["flame_tilt_deg"], 0.0)

  def test_extreme_hurricane_wind_resilience(self):
    """Verifies engine stability under 60 m/s (Category 4 hurricane) wind conditions."""
    res = calculate_pool_fire_zones(
        diameter_m=30.0,
        fuel_type="Gasoline",
        wind_speed_ms=60.0,
        wind_direction_deg=220.0,
    )
    self.assertGreater(res["flame_tilt_deg"], 0.0)
    self.assertLessEqual(res["flame_tilt_deg"], 90.0)
    self.assertIn("red_lethal", res["bands"])

  def test_extreme_micro_and_mega_mass_resilience(self):
    """Verifies system handles micro-leaks (10 kg) and mega-disasters (10,000,000 kg) without crashing."""
    res_micro = calculate_bleve_fireball(mass_kg=10.0, fuel_type="LPG")
    self.assertGreater(res_micro["fireball_radius_m"], 0.0)

    res_mega = calculate_bleve_fireball(mass_kg=10000000.0, fuel_type="LPG")
    self.assertGreater(res_mega["fireball_radius_m"], 500.0)

  # ====================================================================================
  # SECTION 4: REST API ENDPOINT PROTOCOL & SCHEMA CONTRACT STRESS TESTS
  # ====================================================================================

  def test_api_facility_a_payload_contract(self):
    """Tests POST /api/threat-zone/calculate/ for Facility A payload contract enforcement."""
    payload = {
        "facility_type": "FACILITY_A_LPG",
        "latitude": 13.0300,
        "longitude": 80.2350,
        "mass_kg": 40000,
        "wind_speed_ms": 10.0,
        "wind_direction_deg": 180.0,
    }
    response = self.client.post(
        "/api/threat-zone/calculate/", payload, format="json"
    )
    self.assertEqual(response.status_code, 200)

    data = response.data
    self.assertEqual(data["facility_type"], "FACILITY_A_LPG")
    self.assertIn("physics_metrics", data)
    self.assertIn("threat_bands", data)
    self.assertIn("blast_bands", data)
    self.assertIn("safe_approach_vector", data)

    # Check physics metric fields
    metrics = data["physics_metrics"]
    self.assertIn("fireball_radius_m", metrics)
    self.assertIn("fireball_duration_s", metrics)
    self.assertIn("w_tnt_equivalent_kg", metrics)

  def test_api_facility_b_payload_contract(self):
    """Tests POST /api/threat-zone/calculate/ for Facility B pool fire payload contract enforcement."""
    payload = {
        "facility_type": "FACILITY_B_POOL_FIRE",
        "latitude": 13.0300,
        "longitude": 80.2350,
        "pool_diameter_m": 35.0,
        "wind_speed_ms": 14.5,
        "wind_direction_deg": 45.0,
    }
    response = self.client.post(
        "/api/threat-zone/calculate/", payload, format="json"
    )
    self.assertEqual(response.status_code, 200)

    data = response.data
    self.assertEqual(data["facility_type"], "FACILITY_B_POOL_FIRE")
    self.assertIn("flame_height_m", data["physics_metrics"])
    self.assertIn("flame_tilt_deg", data["physics_metrics"])
    self.assertIn("downwind_displacement_m", data["physics_metrics"])

  def test_api_malformed_and_missing_field_resilience(self):
    """Tests API graceful handling of empty or missing payload fields."""
    response = self.client.post("/api/threat-zone/calculate/", {}, format="json")
    self.assertEqual(response.status_code, 200)
    self.assertIn("facility_type", response.data)
    self.assertIn("threat_bands", response.data)

  def test_api_compare_scenarios_contract(self):
    """Tests GET /api/threat-zone/scenarios/ comparative contract enforcement."""
    response = self.client.get("/api/threat-zone/scenarios/")
    self.assertEqual(response.status_code, 200)
    self.assertIn("facility_a", response.data)
    self.assertIn("facility_b", response.data)
    self.assertIn("explanation", response.data["facility_a"])
    self.assertIn("explanation", response.data["facility_b"])
