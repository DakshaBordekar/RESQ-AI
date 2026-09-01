"""
RESQ-ENG-SPEC-2026-001 — Energy Partitioning and Source Kinetics (EQ-SRC-02 & EQ-SRC-03)
"""

import math
from typing import Tuple
from ..core.constants import PI
from ..core.exceptions import DomainException


def calculate_energy_and_burning_rates(
    stored_mass_kg: float,
    heat_of_combustion_j_kg: float,
    mass_burning_flux_kg_m2_s: float,
    pool_diameter_m: float,
    radiative_fraction: float,
    flashing_fraction: float,
) -> Tuple[float, float, float, float, float, float, float]:
    """
    EQ-SRC-02 & EQ-SRC-03:
    Compute pool area, combustion power, radiative power, mass burning rate,
    burning duration, chemical energy, and explosive vapor mass.

    Outputs:
        (pool_area_m2, mass_burning_rate_kg_s, burning_duration_s,
         stored_chemical_energy_j, total_heat_release_rate_w,
         radiative_heat_release_rate_w, participating_vapor_mass_kg)
    """
    if stored_mass_kg <= 0.0:
        raise DomainException(f"Stored mass must be strictly positive, got {stored_mass_kg} kg.")
    if heat_of_combustion_j_kg <= 0.0:
        raise DomainException(f"Heat of combustion must be positive, got {heat_of_combustion_j_kg} J/kg.")
    if mass_burning_flux_kg_m2_s <= 0.0:
        raise DomainException(f"Mass burning flux must be positive, got {mass_burning_flux_kg_m2_s}.")
    if pool_diameter_m <= 0.0:
        raise DomainException(f"Pool diameter must be positive, got {pool_diameter_m} m.")
    if not (0.0 <= radiative_fraction <= 1.0):
        raise DomainException(f"Radiative fraction must be in [0, 1], got {radiative_fraction}.")
    if not (0.0 <= flashing_fraction <= 1.0):
        raise DomainException(f"Flashing fraction must be in [0, 1], got {flashing_fraction}.")

    pool_area_m2 = (PI / 4.0) * (pool_diameter_m ** 2)
    mass_burning_rate_kg_s = mass_burning_flux_kg_m2_s * pool_area_m2
    burning_duration_s = stored_mass_kg / max(1e-6, mass_burning_rate_kg_s)

    stored_chemical_energy_j = stored_mass_kg * heat_of_combustion_j_kg
    total_heat_release_rate_w = mass_burning_rate_kg_s * heat_of_combustion_j_kg
    radiative_heat_release_rate_w = radiative_fraction * total_heat_release_rate_w
    participating_vapor_mass_kg = stored_mass_kg * flashing_fraction

    return (
        float(pool_area_m2),
        float(mass_burning_rate_kg_s),
        float(burning_duration_s),
        float(stored_chemical_energy_j),
        float(total_heat_release_rate_w),
        float(radiative_heat_release_rate_w),
        float(participating_vapor_mass_kg),
    )
