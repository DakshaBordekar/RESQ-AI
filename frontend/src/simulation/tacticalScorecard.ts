// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Automated Emergency Response & Life-Safety Scorecard
// Evaluates tactical response performance based on response time, corridor adherence,
// staging compliance, suppression effectiveness, and prevented secondary failures.
// ────────────────────────────────────────────────────────────────────────────

import {
  MissionScorecard,
  MissionGrade,
  MissionOutcome,
  AssetRiskProfile,
} from './types';

export interface ScorecardEvaluationInput {
  responseDurationSec: number;
  enteredGateName: string;
  optimalGateName: string;
  isUpwindCorridorFollowed: boolean;
  lethalZoneCrossed: boolean;
  stagingDistanceM: number;
  recommendedStagingDistanceM: number;
  suppressionPercent: number;
  monitoredAssets: AssetRiskProfile[];
}

export const evaluateMissionScorecard = (input: ScorecardEvaluationInput): MissionScorecard => {
  const {
    responseDurationSec,
    isUpwindCorridorFollowed,
    lethalZoneCrossed,
    stagingDistanceM,
    recommendedStagingDistanceM,
    suppressionPercent,
    monitoredAssets,
  } = input;

  // 1. Response Time Score (20% weight) - Optimal response <= 18s
  let responseScore = 100;
  if (responseDurationSec > 35) {
    responseScore = Math.max(30, 100 - (responseDurationSec - 35) * 4);
  } else if (responseDurationSec > 22) {
    responseScore = Math.max(70, 100 - (responseDurationSec - 22) * 2.5);
  }

  // 2. Safe Corridor Adherence Score (25% weight) - Strict lethal avoidance
  let corridorScore = 100;
  let corridorAdherencePct = 100;
  if (lethalZoneCrossed) {
    corridorScore = 0;
    corridorAdherencePct = 15;
  } else if (!isUpwindCorridorFollowed) {
    corridorScore = 45;
    corridorAdherencePct = 50;
  }

  // 3. Staging Compliance Score (15% weight) - Staging >= 90% recommended standoff
  let stagingScore = 100;
  let stagingCompliancePct = 100;
  if (stagingDistanceM < recommendedStagingDistanceM * 0.75) {
    stagingScore = 40;
    stagingCompliancePct = 60;
  } else if (stagingDistanceM < recommendedStagingDistanceM * 0.9) {
    stagingScore = 80;
    stagingCompliancePct = 85;
  }

  // 4. Suppression Effectiveness Score (20% weight)
  const suppressionEffectivenessPct = Math.min(100, Math.max(0, suppressionPercent));
  const suppressionScore = suppressionEffectivenessPct;

  // 5. Secondary Failures Prevented Score (15% weight)
  const criticalAssets = monitoredAssets.filter(
    (a) => a.initialTimeToCriticalSec !== null
  );
  const totalSecondaryCount = criticalAssets.length || 3;
  const preventedCount = monitoredAssets.filter(
    (a) => a.coolingStatus === 'QUENCHED' || a.riskState === 'SAFE' || a.riskState === 'LOW'
  ).length;
  const secondaryProtectionScore = Math.round(
    (Math.min(preventedCount, totalSecondaryCount) / Math.max(1, totalSecondaryCount)) * 100
  );

  // 6. Critical Asset Protection Score (5% weight)
  const totalMonitoredAssetsCount = monitoredAssets.length || 8;
  const criticalProtected = monitoredAssets.filter(
    (a) => a.structuralIntegrityPct >= 80
  ).length;
  const assetProtectionScore = Math.round(
    (criticalProtected / Math.max(1, totalMonitoredAssetsCount)) * 100
  );

  // Weighted Total Calculation
  const overallScore = Math.round(
    responseScore * 0.2 +
      corridorScore * 0.25 +
      stagingScore * 0.15 +
      suppressionScore * 0.2 +
      secondaryProtectionScore * 0.15 +
      assetProtectionScore * 0.05
  );

  // Determine Letter Grade
  let grade: MissionGrade = 'F';
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 85) grade = 'B+';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  else grade = 'F';

  // Determine Mission Outcome
  let outcome: MissionOutcome = 'MISSION_SUCCESS';
  if (overallScore < 60 || lethalZoneCrossed || suppressionScore < 50) {
    outcome = 'MISSION_FAILURE';
  } else if (overallScore < 85) {
    outcome = 'PARTIAL_SUCCESS';
  }

  // Generate Summary Feedback
  let summaryFeedback = 'Optimal upwind entry corridor followed. Flame core successfully quenched with zero lethal exposures and full secondary asset protection.';
  if (outcome === 'MISSION_FAILURE') {
    summaryFeedback = 'Mission Failure: Critical exposure limits exceeded or lethal zone breached during emergency ingress.';
  } else if (outcome === 'PARTIAL_SUCCESS') {
    summaryFeedback = 'Partial Success: Primary fire suppressed with moderate thermal stress on adjacent infrastructure.';
  }

  const keyActionItems: string[] = [
    `Upwind Ingress Verification: ${corridorAdherencePct}% Compliance`,
    `Thermal Quenching Flow: 4,500 L/min deployed`,
    `Secondary Ruptures Prevented: ${preventedCount} of ${totalSecondaryCount} vulnerable tanks`,
    `Tactical Staging Standoff: ${stagingDistanceM}m maintained`,
  ];

  return {
    executionTimestamp: new Date().toLocaleTimeString(),
    responseDurationSec: Math.round(responseDurationSec * 10) / 10,
    responseScore: Math.round(responseScore),
    corridorAdherencePct,
    corridorScore: Math.round(corridorScore),
    stagingCompliancePct,
    stagingScore: Math.round(stagingScore),
    suppressionEffectivenessPct: Math.round(suppressionEffectivenessPct),
    suppressionScore: Math.round(suppressionScore),
    secondaryFailuresPreventedCount: preventedCount,
    secondaryProtectionScore,
    criticalAssetsProtectedCount: criticalProtected,
    totalMonitoredAssetsCount,
    assetProtectionScore,
    overallScore,
    grade,
    outcome,
    summaryFeedback,
    keyActionItems,
  };
};
