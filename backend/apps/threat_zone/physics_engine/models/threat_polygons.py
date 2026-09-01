"""
RESQ-ENG-SPEC-2026-001 — Geometric Threat Zone Boundary Generator (Phase 9)
Constructs closed WGS84 polygon rings with wind-induced thermal elongation and isotropic blast boundaries.
"""

import math
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Tuple
import numpy as np

from ..core.constants import PI
from ..core.coordinates import metric_to_geodetic
from ..core.wind import calculate_wind_transport_vector
from ..core.exceptions import DomainException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .severity import HazardLevel, HazardZoneRadiiDTO, calculate_hazard_zone_radii
from .thermal import calculate_thomas_flame_length, calculate_flame_tilt_angle


DEFAULT_POLYGON_VERTICES: int = 72


@dataclass(frozen=True)
class ThreatPolygonDTO:
    """Closed 2D boundary polygon representing a single hazard zone in WGS84 coordinates."""
    level: str  # RED_CRITICAL, ORANGE_SEVERE, YELLOW_MODERATE, GREEN_ADVISORY
    nominal_radius_m: float
    coordinates: List[List[float]]  # [[lat, lon], ...]
    area_m2: float
    vertex_count: int
    is_closed: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class HazardPolygonsDTO:
    """Full set of nested hazard zone polygons."""
    red_critical: ThreatPolygonDTO
    orange_severe: ThreatPolygonDTO
    yellow_moderate: ThreatPolygonDTO
    green_advisory: ThreatPolygonDTO

    def to_dict(self) -> Dict[str, Any]:
        return {
            "red_critical": self.red_critical.to_dict(),
            "orange_severe": self.orange_severe.to_dict(),
            "yellow_moderate": self.yellow_moderate.to_dict(),
            "green_advisory": self.green_advisory.to_dict(),
        }


def generate_single_zone_polygon(
    origin_lat: float,
    origin_lon: float,
    radius_m: float,
    level_name: str,
    flame_length_m: float = 0.0,
    flame_tilt_rad: float = 0.0,
    wind_downwind_deg: float = 0.0,
    n_vertices: int = DEFAULT_POLYGON_VERTICES,
) -> ThreatPolygonDTO:
    """
    Generate closed WGS84 polygon for a single hazard level.
    Incorporates downwind centroid shift and semi-major axis elongation for thermal wind tilt.
    """
    if radius_m <= 0.0:
        # Zero radius zone -> degenerate point closed polygon
        coords = [[origin_lat, origin_lon], [origin_lat, origin_lon]]
        return ThreatPolygonDTO(
            level=level_name,
            nominal_radius_m=0.0,
            coordinates=coords,
            area_m2=0.0,
            vertex_count=len(coords),
            is_closed=True,
        )

    if n_vertices < 36:
        raise DomainException(f"Polygon vertex count must be >= 36, got {n_vertices}")

    # Downwind shift of flame centroid [m]
    shift_distance = (flame_length_m * 0.5) * math.sin(flame_tilt_rad) if flame_length_m > 0 else 0.0
    wind_rad = math.radians(wind_downwind_deg)

    # Center shift in metric Cartesian coords (x=East, y=North)
    # Wind downwind angle is measured clockwise from North (0° = North, 90° = East)
    shift_x = shift_distance * math.sin(wind_rad)
    shift_y = shift_distance * math.cos(wind_rad)

    # Downwind elongation factor along wind axis
    elongation = 1.0 + 0.35 * math.sin(flame_tilt_rad)
    semi_major = radius_m * elongation
    semi_minor = radius_m

    # Discretize parametric ellipse oriented along wind direction
    angles = np.linspace(0.0, 2.0 * PI, n_vertices, endpoint=False)
    coords: List[List[float]] = []

    # In local ellipse frame: u along wind, v crosswind
    # Then rotate by wind_downwind_deg to (East, North)
    cos_w = math.cos(wind_rad)
    sin_w = math.sin(wind_rad)

    for phi in angles:
        # Ellipse parametric coordinates: u along wind direction, v perpendicular
        u = semi_major * math.cos(phi)
        v = semi_minor * math.sin(phi)

        # Rotate to metric grid (x=East, y=North)
        # u is along (sin_w, cos_w), v is along (cos_w, -sin_w)
        x_metric = shift_x + (u * sin_w + v * cos_w)
        y_metric = shift_y + (u * cos_w - v * sin_w)

        lat_pt, lon_pt = metric_to_geodetic(x_metric, y_metric, origin_lat, origin_lon)
        coords.append([float(lat_pt), float(lon_pt)])

    # Ensure strictly closed polygon ring
    coords.append(coords[0])

    # Approximate polygon area (elliptical area)
    poly_area_m2 = PI * semi_major * semi_minor

    return ThreatPolygonDTO(
        level=level_name,
        nominal_radius_m=float(radius_m),
        coordinates=coords,
        area_m2=float(poly_area_m2),
        vertex_count=len(coords),
        is_closed=(coords[0] == coords[-1]),
    )


def generate_all_hazard_polygons(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    radii: HazardZoneRadiiDTO,
    n_vertices: int = DEFAULT_POLYGON_VERTICES,
) -> HazardPolygonsDTO:
    """
    Generate all 4 nested hazard zone polygons (Red, Orange, Yellow, Green)
    in geodetic WGS84 coordinates using combined threat boundary radii.
    """
    # 1. Thermal Flame Parameters & Wind Vector
    l_flame, u_star = calculate_thomas_flame_length(
        d_pool_m=source.effective_pool_diameter_m,
        mass_burning_flux_kg_m2_s=source.mass_burning_flux_kg_m2_s,
        wind_speed_ms=scenario.atmosphere.wind_speed_ms,
        vapor_density_kg_m3=material.vapor_density_kg_m3,
    )
    tilt_rad, _ = calculate_flame_tilt_angle(u_star)
    _, _, downwind_deg = calculate_wind_transport_vector(
        scenario.atmosphere.wind_speed_ms, scenario.atmosphere.wind_direction_deg
    )

    origin_lat = scenario.facility.latitude
    origin_lon = scenario.facility.longitude

    poly_red = generate_single_zone_polygon(
        origin_lat, origin_lon, radii.combined_red_m, "RED_CRITICAL",
        l_flame, tilt_rad, downwind_deg, n_vertices
    )
    poly_orange = generate_single_zone_polygon(
        origin_lat, origin_lon, radii.combined_orange_m, "ORANGE_SEVERE",
        l_flame, tilt_rad, downwind_deg, n_vertices
    )
    poly_yellow = generate_single_zone_polygon(
        origin_lat, origin_lon, radii.combined_yellow_m, "YELLOW_MODERATE",
        l_flame, tilt_rad, downwind_deg, n_vertices
    )
    poly_green = generate_single_zone_polygon(
        origin_lat, origin_lon, radii.combined_green_m, "GREEN_ADVISORY",
        l_flame, tilt_rad, downwind_deg, n_vertices
    )

    return HazardPolygonsDTO(
        red_critical=poly_red,
        orange_severe=poly_orange,
        yellow_moderate=poly_yellow,
        green_advisory=poly_green,
    )
