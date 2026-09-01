"""
RESQ-ENG-SPEC-2026-001 — Material Properties Registry
"""

from typing import Dict, List, Optional
from .dtos import MaterialPropertiesDTO
from ..core.exceptions import UnknownMaterialException


# Controlled standard industrial material catalog
_MATERIALS_CATALOG: Dict[str, MaterialPropertiesDTO] = {
    "DIESEL": MaterialPropertiesDTO(
        material_id="DIESEL",
        name="Diesel Fuel (No. 2 / Class C)",
        liquid_density_kg_m3=840.0,
        vapor_density_kg_m3=4.50,
        heat_of_combustion_j_kg=4.31e7,  # 43.1 MJ/kg
        boiling_point_k=453.15,          # 180°C
        asymptotic_burning_flux_kg_m2_s=0.035,
        extinction_absorption_coefficient_m_inv=0.80,
        radiative_fraction=0.22,
        soot_extinction_coefficient_m_inv=0.12,
        soot_emissive_power_kw_m2=20.0,
        luminous_emissive_power_kw_m2=130.0,
        is_flashing_volatile=False,
        flashing_fraction=0.00,
        source_citation="SFPE Handbook of Fire Protection Engineering (5th Ed); Babrauskas (1983)",
    ),
    "GASOLINE": MaterialPropertiesDTO(
        material_id="GASOLINE",
        name="Motor Gasoline / Petrol (Class IB)",
        liquid_density_kg_m3=740.0,
        vapor_density_kg_m3=3.40,
        heat_of_combustion_j_kg=4.37e7,  # 43.7 MJ/kg
        boiling_point_k=311.15,          # 38°C
        asymptotic_burning_flux_kg_m2_s=0.055,
        extinction_absorption_coefficient_m_inv=2.10,
        radiative_fraction=0.28,
        soot_extinction_coefficient_m_inv=0.08,
        soot_emissive_power_kw_m2=22.0,
        luminous_emissive_power_kw_m2=130.0,
        is_flashing_volatile=False,
        flashing_fraction=0.00,
        source_citation="SFPE Handbook; Babrauskas (1983); Burgess et al. (1961)",
    ),
    "KEROSENE": MaterialPropertiesDTO(
        material_id="KEROSENE",
        name="Kerosene / Jet-A1 (Class II)",
        liquid_density_kg_m3=800.0,
        vapor_density_kg_m3=4.20,
        heat_of_combustion_j_kg=4.32e7,  # 43.2 MJ/kg
        boiling_point_k=423.15,          # 150°C
        asymptotic_burning_flux_kg_m2_s=0.039,
        extinction_absorption_coefficient_m_inv=3.50,
        radiative_fraction=0.24,
        soot_extinction_coefficient_m_inv=0.10,
        soot_emissive_power_kw_m2=21.0,
        luminous_emissive_power_kw_m2=130.0,
        is_flashing_volatile=False,
        flashing_fraction=0.00,
        source_citation="SFPE Handbook; Lees' Loss Prevention in Process Industries (4th Ed)",
    ),
    "LPG": MaterialPropertiesDTO(
        material_id="LPG",
        name="Liquefied Petroleum Gas (Propane/Butane)",
        liquid_density_kg_m3=510.0,
        vapor_density_kg_m3=1.85,
        heat_of_combustion_j_kg=4.63e7,  # 46.3 MJ/kg
        boiling_point_k=231.15,          # -42°C
        asymptotic_burning_flux_kg_m2_s=0.099,
        extinction_absorption_coefficient_m_inv=1.40,
        radiative_fraction=0.32,
        soot_extinction_coefficient_m_inv=0.05,
        soot_emissive_power_kw_m2=25.0,
        luminous_emissive_power_kw_m2=140.0,
        is_flashing_volatile=True,
        flashing_fraction=0.35,
        source_citation="TNO Yellow Book CPR 16E; CCPS Guidelines for Chemical Process QRA",
    ),
    "LNG": MaterialPropertiesDTO(
        material_id="LNG",
        name="Liquefied Natural Gas (Methane)",
        liquid_density_kg_m3=450.0,
        vapor_density_kg_m3=0.72,
        heat_of_combustion_j_kg=5.00e7,  # 50.0 MJ/kg
        boiling_point_k=111.65,          # -161.5°C
        asymptotic_burning_flux_kg_m2_s=0.078,
        extinction_absorption_coefficient_m_inv=0.50,
        radiative_fraction=0.25,
        soot_extinction_coefficient_m_inv=0.00,
        soot_emissive_power_kw_m2=150.0,
        luminous_emissive_power_kw_m2=150.0,
        is_flashing_volatile=True,
        flashing_fraction=0.40,
        source_citation="TNO Yellow Book CPR 16E; Moorhouse (1982)",
    ),
    "CRUDE_OIL": MaterialPropertiesDTO(
        material_id="CRUDE_OIL",
        name="Crude Oil (Heavy Hydrocarbon Mixture)",
        liquid_density_kg_m3=850.0,
        vapor_density_kg_m3=3.00,
        heat_of_combustion_j_kg=4.26e7,  # 42.6 MJ/kg
        boiling_point_k=370.0,
        asymptotic_burning_flux_kg_m2_s=0.035,
        extinction_absorption_coefficient_m_inv=2.80,
        radiative_fraction=0.20,
        soot_extinction_coefficient_m_inv=0.08,
        soot_emissive_power_kw_m2=22.0,
        luminous_emissive_power_kw_m2=110.0,
        is_flashing_volatile=False,
        flashing_fraction=0.00,
        source_citation="SFPE Handbook; Babrauskas (1983)",
    ),
    "ETHANOL": MaterialPropertiesDTO(
        material_id="ETHANOL",
        name="Ethanol (Ethyl Alcohol / Polar Solvent)",
        liquid_density_kg_m3=794.0,
        vapor_density_kg_m3=1.59,
        heat_of_combustion_j_kg=2.68e7,  # 26.8 MJ/kg
        boiling_point_k=351.45,          # 78.3°C
        asymptotic_burning_flux_kg_m2_s=0.015,
        extinction_absorption_coefficient_m_inv=0.37,
        radiative_fraction=0.15,
        soot_extinction_coefficient_m_inv=0.02,
        soot_emissive_power_kw_m2=20.0,
        luminous_emissive_power_kw_m2=110.0,
        is_flashing_volatile=False,
        flashing_fraction=0.00,
        source_citation="SFPE Handbook; Babrauskas (1983)",
    ),
}

