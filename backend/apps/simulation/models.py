from django.db import models
from apps.core.models import TimeStampedModel

class SimulationScenario(TimeStampedModel):
    name = models.CharField(max_length=200, default='Operation Chennai Deluge 2026')
    description = models.TextField(blank=True, default='')
    tick_minutes = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    weather_condition = models.CharField(max_length=100, default='HEAVY_DOWNPOUR')
    water_level_multiplier = models.FloatField(default=1.0)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (Tick: +{self.tick_minutes}m, Active: {self.is_active})"


class SimulationEvent(TimeStampedModel):
    class EventType(models.TextChoices):
        ROAD_BLOCKED = 'ROAD_BLOCKED', 'Road / Bridge Blocked'
        HOSPITAL_SURGE = 'HOSPITAL_SURGE', 'Hospital Saturation Divert'
        NEW_INCIDENT = 'NEW_INCIDENT', 'Surge Incident Burst'
        RESOURCE_FAILURE = 'RESOURCE_FAILURE', 'Resource Breakdown'
        WEATHER_ESCALATED = 'WEATHER_ESCALATED', 'Rainfall / Flood Escalation'

    scenario = models.ForeignKey(SimulationScenario, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=50, choices=EventType.choices)
    title = models.CharField(max_length=200)
    details = models.JSONField(default=dict)
    is_applied = models.BooleanField(default=False)
    simulated_minute = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['simulated_minute', 'created_at']

    def __str__(self):
        return f"[{self.event_type}] {self.title} (Applied: {self.is_applied})"
