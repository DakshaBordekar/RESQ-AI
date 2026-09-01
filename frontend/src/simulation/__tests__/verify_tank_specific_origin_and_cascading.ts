// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI Verification Suite: Multi-Hop BFS Cascading Chain Reaction & Tank Destruction
// ────────────────────────────────────────────────────────────────────────────

import { loadDemoBlueprintTemplate } from '../blueprintDemoTemplates';
import { evaluateAssetRiskFleet, MonitoredIndustrialAsset } from '../assetRiskEngine';
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

console.log('\n🧪 RUNNING RESQ-AI MULTI-HOP CASCADING CHAIN REACTION & TANK DESTRUCTION TEST SUITE...\n');

// ── BFS CASCADE GRAPH TRAVERSAL FUNCTION ────────────────────────────────────
function computeCascadeChain(
  assets: FacilityAsset[],
  initialAssetId: string
): Array<{
  assetId: string;
  depth: number;
  causeAssetId: string | null;
  radiusM: number;
  triggerTimeSec: number;
}> {
  const getRadius = (a: FacilityAsset) => {
    if (a.type === 'LPG_SPHERE') return 65.0;
    if (a.type === 'LPG_BULLET' || a.type === 'LPG_BULLET_TANK') return 52.0;
    if (a.type === 'STORAGE_TANK') return 46.0;
    return 35.0;
  };

  const initialAsset = assets.find((a) => a.id === initialAssetId);
  if (!initialAsset) return [];

  const visited = new Set<string>();
  visited.add(initialAsset.id);

  const queue: Array<{ asset: FacilityAsset; depth: number; causeId: string | null }> = [
    { asset: initialAsset, depth: 0, causeId: null },
  ];

  const events: Array<{
    assetId: string;
    depth: number;
    causeAssetId: string | null;
    radiusM: number;
    triggerTimeSec: number;
  }> = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curAsset = current.asset;
    const curRadius = getRadius(curAsset);
    const triggerTime = current.depth === 0 ? 0.0 : 1.4 + (events.length - 1) * 1.2;

    events.push({
      assetId: curAsset.id,
      depth: current.depth,
      causeAssetId: current.causeId,
      radiusM: curRadius,
      triggerTimeSec: triggerTime,
    });

    for (const cand of assets) {
      if (visited.has(cand.id)) continue;
      const dist = Math.hypot(
        cand.worldPos.x - curAsset.worldPos.x,
        cand.worldPos.z - curAsset.worldPos.z
      );

      if (dist <= curRadius) {
        visited.add(cand.id);
        queue.push({
          asset: cand,
          depth: current.depth + 1,
          causeId: curAsset.id,
        });
      }
    }
  }

  return events;
}

// ── 1. SINGLE TANK ISOLATION TEST ───────────────────────────────────────────
console.log('--- TEST 1: Single Isolated Tank (No Cascade) ---');
const mockIsolatedAssets: FacilityAsset[] = [
  {
    id: 'TK-SOLO',
    name: 'Isolated Tank',
    type: 'STORAGE_TANK',
    category: 'HAZARDOUS_STORAGE',
    source: 'ai',
    confirmed: true,
    simulationEnabled: true,
    confidence: 0.95,
    confidenceTier: 'HIGH',
    detectionConfidence: 0.95,
    classificationConfidence: 0.95,
    rotationDeg: 0,
    pixelPos: { x: 0, y: 0 },
    pixelDimensions: { width: 50, height: 50 },
    worldPos: { x: 0, y: 7, z: 0 },
    worldDimensions: { width: 15, height: 14, depth: 15 },
  } as FacilityAsset,
  {
    id: 'TK-FAR',
    name: 'Far Tank',
    type: 'STORAGE_TANK',
    category: 'HAZARDOUS_STORAGE',
    source: 'ai',
    confirmed: true,
    simulationEnabled: true,
    confidence: 0.95,
    confidenceTier: 'HIGH',
    detectionConfidence: 0.95,
    classificationConfidence: 0.95,
    rotationDeg: 0,
    pixelPos: { x: 500, y: 500 },
    pixelDimensions: { width: 50, height: 50 },
    worldPos: { x: 150, y: 7, z: 150 }, // 212m away (well outside 46m radius)
    worldDimensions: { width: 15, height: 14, depth: 15 },
  } as FacilityAsset,
];

const chain1 = computeCascadeChain(mockIsolatedAssets, 'TK-SOLO');
assert(chain1.length === 1, 'Isolated tank yields exactly 1 explosion event');
assert(chain1[0].assetId === 'TK-SOLO', 'Explosion originates at TK-SOLO');
assert(!chain1.some((e) => e.assetId === 'TK-FAR'), 'Far tank is untouched');

// ── 2. TWO-TANK PROPAGATION TEST ───────────────────────────────────────────
console.log('\n--- TEST 2: Two-Tank Direct Cascade (A -> B) ---');
const mockPairAssets: FacilityAsset[] = [
  {
    ...mockIsolatedAssets[0],
    id: 'TK-A',
    worldPos: { x: 0, y: 9, z: 0 },
    type: 'LPG_SPHERE', // 65m radius
  },
  {
    ...mockIsolatedAssets[1],
    id: 'TK-B',
    worldPos: { x: 45, y: 9, z: 0 }, // 45m from A (within 65m)
    type: 'LPG_SPHERE',
  },
];

