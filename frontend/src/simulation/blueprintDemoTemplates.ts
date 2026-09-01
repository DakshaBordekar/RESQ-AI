// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Multi-Blueprint Industrial CAD Profiles & Templates
// 3 Distinct Petrochemical Facilities with Unique Assets, Coordinates, Gates & Road Graphs
// ────────────────────────────────────────────────────────────────────────────

import { FacilitySchema } from './blueprintTypes';
import { validateAndNormalizeFacilitySchema } from './blueprintSchema';

// ── 1. SVG Blueprint Graphics: Chennai LPG Terminal (SL-001) ─────────────────
const createChennaiLpgSvgDataUrl = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <rect width="1200" height="900" fill="#f8fafc" />
  <rect x="25" y="25" width="1150" height="850" fill="none" stroke="#0f172a" stroke-width="2.5" />
  <rect x="40" y="40" width="1120" height="820" fill="none" stroke="#0f172a" stroke-width="1.2" />

  <!-- Security Perimeter Fence -->
  <rect x="55" y="55" width="915" height="790" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="10,5" />

  <!-- Road Network -->
  <rect x="195" y="55" width="45" height="790" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
  <text x="217" y="350" fill="#64748b" font-family="monospace" font-size="11" font-weight="bold" transform="rotate(-90 217 350)" text-anchor="middle">ACCESS ROAD</text>
  <rect x="195" y="240" width="775" height="42" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
  <rect x="195" y="445" width="775" height="42" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
  <rect x="195" y="695" width="775" height="42" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />

  <!-- Gates -->
  <g fill="#ef4444" stroke="#b91c1c" stroke-width="1.5">
    <polygon points="45,245 65,240 65,282 45,277" />
    <text x="60" y="235" fill="#b91c1c" font-family="monospace" font-size="9" font-weight="bold">MAIN GATE (WEST)</text>
    <polygon points="45,450 65,445 65,487 45,482" />
    <text x="60" y="440" fill="#b91c1c" font-family="monospace" font-size="9" font-weight="bold">SECONDARY GATE (WEST)</text>
  </g>

  <!-- Upper Left: 2x LPG Spheres -->
  <circle cx="312" cy="155" r="48" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="312" y="152" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">LPG SPHERE</text>
  <text x="312" y="166" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">T-101</text>

  <circle cx="452" cy="155" r="48" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="452" y="152" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">LPG SPHERE</text>
  <text x="452" y="166" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">T-102</text>

  <!-- Upper Right: 2x Bullet Tanks -->
  <rect x="560" y="90" width="145" height="48" rx="20" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="632" y="118" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">BULLET TANK T-103</text>
  <rect x="560" y="155" width="145" height="48" rx="20" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="632" y="183" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">BULLET TANK T-104</text>

  <!-- Center: Process Area & Pipe Racks -->
  <rect x="260" y="248" width="530" height="24" fill="#cbd5e1" stroke="#475569" stroke-width="1.5" />
  <text x="525" y="264" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">PIPE RACK R-01</text>
  <rect x="270" y="295" width="200" height="135" fill="#f8fafc" stroke="#0f172a" stroke-width="1.8" />
  <text x="370" y="365" fill="#0f172a" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">PROCESS AREA</text>

  <!-- Lower Left: Control Room & Warehouse -->
  <rect x="85" y="310" width="80" height="85" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" />
  <text x="125" y="352" fill="#15803d" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">CONTROL ROOM &amp; CCR</text>
  <rect x="85" y="525" width="130" height="120" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
  <text x="150" y="585" fill="#0f172a" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">WAREHOUSE W-01</text>

  <!-- Title Block & Legend Excluded Right Column -->
  <line x1="970" y1="40" x2="970" y2="860" stroke="#0f172a" stroke-width="1.5" />
  <text x="980" y="80" font-family="sans-serif" font-size="10" font-weight="bold">CHENNAI LPG TERMINAL [SL-001]</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// ── 2. SVG Blueprint Graphics: Vadodara Refinery (REF-002) ───────────────────
