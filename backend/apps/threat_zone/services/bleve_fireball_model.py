import math

def calculate_bleve_fireball(
    mass_kg: float,
    fuel_type: str = "LPG",
    origin_lat: float = 13.0300,
    origin_lon: float = 80.2350
) -> dict:
    """
    Implements Roberts Fireball Correlations for BLEVE events:
    - Fireball Radius r_f = 3.86 * M^0.325 (meters)
    - Fireball Duration t_f = 0.825 * M^0.26 (seconds)
    - Total Radiative Power Q_rad = (F_rad * M * Delta_Hc) / t_f (kW)
    """
    M = max(100.0, mass_kg)
    delta_hc = 46000.0 if fuel_type.upper() == "LPG" else 43000.0  # kJ/kg
    f_rad = 0.25  # Radiative fraction of BLEVE fireball

    # 1. Roberts Correlations
    r_f = 3.86 * (M ** 0.325)  # Fireball radius (m)
    t_f = 0.825 * (M ** 0.26)  # Fireball duration (s)
    h_c = 1.5 * r_f            # Fireball center height (m)

    total_energy_kj = f_rad * M * delta_hc
    q_rad_kw = total_energy_kj / max(0.1, t_f)  # Radiative heat rate (kW)

    # Calculate distance for thermal thresholds (12.5, 4.7, 1.6 kW/m^2)
    thresholds = {
        "red_lethal": 12.5,
        "orange_serious": 4.7,
        "yellow_evacuate": 1.6
    }

    band_results = {}
    for band_name, q_thresh in thresholds.items():
        # r = sqrt( Q_rad / (4 * pi * q_thresh) - H_c^2 )
        term = (q_rad_kw / (4.0 * math.pi * q_thresh)) - (h_c ** 2)
        r_ground = math.sqrt(max(10.0, term))

        # Build circular GPS polygon
        polygon_points = []
        for step in range(36):
            phi_deg = step * 10.0
            phi_rad = math.radians(phi_deg)
            dx = r_ground * math.sin(phi_rad)
            dy = r_ground * math.cos(phi_rad)
            lat = origin_lat + (dy / 111320.0)
            lon = origin_lon + (dx / (111320.0 * math.cos(math.radians(origin_lat))))
            polygon_points.append([lat, lon])
        polygon_points.append(polygon_points[0])

        band_results[band_name] = {
            "threshold_kw_m2": q_thresh,
            "max_radius_m": round(r_ground, 1),
            "polygon": polygon_points
        }

    return {
        "fireball_radius_m": round(r_f, 1),
        "fireball_duration_s": round(t_f, 1),
        "fireball_height_m": round(h_c, 1),
        "total_energy_gj": round((M * delta_hc) / 1e6, 1),
        "bands": band_results
    }
