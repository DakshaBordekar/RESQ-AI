from rest_framework import serializers
from apps.simulation.models import SimulationScenario, SimulationEvent

class SimulationEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = SimulationEvent
        fields = ['id', 'scenario', 'event_type', 'event_type_display', 'title', 'details', 'is_applied', 'simulated_minute', 'created_at']

class SimulationScenarioSerializer(serializers.ModelSerializer):
    events = SimulationEventSerializer(many=True, read_only=True)

    class Meta:
        model = SimulationScenario
        fields = ['id', 'name', 'description', 'tick_minutes', 'is_active', 'weather_condition', 'water_level_multiplier', 'created_at', 'events']
