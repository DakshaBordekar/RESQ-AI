from django.test import TestCase
from apps.incidents.models import Incident
from apps.incidents.services.priority_engine import PriorityEngine

class PriorityEngineTestCase(TestCase):
    def test_critical_incident_priority(self):
        inc = Incident.objects.create(
            title='Critical Dialysis Flood Incident',
            location_name='Velachery',
            latitude=12.9815,
            longitude=80.2180,
            hazard_type=Incident.HazardType.FLOOD,
            people_affected=4,
            vulnerable_people=3,
            vulnerability_flags=['ELDERLY', 'DIALYSIS'],
            medical_need=True,
            mobility_status='TRAPPED',
            urgency='IMMEDIATE',
            priority_tier=Incident.PriorityTier.CRITICAL
        )
        score, tier = PriorityEngine.calculate_score(inc)
        self.assertGreaterEqual(score, 80.0)
        self.assertEqual(tier, 'CRITICAL')

    def test_low_priority_incident(self):
        inc = Incident.objects.create(
            title='General Inquiry / Minor Waterlogging',
            location_name='Marina',
            latitude=13.0500,
            longitude=80.2824,
            hazard_type=Incident.HazardType.FLOOD,
            people_affected=1,
            vulnerable_people=0,
            vulnerability_flags=[],
            medical_need=False,
            mobility_status='AMBULATORY',
            urgency='MODERATE',
            priority_tier=Incident.PriorityTier.LOW
        )
        score, tier = PriorityEngine.calculate_score(inc)
        self.assertLess(score, 45.0)
