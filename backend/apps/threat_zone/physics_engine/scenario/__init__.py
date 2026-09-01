"""
Phase 1: Input and scenario model with strict physical validation and immutable DTOs.
"""

from .enums import TankGeometryType, ReleaseType
from .dtos import (
    FacilityDTO,
    TankDTO,
    AtmosphereDTO,
    ReleaseScenarioDTO,
    ScenarioInputDTO,
)
from .validator import validate_and_build_scenario

__all__ = [
    "TankGeometryType",
    "ReleaseType",
    "FacilityDTO",
    "TankDTO",
    "AtmosphereDTO",
    "ReleaseScenarioDTO",
    "ScenarioInputDTO",
    "validate_and_build_scenario",
]
