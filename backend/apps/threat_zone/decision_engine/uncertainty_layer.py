"""
RESQ-ENG-PLAN-2026-002 — Uncertainty & Operational Safety Buffer Layer (Phase 6)
Translates Monte Carlo distributions (P5, P50, P95) into actionable tactical safety margins.
"""

from typing import Optional
from .dtos import UncertaintyAssessmentDTO
from apps.threat_zone.physics_engine.pipeline import HazardModelResultDTO


def evaluate_uncertainty_assessment(
    result: HazardModelResultDTO,
) -> UncertaintyAssessmentDTO:
    """
    Evaluate parametric uncertainty and compute conservative tactical safety standoff buffers.
    """
    nominal_r = float(result.radii.combined_green_m)

    if result.monte_carlo is not None:
        stats = result.monte_carlo.combined_green_radius_stats
        p5 = float(stats.p5)
        p50 = float(stats.p50)
        p95 = float(stats.p95)
    else:
        # Deterministic +/- 12% bounded interval fallback
        p5 = nominal_r * 0.88
        p50 = nominal_r
        p95 = nominal_r * 1.15

    safety_buffer = max(0.0, float(p95 - p50))
    buffer_ratio = safety_buffer / max(1.0, p50)

    if buffer_ratio <= 0.15:
        confidence = "HIGH_CONFIDENCE_P95_BOUNDED"
    elif buffer_ratio <= 0.30:
        confidence = "MODERATE_UNCERTAINTY_RECOMMEND_EXPANDED_BUFFER"
    else:
        confidence = "HIGH_VARIABILITY_EXPAND_EXCLUSION_PERIMETER"

    return UncertaintyAssessmentDTO(
        nominal_radius_m=round(nominal_r, 1),
        p5_radius_m=round(p5, 1),
        p50_radius_m=round(p50, 1),
        p95_radius_m=round(p95, 1),
        safety_buffer_margin_m=round(safety_buffer, 1),
        confidence_rating=confidence,
    )
