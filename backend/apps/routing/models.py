from django.db import models
from apps.core.models import TimeStampedModel

class RoadNode(TimeStampedModel):
    node_index = models.PositiveIntegerField(unique=True, db_index=True)
    name = models.CharField(max_length=150, blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()

    class Meta:
        ordering = ['node_index']

    def __str__(self):
        return f"Node #{self.node_index} - {self.name} ({self.latitude:.4f}, {self.longitude:.4f})"


class RoadSegment(TimeStampedModel):
    class Status(models.TextChoices):
        CLEAR = 'CLEAR', 'Clear'
        CONGESTED = 'CONGESTED', 'Congested'
        WATERLOGGED = 'WATERLOGGED', 'Waterlogged (Slow Passage)'
        BLOCKED = 'BLOCKED', 'Blocked / Submerged'

    name = models.CharField(max_length=150, blank=True, default='')
    source_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name='outgoing_segments')
    target_node = models.ForeignKey(RoadNode, on_delete=models.CASCADE, related_name='incoming_segments')
    length_km = models.FloatField(default=1.0)
    base_speed_kmh = models.FloatField(default=40.0)
    hazard_multiplier = models.FloatField(default=1.0)
    water_depth_cm = models.FloatField(default=0.0)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CLEAR, db_index=True)
    is_two_way = models.BooleanField(default=True)

    class Meta:
        ordering = ['name', 'id']

    def __str__(self):
        return f"Road '{self.name}' ({self.source_node.node_index} -> {self.target_node.node_index}) [{self.status}]"

    @property
    def traversal_time_minutes(self) -> float:
        if self.status == self.Status.BLOCKED:
            return float('inf')
        speed = self.base_speed_kmh
        if self.status == self.Status.CONGESTED:
            speed = max(10.0, speed * 0.5)
        elif self.status == self.Status.WATERLOGGED:
            speed = max(5.0, speed * 0.25)
        return (self.length_km / speed) * 60.0
