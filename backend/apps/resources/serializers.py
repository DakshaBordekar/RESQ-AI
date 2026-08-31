from rest_framework import serializers
from apps.resources.models import Resource, ResourceCapability

class ResourceCapabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ResourceCapability
        fields = ['id', 'code', 'name', 'description']

class ResourceSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Resource
        fields = [
            'id', 'name', 'call_sign', 'type', 'type_display',
            'status', 'status_display', 'latitude', 'longitude',
            'capacity', 'capabilities', 'contact_radio', 'base_station',
            'created_at', 'updated_at'
        ]
