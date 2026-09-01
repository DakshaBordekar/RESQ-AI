"""
RESQ-ENG-SPEC-2026-001 — Spatial Hazard-Field Model (Phase 7)
Vectorized 2D Cartesian grid generator and continuous hazard field integration.
"""

import math
from dataclasses import dataclass
from typing import Dict, Any, Tuple, Optional
import numpy as np

from ..core.constants import PI
from ..core.exceptions import DomainException
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO
from .thermal import (
    calculate_thomas_flame_length,
    calculate_flame_tilt_angle,
    calculate_surface_emissive_power,
    calculate_incident_thermal_flux,
)
from .blast import (
    calculate_tnt_equivalent_mass,
    calculate_scaled_distance,
    calculate_sadovsky_overpressure,
)


# Grid configuration limits
MIN_GRID_RESOLUTION_M: float = 5.0
MAX_GRID_RESOLUTION_M: float = 100.0
MIN_GRID_EXTENT_M: float = 200.0
MAX_GRID_EXTENT_M: float = 10000.0
MAX_GRID_NODES_CAP: int = 250000


@dataclass
class HazardGridDTO:
    """Continuous 2D spatial hazard field representation."""
    extent_m: float
    resolution_m: float
    x_coords: np.ndarray  # 1D array of x coordinates [m]
    y_coords: np.ndarray  # 1D array of y coordinates [m]
    thermal_flux_grid: np.ndarray  # 2D array [kW/m^2]
    blast_overpressure_grid_kpa: np.ndarray  # 2D array [kPa]
    severity_rank_grid: np.ndarray  # 2D array of integer ranks (0=None, 1=Green, 2=Yellow, 3=Orange, 4=Red)
    zone_areas_m2: Dict[str, float]
    max_thermal_flux_kw_m2: float
    max_overpressure_kpa: float

    @property
    def shape(self) -> Tuple[int, int]:
        return self.thermal_flux_grid.shape

    @property
    def total_nodes(self) -> int:
        return self.thermal_flux_grid.size


