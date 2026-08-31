from django.db import models
from apps.core.models import TimeStampedModel

class Hospital(TimeStampedModel):
    class Status(models.TextChoices):
        ACCEPTING = 'ACCEPTING', 'Accepting Casualties'
        DIVERT_SURGE = 'DIVERT_SURGE', 'Surge Warning (Near Capacity)'
        DIVERT_FULL = 'DIVERT_FULL', 'Full - Diverting Inbound'
        OFFLINE = 'OFFLINE', 'Offline / Power Loss'

    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True, default='')
    latitude = models.FloatField()
    longitude = models.FloatField()
    total_beds = models.PositiveIntegerField(default=100)
    available_beds = models.PositiveIntegerField(default=20)
    total_icu = models.PositiveIntegerField(default=20)
    available_icu = models.PositiveIntegerField(default=5)
    has_trauma_bay = models.BooleanField(default=True)
    has_burn_unit = models.BooleanField(default=False)
    has_pediatric = models.BooleanField(default=True)
    has_blood_bank = models.BooleanField(default=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACCEPTING, db_index=True)
    contact_phone = models.CharField(max_length=50, blank=True, default='')

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} [{self.status}] (Beds: {self.available_beds}/{self.total_beds}, ICU: {self.available_icu}/{self.total_icu})"

    @property
    def occupancy_percentage(self) -> float:
        if self.total_beds == 0:
            return 100.0
        occupied = self.total_beds - self.available_beds
        return round((occupied / self.total_beds) * 100.0, 1)


class HospitalCapacity(TimeStampedModel):
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='capacity_logs')
    occupied_general = models.PositiveIntegerField()
    occupied_icu = models.PositiveIntegerField()
    divert_active = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')

    class Meta:
        ordering = ['-created_at']
