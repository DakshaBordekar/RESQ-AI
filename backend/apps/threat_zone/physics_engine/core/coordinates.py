"""
RESQ-ENG-SPEC-2026-001 — Geodesic Coordinate Projections (EQ-GEO-01 & EQ-GEO-02)
"""

import math
from typing import Tuple, Union
import numpy as np
from .constants import EARTH_RADIUS_M, PI
from .exceptions import InvalidCoordinatesException


def validate_geographic_coordinates(lat: float, lon: float) -> None:
    """
    Validate that latitude and longitude fall within standard geodetic bounds.
    -90.0 <= lat <= 90.0, -180.0 <= lon <= 180.0
    """
    if not (-90.0 <= lat <= 90.0):
        raise InvalidCoordinatesException(
            f"Latitude {lat} out of bounds [-90.0, 90.0] degrees."
        )
    if not (-180.0 <= lon <= 180.0):
        raise InvalidCoordinatesException(
            f"Longitude {lon} out of bounds [-180.0, 180.0] degrees."
        )


def project_forward(
    lat: Union[float, np.ndarray],
    lon: Union[float, np.ndarray],
    origin_lat: float,
    origin_lon: float,
) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
    """
    EQ-GEO-01: Forward Geodesic Projection
    Converts geographic coordinates (lat, lon) to local metric Cartesian coordinates (x, y)
    relative to facility origin (origin_lat, origin_lon).

    x: Easting in meters (+x = East)
    y: Northing in meters (+y = North)
    """
    validate_geographic_coordinates(origin_lat, origin_lon)

    if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
        validate_geographic_coordinates(float(lat), float(lon))
        d_lon_rad = (float(lon) - origin_lon) * (PI / 180.0)
        d_lat_rad = (float(lat) - origin_lat) * (PI / 180.0)
        mean_lat_rad = ((origin_lat + float(lat)) / 2.0) * (PI / 180.0)

        x_m = EARTH_RADIUS_M * d_lon_rad * math.cos(mean_lat_rad)
        y_m = EARTH_RADIUS_M * d_lat_rad
        return float(x_m), float(y_m)
    else:
        lat_arr = np.asarray(lat, dtype=np.float64)
        lon_arr = np.asarray(lon, dtype=np.float64)

        if np.any(lat_arr < -90.0) or np.any(lat_arr > 90.0):
            raise InvalidCoordinatesException("Array contains latitude out of bounds [-90, 90].")
        if np.any(lon_arr < -180.0) or np.any(lon_arr > 180.0):
            raise InvalidCoordinatesException("Array contains longitude out of bounds [-180, 180].")

        d_lon_rad = (lon_arr - origin_lon) * (PI / 180.0)
        d_lat_rad = (lat_arr - origin_lat) * (PI / 180.0)
        mean_lat_rad = ((origin_lat + lat_arr) / 2.0) * (PI / 180.0)

        x_m = EARTH_RADIUS_M * d_lon_rad * np.cos(mean_lat_rad)
        y_m = EARTH_RADIUS_M * d_lat_rad
        return x_m, y_m


def project_inverse(
    x_m: Union[float, np.ndarray],
    y_m: Union[float, np.ndarray],
    origin_lat: float,
    origin_lon: float,
) -> Tuple[Union[float, np.ndarray], Union[float, np.ndarray]]:
    """
    EQ-GEO-02: Inverse Geodesic Projection
    Converts local metric Cartesian coordinates (x, y) relative to facility origin
    back to geographic coordinates (lat, lon).
    """
    validate_geographic_coordinates(origin_lat, origin_lon)

    if isinstance(x_m, (int, float)) and isinstance(y_m, (int, float)):
        d_lat_deg = (float(y_m) / EARTH_RADIUS_M) * (180.0 / PI)
        target_lat = origin_lat + d_lat_deg

        mean_lat_rad = ((origin_lat + target_lat) / 2.0) * (PI / 180.0)
        cos_mean = math.cos(mean_lat_rad)
        if abs(cos_mean) < 1e-12:
            cos_mean = 1e-12 if cos_mean >= 0 else -1e-12

        d_lon_deg = (float(x_m) / (EARTH_RADIUS_M * cos_mean)) * (180.0 / PI)
        target_lon = origin_lon + d_lon_deg

        # Wrap longitude into [-180, 180]
        target_lon = ((target_lon + 180.0) % 360.0) - 180.0

        return float(target_lat), float(target_lon)
    else:
        x_arr = np.asarray(x_m, dtype=np.float64)
        y_arr = np.asarray(y_m, dtype=np.float64)

        d_lat_deg = (y_arr / EARTH_RADIUS_M) * (180.0 / PI)
        target_lat = origin_lat + d_lat_deg

        mean_lat_rad = ((origin_lat + target_lat) / 2.0) * (PI / 180.0)
        cos_mean = np.cos(mean_lat_rad)
        cos_mean = np.where(np.abs(cos_mean) < 1e-12, np.sign(cos_mean) * 1e-12, cos_mean)

        d_lon_deg = (x_arr / (EARTH_RADIUS_M * cos_mean)) * (180.0 / PI)
        target_lon = origin_lon + d_lon_deg
        target_lon = ((target_lon + 180.0) % 360.0) - 180.0

        return target_lat, target_lon


# Aliases
geodetic_to_metric = project_forward
metric_to_geodetic = project_inverse
