"""
RESQ-ENG-SPEC-2026-001 — PHASE 2 VERIFICATION TEST SUITE
Material-Property Registry & Burgess-Hertzberg-Zabetakis Burning Flux (EQ-MAT-01)
"""

import math
import unittest
import numpy as np

from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.materials.burning_flux import calculate_mass_burning_flux
from apps.threat_zone.physics_engine.core.exceptions import (
    UnknownMaterialException,
    DomainException,
)


class Phase2MaterialModelTestCase(unittest.TestCase):

    def test_material_registry_lookup_diesel(self):
        """Querying DIESEL must return exact SFPE / Babrauskas constants."""
        mat = MaterialRegistry.get("DIESEL")
        self.assertEqual(mat.material_id, "DIESEL")
        self.assertEqual(mat.liquid_density_kg_m3, 840.0)
        self.assertEqual(mat.heat_of_combustion_j_kg, 4.31e7)
        self.assertEqual(mat.asymptotic_burning_flux_kg_m2_s, 0.035)
        self.assertEqual(mat.extinction_absorption_coefficient_m_inv, 0.80)
        self.assertEqual(mat.radiative_fraction, 0.22)
        self.assertFalse(mat.is_flashing_volatile)

    def test_material_registry_lookup_all_benchmark_fuels(self):
        """Verify all 5 standard industrial materials are registered with valid properties."""
        benchmark_fuels = ["DIESEL", "GASOLINE", "KEROSENE", "LPG", "ETHANOL"]
        for fuel_id in benchmark_fuels:
            mat = MaterialRegistry.get(fuel_id)
            self.assertGreater(mat.liquid_density_kg_m3, 0.0)
            self.assertGreater(mat.heat_of_combustion_j_kg, 1.0e7)
            self.assertGreater(mat.asymptotic_burning_flux_kg_m2_s, 0.0)
            self.assertGreater(mat.extinction_absorption_coefficient_m_inv, 0.0)
            self.assertTrue(0.10 <= mat.radiative_fraction <= 0.40)
            self.assertTrue(mat.soot_emissive_power_kw_m2 < mat.luminous_emissive_power_kw_m2)

    def test_material_registry_alias_resolution(self):
        """Verify standard commercial synonyms map to correct primary keys."""
        mat_petrol = MaterialRegistry.get("PETROL")
        self.assertEqual(mat_petrol.material_id, "GASOLINE")

        mat_propane = MaterialRegistry.get("PROPANE")
        self.assertEqual(mat_propane.material_id, "LPG")

        mat_jet = MaterialRegistry.get("JET_A1")
        self.assertEqual(mat_jet.material_id, "KEROSENE")

    def test_unregistered_material_raises_exception(self):
        """Unknown material identifier must raise UnknownMaterialException (no silent fallback)."""
        with self.assertRaises(UnknownMaterialException):
            MaterialRegistry.get("UNOBTANIUM")

        with self.assertRaises(UnknownMaterialException):
            MaterialRegistry.get("")

    def test_eq_mat_01_gasoline_5m_pool(self):
        """
        Verify EQ-MAT-01 for Gasoline at D=5m:
        m_dot'' = 0.055 * (1 - exp(-2.1 * 5.0)) = 0.055 * (1 - exp(-10.5)) ~ 0.054998
        """
        mat = MaterialRegistry.get("GASOLINE")
        flux = calculate_mass_burning_flux(
            diameter_m=5.0,
            m_dot_inf=mat.asymptotic_burning_flux_kg_m2_s,
            k_beta=mat.extinction_absorption_coefficient_m_inv,
        )
        expected = 0.055 * (1.0 - math.exp(-10.5))
        self.assertAlmostEqual(flux, expected, places=6)
        self.assertAlmostEqual(flux, 0.054998, delta=1e-5)

    def test_eq_mat_01_small_pool_optically_thin(self):
        """Verify burning flux scaling for small optically thin pool (D=1m Diesel)."""
        mat = MaterialRegistry.get("DIESEL")
        flux = calculate_mass_burning_flux(
            diameter_m=1.0,
            m_dot_inf=mat.asymptotic_burning_flux_kg_m2_s,
            k_beta=mat.extinction_absorption_coefficient_m_inv,
        )
        expected = 0.035 * (1.0 - math.exp(-0.80 * 1.0))
        self.assertAlmostEqual(flux, expected, places=6)
        self.assertAlmostEqual(flux, 0.01927, delta=1e-4)

    def test_eq_mat_01_large_pool_asymptotic_plateau(self):
        """Verify that large pool (D >= 30m) reaches asymptotic plateau m_dot_inf."""
        mat = MaterialRegistry.get("GASOLINE")
        flux = calculate_mass_burning_flux(
            diameter_m=30.0,
            m_dot_inf=mat.asymptotic_burning_flux_kg_m2_s,
            k_beta=mat.extinction_absorption_coefficient_m_inv,
        )
        self.assertAlmostEqual(flux, mat.asymptotic_burning_flux_kg_m2_s, places=6)

    def test_eq_mat_01_vectorized(self):
        """Verify vectorized computation across array of diameters."""
        mat = MaterialRegistry.get("GASOLINE")
        diameters = np.array([1.0, 5.0, 10.0, 30.0], dtype=np.float64)
        fluxes = calculate_mass_burning_flux(
            diameter_m=diameters,
            m_dot_inf=mat.asymptotic_burning_flux_kg_m2_s,
            k_beta=mat.extinction_absorption_coefficient_m_inv,
        )
        self.assertEqual(len(fluxes), 4)
        self.assertTrue(np.all(np.diff(fluxes) >= 0.0))  # Monotonically increasing

    def test_eq_mat_01_invalid_diameter_raises_exception(self):
        """Pool diameter <= 0 must raise DomainException."""
        with self.assertRaises(DomainException):
            calculate_mass_burning_flux(diameter_m=0.0, m_dot_inf=0.055, k_beta=2.1)

        with self.assertRaises(DomainException):
            calculate_mass_burning_flux(diameter_m=-5.0, m_dot_inf=0.055, k_beta=2.1)


if __name__ == "__main__":
    unittest.main()
