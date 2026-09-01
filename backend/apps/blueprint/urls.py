from django.urls import path
from .views import BlueprintAnalyzeView, BlueprintCorrectionView

urlpatterns = [
    path('analyze/', BlueprintAnalyzeView.as_view(), name='blueprint-analyze'),
    path('correction/', BlueprintCorrectionView.as_view(), name='blueprint-correction'),
]
