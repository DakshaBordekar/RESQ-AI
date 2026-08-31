import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        COORDINATOR = 'COORDINATOR', 'Emergency Command Coordinator'
        FIELD_OFFICER = 'FIELD_OFFICER', 'Disaster Response Field Officer'
        MEDICAL_LEAD = 'MEDICAL_LEAD', 'Medical Dispatch Coordinator'
        GIS_SPECIALIST = 'GIS_SPECIALIST', 'GIS / Infrastructure Specialist'
        ADMIN = 'ADMIN', 'System Administrator'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=50, choices=Role.choices, default=Role.COORDINATOR)
    badge_number = models.CharField(max_length=50, blank=True, default='')
    phone_number = models.CharField(max_length=30, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='Command Operations')

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
