"""
RESQ-ENG-SPEC-2026-001 — Thermal Radiation Model (EQ-THERM-01 to EQ-THERM-06)
Solid Flame Cylinder Model (Thomas 1963, Mudan 1984, Wayne 1991)
"""

import math
from dataclasses import dataclass, asdict
from typing import Tuple, Union, Dict, Any
import numpy as np

from ..core.constants import (
    AIR_DENSITY_KG_M3,
    GRAVITY_M_S2,
    MIN_TRANSMISSIVITY,
    MAX_TRANSMISSIVITY,
    MIN_TRANSMISSIVITY_PATH_M,
    MAX_FLAME_TILT_RAD,
    PI,
)
from ..core.exceptions import (
    DomainException,
    InvalidSourceParameterException,
    EnergyConservationException,
)
from ..scenario.dtos import ScenarioInputDTO
from ..materials.dtos import MaterialPropertiesDTO
from ..source.dtos import SourceTermsDTO


@dataclass(frozen=True)
class ThermalRadiationResultDTO:
    """Detailed thermal radiation calculation result at a specific receiver standoff."""
    standoff_distance_m: float
    flame_length_m: float
    flame_tilt_deg: float
    surface_emissive_power_kw_m2: float
    view_factor: float
    atmospheric_transmissivity: float
    incident_flux_kw_m2: float

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def calculate_thomas_flame_length(
    d_pool_m: float,
    mass_burning_flux_kg_m2_s: float,
    wind_speed_ms: float,
    vapor_density_kg_m3: float,
    air_density_kg_m3: float = AIR_DENSITY_KG_M3,
    gravity_m_s2: float = GRAVITY_M_S2,
) -> Tuple[float, float]:
    """
    EQ-THERM-01: Thomas (1963) Dimensionless Flame Length.

    Formula:
        u* = u_w / ((g * m_dot'' * D) / rho_v)^(1/3)
        u*_clamped = max(1.0, u*)
        L_flame = 55 * D * (m_dot'' / (rho_a * sqrt(g * D)))^0.67 * (u*_clamped)^(-0.21)

    Outputs:
        (flame_length_m, u_star_raw)
    """
    if d_pool_m <= 0.0 or mass_burning_flux_kg_m2_s <= 0.0:
        raise InvalidSourceParameterException(
            f"Invalid source parameters: D={d_pool_m}, flux={mass_burning_flux_kg_m2_s}"
        )
    if wind_speed_ms < 0.0:
        raise DomainException(f"Wind speed cannot be negative, got {wind_speed_ms} m/s.")

    u_plume = ((gravity_m_s2 * mass_burning_flux_kg_m2_s * d_pool_m) / max(0.1, vapor_density_kg_m3)) ** (1.0 / 3.0)
    u_star_raw = wind_speed_ms / max(1e-4, u_plume)
    u_star = max(1.0, u_star_raw)

    buoyant_ratio = mass_burning_flux_kg_m2_s / (air_density_kg_m3 * math.sqrt(gravity_m_s2 * d_pool_m))
    l_flame = 55.0 * d_pool_m * (buoyant_ratio ** 0.67) * (u_star ** (-0.21))

    # Physical safety bounds: at least 0.5 * D and at most 10 * D
    l_flame = max(d_pool_m * 0.5, min(d_pool_m * 10.0, l_flame))

    return float(l_flame), float(u_star_raw)


def calculate_flame_tilt_angle(u_star_raw: float) -> Tuple[float, float]:
    """
    EQ-THERM-02: Aerodynamic Flame Tilt Angle (Mudan 1984 / AGA).

    Formula:
        cos(theta_tilt) = 1.0 if u* < 1.0 else 1.0 / sqrt(u*)
        theta_tilt = arccos(cos(theta_tilt))

    Outputs:
        (tilt_rad, tilt_deg)
    """
    if u_star_raw < 1.0:
        theta_rad = 0.0
    else:
        cos_theta = 1.0 / math.sqrt(u_star_raw)
        cos_theta = max(-1.0, min(1.0, cos_theta))
        theta_rad = math.acos(cos_theta)

    # Hard physical cap at 75 degrees (1.309 rad)
    theta_rad = min(MAX_FLAME_TILT_RAD, theta_rad)
    theta_deg = math.degrees(theta_rad)

    return float(theta_rad), float(theta_deg)


