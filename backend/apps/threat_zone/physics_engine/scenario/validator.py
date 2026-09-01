"""
RESQ-ENG-SPEC-2026-001 — Scenario Input Parsing and Strict Validation
"""

from typing import Dict, Any, Union
from .enums import TankGeometryType, ReleaseType
from .dtos import (
    FacilityDTO,
    TankDTO,
    AtmosphereDTO,
    ReleaseScenarioDTO,
    ScenarioInputDTO,
)
from ..core.coordinates import validate_geographic_coordinates
from ..core.wind import validate_wind_direction
from ..core.exceptions import (
    SchemaValidationException,
    InconsistentGeometryException,
)


def validate_and_build_scenario(data: Dict[str, Any]) -> ScenarioInputDTO:
    """
    Parse and strictly validate scenario input dictionary into immutable ScenarioInputDTO.
    Supports both nested dictionary structures and flat API request formats.
    """
    if not isinstance(data, dict):
        raise SchemaValidationException("Scenario input data must be a dictionary.")

    # 1. Facility Extraction & Validation
    facility_data = data.get("facility", {})
    if not isinstance(facility_data, dict):
        facility_data = {}

    facility_id = str(data.get("facility_id", facility_data.get("facility_id", "FACILITY_001")))
    facility_name = str(data.get("facility_name", facility_data.get("facility_name", "Industrial Storage Facility")))

    lat_val = data.get("latitude", facility_data.get("latitude"))
    lon_val = data.get("longitude", facility_data.get("longitude"))

    if lat_val is None or lon_val is None:
        raise SchemaValidationException("Facility latitude and longitude are mandatory.")

    try:
        lat = float(lat_val)
        lon = float(lon_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid numeric coordinates: lat={lat_val}, lon={lon_val}")

    validate_geographic_coordinates(lat, lon)
    facility_dto = FacilityDTO(
        facility_id=facility_id,
        facility_name=facility_name,
        latitude=lat,
        longitude=lon,
    )

    # 2. Tank Geometry Extraction & Validation
    tank_data = data.get("tank", {})
    if not isinstance(tank_data, dict):
        tank_data = {}

    geom_raw = data.get("tank_geometry", data.get("geometry_type", tank_data.get("geometry_type", "VERTICAL_CYLINDER")))
    try:
        geom_type = TankGeometryType(geom_raw)
    except ValueError:
        raise SchemaValidationException(
            f"Unsupported tank geometry '{geom_raw}'. Must be one of {[g.value for g in TankGeometryType]}"
        )

    diam_val = data.get("tank_diameter_m", data.get("diameter_m", tank_data.get("diameter_m")))
    if diam_val is None:
        # Fallback if pool_diameter_m is given
        diam_val = data.get("pool_diameter_m", tank_data.get("pool_diameter_m"))

    if diam_val is None:
        raise SchemaValidationException("Tank diameter is mandatory.")

    try:
        diameter_m = float(diam_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid tank diameter: {diam_val}")

    if not (1.0 <= diameter_m <= 100.0):
        raise SchemaValidationException(
            f"Tank diameter {diameter_m} m is outside valid bounds [1.0, 100.0] m."
        )

    height_val = data.get("tank_height_m", data.get("height_m", tank_data.get("height_m")))
    if height_val is None:
        if geom_type == TankGeometryType.SPHERE:
            height_m = diameter_m
        else:
            # Default height aspect ratio H = 0.5 * D if not specified
            height_m = max(1.0, diameter_m * 0.5)
    else:
        try:
            height_m = float(height_val)
        except (ValueError, TypeError):
            raise SchemaValidationException(f"Invalid tank height: {height_val}")

    if geom_type != TankGeometryType.SPHERE and not (1.0 <= height_m <= 50.0):
        raise SchemaValidationException(
            f"Tank height {height_m} m is outside valid bounds [1.0, 50.0] m."
        )

    fill_val = data.get("fill_fraction", tank_data.get("fill_fraction", 0.85))
    try:
        fill_fraction = float(fill_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid fill fraction: {fill_val}")

    if not (0.05 <= fill_fraction <= 1.00):
        raise SchemaValidationException(
            f"Fill fraction {fill_fraction} is outside valid bounds [0.05, 1.00]."
        )

    material_id = data.get("material_id", data.get("fuel_type", tank_data.get("material_id", "DIESEL")))
    if not material_id or not isinstance(material_id, str):
        raise SchemaValidationException("Material identifier is mandatory and must be a non-empty string.")
    material_id = material_id.strip().upper()

    bund_present = bool(data.get("bund_present", tank_data.get("bund_present", False)))
    bund_diam_val = data.get("bund_diameter_m", data.get("bund_diameter", tank_data.get("bund_diameter_m")))

    bund_diameter_m = None
    if bund_present:
        if bund_diam_val is None:
            # Default bund diameter: 1.5x tank diameter if not specified
            bund_diameter_m = diameter_m * 1.5
        else:
            try:
                bund_diameter_m = float(bund_diam_val)
            except (ValueError, TypeError):
                raise SchemaValidationException(f"Invalid bund diameter: {bund_diam_val}")

            if bund_diameter_m < diameter_m:
                raise InconsistentGeometryException(
                    f"Bund diameter ({bund_diameter_m} m) cannot be smaller than tank diameter ({diameter_m} m)."
                )

    tank_dto = TankDTO(
        geometry_type=geom_type,
        diameter_m=diameter_m,
        height_m=height_m,
        fill_fraction=fill_fraction,
        material_id=material_id,
        bund_present=bund_present,
        bund_diameter_m=bund_diameter_m,
    )

    # 3. Atmosphere Extraction & Validation
    atmo_data = data.get("atmosphere", {})
    if not isinstance(atmo_data, dict):
        atmo_data = {}

    wind_spd_val = data.get("wind_speed_ms", data.get("wind_speed", atmo_data.get("wind_speed_ms", 5.0)))
    try:
        wind_speed_ms = float(wind_spd_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid wind speed: {wind_spd_val}")

    if not (0.0 <= wind_speed_ms <= 25.0):
        raise SchemaValidationException(
            f"Wind speed {wind_speed_ms} m/s is outside screening bounds [0.0, 25.0] m/s."
        )

    wind_dir_val = data.get("wind_direction_deg", data.get("wind_direction", atmo_data.get("wind_direction_deg", 0.0)))
    try:
        wind_dir_deg = float(wind_dir_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid wind direction: {wind_dir_val}")

    validate_wind_direction(wind_dir_deg)

    temp_k_val = data.get("ambient_temperature_k", atmo_data.get("ambient_temperature_k"))
    if temp_k_val is None:
        temp_c_val = data.get("ambient_temperature_c", atmo_data.get("ambient_temperature_c", 25.0))
        try:
            temp_k = float(temp_c_val) + 273.15
        except (ValueError, TypeError):
            raise SchemaValidationException(f"Invalid ambient temperature: {temp_c_val}")
    else:
        try:
            temp_k = float(temp_k_val)
        except (ValueError, TypeError):
            raise SchemaValidationException(f"Invalid ambient temperature: {temp_k_val}")

    if not (240.0 <= temp_k <= 330.0):
        raise SchemaValidationException(
            f"Ambient temperature {temp_k} K is outside valid range [240.0, 330.0] K."
        )

    rh_val = data.get("relative_humidity", atmo_data.get("relative_humidity", 0.50))
    try:
        rh = float(rh_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid relative humidity: {rh_val}")

    # Handle percentage 5% to 100% vs fraction 0.05 to 1.00
    if rh > 1.0:
        rh = rh / 100.0

    if not (0.05 <= rh <= 1.00):
        raise SchemaValidationException(
            f"Relative humidity {rh} is outside valid range [0.05, 1.00]."
        )

    pressure_pa = float(data.get("atmospheric_pressure_pa", atmo_data.get("atmospheric_pressure_pa", 101325.0)))

    atmosphere_dto = AtmosphereDTO(
        wind_speed_ms=wind_speed_ms,
        wind_direction_deg=wind_dir_deg,
        ambient_temperature_k=temp_k,
        relative_humidity=rh,
        atmospheric_pressure_pa=pressure_pa,
    )

    # 4. Release Scenario Extraction & Validation
    release_data = data.get("release", {})
    if not isinstance(release_data, dict):
        release_data = {}

    rel_type_raw = data.get("release_type", release_data.get("release_type", "CATASTROPHIC_RUPTURE"))
    try:
        release_type = ReleaseType(rel_type_raw)
    except ValueError:
        raise SchemaValidationException(
            f"Unsupported release type '{rel_type_raw}'. Must be one of {[r.value for r in ReleaseType]}"
        )

    yield_val = data.get("explosion_yield_factor", data.get("yield_factor", release_data.get("explosion_yield_factor", 0.03)))
    try:
        yield_factor = float(yield_val)
    except (ValueError, TypeError):
        raise SchemaValidationException(f"Invalid explosion yield factor: {yield_val}")

    if not (0.01 <= yield_factor <= 0.15):
        raise SchemaValidationException(
            f"Explosion yield factor {yield_factor} is outside valid range [0.01, 0.15]."
        )

    release_dto = ReleaseScenarioDTO(
        release_type=release_type,
        explosion_yield_factor=yield_factor,
    )

    scenario_id = str(data.get("scenario_id", "SCENARIO_001"))

    return ScenarioInputDTO(
        scenario_id=scenario_id,
        facility=facility_dto,
        tank=tank_dto,
        atmosphere=atmosphere_dto,
        release=release_dto,
    )
