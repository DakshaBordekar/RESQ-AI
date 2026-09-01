"""
RESQ-ENG-SPEC-2026-001 — Monte Carlo Probabilistic Uncertainty Model (Phase 11)
Propagates meteorological, material, and explosion yield distributions to compute P5, P50, P95 consequence envelopes.
"""

import math
import time
from dataclasses import dataclass, asdict, replace
from typing import Dict, Any, List, Optional
import numpy as np

from ..core.constants import PI
from ..core.exceptions import DomainException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .severity import HazardZoneRadiiDTO, calculate_hazard_zone_radii


MIN_MONTE_CARLO_SAMPLES: int = 100
MAX_MONTE_CARLO_SAMPLES: int = 10000
DEFAULT_MONTE_CARLO_SAMPLES: int = 1000


@dataclass(frozen=True)
class StatisticalMetricDTO:
    """Descriptive statistics for an evaluated consequence quantity."""
    mean: float
    std_dev: float
    p5: float
    p50: float
    p95: float
    min_val: float
    max_val: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class MonteCarloInputUncertaintyDTO:
    """Uncertainty specifications for Monte Carlo sampling."""
    wind_speed_std_ms: float = 1.5
    wind_direction_std_deg: float = 15.0
    ambient_temp_std_k: float = 3.0
    explosion_yield_min: float = 0.02
    explosion_yield_max: float = 0.08
    burning_flux_std_fraction: float = 0.15


@dataclass(frozen=True)
class MonteCarloResultDTO:
    """Complete probabilistic consequence simulation output."""
    n_samples: int
    execution_time_ms: float
    combined_red_radius_stats: StatisticalMetricDTO
    combined_orange_radius_stats: StatisticalMetricDTO
    combined_yellow_radius_stats: StatisticalMetricDTO
    combined_green_radius_stats: StatisticalMetricDTO
    p95_radii: HazardZoneRadiiDTO
    deterministic_radii: HazardZoneRadiiDTO

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_samples": self.n_samples,
            "execution_time_ms": self.execution_time_ms,
            "combined_red_radius_stats": self.combined_red_radius_stats.to_dict(),
            "combined_orange_radius_stats": self.combined_orange_radius_stats.to_dict(),
            "combined_yellow_radius_stats": self.combined_yellow_radius_stats.to_dict(),
            "combined_green_radius_stats": self.combined_green_radius_stats.to_dict(),
            "p95_radii": self.p95_radii.to_dict(),
            "deterministic_radii": self.deterministic_radii.to_dict(),
        }


