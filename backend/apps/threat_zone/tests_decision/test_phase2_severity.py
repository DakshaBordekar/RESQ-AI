"""
RESQ-ENG-PLAN-2026-002 — PHASE 2 VERIFICATION TEST SUITE
Multi-Factor Severity Classification Engine Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.severity_triage import (
    classify_thermal_flux_rank,
    classify_blast_overpressure_rank,
    evaluate_operational_severity,
    build_severity_breakdown,
)
from apps.threat_zone.decision_engine.dtos import (
    DominantHazardType,
    OperationalSeverityDTO,
)
from apps.threat_zone.physics_engine.core.exceptions import (
    DomainException,
    NegativeConsequenceException,
)
from apps.threat_zone.physics_engine import run_hazard_model


class Phase2SeverityTriageTestCase(unittest.TestCase):

    def test_thermal_dominant_classification(self):
        """High thermal flux with low blast overpressure must produce RED_CRITICAL and THERMAL dominant hazard."""
        dto = evaluate_operational_severity(thermal_flux_kw_m2=42.0, blast_overpressure_kpa=1.5)
        self.assertEqual(dto.tier, "RED_CRITICAL")
        self.assertEqual(dto.rank, 4)
        self.assertEqual(dto.thermal_rank, 4)
        self.assertEqual(dto.blast_rank, 0)
        self.assertEqual(dto.dominant_hazard, DominantHazardType.THERMAL.value)
        self.assertIn("NO ENTRY", dto.tactical_directive)

    def test_blast_dominant_classification(self):
        """High blast overpressure with negligible thermal flux must produce RED_CRITICAL and BLAST dominant hazard."""
        dto = evaluate_operational_severity(thermal_flux_kw_m2=0.5, blast_overpressure_kpa=85.0)
        self.assertEqual(dto.tier, "RED_CRITICAL")
        self.assertEqual(dto.rank, 4)
        self.assertEqual(dto.thermal_rank, 0)
        self.assertEqual(dto.blast_rank, 4)
        self.assertEqual(dto.dominant_hazard, DominantHazardType.BLAST.value)

    def test_compound_hazard_classification(self):
        """Equal non-zero ranks must resolve to COMPOUND dominant hazard."""
        dto = evaluate_operational_severity(thermal_flux_kw_m2=15.0, blast_overpressure_kpa=25.0)
        self.assertEqual(dto.tier, "ORANGE_SEVERE")
        self.assertEqual(dto.rank, 3)
        self.assertEqual(dto.thermal_rank, 3)
        self.assertEqual(dto.blast_rank, 3)
        self.assertEqual(dto.dominant_hazard, DominantHazardType.COMPOUND.value)

    def test_safe_zone_classification(self):
        """Below all consequence thresholds must produce SAFE tier and NONE dominant hazard."""
        dto = evaluate_operational_severity(thermal_flux_kw_m2=0.8, blast_overpressure_kpa=0.5)
        self.assertEqual(dto.tier, "SAFE")
        self.assertEqual(dto.rank, 0)
        self.assertEqual(dto.dominant_hazard, DominantHazardType.NONE.value)
        self.assertIn("UNRESTRICTED ACCESS", dto.tactical_directive)

    def test_invalid_and_nan_inputs_rejected(self):
        """NaN and negative inputs must raise strongly-typed domain exceptions."""
        with self.assertRaises(DomainException):
            classify_thermal_flux_rank(float("nan"))
        with self.assertRaises(NegativeConsequenceException):
            classify_thermal_flux_rank(-5.0)
        with self.assertRaises(DomainException):
            classify_blast_overpressure_rank(float("inf"))

    def test_build_severity_breakdown_integration(self):
        """Verify severity breakdown construction from full physics model output."""
        raw_scenario = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
        }
        res = run_hazard_model(raw_scenario)
        breakdown = build_severity_breakdown(res.radii, res.polygons)

        self.assertIn("red_critical", breakdown)
        self.assertIn("orange_severe", breakdown)
        self.assertIn("yellow_moderate", breakdown)
        self.assertIn("green_advisory", breakdown)
        self.assertGreater(breakdown["green_advisory"].enclosed_area_m2, breakdown["red_critical"].enclosed_area_m2)


if __name__ == "__main__":
    unittest.main()