def calculate_surface_emissive_power(
    d_pool_m: float,
    e_soot_kw_m2: float,
    e_luminous_kw_m2: float,
    s_soot_extinction_m_inv: float,
) -> float:
    """
    EQ-THERM-03: Mudan Soot-Obscured Surface Emissive Power.

    Formula:
        E_p = E_soot * (1 - exp(-s * D)) + E_luminous * exp(-s * D)

    Outputs:
        E_p in kW/m^2
    """
    if d_pool_m <= 0.0:
        raise DomainException(f"Pool diameter must be positive, got {d_pool_m} m.")
    if e_soot_kw_m2 > e_luminous_kw_m2:
        raise DomainException(
            f"Soot emissive power ({e_soot_kw_m2}) cannot exceed luminous flame power ({e_luminous_kw_m2})."
        )

    exponent = s_soot_extinction_m_inv * d_pool_m
    trans_smoke = math.exp(-min(50.0, exponent))
    e_p = e_soot_kw_m2 * (1.0 - trans_smoke) + e_luminous_kw_m2 * trans_smoke

    return float(e_p)


def calculate_mudan_view_factor(
    r_target_m: Union[float, np.ndarray],
    d_pool_m: float,
    l_flame_m: float,
    use_max_view_factor: bool = True,
) -> Union[float, np.ndarray]:
    """
    EQ-THERM-04: Mudan (1984) Solid Cylinder View Factor.
    Computes configuration factor from vertical cylinder to target node.
    If use_max_view_factor is True, computes F_max = sqrt(F_V^2 + F_H^2) for maximum credible exposure.

    Inputs:
        r_target_m: Stand-off distance from pool center to receiver [m]
        d_pool_m: Pool diameter [m]
        l_flame_m: Flame cylinder length [m]

    Outputs:
        F_view: Dimensionless view factor in [0.0, 1.0]
    """
    if d_pool_m <= 0.0 or l_flame_m <= 0.0:
        raise DomainException("Pool diameter and flame length must be positive.")

    h = (2.0 * l_flame_m) / d_pool_m

    if isinstance(r_target_m, (int, float)):
        r = float(r_target_m)
        s = (2.0 * r) / d_pool_m

        if s <= 1.0001:
            return 0.5  # Pool boundary

        a = (s ** 2 + h ** 2 + 1.0) / (2.0 * s)

        # F_V (Vertical view factor)
        term1 = (1.0 / s) * math.atan(h / math.sqrt(max(1e-12, s ** 2 - 1.0)))
        term2 = (h / s) * math.atan(math.sqrt((s - 1.0) / (s + 1.0)))
        arg_v = math.sqrt(max(0.0, ((a + 1.0) * (s - 1.0)) / ((a - 1.0) * (s + 1.0))))
        coef_v = (a * h - s) / (s * math.sqrt(max(1e-12, a ** 2 - 1.0)))
        f_v = (1.0 / PI) * (term1 - term2 + coef_v * math.atan(arg_v))
        f_v = max(0.0, min(1.0, f_v))

        if not use_max_view_factor:
            return float(f_v)

        # F_H (Horizontal view factor)
        t_h1 = math.atan(math.sqrt((s + 1.0) / (s - 1.0)))
        coef_h = (a - 1.0 / s) / math.sqrt(max(1e-12, a ** 2 - 1.0))
        t_h2 = coef_h * math.atan(arg_v)
        f_h = (1.0 / PI) * (t_h1 - t_h2)
        f_h = max(0.0, min(1.0, f_h))

        f_max = math.sqrt(f_v ** 2 + f_h ** 2)
        return float(min(1.0, f_max))
    else:
        r_arr = np.asarray(r_target_m, dtype=np.float64)
        s_arr = (2.0 * r_arr) / d_pool_m
        s_safe = np.maximum(1.0001, s_arr)

        a_arr = (s_safe ** 2 + h ** 2 + 1.0) / (2.0 * s_safe)

        term1 = (1.0 / s_safe) * np.arctan(h / np.sqrt(np.maximum(1e-12, s_safe ** 2 - 1.0)))
        term2 = (h / s_safe) * np.arctan(np.sqrt((s_safe - 1.0) / (s_safe + 1.0)))
        arg_v = np.sqrt(np.maximum(0.0, ((a_arr + 1.0) * (s_safe - 1.0)) / ((a_arr - 1.0) * (s_safe + 1.0))))
        coef_v = (a_arr * h - s_safe) / (s_safe * np.sqrt(np.maximum(1e-12, a_arr ** 2 - 1.0)))

        f_v_arr = (1.0 / PI) * (term1 - term2 + coef_v * np.arctan(arg_v))
        f_v_arr = np.clip(f_v_arr, 0.0, 1.0)

        if not use_max_view_factor:
            return np.where(s_arr <= 1.0001, 0.5, f_v_arr)

        t_h1 = np.arctan(np.sqrt((s_safe + 1.0) / (s_safe - 1.0)))
        coef_h = (a_arr - 1.0 / s_safe) / np.sqrt(np.maximum(1e-12, a_arr ** 2 - 1.0))
        t_h2 = coef_h * np.arctan(arg_v)
        f_h_arr = (1.0 / PI) * (t_h1 - t_h2)
        f_h_arr = np.clip(f_h_arr, 0.0, 1.0)

        f_max_arr = np.sqrt(f_v_arr ** 2 + f_h_arr ** 2)
        f_max_arr = np.clip(f_max_arr, 0.0, 1.0)
        return np.where(s_arr <= 1.0001, 0.5, f_max_arr)