def _compute_stats(data: np.ndarray) -> StatisticalMetricDTO:
    """Compute standard descriptive statistical metrics from empirical sample vector."""
    if len(data) == 0:
        return StatisticalMetricDTO(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    return StatisticalMetricDTO(
        mean=float(np.mean(data)),
        std_dev=float(np.std(data)),
        p5=float(np.percentile(data, 5)),
        p50=float(np.percentile(data, 50)),
        p95=float(np.percentile(data, 95)),
        min_val=float(np.min(data)),
        max_val=float(np.max(data)),
    )


def run_monte_carlo_simulation(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    n_samples: int = DEFAULT_MONTE_CARLO_SAMPLES,
    uncertainty: Optional[MonteCarloInputUncertaintyDTO] = None,
    seed: int = 42,
) -> MonteCarloResultDTO:
    """
    Run vectorized Monte Carlo simulation to quantify parametric uncertainty in threat boundaries.
    """
    if not (MIN_MONTE_CARLO_SAMPLES <= n_samples <= MAX_MONTE_CARLO_SAMPLES):
        raise DomainException(
            f"Monte Carlo samples {n_samples} outside valid range [{MIN_MONTE_CARLO_SAMPLES}, {MAX_MONTE_CARLO_SAMPLES}]."
        )

    t_start = time.perf_counter()
    rng = np.random.default_rng(seed)
    unc = uncertainty or MonteCarloInputUncertaintyDTO()

    # 1. Deterministic Baseline
    det_radii = calculate_hazard_zone_radii(scenario, source, material)

    # 2. Sample Uncertainty Distributions
    # Wind speed: truncated normal [0.1, 35.0]
    sampled_wind_speed = rng.normal(
        loc=scenario.atmosphere.wind_speed_ms,
        scale=unc.wind_speed_std_ms,
        size=n_samples,
    )
    sampled_wind_speed = np.clip(sampled_wind_speed, 0.1, 35.0)

    # Ambient temperature: truncated normal [260, 330] K
    sampled_temp = rng.normal(
        loc=scenario.atmosphere.ambient_temperature_k,
        scale=unc.ambient_temp_std_k,
        size=n_samples,
    )
    sampled_temp = np.clip(sampled_temp, 260.0, 330.0)

    # Explosion yield factor: uniform [yield_min, yield_max]
    sampled_yield = rng.uniform(
        low=unc.explosion_yield_min,
        high=unc.explosion_yield_max,
        size=n_samples,
    )

    # Burning flux multiplier: truncated normal [0.5, 2.0]
    sampled_flux_mult = rng.normal(
        loc=1.0,
        scale=unc.burning_flux_std_fraction,
        size=n_samples,
    )
    sampled_flux_mult = np.clip(sampled_flux_mult, 0.5, 2.0)

    # 3. Sample Evaluation Loop
    red_radii = np.zeros(n_samples, dtype=np.float64)
    orange_radii = np.zeros(n_samples, dtype=np.float64)
    yellow_radii = np.zeros(n_samples, dtype=np.float64)
    green_radii = np.zeros(n_samples, dtype=np.float64)

    for i in range(n_samples):
        # Construct perturbed scenario and source using replace
        pert_atmo = replace(
            scenario.atmosphere,
            wind_speed_ms=float(sampled_wind_speed[i]),
            ambient_temperature_k=float(sampled_temp[i]),
        )
        pert_release = replace(
            scenario.release,
            explosion_yield_factor=float(sampled_yield[i]),
        )
        pert_scenario = replace(
            scenario,
            atmosphere=pert_atmo,
            release=pert_release,
        )

        pert_source = replace(
            source,
            mass_burning_flux_kg_m2_s=source.mass_burning_flux_kg_m2_s * float(sampled_flux_mult[i]),
            mass_burning_rate_kg_s=source.mass_burning_rate_kg_s * float(sampled_flux_mult[i]),
            total_heat_release_rate_w=source.total_heat_release_rate_w * float(sampled_flux_mult[i]),
            radiative_heat_release_rate_w=source.radiative_heat_release_rate_w * float(sampled_flux_mult[i]),
        )

        r_sample = calculate_hazard_zone_radii(pert_scenario, pert_source, material)
        red_radii[i] = r_sample.combined_red_m
        orange_radii[i] = r_sample.combined_orange_m
        yellow_radii[i] = r_sample.combined_yellow_m
        green_radii[i] = r_sample.combined_green_m

    # 4. Compute Statistical Metrics
    stats_red = _compute_stats(red_radii)
    stats_orange = _compute_stats(orange_radii)
    stats_yellow = _compute_stats(yellow_radii)
    stats_green = _compute_stats(green_radii)

    # 5. P95 Conservative Threat Boundary Envelope
    p95_radii = HazardZoneRadiiDTO(
        thermal_red_m=stats_red.p95,
        thermal_orange_m=stats_orange.p95,
        thermal_yellow_m=stats_yellow.p95,
        thermal_green_m=stats_green.p95,
        blast_red_m=stats_red.p95,
        blast_orange_m=stats_orange.p95,
        blast_yellow_m=stats_yellow.p95,
        blast_green_m=stats_green.p95,
        combined_red_m=stats_red.p95,
        combined_orange_m=stats_orange.p95,
        combined_yellow_m=stats_yellow.p95,
        combined_green_m=stats_green.p95,
    )

    t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    return MonteCarloResultDTO(
        n_samples=n_samples,
        execution_time_ms=float(t_elapsed_ms),
        combined_red_radius_stats=stats_red,
        combined_orange_radius_stats=stats_orange,
        combined_yellow_radius_stats=stats_yellow,
        combined_green_radius_stats=stats_green,
        p95_radii=p95_radii,
        deterministic_radii=det_radii,
    )
