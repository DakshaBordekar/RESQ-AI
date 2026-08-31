from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.routing.models import RoadNode, RoadSegment
from apps.routing.serializers import RoadNodeSerializer, RoadSegmentSerializer
from apps.routing.services.router import DynamicGraphRouter

class RoadNodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RoadNode.objects.all().order_by('node_index')
    serializer_class = RoadNodeSerializer

class RoadSegmentViewSet(viewsets.ModelViewSet):
    queryset = RoadSegment.objects.select_related('source_node', 'target_node').all().order_by('name')
    serializer_class = RoadSegmentSerializer

    @action(detail=True, methods=['post'], url_path='toggle-blockage')
    def toggle_blockage(self, request, pk=None):
        segment = self.get_object()
        if segment.status == RoadSegment.Status.BLOCKED:
            segment.status = RoadSegment.Status.CLEAR
            segment.hazard_multiplier = 1.0
        else:
            segment.status = RoadSegment.Status.BLOCKED
            segment.hazard_multiplier = 999.0
        segment.save()
        return Response(RoadSegmentSerializer(segment).data, status=status.HTTP_200_OK)


class RouteCalculateView(APIView):
    def post(self, request):
        origin_lat = request.data.get('origin_lat')
        origin_lon = request.data.get('origin_lon')
        dest_lat = request.data.get('dest_lat')
        dest_lon = request.data.get('dest_lon')

        if None in [origin_lat, origin_lon, dest_lat, dest_lon]:
            return Response({'error': 'origin_lat, origin_lon, dest_lat, and dest_lon are required.'}, status=status.HTTP_400_BAD_REQUEST)

        router = DynamicGraphRouter()
        result = router.calculate_route(
            float(origin_lat), float(origin_lon),
            float(dest_lat), float(dest_lon)
        )
        return Response(result, status=status.HTTP_200_OK)
