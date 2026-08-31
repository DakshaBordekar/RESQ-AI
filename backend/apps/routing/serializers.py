from rest_framework import serializers
from apps.routing.models import RoadNode, RoadSegment

class RoadNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadNode
        fields = ['id', 'node_index', 'name', 'latitude', 'longitude']

class RoadSegmentSerializer(serializers.ModelSerializer):
    source_node_index = serializers.IntegerField(source='source_node.node_index', read_only=True)
    target_node_index = serializers.IntegerField(source='target_node.node_index', read_only=True)
    source_coords = serializers.SerializerMethodField()
    target_coords = serializers.SerializerMethodField()

    class Meta:
        model = RoadSegment
        fields = [
            'id', 'name', 'source_node', 'target_node',
            'source_node_index', 'target_node_index',
            'source_coords', 'target_coords',
            'length_km', 'base_speed_kmh', 'hazard_multiplier',
            'water_depth_cm', 'status', 'is_two_way'
        ]

    def get_source_coords(self, obj):
        return [obj.source_node.latitude, obj.source_node.longitude]

    def get_target_coords(self, obj):
        return [obj.target_node.latitude, obj.target_node.longitude]
