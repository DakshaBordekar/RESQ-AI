"""
RESQ-ENG-PLAN-2026-002 — PHASE 8 VERIFICATION TEST SUITE
LLM Integration & Offline Fallback Bridge Test Suite
"""

import unittest
from unittest.mock import patch
from apps.threat_zone.decision_engine.llm_explainer import generate_executive_narrative


class Phase8LLMExplainerTestCase(unittest.TestCase):

    def test_offline_fallback_deterministic_guarantee(self):
        facts = {
            "facility_name": "Test Refinery",
            "primary_threat_level": "RED_CRITICAL",
            "max_lethal_radius_m": 85.0,
            "max_evacuation_radius_m": 290.0,
        }
        template = "DETERMINISTIC FALLBACK: Evacuate within 290.0 m."

        result = generate_executive_narrative(facts, fallback_template=template)
        self.assertEqual(result, template)

    def test_llm_exception_caught_safely(self):
        facts = {"facility_name": "Faulty Call"}
        template = "SAFE FALLBACK TEXT"

        with patch("apps.threat_zone.decision_engine.llm_explainer.LLMBridgeService.get_provider", side_effect=RuntimeError("OpenAI API Down")):
            result = generate_executive_narrative(facts, fallback_template=template)
            self.assertEqual(result, template)


if __name__ == "__main__":
    unittest.main()
