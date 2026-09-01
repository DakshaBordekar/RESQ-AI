"""
RESQ-ENG-PLAN-2026-002 — Deterministic Explainability & Audit Trail Engine (Phase 7)
Generates transparent, mathematically grounded natural language audit trails answering
the 6 core operational questions without hallucination.
"""

from typing import Optional
from .dtos import (
    ExplainabilityReportDTO,
    DirectionalIntelligenceDTO,
    SensitivityAnalysisDTO,
    ScenarioComparisonDTO,
)
from apps.threat_zone.physics_engine.pipeline import HazardModelResultDTO


def generate_explainability_report(
    result: HazardModelResultDTO,
    directional: DirectionalIntelligenceDTO,
    sensitivity: Optional[SensitivityAnalysisDTO] = None,
    comparison: Optional[ScenarioComparisonDTO] = None,
) -> ExplainabilityReportDTO:
    """
    Synthesize transparent, zero-hallucination operational explanations from structured DTO facts.
    """
    facility_name = result.scenario.facility.facility_name or "Industrial Facility"
    fuel_name = result.material.name
    fuel_type = result.material.material_id

    r_red = result.radii.combined_red_m
    r_green = result.radii.combined_green_m
    u_wind = result.scenario.atmosphere.wind_speed_ms
    wind_dir = result.scenario.atmosphere.wind_direction_deg

    # 1. Zone Dimension Rationale
    if fuel_type in ("LPG", "LNG"):
        mass_kg = result.source.participating_vapor_mass_kg
        energy_gj = (mass_kg * result.material.heat_of_combustion_j_kg) / 1e9
        q1 = (
            f"Zone boundaries for {facility_name} are governed by the catastrophic BLEVE fireball and shockwave "
            f"of {mass_kg:,.0f} kg of flashing {fuel_name}, releasing approximately {energy_gj:,.1f} GJ of thermal energy. "
            f"The critical 100% lethality threshold (37.5 kW/m² / 70 kPa) extends to {r_red:.1f} m, while the outer public "
            f"advisory limit (1.4 kW/m² / 2.0 kPa) reaches {r_green:.1f} m."
        )
    else:
        pool_diam = result.source.effective_pool_diameter_m
        rad_mw = result.source.radiative_heat_release_rate_w / 1e6
        q1 = (
            f"Zone boundaries for {facility_name} are established by an atmospheric pool fire burning across an effective "
            f"diameter of {pool_diam:.1f} m, radiating a continuous thermal power of {rad_mw:.1f} MW. "
            f"Thermal radiation attenuates via atmospheric transmissivity and geometric solid view factor falloff, establishing "
            f"a severe boundary at {r_red:.1f} m and outer perimeter at {r_green:.1f} m."
        )

    # 2. Spatial Asymmetry Rationale
    if u_wind >= 0.5:
        downwind_dir = (wind_dir + 180.0) % 360.0
        q2 = (
            f"The hazard perimeter is distorted downwind toward {downwind_dir:.0f}° due to ambient wind velocity of "
            f"{u_wind:.1f} m/s originating from {wind_dir:.0f}°. Wind shear forces the thermal flame column to tilt downwind, "
            f"increasing geometric view factors and extending radiative flux downwind while compressing upwind exposure."
        )
    else:
        q2 = "Under calm atmospheric conditions (< 0.5 m/s wind), hazard zones maintain radial geometric symmetry centered on the release origin."

    # 3. Approach Direction Rationale
    optimal_card = directional.optimal_sector
    optimal_deg = directional.optimal_bearing_deg
    downwind_deg = directional.downwind_bearing_deg
    q3 = (
        f"The {optimal_card} corridor ({optimal_deg:.0f}°) is designated as the optimal tactical ingress bearing because "
        f"it approaches directly from the upwind sector, minimizing cumulative radiation flux and keeping responders clear of "
        f"smoke and downwind flame tilt. Conversely, bearings around {downwind_deg:.0f}° fall within the strict downwind "
        f"exclusion zone due to extreme radiant intensity."
    )

    # 4. Dominant Hazard Mechanism Rationale
    if result.radii.blast_red_m > result.radii.thermal_red_m:
        q4 = (
            f"In the near field (< {result.radii.blast_red_m:.1f} m), blast overpressure shockwaves dominate structural damage "
            f"and lethality. Beyond this radius, thermal radiation becomes the primary life-safety hazard governing public evacuation."
        )
    else:
        q4 = (
            f"Thermal radiation is the primary governing hazard across all radii. Radiant heat flux exceeds physiological tolerance "
            f"thresholds significantly further than blast overpressures."
        )

    # 5. Sensitivity Driver Rationale
    if sensitivity and sensitivity.parameters:
        primary_drivers = [p for p in sensitivity.parameters if p.driver_classification == "PRIMARY_DRIVER"]
        if primary_drivers:
            top_p = max(primary_drivers, key=lambda p: p.elasticity_percent)
            q1 += f" Parameter sensitivity indicates that {top_p.parameter_name} is the primary hazard driver (Elasticity: {top_p.elasticity_percent:.1f}%)."

    # 6. Scenario Comparison (Optional)
    q_comp = comparison.comparative_analysis_text if comparison else None

    return ExplainabilityReportDTO(
        zone_dimension_rationale=q1,
        spatial_asymmetry_rationale=q2,
        approach_rationale=q3,
        dominant_hazard_rationale=q4,
        scenario_comparison_rationale=q_comp,
    )
