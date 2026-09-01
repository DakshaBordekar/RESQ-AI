// ────────────────────────────────────────────────────────────────────────────
// Automated Test Suite for RESQ-AI Mission Mode & Casualty Rescue Trade-Off
// ────────────────────────────────────────────────────────────────────────────

declare const process: any;

import {
  INITIAL_MISSION_CASUALTIES,
  updateCasualtiesFleet,
  calculateStrategyTradeoffs,
  evaluateCandidateRoutes,
  evaluateMissionModeScore,
} from '../missionEngine';

console.log('🧪 RUNNING RESQ-AI MISSION MODE & CASUALTY RESCUE TEST SUITE...\n');

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

// ── TEST 1: Initial Casualties Roster Integrity ────────────────────────────
console.log('--- 1. Casualty Roster & Initial State ---');
assert(INITIAL_MISSION_CASUALTIES.length === 5, 'Roster contains 5 facility personnel');
const cas01 = INITIAL_MISSION_CASUALTIES.find((c) => c.id === 'CAS-01');
assert(cas01 !== undefined, 'CAS-01 (Vikram Patel) found in roster');
assert(cas01!.priority === 'P1_CRITICAL', 'CAS-01 initial priority is P1_CRITICAL');
assert(cas01!.survivabilityWindowSec === 32, 'CAS-01 initial safe window is 32s');
assert(cas01!.exposureKwM2 === 18.4, 'CAS-01 exposure is 18.4 kW/m²');

// ── TEST 2: Dynamic Priority & Thermal Degradation ─────────────────────────
console.log('\n--- 2. Dynamic Priority & Thermal Degradation ---');
const updatedFleet = updateCasualtiesFleet(
  INITIAL_MISSION_CASUALTIES,
  135, // 135° SE wind
  10.0,
  1.0, // Full fire intensity
  0.0, // 0% suppression
  15.0, // 15s elapsed
  null
);

const updatedCas01 = updatedFleet.find((c) => c.id === 'CAS-01')!;
assert(updatedCas01.survivabilityWindowSec < 32, 'Survivability window decreases as time elapses');
assert(updatedCas01.priority === 'P1_CRITICAL', 'Maintains P1_CRITICAL priority under unmitigated exposure');

// Test Casualty Rescue Extraction
const rescuingFleet = updateCasualtiesFleet(
  INITIAL_MISSION_CASUALTIES,
  135,
  8.5,
  0.5,
  0.5,
  20.0,
  'CAS-01' // Active rescue target
);
const rescuedCas01 = rescuingFleet.find((c) => c.id === 'CAS-01')!;
assert(rescuedCas01.rescueProgressPct > 0, 'Active rescue target shows extraction progress');

// ── TEST 3: Strategy Trade-Off Calculation ─────────────────────────────────
console.log('\n--- 3. Tactical Strategy Trade-Offs ---');
const tradeoffs = calculateStrategyTradeoffs(135, 8.5);
assert(tradeoffs.SUPPRESS_FIRST !== undefined, 'SUPPRESS_FIRST strategy available');
assert(tradeoffs.RESCUE_FIRST !== undefined, 'RESCUE_FIRST strategy available');
assert(tradeoffs.BALANCED_RESPONSE !== undefined, 'BALANCED_RESPONSE strategy available');

assert(
  tradeoffs.SUPPRESS_FIRST.hazardContainmentPct > tradeoffs.RESCUE_FIRST.hazardContainmentPct,
  'SUPPRESS_FIRST yields higher hazard containment than RESCUE_FIRST'
);
assert(
  tradeoffs.RESCUE_FIRST.casualtiesRescuedCount > tradeoffs.SUPPRESS_FIRST.casualtiesRescuedCount,
  'RESCUE_FIRST rescues more casualties than SUPPRESS_FIRST'
);
assert(
  tradeoffs.BALANCED_RESPONSE.assetProtectionScorePct >= 90,
  'BALANCED_RESPONSE achieves >= 90% asset protection'
);

// ── TEST 4: "Why This Route?" Route Rejection Logic ───────────────────────
console.log('\n--- 4. "Why This Route?" Route Rejection & Ingress Optimization ---');
const candidateRoutes = evaluateCandidateRoutes(135, 8.5);
assert(candidateRoutes.length === 4, 'Evaluates all 4 perimeter access gates');

const recommended = candidateRoutes.find((r) => r.status === 'RECOMMENDED');
assert(recommended !== undefined, 'Has a single recommended upwind access route');
assert(recommended!.lethalZoneCrossingPct === 0, 'Recommended route has 0% lethal zone crossing');

const rejectedRoutes = candidateRoutes.filter((r) => r.status === 'REJECTED');
assert(rejectedRoutes.length === 3, 'Disqualifies 3 alternative candidate gates');
assert(
  rejectedRoutes.some((r) => r.rejectionReason?.includes('lethal')),
  'At least one rejected gate explicitly details lethal zone crossing in its rationale'
);

// ── TEST 5: Mission Scorecard & Outcome Report ─────────────────────────────
console.log('\n--- 5. Mission Scorecard Evaluation ---');
const scoreBalanced = evaluateMissionModeScore('BALANCED_RESPONSE', 4, 5, 24.5, true);
assert(scoreBalanced.overallScore >= 85, 'Balanced response with 4/5 rescued achieves >= 85 score');
assert(scoreBalanced.grade === 'A' || scoreBalanced.grade === 'A+', 'Balanced response earns Grade A/A+');
assert(scoreBalanced.outcome === 'MISSION_SUCCESS', 'Achieves MISSION_SUCCESS outcome');
assert(scoreBalanced.actionSummary.length > 0, 'Generates tactical action summary points');

const scoreFailed = evaluateMissionModeScore('SUPPRESS_FIRST', 1, 5, 45.0, false);
assert(scoreFailed.outcome === 'MISSION_FAILURE', 'Single casualty rescued with route non-compliance results in MISSION_FAILURE');

console.log(`\n========================================`);
console.log(`MISSION TEST SUMMARY: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

if (typeof process !== 'undefined' && failCount > 0) {
  (process as any).exit(1);
}
