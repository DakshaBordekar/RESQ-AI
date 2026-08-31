from typing import Dict, Any, Optional
from apps.simulation.models import SimulationScenario, SimulationEvent
from apps.routing.models import RoadSegment
from apps.hospitals.models import Hospital
from apps.resources.models import Resource
from apps.incidents.models import Incident
from apps.incidents.services.priority_engine import PriorityEngine
from apps.optimization.models import Dispatch
from apps.routing.services.router import DynamicGraphRouter

class SimulationEngine:
    @classmethod
    def get_or_create_active_scenario(cls) -> SimulationScenario:
        scenario = SimulationScenario.objects.filter(is_active=True).first()
        if not scenario:
            scenario = SimulationScenario.objects.create(
                name='Operation Chennai Deluge 2026',
                description='Monsoonal urban flooding simulation across Adyar, Velachery, and Saidapet sectors.',
                tick_minutes=0,
                is_active=True
            )
        return scenario

    @classmethod
    def inject_event(cls, event_type: str, details: Dict[str, Any]) -> Dict[str, Any]:
        scenario = cls.get_or_create_active_scenario()
        
        event = SimulationEvent.objects.create(
            scenario=scenario,
            event_type=event_type,
            title=details.get('title', f"Disruption Event: {event_type}"),
            details=details,
            is_applied=True,
            simulated_minute=scenario.tick_minutes
        )

        impact_summary = {'event_id': str(event.id), 'event_type': event_type, 'effects': []}

        # 1. Road Blockage Injection
        if event_type == SimulationEvent.EventType.ROAD_BLOCKED:
            seg_id = details.get('segment_id')
            seg_name = details.get('road_name')
            
            segments = RoadSegment.objects.none()
            if seg_id:
                segments = RoadSegment.objects.filter(id=seg_id)
            elif seg_name:
                segments = RoadSegment.objects.filter(name__icontains=seg_name)
            else:
                # Default to first major bridge if not specified
                segments = RoadSegment.objects.filter(name__icontains='Saidapet')
            
            affected_segments = []
            for seg in segments:
                seg.status = RoadSegment.Status.BLOCKED
                seg.save()
                affected_segments.append(seg.name)

            # Re-evaluate all active dispatches traversing blocked edge
            router = DynamicGraphRouter()
            rerouted_count = 0
            for disp in Dispatch.objects.filter(status__in=[Dispatch.Status.PROPOSED, Dispatch.Status.APPROVED, Dispatch.Status.DISPATCHED]):
                new_route = router.calculate_route(
                    disp.resource.latitude, disp.resource.longitude,
                    disp.incident.latitude, disp.incident.longitude
                )
                disp.route_geometry = new_route.get('coordinates', [])
                disp.distance_km = new_route.get('distance_km', disp.distance_km)
                disp.eta_minutes = new_route.get('eta_minutes', disp.eta_minutes)
                disp.narrative_explanation += f" [REROUTED around {', '.join(affected_segments)}]"
                disp.save()
                rerouted_count += 1

            impact_summary['effects'].append(f"Marked {len(affected_segments)} segment(s) BLOCKED. Recalculated {rerouted_count} active vehicle routes.")

        # 2. Hospital Saturation Injection
        elif event_type == SimulationEvent.EventType.HOSPITAL_SURGE:
            hosp_id = details.get('hospital_id')
            hosp_name = details.get('hospital_name', 'Government')
            
            hospital = Hospital.objects.filter(id=hosp_id).first() if hosp_id else Hospital.objects.filter(name__icontains=hosp_name).first()
            if hospital:
                hospital.status = Hospital.Status.DIVERT_FULL
                hospital.available_icu = 0
                hospital.available_beds = 0
                hospital.save()
                impact_summary['effects'].append(f"{hospital.name} switched to DIVERT_FULL. Available beds set to 0.")

        # 3. New Surge Incident Injection
        elif event_type == SimulationEvent.EventType.NEW_INCIDENT:
            inc = Incident.objects.create(
                title=details.get('title', 'Emergency: Dialysis Patients Trapped on 2nd Floor'),
                location_name=details.get('location_name', 'Velachery South Sector'),
                latitude=details.get('latitude', 12.9790),
                longitude=details.get('longitude', 80.2150),
                hazard_type=Incident.HazardType.FLOOD,
                people_affected=details.get('people_affected', 4),
                vulnerable_people=details.get('vulnerable_people', 2),
                vulnerability_flags=details.get('vulnerability_flags', ['ELDERLY', 'DIALYSIS']),
                medical_need=True,
                mobility_status='TRAPPED',
                urgency='IMMEDIATE',
                status=Incident.Status.TRIAGED
            )
            score, tier = PriorityEngine.calculate_score(inc)
            inc.calculated_priority = score
            inc.priority_tier = tier
            inc.save()
            impact_summary['effects'].append(f"Spawned critical incident #{inc.id.hex[:6]} (Score: {score:.1f}, Tier: {tier}).")

        # 4. Resource Failure Injection
        elif event_type == SimulationEvent.EventType.RESOURCE_FAILURE:
            call_sign = details.get('call_sign', 'AMB-04')
            res = Resource.objects.filter(call_sign=call_sign).first() or Resource.objects.filter(status=Resource.Status.AVAILABLE).first()
            if res:
                res.status = Resource.Status.OFFLINE
                res.save()
                impact_summary['effects'].append(f"Resource {res.call_sign} marked OFFLINE due to mechanical breakdown.")

        return impact_summary

    @classmethod
    def step_simulation(cls, step_minutes: int = 5) -> Dict[str, Any]:
        scenario = cls.get_or_create_active_scenario()
        scenario.tick_minutes += step_minutes
        scenario.save()

        # Recalculate priority time decay across all unresolved incidents
        for inc in Incident.objects.exclude(status__in=[Incident.Status.RESOLVED, Incident.Status.CANCELLED]):
            score, tier = PriorityEngine.calculate_score(inc)
            inc.calculated_priority = score
            inc.priority_tier = tier
            inc.save()

        return {
            'scenario_name': scenario.name,
            'current_tick_minutes': scenario.tick_minutes,
            'step_applied': step_minutes,
            'active_incident_count': Incident.objects.exclude(status=Incident.Status.RESOLVED).count()
        }
