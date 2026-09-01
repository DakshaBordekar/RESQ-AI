"""
RESQ-ENG-SPEC-2026-001 — PHASE 11 VERIFICATION TEST SUITE
Monte Carlo Probabilistic Uncertainty Model (Distributions, P95 Conservative Bounds & Reproducibility)
"""

import unittest

from apps.threat_zone.physics_engine.models.monte_carlo import (
    StatisticalMetricDTO,
    MonteCarloInputUncertaintyDTO,
    MonteCarloResultDTO,
    run_monte_carlo_simulation,
)
from apps.threat_zone.physics_engine.scenario.validator import validate_and_build_scenario
from apps.threat_zone.physics_engine.materials.registry import MaterialRegistry
from apps.threat_zone.physics_engine.source.characterization import characterize_source
from apps.threat_zone.physics_engine.core.exceptions import DomainException


class Phase11MonteCarloTestCase(unittest.TestCase):

    def setUp(self):
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

    def test_monte_carlo_statistical_percentile_monotonicity(self):
        """Percentiles must obey P5 <= P50 <= P95 and min <= mean <= max for all zones."""
        res = run_monte_carlo_simulation(
            self.scenario, self.source, self.material, n_samples=200, seed=42
        )

        for stats in [
            res.combined_red_radius_stats,
            res.combined_orange_radius_stats,
            res.combined_yellow_radius_stats,
            res.combined_green_radius_stats,
        ]:
            self.assertLessEqual(stats.min_val, stats.p5)
            self.assertLessEqual(stats.p5, stats.p50)
            self.assertLessEqual(stats.p50, stats.p95)
            self.assertLessEqual(stats.p95, stats.max_val)
            self.assertLessEqual(stats.min_val, stats.mean)
            self.assertLessEqual(stats.mean, stats.max_val)
            self.assertGreater(stats.std_dev, 0.0)

    def test_p95_conservative_threat_margin(self):
        """P95 radius must provide a safety buffer >= deterministic median radius."""
        res = run_monte_carlo_simulation(
            self.scenario, self.source, self.material, n_samples=200, seed=42
        )
        self.assertGreaterEqual(res.p95_radii.combined_green_m, res.deterministic_radii.combined_green_m)
        self.assertGreaterEqual(res.p95_radii.combined_yellow_m, res.deterministic_radii.combined_yellow_m)

    def test_random_seed_reproducibility(self):
        """Identical random seeds must produce 100% reproducible statistical metrics."""
        res1 = run_monte_carlo_simulation(
            self.scenario, self.source, self.material, n_samples=150, seed=123
        )
        res2 = run_monte_carlo_simulation(
            self.scenario, self.source, self.material, n_samples=150, seed=123
        )

        self.assertEqual(res1.combined_green_radius_stats.mean, res2.combined_green_radius_stats.mean)
        self.assertEqual(res1.combined_green_radius_stats.p95, res2.combined_green_radius_stats.p95)
        self.assertEqual(res1.combined_red_radius_stats.std_dev, res2.combined_red_radius_stats.std_dev)

    def test_sample_count_bounds_validation(self):
        """Samples < 100 or > 10,000 must raise DomainException."""
        with self.assertRaises(DomainException):
            run_monte_carlo_simulation(self.scenario, self.source, self.material, n_samples=50)

        with self.assertRaises(DomainException):
            run_monte_carlo_simulation(self.scenario, self.source, self.material, n_samples=20000)


if __name__ == "__main__":
    unittest.main()
