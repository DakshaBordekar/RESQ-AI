from django.test import TestCase
from apps.hospitals.models import Hospital
from apps.hospitals.services.matcher import HospitalMatcher

class HospitalMatcherTestCase(TestCase):
    def setUp(self):
        self.h1 = Hospital.objects.create(
            name="Apollo Hospital",
            latitude=13.0600,
            longitude=80.2510,
            total_beds=100,
            available_beds=20,
            total_icu=10,
            available_icu=4,
            has_trauma_bay=True,
            status=Hospital.Status.ACCEPTING
        )
        self.h2 = Hospital.objects.create(
            name="Community Health Clinic",
            latitude=13.0610,
            longitude=80.2520,
            total_beds=20,
            available_beds=5,
            total_icu=0,
            available_icu=0,
            has_trauma_bay=False,
            status=Hospital.Status.ACCEPTING
        )

    def test_icu_constraint_filters_non_icu_facility(self):
        best_hosp, ranked = HospitalMatcher.match_hospital(
            13.0605, 80.2515,
            needs_icu=True,
            needs_trauma=True
        )
        self.assertIsNotNone(best_hosp)
        self.assertEqual(best_hosp.name, "Apollo Hospital")
        self.assertEqual(len(ranked), 1)
