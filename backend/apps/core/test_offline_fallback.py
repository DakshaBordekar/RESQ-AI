from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from apps.ai.services.llm_bridge import LLMBridgeService, LocalMockProvider
from apps.simulation.services.weather_service import WeatherService
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.routing.models import RoadNode, RoadSegment
from apps.hospitals.models import Hospital
from apps.optimization.services.optimizer import GlobalResourceOptimizer
from apps.routing.services.router import DynamicGraphRouter

class OfflineAndFailureResilienceTestCase(TestCase):
    """Tests 100% offline autonomy and graceful external failure fallback."""

    def setUp(self):
        self.client = APIClient()
        self.node1 = RoadNode.objects.create(node_index=501, name="Hub A", latitude=13.00, longitude=80.20)
        self.node2 = RoadNode.objects.create(node_index=502, name="Hub B", latitude=13.02, longitude=80.22)
        self.node3 = RoadNode.objects.create(node_index=503, name="Hub C", latitude=13.04, longitude=80.24)
        
        self.seg1 = RoadSegment.objects.create(
            source_node=self.node1, target_node=self.node2,
            name="Primary Link", length_km=3.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR
        )
        self.seg2 = RoadSegment.objects.create(
            source_node=self.node2, target_node=self.node3,
            name="Secondary Link", length_km=3.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR
        )
        self.hospital = Hospital.objects.create(
            name="Chennai General Hospital", latitude=13.04, longitude=80.24,
            total_beds=100, available_beds=15, total_icu=10, available_icu=4,
            has_trauma_bay=True, status=Hospital.Status.ACCEPTING
        )
        self.ambulance = Resource.objects.create(
            name="Rescue Ambulance Alpha", call_sign="AMB-A", type=Resource.ResourceType.AMBULANCE_ALS,
            latitude=13.00, longitude=80.20, capacity=2, capabilities=["ALS", "OXYGEN"]
        )
        self.boat = Resource.objects.create(
            name="Amphibious Rescue Boat", call_sign="BOAT-A", type=Resource.ResourceType.RESCUE_BOAT,
            latitude=13.00, longitude=80.20, capacity=6, capabilities=["WATER_RESCUE", "FIRST_AID"]
        )

    @override_settings(AI_PROVIDER='local_mock', OPENAI_API_KEY='')
    def test_offline_ai_provider_fallback(self):
        """Verifies that with zero API keys or offline mode, incident extraction and EAP briefing work deterministically."""
        provider = LLMBridgeService.get_provider()
        self.assertIsInstance(provider, LocalMockProvider)

        extracted = provider.extract_incident("Elderly person trapped in flooded house near Velachery.")
        self.assertEqual(extracted['hazard_type'], 'FLOOD')
        self.assertIn('ELDERLY', extracted['vulnerability_flags'])
        self.assertEqual(extracted['severity'], 'CRITICAL')
        self.assertTrue(extracted['medical_need'])

        plan = provider.generate_action_plan({'critical_count': 2, 'dispatched_count': 3})
        self.assertIn('EMERGENCY ACTION PLAN', plan)

    @override_settings(WEATHER_API_KEY='')
    def test_offline_weather_fallback(self):
        """Verifies that with zero weather keys, the weather service returns disaster telemetry without throwing."""
        WeatherService._cache = {}
        WeatherService._cache_timestamp = 0.0
        weather = WeatherService.get_current_weather(13.0827, 80.2707)
        self.assertFalse(weather['is_live'])
        self.assertEqual(weather['condition'], 'TORRENTIAL_MONSOON')
        self.assertGreater(weather['rainfall_1h_mm'], 0)

    @override_settings(AI_PROVIDER='local_mock', OPENAI_API_KEY='', WEATHER_API_KEY='')
    def test_full_offline_end_to_end_operational_flow(self):
        """Tests the entire emergency response lifecycle offline."""
        # 1. Citizen distress intake
        distress_text = "Grandmother on dialysis stranded with water at waist level in Saidapet."
        ai_resp = self.client.post('/api/v1/incidents/analyze-text/', {'raw_text': distress_text}, format='json')
        self.assertEqual(ai_resp.status_code, status.HTTP_200_OK)
        data = ai_resp.data
        self.assertEqual(data['hazard_type'], 'FLOOD')
        self.assertIn('DIALYSIS', data['vulnerability_flags'])

        # 2. Persist Incident
        inc_resp = self.client.post('/api/v1/incidents/', {
            'title': 'Dialysis Patient Stranded',
            'raw_text': distress_text,
            'location_name': data['location_name'],
            'latitude': data['latitude'],
            'longitude': data['longitude'],
            'hazard_type': data['hazard_type'],
            'people_affected': data['people_affected'],
            'vulnerable_people': data['vulnerable_people'],
            'vulnerability_flags': data['vulnerability_flags'],
            'medical_need': data['medical_need'],
            'mobility_status': data['mobility_status'],
            'urgency': data['urgency'],
            'status': Incident.Status.TRIAGED
        }, format='json')
        self.assertEqual(inc_resp.status_code, status.HTTP_201_CREATED)
        self.assertGreater(inc_resp.data['calculated_priority'], 0)

        # 3. Hungarian Optimization
        opt_result = GlobalResourceOptimizer.run_optimization()
        self.assertEqual(opt_result['status'], 'SUCCESS')
        self.assertGreaterEqual(opt_result['dispatches_created'], 1)

        # 4. Dijkstra Route Calculation
        router = DynamicGraphRouter()
        route = router.calculate_route(13.00, 80.20, 13.04, 80.24)
        self.assertFalse(route['is_unreachable'])
        self.assertGreater(len(route['coordinates']), 1)
        initial_eta = route['eta_minutes']

        # 5. Dynamic Blockage & Reroute
        self.seg1.status = RoadSegment.Status.BLOCKED
        self.seg1.save()

        reroute = router.calculate_route(13.00, 80.20, 13.04, 80.24)
        self.assertGreaterEqual(reroute['eta_minutes'], initial_eta)
