from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .services.pool_fire_model import calculate_pool_fire_zones
from .services.bleve_fireball_model import calculate_bleve_fireball
from .services.blast_model import calculate_blast_overpressure
from .services.safe_vector_solver import calculate_safe_approach_vector

class CalculateThreatZoneView(APIView):
    """
    POST /api/threat-zone/calculate/
    Calculates analytical thermal radiation and blast overpressure hazard bands.
    """
    def post(self, request):
        data = request.data or {}
        facility_type = data.get("facility_type", "FACILITY_A_LPG")
        lat = float(data.get("latitude", 13.0300))
        lon = float(data.get("longitude", 80.2350))
        mass_kg = float(data.get("mass_kg", 40000.0))
        pool_d = float(data.get("pool_diameter_m", 30.0))
        fuel_type = data.get("fuel_type", "LPG")
        wind_speed = float(data.get("wind_speed_ms", 8.5))
        wind_dir = float(data.get("wind_direction_deg", 135.0))

        if facility_type == "FACILITY_A_LPG":
            # Facility A: Pressurized LPG Sphere (BLEVE Fireball + Blast Overpressure)
            bleve_res = calculate_bleve_fireball(mass_kg=mass_kg, fuel_type="LPG", origin_lat=lat, origin_lon=lon)
            blast_res = calculate_blast_overpressure(mass_kg=mass_kg, fuel_type="LPG", yield_factor=0.04, origin_lat=lat, origin_lon=lon)
            safe_vec = calculate_safe_approach_vector(wind_direction_deg=wind_dir, origin_lat=lat, origin_lon=lon)

            return Response({
                "facility_name": "Facility A — LPG Spherical Tank (BLEVE)",
                "facility_type": "FACILITY_A_LPG",
                "physics_metrics": {
                  "fireball_radius_m": bleve_res["fireball_radius_m"],
                  "fireball_duration_s": bleve_res["fireball_duration_s"],
                  "total_energy_gj": bleve_res["total_energy_gj"],
                  "w_tnt_equivalent_kg": blast_res["w_tnt_equivalent_kg"],
                  "primary_hazard": "Thermal Fireball + Blast Overpressure (BLEVE)"
                },
                "threat_bands": bleve_res["bands"],
                "blast_bands": blast_res["bands"],
                "safe_approach_vector": safe_vec
            }, status=status.HTTP_200_OK)

        else:
            # Facility B: Petroleum Pool Fire (Thomas 1963 & Welker-Sliepcevich)
            pool_res = calculate_pool_fire_zones(
                diameter_m=pool_d,
                fuel_type="Gasoline",
                wind_speed_ms=wind_speed,
                wind_direction_deg=wind_dir,
                origin_lat=lat,
                origin_lon=lon
            )
            safe_vec = calculate_safe_approach_vector(wind_direction_deg=wind_dir, origin_lat=lat, origin_lon=lon)

            return Response({
                "facility_name": "Facility B — Petroleum Pool Fire",
                "facility_type": "FACILITY_B_POOL_FIRE",
                "physics_metrics": {
                  "flame_height_m": pool_res["flame_height_m"],
                  "flame_tilt_deg": pool_res["flame_tilt_deg"],
                  "downwind_displacement_m": pool_res["downwind_displacement_m"],
                  "total_radiative_power_mw": pool_res["total_radiative_power_mw"],
                  "primary_hazard": "Sustained Thermal Radiation (Wind-Warped)"
                },
                "threat_bands": pool_res["bands"],
                "safe_approach_vector": safe_vec
            }, status=status.HTTP_200_OK)


class CompareScenariosView(APIView):
    """
    GET /api/threat-zone/scenarios/
    Returns comparative data for Facility A vs Facility B.
    """
    def get(self, request):
        fac_a = calculate_bleve_fireball(mass_kg=40000.0, fuel_type="LPG")
        fac_b = calculate_pool_fire_zones(diameter_m=30.0, fuel_type="Gasoline", wind_speed_ms=8.5, wind_direction_deg=135.0)

        return Response({
            "facility_a": {
                "name": "Facility A — LPG Spherical Tank (BLEVE)",
                "mass_kg": 40000,
                "primary_hazard": "Instantaneous Fireball + Blast Overpressure",
                "lethal_zone_m": fac_a["bands"]["red_lethal"]["max_radius_m"],
                "explanation": "LPG BLEVE releases ~1,800 GJ instantaneously in ~16s producing a 121m fireball and secondary blast shockwave."
            },
            "facility_b": {
                "name": "Facility B — Petroleum Pool Fire",
                "diameter_m": 30.0,
                "primary_hazard": "Sustained Wind-Warped Thermal Radiation",
                "lethal_zone_m": fac_b["bands"]["red_lethal"]["max_radius_m"],
                "explanation": "Pool fire radiates ~354 MW continuously — 100x slower rate than BLEVE, producing smaller highly wind-sensitive zones."
            }
        }, status=status.HTTP_200_OK)
