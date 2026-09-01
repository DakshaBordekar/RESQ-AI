"""
RESQ-ENG-SPEC-2026-001 — Meteorological to Transport Vector Conversion (EQ-WIND-01)
"""

import math
from typing import Tuple
from .constants import PI
from .exceptions import InvalidWindDirectionException


CARDINAL_DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def validate_wind_direction(theta_met_deg: float) -> None:
    """
    Validate that meteorological azimuth is strictly within [0.0, 360.0).
    """
    if theta_met_deg < 0.0 or theta_met_deg >= 360.0:
        raise InvalidWindDirectionException(
            f"Meteorological wind direction {theta_met_deg}° is out of valid range [0.0, 360.0) degrees."
        )


def wind_to_downwind_vector(
    theta_met_deg: float,
    strict_validation: bool = True
) -> Tuple[float, float, float]:
    """
    EQ-WIND-01: Transform meteorological wind azimuth to downwind transport angle
    and orthogonal unit vector components.

    Inputs:
        theta_met_deg: Direction wind originates FROM (0° = North, 90° = East)
        strict_validation: If True, enforce 0 <= theta_met_deg < 360. If False, modulo 360.

    Outputs:
        theta_downwind_deg: Azimuth of transport TOWARD
        u_wx: Dimensionless unit vector along +x (East)
        u_wy: Dimensionless unit vector along +y (North)
    """
    if strict_validation:
        validate_wind_direction(theta_met_deg)
        clean_angle = theta_met_deg
    else:
        clean_angle = theta_met_deg % 360.0

    theta_downwind = (clean_angle + 180.0) % 360.0
    theta_rad = theta_downwind * (PI / 180.0)

    u_wx = math.sin(theta_rad)
    u_wy = math.cos(theta_rad)

    # Clean floating precision near zero
    if abs(u_wx) < 1e-15:
        u_wx = 0.0
    if abs(u_wy) < 1e-15:
        u_wy = 0.0

    return float(theta_downwind), float(u_wx), float(u_wy)


def calculate_wind_transport_vector(
    wind_speed_ms: float,
    theta_met_deg: float,
    strict_validation: bool = True
) -> Tuple[float, float, float]:
    """
    Calculate full dimensional wind velocity vector (u_x, u_y) and downwind angle.

    Outputs:
        (u_x_m_s, u_y_m_s, theta_downwind_deg)
    """
    theta_downwind, u_wx, u_wy = wind_to_downwind_vector(theta_met_deg, strict_validation)
    u_x = wind_speed_ms * u_wx
    u_y = wind_speed_ms * u_wy
    return float(u_x), float(u_y), float(theta_downwind)


def wind_direction_to_cardinal(theta_met_deg: float) -> str:
    """
    Convert wind azimuth to 8-point compass cardinal string (N, NE, E, SE, S, SW, W, NW).
    """
    validate_wind_direction(theta_met_deg)
    idx = int(math.floor((theta_met_deg + 22.5) / 45.0)) % 8
    return CARDINAL_DIRECTIONS[idx]


# Alias for backwards compatibility
get_cardinal_direction = wind_direction_to_cardinal
