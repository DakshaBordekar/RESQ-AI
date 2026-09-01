// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint-to-Digital-Twin Automated Verification Suite
// Validates 2D->3D coordinate transformation, schema normalization, and simulation readiness
// ────────────────────────────────────────────────────────────────────────────

declare const process: any;

import {
  blueprintToWorldCoordinates,
  worldToBlueprintCoordinates,
  pixelToWorldDimensions,
} from '../coordinateTransformer';
import {
  validateAndNormalizeFacilitySchema,
  validateSimulationReadiness,
  getConfidenceTier,
} from '../blueprintSchema';
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

console.log('\n🧪 RUNNING RESQ-AI BLUEPRINT-TO-DIGITAL-TWIN TEST SUITE...\n');

// ── 1. Coordinate Transformation Tests ─────────────────────────────────────
console.log('--- 1. Deterministic Coordinate Transformation (2D px <-> 3D m) ---');

const transformConfig = {
  blueprintWidthPx: 1200,
  blueprintHeightPx: 900,
  pixelsPerMeter: 3.5,
};

// Center point (600, 450) should map to world (0, 0, 0)
const centerWorld = blueprintToWorldCoordinates(600, 450, transformConfig, 'ROAD');
assert(centerWorld.x === 0 && centerWorld.z === 0, 'Center pixel (600, 450) transforms to (0, 0, 0) world coordinates');

// Top-Left point (0, 0)
const topLeftWorld = blueprintToWorldCoordinates(0, 0, transformConfig);
assert(topLeftWorld.x < 0 && topLeftWorld.z < 0, 'Top-Left pixel transforms to negative quadrant (-X, -Z)');

// Bottom-Right point (1200, 900)
const botRightWorld = blueprintToWorldCoordinates(1200, 900, transformConfig);
assert(botRightWorld.x > 0 && botRightWorld.z > 0, 'Bottom-Right pixel transforms to positive quadrant (+X, +Z)');

// Inverse transform: world (0, 0) should recover (600, 450)
const recoveredPixel = worldToBlueprintCoordinates(0, 0, transformConfig);
assert(recoveredPixel.x === 600 && recoveredPixel.y === 450, 'Inverse transformation recovers exact center pixel (600, 450)');

// Dimensions scale
const dims = pixelToWorldDimensions(84, 84, transformConfig, 'LPG_SPHERE');
assert(dims.width === 24.0 && dims.depth === 24.0 && dims.height === 14.0, 'Converts 84px diameter to 24m world vessel dimensions');

// ── 2. Schema Validation & Confidence Tiers ─────────────────────────────────
console.log('\n--- 2. Schema Validation & Confidence Categorization ---');

assert(getConfidenceTier(0.95) === 'HIGH', '0.95 confidence maps to HIGH tier');
assert(getConfidenceTier(0.78) === 'MEDIUM', '0.78 confidence maps to MEDIUM tier');
assert(getConfidenceTier(0.55) === 'LOW', '0.55 confidence maps to LOW tier');

// Sanitize malformed inputs
const malformedRaw = {
  metadata: { blueprintWidthPx: -100, pixelsPerMeter: 0 },
  assets: [
    { id: 'MAL-01', pixelPos: { x: 300, y: 300 }, confidence: 1.5 },
  ],
};

const sanitizedSchema = validateAndNormalizeFacilitySchema(malformedRaw);
assert(sanitizedSchema.metadata.blueprintWidthPx >= 400, 'Clamps negative blueprint width to safe minimum');
assert(sanitizedSchema.metadata.pixelsPerMeter >= 0.5, 'Clamps zero pixels-per-meter to safe default');
assert(sanitizedSchema.assets[0].confidence <= 1.0, 'Clamps out-of-range confidence to 1.0');
assert(sanitizedSchema.assets[0].pixelPos.x >= 0, 'Clamps negative pixel coordinates within canvas boundary');

// ── 3. Demo Template Ingestion ──────────────────────────────────────────────
console.log('\n--- 3. Pre-Loaded Industrial Template Ingestion ---');

const { schema: lpgTemplateSchema } = loadDemoBlueprintTemplate('TEMPLATE_LPG_TERMINAL');
assert(lpgTemplateSchema.assets.length >= 10, 'LPG Terminal template parses >= 10 facility assets');
assert(lpgTemplateSchema.roads.length >= 3, 'LPG Terminal template contains arterial and ring roads');
assert(lpgTemplateSchema.gates.length >= 3, 'LPG Terminal template includes access perimeter gates');

const primarySphere = lpgTemplateSchema.assets.find((a) => a.id === 'TK-LPG-01');
assert(!!primarySphere && primarySphere.type === 'LPG_SPHERE', 'Identifies primary LPG spherical vessel TK-LPG-01');
assert(primarySphere?.simulationEnabled === true, 'Primary LPG sphere is marked simulation-enabled');

// ── 4. Simulation Readiness Checklist ───────────────────────────────────────
console.log('\n--- 4. Pre-Simulation Readiness Evaluation ---');

const readinessValid = validateSimulationReadiness(lpgTemplateSchema);
assert(readinessValid.ready === true, 'Complete LPG facility schema passes all simulation readiness checks');

// Test failure when missing hazardous assets
const emptyHazardSchema = {
  ...lpgTemplateSchema,
  assets: lpgTemplateSchema.assets.filter((a) => a.type === 'BUILDING'),
};
const readinessMissingHazard = validateSimulationReadiness(emptyHazardSchema);
assert(readinessMissingHazard.ready === false, 'Disallows simulation when no confirmed hazardous tank exists');

// Test failure when missing road network
const emptyRoadSchema = {
  ...lpgTemplateSchema,
  roads: [],
};
const readinessMissingRoad = validateSimulationReadiness(emptyRoadSchema);
assert(readinessMissingRoad.ready === false, 'Disallows simulation when road network is empty');

// ── SUMMARY ─────────────────────────────────────────────────────────────────
console.log(`\n========================================`);
console.log(`BLUEPRINT TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
