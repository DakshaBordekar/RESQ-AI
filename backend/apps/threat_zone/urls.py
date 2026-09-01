"""
Threat Zone API URL Configuration
Includes both legacy endpoints and AI Engineer 2 operational decision support endpoints.
"""

from django.urls import path
from .views import CalculateThreatZoneView, CompareScenariosView
from .views_decision import DecisionSupportView, DifferentialCompareView, SensitivityAnalysisView

urlpatterns = [
    # Legacy backward-compatible endpoints
    path('calculate/', CalculateThreatZoneView.as_view(), name='threat-zone-calculate'),
    path('scenarios/', CompareScenariosView.as_view(), name='threat-zone-scenarios'),

    # AI Engineer 2 Operational Decision Support Endpoints (RESQ-ENG-PLAN-2026-002)
    path('decision-support/', DecisionSupportView.as_view(), name='threat-zone-decision-support'),
    path('compare/', DifferentialCompareView.as_view(), name='threat-zone-compare'),
    path('sensitivity/', SensitivityAnalysisView.as_view(), name='threat-zone-sensitivity'),
]
