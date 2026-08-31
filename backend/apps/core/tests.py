from rest_framework.test import APITestCase
from rest_framework import status
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.routing.models import RoadNode, RoadSegment
from apps.hospitals.models import Hospital

class EndToEndAPITestCase(APITestCase):
    def setUp(self):
        # Create minimal network
        self.node1 = RoadNode.objects.create(node_index=1, name="Hub A", latitude=13.00, longitude=80.20)
        self.node2 = RoadNode.objects.create(node_index=2, name="Hub B", latitude=13.02, longitude=80.22)
        self.seg = RoadSegment.objects.create(
            source_node=self.node1, target_node=self.node2,
            name="Main Link", length_km=2.5, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR
        )
        self.hospital = Hospital.objects.create(
            name="Apollo Test Hospital", latitude=13.06, longitude=80.25,
            total_beds=100, available_beds=20, total_icu=10, available_icu=5,
            has_trauma_bay=True, status=Hospital.Status.ACCEPTING
        )
        self.resource = Resource.objects.create(
            name="Ambulance 01", call_sign="AMB-01", type=Resource.ResourceType.AMBULANCE_ALS,
            latitude=13.00, longitude=80.20, capacity=2, capabilities=["ALS", "OXYGEN"]
        )

    def test_full_incident_intake_and_dispatch_api_flow(self):
        # 1. AI Parse Text
        ai_resp = self.client.post('/api/v1/incidents/analyze-text/', {
            'raw_text': 'Elderly grandmother trapped in rising flood waters near Velachery.'
        }, format='json')
        self.assertEqual(ai_resp.status_code, status.HTTP_200_OK)
        extracted = ai_resp.data
        self.assertIn('location_name', extracted)

        # 2. Create Incident
        create_resp = self.client.post('/api/v1/incidents/', {
            'title': 'Grandmother trapped in flood',
            'raw_text': 'Elderly grandmother trapped in rising flood waters near Velachery.',
            'location_name': extracted['location_name'],
            'latitude': extracted['latitude'],
            'longitude': extracted['longitude'],
            'hazard_type': extracted['hazard_type'],
            'people_affected': extracted['people_affected'],
            'vulnerable_people': extracted['vulnerable_people'],
            'vulnerability_flags': extracted['vulnerability_flags'],
            'medical_need': extracted['medical_need'],
            'mobility_status': extracted['mobility_status'],
            'urgency': extracted['urgency'],
            'status': Incident.Status.TRIAGED
        }, format='json')
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        self.assertGreater(create_resp.data['calculated_priority'], 0)

        # 3. Run Optimization
        opt_resp = self.client.post('/api/v1/optimization/run/', format='json')
        self.assertEqual(opt_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(opt_resp.data['status'], 'SUCCESS')

        # 4. Route Calculation API
        route_resp = self.client.post('/api/v1/routes/calculate/', {
            'origin_lat': 13.00, 'origin_lon': 80.20,
            'dest_lat': 13.02, 'dest_lon': 80.22
        }, format='json')
        self.assertEqual(route_resp.status_code, status.HTTP_200_OK)
        self.assertIn('coordinates', route_resp.data)

        # 5. Toggle Road Blockage
        block_resp = self.client.post(f'/api/v1/roads/{self.seg.id}/toggle-blockage/', format='json')
        self.assertEqual(block_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(block_resp.data['status'], 'BLOCKED')

        # 6. Analytics Summary
        analytics_resp = self.client.get('/api/v1/analytics/summary/')
        self.assertEqual(analytics_resp.status_code, status.HTTP_200_OK)
        self.assertIn('incidents', analytics_resp.data)

        # 7. Action Plan Generation
        eap_resp = self.client.get('/api/v1/action-plan/generate/')
        self.assertEqual(eap_resp.status_code, status.HTTP_200_OK)
        self.assertIn('briefing_markdown', eap_resp.data)
