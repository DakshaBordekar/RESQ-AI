// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint Asset Classification Test Suite
// Verifies multi-evidence classification, legend exclusion, and semantic taxonomy mapping
// ────────────────────────────────────────────────────────────────────────────

declare const process: any;

import {
  classifyIndustrialAsset,
  isMetadataExclusionRegion,
  evaluateGeometryFeatures,
  matchOcrText,
} from '../blueprintClassifier';
import { validateAndNormalizeFacilitySchema } from '../blueprintSchema';
import { loadDemoBlueprintTemplate } from '../blueprintDemoTemplates';

let passed = 0;
let failed = 0;

const assert = (condition: boolean, name: string) => {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
};

console.log('\n🧪 RUNNING RESQ-AI BLUEPRINT ASSET CLASSIFICATION TEST SUITE...\n');

// ── 1. Visual Geometry & Shape Extraction Tests ─────────────────────────────
console.log('--- 1. Visual Geometry & Aspect Ratio Features ---');

const sphereGeom = evaluateGeometryFeatures(96, 96);
assert(sphereGeom.shape === 'CIRCULAR' && sphereGeom.circularity === 1.0, '96x96 box evaluates to CIRCULAR shape with 1.0 circularity');

const bulletGeom = evaluateGeometryFeatures(145, 48);
assert(bulletGeom.shape === 'HORIZONTAL_CAPSULE' && bulletGeom.aspectRatio > 2.5, '145x48 box evaluates to HORIZONTAL_CAPSULE with aspectRatio > 2.5');

const rackGeom = evaluateGeometryFeatures(530, 24);
assert(rackGeom.shape === 'LINEAR' && rackGeom.aspectRatio > 15, '530x24 box evaluates to LINEAR shape for pipe racks');

const bldgGeom = evaluateGeometryFeatures(130, 120);
assert(bldgGeom.shape === 'RECTANGULAR', '130x120 box evaluates to RECTANGULAR building shape');

// ── 2. Multi-Evidence Classifier Tests ──────────────────────────────────────
console.log('\n--- 2. Multi-Evidence Industrial Classification ---');

// TEST 1: Circular LPG Sphere
const sphereCls = classifyIndustrialAsset({ width: 96, height: 96 }, 'LPG SPHERE T-101', 'LPG SPHERE');
assert(sphereCls.type === 'LPG_SPHERE', 'TEST 1: Circular vessel with "LPG SPHERE T-101" text classifies as LPG_SPHERE');
assert(sphereCls.category === 'HAZARDOUS_STORAGE', 'LPG_SPHERE category is HAZARDOUS_STORAGE');
assert(sphereCls.semanticIdPrefix === 'TK-LPG', 'Semantic ID prefix is TK-LPG');

// TEST 2: Horizontal Bullet Tank
const bulletCls = classifyIndustrialAsset({ width: 145, height: 48 }, 'BULLET TANK T-103', 'BULLET TANK');
assert(bulletCls.type === 'LPG_BULLET_TANK', 'TEST 2: Horizontal capsule with "BULLET TANK T-103" text classifies as LPG_BULLET_TANK');
assert(bulletCls.category === 'HAZARDOUS_STORAGE', 'LPG_BULLET_TANK category is HAZARDOUS_STORAGE');
assert(bulletCls.semanticIdPrefix === 'TK-BULLET', 'Semantic ID prefix is TK-BULLET');

// TEST 3: Vertical Storage Tank
const storageCls = classifyIndustrialAsset({ width: 76, height: 76 }, 'STORAGE TANK T-201', 'STORAGE TANK');
assert(storageCls.type === 'STORAGE_TANK', 'TEST 3: Vertical cylindrical tank with "STORAGE TANK T-201" text classifies as STORAGE_TANK');

// TEST 4: Control Room
const crCls = classifyIndustrialAsset({ width: 80, height: 85 }, 'CONTROL ROOM & CCR', 'BUILDING');
assert(crCls.type === 'CONTROL_ROOM', 'TEST 4: Labeled building "CONTROL ROOM & CCR" classifies as CONTROL_ROOM');
assert(crCls.category === 'BUILDING', 'CONTROL_ROOM category is BUILDING');

// TEST 5: Warehouse
const whCls = classifyIndustrialAsset({ width: 130, height: 120 }, 'WAREHOUSE W-01', 'BUILDING');
assert(whCls.type === 'WAREHOUSE', 'TEST 5: Labeled warehouse "WAREHOUSE W-01" classifies as WAREHOUSE');

// TEST 6: Pipe Rack
const rackCls = classifyIndustrialAsset({ width: 530, height: 24 }, 'PIPE RACK R-01', 'PIPE RACK');
assert(rackCls.type === 'PIPE_RACK', 'TEST 6: Elongated structural run with "PIPE RACK R-01" classifies as PIPE_RACK');
assert(rackCls.category === 'PROCESS_UTILITY', 'PIPE_RACK category is PROCESS_UTILITY');

// ── 3. Metadata Region & Legend Exclusion Tests ─────────────────────────────
console.log('\n--- 3. Document Region Exclusion & Legend Protection ---');

// TEST 7: Legend Region (x = 1000px, y = 230px on 1200x900 canvas)
const legendCheck = isMetadataExclusionRegion(1000, 230, 1200, 900);
assert(legendCheck.isExcluded === true, 'TEST 7: Symbol inside right Legend column is correctly EXCLUDED');

// TEST 8: Title Block Region (x = 1000px, y = 840px)
const titleCheck = isMetadataExclusionRegion(1000, 840, 1200, 900);
assert(titleCheck.isExcluded === true, 'TEST 8: Symbol inside bottom-right Title Block is correctly EXCLUDED');

// TEST 9: Valid Facility Core Area (x = 312px, y = 155px)
const coreCheck = isMetadataExclusionRegion(312, 155, 1200, 900);
assert(coreCheck.isExcluded === false, 'TEST 9: Real facility asset in core drawing area is NOT excluded');

// ── 4. End-to-End Template Ingestion & Semantic IDs ─────────────────────────
console.log('\n--- 4. SL-001 Template Semantic Validation ---');

const { schema } = loadDemoBlueprintTemplate('TEMPLATE_LPG_TERMINAL');

const spheres = schema.assets.filter((a) => a.type === 'LPG_SPHERE');
assert(spheres.length === 2, 'SL-001 contains exactly 2 LPG Spherical Vessels (TK-LPG-01, TK-LPG-02)');

const bullets = schema.assets.filter((a) => a.type === 'LPG_BULLET_TANK' || a.type === 'LPG_BULLET');
assert(bullets.length === 2, 'SL-001 contains exactly 2 LPG Bullet Tanks (TK-BULLET-01, TK-BULLET-02)');

const storageTanks = schema.assets.filter((a) => a.type === 'STORAGE_TANK');
assert(storageTanks.length === 2, 'SL-001 contains exactly 2 Atmospheric Storage Tanks (TK-STORAGE-01, TK-STORAGE-02)');

const controlRoom = schema.assets.find((a) => a.type === 'CONTROL_ROOM');
assert(!!controlRoom && controlRoom.id === 'CR-01', 'Identifies Control Room with semantic ID CR-01');

const warehouse = schema.assets.find((a) => a.type === 'WAREHOUSE');
assert(!!warehouse && warehouse.id === 'WH-01', 'Identifies Warehouse with semantic ID WH-01');

const pipeRacks = schema.assets.filter((a) => a.type === 'PIPE_RACK');
assert(pipeRacks.length === 2, 'Identifies 2 Pipe Racks (RACK-01, RACK-02)');

// ── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`CLASSIFICATION TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
