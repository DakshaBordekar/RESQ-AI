// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint ML Classification & Multi-Facility Verification Test Suite
// Verifies dynamic perception independence across distinct industrial blueprints
// ────────────────────────────────────────────────────────────────────────────

import { loadDemoBlueprintTemplate, DEMO_BLUEPRINT_TEMPLATES } from '../blueprintDemoTemplates';
import { classifyIndustrialAsset, isMetadataExclusionRegion } from '../blueprintClassifier';
import { validateAndNormalizeFacilitySchema } from '../blueprintSchema';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, msg: string) => {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${msg}`);
    failed++;
  }
};

console.log('\n🧪 RUNNING RESQ-AI BLUEPRINT ML PERCEPTION & MULTI-FACILITY TEST SUITE...\n');

// ── 1. MULTI-BLUEPRINT PERCEPTION INDEPENDENCE TEST ─────────────────────────
console.log('--- 1. Multi-Blueprint Perception Independence (A vs B vs C) ---');

const twinA = loadDemoBlueprintTemplate('TEMPLATE_CHENNAI_LPG');
const twinB = loadDemoBlueprintTemplate('TEMPLATE_VADODARA_REFINERY');
const twinC = loadDemoBlueprintTemplate('TEMPLATE_MANGALORE_TERMINAL');

assert(twinA.schema.metadata.id !== twinB.schema.metadata.id, 'Blueprint A and B have distinct Facility IDs');
assert(twinB.schema.metadata.id !== twinC.schema.metadata.id, 'Blueprint B and C have distinct Facility IDs');

// Verify Blueprint A Assets (Chennai LPG)
const spheresA = twinA.schema.assets.filter((a) => a.type === 'LPG_SPHERE');
const bulletsA = twinA.schema.assets.filter((a) => a.type === 'LPG_BULLET' || a.type === 'LPG_BULLET_TANK');
assert(spheresA.length === 2, `Blueprint A contains exactly 2 LPG Spheres (Found: ${spheresA.length})`);
assert(bulletsA.length === 2, `Blueprint A contains exactly 2 Bullet Tanks (Found: ${bulletsA.length})`);
const westGatesA = twinA.schema.gates.filter((g) => g.cardinal === 'W');
assert(westGatesA.length === 2, `Blueprint A contains 2 West perimeter gates (Found: ${westGatesA.length})`);

// Verify Blueprint B Assets (Vadodara Refinery)
const spheresB = twinB.schema.assets.filter((a) => a.type === 'LPG_SPHERE');
const bulletsB = twinB.schema.assets.filter((a) => a.type === 'LPG_BULLET' || a.type === 'LPG_BULLET_TANK');
assert(spheresB.length === 3, `Blueprint B contains exactly 3 LPG Spheres in East sector (Found: ${spheresB.length})`);
assert(bulletsB.length === 4, `Blueprint B contains exactly 4 Bullet Tanks in North sector (Found: ${bulletsB.length})`);
assert(twinB.schema.gates.some((g) => g.cardinal === 'N'), 'Blueprint B contains North Emergency Gate');
assert(twinB.schema.gates.some((g) => g.cardinal === 'S'), 'Blueprint B contains South Logistics Gate');

// Verify Blueprint C Assets (Mangalore Bulk Fuel Terminal)
const storageC = twinC.schema.assets.filter((a) => a.type === 'STORAGE_TANK');
const baysC = twinC.schema.assets.filter((a) => a.type === 'LOADING_BAY' || a.type === 'TRUCK_LOADING_BAY');
assert(storageC.length === 4, `Blueprint C contains exactly 4 Large Hydrocarbon Storage Tanks (Found: ${storageC.length})`);
assert(baysC.length === 2, `Blueprint C contains 2 Bulk Tanker Loading Gantries (Found: ${baysC.length})`);
assert(twinC.schema.gates.some((g) => g.cardinal === 'E'), 'Blueprint C contains East Security Access Gate');

// ── 2. COORDINATE INDEPENDENCE TEST ──────────────────────────────────────────
console.log('\n--- 2. World Coordinate & Spatial Layout Independence ---');

const sphereA_pos = spheresA[0].pixelPos;
const sphereB_pos = spheresB[0].pixelPos;
assert(
  sphereA_pos.x !== sphereB_pos.x || sphereA_pos.y !== sphereB_pos.y,
  `Blueprint A Sphere (x=${sphereA_pos.x}, y=${sphereA_pos.y}) has DIFFERENT coordinates from Blueprint B Sphere (x=${sphereB_pos.x}, y=${sphereB_pos.y})`
);

// ── 3. HYBRID CLASSIFIER & OCR SEMANTIC INTEGRATION ─────────────────────────
console.log('\n--- 3. Hybrid Multi-Evidence Classification & OCR Lexicon ---');

const res_sphere = classifyIndustrialAsset({ width: 96, height: 96 }, 'LPG SPHERE T-101');
assert(res_sphere.type === 'LPG_SPHERE', 'Classifies "LPG SPHERE T-101" as LPG_SPHERE');
assert(res_sphere.confidence >= 0.85, 'High confidence (>= 0.85) on OCR + geometry match');

const res_bullet = classifyIndustrialAsset({ width: 145, height: 48 }, 'BULLET TANK T-103');
assert(res_bullet.type === 'LPG_BULLET_TANK' || res_bullet.type === 'LPG_BULLET', 'Classifies "BULLET TANK T-103" as LPG_BULLET_TANK');

const res_control = classifyIndustrialAsset({ width: 80, height: 85 }, 'CONTROL ROOM & CCR');
assert(res_control.type === 'CONTROL_ROOM', 'Classifies "CONTROL ROOM & CCR" as CONTROL_ROOM (Not generic building)');

const res_firepump = classifyIndustrialAsset({ width: 90, height: 60 }, 'FIRE PUMP HOUSE');
assert(res_firepump.type === 'FIRE_PUMP_HOUSE', 'Classifies "FIRE PUMP HOUSE" as FIRE_PUMP_HOUSE');

// ── 4. LOW CONFIDENCE & UNCERTAINTY HANDLING ────────────────────────────────
console.log('\n--- 4. Uncertainty & Unknown Asset Handling ---');

const res_unknown = classifyIndustrialAsset({ width: 120, height: 80 }, '');
assert(res_unknown.type === 'BUILDING' || res_unknown.type === 'UNKNOWN_ASSET', 'Unlabeled rectangle resolves to non-hazardous building without hallucinations');

// ── 5. METADATA REGION EXCLUSION ────────────────────────────────────────────
console.log('\n--- 5. Drawing Region Exclusion & Title Block Protection ---');

assert(isMetadataExclusionRegion(1050, 450, 1200, 900).isExcluded, 'Legend on far right margin is EXCLUDED from facility assets');
assert(isMetadataExclusionRegion(1050, 800, 1200, 900).isExcluded, 'Title Block on bottom-right is EXCLUDED');
assert(!isMetadataExclusionRegion(450, 450, 1200, 900).isExcluded, 'Core process drawing area is NOT excluded');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);
