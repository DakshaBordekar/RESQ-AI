import math

def calculate_pool_fire_zones(
    diameter_m: float,
    fuel_type: str,
    wind_speed_ms: float,
    wind_direction_deg: float,
    origin_lat: float = 13.0300,
    origin_lon: float = 80.2350
) -> dict:
    """
    Implements Thomas (1963) Flame Height & Welker-Sliepcevich Flame Tilt Models,
    and calculates exact displaced point-source wind-warped zone boundaries.
    """
    # Fuel properties (Default: Gasoline / Petroleum)
    m_dot_double_prime = 0.055  # kg / (m^2 * s)
    rho_a = 1.2  # kg/m^3 air density
    g = 9.81  # m/s^2
    delta_hc = 43000.0  # kJ/kg
    chi_r = 0.30  # radiative fraction

    D = max(1.0, diameter_m)
    area = math.pi * (D / 2.0) ** 2
    mass_burning_rate = m_dot_double_prime * area  # kg/s

    # Total Radiative Power Q_rad (kW)
    q_rad_total_kw = chi_r * mass_burning_rate * delta_hc

    # 1. Thomas (1963) Non-Dimensional Flame Height H
    h_over_d = 42.0 * ((m_dot_double_prime / (rho_a * math.sqrt(g * D))) ** 0.61)
    H = h_over_d * D  # Flame height (meters)

    # 2. Welker & Sliepcevich Flame Tilt in Wind
    u_star_denominator = ((g * m_dot_double_prime * D) / rho_a) ** (1.0 / 3.0)
    u_star = wind_speed_ms / max(0.01, u_star_denominator)
    cos_theta = 1.0 / (1.0 + 0.78 * (u_star ** 0.7))
    theta_tilt_rad = math.acos(min(1.0, max(0.0, cos_theta)))
    theta_tilt_deg = math.degrees(theta_tilt_rad)

    # 3. Displaced Flame Center (Delta) & Mid-Flame Height (H_c)
    delta_displacement = (H / 2.0) * math.sin(theta_tilt_rad)
    h_c = (H / 2.0) * math.cos(theta_tilt_rad)

    # Severity Band Thresholds (kW/m^2)
    thresholds = {
        "red_lethal": 12.5,      # > 12.5 kW/m^2 (1% fatality in 10s)
        "orange_serious": 4.7,   # 4.7 kW/m^2 (Severe burns)
        "yellow_evacuate": 1.6   # 1.6 kW/m^2 (Pain threshold)
    }

    wind_dir_rad = math.radians(wind_direction_deg)
    band_results = {}

    for band_name, q_thresh in thresholds.items():
        polygon_points = []
        max_r = 0.0

        # Sample 36 polar angles around the displaced flame center
        for step in range(36):
            phi_deg = step * 10.0
            phi_rad = math.radians(phi_deg)
            # Relative angle to downwind vector
            phi_rel = phi_rad - wind_dir_rad

            term_inside_sqrt = (q_rad_total_kw / (4.0 * math.pi * q_thresh)) - (delta_displacement ** 2) * (math.sin(phi_rel) ** 2) - (h_c ** 2)
            
            if term_inside_sqrt > 0:
                r_phi = delta_displacement * math.cos(phi_rel) + math.sqrt(term_inside_sqrt)
            else:
                r_phi = max(5.0, delta_displacement + 5.0)

            r_phi = max(D / 2.0 + 2.0, r_phi)
            max_r = max(max_r, r_phi)

            # Convert to GPS Coordinates
            dx = r_phi * math.sin(phi_rad)
            dy = r_phi * math.cos(phi_rad)
            lat = origin_lat + (dy / 111320.0)
            lon = origin_lon + (dx / (111320.0 * math.cos(math.radians(origin_lat))))
            polygon_points.append([lat, lon])

        # Close polygon
        polygon_points.append(polygon_points[0])

        band_results[band_name] = {
            "threshold_kw_m2": q_thresh,
            "max_radius_m": round(max_r, 1),
            "polygon": polygon_points
        }

    return {
        "flame_height_m": round(H, 1),
        "flame_tilt_deg": round(theta_tilt_deg, 1),
        "downwind_displacement_m": round(delta_displacement, 1),
        "total_radiative_power_mw": round(q_rad_total_kw / 1000.0, 1),
        "bands": band_results
    }
