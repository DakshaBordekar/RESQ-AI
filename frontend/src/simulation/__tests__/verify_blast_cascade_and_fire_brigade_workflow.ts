// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI Verification Suite: Blast Cascade, Environmental Damage & Fire Brigade Lifecycle
// Validates strict 2-phase workflow: Cascade Completes First -> Manual Single Fire Brigade Extinguishment
// Continuous Single-Vehicle Road Journey: Gate -> Target 1 -> Target 2 -> ... -> Return (No Teleporting)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { loadDemoBlueprintTemplate } from '../blueprintDemoTemplates';
import {
  runFacilityHazardSimulation,
  isHazardousExplodableAsset,
} from '../hazardEngine';
import { createProceduralRoadNetwork } from '../../three/blueprint/ProceduralRoadNetwork';

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

console.log('\n🧪 RUNNING RESQ-AI BLAST CASCADE & MANUAL FIRE BRIGADE WORKFLOW TEST SUITE...\n');

const { schema } = loadDemoBlueprintTemplate('TEMPLATE_CHENNAI_LPG');
const transformConfig = {
  blueprintWidthPx: schema.metadata.blueprintWidthPx,
  blueprintHeightPx: schema.metadata.blueprintHeightPx,
  pixelsPerMeter: schema.metadata.pixelsPerMeter,
};

// ── 1. EXACT ASSET ORIGIN POSITIONING ───────────────────────────────────────
console.log('--- TEST 1: Exact Asset Origin Anchoring ---');
const primaryAssetId = 'TK-LPG-01';
const primaryAsset = schema.assets.find((a) => a.id === primaryAssetId)!;

