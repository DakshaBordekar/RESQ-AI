from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.incidents.models import Incident
from apps.incidents.serializers import IncidentSerializer
from apps.incidents.services.priority_engine import PriorityEngine
from apps.ai.services.llm_bridge import LLMBridgeService

class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.all().order_by('-calculated_priority', '-created_at')
    serializer_class = IncidentSerializer

    def perform_create(self, serializer):
        incident = serializer.save()
        score, tier = PriorityEngine.calculate_score(incident)
        incident.calculated_priority = score
        incident.priority_tier = tier
        incident.save()

    @action(detail=False, methods=['post'], url_path='analyze-text')
    def analyze_text(self, request):
        raw_text = request.data.get('raw_text', '')
        if not raw_text:
            return Response({'error': 'raw_text parameter is required'}, status=status.HTTP_400_BAD_REQUEST)

        provider = LLMBridgeService.get_provider()
        try:
            extracted_data = provider.extract_incident(raw_text)
            return Response(extracted_data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='recalculate-priority')
    def recalculate_priority(self, request, pk=None):
        incident = self.get_object()
        score, tier = PriorityEngine.calculate_score(incident)
        incident.calculated_priority = score
        incident.priority_tier = tier
        incident.save()
        return Response({
            'id': str(incident.id),
            'calculated_priority': incident.calculated_priority,
            'priority_tier': incident.priority_tier
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-inject')
    def bulk_inject(self, request):
        """Injects a standard burst of 5 diverse disaster incidents for testing/demo."""
        sample_reports = [
            {
                'title': '3 Elderly Persons Trapped on Terrace, Water at 5ft',
                'raw_text': 'My grandmother and 2 other senior citizens are trapped on the terrace near Velachery Lake. Water reached 5ft.',
                'location_name': 'Velachery Lake Sector',
                'latitude': 12.9785,
                'longitude': 80.2210,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 3,
                'vulnerable_people': 3,
                'vulnerability_flags': ['ELDERLY'],
                'medical_need': True,
                'mobility_status': 'TRAPPED',
                'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Dialysis Patient in Respiratory Distress',
                'raw_text': 'Dialysis patient stranded without power, difficulty breathing near Saidapet.',
                'location_name': 'Saidapet Canal Road',
                'latitude': 13.0180,
                'longitude': 80.2250,
                'hazard_type': Incident.HazardType.MEDICAL,
                'people_affected': 1,
                'vulnerable_people': 1,
                'vulnerability_flags': ['DIALYSIS', 'ELDERLY'],
                'medical_need': True,
                'mobility_status': 'LIMITED',
                'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'School Bus Stranded in Underpass',
                'raw_text': 'School van stranded with 8 children in flooded Guindy railway underpass.',
                'location_name': 'Guindy Railway Underpass',
                'latitude': 13.0080,
                'longitude': 80.2080,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 8,
                'vulnerable_people': 8,
                'vulnerability_flags': ['INFANT'],
                'medical_need': False,
                'mobility_status': 'TRAPPED',
                'urgency': 'IMMEDIATE',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Electrical Transformer Sparking in Water',
                'raw_text': 'Transformer sparking with high risk of electrocution near Adyar signal.',
                'location_name': 'Adyar Signal Junction',
                'latitude': 13.0030,
                'longitude': 80.2540,
                'hazard_type': Incident.HazardType.FIRE,
                'people_affected': 4,
                'vulnerable_people': 0,
                'vulnerability_flags': [],
                'medical_need': False,
                'mobility_status': 'AMBULATORY',
                'urgency': 'URGENT',
                'status': Incident.Status.TRIAGED
            },
            {
                'title': 'Food and Clean Water Shortage in Community Hall',
                'raw_text': 'About 15 people sheltered on first floor need drinking water and food.',
                'location_name': 'Mylapore Community Center',
                'latitude': 13.0360,
                'longitude': 80.2670,
                'hazard_type': Incident.HazardType.FLOOD,
                'people_affected': 15,
                'vulnerable_people': 2,
                'vulnerability_flags': ['ELDERLY'],
                'medical_need': False,
                'mobility_status': 'AMBULATORY',
                'urgency': 'MODERATE',
                'status': Incident.Status.TRIAGED
            }
        ]

        created = []
        for r in sample_reports:
            inc = Incident.objects.create(**r)
            score, tier = PriorityEngine.calculate_score(inc)
            inc.calculated_priority = score
            inc.priority_tier = tier
            inc.save()
            created.append(IncidentSerializer(inc).data)

        return Response({'injected_count': len(created), 'incidents': created}, status=status.HTTP_201_CREATED)
