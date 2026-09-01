"""
RESQ-ENG-PLAN-2026-002 — Deterministic Sensitivity Gradient Engine (Phase 5)
Evaluates localized sensitivity derivatives and elasticity percentages by systematically
perturbing physical parameters (V, fill, wind, yield) through the physics engine.
"""

from typing import Dict, Any, List
from .dtos import (
    SensitivityAnalysisDTO,
    SensitivityParameterDTO,
    SensitivityDriverType,
)
from apps.threat_zone.physics_engine.pipeline import run_hazard_model, HazardModelResultDTO


def evaluate_sensitivity_analysis(
    raw_scenario_dict: Dict[str, Any],
    baseline_result: HazardModelResultDTO,
) -> SensitivityAnalysisDTO:
    """
    Execute deterministic parameter perturbation sweep around the baseline scenario.
    """
    baseline_r_green = float(baseline_result.radii.combined_green_m)
    param_dtos: List[SensitivityParameterDTO] = []

    # 1. Fill Fraction (+0.10 perturbation)
    base_fill = float(raw_scenario_dict.get("fill_fraction", 0.85))
    perturbed_fill = min(0.98, base_fill + 0.10) if base_fill <= 0.88 else max(0.20, base_fill - 0.10)
    delta_fill = perturbed_fill - base_fill

    scenario_fill = dict(raw_scenario_dict)
    scenario_fill["fill_fraction"] = perturbed_fill
    res_fill = run_hazard_model(scenario_fill, include_spatial_grid=False, run_monte_carlo=False)
    delta_r_fill = float(res_fill.radii.combined_green_m - baseline_r_green)

    elasticity_fill = abs((delta_r_fill / max(1.0, baseline_r_green)) / (delta_fill / max(0.01, base_fill))) * 100.0
    classification_fill = (
        SensitivityDriverType.PRIMARY_DRIVER.value if elasticity_fill >= 15.0 or abs(delta_r_fill) >= 15.0
        else SensitivityDriverType.SECONDARY_FACTOR.value if elasticity_fill >= 3.0 or abs(delta_r_fill) >= 3.0
        else SensitivityDriverType.NEGLIGIBLE.value
    )
    param_dtos.append(
        SensitivityParameterDTO(
            parameter_name="fill_fraction",
            baseline_value=round(base_fill, 2),
            perturbed_value=round(perturbed_fill, 2),
            delta_radius_m=round(delta_r_fill, 1),
            elasticity_percent=round(elasticity_fill, 1),
            driver_classification=classification_fill,
        )
    )

    # 2. Tank Diameter (+10% perturbation)
    base_diam = float(raw_scenario_dict.get("tank_diameter_m", 12.0))
    perturbed_diam = base_diam * 1.10
    delta_diam = perturbed_diam - base_diam

    scenario_diam = dict(raw_scenario_dict)
    scenario_diam["tank_diameter_m"] = perturbed_diam
    res_diam = run_hazard_model(scenario_diam, include_spatial_grid=False, run_monte_carlo=False)
    delta_r_diam = float(res_diam.radii.combined_green_m - baseline_r_green)

    elasticity_diam = abs((delta_r_diam / max(1.0, baseline_r_green)) / (delta_diam / max(0.01, base_diam))) * 100.0
    classification_diam = (
        SensitivityDriverType.PRIMARY_DRIVER.value if elasticity_diam >= 15.0 or abs(delta_r_diam) >= 15.0
        else SensitivityDriverType.SECONDARY_FACTOR.value if elasticity_diam >= 3.0 or abs(delta_r_diam) >= 3.0
        else SensitivityDriverType.NEGLIGIBLE.value
    )
    param_dtos.append(
        SensitivityParameterDTO(
            parameter_name="tank_diameter_m",
            baseline_value=round(base_diam, 1),
            perturbed_value=round(perturbed_diam, 1),
            delta_radius_m=round(delta_r_diam, 1),
            elasticity_percent=round(elasticity_diam, 1),
            driver_classification=classification_diam,
        )
    )

    # 3. Wind Speed (+2.0 m/s perturbation)
    base_wind = float(raw_scenario_dict.get("wind_speed_ms", 5.0))
    perturbed_wind = base_wind + 2.0
    delta_wind = 2.0

    scenario_wind = dict(raw_scenario_dict)
    scenario_wind["wind_speed_ms"] = perturbed_wind
    res_wind = run_hazard_model(scenario_wind, include_spatial_grid=False, run_monte_carlo=False)
    delta_r_wind = float(res_wind.radii.combined_green_m - baseline_r_green)

    elasticity_wind = abs((delta_r_wind / max(1.0, baseline_r_green)) / (delta_wind / max(0.5, base_wind))) * 100.0
    classification_wind = (
        SensitivityDriverType.PRIMARY_DRIVER.value if elasticity_wind >= 15.0 or abs(delta_r_wind) >= 15.0
        else SensitivityDriverType.SECONDARY_FACTOR.value if elasticity_wind >= 3.0 or abs(delta_r_wind) >= 3.0
        else SensitivityDriverType.NEGLIGIBLE.value
    )
    param_dtos.append(
        SensitivityParameterDTO(
            parameter_name="wind_speed_ms",
            baseline_value=round(base_wind, 1),
            perturbed_value=round(perturbed_wind, 1),
            delta_radius_m=round(delta_r_wind, 1),
            elasticity_percent=round(elasticity_wind, 1),
            driver_classification=classification_wind,
        )
    )

    # 4. Explosion Yield Factor (if volatile BLEVE / LPG / LNG)
    if raw_scenario_dict.get("fuel_type") in ("LPG", "LNG", None):
        base_yield = float(raw_scenario_dict.get("explosion_yield_factor", 0.04))
        perturbed_yield = min(0.10, base_yield + 0.02)
        delta_yield = perturbed_yield - base_yield

        scenario_yield = dict(raw_scenario_dict)
        scenario_yield["explosion_yield_factor"] = perturbed_yield
        res_yield = run_hazard_model(scenario_yield, include_spatial_grid=False, run_monte_carlo=False)
        delta_r_yield = float(res_yield.radii.combined_green_m - baseline_r_green)

        elasticity_yield = abs((delta_r_yield / max(1.0, baseline_r_green)) / (delta_yield / max(0.001, base_yield))) * 100.0
        classification_yield = (
            SensitivityDriverType.PRIMARY_DRIVER.value if elasticity_yield >= 15.0 or abs(delta_r_yield) >= 15.0
            else SensitivityDriverType.SECONDARY_FACTOR.value if elasticity_yield >= 3.0 or abs(delta_r_yield) >= 3.0
            else SensitivityDriverType.NEGLIGIBLE.value
        )
        param_dtos.append(
            SensitivityParameterDTO(
                parameter_name="explosion_yield_factor",
                baseline_value=round(base_yield, 3),
                perturbed_value=round(perturbed_yield, 3),
                delta_radius_m=round(delta_r_yield, 1),
                elasticity_percent=round(elasticity_yield, 1),
                driver_classification=classification_yield,
            )
        )

    return SensitivityAnalysisDTO(
        baseline_green_radius_m=round(baseline_r_green, 1),
        parameters=param_dtos,
    )
