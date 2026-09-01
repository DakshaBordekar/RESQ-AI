"""
Phase 2: Material-property model with controlled registry and Burgess-Hertzberg-Zabetakis burning flux.
"""

from .dtos import MaterialPropertiesDTO
from .burning_flux import calculate_mass_burning_flux
from .registry import MaterialRegistry

__all__ = [
    "MaterialPropertiesDTO",
    "calculate_mass_burning_flux",
    "MaterialRegistry",
]
