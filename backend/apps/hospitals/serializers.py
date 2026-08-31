from rest_framework import serializers
from apps.hospitals.models import Hospital, HospitalCapacity

class HospitalCapacitySerializer(serializers.ModelSerializer):
    class Meta:
        model = HospitalCapacity
        fields = ['id', 'occupied_general', 'occupied_icu', 'divert_active', 'notes', 'created_at']

class HospitalSerializer(serializers.ModelSerializer):
    occupancy_percentage = serializers.FloatField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'address', 'latitude', 'longitude',
            'total_beds', 'available_beds', 'total_icu', 'available_icu',
            'has_trauma_bay', 'has_burn_unit', 'has_pediatric', 'has_blood_bank',
            'status', 'status_display', 'occupancy_percentage', 'contact_phone',
            'created_at', 'updated_at'
        ]
