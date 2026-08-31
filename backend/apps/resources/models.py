from django.db import models
from apps.core.models import TimeStampedModel

class Resource(TimeStampedModel):
    class ResourceType(models.TextChoices):
        AMBULANCE_BLS = 'AMBULANCE_BLS', 'Basic Life Support Ambulance'
        AMBULANCE_ALS = 'AMBULANCE_ALS', 'Advanced Life Support Ambulance'
        RESCUE_BOAT = 'RESCUE_BOAT', 'Inflatable Flood Rescue Boat'
        NDRF_TEAM = 'NDRF_TEAM', 'NDRF Tactical Rescue Team'
        FIRE_ENGINE = 'FIRE_ENGINE', 'Heavy Fire Tender'
        EVACUATION_BUS = 'EVACUATION_BUS', 'Evacuation Transit Bus'

    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Available'
        ASSIGNED = 'ASSIGNED', 'Assigned'
        EN_ROUTE_INCIDENT = 'EN_ROUTE_INCIDENT', 'En Route to Incident'
        ON_SCENE = 'ON_SCENE', 'On Scene'
        TRANSPORTING_HOSPITAL = 'TRANSPORTING_HOSPITAL', 'Transporting to Hospital'
        RETURNING = 'RETURNING', 'Returning to Base'
        OFFLINE = 'OFFLINE', 'Offline / Maintenance'

    name = models.CharField(max_length=100)
    call_sign = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=50, choices=ResourceType.choices, default=ResourceType.AMBULANCE_BLS)
    status = models.CharField(max_length=50, choices=Status.choices, default=Status.AVAILABLE, db_index=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    capacity = models.PositiveIntegerField(default=4)
    capabilities = models.JSONField(default=list) # e.g. ["WATER_RESCUE", "OXYGEN", "VENTILATOR", "PARAMEDIC"]
    contact_radio = models.CharField(max_length=50, blank=True, default='CH-04')
    base_station = models.CharField(max_length=150, blank=True, default='Central Station')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.call_sign} ({self.get_type_display()}) - [{self.status}]"


class ResourceCapability(TimeStampedModel):
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.name} ({self.code})"
