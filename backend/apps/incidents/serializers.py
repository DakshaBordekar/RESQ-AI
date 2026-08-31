from rest_framework import serializers
from apps.incidents.models import Incident, IncidentVictim

class IncidentVictimSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentVictim
        fields = ['id', 'category', 'count', 'special_condition']

class IncidentSerializer(serializers.ModelSerializer):
    victims = IncidentVictimSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            'id', 'title', 'raw_text', 'location_name', 'latitude', 'longitude',
            'hazard_type', 'people_affected', 'vulnerable_people', 'vulnerability_flags',
            'medical_need', 'mobility_status', 'urgency', 'calculated_priority',
            'priority_tier', 'status', 'reporter_name', 'reporter_phone',
            'created_at', 'updated_at', 'victims'
        ]
        read_only_fields = ['calculated_priority', 'priority_tier', 'created_at', 'updated_at']
