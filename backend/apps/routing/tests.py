from django.test import TestCase
from apps.routing.models import RoadNode, RoadSegment
from apps.routing.services.router import DynamicGraphRouter

class DynamicGraphRouterTestCase(TestCase):
    def setUp(self):
        # Create diamond graph: N1 -> N2 -> N4 and N1 -> N3 -> N4
        self.n1 = RoadNode.objects.create(node_index=101, name="Start", latitude=13.00, longitude=80.20)
        self.n2 = RoadNode.objects.create(node_index=102, name="Bridge East (Shorter)", latitude=13.01, longitude=80.21)
        self.n3 = RoadNode.objects.create(node_index=103, name="Bypass West (Longer)", latitude=13.00, longitude=80.22)
        self.n4 = RoadNode.objects.create(node_index=104, name="Destination", latitude=13.02, longitude=80.22)

        # Path 1: 101 -> 102 -> 104 (Total length 2.0 km, speed 40 => 3.0 min)
        self.seg1 = RoadSegment.objects.create(source_node=self.n1, target_node=self.n2, length_km=1.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR)
        self.seg2 = RoadSegment.objects.create(source_node=self.n2, target_node=self.n4, length_km=1.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR)

        # Path 2: 101 -> 103 -> 104 (Total length 6.0 km, speed 40 => 9.0 min)
        self.seg3 = RoadSegment.objects.create(source_node=self.n1, target_node=self.n3, length_km=3.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR)
        self.seg4 = RoadSegment.objects.create(source_node=self.n3, target_node=self.n4, length_km=3.0, base_speed_kmh=40.0, status=RoadSegment.Status.CLEAR)

    def test_shortest_path_selection(self):
        router = DynamicGraphRouter()
        res = router.calculate_route(13.00, 80.20, 13.02, 80.22)
        self.assertFalse(res['is_blocked'])
        self.assertEqual(res['path_nodes'], [101, 102, 104])

    def test_dynamic_detour_when_bridge_blocked(self):
        # Block the short path segment
        self.seg2.status = RoadSegment.Status.BLOCKED
        self.seg2.save()

        router = DynamicGraphRouter()
        res = router.calculate_route(13.00, 80.20, 13.02, 80.22)
        self.assertFalse(res['is_blocked'])
        # Must detour via Bypass West (103)
        self.assertEqual(res['path_nodes'], [101, 103, 104])
