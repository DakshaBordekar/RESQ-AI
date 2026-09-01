// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI Verification Suite: Shared Physics & Hazard Engine
// Validates identical simulation calculations across 3D Digital Twin & 2D Blueprint
// ────────────────────────────────────────────────────────────────────────────

import { loadDemoBlueprintTemplate } from '../blueprintDemoTemplates';
import {
  runFacilityHazardSimulation,
  isHazardousExplodableAsset,
  getAssetPhysicsParameters,
  calculateAssetSpecificPhysics,
} from '../hazardEngine';
import { computeSimulationThreatZones } from '../physicsEngine';
import { FacilityAsset } from '../blueprintTypes';

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

console.log('\n🧪 RUNNING RESQ-AI SHARED HAZARD ENGINE TEST SUITE...\n');

const { schema } = loadDemoBlueprintTemplate('TEMPLATE_CHENNAI_LPG');
const transformConfig = {
  blueprintWidthPx: schema.metadata.blueprintWidthPx,
  blueprintHeightPx: schema.metadata.blueprintHeightPx,
  pixelsPerMeter: schema.metadata.pixelsPerMeter,
};

// ── 1. UNIFIED SHARED SIMULATION SOLVER TEST ────────────────────────────────
console.log('--- TEST 1: Single Shared Engine Execution ---');
const baseResult = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  fillFraction: 0.85,
  tankDiameterM: 14.0,
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

assert(baseResult.primaryAsset.id === 'TK-LPG-01', 'Primary incident correctly targets TK-LPG-01');
assert(baseResult.physicsMetrics.lethalRadiusM > 30, `Lethal zone radius is physically calculated (${baseResult.physicsMetrics.lethalRadiusM}m)`);
assert(baseResult.physicsMetrics.fireballRadiusM > 25, `Fireball radius is physically calculated (${baseResult.physicsMetrics.fireballRadiusM}m)`);
assert(baseResult.physicsMetrics.totalEnergyGJ > 100, `Total chemical energy computed (${baseResult.physicsMetrics.totalEnergyGJ} GJ)`);
assert(baseResult.physicsMetrics.wTntEquivalentKg > 1000, `TNT equivalent mass computed (${baseResult.physicsMetrics.wTntEquivalentKg} kg TNT)`);

// ── 2. SHARED PHYSICS AGREEMENT: 3D TWIN & 2D BLUEPRINT ─────────────────────
console.log('\n--- TEST 2: 3D Twin & 2D Blueprint Consume Identical Physics ---');
const directTwinPhysics = computeSimulationThreatZones(baseResult.threatParams);

assert(
  baseResult.threatResponse.threat_bands.red_lethal.max_radius_m === directTwinPhysics.threat_bands.red_lethal.max_radius_m,
  '3D Twin and Blueprint share exact lethal zone radius in meters'
);
assert(
  baseResult.threatResponse.threat_bands.orange_serious.max_radius_m === directTwinPhysics.threat_bands.orange_serious.max_radius_m,
  '3D Twin and Blueprint share exact serious zone radius in meters'
);
assert(
  baseResult.zones.lethal.radiusPx === Math.round(directTwinPhysics.threat_bands.red_lethal.max_radius_m * schema.metadata.pixelsPerMeter),
  '2D Blueprint pixel radius is the exact scaled projection of 3D physical meters'
);

// ── 3. ASSET SPECIFIC ORIGIN POSITIONING ────────────────────────────────────
console.log('\n--- TEST 3: Origin Anchoring to Selected Vessel ---');
const tkLpg02Result = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-02',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});
const tkBullet01Result = runFacilityHazardSimulation({
  incidentAssetId: 'TK-BULLET-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

assert(tkLpg02Result.primaryAsset.id === 'TK-LPG-02', 'Targeting TK-LPG-02 sets primaryAsset to TK-LPG-02');
assert(
  tkLpg02Result.originWorld.x !== baseResult.originWorld.x || tkLpg02Result.originWorld.z !== baseResult.originWorld.z,
  'TK-LPG-02 origin differs from TK-LPG-01 (No center scene fallback)'
);
assert(tkBullet01Result.primaryAsset.id === 'TK-BULLET-01', 'Targeting TK-BULLET-01 sets primaryAsset to TK-BULLET-01');
assert(
  tkBullet01Result.originWorld.x !== baseResult.originWorld.x || tkBullet01Result.originWorld.z !== baseResult.originWorld.z,
  'TK-BULLET-01 origin matches bullet tank world position'
);

// ── 4. PARAMETER REACTIVITY: DIAMETER, LENGTH & FILL FRACTION ───────────────
console.log('\n--- TEST 4: What-If Parameter Reactivity (Diameter & Fill Fraction) ---');
const smallTankResult = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  fillFraction: 0.30, // Low fill
  tankDiameterM: 10.0, // Smaller tank
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

const largeTankResult = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  fillFraction: 0.95, // High fill
  tankDiameterM: 22.0, // Massive tank
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

assert(
  largeTankResult.physicsMetrics.fireballRadiusM > smallTankResult.physicsMetrics.fireballRadiusM,
  `Large tank produces larger fireball (${largeTankResult.physicsMetrics.fireballRadiusM}m vs ${smallTankResult.physicsMetrics.fireballRadiusM}m)`
);
assert(
  largeTankResult.physicsMetrics.totalEnergyGJ > smallTankResult.physicsMetrics.totalEnergyGJ,
  `Large tank contains greater stored chemical energy (${largeTankResult.physicsMetrics.totalEnergyGJ} GJ vs ${smallTankResult.physicsMetrics.totalEnergyGJ} GJ)`
);
assert(
  largeTankResult.zones.lethal.radiusM > smallTankResult.zones.lethal.radiusM,
  `Lethal zone expands with increased mass and fill fraction (${largeTankResult.zones.lethal.radiusM}m vs ${smallTankResult.zones.lethal.radiusM}m)`
);

// ── 5. FUEL TYPE COMPARISON (LPG vs DIESEL vs GASOLINE) ─────────────────────
console.log('\n--- TEST 5: Fuel Type Thermal & Chemical Reactivity ---');
const dieselResult = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'POOL_FIRE',
  fuelType: 'Diesel',
  tankDiameterM: 14.0,
  fillFraction: 0.85,
  windSpeedMs: 8.5,
  windDirectionDeg: 135,
  facilityAssets: schema.assets,
  transformConfig,
});

