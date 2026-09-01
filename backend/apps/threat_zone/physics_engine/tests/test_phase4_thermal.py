"""
RESQ-ENG-SPEC-2026-001 — PHASE 4 VERIFICATION TEST SUITE
Thermal Radiation Model, Thomas Flame Length, Mudan View Factor & Wayne Transmissivity
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine.models.thermal import (
    calculate_thomas_flame_length,
    calculate_flame_tilt_angle,
    calculate_surface_emissive_power,
    calculate_mudan_view_factor,
    calculate_wayne_transmissivity,
    calculate_incident_thermal_flux,
    evaluate_thermal_radiation,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import (
    DomainException,
    InvalidSourceParameterException,
)


class Phase4ThermalRadiationTestCase(unittest.TestCase):

    def test_eq_therm_01_thomas_flame_length_calm_wind(self):
        """
        Verify Thomas flame length for D=20m Gasoline in calm wind:
        EQ-THERM-01: L = 55 * D * (m_dot'' / (rho_a * sqrt(g*D)))^0.67 * (u*)^(-0.21)
        For D=20m, Gasoline (0.055 kg/m^2s), u_w=0 -> L ~ 23.66m (L/D ~ 1.18).
        """
        mat = MaterialRegistry.get("GASOLINE")
        l_flame, u_star = calculate_thomas_flame_length(
            d_pool_m=20.0,
            mass_burning_flux_kg_m2_s=0.055,
            wind_speed_ms=0.0,
            vapor_density_kg_m3=mat.vapor_density_kg_m3,
        )
        self.assertEqual(u_star, 0.0)
        self.assertAlmostEqual(l_flame, 23.657, places=2)

    def test_eq_therm_02_flame_tilt_exact_angles(self):
        """Verify Mudan/AGA flame tilt angle across wind regimes."""
        # Calm air: tilt = 0
        tilt_rad, tilt_deg = calculate_flame_tilt_angle(0.5)
        self.assertEqual(tilt_deg, 0.0)

        # u* = 4.0: cos(theta) = 1/sqrt(4) = 0.5 -> theta = 60.0 degrees
        tilt_rad, tilt_deg = calculate_flame_tilt_angle(4.0)
        self.assertAlmostEqual(tilt_deg, 60.0, places=4)

        # Extreme wind: u* = 100 -> clamped at 75.0 degrees
        tilt_rad, tilt_deg = calculate_flame_tilt_angle(100.0)
        self.assertEqual(tilt_deg, 75.0)

    def test_eq_therm_03_mudan_soot_obscuration_diesel(self):
        """
        Verify Mudan soot emissive power formula for Diesel at D=30m:
        s=0.12, E_soot=20, E_lum=130 -> exp(-3.6) ~ 0.02732 -> E_p ~ 23.0 kW/m^2
        """
        mat = MaterialRegistry.get("DIESEL")
        e_p = calculate_surface_emissive_power(
            d_pool_m=30.0,
            e_soot_kw_m2=mat.soot_emissive_power_kw_m2,
            e_luminous_kw_m2=mat.luminous_emissive_power_kw_m2,
            s_soot_extinction_m_inv=mat.soot_extinction_coefficient_m_inv,
        )
        expected_e_p = 20.0 * (1.0 - math.exp(-3.6)) + 130.0 * math.exp(-3.6)
        self.assertAlmostEqual(e_p, expected_e_p, places=4)
        self.assertAlmostEqual(e_p, 23.0, delta=0.2)

    def test_eq_therm_04_mudan_view_factor_limits(self):
        """Verify Mudan cylinder view factor behavior at near boundary and far-field."""
        d_pool = 20.0
        l_flame = 40.0

        # Boundary view factor (S <= 1.0)
        f_v_boundary = calculate_mudan_view_factor(r_target_m=10.0, d_pool_m=d_pool, l_flame_m=l_flame)
        self.assertEqual(f_v_boundary, 0.5)

        # Intermediate distance S=2 (R=20m)
        f_v_mid = calculate_mudan_view_factor(r_target_m=20.0, d_pool_m=d_pool, l_flame_m=l_flame)
        self.assertTrue(0.10 <= f_v_mid <= 0.35, f"F_v_mid={f_v_mid} outside [0.10, 0.35]")

        # Far-field S=100 (R=1000m) -> F_v approaches 0
        f_v_far = calculate_mudan_view_factor(r_target_m=1000.0, d_pool_m=d_pool, l_flame_m=l_flame)
        self.assertLess(f_v_far, 0.001)

    def test_eq_therm_05_wayne_atmospheric_transmissivity(self):
        """Verify Wayne atmospheric transmissivity at standard conditions (R=100m, T=25°C, RH=60%)."""
        tau = calculate_wayne_transmissivity(
            r_path_m=100.0,
            relative_humidity=0.60,
            ambient_temp_k=298.15,
        )
        self.assertTrue(0.75 <= tau <= 0.85, f"Tau={tau} outside expected range [0.75, 0.85]")
        self.assertAlmostEqual(tau, 0.7961, delta=0.01)

        # Extreme distances are bounded by [0.40, 1.00]
        tau_near = calculate_wayne_transmissivity(r_path_m=1.0, relative_humidity=0.5, ambient_temp_k=298.15)
        self.assertTrue(0.40 <= tau_near <= 1.0, f"Tau_near={tau_near} not bounded in [0.40, 1.00]")

        tau_far = calculate_wayne_transmissivity(r_path_m=50000.0, relative_humidity=0.9, ambient_temp_k=310.0)
        self.assertEqual(tau_far, 0.40)

    def test_incident_flux_distance_monotonic_decrease(self):
        """Thermal radiation flux must monotonically decrease with standoff distance."""
        distances = [15.0, 30.0, 50.0, 100.0, 200.0, 500.0]
        fluxes = [
            calculate_incident_thermal_flux(
                r_target_m=r,
                d_pool_m=20.0,
                l_flame_m=40.0,
                e_p_kw_m2=25.0,
                relative_humidity=0.50,
                ambient_temp_k=298.15,
            )
            for r in distances
        ]
        # Assert strictly decreasing
        for i in range(len(fluxes) - 1):
            self.assertGreater(fluxes[i], fluxes[i+1], f"Flux at {distances[i]}m not greater than at {distances[i+1]}m")

    def test_evaluate_thermal_radiation_full_pipeline(self):
        """Verify evaluate_thermal_radiation DTO generation on complete scenario."""
        scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_diameter_m": 30.0,
            "fuel_type": "DIESEL",
            "wind_speed_ms": 5.0,
        })
        material = MaterialRegistry.get("DIESEL")
        source = characterize_source(scenario, material)

        res = evaluate_thermal_radiation(scenario, source, material, r_target_m=50.0)
        self.assertEqual(res.standoff_distance_m, 50.0)
        self.assertGreater(res.flame_length_m, 20.0)
        self.assertGreater(res.surface_emissive_power_kw_m2, 15.0)
        self.assertGreater(res.incident_flux_kw_m2, 0.0)
        self.assertLess(res.incident_flux_kw_m2, res.surface_emissive_power_kw_m2)


if __name__ == "__main__":
    unittest.main()
