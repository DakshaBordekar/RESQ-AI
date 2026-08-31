from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.optimization.models import Dispatch
from apps.optimization.serializers import DispatchSerializer
from apps.optimization.services.optimizer import GlobalResourceOptimizer
from apps.resources.models import Resource
from apps.incidents.models import Incident

class DispatchViewSet(viewsets.ModelViewSet):
    queryset = Dispatch.objects.select_related('incident', 'resource', 'target_hospital').all().order_by('-created_at')
    serializer_class = DispatchSerializer

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        dispatch = self.get_object()
        dispatch.status = Dispatch.Status.APPROVED
        dispatch.save()

        # Update resource status
        resource = dispatch.resource
        resource.status = Resource.Status.EN_ROUTE_INCIDENT
        resource.save()

        # Update incident status
        incident = dispatch.incident
        incident.status = Incident.Status.DISPATCHED
        incident.save()

        return Response(DispatchSerializer(dispatch).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        dispatch = self.get_object()
        dispatch.status = Dispatch.Status.CANCELLED
        dispatch.save()

        resource = dispatch.resource
        resource.status = Resource.Status.AVAILABLE
        resource.save()

        return Response(DispatchSerializer(dispatch).data, status=status.HTTP_200_OK)


class OptimizationRunView(APIView):
    def post(self, request):
        result = GlobalResourceOptimizer.run_optimization()
        return Response(result, status=status.HTTP_200_OK)