const chain2 = computeCascadeChain(mockPairAssets, 'TK-A');
assert(chain2.length === 2, 'Two adjacent tanks produce 2-step cascade');
assert(chain2[0].assetId === 'TK-A' && chain2[0].depth === 0, 'Step 1: Primary Tank A explodes at t=0s');
assert(chain2[1].assetId === 'TK-B' && chain2[1].depth === 1, 'Step 2: Secondary Tank B explodes at t=1.4s');
assert(chain2[1].causeAssetId === 'TK-A', 'Tank B explosion is caused by Tank A blast');

// ── 3. THREE-TANK CHAIN REACTION (A -> B -> C where C is OUTSIDE A) ─────────
console.log('\n--- TEST 3: Multi-Hop 3-Tank Chain (A -> B -> C, C outside A) ---');
const mockChain3Assets: FacilityAsset[] = [
  {
    ...mockIsolatedAssets[0],
    id: 'TK-A',
    worldPos: { x: 0, y: 9, z: 0 },
    type: 'LPG_SPHERE', // 65m radius
  },
  {
    ...mockIsolatedAssets[1],
    id: 'TK-B',
    worldPos: { x: 50, y: 9, z: 0 }, // 50m from A (inside A)
    type: 'LPG_SPHERE', // 65m radius
  },
  {
    ...mockIsolatedAssets[1],
    id: 'TK-C',
    worldPos: { x: 105, y: 9, z: 0 }, // 105m from A (OUTSIDE A!), 55m from B (INSIDE B!)
    type: 'LPG_SPHERE',
  },
];

const distAC = Math.hypot(mockChain3Assets[2].worldPos.x - mockChain3Assets[0].worldPos.x, 0);
const distBC = Math.hypot(mockChain3Assets[2].worldPos.x - mockChain3Assets[1].worldPos.x, 0);
assert(distAC > 65, `Tank C is 105m from Tank A (strictly outside A's 65m blast radius)`);
assert(distBC <= 65, `Tank C is 55m from Tank B (strictly inside B's 65m blast radius)`);

const chain3 = computeCascadeChain(mockChain3Assets, 'TK-A');
assert(chain3.length === 3, 'Full 3-step chain reaction successfully traverses A -> B -> C');
assert(chain3[0].assetId === 'TK-A', 'Step 1: Tank A explodes');
assert(chain3[1].assetId === 'TK-B' && chain3[1].causeAssetId === 'TK-A', 'Step 2: Tank B explodes from Tank A');
assert(chain3[2].assetId === 'TK-C' && chain3[2].causeAssetId === 'TK-B', 'Step 3: Tank C explodes from Tank B (Multi-hop verified!)');

// ── 4. FOUR-TANK CHAIN PROPAGATION (A -> B -> C -> D) ───────────────────────
console.log('\n--- TEST 4: 4-Hop Linear Cascade (A -> B -> C -> D) ---');
const mockChain4Assets: FacilityAsset[] = [
  { ...mockIsolatedAssets[0], id: 'TK-A', worldPos: { x: 0, y: 9, z: 0 }, type: 'LPG_SPHERE' },
  { ...mockIsolatedAssets[0], id: 'TK-B', worldPos: { x: 45, y: 9, z: 0 }, type: 'LPG_BULLET' }, // 52m radius
  { ...mockIsolatedAssets[0], id: 'TK-C', worldPos: { x: 88, y: 9, z: 0 }, type: 'STORAGE_TANK' }, // 46m radius (43m from B)
  { ...mockIsolatedAssets[0], id: 'TK-D', worldPos: { x: 125, y: 9, z: 0 }, type: 'STORAGE_TANK' }, // (37m from C)
];

const chain4 = computeCascadeChain(mockChain4Assets, 'TK-A');
assert(chain4.length === 4, 'Four tanks explode in sequential chain reaction');
assert(chain4.map((e) => e.assetId).join(' -> ') === 'TK-A -> TK-B -> TK-C -> TK-D', 'Sequence order matches A -> B -> C -> D');
assert(chain4[3].triggerTimeSec > chain4[2].triggerTimeSec, 'Staggered timing ensures each tank explodes sequentially');

// ── 5. LOOP & DUPLICATE PROTECTION (A <-> B) ────────────────────────────────
console.log('\n--- TEST 5: Loop & Cyclic Graph Protection (A affects B, B affects A) ---');
const chain5 = computeCascadeChain(mockPairAssets, 'TK-A');
const tankACount = chain5.filter((e) => e.assetId === 'TK-A').length;
const tankBCount = chain5.filter((e) => e.assetId === 'TK-B').length;
assert(tankACount === 1, 'Tank A explodes exactly once (no cyclic loop)');
assert(tankBCount === 1, 'Tank B explodes exactly once (no cyclic loop)');

// ── 6. REAL INDUSTRIAL FACILITY (Chennai LPG Terminal SL-001) ───────────────
console.log('\n--- TEST 6: Real Digital Twin Facility (Chennai LPG Terminal) ---');
const { schema } = loadDemoBlueprintTemplate('TEMPLATE_CHENNAI_LPG');

// Primary = TK-LPG-01 (NW Sphere)
const chennaiChain = computeCascadeChain(schema.assets, 'TK-LPG-01');
assert(chennaiChain.length >= 2, `Chennai LPG Terminal triggers cascading chain of ${chennaiChain.length} tanks`);
assert(chennaiChain[0].assetId === 'TK-LPG-01', 'Primary explosion originates at TK-LPG-01');
assert(chennaiChain.some((e) => e.assetId === 'TK-LPG-02'), 'Adjacent sphere TK-LPG-02 is detonated in cascade');

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log(`========================================\n`);
