"""
RESQ-ENG-PLAN-2026-002 — Differential Scenario Comparison Engine (Phase 4)
Executes deep physics-informed comparative analysis between two distinct facility configurations
(e.g., Facility A LPG BLEVE Sphere vs. Facility B Diesel Pool Fire Bund).
"""

from typing import Tuple
from .dtos import ScenarioComparisonDTO
from apps.threat_zone.physics_engine.pipeline import HazardModelResultDTO


def compare_scenarios(
    result_a: HazardModelResultDTO,
    result_b: HazardModelResultDTO,
) -> ScenarioComparisonDTO:
    """
    Perform rigorous analytical comparison between two simulated industrial hazard scenarios.
    """
    name_a = result_a.scenario.facility.facility_name or "Facility A"
    name_b = result_b.scenario.facility.facility_name or "Facility B"

    mat_a = result_a.material.material_id
    mat_b = result_b.material.material_id

    # Energy calculations
    # Heat of combustion [J/kg] * release mass [kg]
    energy_a = float(result_a.material.heat_of_combustion_j_kg * result_a.source.participating_vapor_mass_kg) if mat_a in ("LPG", "LNG") else float(result_a.source.radiative_heat_release_rate_w * 3600.0)

    energy_b = float(result_b.material.heat_of_combustion_j_kg * result_b.source.participating_vapor_mass_kg) if mat_b in ("LPG", "LNG") else float(result_b.source.radiative_heat_release_rate_w * 3600.0)

    eps = 1e-6
    energy_ratio = float(energy_a / (energy_b + eps))

    # Power release rates
    # BLEVE fireball releases in ~10-20 seconds vs Pool Fire sustained over hours
    if mat_a in ("LPG", "LNG"):
        power_a = energy_a / max(1.0, 16.0) # ~16s fireball
    else:
        power_a = result_a.source.radiative_heat_release_rate_w

    if mat_b in ("LPG", "LNG"):
        power_b = energy_b / max(1.0, 16.0)
    else:
        power_b = result_b.source.radiative_heat_release_rate_w

    rate_ratio = float(power_a / (power_b + eps))

    # Blast consequence delta
    tnt_a = (energy_a * result_a.scenario.release.explosion_yield_factor / 4.686e6) if mat_a in ("LPG", "LNG") else 0.0
    tnt_b = (energy_b * result_b.scenario.release.explosion_yield_factor / 4.686e6) if mat_b in ("LPG", "LNG") else 0.0
    tnt_delta = float(tnt_a - tnt_b)

    # Max green advisory radius delta
    r_green_a = result_a.radii.combined_green_m
    r_green_b = result_b.radii.combined_green_m
    r_delta = float(r_green_a - r_green_b)

    # Generate analytical explanation narrative
    analysis_lines = [
        f"### COMPARATIVE PHYSICAL ANALYSIS: {name_a} vs. {name_b}",
        f"1. **Combustion Dynamics & Power Release:** {name_a} produces a peak radiative power of {power_a/1e6:.1f} MW compared to {power_b/1e6:.1f} MW for {name_b} (Kinematic Disparity Ratio: {rate_ratio:.1f}x).",
        f"2. **Blast & Overpressure Consequence:** {name_a} generates {tnt_a:.1f} kg TNT equivalent overpressure shockwaves, whereas {name_b} exhibits {tnt_b:.1f} kg TNT equivalent shockwave risk.",
        f"3. **Spatial Hazard Footprint:** The maximum public safety advisory perimeter (1.4 kW/m^2 / 2.0 kPa) extends to {r_green_a:.1f} m for {name_a} vs. {r_green_b:.1f} m for {name_b} (Net Spatial Delta: {r_delta:+.1f} m).",
        f"4. **Tactical Response Directives:**",
        f"   - **{name_a}:** Rapid life-safety evacuation required within {result_a.radii.combined_red_m:.1f} m due to catastrophic burst kinetics.",
        f"   - **{name_b}:** Sustained defensive cooling and foam application viable at the {result_b.radii.combined_yellow_m:.1f} m staging boundary.",
    ]
    comparative_text = "\n".join(analysis_lines)

    return ScenarioComparisonDTO(
        facility_a_name=name_a,
        facility_b_name=name_b,
        energy_release_ratio=round(energy_ratio, 2),
        power_release_rate_ratio=round(rate_ratio, 2),
        blast_tnt_delta_kg=round(tnt_delta, 1),
        max_radius_delta_m=round(r_delta, 1),
        comparative_analysis_text=comparative_text,
    )
