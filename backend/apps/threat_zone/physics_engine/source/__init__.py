"""
Phase 3: Source characterization model with secondary containment and energy partitioning.
"""

from .dtos import SourceTermsDTO
from .pool_diameter import calculate_pool_diameter
from .energy import calculate_energy_and_burning_rates
from .characterization import characterize_source

__all__ = [
    "SourceTermsDTO",
    "calculate_pool_diameter",
    "calculate_energy_and_burning_rates",
    "characterize_source",
]
