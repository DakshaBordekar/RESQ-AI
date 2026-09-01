import math

def calculate_blast_overpressure(
    mass_kg: float,
    fuel_type: str = "LPG",
    yield_factor: float = 0.04,
    origin_lat: float = 13.0300,
    origin_lon: float = 80.2350
) -> dict:
    """
    Implements Brode (1955) Blast Overpressure Model & Hopkinson-Cranz Scaling:
    - W_TNT = (yield_factor * M * Delta_Hc) / 4184 [kg TNT]
    - Scaled distance Z = R / W_TNT^(1/3)
    - Peak overpressure P_s = (6.7 / Z^3) + (1 / Z) [bar]
    """
    M = max(100.0, mass_kg)
    delta_hc = 46000.0 if fuel_type.upper() == "LPG" else 43000.0  # kJ/kg
    e_tnt = 4184.0  # kJ/kg

    # 1. TNT Equivalent Mass (kg)
    w_tnt = (yield_factor * M * delta_hc) / e_tnt
    w_tnt_third = w_tnt ** (1.0 / 3.0)

    # Blast Thresholds in kPa (Red > 83 kPa, Orange 17 - 83 kPa, Yellow 3.5 - 17 kPa)
    thresholds_kpa = {
        "red_lethal": 83.0,     # > 83 kPa (Structural collapse, fatality)
        "orange_serious": 17.0, # 17 kPa (Eardrum rupture)
        "yellow_evacuate": 3.5  # 3.5 kPa (Glass breakage)
    }

    band_results = {}
    for band_name, target_kpa in thresholds_kpa.items():
        target_bar = target_kpa / 100.0  # convert kPa to bar

        # Binary search for radius R where P_s(R) == target_bar
        low_r = 1.0
        high_r = 2500.0
        r_found = 50.0

        for _ in range(30):
            mid_r = (low_r + high_r) / 2.0
            z = mid_r / w_tnt_third
            p_s_bar = (6.7 / (z ** 3)) + (1.0 / z)

            if p_s_bar > target_bar:
                low_r = mid_r
            else:
                high_r = mid_r
            r_found = mid_r

        # Generate GPS polygon
        polygon_points = []
        for step in range(36):
            phi_deg = step * 10.0
            phi_rad = math.radians(phi_deg)
            dx = r_found * math.sin(phi_rad)
            dy = r_found * math.cos(phi_rad)
            lat = origin_lat + (dy / 111320.0)
            lon = origin_lon + (dx / (111320.0 * math.cos(math.radians(origin_lat))))
            polygon_points.append([lat, lon])
        polygon_points.append(polygon_points[0])

        band_results[band_name] = {
            "threshold_kpa": target_kpa,
            "max_radius_m": round(r_found, 1),
            "polygon": polygon_points
        }

    return {
        "w_tnt_equivalent_kg": round(w_tnt, 1),
        "yield_factor": yield_factor,
        "bands": band_results
    }
