from django.test import TestCase
from apps.ai.services.llm_bridge import LocalMockProvider

class AIExtractionTestCase(TestCase):
    def test_local_mock_extraction(self):
        provider = LocalMockProvider()
        text = "My elderly grandmother and child are trapped on 2nd floor near Velachery with water entering the house."
        res = provider.extract_incident(text)
        
        self.assertEqual(res['hazard_type'], 'FLOOD')
        self.assertEqual(res['severity'], 'CRITICAL')
        self.assertIn('ELDERLY', res['vulnerability_flags'])
        self.assertEqual(res['mobility_status'], 'TRAPPED')
        self.assertIn('Velachery', res['location_name'])
