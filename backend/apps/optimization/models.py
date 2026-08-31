from django.db import models
from apps.core.models import TimeStampedModel
from apps.incidents.models import Incident
from apps.resources.models import Resource
from apps.hospitals.models import Hospital

class Dispatch(TimeStampedModel):
    class Status(models.TextChoices):
        PROPOSED = 'PROPOSED', 'Proposed Assignment'
        APPROVED = 'APPROVED', 'Approved by Coordinator'
        DISPATCHED = 'DISPATCHED', 'Unit Dispatched'
        COMPLETED = 'COMPLETED', 'Operation Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name='dispatches')
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name='dispatches')
    target_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_dispatches')
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PROPOSED, db_index=True)
    route_geometry = models.JSONField(default=list) # e.g. [[lat, lon], ...]
    distance_km = models.FloatField(default=0.0)
    eta_minutes = models.FloatField(default=0.0)
    mathematical_rationale = models.JSONField(default=dict)
    narrative_explanation = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispatch #{self.id.hex[:6]} - {self.resource.call_sign} -> {self.incident.title} [{self.status}]"
