from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.hospitals.models import Hospital
from apps.hospitals.serializers import HospitalSerializer
from apps.hospitals.services.matcher import HospitalMatcher

class HospitalViewSet(viewsets.ModelViewSet):
    queryset = Hospital.objects.all().order_by('name')
    serializer_class = HospitalSerializer

    @action(detail=False, methods=['post'], url_path='match')
    def match(self, request):
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        if lat is None or lon is None:
            return Response({'error': 'latitude and longitude are required'}, status=status.HTTP_400_BAD_REQUEST)

        needs_icu = bool(request.data.get('needs_icu', False))
        needs_trauma = bool(request.data.get('needs_trauma', False))
        needs_pediatric = bool(request.data.get('needs_pediatric', False))

        best_hosp, ranked = HospitalMatcher.match_hospital(
            float(lat), float(lon),
            needs_icu=needs_icu,
            needs_trauma=needs_trauma,
            needs_pediatric=needs_pediatric
        )

        return Response({
            'best_hospital': HospitalSerializer(best_hosp).data if best_hosp else None,
            'ranked_candidates': [
                {
                    'id': str(r['hospital'].id),
                    'name': r['hospital'].name,
                    'cost_score': r['cost_score'],
                    'dist_km': r['dist_km'],
                    'est_travel_min': r['est_travel_min'],
                    'available_beds': r['available_beds'],
                    'available_icu': r['available_icu'],
                    'status': r['status']
                }
                for r in ranked
            ]
        }, status=status.HTTP_200_OK)
