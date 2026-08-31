from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.hospitals.models import Hospital
from apps.routing.models import RoadSegment
from apps.optimization.models import Dispatch
from apps.analytics.services.eap_generator import EAPGenerator

class AnalyticsSummaryView(APIView):
    def get(self, request):
        incidents = Incident.objects.all()
        resources = Resource.objects.all()
        hospitals = Hospital.objects.all()
        roads = RoadSegment.objects.all()
        dispatches = Dispatch.objects.all()

        total_incidents = incidents.count()
        critical_count = incidents.filter(priority_tier=Incident.PriorityTier.CRITICAL).count()
        high_count = incidents.filter(priority_tier=Incident.PriorityTier.HIGH).count()
        resolved_count = incidents.filter(status=Incident.Status.RESOLVED).count()

        total_resources = resources.count()
        available_resources = resources.filter(status=Resource.Status.AVAILABLE).count()
        active_dispatches = dispatches.filter(status__in=[Dispatch.Status.APPROVED, Dispatch.Status.DISPATCHED]).count()

        total_beds = sum(h.total_beds for h in hospitals)
        avail_beds = sum(h.available_beds for h in hospitals)
        total_icu = sum(h.total_icu for h in hospitals)
        avail_icu = sum(h.available_icu for h in hospitals)

        blocked_roads = roads.filter(status=RoadSegment.Status.BLOCKED).count()

        return Response({
            'incidents': {
                'total': total_incidents,
                'critical': critical_count,
                'high': high_count,
                'resolved': resolved_count,
                'pending': total_incidents - resolved_count,
            },
            'fleet': {
                'total': total_resources,
                'available': available_resources,
                'deployed': total_resources - available_resources,
                'active_dispatches': active_dispatches,
                'utilization_rate': round(((total_resources - available_resources) / max(1, total_resources)) * 100.0, 1)
            },
            'medical': {
                'total_beds': total_beds,
                'available_beds': avail_beds,
                'bed_occupancy_rate': round(((total_beds - avail_beds) / max(1, total_beds)) * 100.0, 1),
                'total_icu': total_icu,
                'available_icu': avail_icu,
                'icu_occupancy_rate': round(((total_icu - avail_icu) / max(1, total_icu)) * 100.0, 1),
            },
            'infrastructure': {
                'total_road_segments': roads.count(),
                'blocked_segments': blocked_roads,
                'network_health_pct': round(((roads.count() - blocked_roads) / max(1, roads.count())) * 100.0, 1)
            }
        }, status=status.HTTP_200_OK)


class ActionPlanGenerateView(APIView):
    def get(self, request):
        plan = EAPGenerator.generate_plan()
        return Response(plan, status=status.HTTP_200_OK)
