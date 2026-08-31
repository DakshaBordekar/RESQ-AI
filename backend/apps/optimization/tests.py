from django.test import TestCase
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.optimization.services.optimizer import GlobalResourceOptimizer
from apps.optimization.models import Dispatch

class OptimizationTestCase(TestCase):
    def setUp(self):
        self.inc1 = Incident.objects.create(
            title='Critical Terrace Rescue',
            location_name='Velachery',
            latitude=12.9815,
            longitude=80.2180,
            hazard_type=Incident.HazardType.FLOOD,
            people_affected=3,
            vulnerable_people=2,
            vulnerability_flags=['ELDERLY'],
            medical_need=True,
            mobility_status='TRAPPED',
            urgency='IMMEDIATE',
            calculated_priority=92.5,
            priority_tier=Incident.PriorityTier.CRITICAL,
            status=Incident.Status.TRIAGED
        )
        self.res1 = Resource.objects.create(
            name='Rescue Boat Alpha',
            call_sign='BOAT-99',
            type=Resource.ResourceType.RESCUE_BOAT,
            status=Resource.Status.AVAILABLE,
            latitude=12.9800,
            longitude=80.2200,
            capacity=6,
            capabilities=['WATER_RESCUE']
        )

    def test_global_optimization_creates_dispatch(self):
        result = GlobalResourceOptimizer.run_optimization()
        self.assertEqual(result['status'], 'SUCCESS')
        self.assertEqual(result['dispatches_created'], 1)

        d = Dispatch.objects.first()
        self.assertIsNotNone(d)
        self.assertEqual(d.incident, self.inc1)
        self.assertEqual(d.resource, self.res1)
        self.assertIn('BOAT-99', d.narrative_explanation)
