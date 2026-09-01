"""
RESQ-ENG-PLAN-2026-002 — PHASE 3 VERIFICATION TEST SUITE
16-Sector Directional Exposure & Approach Intelligence Test Suite
"""

import unittest
from apps.threat_zone.decision_engine.approach_intelligence import (
    evaluate_directional_intelligence,
    _angular_difference_deg,
)
from apps.threat_zone.decision_engine.dtos import (
    DirectionalIntelligenceDTO,
    ApproachSectorClassification,
)
from apps.threat_zone.physics_engine import run_hazard_model


class Phase3ApproachIntelligenceTestCase(unittest.TestCase):

    def test_angular_difference_helper(self):
        self.assertEqual(_angular_difference_deg(10, 20), 10)
        self.assertEqual(_angular_difference_deg(350, 10), 20)
        self.assertEqual(_angular_difference_deg(0, 180), 180)
        self.assertEqual(_angular_difference_deg(45, 315), 90)

    def test_wind_driven_directional_asymmetry(self):
        """Under wind from 135 deg (SE), NW (315 deg) is upwind origin and SE (135 deg) is downwind plume."""
        raw_scenario = {
            "facility_name": "Test Tank",
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 20.0,
            "tank_height_m": 10.0,
            "fill_fraction": 0.80,
            "fuel_type": "DIESEL",
            "bund_present": True,
            "bund_diameter_m": 25.0,
            "wind_speed_ms": 7.0,
            "wind_direction_deg": 135.0,  # Wind from SE
        }
        res = run_hazard_model(raw_scenario)
        dir_intel = evaluate_directional_intelligence(
            scenario=res.scenario,
            source=res.source,
            material=res.material,
            radii=res.radii,
            r_max_m=1000.0,
            r_step_m=50.0,
        )

        self.assertIsInstance(dir_intel, DirectionalIntelligenceDTO)
        self.assertEqual(len(dir_intel.sectors), 16)
        self.assertEqual(dir_intel.upwind_bearing_deg, 135.0)
        self.assertEqual(dir_intel.downwind_bearing_deg, 315.0)

        # Downwind sectors around 315 deg (NW) must be marked DOWNWIND_EXCLUSION_ZONE
        nw_sector = next(s for s in dir_intel.sectors if s.cardinal == "NW")
        self.assertEqual(nw_sector.classification, ApproachSectorClassification.DOWNWIND_EXCLUSION_ZONE.value)
        self.assertEqual(nw_sector.max_safe_approach_distance_m, 0.0)

        # Upwind sectors around 135 deg (SE) must be OPTIMAL_UPWIND_CORRIDOR
        se_sector = next(s for s in dir_intel.sectors if s.cardinal == "SE")
        self.assertEqual(se_sector.classification, ApproachSectorClassification.OPTIMAL_UPWIND_CORRIDOR.value)
        self.assertGreater(se_sector.max_safe_approach_distance_m, 0.0)

    def test_calm_wind_isotropy(self):
        """Under zero wind (calm), sectors have uniform isotropic exposure scores."""
        raw_scenario = {
            "latitude": 13.0300,
            "longitude": 80.2350,
            "tank_geometry": "VERTICAL_CYLINDER",
            "tank_diameter_m": 15.0,
            "fill_fraction": 0.50,
            "fuel_type": "DIESEL",
            "wind_speed_ms": 0.0,
            "wind_direction_deg": 0.0,
        }
        res = run_hazard_model(raw_scenario)
        dir_intel = evaluate_directional_intelligence(
            scenario=res.scenario,
            source=res.source,
            material=res.material,
            radii=res.radii,
            r_max_m=500.0,
            r_step_m=50.0,
        )
        scores = [s.exposure_score for s in dir_intel.sectors]
        self.assertTrue(all(abs(s - scores[0]) < 1e-3 for s in scores))


if __name__ == "__main__":
    unittest.main()
