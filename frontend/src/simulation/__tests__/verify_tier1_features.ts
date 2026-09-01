// ────────────────────────────────────────────────────────────────────────────
// Automated Test Suite for Tier-1 Hackathon Features (F01 - F05)
// ────────────────────────────────────────────────────────────────────────────

declare const process: any;

import {
  getDownwindVector,
  getSafeApproachVector,
  getSafeApproachHeading,
  getCardinalDirection,
} from '../../three/utils/coordinateMath';
import {
  evaluateAssetRiskFleet,
  MONITORED_FACILITY_ASSETS,
} from '../assetRiskEngine';
import { generateTacticalExplainability } from '../explainabilitySolver';
import { evaluateMissionScorecard } from '../tacticalScorecard';

console.log('🧪 RUNNING RESQ-AI TIER-1 FEATURE TEST SUITE...\n');

let passCount = 0;
let failCount = 0;

const assert = (condition: boolean, testName: string) => {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failCount++;
  }
};

// ── TEST 1: F01 Wind & Safe Corridor Math ──────────────────────────────────
console.log('--- 1. Wind & Reciprocal Corridor Math (F01) ---');
assert(getSafeApproachHeading(135) === 315, '135° SE wind yields 315° NW safe approach');
assert(getSafeApproachHeading(58) === 238, '58° NE wind yields 238° SW safe approach');
assert(getSafeApproachHeading(0) === 180, '0° N wind yields 180° S safe approach');
assert(getSafeApproachHeading(270) === 90, '270° W wind yields 90° E safe approach');
assert(getCardinalDirection(135) === 'SE', '135° resolves to SE cardinal');
assert(getCardinalDirection(315) === 'NW', '315° resolves to NW cardinal');

const downwind135 = getDownwindVector(135);
const upwind135 = getSafeApproachVector(135);
assert(Math.abs(downwind135.x + upwind135.x) < 0.001, 'Downwind and upwind X vectors are polar opposites');
assert(Math.abs(downwind135.z + upwind135.z) < 0.001, 'Downwind and upwind Z vectors are polar opposites');

// ── TEST 2: F03 Cascading Domino Effect & Asset Risk Engine ─────────────────
console.log('\n--- 2. Cascading Domino Effect & Asset Risk Engine (F03) ---');
const unsuppressedFleet = evaluateAssetRiskFleet({
  incidentType: 'FACILITY_A_LPG',
  incidentPhase: 'FIREBALL_PEAK',
  sourceRadiantPowerMw: 240,
  flameRadiusM: 38,
  flameTiltDeg: 30,
  windDirDeg: 135,
  windSpeedMs: 8.5,
  fireIntensityFactor: 1.0,
  isWaterAttackActive: false,
  waterSuppressionProgress: 0.0,
  elapsedSimulationSec: 8.0,
});

assert(unsuppressedFleet.length === 8, 'Evaluates all 8 monitored petrochemical assets');
const tkLpg02 = unsuppressedFleet.find((a) => a.id === 'TK-LPG-02');
assert(tkLpg02 !== undefined, 'TK-LPG-02 found in fleet');
assert(tkLpg02!.thermalFluxKwM2 > 4.0, 'TK-LPG-02 receives significant radiant heat flux during active BLEVE');
assert(tkLpg02!.riskState !== 'SAFE', 'TK-LPG-02 transitions out of SAFE state during active fire');
assert(tkLpg02!.timeToCriticalSec !== null && tkLpg02!.timeToCriticalSec > 0, 'TK-LPG-02 has active countdown to secondary failure');

// Test Cooling Water Recovery
const cooledFleet = evaluateAssetRiskFleet({
  incidentType: 'FACILITY_A_LPG',
  incidentPhase: 'WATER_ATTACK',
  sourceRadiantPowerMw: 240,
  flameRadiusM: 38,
  flameTiltDeg: 30,
  windDirDeg: 135,
  windSpeedMs: 8.5,
  fireIntensityFactor: 0.2,
  isWaterAttackActive: true,
  waterSuppressionProgress: 0.8,
  elapsedSimulationSec: 25.0,
});

const cooledTk02 = cooledFleet.find((a) => a.id === 'TK-LPG-02');
assert(cooledTk02!.coolingStatus === 'COOLING_ENGAGED', 'TK-LPG-02 shows COOLING_ENGAGED');
assert(cooledTk02!.thermalFluxKwM2 < tkLpg02!.thermalFluxKwM2, 'Thermal flux on TK-LPG-02 is reduced by water suppression');

// ── TEST 3: F02 AI Tactical Explainability ─────────────────────────────────
console.log('\n--- 3. AI Tactical Explainability (F02) ---');
const explainReport = generateTacticalExplainability(null, {
  facility_type: 'FACILITY_A_LPG',
  latitude: 13.03,
  longitude: 80.235,
  mass_kg: 40000,
  pool_diameter_m: 24,
  fill_fraction: 0.85,
  tank_diameter_m: 14,
  tank_volume_m3: 80,
  fuel_type: 'LPG',
  wind_speed_ms: 10.0,
  wind_direction_deg: 58,
});

assert(explainReport.downwindHeadingDeg === 58, 'Explainability reflects 58° downwind');
assert(explainReport.safeHeadingDeg === 238, 'Explainability recommends 238° SW upwind corridor');
assert(explainReport.ingressRationale.includes('238°'), 'Ingress rationale articulates safe heading');
assert(explainReport.waterFlowRequirementLpm === 4500, 'Water quenching flow rate specifies 4,500 L/min');

// ── TEST 4: F05 Automated Emergency Response Scorecard ─────────────────────
console.log('\n--- 4. Automated Emergency Response Scorecard (F05) ---');
const perfectScorecard = evaluateMissionScorecard({
  responseDurationSec: 15.2,
  enteredGateName: 'GATE_WEST',
  optimalGateName: 'GATE_WEST',
  isUpwindCorridorFollowed: true,
  lethalZoneCrossed: false,
  stagingDistanceM: 78,
  recommendedStagingDistanceM: 75,
  suppressionPercent: 100,
  monitoredAssets: cooledFleet,
});

assert(perfectScorecard.grade === 'A+', 'Optimal mission execution achieves Grade A+');
assert(perfectScorecard.outcome === 'MISSION_SUCCESS', 'Optimal mission is MISSION_SUCCESS');
assert(perfectScorecard.overallScore >= 95, 'Overall score is >= 95');

const failedScorecard = evaluateMissionScorecard({
  responseDurationSec: 45.0,
  enteredGateName: 'GATE_EAST',
  optimalGateName: 'GATE_WEST',
  isUpwindCorridorFollowed: false,
  lethalZoneCrossed: true,
  stagingDistanceM: 40,
  recommendedStagingDistanceM: 75,
  suppressionPercent: 40,
  monitoredAssets: unsuppressedFleet,
});

assert(failedScorecard.grade === 'F', 'Breaching lethal zone and failing suppression yields Grade F');
assert(failedScorecard.outcome === 'MISSION_FAILURE', 'Failed mission is MISSION_FAILURE');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

if (typeof process !== 'undefined' && failCount > 0) {
  (process as any).exit(1);
}
