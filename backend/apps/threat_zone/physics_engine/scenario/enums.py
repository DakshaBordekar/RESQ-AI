"""
RESQ-ENG-SPEC-2026-001 — Scenario Enumerations
"""

from enum import Enum


class TankGeometryType(str, Enum):
    """Storage tank geometric classification."""
    VERTICAL_CYLINDER = "VERTICAL_CYLINDER"
    SPHERE = "SPHERE"
    HORIZONTAL_CYLINDER = "HORIZONTAL_CYLINDER"


class ReleaseType(str, Enum):
    """Release scenario mechanism."""
    CATASTROPHIC_RUPTURE = "CATASTROPHIC_RUPTURE"
    PUNCTURE_SPILL = "PUNCTURE_SPILL"
    OVERFILL = "OVERFILL"


class FuelType(str, Enum):
    """Benchmark fuels."""
    GASOLINE = "GASOLINE"
    DIESEL = "DIESEL"
    LPG = "LPG"
    LNG = "LNG"
    CRUDE_OIL = "CRUDE_OIL"


# Aliases
TankGeometry = TankGeometryType