const createVadodaraRefinerySvgDataUrl = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <rect width="1200" height="900" fill="#f8fafc" />
  <rect x="25" y="25" width="1150" height="850" fill="none" stroke="#0f172a" stroke-width="2.5" />
  
  <!-- Security Fence -->
  <rect x="60" y="60" width="900" height="780" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="10,5" />

  <!-- North-South Arterial Roads & North/South Gates -->
  <rect x="60" y="420" width="900" height="48" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
  <rect x="490" y="60" width="48" height="780" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />

  <!-- North & South Access Gates -->
  <g fill="#ef4444" stroke="#b91c1c" stroke-width="1.5">
    <polygon points="485,50 540,50 535,70 490,70" />
    <text x="515" y="42" fill="#b91c1c" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">GATE NORTH [000° N]</text>

    <polygon points="485,845 540,845 535,825 490,825" />
    <text x="515" y="865" fill="#b91c1c" font-family="monospace" font-size="9" font-weight="bold" text-anchor="middle">GATE SOUTH [180° S]</text>
  </g>

  <!-- East Sector: 3x Large LPG Spherical Tanks -->
  <circle cx="780" cy="180" r="52" fill="#f1f5f9" stroke="#dc2626" stroke-width="2.5" />
  <text x="780" y="185" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">SPHERE S-101</text>

  <circle cx="780" cy="330" r="52" fill="#f1f5f9" stroke="#dc2626" stroke-width="2.5" />
  <text x="780" y="335" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">SPHERE S-102</text>

  <circle cx="780" cy="580" r="52" fill="#f1f5f9" stroke="#dc2626" stroke-width="2.5" />
  <text x="780" y="585" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">SPHERE S-103</text>

  <!-- North Sector: 4x Horizontal Bullet Vessels -->
  <rect x="120" y="110" width="150" height="45" rx="18" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="195" y="138" fill="#0f172a" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BULLET T-201</text>

  <rect x="300" y="110" width="150" height="45" rx="18" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="375" y="138" fill="#0f172a" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BULLET T-202</text>

  <rect x="120" y="180" width="150" height="45" rx="18" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="195" y="208" fill="#0f172a" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BULLET T-203</text>

  <rect x="300" y="180" width="150" height="45" rx="18" fill="#f1f5f9" stroke="#0f172a" stroke-width="2" />
  <text x="375" y="208" fill="#0f172a" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">BULLET T-204</text>

  <!-- West Sector: Catalytic Cracker & Distillation Columns -->
  <rect x="120" y="280" width="330" height="120" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
  <text x="285" y="345" fill="#0f172a" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">CATALYTIC CRACKING UNIT [CCU-01]</text>

  <!-- South Sector: Administration & Emergency Station -->
  <rect x="120" y="520" width="180" height="110" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" />
  <text x="210" y="580" fill="#15803d" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">CENTRAL CONTROL &amp; ADMIN</text>

  <rect x="320" y="520" width="130" height="110" fill="#ffe4e6" stroke="#e11d48" stroke-width="2" />
  <text x="385" y="580" fill="#be123c" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">EMERGENCY FIRE STATION</text>

  <line x1="970" y1="40" x2="970" y2="860" stroke="#0f172a" stroke-width="1.5" />
  <text x="980" y="80" font-family="sans-serif" font-size="10" font-weight="bold">VADODARA REFINERY [REF-002]</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// ── 3. SVG Blueprint Graphics: Mangalore Coastal Fuel Terminal (MNG-003) ──────
