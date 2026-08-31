from typing import Tuple

class PriorityEngine:
    WEIGHT_SEVERITY = 0.30
    WEIGHT_VULNERABILITY = 0.20
    WEIGHT_SCALE = 0.15
    WEIGHT_MEDICAL = 0.15
    WEIGHT_URGENCY = 0.10
    WEIGHT_DECAY = 0.10

    @classmethod
    def calculate_score(cls, incident) -> Tuple[float, str]:
        """
        Computes composite priority score P in [0.00, 100.00] and priority tier.
        """
        # 1. Severity Factor (0 - 100)
        sev_map = {'CRITICAL': 100.0, 'HIGH': 75.0, 'MEDIUM': 40.0, 'LOW': 15.0}
        s_score = sev_map.get(str(incident.priority_tier).upper(), 40.0)

        # 2. Vulnerability Factor (0 - 100)
        vulnerable_count = getattr(incident, 'vulnerable_people', 0)
        v_score = min(100.0, float(vulnerable_count) * 35.0)

        # 3. Scale Factor (0 - 100)
        people_count = getattr(incident, 'people_affected', 1)
        n_score = min(100.0, float(people_count) * 10.0)

        # 4. Medical Emergency Factor (0 or 100)
        m_score = 100.0 if getattr(incident, 'medical_need', False) else 0.0

        # 5. Urgency Factor (0 - 100)
        urg_map = {'IMMEDIATE': 100.0, 'URGENT': 70.0, 'MODERATE': 30.0}
        urgency_val = str(getattr(incident, 'urgency', 'URGENT')).upper()
        u_score = urg_map.get(urgency_val, 50.0)

        # 6. Time Decay Factor (0 - 100)
        age = getattr(incident, 'age_minutes', 0.0)
        t_score = min(100.0, float(age) * 2.0)

        raw_score = (
            cls.WEIGHT_SEVERITY * s_score +
            cls.WEIGHT_VULNERABILITY * v_score +
            cls.WEIGHT_SCALE * n_score +
            cls.WEIGHT_MEDICAL * m_score +
            cls.WEIGHT_URGENCY * u_score +
            cls.WEIGHT_DECAY * t_score
        )

        final_score = round(min(100.0, max(0.0, raw_score)), 2)

        # Determine Tier
        if final_score >= 80.0:
            tier = 'CRITICAL'
        elif final_score >= 60.0:
            tier = 'HIGH'
        elif final_score >= 35.0:
            tier = 'MEDIUM'
        else:
            tier = 'LOW'

        return final_score, tier
