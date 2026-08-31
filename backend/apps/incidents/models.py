from django.db import models
from apps.core.models import TimeStampedModel
from django.utils import timezone

class Incident(TimeStampedModel):
    class HazardType(models.TextChoices):
        FLOOD = 'FLOOD', 'Urban Flood'
        FIRE = 'FIRE', 'Fire Hazard'
        MEDICAL = 'MEDICAL', 'Medical Emergency'
        STRUCTURAL = 'STRUCTURAL_COLLAPSE', 'Structural Collapse'

    class PriorityTier(models.TextChoices):
        CRITICAL = 'CRITICAL', 'Tier 1 - Critical'
        HIGH = 'HIGH', 'Tier 2 - High'
        MEDIUM = 'MEDIUM', 'Tier 3 - Medium'
        LOW = 'LOW', 'Tier 4 - Low'

    class Status(models.TextChoices):
        REPORTED = 'REPORTED', 'Reported'
        PARSED = 'PARSED', 'AI Parsed'
        TRIAGED = 'TRIAGED', 'Triaged'
        DISPATCHED = 'DISPATCHED', 'Dispatched'
        ON_SCENE = 'ON_SCENE', 'On Scene'
        RESOLVED = 'RESOLVED', 'Resolved'
        CANCELLED = 'CANCELLED', 'Cancelled'

    title = models.CharField(max_length=255)
    raw_text = models.TextField(blank=True, default='')
    location_name = models.CharField(max_length=255)
    latitude = models.FloatField(db_index=True)
    longitude = models.FloatField(db_index=True)
    hazard_type = models.CharField(max_length=50, choices=HazardType.choices, default=HazardType.FLOOD)
    people_affected = models.PositiveIntegerField(default=1)
    vulnerable_people = models.PositiveIntegerField(default=0)
    vulnerability_flags = models.JSONField(default=list) # e.g. ["ELDERLY", "INFANT", "DIALYSIS"]
    medical_need = models.BooleanField(default=False)
    mobility_status = models.CharField(max_length=50, default='AMBULATORY') # TRAPPED, LIMITED, AMBULATORY
    urgency = models.CharField(max_length=50, default='URGENT') # IMMEDIATE, URGENT, MODERATE
    calculated_priority = models.FloatField(default=0.0, db_index=True)
    priority_tier = models.CharField(max_length=20, choices=PriorityTier.choices, default=PriorityTier.MEDIUM)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.REPORTED, db_index=True)
    reporter_name = models.CharField(max_length=150, blank=True, default='Citizen')
    reporter_phone = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        ordering = ['-calculated_priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'calculated_priority']),
            models.Index(fields=['latitude', 'longitude']),
        ]

    def __str__(self):
        return f"[{self.priority_tier}] #{self.id.hex[:6]} - {self.title} ({self.calculated_priority:.1f})"

    @property
    def age_minutes(self) -> float:
        delta = timezone.now() - self.created_at
        return delta.total_seconds() / 60.0


class IncidentVictim(TimeStampedModel):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='victims')
    category = models.CharField(max_length=100, default='General Adult') # e.g. "Senior Citizen", "Child", "Dialysis Patient"
    count = models.PositiveIntegerField(default=1)
    special_condition = models.CharField(max_length=255, blank=True, default='')

    def __str__(self):
        return f"{self.count}x {self.category} for Incident {self.incident_id}"
