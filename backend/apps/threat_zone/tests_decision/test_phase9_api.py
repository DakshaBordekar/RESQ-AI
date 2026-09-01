"""
RESQ-ENG-PLAN-2026-002 — PHASE 9 VERIFICATION TEST SUITE
Django REST Framework API Endpoints Test Suite
"""

from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse


class Phase9DecisionAPITestCase(APITestCase):

    def test_decision_support_endpoint_success(self):
        url = reverse('threat-zone-decision-support')
        payload = {
            "scenario": {
                "facility_name": "API Test Facility - LPG",
                "latitude": 13.0300,
                "longitude": 80.2350,
                "tank_geometry": "SPHERE",
                "tank_diameter_m": 12.0,
                "fill_fraction": 0.85,
                "fuel_type": "LPG",
                "explosion_yield_factor": 0.04,
                "wind_speed_ms": 6.0,
                "wind_direction_deg": 135.0,
            },
            "options": {
                "compute_sensitivity": True,
                "compute_uncertainty": True,
                "generate_explanation": True,
            }
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertIn("provenance_hash", data)
        self.assertIn("operational_summary", data)
        self.assertIn("severity_breakdown", data)
        self.assertIn("directional_intelligence", data)
        self.assertIn("sensitivity_analysis", data)
        self.assertIn("uncertainty_assessment", data)
        self.assertIn("explainability_report", data)

        self.assertEqual(data["operational_summary"]["primary_threat_level"], "RED_CRITICAL")
        self.assertEqual(len(data["directional_intelligence"]["sectors"]), 16)

    def test_differential_compare_endpoint_success(self):
        url = reverse('threat-zone-compare')
        payload = {
            "scenario_a": {
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
            },
            "scenario_b": {
                "facility_name": "Facility B — Diesel Pool",
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
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        self.assertEqual(data["facility_a_name"], "Facility A — LPG Sphere")
        self.assertEqual(data["facility_b_name"], "Facility B — Diesel Pool")
        self.assertGreater(data["power_release_rate_ratio"], 1.0)
        self.assertIn("Comparative Physical Analysis", data["comparative_analysis_text"].title())

    def test_sensitivity_endpoint_success(self):
        url = reverse('threat-zone-sensitivity')
        payload = {
            "scenario": {
                "latitude": 13.0300,
                "longitude": 80.2350,
                "tank_geometry": "SPHERE",
                "tank_diameter_m": 12.0,
                "fill_fraction": 0.85,
                "fuel_type": "LPG",
            }
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("baseline_green_radius_m", data)
        self.assertGreater(len(data["parameters"]), 0)

    def test_validation_error_handling(self):
        url = reverse('threat-zone-decision-support')
        payload = {
            "scenario": {
                "latitude": "not-a-number",  # Invalid
                "longitude": 80.2350,
            }
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_legacy_calculate_endpoint_backward_compatibility(self):
        url = reverse('threat-zone-calculate')
        payload = {
            "facility_type": "FACILITY_A_LPG",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "mass_kg": 40000.0,
            "fuel_type": "LPG",
            "wind_speed_ms": 6.5,
            "wind_direction_deg": 135.0,
        }
        response = self.client.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn("threat_bands", data)
        self.assertIn("blast_bands", data)
        self.assertIn("safe_approach_vector", data)


if __name__ == "__main__":
    unittest.main()
