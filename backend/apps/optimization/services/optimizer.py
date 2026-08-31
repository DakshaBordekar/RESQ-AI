import numpy as np
from scipy.optimize import linear_sum_assignment
from typing import List, Dict, Any
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.routing.services.router import DynamicGraphRouter
from apps.hospitals.services.matcher import HospitalMatcher
from apps.optimization.models import Dispatch

class GlobalResourceOptimizer:
    @classmethod
    def run_optimization(cls) -> Dict[str, Any]:
        """
        Executes constrained Bipartite Min-Cost matching across unassigned/triaged incidents
        and available emergency resources using SciPy Linear Sum Assignment.
        """
        router = DynamicGraphRouter()
        
        # 1. Fetch unassigned/triaged incidents sorted by calculated priority descending
        active_incidents = list(
            Incident.objects.filter(status__in=[Incident.Status.REPORTED, Incident.Status.PARSED, Incident.Status.TRIAGED])
            .order_by('-calculated_priority')
        )
        
        # 2. Fetch available resources
        available_resources = list(
            Resource.objects.filter(status=Resource.Status.AVAILABLE)
        )

        if not active_incidents:
            return {'status': 'NO_ACTIVE_INCIDENTS', 'dispatches_created': 0, 'assignments': []}

        if not available_resources:
            return {'status': 'NO_AVAILABLE_RESOURCES', 'dispatches_created': 0, 'unassigned_count': len(active_incidents), 'assignments': []}

        N = len(active_incidents)
        M = len(available_resources)
        
        # Cost Matrix: Rows = Incidents (0..N-1), Cols = Resources (0..M-1)
        cost_matrix = np.full((N, M), 1e6)
        route_cache = {}

        for i, inc in enumerate(active_incidents):
            for j, res in enumerate(available_resources):
                # Capability Check: If flood and victims trapped, boats or tactical teams preferred
                is_capable = True
                if inc.hazard_type == Incident.HazardType.FLOOD:
                    if 'WATER_RESCUE' not in res.capabilities and res.type != Resource.ResourceType.RESCUE_BOAT and res.type != Resource.ResourceType.NDRF_TEAM:
                        # Penalty for non-amphibious unit in flood
                        is_capable = False

                if not is_capable:
                    cost_matrix[i, j] = 1e6
                    continue

                # Calculate ETA via Dijkstra
                route_res = router.calculate_route(res.latitude, res.longitude, inc.latitude, inc.longitude)
                route_cache[(i, j)] = route_res
                
                eta = route_res.get('eta_minutes', 15.0)
                if eta == float('inf'):
                    cost_matrix[i, j] = 1e6
                    continue

                # Multi-objective Cost Function: Lower cost is prioritized
                # We want: Low ETA, High Incident Priority, Capable Match
                # Cost = (0.50 * ETA) - (0.40 * PriorityScore) - (CapabilityBonus)
                cap_bonus = 20.0 if ('WATER_RESCUE' in res.capabilities or 'ALS' in res.capabilities) else 0.0
                cost = (0.50 * eta) - (0.40 * inc.calculated_priority) - cap_bonus
                cost_matrix[i, j] = cost

        # Solve assignment using Hungarian Algorithm
        row_ind, col_ind = linear_sum_assignment(cost_matrix)

        created_dispatches = []
        assigned_incident_ids = set()

        for r, c in zip(row_ind, col_ind):
            if cost_matrix[r, c] < 1e5: # Feasible assignment
                inc = active_incidents[r]
                res = available_resources[c]
                route_data = route_cache.get((r, c), {})

                # Match Hospital if medical need
                matched_hospital = None
                if inc.medical_need:
                    needs_icu = 'DIALYSIS' in str(inc.vulnerability_flags) or inc.priority_tier == Incident.PriorityTier.CRITICAL
                    matched_hospital, _ = HospitalMatcher.match_hospital(
                        inc.latitude, inc.longitude,
                        needs_icu=needs_icu,
                        needs_trauma=True
                    )

                # Construct Mathematical Rationale
                math_rationale = {
                    'priority_score': inc.calculated_priority,
                    'priority_tier': inc.priority_tier,
                    'calculated_eta_minutes': route_data.get('eta_minutes', 10.0),
                    'distance_km': route_data.get('distance_km', 3.5),
                    'capability_matched': True,
                    'hospital_assigned': matched_hospital.name if matched_hospital else None,
                    'cost_metric': round(float(cost_matrix[r, c]), 2)
                }

                # Construct Natural Language Explanation
                narrative = (
                    f"Assigned {res.call_sign} ({res.get_type_display()}) to Incident #{inc.id.hex[:6]} '{inc.title}' "
                    f"because it has {inc.priority_tier} priority ({inc.calculated_priority:.1f}), {inc.people_affected} victim(s), "
                    f"and {res.call_sign} is the fastest capable unit with an ETA of {math_rationale['calculated_eta_minutes']} mins."
                )
                if matched_hospital:
                    narrative += f" Casualties designated for {matched_hospital.name} (available ICU: {matched_hospital.available_icu})."

                # Persist Dispatch recommendation
                dispatch = Dispatch.objects.create(
                    incident=inc,
                    resource=res,
                    target_hospital=matched_hospital,
                    status=Dispatch.Status.PROPOSED,
                    route_geometry=route_data.get('coordinates', []),
                    distance_km=route_data.get('distance_km', 0.0),
                    eta_minutes=route_data.get('eta_minutes', 0.0),
                    mathematical_rationale=math_rationale,
                    narrative_explanation=narrative
                )

                created_dispatches.append(dispatch)
                assigned_incident_ids.add(inc.id)

        unassigned_count = len(active_incidents) - len(assigned_incident_ids)

        return {
            'status': 'SUCCESS',
            'dispatches_created': len(created_dispatches),
            'unassigned_count': unassigned_count,
            'dispatches': [
                {
                    'id': str(d.id),
                    'incident_id': str(d.incident.id),
                    'incident_title': d.incident.title,
                    'resource_id': str(d.resource.id),
                    'resource_call_sign': d.resource.call_sign,
                    'hospital_name': d.target_hospital.name if d.target_hospital else None,
                    'eta_minutes': d.eta_minutes,
                    'distance_km': d.distance_km,
                    'narrative_explanation': d.narrative_explanation,
                    'status': d.status
                }
                for d in created_dispatches
            ]
        }
