"""
RESQ-ENG-SPEC-2026-001 — Source Characterization Orchestrator
"""

from .dtos import SourceTermsDTO
from .pool_diameter import calculate_pool_diameter
from .energy import calculate_energy_and_burning_rates
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..materials.burning_flux import calculate_mass_burning_flux


def characterize_source(
    scenario: ScenarioInputDTO,
    material: MaterialPropertiesDTO,
) -> SourceTermsDTO:
    """
    Orchestrate full physical source characterization:
    - Liquid inventory mass from tank geometry and fuel density
    - Effective pool diameter bounded by bund or unconfined spreading
    - Asymptotic pool mass burning flux
    - Thermal combustion power, radiative release rate, burning duration
    - Flashed explosive vapor mass
    """
    v_liquid_m3 = scenario.tank.stored_liquid_volume_m3
    stored_mass_kg = v_liquid_m3 * material.liquid_density_kg_m3

    d_pool_m = calculate_pool_diameter(
        liquid_volume_m3=v_liquid_m3,
        tank_diameter_m=scenario.tank.diameter_m,
        bund_present=scenario.tank.bund_present,
        bund_diameter_m=scenario.tank.bund_diameter_m,
    )

    m_dot_flux = calculate_mass_burning_flux(
        diameter_m=d_pool_m,
        m_dot_inf=material.asymptotic_burning_flux_kg_m2_s,
        k_beta=material.extinction_absorption_coefficient_m_inv,
    )

    (
        pool_area_m2,
        mass_burning_rate_kg_s,
        burning_duration_s,
        stored_chem_energy_j,
        total_hrr_w,
        rad_hrr_w,
        part_vapor_mass_kg,
    ) = calculate_energy_and_burning_rates(
        stored_mass_kg=stored_mass_kg,
        heat_of_combustion_j_kg=material.heat_of_combustion_j_kg,
        mass_burning_flux_kg_m2_s=m_dot_flux,
        pool_diameter_m=d_pool_m,
        radiative_fraction=material.radiative_fraction,
        flashing_fraction=material.flashing_fraction,
    )

    return SourceTermsDTO(
        effective_pool_diameter_m=d_pool_m,
        pool_area_m2=pool_area_m2,
        mass_burning_flux_kg_m2_s=m_dot_flux,
        mass_burning_rate_kg_s=mass_burning_rate_kg_s,
        burning_duration_s=burning_duration_s,
        stored_mass_kg=stored_mass_kg,
        stored_chemical_energy_j=stored_chem_energy_j,
        total_heat_release_rate_w=total_hrr_w,
        radiative_heat_release_rate_w=rad_hrr_w,
        participating_vapor_mass_kg=part_vapor_mass_kg,
        is_bunded=scenario.tank.bund_present,
    )
