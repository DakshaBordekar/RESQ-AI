"""
RESQ-ENG-SPEC-2026-001 — Material Properties Data Transfer Object
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any


@dataclass(frozen=True)
class MaterialPropertiesDTO:
    """Immutable thermodynamic and combustion property set for industrial fuel."""
    material_id: str
    name: str
    liquid_density_kg_m3: float
    vapor_density_kg_m3: float
    heat_of_combustion_j_kg: float
    boiling_point_k: float
    asymptotic_burning_flux_kg_m2_s: float
    extinction_absorption_coefficient_m_inv: float
    radiative_fraction: float
    soot_extinction_coefficient_m_inv: float
    soot_emissive_power_kw_m2: float
    luminous_emissive_power_kw_m2: float
    is_flashing_volatile: bool
    flashing_fraction: float
    source_citation: str

    def to_dict(self) -> Dict[str, Any]:
        """Serialize properties to dict."""
        return asdict(self)
