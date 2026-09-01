"""
RESQ-ENG-SPEC-2026-001 — PHASE 0 VERIFICATION TEST SUITE
Engineering Foundations, Coordinate Projections, Wind Conversions & SI Units
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine.core.constants import (
    EARTH_RADIUS_M,
    GRAVITY_M_S2,
    ATMOSPHERIC_PRESSURE_PA,
    ATMOSPHERIC_PRESSURE_BAR,
    ATMOSPHERIC_PRESSURE_KPA,
    AIR_DENSITY_KG_M3,
    TNT_ENERGY_J_KG,
    MIN_STANDOFF_DISTANCE_M,
    MODEL_VERSION,
    SPECIFICATION_ID,
)
from apps.threat_zone.physics_engine.core.exceptions import (
    InvalidCoordinatesException,
    InvalidWindDirectionException,
    UnitConversionException,
)
from apps.threat_zone.physics_engine.core.units import (
    deg_to_rad,
    rad_to_deg,
    normalize_angle_360,
    bar_to_kpa,
    kpa_to_bar,
    kpa_to_psi,
    psi_to_kpa,
    bar_to_psi,
    celsius_to_kelvin,
    kelvin_to_celsius,
    kw_m2_to_w_m2,
    w_m2_to_kw_m2,
)
from apps.threat_zone.physics_engine.core.coordinates import (
    project_forward,
    project_inverse,
    validate_geographic_coordinates,
)
from apps.threat_zone.physics_engine.core.wind import (
    wind_to_downwind_vector,
    get_cardinal_direction,
    validate_wind_direction,
)


class Phase0EngineeringFoundationsTestCase(unittest.TestCase):

    # =========================================================================
    # 1. CONSTANTS VERIFICATION
    # =========================================================================

    def test_physical_constants_exact_values(self):
        """Verify baseline physical constants against international standards."""
        self.assertEqual(EARTH_RADIUS_M, 6371000.0)
        self.assertEqual(GRAVITY_M_S2, 9.80665)
        self.assertEqual(ATMOSPHERIC_PRESSURE_PA, 101325.0)
        self.assertEqual(ATMOSPHERIC_PRESSURE_BAR, 1.01325)
        self.assertEqual(ATMOSPHERIC_PRESSURE_KPA, 101.325)
        self.assertEqual(AIR_DENSITY_KG_M3, 1.21)
        self.assertEqual(TNT_ENERGY_J_KG, 4.686e6)
        self.assertEqual(MIN_STANDOFF_DISTANCE_M, 1e-3)
        self.assertEqual(MODEL_VERSION, "2.0.0")
        self.assertEqual(SPECIFICATION_ID, "RESQ-ENG-SPEC-2026-001")

    # =========================================================================
    # 2. UNIT CONVERSIONS VERIFICATION
    # =========================================================================

    def test_angle_conversions_and_normalization(self):
        """Verify degree-radian conversions and compass normalization."""
        self.assertAlmostEqual(deg_to_rad(180.0), math.pi, places=12)
        self.assertAlmostEqual(rad_to_deg(math.pi / 2.0), 90.0, places=12)

        # Angle normalization
        self.assertEqual(normalize_angle_360(0.0), 0.0)
        self.assertEqual(normalize_angle_360(360.0), 0.0)
        self.assertEqual(normalize_angle_360(720.0), 0.0)
        self.assertEqual(normalize_angle_360(-45.0), 315.0)
        self.assertEqual(normalize_angle_360(-360.0), 0.0)
        self.assertEqual(normalize_angle_360(450.0), 90.0)

    def test_pressure_conversions(self):
        """Verify pressure conversions between bar, kPa, and psi."""
        self.assertEqual(bar_to_kpa(1.0), 100.0)
        self.assertEqual(kpa_to_bar(100.0), 1.0)
        self.assertAlmostEqual(kpa_to_psi(100.0), 14.50377, places=4)
        self.assertAlmostEqual(psi_to_kpa(14.50377), 100.0, places=4)
        self.assertAlmostEqual(bar_to_psi(1.0), 14.50377, places=4)

    def test_temperature_conversions(self):
        """Verify temperature conversions and absolute zero rejection."""
        self.assertAlmostEqual(celsius_to_kelvin(0.0), 273.15, places=2)
        self.assertAlmostEqual(celsius_to_kelvin(25.0), 298.15, places=2)
        self.assertAlmostEqual(kelvin_to_celsius(298.15), 25.0, places=2)

        with self.assertRaises(UnitConversionException):
            celsius_to_kelvin(-300.0)

        with self.assertRaises(UnitConversionException):
            kelvin_to_celsius(-1.0)

    def test_flux_conversions(self):
        """Verify thermal radiation heat flux conversions."""
        self.assertEqual(kw_m2_to_w_m2(37.5), 37500.0)
        self.assertEqual(w_m2_to_kw_m2(37500.0), 37.5)

    # =========================================================================
    # 3. GEODESIC PROJECTIONS (EQ-GEO-01 & EQ-GEO-02)
    # =========================================================================

    def test_project_forward_origin(self):
        """Origin point projected forward must yield exact (0.0, 0.0) Cartesian coordinates."""
        origin_lat = 13.0827
        origin_lon = 80.2707
        x, y = project_forward(origin_lat, origin_lon, origin_lat, origin_lon)
        self.assertEqual(x, 0.0)
        self.assertEqual(y, 0.0)

    def test_project_forward_one_degree_latitude(self):
        """1 degree latitude change on spherical Earth must equal approx 111,195 m."""
        origin_lat = 0.0
        origin_lon = 0.0
        target_lat = 1.0
        target_lon = 0.0
        x, y = project_forward(target_lat, target_lon, origin_lat, origin_lon)
        expected_y = EARTH_RADIUS_M * (1.0 * math.pi / 180.0)
        self.assertEqual(x, 0.0)
        self.assertAlmostEqual(y, expected_y, delta=0.01)
        self.assertAlmostEqual(y, 111195.0, delta=20.0)

    def test_project_forward_and_inverse_roundtrip_precision(self):
        """Verify that forward projection followed by inverse projection recovers exact coordinates."""
        origin_lat = 13.0300
        origin_lon = 80.2350

        test_points = [
            (13.0350, 80.2400),
            (13.0200, 80.2200),
            (13.1000, 80.3000),
            (12.9500, 80.1500),
        ]

        for lat, lon in test_points:
            x, y = project_forward(lat, lon, origin_lat, origin_lon)
            rec_lat, rec_lon = project_inverse(x, y, origin_lat, origin_lon)
            self.assertAlmostEqual(lat, rec_lat, places=7, msg=f"Latitude mismatch for ({lat}, {lon})")
            self.assertAlmostEqual(lon, rec_lon, places=7, msg=f"Longitude mismatch for ({lat}, {lon})")

    def test_vectorized_coordinates_projection(self):
        """Verify vectorized NumPy operations for forward and inverse coordinate projections."""
        origin_lat = 13.0300
        origin_lon = 80.2350

        lats = np.array([13.0300, 13.0400, 13.0500], dtype=np.float64)
        lons = np.array([80.2350, 80.2450, 80.2550], dtype=np.float64)

        x_arr, y_arr = project_forward(lats, lons, origin_lat, origin_lon)
        self.assertEqual(len(x_arr), 3)
        self.assertEqual(len(y_arr), 3)
        self.assertEqual(x_arr[0], 0.0)
        self.assertEqual(y_arr[0], 0.0)

        rec_lats, rec_lons = project_inverse(x_arr, y_arr, origin_lat, origin_lon)
        np.testing.assert_allclose(lats, rec_lats, rtol=1e-7, atol=1e-7)
        np.testing.assert_allclose(lons, rec_lons, rtol=1e-7, atol=1e-7)

    def test_invalid_coordinates_raise_exception(self):
        """Coordinates outside [-90, 90] lat or [-180, 180] lon must raise InvalidCoordinatesException."""
        with self.assertRaises(InvalidCoordinatesException):
            validate_geographic_coordinates(95.0, 80.0)

        with self.assertRaises(InvalidCoordinatesException):
            validate_geographic_coordinates(-91.0, 0.0)

        with self.assertRaises(InvalidCoordinatesException):
            validate_geographic_coordinates(0.0, 185.0)

        with self.assertRaises(InvalidCoordinatesException):
            validate_geographic_coordinates(0.0, -181.0)

        with self.assertRaises(InvalidCoordinatesException):
            project_forward(95.0, 0.0, 0.0, 0.0)

        with self.assertRaises(InvalidCoordinatesException):
            project_forward(0.0, 0.0, 95.0, 0.0)

    # =========================================================================
    # 4. WIND CONVENTIONS (EQ-WIND-01)
    # =========================================================================

    def test_wind_to_downwind_vector_cardinal_axes(self):
        """
        Verify EQ-WIND-01 downwind transport vector across all 4 primary axes:
        - North wind (0°): blows FROM North TOWARD South (180°), u_wx=0, u_wy=-1
        - East wind (90°): blows FROM East TOWARD West (270°), u_wx=-1, u_wy=0
        - South wind (180°): blows FROM South TOWARD North (0°), u_wx=0, u_wy=1
        - West wind (270°): blows FROM West TOWARD East (90°), u_wx=1, u_wy=0
        """
        # North wind (0°) -> transport South (180°)
        theta_dw, ux, uy = wind_to_downwind_vector(0.0)
        self.assertEqual(theta_dw, 180.0)
        self.assertAlmostEqual(ux, 0.0, places=10)
        self.assertAlmostEqual(uy, -1.0, places=10)

        # East wind (90°) -> transport West (270°)
        theta_dw, ux, uy = wind_to_downwind_vector(90.0)
        self.assertEqual(theta_dw, 270.0)
        self.assertAlmostEqual(ux, -1.0, places=10)
        self.assertAlmostEqual(uy, 0.0, places=10)

        # South wind (180°) -> transport North (0°)
        theta_dw, ux, uy = wind_to_downwind_vector(180.0)
        self.assertEqual(theta_dw, 0.0)
        self.assertAlmostEqual(ux, 0.0, places=10)
        self.assertAlmostEqual(uy, 1.0, places=10)

        # West wind (270°) -> transport East (90°)
        theta_dw, ux, uy = wind_to_downwind_vector(270.0)
        self.assertEqual(theta_dw, 90.0)
        self.assertAlmostEqual(ux, 1.0, places=10)
        self.assertAlmostEqual(uy, 0.0, places=10)

    def test_wind_to_downwind_vector_diagonal(self):
        """Verify NW wind (315°) blows TOWARD SE (135°)."""
        theta_dw, ux, uy = wind_to_downwind_vector(315.0)
        self.assertEqual(theta_dw, 135.0)
        self.assertAlmostEqual(ux, math.sin(math.radians(135.0)), places=10)
        self.assertAlmostEqual(uy, math.cos(math.radians(135.0)), places=10)
        # Verify unit vector magnitude is 1.0
        self.assertAlmostEqual(math.sqrt(ux**2 + uy**2), 1.0, places=10)

    def test_invalid_wind_direction_raises_exception(self):
        """Wind direction outside [0.0, 360.0) must raise InvalidWindDirectionException when strict."""
        with self.assertRaises(InvalidWindDirectionException):
            validate_wind_direction(-1.0)

        with self.assertRaises(InvalidWindDirectionException):
            validate_wind_direction(360.0)

        with self.assertRaises(InvalidWindDirectionException):
            validate_wind_direction(400.0)

        with self.assertRaises(InvalidWindDirectionException):
            wind_to_downwind_vector(-10.0, strict_validation=True)

    def test_cardinal_direction_mapping(self):
        """Verify azimuth mapping to 8-point compass directions."""
        self.assertEqual(get_cardinal_direction(0.0), "N")
        self.assertEqual(get_cardinal_direction(350.0), "N")
        self.assertEqual(get_cardinal_direction(10.0), "N")
        self.assertEqual(get_cardinal_direction(45.0), "NE")
        self.assertEqual(get_cardinal_direction(90.0), "E")
        self.assertEqual(get_cardinal_direction(135.0), "SE")
        self.assertEqual(get_cardinal_direction(180.0), "S")
        self.assertEqual(get_cardinal_direction(225.0), "SW")
        self.assertEqual(get_cardinal_direction(270.0), "W")
        self.assertEqual(get_cardinal_direction(315.0), "NW")


if __name__ == "__main__":
    unittest.main()
