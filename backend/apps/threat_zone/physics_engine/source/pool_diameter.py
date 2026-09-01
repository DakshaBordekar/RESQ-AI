"""
RESQ-ENG-SPEC-2026-001 — Effective Pool Burning Diameter (EQ-SRC-01)
NFPA 30 / EPA ALOHA Technical Standards
"""

import math
from typing import Optional
from ..core.constants import PI
from ..core.exceptions import DomainException, InconsistentGeometryException

# Equilibrium minimum unconfined slick thickness on non-porous soil/concrete [m]
MIN_SLICK_THICKNESS_H_MIN_M: float = 0.005  # 5 mm

# Maximum physical screening pool diameter cap [m]
MAX_SCREENING_POOL_DIAMETER_M: float = 100.0


def calculate_pool_diameter(
    liquid_volume_m3: float,
    tank_diameter_m: float,
    bund_present: bool = False,
    bund_diameter_m: Optional[float] = None,
    h_min_m: float = MIN_SLICK_THICKNESS_H_MIN_M,
    d_max_m: float = MAX_SCREENING_POOL_DIAMETER_M,
) -> float:
    """
    EQ-SRC-01: Calculate effective surface burning pool diameter.

    If bund_present is True:
        D_pool = D_bund
    If bund_present is False:
        D_unconfined = sqrt((4 * V_liquid) / (pi * h_min))
        D_pool = min(d_max, max(D_tank, D_unconfined))

    Inputs:
        liquid_volume_m3: Stored liquid volume [m^3] (> 0)
        tank_diameter_m: Diameter of the storage vessel [m]
        bund_present: Whether secondary containment dike is present
        bund_diameter_m: Diameter of the dike wall [m]
        h_min_m: Minimum slick thickness [m] (default 0.005m)
        d_max_m: Maximum screening diameter cap [m] (default 100.0m)

    Outputs:
        D_pool: Effective burning pool diameter [m]
    """
    if liquid_volume_m3 <= 0.0:
        raise DomainException(f"Liquid volume must be positive, got {liquid_volume_m3} m^3.")

    if tank_diameter_m <= 0.0:
        raise DomainException(f"Tank diameter must be positive, got {tank_diameter_m} m.")

    if bund_present:
        if bund_diameter_m is None:
            raise InconsistentGeometryException("Bund is marked present but bund diameter is None.")
        if bund_diameter_m < tank_diameter_m:
            raise InconsistentGeometryException(
                f"Bund diameter ({bund_diameter_m} m) cannot be smaller than tank diameter ({tank_diameter_m} m)."
            )
        return float(bund_diameter_m)
    else:
        unconfined_d = math.sqrt((4.0 * liquid_volume_m3) / (PI * h_min_m))
        effective_d = max(tank_diameter_m, unconfined_d)
        clamped_d = min(d_max_m, effective_d)
        return float(clamped_d)
