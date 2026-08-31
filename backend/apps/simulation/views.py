from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.simulation.models import SimulationScenario, SimulationEvent
from apps.simulation.serializers import SimulationScenarioSerializer, SimulationEventSerializer
from apps.simulation.services.simulator import SimulationEngine
from django.core.management import call_command

class SimulationViewSet(viewsets.ModelViewSet):
    queryset = SimulationScenario.objects.all().order_by('-created_at')
    serializer_class = SimulationScenarioSerializer

    @action(detail=False, methods=['get'], url_path='active')
    def active_scenario(self, request):
        scenario = SimulationEngine.get_or_create_active_scenario()
        return Response(SimulationScenarioSerializer(scenario).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='inject-event')
    def inject_event(self, request):
        event_type = request.data.get('event_type')
        details = request.data.get('details', {})

        if not event_type:
            return Response({'error': 'event_type is required.'}, status=status.HTTP_400_BAD_REQUEST)

        impact = SimulationEngine.inject_event(event_type, details)
        return Response(impact, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='step')
    def step(self, request):
        minutes = int(request.data.get('step_minutes', 5))
        result = SimulationEngine.step_simulation(step_minutes=minutes)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='weather')
    def weather(self, request):
        from apps.simulation.services.weather_service import WeatherService
        lat = float(request.query_params.get('lat', 13.0827))
        lon = float(request.query_params.get('lon', 80.2707))
        weather_data = WeatherService.get_current_weather(lat=lat, lon=lon)
        return Response(weather_data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='reset')
    def reset(self, request):
        """Resets simulation and reseeds the baseline Chennai scenario."""
        try:
            call_command('seed_chennai_scenario')
            return Response({'status': 'SUCCESS', 'message': 'Disaster scenario successfully reset to baseline.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
