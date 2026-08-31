from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.resources.models import Resource
from apps.resources.serializers import ResourceSerializer

class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all().order_by('call_sign')
    serializer_class = ResourceSerializer

    @action(detail=True, methods=['patch', 'post'], url_path='status')
    def update_status(self, request, pk=None):
        resource = self.get_object()
        new_status = request.data.get('status')
        if new_status and new_status in Resource.Status.values:
            resource.status = new_status
            resource.save()
            return Response(ResourceSerializer(resource).data, status=status.HTTP_200_OK)
        return Response({'error': f'Invalid status. Allowed values: {list(Resource.Status.values)}'}, status=status.HTTP_400_BAD_REQUEST)
