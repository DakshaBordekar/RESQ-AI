"""
Industrial Fire & Explosion Hazard Physics Engine
RESQ-ENG-SPEC-2026-001 Revision 2.0.0
"""

from .core.constants import (
    MODEL_VERSION,
    SPECIFICATION_ID,
    SYSTEM_CLASSIFICATION,
    EARTH_RADIUS_M,
    GRAVITY_M_S2,
    ATMOSPHERIC_PRESSURE_PA,
    ATMOSPHERIC_PRESSURE_BAR,
    ATMOSPHERIC_PRESSURE_KPA,
    AIR_DENSITY_KG_M3,
    TNT_ENERGY_J_KG,
    THERMAL_THRESHOLDS_KW_M2,
    BLAST_THRESHOLDS_KPA,
)
from .core.exceptions import (
    PhysicsEngineException,
    DomainException,
    InvalidCoordinatesException,
    InvalidWindDirectionException,
    InvalidSourceParameterException,
    NegativeConsequenceException,
    EnergyConservationException,
)
from .scenario.enums import TankGeometry, ReleaseType, FuelType
from .scenario.dtos import (
    FacilityDTO,
    TankDTO,
    ReleaseScenarioDTO,
    AtmosphericDTO,
    ScenarioInputDTO,
)
from .scenario.validator import validate_and_build_scenario
from .materials.dtos import MaterialPropertiesDTO
from .materials.registry import MaterialRegistry
from .source.dtos import SourceTermsDTO
from .source.characterization import characterize_source
from .models.thermal import (
    ThermalRadiationResultDTO,
    calculate_thomas_flame_length,
    calculate_flame_tilt_angle,
    calculate_surface_emissive_power,
    calculate_mudan_view_factor,
    calculate_wayne_transmissivity,
    calculate_incident_thermal_flux,
    evaluate_thermal_radiation,
)
from .models.blast import (
    BlastResultDTO,
    calculate_tnt_equivalent_mass,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
    evaluate_blast_overpressure,
)
from .models.point_evaluator import PointEvaluationDTO, evaluate_point
from .models.spatial_grid import HazardGridDTO, generate_hazard_grid
from .models.severity import (
    HazardLevel,
    SeverityClassificationDTO,
    HazardZoneRadiiDTO,
    classify_severity,
    calculate_hazard_zone_radii,
)
from .models.threat_polygons import (
    ThreatPolygonDTO,
    HazardPolygonsDTO,
    generate_single_zone_polygon,
    generate_all_hazard_polygons,
)
from .models.safe_approach import (
    ApproachSafetyStatus,
    ApproachSectorDTO,
    SafeApproachPlanDTO,
    generate_safe_approach_plan,
)
from .models.monte_carlo import (
    StatisticalMetricDTO,
    MonteCarloInputUncertaintyDTO,
    MonteCarloResultDTO,
    run_monte_carlo_simulation,
)
from .pipeline import HazardModelResultDTO, run_hazard_model

__all__ = [
    "MODEL_VERSION",
    "SPECIFICATION_ID",
    "SYSTEM_CLASSIFICATION",
    "EARTH_RADIUS_M",
    "GRAVITY_M_S2",
    "ATMOSPHERIC_PRESSURE_PA",
    "ATMOSPHERIC_PRESSURE_BAR",
    "ATMOSPHERIC_PRESSURE_KPA",
    "AIR_DENSITY_KG_M3",
    "TNT_ENERGY_J_KG",
    "THERMAL_THRESHOLDS_KW_M2",
    "BLAST_THRESHOLDS_KPA",
    "PhysicsEngineException",
    "DomainException",
    "InvalidCoordinatesException",
    "InvalidWindDirectionException",
    "InvalidSourceParameterException",
    "NegativeConsequenceException",
    "EnergyConservationException",
    "TankGeometry",
    "ReleaseType",
    "FuelType",
    "FacilityDTO",
    "TankDTO",
    "ReleaseScenarioDTO",
    "AtmosphericDTO",
    "ScenarioInputDTO",
    "validate_and_build_scenario",
    "MaterialPropertiesDTO",
    "MaterialRegistry",
    "SourceTermsDTO",
    "characterize_source",
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
    "HazardModelResultDTO",
    "run_hazard_model",
]
