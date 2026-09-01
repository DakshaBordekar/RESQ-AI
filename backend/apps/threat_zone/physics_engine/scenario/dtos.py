"""
RESQ-ENG-SPEC-2026-001 — Scenario Data Transfer Objects (Immutable)
"""

import math
from dataclasses import dataclass, asdict
from typing import Optional, Dict, Any
from .enums import TankGeometryType, ReleaseType
from ..core.constants import PI
from ..core.exceptions import SchemaValidationException


@dataclass(frozen=True)
class FacilityDTO:
    """Facility identification and geographic origin."""
    facility_id: str
    facility_name: str
    latitude: float
    longitude: float


@dataclass(frozen=True)
class TankDTO:
    """Storage vessel geometry and secondary containment."""
    geometry_type: TankGeometryType
    diameter_m: float
    height_m: float
    fill_fraction: float
    material_id: str
    bund_present: bool = False
    bund_diameter_m: Optional[float] = None

    @property
    def total_volume_m3(self) -> float:
        """Calculate total internal vessel volume [m^3]."""
        if self.geometry_type == TankGeometryType.SPHERE:
            return (PI / 6.0) * (self.diameter_m ** 3)
        elif self.geometry_type in (TankGeometryType.VERTICAL_CYLINDER, TankGeometryType.HORIZONTAL_CYLINDER):
            return (PI / 4.0) * (self.diameter_m ** 2) * self.height_m
        else:
            raise SchemaValidationException(f"Unsupported geometry type: {self.geometry_type}")

    @property
    def stored_liquid_volume_m3(self) -> float:
        """Calculate active liquid inventory volume [m^3]."""
        return self.total_volume_m3 * self.fill_fraction


@dataclass(frozen=True)
class AtmosphereDTO:
    """Ambient meteorological conditions."""
    wind_speed_ms: float
    wind_direction_deg: float  # Meteorological azimuth (0° = North, direction wind comes FROM)
    ambient_temperature_k: float = 298.15  # 25°C default
    relative_humidity: float = 0.50  # 50% default
    atmospheric_pressure_pa: float = 101325.0


# Alias
AtmosphericDTO = AtmosphereDTO


@dataclass(frozen=True)
class ReleaseScenarioDTO:
    """Accidental release breach mode and explosion parameters."""
    release_type: ReleaseType
    explosion_yield_factor: float = 0.03  # Default 3% screening yield for VCE


@dataclass(frozen=True)
class ScenarioInputDTO:
    """Immutable, fully validated scenario definition."""
    scenario_id: str
    facility: FacilityDTO
    tank: TankDTO
    atmosphere: AtmosphereDTO
    release: ReleaseScenarioDTO

    def to_dict(self) -> Dict[str, Any]:
        """Convert entire scenario object graph to native dict."""
        return asdict(self)
