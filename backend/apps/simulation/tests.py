from django.test import TestCase
from apps.simulation.models import SimulationScenario, SimulationEvent
from apps.simulation.services.simulator import SimulationEngine
from apps.routing.models import RoadNode, RoadSegment

class SimulationEngineTestCase(TestCase):
    def setUp(self):
        self.scenario = SimulationScenario.objects.create(
            name='Test Scenario',
            tick_minutes=0,
            is_active=True
        )
        self.n1 = RoadNode.objects.create(node_index=201, latitude=13.02, longitude=80.22)
        self.n2 = RoadNode.objects.create(node_index=202, latitude=13.03, longitude=80.23)
        self.seg = RoadSegment.objects.create(
            source_node=self.n1,
            target_node=self.n2,
            name="Saidapet Bridge Sector",
            length_km=2.0,
            status=RoadSegment.Status.CLEAR
        )

    def test_inject_road_blockage(self):
        impact = SimulationEngine.inject_event(
            SimulationEvent.EventType.ROAD_BLOCKED,
            {'segment_id': str(self.seg.id)}
        )
        self.seg.refresh_from_db()
        self.assertEqual(self.seg.status, RoadSegment.Status.BLOCKED)
        self.assertIn('BLOCKED', impact['effects'][0])

    def test_weather_service_telemetry_resilience(self):
        from apps.simulation.services.weather_service import WeatherService
        weather = WeatherService.get_current_weather(13.0827, 80.2707)
        self.assertIn('temperature_c', weather)
        self.assertIn('wind_speed_kmh', weather)
        self.assertIn('condition', weather)
        self.assertIn('provider', weather)