# Aliases mapping
_ALIASES: Dict[str, str] = {
    "PETROL": "GASOLINE",
    "MOTOR_GASOLINE": "GASOLINE",
    "PROPANE": "LPG",
    "BUTANE": "LPG",
    "METHANE": "LNG",
    "NATURAL_GAS": "LNG",
    "CRUDE": "CRUDE_OIL",
    "HEAVY_CRUDE": "CRUDE_OIL",
    "JET_A": "KEROSENE",
    "JET_A1": "KEROSENE",
    "DIESEL_FUEL": "DIESEL",
    "ETHYL_ALCOHOL": "ETHANOL",
}


class MaterialRegistry:
    """Static registry for querying verified material properties."""

    @classmethod
    def get(cls, material_id: str) -> MaterialPropertiesDTO:
        """
        Retrieve material properties by key or standardized alias.
        Raises UnknownMaterialException if material is unlisted.
        """
        if not material_id or not isinstance(material_id, str):
            raise UnknownMaterialException("Material identifier must be a non-empty string.")

        normalized_key = material_id.strip().upper().replace("-", "_").replace(" ", "_")

        # Resolve alias if present
        resolved_key = _ALIASES.get(normalized_key, normalized_key)

        material = _MATERIALS_CATALOG.get(resolved_key)
        if material is None:
            available = list(_MATERIALS_CATALOG.keys()) + list(_ALIASES.keys())
            raise UnknownMaterialException(
                f"Unknown material '{material_id}'. Supported materials: {available}"
            )
        return material

    @classmethod
    def list_available(cls) -> List[str]:
        """Return list of supported primary material keys."""
        return sorted(list(_MATERIALS_CATALOG.keys()))
