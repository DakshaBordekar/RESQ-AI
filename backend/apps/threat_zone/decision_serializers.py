"""
RESQ-ENG-PLAN-2026-002 — Decision Support DRF Serializers (Phase 9)
Validates input requests for decision support, scenario comparison, and sensitivity evaluation.
"""

from rest_framework import serializers


class ScenarioInputSerializer(serializers.Serializer):
    facility_name = serializers.CharField(required=False, default="Industrial Facility")
    latitude = serializers.FloatField(required=True, min_value=-90.0, max_value=90.0)
    longitude = serializers.FloatField(required=True, min_value=-180.0, max_value=180.0)
    tank_geometry = serializers.ChoiceField(
        choices=["VERTICAL_CYLINDER", "SPHERE", "HORIZONTAL_CYLINDER"],
        default="VERTICAL_CYLINDER"
    )
    tank_diameter_m = serializers.FloatField(required=False, default=15.0, min_value=0.1, max_value=200.0)
    tank_height_m = serializers.FloatField(required=False, default=10.0, min_value=0.1, max_value=100.0)
    fill_fraction = serializers.FloatField(required=False, default=0.80, min_value=0.01, max_value=1.0)
    fuel_type = serializers.ChoiceField(
        choices=["LPG", "LNG", "DIESEL", "GASOLINE", "CRUDE_OIL", "ETHANOL"],
        default="LPG"
    )
    explosion_yield_factor = serializers.FloatField(required=False, default=0.04, min_value=0.001, max_value=0.50)
    bund_present = serializers.BooleanField(required=False, default=False)
    bund_diameter_m = serializers.FloatField(required=False, allow_null=True, min_value=0.1)
    wind_speed_ms = serializers.FloatField(required=False, default=5.0, min_value=0.0, max_value=50.0)
    wind_direction_deg = serializers.FloatField(required=False, default=135.0, min_value=0.0, max_value=360.0)
    ambient_temperature_k = serializers.FloatField(required=False, default=298.15, min_value=200.0, max_value=350.0)
    relative_humidity = serializers.FloatField(required=False, default=0.50, min_value=0.0, max_value=1.0)


class DecisionOptionsSerializer(serializers.Serializer):
    compute_sensitivity = serializers.BooleanField(required=False, default=True)
    compute_uncertainty = serializers.BooleanField(required=False, default=True)
    generate_explanation = serializers.BooleanField(required=False, default=True)


class DecisionSupportRequestSerializer(serializers.Serializer):
    scenario = ScenarioInputSerializer(required=True)
    options = DecisionOptionsSerializer(required=False, default=dict)


class DifferentialCompareRequestSerializer(serializers.Serializer):
    scenario_a = ScenarioInputSerializer(required=True)
    scenario_b = ScenarioInputSerializer(required=True)


class SensitivityRequestSerializer(serializers.Serializer):
    scenario = ScenarioInputSerializer(required=True)
