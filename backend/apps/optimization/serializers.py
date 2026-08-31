from rest_framework import serializers
from apps.optimization.models import Dispatch
from apps.incidents.serializers import IncidentSerializer
from apps.resources.serializers import ResourceSerializer
from apps.hospitals.serializers import HospitalSerializer

class DispatchSerializer(serializers.ModelSerializer):
    incident_details = IncidentSerializer(source='incident', read_only=True)
    resource_details = ResourceSerializer(source='resource', read_only=True)
    hospital_details = HospitalSerializer(source='target_hospital', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Dispatch
        fields = [
            'id', 'incident', 'resource', 'target_hospital',
            'incident_details', 'resource_details', 'hospital_details',
            'status', 'status_display', 'route_geometry',
            'distance_km', 'eta_minutes', 'mathematical_rationale',
            'narrative_explanation', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
