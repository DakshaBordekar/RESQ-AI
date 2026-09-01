"""
RESQ-ENG-SPEC-2026-001 — Source Terms Data Transfer Object
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any


@dataclass(frozen=True)
class SourceTermsDTO:
    """Calculated physical source release terms."""
    effective_pool_diameter_m: float
    pool_area_m2: float
    mass_burning_flux_kg_m2_s: float
    mass_burning_rate_kg_s: float
    burning_duration_s: float
    stored_mass_kg: float
    stored_chemical_energy_j: float
    total_heat_release_rate_w: float
    radiative_heat_release_rate_w: float
    participating_vapor_mass_kg: float
    is_bunded: bool

    def to_dict(self) -> Dict[str, Any]:
        """Serialize source terms to dict."""
        return asdict(self)