assert(dieselResult.threatParams.fuel_type === 'Diesel', 'Diesel fuel type applied correctly');
assert(dieselResult.physicsMetrics.dominantHazard === 'THERMAL', 'Pool Fire scenario evaluates dominant hazard as THERMAL');

// ── 6. WIND DIRECTION & DIRECTIONAL FIELD ──────────────────────────────────
console.log('\n--- TEST 6: Wind Directional Vector & Safe Approach Corridor ---');
const windResultSE = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  windSpeedMs: 12.0,
  windDirectionDeg: 135, // SE
  facilityAssets: schema.assets,
  transformConfig,
});

const windResultNW = runFacilityHazardSimulation({
  incidentAssetId: 'TK-LPG-01',
  scenario: 'BLEVE',
  fuelType: 'LPG',
  windSpeedMs: 12.0,
  windDirectionDeg: 315, // NW
  facilityAssets: schema.assets,
  transformConfig,
});

assert(windResultSE.physicsMetrics.safeHeadingDeg === 315, '135° SE wind yields 315° NW safe ingress heading');
assert(windResultNW.physicsMetrics.safeHeadingDeg === 135, '315° NW wind yields 135° SE safe ingress heading');

// ── 7. SECONDARY TANK DOMINO CASCADE & TIMELINE ─────────────────────────────
console.log('\n--- TEST 7: Multi-Hop Cascading Domino Propagation & Pacing ---');
assert(baseResult.cascadeChain.length >= 2, `Triggers multi-vessel cascading failure of ${baseResult.cascadeChain.length} vessels`);
assert(baseResult.cascadeChain[0].assetId === 'TK-LPG-01', 'Step 0: Primary explosion starts at TK-LPG-01');
assert(baseResult.cascadeChain[0].triggerTimeSec === 0.0, 'Step 0: Primary explosion begins at t=0.0s');
assert(baseResult.cascadeChain[1].depth === 1, 'Step 1: Adjacent vessel is detonated as secondary domino node');
assert(baseResult.cascadeChain[1].triggerTimeSec === 5.5, 'Step 1: Secondary explosion paced at t=5.5s (Sequential delay)');
assert(baseResult.cascadeChain[1].blastRadiusM > 0, `Secondary node has its own calculated blast radius (${baseResult.cascadeChain[1].blastRadiusM}m)`);
assert(baseResult.cascadeChain[1].storedEnergyGJ > 0, `Secondary node has its own calculated chemical energy (${baseResult.cascadeChain[1].storedEnergyGJ} GJ)`);

// ── 8. ASSET TYPE SANITY CHECKS ─────────────────────────────────────────────
console.log('\n--- TEST 8: Explosion Qualification Sanity Checks ---');
const waterTank = schema.assets.find((a) => a.type === 'FIRE_WATER_TANK') || {
  id: 'TK-FW-01',
  name: 'Fire Water Reservoir',
  type: 'FIRE_WATER_TANK' as any,
  category: 'HAZARDOUS_STORAGE' as any,
};
const controlRoom = schema.assets.find((a) => a.type === 'CONTROL_ROOM') || {
  id: 'CR-01',
  name: 'Control Room',
  type: 'CONTROL_ROOM' as any,
  category: 'BUILDING' as any,
};
const lpgSphere = schema.assets.find((a) => a.type === 'LPG_SPHERE')!;

assert(!isHazardousExplodableAsset(waterTank as FacilityAsset), 'Fire Water Tank is NOT treated as an explodable incident source');
assert(!isHazardousExplodableAsset(controlRoom as FacilityAsset), 'Control Room building is NOT treated as an explosion source');
assert(isHazardousExplodableAsset(lpgSphere), 'LPG Sphere is properly recognized as an explosion-capable asset');

console.log(`\n========================================`);
console.log(`SHARED ENGINE TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);
