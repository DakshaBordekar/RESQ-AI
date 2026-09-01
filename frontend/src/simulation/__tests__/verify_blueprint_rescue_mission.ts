// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI Verification Suite: Blueprint 2D Rescue Mission Integration
// Validates shared source of truth: Blueprint Casualties, Route Optimization,
// Gate Rejection Rationale, Strategy Trade-Offs, and Scorecard Synchronization
// ────────────────────────────────────────────────────────────────────────────

import { loadDemoBlueprintTemplate } from '../blueprintDemoTemplates';
import {
  getFacilityCasualties,
  updateCasualtiesFleet,
  calculateStrategyTradeoffs,
  evaluateCandidateRoutes,
  evaluateMissionModeScore,
} from '../missionEngine';
import { worldToBlueprintCoordinates } from '../coordinateTransformer';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n🧪 RUNNING RESQ-AI BLUEPRINT RESCUE MISSION TEST SUITE...\n');

const { schema } = loadDemoBlueprintTemplate('TEMPLATE_CHENNAI_LPG');
const transformConfig = {
  blueprintWidthPx: schema.metadata.blueprintWidthPx,
  blueprintHeightPx: schema.metadata.blueprintHeightPx,
  pixelsPerMeter: schema.metadata.pixelsPerMeter,
};

// ── 1. CASUALTIES ANCHORED TO DETECTED BLUEPRINT ASSETS ─────────────────────
console.log('--- TEST 1: Blueprint-Anchored Casualty Generation ---');
const casualties = getFacilityCasualties(schema.assets);

assert(casualties.length >= 5, `Generated ${casualties.length} facility casualties for blueprint`);

casualties.forEach((cas) => {
  const pixelPos = worldToBlueprintCoordinates(cas.worldPos[0], cas.worldPos[2], transformConfig);
  assert(
    pixelPos.x >= 0 && pixelPos.x <= schema.metadata.blueprintWidthPx,
    `Casualty ${cas.id} (${cas.name}) X pixel ${pixelPos.x}px is inside blueprint bounds`
  );
  assert(
    pixelPos.y >= 0 && pixelPos.y <= schema.metadata.blueprintHeightPx,
    `Casualty ${cas.id} (${cas.name}) Y pixel ${pixelPos.y}px is inside blueprint bounds`
  );
  assert(
    schema.assets.some((a) => a.name === cas.locationName),
    `Casualty ${cas.id} location "${cas.locationName}" matches a real blueprint facility asset`
  );
});

// ── 2. CASUALTY TRIAGE & PRIORITY TIERS ─────────────────────────────────────
console.log('\n--- TEST 2: Casualty Triage & Survivability ---');
const p1List = casualties.filter((c) => c.priority === 'P1_CRITICAL');
const p2List = casualties.filter((c) => c.priority === 'P2_URGENT');
const p3List = casualties.filter((c) => c.priority === 'P3_STABLE');

assert(p1List.length >= 1, `Contains ${p1List.length} P1 Critical casualties with initial window <= 50s`);
assert(p2List.length >= 1, `Contains ${p2List.length} P2 Urgent casualties`);
assert(p3List.length >= 1, `Contains ${p3List.length} P3 Stable casualties`);

p1List.forEach((cas) => {
  assert(cas.survivabilityWindowSec <= 50, `P1 Critical ${cas.name} has tight survival window (${cas.survivabilityWindowSec}s)`);
});

// ── 3. SHARED ROUTE EXPLAINABILITY & GATE REJECTIONS ────────────────────────
console.log('\n--- TEST 3: Route Explainability & Gate Disqualifications ---');
const windDir = 135; // SE Wind
const windSpeed = 8.5;
const candidateRoutes = evaluateCandidateRoutes(windDir, windSpeed);

const recommended = candidateRoutes.find((r) => r.status === 'RECOMMENDED');
const rejected = candidateRoutes.filter((r) => r.status === 'REJECTED');

assert(recommended !== undefined, `Identified recommended ingress gate: ${recommended?.gateName}`);
assert(recommended?.lethalZoneCrossingPct === 0, 'Recommended gate has 0% lethal zone crossing');
assert(rejected.length >= 2, `Evaluated and disqualified ${rejected.length} dangerous alternative gates`);

rejected.forEach((gate) => {
  assert(
    gate.rejectionReason !== undefined && gate.rejectionReason.length > 0,
    `Rejected gate ${gate.gateName} provides explicit rejection reason: "${gate.rejectionReason}"`
  );
});

// ── 4. TACTICAL STRATEGY TRADE-OFFS ─────────────────────────────────────────
console.log('\n--- TEST 4: Tactical Strategy Trade-Offs ---');
const tradeoffs = calculateStrategyTradeoffs(windDir, windSpeed);

assert(tradeoffs.SUPPRESS_FIRST !== undefined, 'SUPPRESS FIRST strategy available');
assert(tradeoffs.BALANCED_RESPONSE !== undefined, 'BALANCED (AI) strategy available');
assert(tradeoffs.RESCUE_FIRST !== undefined, 'RESCUE FIRST strategy available');

assert(
  tradeoffs.SUPPRESS_FIRST.hazardContainmentPct > tradeoffs.RESCUE_FIRST.hazardContainmentPct,
  'Suppress First achieves higher hazard containment than Rescue First'
);
assert(
  tradeoffs.RESCUE_FIRST.casualtiesRescuedCount >= tradeoffs.SUPPRESS_FIRST.casualtiesRescuedCount,
  'Rescue First extracts equal or more casualties than Suppress First'
);
assert(
  tradeoffs.BALANCED_RESPONSE.assetProtectionScorePct >= 90,
  'Balanced Response achieves optimal >=90% asset protection'
);

// ── 5. LIVE EXTRACTION LIFECYCLE & SCORECARD ────────────────────────────────
console.log('\n--- TEST 5: Live Extraction Lifecycle & Scorecard ---');
let currentCasualties = [...casualties];
const activeId = currentCasualties[0].id;

// Simulate time step
const updated = updateCasualtiesFleet(
  currentCasualties,
  windDir,
  windSpeed,
  0.8,
  0.3,
  5.0,
  activeId
);

assert(updated.length === casualties.length, 'Maintains persistent casualty roster');

// Simulate full extraction
const extractedCasualties = casualties.map((c) => ({ ...c, extracted: true, status: 'RESCUED' as const }));
const scorecard = evaluateMissionModeScore('BALANCED_RESPONSE', 5, 5, 42.5, true);

assert(scorecard.overallScore >= 85, `Achieves high score (${scorecard.overallScore}) for 5/5 rescued`);
assert(scorecard.grade === 'A+' || scorecard.grade === 'A', `Earns Grade ${scorecard.grade}`);
assert(scorecard.outcome === 'MISSION_SUCCESS', 'Outcome is MISSION_SUCCESS');
assert(scorecard.actionSummary.length >= 3, 'Generates tactical action summary points');

console.log(`\n========================================`);
console.log(`BLUEPRINT RESCUE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);
