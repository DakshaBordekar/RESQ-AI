"""
RESQ-ENG-SPEC-2026-001 — SI Metric Unit Conversion Utilities
"""

import math
from .exceptions import UnitConversionException


# --- Angular Conversions ---

def deg_to_rad(deg: float) -> float:
    """Convert degrees to radians."""
    return deg * (math.pi / 180.0)


def rad_to_deg(rad: float) -> float:
    """Convert radians to degrees."""
    return rad * (180.0 / math.pi)


def normalize_angle_360(angle_deg: float) -> float:
    """
    Normalize compass angle in degrees to [0.0, 360.0).
    E.g. -45 -> 315.0, 360.0 -> 0.0, 720.0 -> 0.0.
    """
    normalized = angle_deg % 360.0
    if normalized < 0:
        normalized += 360.0
    if normalized == 360.0:
        normalized = 0.0
    return float(normalized)


# --- Pressure Conversions ---

def bar_to_kpa(bar: float) -> float:
    """Convert bar to kilopascals (1 bar = 100 kPa)."""
    return bar * 100.0


def kpa_to_bar(kpa: float) -> float:
    """Convert kilopascals to bar (100 kPa = 1 bar)."""
    return kpa / 100.0


def kpa_to_psi(kpa: float) -> float:
    """Convert kilopascals to psi (1 kPa = 0.1450377 psi)."""
    return kpa * 0.1450377377


def psi_to_kpa(psi: float) -> float:
    """Convert psi to kilopascals."""
    return psi / 0.1450377377


def bar_to_psi(bar: float) -> float:
    """Convert bar to psi (1 bar = 14.50377 psi)."""
    return kpa_to_psi(bar_to_kpa(bar))


def psi_to_bar(psi: float) -> float:
    """Convert psi to bar."""
    return kpa_to_bar(psi_to_kpa(psi))


def pa_to_kpa(pa: float) -> float:
    """Convert Pascals to kilopascals."""
    return pa / 1000.0


def kpa_to_pa(kpa: float) -> float:
    """Convert kilopascals to Pascals."""
    return kpa * 1000.0


# --- Temperature Conversions ---

def celsius_to_kelvin(celsius: float) -> float:
    """Convert degrees Celsius to Kelvin."""
    k = celsius + 273.15
    if k < 0.0:
        raise UnitConversionException(f"Temperature {celsius}°C is below absolute zero.")
    return k


def kelvin_to_celsius(kelvin: float) -> float:
    """Convert Kelvin to degrees Celsius."""
    if kelvin < 0.0:
        raise UnitConversionException(f"Temperature {kelvin} K is below absolute zero.")
    return kelvin - 273.15


# --- Heat Flux Conversions ---

def kw_m2_to_w_m2(kw_m2: float) -> float:
    """Convert kW/m^2 to W/m^2."""
    return kw_m2 * 1000.0


def w_m2_to_kw_m2(w_m2: float) -> float:
    """Convert W/m^2 to kW/m^2."""
    return w_m2 / 1000.0