const createMangaloreTerminalSvgDataUrl = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" width="1200" height="900">
  <rect width="1200" height="900" fill="#f8fafc" />
  <rect x="25" y="25" width="1150" height="850" fill="none" stroke="#0f172a" stroke-width="2.5" />
  
  <rect x="60" y="60" width="900" height="780" fill="none" stroke="#0284c7" stroke-width="2" stroke-dasharray="10,5" />

  <!-- Roadways & East / South Gate -->
  <rect x="60" y="660" width="900" height="50" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
  <rect x="880" y="60" width="50" height="780" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />

  <!-- Security Gate East -->
  <g fill="#ef4444" stroke="#b91c1c" stroke-width="1.5">
    <polygon points="940,650 960,655 960,715 940,710" />
    <text x="930" y="640" fill="#b91c1c" font-family="monospace" font-size="9" font-weight="bold" text-anchor="end">MAIN GATE (EAST)</text>
  </g>

  <!-- Center: 4x Large Cylindrical Hydrocarbon Atmospheric Tanks -->
  <circle cx="320" cy="220" r="65" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" />
  <text x="320" y="225" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">STORAGE TANK T-501</text>

  <circle cx="560" cy="220" r="65" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" />
  <text x="560" y="225" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">STORAGE TANK T-502</text>

  <circle cx="320" cy="440" r="65" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" />
  <text x="320" y="445" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">STORAGE TANK T-503</text>

  <circle cx="560" cy="440" r="65" fill="#f1f5f9" stroke="#0f172a" stroke-width="2.5" />
  <text x="560" y="445" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">STORAGE TANK T-504</text>

  <!-- South Sector: Dual Bulk Loading Bays -->
  <rect x="220" y="730" width="220" height="45" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
  <text x="330" y="758" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">TANKER LOADING BAY #1</text>

  <rect x="480" y="730" width="220" height="45" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
  <text x="590" y="758" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="bold" text-anchor="middle">TANKER LOADING BAY #2</text>

  <!-- Northwest Sector: Fire Water Basin & Pump House -->
  <circle cx="140" cy="160" r="45" fill="#e0f2fe" stroke="#0284c7" stroke-width="2" />
  <text x="140" y="165" fill="#0369a1" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">FIRE WATER FW-501</text>

  <rect x="95" y="240" width="90" height="60" fill="#ffe4e6" stroke="#e11d48" stroke-width="2" />
  <text x="140" y="275" fill="#be123c" font-family="sans-serif" font-size="9" font-weight="bold" text-anchor="middle">FIRE PUMP HOUSE</text>

  <line x1="970" y1="40" x2="970" y2="860" stroke="#0f172a" stroke-width="1.5" />
  <text x="980" y="80" font-family="sans-serif" font-size="10" font-weight="bold">MANGALORE DEPOT [MNG-003]</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// ── 4. Canonical Demo Blueprint Templates Catalog ───────────────────────────
