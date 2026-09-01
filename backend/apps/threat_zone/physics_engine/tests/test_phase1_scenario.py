"""
RESQ-ENG-SPEC-2026-001 — PHASE 1 VERIFICATION TEST SUITE
Scenario & Input Model Validation, Volume Calculation & Constraint Enforcement
"""

import math
import unittest

from apps.threat_zone.physics_engine.scenario.enums import TankGeometryType, ReleaseType
from apps.threat_zone.physics_engine.scenario.dtos import (
    FacilityDTO,
    TankDTO,
    AtmosphereDTO,
    ReleaseScenarioDTO,
    ScenarioInputDTO,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.core.exceptions import (
    SchemaValidationException,
    InconsistentGeometryException,
    InvalidCoordinatesException,
    InvalidWindDirectionException,
)


class Phase1ScenarioModelTestCase(unittest.TestCase):

    def test_valid_vertical_cylinder_volume(self):
        """Verify cylindrical volume calculation V_tank = (pi/4)*D^2*H and liquid volume."""
        tank = TankDTO(
            geometry_type=TankGeometryType.VERTICAL_CYLINDER,
            diameter_m=20.0,
            height_m=10.0,
            fill_fraction=0.80,
            material_id="DIESEL",
        )
        expected_total_volume = (math.pi / 4.0) * (20.0 ** 2) * 10.0  # ~3141.59 m^3
        expected_liquid_volume = expected_total_volume * 0.80  # ~2513.27 m^3

        self.assertAlmostEqual(tank.total_volume_m3, expected_total_volume, places=2)
        self.assertAlmostEqual(tank.stored_liquid_volume_m3, expected_liquid_volume, places=2)
        self.assertAlmostEqual(tank.stored_liquid_volume_m3, 2513.27, delta=0.5)

    def test_valid_sphere_volume(self):
        """Verify spherical volume calculation V_tank = (pi/6)*D^3 and liquid volume."""
        tank = TankDTO(
            geometry_type=TankGeometryType.SPHERE,
            diameter_m=12.0,
            height_m=12.0,
            fill_fraction=0.85,
            material_id="LPG",
        )
        expected_total_volume = (math.pi / 6.0) * (12.0 ** 3)  # ~904.78 m^3
        expected_liquid_volume = expected_total_volume * 0.85  # ~769.06 m^3

        self.assertAlmostEqual(tank.total_volume_m3, expected_total_volume, places=2)
        self.assertAlmostEqual(tank.stored_liquid_volume_m3, expected_liquid_volume, places=2)

    def test_validate_and_build_scenario_nested_dict(self):
        """Verify scenario construction from nested configuration dictionary."""
        payload = {
            "scenario_id": "SCN-TEST-01",
            "facility": {
                "facility_id": "FAC-01",
                "facility_name": "Ennore Terminal",
                "latitude": 13.0300,
                "longitude": 80.2350,
            },
            "tank": {
                "geometry_type": "VERTICAL_CYLINDER",
                "diameter_m": 30.0,
                "height_m": 15.0,
                "fill_fraction": 0.75,
                "material_id": "GASOLINE",
                "bund_present": True,
                "bund_diameter_m": 45.0,
            },
            "atmosphere": {
                "wind_speed_ms": 8.5,
                "wind_direction_deg": 135.0,
                "ambient_temperature_k": 300.15,
                "relative_humidity": 0.65,
            },
            "release": {
                "release_type": "CATASTROPHIC_RUPTURE",
                "explosion_yield_factor": 0.04,
            }
        }
        scenario = validate_and_build_scenario(payload)
        self.assertEqual(scenario.scenario_id, "SCN-TEST-01")
        self.assertEqual(scenario.facility.latitude, 13.0300)
        self.assertEqual(scenario.tank.diameter_m, 30.0)
        self.assertEqual(scenario.tank.material_id, "GASOLINE")
        self.assertEqual(scenario.atmosphere.wind_speed_ms, 8.5)
        self.assertEqual(scenario.release.explosion_yield_factor, 0.04)

    def test_validate_and_build_scenario_flat_dict(self):
        """Verify scenario construction from flat REST API request payload."""
        flat_payload = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_diameter_m": 25.0,
            "tank_height_m": 12.0,
            "fill_fraction": 0.90,
            "fuel_type": "Diesel",
            "wind_speed_ms": 6.0,
            "wind_direction_deg": 270.0,
            "ambient_temperature_c": 30.0,
            "relative_humidity": 60.0,  # percentage format
        }
        scenario = validate_and_build_scenario(flat_payload)
        self.assertEqual(scenario.facility.latitude, 13.0300)
        self.assertEqual(scenario.tank.material_id, "DIESEL")
        self.assertEqual(scenario.atmosphere.relative_humidity, 0.60)
        self.assertAlmostEqual(scenario.atmosphere.ambient_temperature_k, 303.15, places=2)

    def test_reject_inconsistent_bund_geometry(self):
        """Bund diameter strictly smaller than tank diameter must raise InconsistentGeometryException."""
        payload = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_diameter_m": 30.0,
            "bund_present": True,
            "bund_diameter_m": 20.0,  # Impossible: bund smaller than tank
            "fuel_type": "Diesel",
        }
        with self.assertRaises(InconsistentGeometryException):
            validate_and_build_scenario(payload)

    def test_reject_out_of_bounds_tank_dimensions(self):
        """Reject unphysical or out-of-screening tank diameters and heights."""
        # Diameter too small (< 1m)
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({"latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 0.5})

        # Diameter too large (> 100m)
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({"latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 150.0})

        # Height too large (> 50m)
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0,
                "longitude": 80.0,
                "tank_diameter_m": 20.0,
                "tank_height_m": 60.0
            })

    def test_reject_out_of_bounds_fill_fraction(self):
        """Reject fill fractions outside [0.05, 1.00]."""
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "fill_fraction": 0.01
            })

        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "fill_fraction": 1.25
            })

    def test_reject_invalid_weather_conditions(self):
        """Reject out-of-range wind speeds, temperatures, or relative humidities."""
        # Wind speed > 25 m/s
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "wind_speed_ms": 35.0
            })

        # Wind direction < 0 or >= 360
        with self.assertRaises(InvalidWindDirectionException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "wind_direction_deg": 360.0
            })

        # Temperature too extreme (< 240K or > 330K)
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "ambient_temperature_k": 350.0
            })

        # Explosion yield factor > 0.15
        with self.assertRaises(SchemaValidationException):
            validate_and_build_scenario({
                "latitude": 13.0, "longitude": 80.0, "tank_diameter_m": 20.0, "explosion_yield_factor": 0.30
            })


if __name__ == "__main__":
    unittest.main()