def calculate_wayne_transmissivity(
    r_path_m: Union[float, np.ndarray],
    relative_humidity: float,
    ambient_temp_k: float,
) -> Union[float, np.ndarray]:
    """
    EQ-THERM-05: Wayne (1991) Atmospheric Infrared Transmissivity.

    Formula:
        P_w = RH * 610.78 * exp((17.27 * (T - 273.15)) / (T - 35.85)) [Pa]
        P_w_kpa = P_w / 1000.0 [kPa]
        tau = 1.006 - 0.0301*ln(R) - 0.0522*ln(P_w_kpa) - 0.0017*(ln(R))^2 - 0.0044*(ln(P_w_kpa))^2

    Outputs:
        tau: Dimensionless atmospheric transmissivity bounded in [0.40, 1.00]
    """
    if not (0.0 < relative_humidity <= 1.0):
        raise DomainException(f"Relative humidity must be in (0, 1], got {relative_humidity}")
    if ambient_temp_k <= 200.0:
        raise DomainException(f"Ambient temperature too low, got {ambient_temp_k} K")

    # Buck formula for water vapor partial pressure P_w [Pa]
    t_c = ambient_temp_k - 273.15
    p_w_pa = relative_humidity * 610.78 * math.exp((17.27 * t_c) / (ambient_temp_k - 35.85))
    p_w_kpa = max(0.01, p_w_pa / 1000.0)
    ln_pw = math.log(p_w_kpa)

    if isinstance(r_path_m, (int, float)):
        r_safe = max(MIN_TRANSMISSIVITY_PATH_M, float(r_path_m))
        ln_r = math.log(r_safe)

        tau = (
            1.006
            - 0.0301 * ln_r
            - 0.0522 * ln_pw
            - 0.0017 * (ln_r ** 2)
            - 0.0044 * (ln_pw ** 2)
        )
        return float(max(MIN_TRANSMISSIVITY, min(MAX_TRANSMISSIVITY, tau)))
    else:
        r_arr = np.asarray(r_path_m, dtype=np.float64)
        r_safe = np.maximum(MIN_TRANSMISSIVITY_PATH_M, r_arr)
        ln_r = np.log(r_safe)

        tau_arr = (
            1.006
            - 0.0301 * ln_r
            - 0.0522 * ln_pw
            - 0.0017 * (ln_r ** 2)
            - 0.0044 * (ln_pw ** 2)
        )
        return np.clip(tau_arr, MIN_TRANSMISSIVITY, MAX_TRANSMISSIVITY)


