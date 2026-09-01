from django.urls import path
from .views import CalculateThreatZoneView, CompareScenariosView

urlpatterns = [
    path('calculate/', CalculateThreatZoneView.as_view(), name='threat-zone-calculate'),
    path('scenarios/', CompareScenariosView.as_view(), name='threat-zone-scenarios'),
]
