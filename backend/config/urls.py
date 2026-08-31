from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.views import UserViewSet
from apps.incidents.views import IncidentViewSet
from apps.resources.views import ResourceViewSet
from apps.hospitals.views import HospitalViewSet
from apps.routing.views import RoadNodeViewSet, RoadSegmentViewSet, RouteCalculateView
from apps.optimization.views import DispatchViewSet, OptimizationRunView
from apps.simulation.views import SimulationViewSet
from apps.analytics.views import AnalyticsSummaryView, ActionPlanGenerateView

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'incidents', IncidentViewSet, basename='incident')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'road-nodes', RoadNodeViewSet, basename='road-node')
router.register(r'roads', RoadSegmentViewSet, basename='road-segment')
router.register(r'dispatches', DispatchViewSet, basename='dispatch')
router.register(r'simulation', SimulationViewSet, basename='simulation')

urlpatterns = [
    path('admin/', admin.site.urls),
    # JWT Authentication
    path('api/v1/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Specific Functional Endpoints
    path('api/v1/routes/calculate/', RouteCalculateView.as_view(), name='route-calculate'),
    path('api/v1/optimization/run/', OptimizationRunView.as_view(), name='optimization-run'),
    path('api/v1/analytics/summary/', AnalyticsSummaryView.as_view(), name='analytics-summary'),
    path('api/v1/action-plan/generate/', ActionPlanGenerateView.as_view(), name='action-plan-generate'),
    # ViewSet Router
    path('api/v1/', include(router.urls)),
]