def generate_hazard_grid(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    extent_m: float = 2000.0,
    resolution_m: float = 25.0,
    receiver_height_m: float = 1.5,
) -> HazardGridDTO:
    """
    Generate fully vectorized 2D Cartesian spatial hazard field mesh:
    - Ingests scenario, source, and material parameters
    - Computes 2D meshgrid of distances and bearings
    - Evaluates vectorized thermal radiation and blast shock wave fields
    - Integrates lethal and hazardous zone surface areas
    """
    if not (MIN_GRID_RESOLUTION_M <= resolution_m <= MAX_GRID_RESOLUTION_M):
        raise DomainException(
            f"Grid resolution {resolution_m} m is outside valid bounds [{MIN_GRID_RESOLUTION_M}, {MAX_GRID_RESOLUTION_M}] m."
        )

    if not (MIN_GRID_EXTENT_M <= extent_m <= MAX_GRID_EXTENT_M):
        raise DomainException(
            f"Grid extent {extent_m} m is outside valid bounds [{MIN_GRID_EXTENT_M}, {MAX_GRID_EXTENT_M}] m."
        )

    # 1. Generate 1D and 2D coordinate arrays
    x_coords = np.arange(-extent_m, extent_m + resolution_m * 0.5, resolution_m, dtype=np.float64)
    y_coords = np.arange(-extent_m, extent_m + resolution_m * 0.5, resolution_m, dtype=np.float64)

    n_nodes = len(x_coords) * len(y_coords)
    if n_nodes > MAX_GRID_NODES_CAP:
        raise DomainException(
            f"Requested grid contains {n_nodes} nodes, exceeding maximum safety cap {MAX_GRID_NODES_CAP}."
        )

    X, Y = np.meshgrid(x_coords, y_coords)
    R_3d = np.sqrt(X ** 2 + Y ** 2 + receiver_height_m ** 2)

    # 2. Vectorized Thermal Radiation Field
    l_flame, u_star = calculate_thomas_flame_length(
        d_pool_m=source.effective_pool_diameter_m,
        mass_burning_flux_kg_m2_s=source.mass_burning_flux_kg_m2_s,
        wind_speed_ms=scenario.atmosphere.wind_speed_ms,
        vapor_density_kg_m3=material.vapor_density_kg_m3,
    )

    e_p = calculate_surface_emissive_power(
        d_pool_m=source.effective_pool_diameter_m,
        e_soot_kw_m2=material.soot_emissive_power_kw_m2,
        e_luminous_kw_m2=material.luminous_emissive_power_kw_m2,
        s_soot_extinction_m_inv=material.soot_extinction_coefficient_m_inv,
    )

    thermal_flux_grid = calculate_incident_thermal_flux(
        r_target_m=R_3d,
        d_pool_m=source.effective_pool_diameter_m,
        l_flame_m=l_flame,
        e_p_kw_m2=e_p,
        relative_humidity=scenario.atmosphere.relative_humidity,
        ambient_temp_k=scenario.atmosphere.ambient_temperature_k,
    )

    # 3. Vectorized Blast Overpressure Field
    w_tnt = calculate_tnt_equivalent_mass(
        participating_vapor_mass_kg=source.participating_vapor_mass_kg,
        heat_of_combustion_j_kg=material.heat_of_combustion_j_kg,
        explosion_yield_factor=scenario.release.explosion_yield_factor,
    )

    z_grid = calculate_scaled_distance(R_3d, w_tnt)
    _, blast_overpressure_grid_kpa, _ = calculate_sadovsky_overpressure(z_grid)

    # 4. Severity Classification Matrix (0=None, 1=Green, 2=Yellow, 3=Orange, 4=Red)
    thermal_rank = np.zeros_like(thermal_flux_grid, dtype=np.int32)
    thermal_rank = np.where(thermal_flux_grid >= 1.4, 1, thermal_rank)
    thermal_rank = np.where(thermal_flux_grid >= 4.7, 2, thermal_rank)
    thermal_rank = np.where(thermal_flux_grid >= 9.5, 3, thermal_rank)
    thermal_rank = np.where(thermal_flux_grid >= 37.5, 4, thermal_rank)

    blast_rank = np.zeros_like(blast_overpressure_grid_kpa, dtype=np.int32)
    blast_rank = np.where(blast_overpressure_grid_kpa >= 2.0, 1, blast_rank)
    blast_rank = np.where(blast_overpressure_grid_kpa >= 6.9, 2, blast_rank)
    blast_rank = np.where(blast_overpressure_grid_kpa >= 20.7, 3, blast_rank)
    blast_rank = np.where(blast_overpressure_grid_kpa >= 70.0, 4, blast_rank)

    combined_rank_grid = np.maximum(thermal_rank, blast_rank)

    # 5. Zone Surface Area Integration via Cell Aggregation
    cell_area_m2 = resolution_m ** 2
    n_red = np.count_nonzero(combined_rank_grid >= 4)
    n_orange = np.count_nonzero(combined_rank_grid >= 3)
    n_yellow = np.count_nonzero(combined_rank_grid >= 2)
    n_green = np.count_nonzero(combined_rank_grid >= 1)

    zone_areas = {
        "red_critical_m2": float(n_red * cell_area_m2),
        "orange_severe_m2": float(n_orange * cell_area_m2),
        "yellow_moderate_m2": float(n_yellow * cell_area_m2),
        "green_advisory_m2": float(n_green * cell_area_m2),
    }

    return HazardGridDTO(
        extent_m=float(extent_m),
        resolution_m=float(resolution_m),
        x_coords=x_coords,
        y_coords=y_coords,
        thermal_flux_grid=thermal_flux_grid,
        blast_overpressure_grid_kpa=blast_overpressure_grid_kpa,
        severity_rank_grid=combined_rank_grid,
        zone_areas_m2=zone_areas,
        max_thermal_flux_kw_m2=float(np.max(thermal_flux_grid)),
        max_overpressure_kpa=float(np.max(blast_overpressure_grid_kpa)),
    )
