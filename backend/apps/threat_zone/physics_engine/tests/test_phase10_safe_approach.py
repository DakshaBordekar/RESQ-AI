"""
RESQ-ENG-SPEC-2026-001 — PHASE 10 VERIFICATION TEST SUITE
Safe Approach Route Vector Generator (Upwind Corridor & Downwind Exclusion Sectors)
"""

import unittest

from apps.threat_zone.physics_engine.models.safe_approach import (
    ApproachSafetyStatus,
    ApproachSectorDTO,
    SafeApproachPlanDTO,
    generate_safe_approach_plan,
)
from apps.threat_zone.physics_engine.models.severity import calculate_hazard_zone_radii
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source


class Phase10SafeApproachTestCase(unittest.TestCase):

    def setUp(self):
        # West wind (270°) blowing East (90°) at 5 m/s
        self.scenario = validate_and_build_scenario({
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "SPHERE",
            "tank_diameter_m": 12.0,
            "fill_fraction": 0.85,
            "fuel_type": "LPG",
            "explosion_yield_factor": 0.04,
            "wind_speed_ms": 5.0,
            "wind_direction_deg": 270.0,
        })
        self.material = MaterialRegistry.get("LPG")
        self.source = characterize_source(self.scenario, self.material)
        self.radii = calculate_hazard_zone_radii(self.scenario, self.source, self.material)

    def test_safe_approach_plan_key_bearings(self):
        """West wind (270°) must recommend 270° (W) upwind and prohibit 90° (E) downwind."""
        plan = generate_safe_approach_plan(self.scenario, self.source, self.material, self.radii)

        self.assertEqual(plan.wind_origin_met_deg, 270.0)
        self.assertEqual(plan.wind_downwind_deg, 90.0)
        self.assertEqual(plan.recommended_upwind_bearing_deg, 270.0)
        self.assertIn(0.0, plan.secondary_crosswind_bearings_deg)
        self.assertIn(180.0, plan.secondary_crosswind_bearings_deg)
        self.assertEqual(plan.exclusion_sector_start_deg, 45.0)
        self.assertEqual(plan.exclusion_sector_end_deg, 135.0)

    def test_sector_classification_logic(self):
        """Verify individual sector status mappings around 360-degree compass."""
        plan = generate_safe_approach_plan(self.scenario, self.source, self.material, self.radii)

        sector_map = {s.bearing_deg: s for s in plan.sectors}

        # 270° (Exact upwind)
        s_upwind = sector_map[270.0]
        self.assertEqual(s_upwind.safety_status, ApproachSafetyStatus.SAFE_UPWIND)
        self.assertTrue(s_upwind.is_recommended)
        self.assertFalse(s_upwind.is_prohibited)

        # 90° (Exact downwind)
        s_downwind = sector_map[90.0]
        self.assertEqual(s_downwind.safety_status, ApproachSafetyStatus.HAZARDOUS_DOWNWIND)
        self.assertFalse(s_downwind.is_recommended)
        self.assertTrue(s_downwind.is_prohibited)

        # 0° (North crosswind)
        s_crosswind_n = sector_map[0.0]
        self.assertEqual(s_crosswind_n.safety_status, ApproachSafetyStatus.ACCEPTABLE_CROSSWIND)
        self.assertFalse(s_crosswind_n.is_prohibited)

        # 180° (South crosswind)
        s_crosswind_s = sector_map[180.0]
        self.assertEqual(s_crosswind_s.safety_status, ApproachSafetyStatus.ACCEPTABLE_CROSSWIND)
        self.assertFalse(s_crosswind_s.is_prohibited)

    def test_tactical_advisories_generated(self):
        """Tactical advisories list must be non-empty and specify key operational guidance."""
        plan = generate_safe_approach_plan(self.scenario, self.source, self.material, self.radii)
        self.assertGreaterEqual(len(plan.tactical_advisories), 3)
        adv_text = " ".join(plan.tactical_advisories)
        self.assertIn("UPWIND", adv_text)
        self.assertIn("EXCLUSION", adv_text)


if __name__ == "__main__":
    unittest.main()
