"""
RESQ-ENG-PLAN-2026-002 — Decision Support DRF API Views (Phase 9)
Exposes REST endpoints for operational triage, differential scenario comparison, and sensitivity analysis.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from apps.threat_zone.decision_serializers import (
    DecisionSupportRequestSerializer,
    DifferentialCompareRequestSerializer,
    SensitivityRequestSerializer,
)
from apps.threat_zone.decision_engine.service import (
    compute_decision_support_report,
    compute_differential_comparison,
)
from apps.threat_zone.decision_engine.sensitivity_engine import evaluate_sensitivity_analysis
from apps.threat_zone.physics_engine.pipeline import run_hazard_model
from apps.threat_zone.physics_engine.core.exceptions import PhysicsEngineException

logger = logging.getLogger(__name__)


class DecisionSupportView(APIView):
    """
    POST /api/threat-zone/decision-support/
    Generates multi-factor severity triage, 16-sector ingress intelligence,
    sensitivity gradients, uncertainty safety buffers, and explainability audit trails.
    """
    def post(self, request):
        serializer = DecisionSupportRequestSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        scenario_data = serializer.validated_data["scenario"]
        options = serializer.validated_data.get("options", {})

        try:
            report_dto = compute_decision_support_report(
                scenario_data=scenario_data,
                compute_sensitivity=options.get("compute_sensitivity", True),
                compute_uncertainty=options.get("compute_uncertainty", True),
                generate_explanation=options.get("generate_explanation", True),
            )
            return Response(report_dto.to_dict(), status=status.HTTP_200_OK)
        except PhysicsEngineException as pe:
            return Response({"error": pe.message, "details": pe.details}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Decision support computation failure")
            return Response({"error": "Internal decision engine calculation failure", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DifferentialCompareView(APIView):
    """
    POST /api/threat-zone/compare/
    Executes analytical physics-informed comparison between two distinct scenarios (e.g. Facility A vs B).
    """
    def post(self, request):
        serializer = DifferentialCompareRequestSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        scenario_a = serializer.validated_data["scenario_a"]
        scenario_b = serializer.validated_data["scenario_b"]

        try:
            comparison_dto = compute_differential_comparison(scenario_a, scenario_b)
            return Response(comparison_dto.to_dict(), status=status.HTTP_200_OK)
        except PhysicsEngineException as pe:
            return Response({"error": pe.message, "details": pe.details}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Scenario comparison failure")
            return Response({"error": "Internal comparison engine failure", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SensitivityAnalysisView(APIView):
    """
    POST /api/threat-zone/sensitivity/
    Performs deterministic parameter perturbation sweep over tank dimensions, fill, wind, and yield.
    """
    def post(self, request):
        serializer = SensitivityRequestSerializer(data=request.data or {})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        scenario_data = serializer.validated_data["scenario"]
        try:
            res = run_hazard_model(scenario_data, include_spatial_grid=False, run_monte_carlo=False)
            sens_dto = evaluate_sensitivity_analysis(scenario_data, res)
            return Response(sens_dto.to_dict(), status=status.HTTP_200_OK)
        except PhysicsEngineException as pe:
            return Response({"error": pe.message, "details": pe.details}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Sensitivity analysis failure")
            return Response({"error": "Internal sensitivity engine failure", "details": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
