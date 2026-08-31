import math
from typing import List, Optional, Tuple
from apps.hospitals.models import Hospital

class HospitalMatcher:
    @classmethod
    def match_hospital(
        cls,
        incident_lat: float,
        incident_lon: float,
        needs_icu: bool = False,
        needs_trauma: bool = False,
        needs_pediatric: bool = False
    ) -> Tuple[Optional[Hospital], List[dict]]:
        """
        Scores candidate hospitals factoring distance, available capacity, and specialty match.
        Returns (best_hospital, ranked_candidates_list).
        """
        candidates = Hospital.objects.exclude(status=Hospital.Status.OFFLINE).exclude(status=Hospital.Status.DIVERT_FULL)
        
        ranked_results = []
        for h in candidates:
            # Check hard ICU constraint if required
            if needs_icu and h.available_icu <= 0:
                continue
            if needs_trauma and not h.has_trauma_bay:
                continue

            # Estimate approximate distance in km (Haversine approximation)
            dlat = (h.latitude - incident_lat) * 111.0
            dlon = (h.longitude - incident_lon) * 111.0 * math.cos(math.radians(incident_lat))
            dist_km = math.sqrt(dlat**2 + dlon**2)
            est_travel_min = (dist_km / 35.0) * 60.0 # Assuming 35 km/h urban transit

            # Occupancy Penalty
            occ_penalty = h.occupancy_percentage * 0.40

            # Specialty Bonus
            spec_bonus = 0.0
            if needs_trauma and h.has_trauma_bay:
                spec_bonus += 15.0
            if needs_icu and h.available_icu >= 3:
                spec_bonus += 10.0
            if needs_pediatric and h.has_pediatric:
                spec_bonus += 10.0

            # Composite Cost: Lower is better
            cost_score = (0.50 * est_travel_min) + (0.35 * occ_penalty) - (0.15 * spec_bonus)

            ranked_results.append({
                'hospital': h,
                'cost_score': round(cost_score, 2),
                'dist_km': round(dist_km, 2),
                'est_travel_min': round(est_travel_min, 1),
                'available_beds': h.available_beds,
                'available_icu': h.available_icu,
                'status': h.status
            })

        ranked_results.sort(key=lambda x: x['cost_score'])

        best_hospital = ranked_results[0]['hospital'] if ranked_results else None
        return best_hospital, ranked_results
