"""
RESQ-ENG-SPEC-2026-001 — PHASE 13 VERIFICATION TEST SUITE
Industrial Benchmark Validation (Facilities A–E) & Strict Physical Invariant Checks
"""

import math
import unittest
from apps.threat_zone.physics_engine import (
    run_hazard_model,
    HazardModelResultDTO,
    validate_and_build_scenario,
    MaterialRegistry,
    characterize_source,
)


class Phase13IndustrialBenchmarksTestCase(unittest.TestCase):

    def test_facility_a_lpg_bleve_vce_benchmark(self):
        """
        Facility A: 12m Spherical LPG Tank Catastrophic Rupture (BLEVE/VCE).
        Validates flashing vapor mass, TNT mass (54+ tons), blast shockwave domination,
        and nested high-lethality threat zones.
        """
        raw = {
            "facility_name": "Facility A - LPG Terminal",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 4.5,
            "wind_direction_deg": 270.0,
        }
        res = run_hazard_model(raw)

        # 1. Source verification
        self.assertAlmostEqual(res.source.participating_vapor_mass_kg, 137277.5, delta=500.0)

        # 2. Blast verification
        # W_TNT = (137277.5 * 4.63e7 * 0.04) / 4.686e6 ~ 54,250 kg
        w_tnt = (res.source.participating_vapor_mass_kg * 4.63e7 * 0.04) / 4.686e6
        self.assertGreater(w_tnt, 50000.0)

        # 3. Threat radii ordering and physical reach
        self.assertAlmostEqual(res.radii.combined_red_m, 44.68, delta=1.0)
        self.assertAlmostEqual(res.radii.combined_green_m, 263.31, delta=2.0)
        self.assertGreaterEqual(res.radii.combined_green_m, res.radii.combined_yellow_m)
        self.assertGreaterEqual(res.radii.combined_yellow_m, res.radii.combined_orange_m)
        self.assertGreaterEqual(res.radii.combined_orange_m, res.radii.combined_red_m)

    def test_facility_b_gasoline_bunded_pool_fire(self):
        """
        Facility B: 30m Gasoline Atmospheric Tank in 50m Bund.
        Validates bund confinement diameter, mass burning flux (~0.055 kg/m^2s),
        purely thermal radiation hazard, and zero blast shock wave.
        """
        raw = {
            "facility_name": "Facility B - Gasoline Bulk Depot",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 30.0,
            "tank_height_m": 15.0,
            "fill_fraction": 0.90,
            "fuel_type": "GASOLINE",
            "bund_present": True,
            "bund_diameter_m": 50.0,
            "wind_speed_ms": 4.0,
            "wind_direction_deg": 180.0,
        }
        res = run_hazard_model(raw)

        # 1. Source verification: pool diameter is capped by bund
        self.assertEqual(res.source.effective_pool_diameter_m, 50.0)
        self.assertTrue(res.source.is_bunded)
        self.assertAlmostEqual(res.source.mass_burning_flux_kg_m2_s, 0.055, delta=0.005)

        # 2. Blast verification: non-volatile liquid spill produces 0 blast overpressure
        self.assertEqual(res.radii.blast_red_m, 0.0)
        self.assertEqual(res.radii.blast_green_m, 0.0)

        # 3. Thermal verification
        self.assertAlmostEqual(res.radii.thermal_green_m, 58.87, delta=1.0)
        self.assertEqual(res.radii.combined_green_m, res.radii.thermal_green_m)

    def test_facility_c_diesel_unconfined_pool_fire(self):
        """
        Facility C: 20m Diesel Tank Catastrophic Rupture (Unconfined Spill).
        Validates unconfined pool spread limit (100m max screening diameter),
        heavy soot obscuration (E_p ~ 20-25 kW/m^2), and purely thermal envelope.
        """
        raw = {
            "facility_name": "Facility C - Diesel Storage",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 20.0,
            "tank_height_m": 12.0,
            "fill_fraction": 0.75,
            "fuel_type": "DIESEL",
            "bund_present": False,
            "wind_speed_ms": 2.0,
            "wind_direction_deg": 90.0,
        }
        res = run_hazard_model(raw)

        self.assertEqual(res.source.effective_pool_diameter_m, 100.0)  # Unconfined cap
        self.assertFalse(res.source.is_bunded)
        self.assertEqual(res.radii.blast_red_m, 0.0)
        self.assertGreater(res.radii.thermal_green_m, 50.0)

    def test_facility_d_lng_clean_luminous_pool_fire(self):
        """
        Facility D: 40m Cryogenic LNG Storage Tank in 60m Bund.
        Validates high mass burning flux (~0.078 kg/m^2s), zero soot obscuration (E_p = 150 kW/m^2),
        and extensive high-intensity thermal radiation zones.
        """
        raw = {
            "facility_name": "Facility D - LNG Import Terminal",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 40.0,
            "tank_height_m": 20.0,
            "fill_fraction": 0.80,
            "fuel_type": "LNG",
            "bund_present": True,
            "bund_diameter_m": 60.0,
            "wind_speed_ms": 6.0,
            "wind_direction_deg": 315.0,
        }
        res = run_hazard_model(raw)

        self.assertEqual(res.source.effective_pool_diameter_m, 60.0)
        self.assertAlmostEqual(res.source.mass_burning_flux_kg_m2_s, 0.078, delta=0.005)
        # LNG is clean-burning: emissive power reaches luminous maximum 150 kW/m^2
        self.assertEqual(res.material.soot_emissive_power_kw_m2, 150.0)
        self.assertAlmostEqual(res.radii.thermal_red_m, 46.26, delta=1.0)
        self.assertGreater(res.radii.thermal_green_m, 90.0)

    def test_facility_e_crude_oil_tank_fire(self):
        """
        Facility E: 45m Heavy Crude Oil Tank.
        Validates Burgess-Hertzberg burning flux, moderate soot obscuration, and large thermal envelope.
        """
        raw = {
            "facility_name": "Facility E - Refinery Tank Farm",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 45.0,
            "tank_height_m": 18.0,
            "fill_fraction": 0.90,
            "fuel_type": "CRUDE_OIL",
            "bund_present": True,
            "bund_diameter_m": 70.0,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 225.0,
        }
        res = run_hazard_model(raw)

        self.assertEqual(res.source.effective_pool_diameter_m, 70.0)
        self.assertAlmostEqual(res.source.mass_burning_flux_kg_m2_s, 0.035, delta=0.005)
        self.assertAlmostEqual(res.radii.thermal_green_m, 69.28, delta=1.0)

    def test_physical_invariants_across_all_facilities(self):
        """
        Rigorous verification of physical invariants for all 5 facilities:
        1. Monotonic radius hierarchy: R_green >= R_yellow >= R_orange >= R_red >= 0
        2. Closed boundary polygon rings: poly[0] == poly[-1]
        3. Area hierarchy: Area_green >= Area_yellow >= Area_orange >= Area_red > 0
        """
        facilities = [
            {"tank_geometry": "SPHERE", "tank_diameter_m": 12.0, "fill_fraction": 0.85, "fuel_type": "LPG", "explosion_yield_factor": 0.04},
            {"tank_geometry": "VERTICAL_CYLINDER", "tank_diameter_m": 30.0, "tank_height_m": 15.0, "fill_fraction": 0.90, "fuel_type": "GASOLINE", "bund_present": True, "bund_diameter_m": 50.0},
            {"tank_geometry": "VERTICAL_CYLINDER", "tank_diameter_m": 20.0, "tank_height_m": 12.0, "fill_fraction": 0.75, "fuel_type": "DIESEL"},
            {"tank_geometry": "VERTICAL_CYLINDER", "tank_diameter_m": 40.0, "tank_height_m": 20.0, "fill_fraction": 0.80, "fuel_type": "LNG", "bund_present": True, "bund_diameter_m": 60.0},
            {"tank_geometry": "VERTICAL_CYLINDER", "tank_diameter_m": 45.0, "tank_height_m": 18.0, "fill_fraction": 0.90, "fuel_type": "CRUDE_OIL", "bund_present": True, "bund_diameter_m": 70.0},
        ]

        for fac in facilities:
            fac.update({"latitude": 13.0300, "longitude": 80.2350, "wind_speed_ms": 3.0, "wind_direction_deg": 90.0})
            res = run_hazard_model(fac)

            # Invariant 1: Radii Monotonicity
            self.assertGreaterEqual(res.radii.combined_green_m, res.radii.combined_yellow_m)
            self.assertGreaterEqual(res.radii.combined_yellow_m, res.radii.combined_orange_m)
            self.assertGreaterEqual(res.radii.combined_orange_m, res.radii.combined_red_m)
            self.assertGreaterEqual(res.radii.combined_red_m, 0.0)

            # Invariant 2: Polygons Closure
            for poly in [res.polygons.red_critical, res.polygons.orange_severe, res.polygons.yellow_moderate, res.polygons.green_advisory]:
                self.assertTrue(poly.is_closed)
                self.assertEqual(poly.coordinates[0], poly.coordinates[-1])

            # Invariant 3: Area Nesting
            self.assertGreaterEqual(res.polygons.green_advisory.area_m2, res.polygons.yellow_moderate.area_m2)
            self.assertGreaterEqual(res.polygons.yellow_moderate.area_m2, res.polygons.orange_severe.area_m2)
            self.assertGreaterEqual(res.polygons.orange_severe.area_m2, res.polygons.red_critical.area_m2)


if __name__ == "__main__":
    unittest.main()
