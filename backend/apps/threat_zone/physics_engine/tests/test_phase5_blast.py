"""
RESQ-ENG-SPEC-2026-001 — PHASE 5 VERIFICATION TEST SUITE
Blast Overpressure Model, TNT Equivalency & Sadovsky Peak Overpressure (EQ-BLAST-01 to EQ-BLAST-03)
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine.models.blast import (
    calculate_tnt_equivalent_mass,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
    evaluate_blast_overpressure,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import DomainException


class Phase5BlastOverpressureTestCase(unittest.TestCase):

    def test_eq_blast_01_tnt_equivalent_mass(self):
        """
        Verify TNT equivalent explosive mass:
        For 10,000 kg Propane (Delta_Hc=46.3 MJ/kg) at eta=0.03:
        W_TNT = (10000 * 46.3e6 * 0.03) / 4.686e6 ~ 2964.15 kg.
        """
        w_tnt = calculate_tnt_equivalent_mass(
            participating_vapor_mass_kg=10000.0,
            heat_of_combustion_j_kg=4.63e7,
            explosion_yield_factor=0.03,
        )
        expected = (10000.0 * 4.63e7 * 0.03) / 4.686e6
        self.assertAlmostEqual(w_tnt, expected, places=2)
        self.assertAlmostEqual(w_tnt, 2964.15, delta=0.5)

    def test_eq_blast_01_non_volatile_fuel_zero_tnt_mass(self):
        """Diesel or non-volatile fuels with 0 participating vapor mass must yield W_TNT = 0.0 kg."""
        w_tnt = calculate_tnt_equivalent_mass(
            participating_vapor_mass_kg=0.0,
            heat_of_combustion_j_kg=4.31e7,
            explosion_yield_factor=0.03,
        )
        self.assertEqual(w_tnt, 0.0)

    def test_eq_blast_02_hopkinson_cranz_scaled_distance(self):
        """
        Verify Hopkinson-Cranz scaled distance Z = R / W_TNT^(1/3):
        For W = 1000 kg -> W^(1/3) = 10.0 -> R=50m gives Z=5.0 m/kg^(1/3).
        """
        z = calculate_scaled_distance(r_target_m=50.0, w_tnt_kg=1000.0)
        self.assertAlmostEqual(z, 5.0, places=6)

        # Zero TNT mass yields infinite scaled distance
        z_zero = calculate_scaled_distance(r_target_m=50.0, w_tnt_kg=0.0)
        self.assertTrue(math.isinf(z_zero))

    def test_eq_blast_03_sadovsky_analytical_precision(self):
        """
        Verify Sadovsky formula at Z = 1.0 m/kg^(1/3):
        Delta_P_bar = 1.01325 * (0.084 + 0.27 + 0.70) = 1.01325 * 1.054 = 1.0679655 bar ~ 106.8 kPa.
        """
        p_bar, p_kpa, p_psi = calculate_sadovsky_overpressure(1.0)
        expected_bar = 1.01325 * (0.084 + 0.27 + 0.70)
        expected_kpa = expected_bar * 100.0

        self.assertAlmostEqual(p_bar, expected_bar, places=5)
        self.assertAlmostEqual(p_kpa, expected_kpa, places=3)
        self.assertAlmostEqual(p_kpa, 106.797, delta=0.05)
        self.assertAlmostEqual(p_psi, expected_kpa * 0.1450377, delta=0.05)

    def test_eq_blast_03_boundary_clamping(self):
        """Verify Mach stem near-field cap for Z < 0.5."""
        # Extreme near-field Z=0.1 (< 0.5) -> clamped to 2000.0 kPa (20 bar)
        p_bar_near, p_kpa_near, p_psi_near = calculate_sadovsky_overpressure(0.1)
        self.assertEqual(p_kpa_near, 2000.0)
        self.assertEqual(p_bar_near, 20.0)

        # Normal far field decays continuously
        p_bar_far, p_kpa_far, p_psi_far = calculate_sadovsky_overpressure(100.0)
        self.assertLess(p_kpa_far, 1.0)
        self.assertGreater(p_kpa_far, 0.0)

    def test_blast_overpressure_vectorized(self):
        """Verify vectorized computation across array of scaled distances."""
        z_arr = np.array([0.2, 1.0, 5.0, 20.0, 100.0], dtype=np.float64)
        p_bar_arr, p_kpa_arr, p_psi_arr = calculate_sadovsky_overpressure(z_arr)

        self.assertEqual(len(p_kpa_arr), 5)
        self.assertEqual(p_kpa_arr[0], 2000.0)  # clamped near
        # Monotonically strictly non-increasing
        self.assertTrue(np.all(np.diff(p_kpa_arr) <= 0.0))

    def test_evaluate_blast_overpressure_lpg_bleve_scenario(self):
        """Verify full blast consequence evaluation for Facility A (LPG BLEVE/VCE)."""
        scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
        })
        material = MaterialRegistry.get("LPG")
        source = characterize_source(scenario, material)

        # At R=50m
        res = evaluate_blast_overpressure(scenario, source, material, r_target_m=50.0)
        self.assertGreater(res.equivalent_tnt_mass_kg, 1000.0)
        self.assertTrue(res.is_within_validity_range)
        self.assertGreater(res.overpressure_kpa, 10.0)
        self.assertLess(res.overpressure_kpa, 2000.0)


if __name__ == "__main__":
    unittest.main()
