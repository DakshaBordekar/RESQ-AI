"""
RESQ-ENG-SPEC-2026-001 — PHASE 8 VERIFICATION TEST SUITE
Multi-Criteria Severity Classification & Hazard Zone Radii Inversion
"""

import math
import unittest

from apps.threat_zone.physics_engine.models.severity import (
    HazardLevel,
    SeverityClassificationDTO,
    HazardZoneRadiiDTO,
    classify_severity,
    calculate_hazard_zone_radii,
)
from apps.threat_zone.physics_engine.models.thermal import calculate_incident_thermal_flux
from apps.threat_zone.physics_engine.models.blast import (
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source


class Phase8SeverityClassificationTestCase(unittest.TestCase):

    def test_classify_severity_matrix(self):
        """Verify discrete severity level mapping across thermal and blast domains."""
        # 1. Extreme thermal, low blast -> RED_CRITICAL (thermal dominated)
        res_t = classify_severity(thermal_flux_kw_m2=45.0, blast_overpressure_kpa=1.0)
        self.assertEqual(res_t.thermal_level, HazardLevel.RED_CRITICAL)
        self.assertEqual(res_t.blast_level, HazardLevel.SAFE)
        self.assertEqual(res_t.combined_level, HazardLevel.RED_CRITICAL)

        # 2. Safe thermal, extreme blast -> RED_CRITICAL (blast dominated)
        res_b = classify_severity(thermal_flux_kw_m2=0.5, blast_overpressure_kpa=85.0)
        self.assertEqual(res_b.thermal_level, HazardLevel.SAFE)
        self.assertEqual(res_b.blast_level, HazardLevel.RED_CRITICAL)
        self.assertEqual(res_b.combined_level, HazardLevel.RED_CRITICAL)

        # 3. Yellow moderate thermal (6.0 kW/m^2)
        res_y = classify_severity(thermal_flux_kw_m2=6.0, blast_overpressure_kpa=0.5)
        self.assertEqual(res_y.thermal_level, HazardLevel.YELLOW_MODERATE)
        self.assertEqual(res_y.combined_level, HazardLevel.YELLOW_MODERATE)

        # 4. Safe background
        res_s = classify_severity(thermal_flux_kw_m2=0.2, blast_overpressure_kpa=0.1)
        self.assertEqual(res_s.combined_level, HazardLevel.SAFE)

    def test_hazard_zone_radii_monotonicity_lpg(self):
        """Verify strict monotonic distance ordering: R_green >= R_yellow >= R_orange >= R_red."""
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

        radii = calculate_hazard_zone_radii(scenario, source, material)

        # Thermal radii monotonicity
        self.assertGreaterEqual(radii.thermal_green_m, radii.thermal_yellow_m)
        self.assertGreaterEqual(radii.thermal_yellow_m, radii.thermal_orange_m)
        self.assertGreaterEqual(radii.thermal_orange_m, radii.thermal_red_m)
        self.assertGreater(radii.thermal_green_m, 0.0)

        # Blast radii monotonicity
        self.assertGreaterEqual(radii.blast_green_m, radii.blast_yellow_m)
        self.assertGreaterEqual(radii.blast_yellow_m, radii.blast_orange_m)
        self.assertGreaterEqual(radii.blast_orange_m, radii.blast_red_m)
        self.assertGreater(radii.blast_green_m, 0.0)

        # Combined envelope monotonicity
        self.assertGreaterEqual(radii.combined_green_m, radii.combined_yellow_m)
        self.assertGreaterEqual(radii.combined_yellow_m, radii.combined_orange_m)
        self.assertGreaterEqual(radii.combined_orange_m, radii.combined_red_m)

    def test_diesel_non_volatile_zero_blast_radii(self):
        """For Diesel (non-volatile), blast radii must be 0m and combined radii must match thermal radii exactly."""
        scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_diameter_m": 30.0,
            "fuel_type": "DIESEL",
        })
        material = MaterialRegistry.get("DIESEL")
        source = characterize_source(scenario, material)

        radii = calculate_hazard_zone_radii(scenario, source, material)

        self.assertEqual(radii.blast_red_m, 0.0)
        self.assertEqual(radii.blast_orange_m, 0.0)
        self.assertEqual(radii.blast_yellow_m, 0.0)
        self.assertEqual(radii.blast_green_m, 0.0)

        self.assertEqual(radii.combined_red_m, radii.thermal_red_m)
        self.assertEqual(radii.combined_orange_m, radii.thermal_orange_m)
        self.assertEqual(radii.combined_yellow_m, radii.thermal_yellow_m)
        self.assertEqual(radii.combined_green_m, radii.thermal_green_m)


if __name__ == "__main__":
    unittest.main()