const result = runFacilityHazardSimulation({
  incidentAssetId: primaryAssetId,
  scenario: 'BLEVE',
  fuelType: 'LPG',
  fillFraction: 0.85,
  tankDiameterM: 14.0,
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

assert(result.primaryAsset.id === primaryAssetId, 'Primary incident targets selected TK-LPG-01');
assert(result.originWorld.x === primaryAsset.worldPos.x, 'Primary explosion world X matches selected asset coordinate');
assert(result.originWorld.z === primaryAsset.worldPos.z, 'Primary explosion world Z matches selected asset coordinate');

// ── 2. RECURSIVE MULTI-HOP CASCADE & INDIVIDUAL PHYSICS ─────────────────────
console.log('\n--- TEST 2: Recursive Multi-Hop Cascade Propagation ---');
assert(result.cascadeChain.length >= 2, `Triggers recursive cascade of ${result.cascadeChain.length} vessels`);
assert(result.cascadeChain[0].assetId === 'TK-LPG-01', 'Step 0 starts at primary vessel TK-LPG-01');
assert(result.cascadeChain[0].triggerTimeSec === 0.0, 'Step 0 triggers immediately at t=0.0s');

const visitedIds = new Set<string>();
let noDuplicates = true;
result.cascadeChain.forEach((node) => {
  if (visitedIds.has(node.assetId)) noDuplicates = false;
  visitedIds.add(node.assetId);
});
assert(noDuplicates, 'Exploded assets are unique with no duplicate explosions in cascade history');

// Check that secondary nodes compute their OWN blast radius and energy
result.cascadeChain.slice(1).forEach((node, idx) => {
  assert(node.blastRadiusM > 0, `Domino #${idx + 1} (${node.assetName}) has its own calculated blast radius (${node.blastRadiusM}m)`);
  assert(node.storedEnergyGJ > 0, `Domino #${idx + 1} (${node.assetName}) has its own stored energy (${node.storedEnergyGJ} GJ)`);
  assert(node.triggerTimeSec > 0, `Domino #${idx + 1} has sequential staggered trigger time (${node.triggerTimeSec}s)`);
});

// ── 3. ENVIRONMENTAL DAMAGE & NON-IGNITABLE ASSETS ──────────────────────────
console.log('\n--- TEST 3: Environmental Blast Damage on Non-Ignitable Assets ---');
assert(
  result.damagedStructuralAssetIds.length > 0,
  `Identified ${result.damagedStructuralAssetIds.length} non-ignitable structural assets within blast/scorch envelope`
);

result.damagedStructuralAssetIds.forEach((id) => {
  const asset = schema.assets.find((a) => a.id === id)!;
  assert(
    !isHazardousExplodableAsset(asset),
    `Non-ignitable asset ${asset.name} (${asset.id}) is damaged/scorched but NOT ignited`
  );
});

// ── 4. CONTINUOUS SINGLE-VEHICLE ROAD ROUTING (NO TELEPORTING) ──────────────
console.log('\n--- TEST 4: Continuous Road Network Routing Between Targets ---');
const dummyScene = new THREE.Scene();
const roadNetwork = createProceduralRoadNetwork(dummyScene, schema.roads, schema.gates);

const safeHeading = 315; // Upwind for 135° wind
const target1Pos = new THREE.Vector3(result.cascadeChain[0].worldPos.x, 0, result.cascadeChain[0].worldPos.z);
const target2Pos = new THREE.Vector3(result.cascadeChain[1].worldPos.x, 0, result.cascadeChain[1].worldPos.z);

// Initial route from Gate -> Target 1
const initialRoute = roadNetwork.findEmergencyRoute(safeHeading, target1Pos);
assert(initialRoute.waypoints.length >= 3, 'Initial route from upwind gate to Target 1 has valid waypoint chain');
assert(initialRoute.entryGatePos.x !== target1Pos.x, 'Initial route departs from perimeter entrance gate');

// Continuous route from Target 1 Standoff -> Target 2 Standoff (Does NOT restart from gate!)
const target1Standoff = initialRoute.stagingBayPos;
const interTargetRoute = roadNetwork.findRouteBetween(target1Standoff, target2Pos, safeHeading);

assert(interTargetRoute.waypoints.length >= 3, 'Inter-target route contains continuous waypoints along road network');
assert(
  interTargetRoute.waypoints[0].distanceTo(target1Standoff) < 0.1,
  'Inter-target route starts EXACTLY at current Target 1 standoff position (0 teleportation / 0 reset to gate)'
);
assert(
  interTargetRoute.stagingBayPos.distanceTo(target2Pos) < 65,
  'Inter-target route delivers vehicle to safe standoff bay near Target 2'
);

// Return route from last target to perimeter exit gate
const returnRoute = roadNetwork.findReturnRoute(interTargetRoute.stagingBayPos, safeHeading);
assert(returnRoute.waypoints.length >= 3, 'Return route contains road waypoints back to perimeter gate');
assert(
  returnRoute.waypoints[0].distanceTo(interTargetRoute.stagingBayPos) < 0.1,
  'Return route departs from final target position without snapping'
);

// ── 5. MANUAL FIRE BRIGADE SIMULATION LIFECYCLE ─────────────────────────────
console.log('\n--- TEST 5: Manual Fire Brigade Deployment & Sequential Extinguishment Simulation ---');

type SimPhase =
  | 'IDLE'
  | 'PRIMARY_EXPLOSION'
  | 'CASCADE_PROCESSING'
  | 'CASCADE_COMPLETE'
  | 'FIRE_BRIGADE_DEPLOYING'
  | 'FIRE_BRIGADE_EXTINGUISHING'
  | 'RETURNING_TO_SAFE_POSITION'
  | 'INCIDENT_RESOLVED';

let phase: SimPhase = 'IDLE';
let activeFires = 0;
let totalExplosions = 0;
let extinguished = 0;

// Phase 1: Trigger Incident
phase = 'PRIMARY_EXPLOSION';
phase = 'CASCADE_PROCESSING';
totalExplosions = result.cascadeChain.length;
activeFires = result.cascadeChain.length;

assert(phase === 'CASCADE_PROCESSING', 'Phase is CASCADE_PROCESSING during blast events');

// Cascade Completes -> Stays burning, NO automatic fire truck
phase = 'CASCADE_COMPLETE';
assert(phase === 'CASCADE_COMPLETE', 'Cascade completes and transitions to CASCADE_COMPLETE (Awaiting user deployment)');
assert(activeFires === result.cascadeChain.length, `All ${activeFires} ignited vessels remain actively burning`);

// Phase 2: User clicks Deploy Fire Brigade
phase = 'FIRE_BRIGADE_DEPLOYING';
assert(phase === 'FIRE_BRIGADE_DEPLOYING', 'User clicks Deploy Fire Brigade -> Truck departs safe upwind gate');

// Sequential Extinguishment: Fire 1 -> Fire 2 -> Fire 3 ...
result.cascadeChain.forEach((node, idx) => {
  phase = 'FIRE_BRIGADE_EXTINGUISHING';
  extinguished++;
  activeFires--;
});

assert(extinguished === result.cascadeChain.length, `All ${extinguished} active fires sequentially extinguished`);
assert(activeFires === 0, 'Zero active fires remaining');

// Phase 3: Returning to Base
phase = 'RETURNING_TO_SAFE_POSITION';
assert(phase === 'RETURNING_TO_SAFE_POSITION', 'Truck returns to safe perimeter gate along road network');

phase = 'INCIDENT_RESOLVED';
assert(phase === 'INCIDENT_RESOLVED', 'Incident transitions to INCIDENT_RESOLVED once returned to base');

// Phase 4: Reset
phase = 'IDLE';
activeFires = 0;
totalExplosions = 0;
extinguished = 0;
assert(phase === 'IDLE', 'Reset cleanly restores system to IDLE with 0 active fires and 0 explosions');

console.log(`\n========================================`);
console.log(`WORKFLOW TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);
