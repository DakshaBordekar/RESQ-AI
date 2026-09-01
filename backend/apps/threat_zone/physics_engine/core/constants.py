"""
RESQ-ENG-SPEC-2026-001 — Physical and Mathematical Constants
"""

import math
from typing import Dict

# Earth geodesic geometry (WGS84 volumetric mean sphere)
EARTH_RADIUS_M: float = 6371000.0

# Standard gravitational acceleration [m/s^2]
GRAVITY_M_S2: float = 9.80665

# Standard atmospheric pressure [Pa]
ATMOSPHERIC_PRESSURE_PA: float = 101325.0
ATMOSPHERIC_PRESSURE_BAR: float = 1.01325
ATMOSPHERIC_PRESSURE_KPA: float = 101.325

# Standard dry air density at 20°C (293.15 K) and 1 atm [kg/m^3]
AIR_DENSITY_KG_M3: float = 1.21

# Standard reference heat of detonation for TNT [J/kg]
TNT_ENERGY_J_KG: float = 4.686e6

# Minimum standoff distance to avoid numerical singularities [m]
MIN_STANDOFF_DISTANCE_M: float = 1e-3

# Maximum calculation distance for root finding and spatial bounding [m]
MAX_CALCULATION_DISTANCE_M: float = 10000.0

# Atmospheric transmissivity bounding limits
MIN_TRANSMISSIVITY: float = 0.40
MAX_TRANSMISSIVITY: float = 1.00

# Minimum optical path distance for transmissivity calculation [m]
MIN_TRANSMISSIVITY_PATH_M: float = 10.0

# Maximum physical flame tilt angle [rad] (75 degrees)
MAX_FLAME_TILT_RAD: float = 75.0 * math.pi / 180.0

# Standard consequence severity thresholds (API 521, CCPS, FEMA 426)
THERMAL_THRESHOLDS_KW_M2: Dict[str, float] = {
    "RED": 37.5,
    "ORANGE": 9.5,
    "YELLOW": 4.7,
    "GREEN": 1.4,
}

BLAST_THRESHOLDS_KPA: Dict[str, float] = {
    "RED": 70.0,
    "ORANGE": 20.7,
    "YELLOW": 6.9,
    "GREEN": 2.0,
}

# Mathematical constant Pi
PI: float = math.pi

# Model metadata
MODEL_VERSION: str = "2.0.0"
SPECIFICATION_ID: str = "RESQ-ENG-SPEC-2026-001"
SYSTEM_CLASSIFICATION: str = "Screening-Level Consequence Analysis & Decision-Support System"
