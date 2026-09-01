"""
RESQ-ENG-SPEC-2026-001 — PHASE 14 VERIFICATION TEST SUITE
Rigorous Physical Invariants, Symmetry Properties & Numerical Stress Tests
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine import (
    run_hazard_model,
    validate_and_build_scenario,
    MaterialRegistry,
    characterize_source,
    calculate_thomas_flame_length,
    calculate_flame_tilt_angle,
    calculate_surface_emissive_power,
    calculate_mudan_view_factor,
    calculate_wayne_transmissivity,
    calculate_incident_thermal_flux,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
    evaluate_point,
)
from apps.threat_zone.physics_engine.core.constants import MAX_FLAME_TILT_RAD


class Phase14InvariantsTestCase(unittest.TestCase):

    def setUp(self):
        self.scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 25.0,
            "tank_height_m": 14.0,
            "fill_fraction": 0.85,
            "fuel_type": "GASOLINE",
            "wind_speed_ms": 4.0,
            "wind_direction_deg": 90.0,
        })
        self.material = MaterialRegistry.get("GASOLINE")
        self.source = characterize_source(self.scenario, self.material)

    def test_invariant_1_strict_monotonic_decay_thermal_and_blast(self):
        """Incident flux and overpressure must decrease monotonically outside the pool perimeter (r >= R_pool)."""
        r_pool = self.source.effective_pool_diameter_m * 0.5
        r_samples = np.linspace(r_pool + 0.1, 2000.0, 150)

        fluxes = [
            calculate_incident_thermal_flux(
                r_target_m=r,
                d_pool_m=self.source.effective_pool_diameter_m,
                l_flame_m=40.0,
                e_p_kw_m2=35.0,
                relative_humidity=0.50,
                ambient_temp_k=298.15,
            )
            for r in r_samples
        ]

        w_tnt = 5000.0
        overpressures = [
            calculate_sadovsky_overpressure(calculate_scaled_distance(r, w_tnt))[1]
            for r in r_samples
        ]

        # Assert monotonic decrease
        for i in range(len(r_samples) - 1):
            self.assertGreaterEqual(fluxes[i], fluxes[i+1], f"Flux at {r_samples[i]}m not >= at {r_samples[i+1]}m")
            self.assertGreaterEqual(overpressures[i], overpressures[i+1], f"Pressure at {r_samples[i]}m not >= at {r_samples[i+1]}m")

    def test_invariant_2_calm_air_spatial_isotropy(self):
        """In calm air (u_w = 0), consequences at equal radial distance must be perfectly isotropic."""
        calm_scen = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 25.0,
            "tank_height_m": 14.0,
            "fill_fraction": 0.85,
            "fuel_type": "GASOLINE",
            "wind_speed_ms": 0.0,
            "wind_direction_deg": 0.0,
        })
        source = characterize_source(calm_scen, self.material)

        # Evaluate 4 points at 100m on all 4 quadrants
        pt_n = evaluate_point(calm_scen, source, self.material, x_m=0.0, y_m=100.0)
        pt_e = evaluate_point(calm_scen, source, self.material, x_m=100.0, y_m=0.0)
        pt_s = evaluate_point(calm_scen, source, self.material, x_m=0.0, y_m=-100.0)
        pt_w = evaluate_point(calm_scen, source, self.material, x_m=-100.0, y_m=0.0)

        self.assertAlmostEqual(pt_n.thermal_flux_kw_m2, pt_e.thermal_flux_kw_m2, places=6)
        self.assertAlmostEqual(pt_n.thermal_flux_kw_m2, pt_s.thermal_flux_kw_m2, places=6)
        self.assertAlmostEqual(pt_n.thermal_flux_kw_m2, pt_w.thermal_flux_kw_m2, places=6)

        self.assertAlmostEqual(pt_n.blast_overpressure_kpa, pt_e.blast_overpressure_kpa, places=6)

    def test_invariant_3_energy_conservation_and_physical_bounds(self):
        """Check mathematical bounds: q'' <= E_p, 0.40 <= tau <= 1.00, 0 <= F <= 1, tilt <= 75°."""
        # 1. Thermal flux never exceeds emissive power
        e_p = 35.0
        q = calculate_incident_thermal_flux(
            r_target_m=12.5,  # At pool edge
            d_pool_m=25.0,
            l_flame_m=30.0,
            e_p_kw_m2=e_p,
            relative_humidity=0.50,
            ambient_temp_k=298.15,
        )
        self.assertLessEqual(q, e_p)

        # 2. Transmissivity bounds
        for r in [0.1, 10.0, 100.0, 1000.0, 50000.0]:
            tau = calculate_wayne_transmissivity(r, relative_humidity=0.6, ambient_temp_k=300.0)
            self.assertTrue(0.40 <= tau <= 1.00)

        # 3. View factor bounds
        for r in [0.0, 5.0, 25.0, 500.0]:
            f_v = calculate_mudan_view_factor(r, d_pool_m=25.0, l_flame_m=30.0)
            self.assertTrue(0.0 <= f_v <= 1.0)

        # 4. Flame tilt bound
        for u_star in [0.0, 1.0, 5.0, 50.0, 1000.0]:
            tilt_rad, tilt_deg = calculate_flame_tilt_angle(u_star)
            self.assertLessEqual(tilt_rad, MAX_FLAME_TILT_RAD + 1e-6)
            self.assertLessEqual(tilt_deg, 75.0 + 1e-6)

    def test_invariant_4_extreme_numerical_boundary_stress(self):
        """Stress test extreme physical scales without crash, NaN, or underflow."""
        # Minimum valid tank diameter (1.0m)
        tiny_scen = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 1.0,
            "tank_height_m": 2.0,
            "fill_fraction": 0.50,
            "fuel_type": "DIESEL",
        })
        res_tiny = run_hazard_model(tiny_scen)
        self.assertGreater(res_tiny.radii.combined_green_m, 0.0)

        # Maximum valid tank diameter (100.0m) in maximum valid screening wind (25.0 m/s)
        huge_scen = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 100.0,
            "tank_height_m": 25.0,
            "fill_fraction": 0.95,
            "fuel_type": "CRUDE_OIL",
            "wind_speed_ms": 25.0,
            "wind_direction_deg": 45.0,
        })
        res_huge = run_hazard_model(huge_scen)
        self.assertGreater(res_huge.radii.combined_green_m, 50.0)
        self.assertTrue(res_huge.polygons.green_advisory.is_closed)


if __name__ == "__main__":
    unittest.main()