export const DEMO_BLUEPRINT_TEMPLATES = [
  // ── PRESET 1: Chennai LPG Petrochemical Terminal (SL-001) ──
  {
    id: 'TEMPLATE_CHENNAI_LPG',
    name: 'Chennai LPG Petrochemical Terminal (SL-001)',
    description: 'Site Layout SL-001: 2x LPG Spheres (NW), 2x Bullet Tanks (NE), 2x Storage Tanks (S), Central Process Area, Dual Pipe Racks, Control Room & CCR (W), 2 West Gates.',
    thumbnailUrl: createChennaiLpgSvgDataUrl(),
    widthPx: 1200,
    heightPx: 900,
    pixelsPerMeter: 3.5,
    getRawDetections: () => ({
      metadata: {
        id: 'FAC-SL001-CHENNAI',
        name: 'Chennai LPG Petrochemical Terminal (SL-001)',
        blueprintWidthPx: 1200,
        blueprintHeightPx: 900,
        pixelsPerMeter: 3.5,
        scaleConfidence: 0.98,
        source: 'demo_template' as const,
        sourceFileName: 'site_layout_sl001.png',
      },
      assets: [
        {
          id: 'TK-LPG-01',
          name: 'Pressurized LPG Spherical Tank T-101',
          type: 'LPG_SPHERE' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 312, y: 155 },
          pixelDimensions: { width: 96, height: 96 },
          rotationDeg: 0,
          detectionConfidence: 0.98,
          classificationConfidence: 0.96,
          confidence: 0.96,
          confidenceTier: 'HIGH' as const,
          evidence: ['Circular radial geometry with 8 support legs', 'Nearby OCR: "LPG SPHERE T-101"', 'Legend match: LPG SPHERE'],
          nearbyText: 'LPG SPHERE T-101',
          legendMatch: 'LPG SPHERE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 80, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', pressureBar: 18.2, equipmentTag: 'T-101' },
        },
        {
          id: 'TK-LPG-02',
          name: 'Pressurized LPG Spherical Tank T-102',
          type: 'LPG_SPHERE' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 452, y: 155 },
          pixelDimensions: { width: 96, height: 96 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Circular radial geometry with 8 support legs', 'Nearby OCR: "LPG SPHERE T-102"', 'Legend match: LPG SPHERE'],
          nearbyText: 'LPG SPHERE T-102',
          legendMatch: 'LPG SPHERE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 80, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', pressureBar: 18.2, equipmentTag: 'T-102' },
        },
        {
          id: 'TK-BULLET-01',
          name: 'Horizontal Pressurized Bullet Tank T-103',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 632, y: 114 },
          pixelDimensions: { width: 145, height: 48 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.93,
          confidence: 0.93,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule geometry on dual saddles', 'Nearby OCR: "BULLET TANK T-103"', 'Legend match: BULLET TANK'],
          nearbyText: 'BULLET TANK T-103',
          legendMatch: 'BULLET TANK',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 120, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', equipmentTag: 'T-103' },
        },
        {
          id: 'TK-BULLET-02',
          name: 'Horizontal Pressurized Bullet Tank T-104',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 632, y: 179 },
          pixelDimensions: { width: 145, height: 48 },
          rotationDeg: 0,
          detectionConfidence: 0.95,
          classificationConfidence: 0.92,
          confidence: 0.92,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule geometry on dual saddles', 'Nearby OCR: "BULLET TANK T-104"', 'Legend match: BULLET TANK'],
          nearbyText: 'BULLET TANK T-104',
          legendMatch: 'BULLET TANK',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 120, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', equipmentTag: 'T-104' },
        },
        {
          id: 'TK-STORAGE-01',
          name: 'Atmospheric Storage Tank T-201',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 345, y: 585 },
          pixelDimensions: { width: 76, height: 76 },
          rotationDeg: 0,
          detectionConfidence: 0.94,
          classificationConfidence: 0.92,
          confidence: 0.92,
          confidenceTier: 'HIGH' as const,
          evidence: ['Cylindrical tank geometry', 'Nearby OCR: "STORAGE TANK T-201"'],
          nearbyText: 'STORAGE TANK T-201',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
        },
        {
          id: 'TK-STORAGE-02',
          name: 'Atmospheric Storage Tank T-202',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 455, y: 585 },
          pixelDimensions: { width: 76, height: 76 },
          rotationDeg: 0,
          detectionConfidence: 0.94,
          classificationConfidence: 0.92,
          confidence: 0.92,
          confidenceTier: 'HIGH' as const,
          evidence: ['Cylindrical tank geometry', 'Nearby OCR: "STORAGE TANK T-202"'],
          nearbyText: 'STORAGE TANK T-202',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
        },
        {
          id: 'CR-01',
          name: 'Central Control Room & CCR',
          type: 'CONTROL_ROOM' as const,
          category: 'BUILDING' as const,
          pixelPos: { x: 125, y: 352 },
          pixelDimensions: { width: 80, height: 85 },
          rotationDeg: 0,
          detectionConfidence: 0.98,
          classificationConfidence: 0.97,
          confidence: 0.97,
          confidenceTier: 'HIGH' as const,
          evidence: ['Blast-resistant building', 'Nearby OCR: "CONTROL ROOM & CCR"'],
          nearbyText: 'CONTROL ROOM & CCR',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'WH-01',
          name: 'Materials Storage Warehouse W-01',
          type: 'WAREHOUSE' as const,
          category: 'BUILDING' as const,
          pixelPos: { x: 150, y: 585 },
          pixelDimensions: { width: 130, height: 120 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Divided warehouse structure', 'Nearby OCR: "WAREHOUSE W-01"'],
          nearbyText: 'WAREHOUSE W-01',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'RACK-01',
          name: 'Process Pipe Rack R-01',
          type: 'PIPE_RACK' as const,
          category: 'PROCESS_UTILITY' as const,
          pixelPos: { x: 525, y: 260 },
          pixelDimensions: { width: 530, height: 24 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.96,
          confidence: 0.96,
          confidenceTier: 'HIGH' as const,
          evidence: ['Lattice girder pipe bridge', 'Nearby OCR: "PIPE RACK R-01"'],
          nearbyText: 'PIPE RACK R-01',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'RACK-02',
          name: 'Storage Transfer Pipe Rack R-02',
          type: 'PIPE_RACK' as const,
          category: 'PROCESS_UTILITY' as const,
          pixelPos: { x: 525, y: 710 },
          pixelDimensions: { width: 530, height: 24 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Storage area interconnecting pipe bridge', 'Nearby OCR: "PIPE RACK R-02"'],
          nearbyText: 'PIPE RACK R-02',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
      ],
      roads: [
        {
          id: 'ROAD-ACCESS-01',
          name: 'West Access Spine Road',
          type: 'ACCESS_ROAD' as const,
          points: [
            { pixelX: 217, pixelY: 55, worldX: -109, worldZ: -113 },
            { pixelX: 217, pixelY: 450, worldX: -109, worldZ: 0 },
            { pixelX: 217, pixelY: 845, worldX: -109, worldZ: 113 },
          ],
          widthM: 14.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'ROAD-MAIN-01',
          name: 'Upper Process Access Road',
          type: 'ROAD' as const,
          points: [
            { pixelX: 217, pixelY: 261, worldX: -109, worldZ: -54 },
            { pixelX: 970, pixelY: 261, worldX: 106, worldZ: -54 },
          ],
          widthM: 12.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'ROAD-MAIN-02',
          name: 'Central Inter-Sector Road',
          type: 'ROAD' as const,
          points: [
            { pixelX: 217, pixelY: 466, worldX: -109, worldZ: 5 },
            { pixelX: 970, pixelY: 466, worldX: 106, worldZ: 5 },
          ],
          widthM: 12.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'ROAD-MAIN-03',
          name: 'Lower Storage Access Road',
          type: 'ROAD' as const,
          points: [
            { pixelX: 217, pixelY: 716, worldX: -109, worldZ: 76 },
            { pixelX: 970, pixelY: 716, worldX: 106, worldZ: 76 },
          ],
          widthM: 12.0,
          confidence: 0.98,
          confirmed: true,
        },
      ],
      zones: [],
      gates: [
        {
          id: 'GATE-MAIN',
          name: 'Main Entry Gate (West)',
          pixelPos: { x: 55, y: 261 },
          worldPos: { x: -155, z: -54 },
          headingDeg: 270,
          cardinal: 'W',
          widthM: 16.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'GATE-SECONDARY',
          name: 'Secondary Logistics Gate (West)',
          pixelPos: { x: 55, y: 466 },
          worldPos: { x: -155, z: 5 },
          headingDeg: 270,
          cardinal: 'W',
          widthM: 16.0,
          confidence: 0.97,
          confirmed: true,
        },
        {
          id: 'GATE-NORTH',
          name: 'North Access Gate (Emergency)',
          pixelPos: { x: 217, y: 55 },
          worldPos: { x: -109, z: -113 },
          headingDeg: 0,
          cardinal: 'N',
          widthM: 14.0,
          confidence: 0.95,
          confirmed: true,
        },
      ],
    }),
  },

  // ── PRESET 2: Vadodara Petrochemical Refinery (REF-002) ──
  {
    id: 'TEMPLATE_VADODARA_REFINERY',
    name: 'Vadodara Petrochemical Refinery (REF-002)',
    description: 'Refinery Layout REF-002: 3x Large Spheres (East), 4x Bullet Vessels (North), Catalytic Cracking Unit (West), North Emergency Gate & South Logistics Gate.',
    thumbnailUrl: createVadodaraRefinerySvgDataUrl(),
    widthPx: 1200,
    heightPx: 900,
    pixelsPerMeter: 3.5,
    getRawDetections: () => ({
      metadata: {
        id: 'FAC-REF002-VADODARA',
        name: 'Vadodara Petrochemical Refinery (REF-002)',
        blueprintWidthPx: 1200,
        blueprintHeightPx: 900,
        pixelsPerMeter: 3.5,
        scaleConfidence: 0.97,
        source: 'demo_template' as const,
        sourceFileName: 'vadodara_refinery_ref002.png',
      },
      assets: [
        // 3 LPG Spheres in EAST Sector
        {
          id: 'TK-LPG-01',
          name: 'High-Pressure LPG Sphere S-101',
          type: 'LPG_SPHERE' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 780, y: 180 },
          pixelDimensions: { width: 104, height: 104 },
          rotationDeg: 0,
          detectionConfidence: 0.98,
          classificationConfidence: 0.96,
          confidence: 0.96,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large circular sphere in East sector', 'Nearby OCR: "SPHERE S-101"'],
          nearbyText: 'SPHERE S-101',
          legendMatch: 'LPG SPHERE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 90, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', pressureBar: 18.5, equipmentTag: 'S-101' },
        },
        {
          id: 'TK-LPG-02',
          name: 'High-Pressure LPG Sphere S-102',
          type: 'LPG_SPHERE' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 780, y: 330 },
          pixelDimensions: { width: 104, height: 104 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large circular sphere in East sector', 'Nearby OCR: "SPHERE S-102"'],
          nearbyText: 'SPHERE S-102',
          legendMatch: 'LPG SPHERE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 90, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', pressureBar: 18.5, equipmentTag: 'S-102' },
        },
        {
          id: 'TK-LPG-03',
          name: 'High-Pressure LPG Sphere S-103',
          type: 'LPG_SPHERE' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 780, y: 580 },
          pixelDimensions: { width: 104, height: 104 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large circular sphere in East sector', 'Nearby OCR: "SPHERE S-103"'],
          nearbyText: 'SPHERE S-103',
          legendMatch: 'LPG SPHERE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
          metadata: { capacityM3: 90, fuelType: 'LPG', substanceName: 'Liquefied Petroleum Gas', pressureBar: 18.5, equipmentTag: 'S-103' },
        },
        // 4 Horizontal Bullet Vessels in NORTH Sector
        {
          id: 'TK-BULLET-01',
          name: 'Horizontal Pressure Bullet T-201',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 195, y: 132 },
          pixelDimensions: { width: 150, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule vessel in North bank', 'Nearby OCR: "BULLET T-201"'],
          nearbyText: 'BULLET T-201',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
        },
        {
          id: 'TK-BULLET-02',
          name: 'Horizontal Pressure Bullet T-202',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 375, y: 132 },
          pixelDimensions: { width: 150, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.95,
          classificationConfidence: 0.93,
          confidence: 0.93,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule vessel in North bank', 'Nearby OCR: "BULLET T-202"'],
          nearbyText: 'BULLET T-202',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
        },
        {
          id: 'TK-BULLET-03',
          name: 'Horizontal Pressure Bullet T-203',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 195, y: 202 },
          pixelDimensions: { width: 150, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.95,
          classificationConfidence: 0.93,
          confidence: 0.93,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule vessel in North bank', 'Nearby OCR: "BULLET T-203"'],
          nearbyText: 'BULLET T-203',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
        },
        {
          id: 'TK-BULLET-04',
          name: 'Horizontal Pressure Bullet T-204',
          type: 'LPG_BULLET' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 375, y: 202 },
          pixelDimensions: { width: 150, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.94,
          classificationConfidence: 0.92,
          confidence: 0.92,
          confidenceTier: 'HIGH' as const,
          evidence: ['Horizontal capsule vessel in North bank', 'Nearby OCR: "BULLET T-204"'],
          nearbyText: 'BULLET T-204',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['BLEVE' as const, 'POOL_FIRE' as const],
        },
        // Buildings & Process
        {
          id: 'PROC-01',
          name: 'Catalytic Cracking Unit CCU-01',
          type: 'PROCESS_AREA' as const,
          category: 'PROCESS_UTILITY' as const,
          pixelPos: { x: 285, y: 340 },
          pixelDimensions: { width: 330, height: 120 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Major distillation & cracking complex', 'Nearby OCR: "CATALYTIC CRACKING UNIT"'],
          nearbyText: 'CATALYTIC CRACKING UNIT',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'CR-01',
          name: 'Central Operations & Admin Building',
          type: 'CONTROL_ROOM' as const,
          category: 'BUILDING' as const,
          pixelPos: { x: 210, y: 575 },
          pixelDimensions: { width: 180, height: 110 },
          rotationDeg: 0,
          detectionConfidence: 0.98,
          classificationConfidence: 0.96,
          confidence: 0.96,
          confidenceTier: 'HIGH' as const,
          evidence: ['Control and admin center', 'Nearby OCR: "CENTRAL CONTROL & ADMIN"'],
          nearbyText: 'CENTRAL CONTROL & ADMIN',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
      ],
      roads: [
        {
          id: 'ROAD-NORTH-SOUTH',
          name: 'Central Refinery Spine Road',
          type: 'ROAD' as const,
          points: [
            { pixelX: 515, pixelY: 60, worldX: -24, worldZ: -113 },
            { pixelX: 515, pixelY: 840, worldX: -24, worldZ: 113 },
          ],
          widthM: 14.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'ROAD-EAST-WEST',
          name: 'Central Inter-Sector Arterial',
          type: 'ROAD' as const,
          points: [
            { pixelX: 60, pixelY: 444, worldX: -154, worldZ: -1 },
            { pixelX: 960, pixelY: 444, worldX: 103, worldZ: -1 },
          ],
          widthM: 14.0,
          confidence: 0.98,
          confirmed: true,
        },
      ],
      zones: [],
      gates: [
        {
          id: 'GATE-NORTH',
          name: 'North Emergency Access Gate',
          pixelPos: { x: 515, y: 60 },
          worldPos: { x: -24, z: -113 },
          headingDeg: 0,
          cardinal: 'N',
          widthM: 16.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'GATE-SOUTH',
          name: 'South Logistics Entry Gate',
          pixelPos: { x: 515, y: 840 },
          worldPos: { x: -24, z: 113 },
          headingDeg: 180,
          cardinal: 'S',
          widthM: 16.0,
          confidence: 0.98,
          confirmed: true,
        },
      ],
    }),
  },

  // ── PRESET 3: Mangalore Coastal Fuel Terminal (MNG-003) ──
  {
    id: 'TEMPLATE_MANGALORE_TERMINAL',
    name: 'Mangalore Coastal Bulk Fuel Depot (MNG-003)',
    description: 'Bulk Storage MNG-003: 4x Cylindrical Hydrocarbon Atmospheric Tanks (Center), Dual Tanker Loading Bays (South), Fire Water Pond (NW), Security Gate on East Perimeter.',
    thumbnailUrl: createMangaloreTerminalSvgDataUrl(),
    widthPx: 1200,
    heightPx: 900,
    pixelsPerMeter: 3.5,
    getRawDetections: () => ({
      metadata: {
        id: 'FAC-MNG003-MANGALORE',
        name: 'Mangalore Coastal Bulk Fuel Depot (MNG-003)',
        blueprintWidthPx: 1200,
        blueprintHeightPx: 900,
        pixelsPerMeter: 3.5,
        scaleConfidence: 0.98,
        source: 'demo_template' as const,
        sourceFileName: 'mangalore_depot_mng003.png',
      },
      assets: [
        // 4 Atmospheric Storage Tanks
        {
          id: 'TK-STORAGE-01',
          name: 'Primary Diesel Storage Tank T-501',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 320, y: 220 },
          pixelDimensions: { width: 130, height: 130 },
          rotationDeg: 0,
          detectionConfidence: 0.98,
          classificationConfidence: 0.96,
          confidence: 0.96,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large cylindrical atmospheric fuel reservoir', 'Nearby OCR: "STORAGE TANK T-501"'],
          nearbyText: 'STORAGE TANK T-501',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
          metadata: { capacityM3: 450, fuelType: 'Diesel', substanceName: 'Diesel Fuel Oil', equipmentTag: 'T-501' },
        },
        {
          id: 'TK-STORAGE-02',
          name: 'Primary Gasoline Storage Tank T-502',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 560, y: 220 },
          pixelDimensions: { width: 130, height: 130 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large cylindrical atmospheric fuel reservoir', 'Nearby OCR: "STORAGE TANK T-502"'],
          nearbyText: 'STORAGE TANK T-502',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
          metadata: { capacityM3: 450, fuelType: 'Gasoline', substanceName: 'Motor Gasoline', equipmentTag: 'T-502' },
        },
        {
          id: 'TK-STORAGE-03',
          name: 'Secondary Diesel Storage Tank T-503',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 320, y: 440 },
          pixelDimensions: { width: 130, height: 130 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large cylindrical atmospheric fuel reservoir', 'Nearby OCR: "STORAGE TANK T-503"'],
          nearbyText: 'STORAGE TANK T-503',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
        },
        {
          id: 'TK-STORAGE-04',
          name: 'Secondary Gasoline Storage Tank T-504',
          type: 'STORAGE_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 560, y: 440 },
          pixelDimensions: { width: 130, height: 130 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Large cylindrical atmospheric fuel reservoir', 'Nearby OCR: "STORAGE TANK T-504"'],
          nearbyText: 'STORAGE TANK T-504',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: true,
          hazardCompatibleTypes: ['POOL_FIRE' as const],
        },
        // South Sector: Tanker Loading Bays
        {
          id: 'BAY-01',
          name: 'Bulk Tanker Loading Gantry #1',
          type: 'LOADING_BAY' as const,
          category: 'INFRASTRUCTURE' as const,
          pixelPos: { x: 330, y: 752 },
          pixelDimensions: { width: 220, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Tanker truck dispatch gantry', 'Nearby OCR: "TANKER LOADING BAY #1"'],
          nearbyText: 'TANKER LOADING BAY #1',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'BAY-02',
          name: 'Bulk Tanker Loading Gantry #2',
          type: 'LOADING_BAY' as const,
          category: 'INFRASTRUCTURE' as const,
          pixelPos: { x: 590, y: 752 },
          pixelDimensions: { width: 220, height: 45 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Tanker truck dispatch gantry', 'Nearby OCR: "TANKER LOADING BAY #2"'],
          nearbyText: 'TANKER LOADING BAY #2',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        // Northwest Fire Water System
        {
          id: 'FW-101',
          name: 'Fire Protection Water Basin FW-501',
          type: 'FIRE_WATER_TANK' as const,
          category: 'HAZARDOUS_STORAGE' as const,
          pixelPos: { x: 140, y: 160 },
          pixelDimensions: { width: 90, height: 90 },
          rotationDeg: 0,
          detectionConfidence: 0.97,
          classificationConfidence: 0.95,
          confidence: 0.95,
          confidenceTier: 'HIGH' as const,
          evidence: ['Dedicated fire water basin', 'Nearby OCR: "FIRE WATER FW-501"'],
          nearbyText: 'FIRE WATER FW-501',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
        {
          id: 'FPH-01',
          name: 'Emergency Fire Pump Station',
          type: 'FIRE_PUMP_HOUSE' as const,
          category: 'PROCESS_UTILITY' as const,
          pixelPos: { x: 140, y: 270 },
          pixelDimensions: { width: 90, height: 60 },
          rotationDeg: 0,
          detectionConfidence: 0.96,
          classificationConfidence: 0.94,
          confidence: 0.94,
          confidenceTier: 'HIGH' as const,
          evidence: ['Dedicated fire pump house', 'Nearby OCR: "FIRE PUMP HOUSE"'],
          nearbyText: 'FIRE PUMP HOUSE',
          confirmed: true,
          verified: true,
          source: 'ai' as const,
          simulationEnabled: false,
        },
      ],
      roads: [
        {
          id: 'ROAD-EAST-SPINE',
          name: 'East Security Access Corridor',
          type: 'ROAD' as const,
          points: [
            { pixelX: 905, pixelY: 60, worldX: 87, worldZ: -113 },
            { pixelX: 905, pixelY: 840, worldX: 87, worldZ: 113 },
          ],
          widthM: 14.0,
          confidence: 0.98,
          confirmed: true,
        },
        {
          id: 'ROAD-SOUTH-LOOP',
          name: 'South Loading Gantry Loop',
          type: 'ROAD' as const,
          points: [
            { pixelX: 60, pixelY: 685, worldX: -154, worldZ: 67 },
            { pixelX: 905, pixelY: 685, worldX: 87, worldZ: 67 },
          ],
          widthM: 14.0,
          confidence: 0.98,
          confirmed: true,
        },
      ],
      zones: [],
      gates: [
        {
          id: 'GATE-EAST',
          name: 'Main Security Entry Gate (East)',
          pixelPos: { x: 950, y: 685 },
          worldPos: { x: 100, z: 67 },
          headingDeg: 90,
          cardinal: 'E',
          widthM: 16.0,
          confidence: 0.98,
          confirmed: true,
        },
      ],
    }),
  },
];

export const loadDemoBlueprintTemplate = (templateId = 'TEMPLATE_CHENNAI_LPG'): {
  template: typeof DEMO_BLUEPRINT_TEMPLATES[0];
  schema: FacilitySchema;
} => {
  const tpl =
    DEMO_BLUEPRINT_TEMPLATES.find((t) => t.id === templateId) ||
    DEMO_BLUEPRINT_TEMPLATES.find((t) => t.id === 'TEMPLATE_CHENNAI_LPG') ||
    DEMO_BLUEPRINT_TEMPLATES[0];
  const raw = tpl.getRawDetections();
  const schema = validateAndNormalizeFacilitySchema(raw);
  return { template: tpl, schema };
};
