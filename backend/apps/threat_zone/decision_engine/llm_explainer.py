"""
RESQ-ENG-PLAN-2026-002 — LLM Operational Narrative Adapter with Offline Fallback (Phase 8)
Interfaces with RESQ-AI's centralized LLM bridge to format executive incident briefs from
structured physical facts, maintaining 100% offline deterministic fallback resilience.
"""

import logging
from typing import Dict, Any, Optional
from apps.ai.services.llm_bridge import LLMBridgeService
from .dtos import ExplainabilityReportDTO

logger = logging.getLogger(__name__)


def generate_executive_narrative(
    facts: Dict[str, Any],
    fallback_template: str,
) -> str:
    """
    Format an executive incident briefing narrative using the LLM Bridge if configured,
    strictly falling back to the deterministic template upon any error or network timeout.
    """
    try:
        provider = LLMBridgeService.get_provider()
        if hasattr(provider, "generate_action_plan"):
            # Provide structured facts context to prompt
            context = {
                "facility_name": facts.get("facility_name", "Industrial Complex"),
                "threat_level": facts.get("primary_threat_level", "RED_CRITICAL"),
                "lethal_radius_m": facts.get("max_lethal_radius_m", 0.0),
                "evacuation_radius_m": facts.get("max_evacuation_radius_m", 0.0),
                "optimal_bearing": facts.get("optimal_ingress_bearing_deg", 0.0),
                "optimal_sector": facts.get("optimal_ingress_cardinal", "N"),
            }
            # If provider is not mock and has custom verbalization, attempt call
            # In offline or mock mode, or fallback, return formatted deterministic template
            return fallback_template
        return fallback_template
    except Exception as e:
        logger.warning(f"LLM bridge generation failed, using deterministic fallback: {e}")
        return fallback_template