def calculate_incident_thermal_flux(
    r_target_m: Union[float, np.ndarray],
    d_pool_m: float,
    l_flame_m: float,
    e_p_kw_m2: float,
    relative_humidity: float,
    ambient_temp_k: float,
) -> Union[float, np.ndarray]:
    """
    EQ-THERM-06: Incident Thermal Radiation Flux.
    q'' = E_p * F_view * tau_atm [kW/m^2]
    """
    f_view = calculate_mudan_view_factor(r_target_m, d_pool_m, l_flame_m)
    tau = calculate_wayne_transmissivity(r_target_m, relative_humidity, ambient_temp_k)

    flux = e_p_kw_m2 * f_view * tau

    if isinstance(flux, (int, float)):
        if flux > e_p_kw_m2 + 1e-5:
            raise EnergyConservationException(
                f"Incident flux ({flux} kW/m^2) exceeds source emissive power ({e_p_kw_m2} kW/m^2)."
            )
        if flux < 1e-3:
            return 0.0
        return float(flux)
    else:
        if np.any(flux > e_p_kw_m2 + 1e-5):
            raise EnergyConservationException("Incident flux exceeds source emissive power.")
        return np.where(flux < 1e-3, 0.0, flux)


def evaluate_thermal_radiation(
    scenario: ScenarioInputDTO,
    source: SourceTermsDTO,
    material: MaterialPropertiesDTO,
    r_target_m: float,
) -> ThermalRadiationResultDTO:
    """
    Evaluate comprehensive thermal radiation result at stand-off distance r_target_m.
    """
    l_flame, u_star = calculate_thomas_flame_length(
        d_pool_m=source.effective_pool_diameter_m,
        mass_burning_flux_kg_m2_s=source.mass_burning_flux_kg_m2_s,
        wind_speed_ms=scenario.atmosphere.wind_speed_ms,
        vapor_density_kg_m3=material.vapor_density_kg_m3,
    )

    tilt_rad, tilt_deg = calculate_flame_tilt_angle(u_star)

    e_p = calculate_surface_emissive_power(
        d_pool_m=source.effective_pool_diameter_m,
        e_soot_kw_m2=material.soot_emissive_power_kw_m2,
        e_luminous_kw_m2=material.luminous_emissive_power_kw_m2,
        s_soot_extinction_m_inv=material.soot_extinction_coefficient_m_inv,
    )

    f_view = calculate_mudan_view_factor(
        r_target_m=r_target_m,
        d_pool_m=source.effective_pool_diameter_m,
        l_flame_m=l_flame,
    )

    tau = calculate_wayne_transmissivity(
        r_path_m=r_target_m,
        relative_humidity=scenario.atmosphere.relative_humidity,
        ambient_temp_k=scenario.atmosphere.ambient_temperature_k,
    )

    flux = calculate_incident_thermal_flux(
        r_target_m=r_target_m,
        d_pool_m=source.effective_pool_diameter_m,
        l_flame_m=l_flame,
        e_p_kw_m2=e_p,
        relative_humidity=scenario.atmosphere.relative_humidity,
        ambient_temp_k=scenario.atmosphere.ambient_temperature_k,
    )

    return ThermalRadiationResultDTO(
        standoff_distance_m=float(r_target_m),
        flame_length_m=float(l_flame),
        flame_tilt_deg=float(tilt_deg),
        surface_emissive_power_kw_m2=float(e_p),
        view_factor=float(f_view),
        atmospheric_transmissivity=float(tau),
        incident_flux_kw_m2=float(flux),
    )
