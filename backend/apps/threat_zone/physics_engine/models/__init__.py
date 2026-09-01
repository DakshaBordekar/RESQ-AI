"""
Physics models package (Thermal, Blast, Point Evaluator, Spatial Grid, Severity, Threat Polygons, Safe Approach, Monte Carlo).
"""

from .thermal import (
    ThermalRadiationResultDTO,
    calculate_thomas_flame_length,
    calculate_flame_tilt_angle,
    calculate_surface_emissive_power,
    calculate_mudan_view_factor,
    calculate_wayne_transmissivity,
    calculate_incident_thermal_flux,
    evaluate_thermal_radiation,
)
from .blast import (
    BlastResultDTO,
    calculate_tnt_equivalent_mass,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
    evaluate_blast_overpressure,
)
from .point_evaluator import (
    PointEvaluationDTO,
    evaluate_point,
)
from .spatial_grid import (
    HazardGridDTO,
    generate_hazard_grid,
)
from .severity import (
    HazardLevel,
    SeverityClassificationDTO,
    HazardZoneRadiiDTO,
    classify_severity,
    calculate_hazard_zone_radii,
)
from .threat_polygons import (
    ThreatPolygonDTO,
    HazardPolygonsDTO,
    generate_single_zone_polygon,
    generate_all_hazard_polygons,
)
from .safe_approach import (
    ApproachSafetyStatus,
    ApproachSectorDTO,
    SafeApproachPlanDTO,
    generate_safe_approach_plan,
)
from .monte_carlo import (
    StatisticalMetricDTO,
    MonteCarloInputUncertaintyDTO,
    MonteCarloResultDTO,
    run_monte_carlo_simulation,
)

__all__ = [
    "ThermalRadiationResultDTO",
    "calculate_thomas_flame_length",
    "calculate_flame_tilt_angle",
    "calculate_surface_emissive_power",
    "calculate_mudan_view_factor",
    "calculate_wayne_transmissivity",
    "calculate_incident_thermal_flux",
    "evaluate_thermal_radiation",
    "BlastResultDTO",
    "calculate_tnt_equivalent_mass",
    "calculate_scaled_distance",
    "calculate_sadovsky_overpressure",
    "evaluate_blast_overpressure",
    "PointEvaluationDTO",
    "evaluate_point",
    "HazardGridDTO",
    "generate_hazard_grid",
    "HazardLevel",
    "SeverityClassificationDTO",
    "HazardZoneRadiiDTO",
    "classify_severity",
    "calculate_hazard_zone_radii",
    "ThreatPolygonDTO",
    "HazardPolygonsDTO",
    "generate_single_zone_polygon",
    "generate_all_hazard_polygons",
    "ApproachSafetyStatus",
    "ApproachSectorDTO",
    "SafeApproachPlanDTO",
    "generate_safe_approach_plan",
    "StatisticalMetricDTO",
    "MonteCarloInputUncertaintyDTO",
    "MonteCarloResultDTO",
    "run_monte_carlo_simulation",
]
