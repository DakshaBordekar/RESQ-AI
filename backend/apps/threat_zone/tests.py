import pytest
from django.test import TestCase
from rest_framework.test import APIClient
from apps.threat_zone.services.pool_fire_model import calculate_pool_fire_zones
from apps.threat_zone.services.bleve_fireball_model import calculate_bleve_fireball
from apps.threat_zone.services.blast_model import calculate_blast_overpressure
from apps.threat_zone.services.safe_vector_solver import calculate_safe_approach_vector

class ThreatZonePhysicsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_pool_fire_thomas_model(self):
        res = calculate_pool_fire_zones(diameter_m=30.0, fuel_type="Gasoline", wind_speed_ms=8.5, wind_direction_deg=135.0)
        self.assertIn("flame_height_m", res)
        self.assertGreater(res["flame_height_m"], 10.0)
        self.assertIn("flame_tilt_deg", res)
        self.assertGreater(res["bands"]["red_lethal"]["max_radius_m"], 0.0)

    def test_bleve_roberts_model(self):
        res = calculate_bleve_fireball(mass_kg=40000.0, fuel_type="LPG")
        self.assertIn("fireball_radius_m", res)
        self.assertAlmostEqual(res["fireball_radius_m"], 121.4, delta=5.0)
        self.assertGreater(res["bands"]["red_lethal"]["max_radius_m"], 300.0)

    def test_brode_blast_overpressure_model(self):
        res = calculate_blast_overpressure(mass_kg=40000.0, fuel_type="LPG", yield_factor=0.04)
        self.assertIn("w_tnt_equivalent_kg", res)
        self.assertGreater(res["bands"]["red_lethal"]["max_radius_m"], 40.0)

    def test_safe_approach_vector_solver(self):
        res = calculate_safe_approach_vector(wind_direction_deg=135.0)
        self.assertEqual(res["safe_angle_deg"], 315.0)
        self.assertEqual(res["cardinal_direction"], "NW")

    def test_calculate_api_endpoint(self):
        response = self.client.post('/api/threat-zone/calculate/', {
            "facility_type": "FACILITY_A_LPG",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "mass_kg": 40000,
            "wind_speed_ms": 8.5,
            "wind_direction_deg": 135.0
        }, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertIn("threat_bands", response.data)
        self.assertIn("safe_approach_vector", response.data)

    def test_compare_scenarios_api_endpoint(self):
        response = self.client.get('/api/threat-zone/scenarios/')
        self.assertEqual(response.status_code, 200)
        self.assertIn("facility_a", response.data)
        self.assertIn("facility_b", response.data)
