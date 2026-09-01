"""
RESQ-ENG-SPEC-2026-001 — PHASE 3 VERIFICATION TEST SUITE
Source Characterization, Secondary Containment & Energy Partitioning (EQ-SRC-01 to EQ-SRC-03)
"""

import math
import unittest

from apps.threat_zone.physics_engine.source.pool_diameter import calculate_pool_diameter
from apps.threat_zone.physics_engine.source.energy import calculate_energy_and_burning_rates
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.core.exceptions import (
    DomainException,
    InconsistentGeometryException,
)


class Phase3SourceCharacterizationTestCase(unittest.TestCase):

    def test_bunded_pool_diameter_locking(self):
        """Bunded spill must lock pool diameter to exact bund dike diameter."""
        d_pool = calculate_pool_diameter(
            liquid_volume_m3=1000.0,
            tank_diameter_m=20.0,
            bund_present=True,
            bund_diameter_m=35.0,
        )
        self.assertEqual(d_pool, 35.0)

    def test_unconfined_pool_diameter_clamping(self):
        """
        Unconfined catastrophic spill spreading:
        100 m^3 spill -> D = sqrt(4 * 100 / (pi * 0.005)) ~ 159.58 m -> clamped to 100.0 m max.
        """
        d_pool = calculate_pool_diameter(
            liquid_volume_m3=100.0,
            tank_diameter_m=10.0,
            bund_present=False,
        )
        self.assertEqual(d_pool, 100.0)

    def test_unconfined_pool_diameter_intermediate(self):
        """Unconfined moderate spill spreading below cap."""
        # 1.0 m^3 spill: D = sqrt(4 / (0.005 * pi)) = sqrt(254.648) ~ 15.96 m
        d_pool = calculate_pool_diameter(
            liquid_volume_m3=1.0,
            tank_diameter_m=5.0,
            bund_present=False,
        )
        expected_d = math.sqrt(4.0 / (math.pi * 0.005))
        self.assertAlmostEqual(d_pool, expected_d, places=2)
        self.assertAlmostEqual(d_pool, 15.96, delta=0.05)

    def test_energy_partitioning_calculations(self):
        """
        Verify EQ-SRC-02 energy and burning rate formulas:
        Diesel: D=20m, m_dot''=0.035 kg/m^2s, Delta_Hc=43.1 MJ/kg, eta_rad=0.22, M=100,000 kg
        """
        (
            pool_area,
            mass_burning_rate,
            burning_duration,
            chem_energy,
            total_hrr,
            rad_hrr,
            vapor_mass,
        ) = calculate_energy_and_burning_rates(
            stored_mass_kg=100000.0,
            heat_of_combustion_j_kg=4.31e7,
            mass_burning_flux_kg_m2_s=0.035,
            pool_diameter_m=20.0,
            radiative_fraction=0.22,
            flashing_fraction=0.00,
        )

        expected_area = (math.pi / 4.0) * (20.0 ** 2)  # ~314.159 m^2
        expected_burning_rate = 0.035 * expected_area  # ~10.9956 kg/s
        expected_duration = 100000.0 / expected_burning_rate  # ~9094.5 s
        expected_total_hrr = expected_burning_rate * 4.31e7  # ~4.739e8 W
        expected_rad_hrr = 0.22 * expected_total_hrr  # ~1.043e8 W

        self.assertAlmostEqual(pool_area, expected_area, places=2)
        self.assertAlmostEqual(mass_burning_rate, expected_burning_rate, places=3)
        self.assertAlmostEqual(burning_duration, expected_duration, places=1)
        self.assertAlmostEqual(total_hrr, expected_total_hrr, delta=1e4)
        self.assertAlmostEqual(rad_hrr, expected_rad_hrr, delta=1e4)
        self.assertEqual(vapor_mass, 0.0)

    def test_characterize_source_full_diesel_scenario(self):
        """Verify full source characterization on a Diesel storage tank scenario."""
        scenario_data = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_diameter_m": 20.0,
            "tank_height_m": 10.0,
            "fill_fraction": 0.80,
            "fuel_type": "DIESEL",
            "bund_present": True,
            "bund_diameter_m": 30.0,
        }
        scenario = validate_and_build_scenario(scenario_data)
        material = MaterialRegistry.get("DIESEL")

        source = characterize_source(scenario, material)

        # Stored mass = V_liq * 840 kg/m^3 = 2513.27 * 840 ~ 2,111,150 kg
        self.assertAlmostEqual(source.stored_mass_kg, 2513.274 * 840.0, delta=100.0)
        self.assertEqual(source.effective_pool_diameter_m, 30.0)
        self.assertTrue(source.is_bunded)
        self.assertGreater(source.total_heat_release_rate_w, 1.0e8)
        self.assertGreater(source.radiative_heat_release_rate_w, 2.0e7)
        self.assertEqual(source.participating_vapor_mass_kg, 0.0)

    def test_characterize_source_volatile_lpg_flashing(self):
        """Verify participating vapor mass generation for pressurized volatile LPG."""
        scenario_data = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "bund_present": False,
        }
        scenario = validate_and_build_scenario(scenario_data)
        material = MaterialRegistry.get("LPG")

        source = characterize_source(scenario, material)

        # Stored mass = 769.06 m^3 * 510 kg/m^3 ~ 392,220 kg
        # Flashed vapor mass = 392,220 * 0.35 ~ 137,277 kg
        expected_mass = scenario.tank.stored_liquid_volume_m3 * 510.0
        expected_vapor = expected_mass * 0.35

        self.assertAlmostEqual(source.stored_mass_kg, expected_mass, delta=10.0)
        self.assertAlmostEqual(source.participating_vapor_mass_kg, expected_vapor, delta=10.0)

    def test_invalid_source_inputs_raise_exception(self):
        """Zero or negative inputs must raise DomainException."""
        with self.assertRaises(DomainException):
            calculate_pool_diameter(liquid_volume_m3=0.0, tank_diameter_m=20.0)

        with self.assertRaises(InconsistentGeometryException):
            calculate_pool_diameter(
                liquid_volume_m3=100.0,
                tank_diameter_m=30.0,
                bund_present=True,
                bund_diameter_m=20.0,
            )


if __name__ == "__main__":
    unittest.main()
