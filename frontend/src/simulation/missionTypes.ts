// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Mission Mode & Casualty Rescue Trade-Off Types
// ────────────────────────────────────────────────────────────────────────────

export type CasualtyState =
  | 'SAFE'
  | 'EXPOSED'
  | 'INJURED'
  | 'TRAPPED'
  | 'CRITICAL'
  | 'EVACUATING'
  | 'RESCUED'
  | 'LOST';

export type CasualtyPriority = 'P1_CRITICAL' | 'P2_URGENT' | 'P3_STABLE';

export type MissionStrategy =
  | 'SUPPRESS_FIRST'
  | 'RESCUE_FIRST'
  | 'BALANCED_RESPONSE';

export type MissionPhase =
  | 'PLANNING'
  | 'DISPATCHED'
  | 'APPROACHING'
  | 'STAGED'
  | 'RESCUING'
  | 'SUPPRESSING'
  | 'MISSION_COMPLETE';

export interface MissionCasualty {
  id: string;
  name: string;
  role: string;
  locationName: string;
  worldPos: [number, number, number]; // [x, y, z] in Three.js coordinates
  status: CasualtyState;
  exposureKwM2: number;
  distanceFromHazardM: number;
  survivabilityWindowSec: number;
  initialWindowSec: number;
  priority: CasualtyPriority;
  evacuationGateId: string;
  rescueProgressPct: number; // 0% to 100%
  extracted: boolean;
}

export interface CandidateRouteEvaluation {
  gateId: string;
  gateName: string;
  headingDeg: number;
  cardinal: string;
  status: 'RECOMMENDED' | 'REJECTED';
  totalDistanceM: number;
  lethalZoneCrossingPct: number;
  peakThermalExposureKwM2: number;
  estimatedTransitTimeSec: number;
  rejectionReason?: string;
  recommendationRationale?: string;
}

export interface StrategyTradeoffMetrics {
  strategy: MissionStrategy;
  title: string;
  tagline: string;
  hazardContainmentPct: number;
  casualtiesRescuedCount: number;
  totalCasualtiesCount: number;
  responderRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  secondaryEquipmentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  assetProtectionScorePct: number;
  estimatedResponseTimeSec: number;
  timeToSecondaryBleveSec: number;
  tacticalAdvantage: string;
  tacticalVulnerability: string;
}

export interface MissionEventLog {
  id: string;
  timestampSec: number;
  formattedTime: string;
  title: string;
  type: 'INCIDENT' | 'ROUTING' | 'RESCUE' | 'SUPPRESSION' | 'WARNING' | 'SUCCESS';
  description: string;
}

export interface MissionScorecardReport {
  strategyUsed: MissionStrategy;
  casualtiesRescuedCount: number;
  totalCasualtiesCount: number;
  casualtySafetyScore: number;
  responderSafetyScore: number;
  hazardContainmentScore: number;
  assetProtectionScore: number;
  routeComplianceScore: number;
  overallScore: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  outcome: 'MISSION_SUCCESS' | 'PARTIAL_SUCCESS' | 'MISSION_FAILURE';
  elapsedSec: number;
  summaryFeedback: string;
  actionSummary: string[];
}
