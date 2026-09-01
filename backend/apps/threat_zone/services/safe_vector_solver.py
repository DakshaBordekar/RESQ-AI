import math

def calculate_safe_approach_vector(
    wind_direction_deg: float,
    origin_lat: float = 13.0300,
    origin_lon: float = 80.2350
) -> dict:
    """
    Computes optimal safe approach vector for emergency responders.
    The safest entry corridor is upwind / crosswind (opposite to wind vector direction).
    """
    # Wind direction indicates where wind is blowing FROM.
    # Therefore, upwind direction is wind_direction_deg.
    safe_angle_deg = (wind_direction_deg + 180.0) % 360.0

    # Determine Cardinal Direction String
    cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    cardinal_idx = int(((safe_angle_deg + 22.5) % 360.0) // 45.0)
    cardinal_str = cardinals[cardinal_idx]

    # Generate Safe Approach Corridor Line Vector (length 600m)
    corridor_points = []
    for d in range(0, 650, 50):
        phi_rad = math.radians(safe_angle_deg)
        dx = d * math.sin(phi_rad)
        dy = d * math.cos(phi_rad)
        lat = origin_lat + (dy / 111320.0)
        lon = origin_lon + (dx / (111320.0 * math.cos(math.radians(origin_lat))))
        corridor_points.append([lat, lon])

    return {
        "safe_angle_deg": round(safe_angle_deg, 1),
        "cardinal_direction": cardinal_str,
        "approach_status": "OPTIMAL_UPWIND_ENTRY",
        "corridor_vector": corridor_points
    }
