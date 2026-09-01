"""
RESQ-ENG-SPEC-2026-001 — Asymptotic Pool Mass Burning Flux (EQ-MAT-01)
Burgess-Hertzberg-Zabetakis (1961) / Babrauskas (1983)
"""

import math
from typing import Union
import numpy as np
from ..core.exceptions import DomainException


def calculate_mass_burning_flux(
    diameter_m: Union[float, np.ndarray],
    m_dot_inf: float,
    k_beta: float,
) -> Union[float, np.ndarray]:
    """
    EQ-MAT-01: Calculate actual mass burning flux as a function of pool diameter.

    Formula:
        m_dot'' = m_dot_inf * (1 - exp(-k_beta * D))

    Inputs:
        diameter_m: Effective pool diameter [m] (must be > 0)
        m_dot_inf: Asymptotic mass burning flux [kg/(m^2*s)]
        k_beta: Extinction-absorption parameter [1/m]

    Outputs:
        m_dot'': Actual mass burning flux [kg/(m^2*s)]
    """
    if m_dot_inf <= 0.0 or k_beta <= 0.0:
        raise DomainException(f"Invalid burning parameters: m_dot_inf={m_dot_inf}, k_beta={k_beta}")

    if isinstance(diameter_m, (int, float)):
        d = float(diameter_m)
        if d <= 0.0:
            raise DomainException(f"Pool diameter must be strictly positive, got {d} m.")

        exponent = k_beta * d
        if exponent >= 20.0:
            return float(m_dot_inf)

        flux = m_dot_inf * (1.0 - math.exp(-exponent))
        return float(flux)
    else:
        d_arr = np.asarray(diameter_m, dtype=np.float64)
        if np.any(d_arr <= 0.0):
            raise DomainException("Pool diameter array contains values <= 0.")

        exponent = k_beta * d_arr
        flux_arr = np.where(
            exponent >= 20.0,
            m_dot_inf,
            m_dot_inf * (1.0 - np.exp(-exponent))
        )
        return flux_arr
