// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Multi-Evidence Industrial Blueprint Classifier
// Evaluates OCR text, visual geometry, aspect ratio, and legend mappings to assign canonical asset classes
// ────────────────────────────────────────────────────────────────────────────

import {
  FacilityAssetType,
  FacilityAssetCategory,
  GeometryEvidence,
  ConfidenceTier,
} from './blueprintTypes';

export const ASSET_CATEGORY_MAP: Record<FacilityAssetType, FacilityAssetCategory> = {
  LPG_SPHERE: 'HAZARDOUS_STORAGE',
  LPG_BULLET_TANK: 'HAZARDOUS_STORAGE',
  LPG_BULLET: 'HAZARDOUS_STORAGE',
  STORAGE_TANK: 'HAZARDOUS_STORAGE',
  PROCESS_VESSEL: 'HAZARDOUS_STORAGE',
  PRESSURE_VESSEL: 'HAZARDOUS_STORAGE',
  FLARE_STACK: 'HAZARDOUS_STORAGE',
  PROCESS_COLUMN: 'HAZARDOUS_STORAGE',
  REACTOR: 'HAZARDOUS_STORAGE',
  HEAT_EXCHANGER: 'HAZARDOUS_STORAGE',
  FIRE_WATER_TANK: 'HAZARDOUS_STORAGE',

  PIPE_RACK: 'PROCESS_UTILITY',
  PUMP_HOUSE: 'PROCESS_UTILITY',
  PROCESS_AREA: 'PROCESS_UTILITY',
  UTILITY_AREA: 'PROCESS_UTILITY',
  FIRE_PUMP_HOUSE: 'PROCESS_UTILITY',
  COOLING_TOWER: 'PROCESS_UTILITY',
  ELECTRICAL_SUBSTATION: 'PROCESS_UTILITY',

  CONTROL_ROOM: 'BUILDING',
  WAREHOUSE: 'BUILDING',
  MAINTENANCE_SHOP: 'BUILDING',
  ADMIN_BUILDING: 'BUILDING',
  OPERATIONS_BUILDING: 'BUILDING',
  OTHER_BUILDING: 'BUILDING',
  BUILDING: 'BUILDING',

  ROAD: 'INFRASTRUCTURE',
  ACCESS_ROAD: 'INFRASTRUCTURE',
  GATE: 'INFRASTRUCTURE',
  PERIMETER_FENCE: 'INFRASTRUCTURE',
  ASSEMBLY_POINT: 'SAFETY',
  TRUCK_LOADING_BAY: 'INFRASTRUCTURE',
  LOADING_BAY: 'INFRASTRUCTURE',
  PARKING_AREA: 'INFRASTRUCTURE',
  RESTRICTED_AREA: 'SAFETY',
  STORAGE_AREA: 'INFRASTRUCTURE',
  FIRE_WATER_SYSTEM: 'SAFETY',
  EMERGENCY_ACCESS: 'SAFETY',
  UNKNOWN_ASSET: 'UNKNOWN',
  UNKNOWN: 'UNKNOWN',
};

// ── 1. Document Metadata & Legend Exclusion Regions ─────────────────────────
export interface ExclusionRegion {
  name: string;
  minXPct: number;
  maxXPct: number;
  minYPct: number;
  maxYPct: number;
}

export const METADATA_EXCLUSION_REGIONS: ExclusionRegion[] = [
  // Legend column on the right side
  { name: 'LEGEND_REGION', minXPct: 0.82, maxXPct: 1.0, minYPct: 0.22, maxYPct: 0.68 },
  // Notes and drawing status on lower-right
  { name: 'NOTES_REGION', minXPct: 0.82, maxXPct: 1.0, minYPct: 0.68, maxYPct: 0.82 },
  // Title block on bottom-right
  { name: 'TITLE_BLOCK_REGION', minXPct: 0.80, maxXPct: 1.0, minYPct: 0.82, maxYPct: 1.0 },
  // Drawing header on top-right
  { name: 'DRAWING_HEADER_REGION', minXPct: 0.80, maxXPct: 1.0, minYPct: 0.0, maxYPct: 0.22 },
  // Coordinate table on bottom-left
  { name: 'COORDINATE_TABLE_REGION', minXPct: 0.0, maxXPct: 0.26, minYPct: 0.82, maxYPct: 1.0 },
  // Border grid frame margins (outer 3.5% perimeter margin)
  { name: 'TOP_GRID_BORDER', minXPct: 0.0, maxXPct: 1.0, minYPct: 0.0, maxYPct: 0.045 },
  { name: 'BOTTOM_GRID_BORDER', minXPct: 0.0, maxXPct: 1.0, minYPct: 0.955, maxYPct: 1.0 },
  { name: 'LEFT_GRID_BORDER', minXPct: 0.0, maxXPct: 0.045, minYPct: 0.0, maxYPct: 1.0 },
  { name: 'RIGHT_GRID_BORDER', minXPct: 0.955, maxXPct: 1.0, minYPct: 0.0, maxYPct: 1.0 },
];

/**
 * Checks if a bounding box falls within drawing metadata/legend zones
 */
export const isMetadataExclusionRegion = (
  pixelX: number,
  pixelY: number,
  canvasWidth: number,
  canvasHeight: number
): { isExcluded: boolean; reason?: string } => {
  const normX = pixelX / canvasWidth;
  const normY = pixelY / canvasHeight;

  for (const reg of METADATA_EXCLUSION_REGIONS) {
    if (
      normX >= reg.minXPct &&
      normX <= reg.maxXPct &&
      normY >= reg.minYPct &&
      normY <= reg.maxYPct
    ) {
      return { isExcluded: true, reason: `Excluded drawing metadata zone: ${reg.name}` };
    }
  }

  return { isExcluded: false };
};

// ── 2. Lexicon Keywords Matcher ─────────────────────────────────────────────
interface KeywordMatchRule {
  type: FacilityAssetType;
  keywords: string[];
  weight: number;
}

const KEYWORD_RULES: KeywordMatchRule[] = [
  {
    type: 'LPG_SPHERE',
    keywords: ['LPG SPHERE', 'SPHERE', 'T-101', 'T-102', 'SPHERICAL', 'TK-LPG'],
    weight: 0.95,
  },
  {
    type: 'LPG_BULLET_TANK',
    keywords: ['BULLET TANK', 'LPG BULLET', 'T-103', 'T-104', 'BULLET', 'TK-BULLET', 'CAPSULE'],
    weight: 0.95,
  },
  {
    type: 'FIRE_PUMP_HOUSE',
    keywords: ['FIRE PUMP HOUSE', 'FIRE PUMP', 'FPH-'],
    weight: 0.96,
  },
  {
    type: 'PUMP_HOUSE',
    keywords: ['PUMP HOUSE', 'PUMP STA', 'LPG PUMP', 'PH-'],
    weight: 0.92,
  },
  {
    type: 'FIRE_WATER_TANK',
    keywords: ['FIRE WATER TANK', 'FW-101', 'FIRE WATER', 'WATER TANK'],
    weight: 0.94,
  },
  {
    type: 'STORAGE_TANK',
    keywords: ['STORAGE TANK', 'T-201', 'T-202', 'ATMOSPHERIC TANK', 'TK-STORAGE'],
    weight: 0.92,
  },
  {
    type: 'FLARE_STACK',
    keywords: ['FLARE STACK', 'FLARE', 'STACK', 'ELEVATED FLARE'],
    weight: 0.95,
  },
  {
    type: 'CONTROL_ROOM',
    keywords: ['CONTROL ROOM', 'CCR', 'CENTRAL CONTROL', 'OPERATIONS CONTROL', 'CR-'],
    weight: 0.96,
  },
  {
    type: 'WAREHOUSE',
    keywords: ['WAREHOUSE', 'W-01', 'STORAGE WAREHOUSE', 'WH-'],
    weight: 0.94,
  },
  {
    type: 'MAINTENANCE_SHOP',
    keywords: ['MAINTENANCE SHOP', 'M-01', 'WORKSHOP', 'MS-'],
    weight: 0.94,
  },
  {
    type: 'PROCESS_AREA',
    keywords: ['PROCESS AREA', 'PROCESS UNIT', 'FRACTIONATION', 'PROC-'],
    weight: 0.92,
  },
  {
    type: 'PIPE_RACK',
    keywords: ['PIPE RACK', 'R-01', 'R-02', 'PIPE BRIDGE', 'RACK-'],
    weight: 0.94,
  },
  {
    type: 'COOLING_TOWER',
    keywords: ['COOLING TOWER', 'COOLING BASIN', 'CT-'],
    weight: 0.92,
  },
  {
    type: 'ELECTRICAL_SUBSTATION',
    keywords: ['ELECTRICAL SUBSTATION', 'SUBSTATION', 'TRANSFORMER', 'SUB-'],
    weight: 0.92,
  },
  {
    type: 'UTILITY_AREA',
    keywords: ['UTILITY AREA', 'AIR COMPRESSOR', 'UTILITIES', 'UTIL-'],
    weight: 0.90,
  },
  {
    type: 'ASSEMBLY_POINT',
    keywords: ['ASSEMBLY POINT', 'MUSTER POINT', 'AP-'],
    weight: 0.96,
  },
  {
    type: 'TRUCK_LOADING_BAY',
    keywords: ['TRUCK LOADING BAY', 'LOADING BAY', 'GANTRY', 'BAY-'],
    weight: 0.94,
  },
  {
    type: 'GATE',
    keywords: ['GATE', 'MAIN GATE', 'SECONDARY GATE', 'ACCESS GATE', 'SECURITY GATE'],
    weight: 0.96,
  },
];

export const matchOcrText = (
  text?: string
): { matchedType?: FacilityAssetType; score: number; keyword?: string } => {
  if (!text) return { score: 0 };
  const upper = text.toUpperCase().trim();

  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (upper.includes(kw)) {
        return { matchedType: rule.type, score: rule.weight, keyword: kw };
      }
    }
  }

  return { score: 0 };
};

// ── 3. Visual Geometry & Aspect Ratio Evaluation ────────────────────────────
export const evaluateGeometryFeatures = (
  widthPx: number,
  heightPx: number,
  detectedShape?: string
): GeometryEvidence => {
  const area = widthPx * heightPx;
  const aspectRatio = widthPx / Math.max(1, heightPx);
  const diff = Math.abs(widthPx - heightPx);
  const maxDim = Math.max(widthPx, heightPx);
  const circularity = Math.max(0, 1.0 - diff / maxDim);

  let shape: GeometryEvidence['shape'] = 'RECTANGULAR';

  if (aspectRatio >= 3.5 || (1 / aspectRatio >= 3.5)) {
    shape = 'LINEAR';
  } else if (aspectRatio >= 1.7 && aspectRatio < 3.5) {
    shape = 'HORIZONTAL_CAPSULE';
  } else if (circularity >= 0.95) {
    shape = 'CIRCULAR';
  } else {
    shape = 'RECTANGULAR';
  }

  return {
    shape,
    aspectRatio: Math.round(aspectRatio * 100) / 100,
    circularity: Math.round(circularity * 100) / 100,
    areaPx: Math.round(area),
    orientationDeg: aspectRatio > 1.0 ? 0 : 90,
  };
};

// ── 4. Multi-Evidence Classification Solver ─────────────────────────────────
export interface ClassificationResult {
  type: FacilityAssetType;
  category: FacilityAssetCategory;
  confidence: number;
  confidenceTier: ConfidenceTier;
  evidence: string[];
  semanticIdPrefix: string;
}

export const classifyIndustrialAsset = (
  bbox: { width: number; height: number },
  nearbyText?: string,
  legendMatchSymbol?: string
): ClassificationResult => {
  const geom = evaluateGeometryFeatures(bbox.width, bbox.height);
  const ocr = matchOcrText(nearbyText);
  const evidence: string[] = [];

  let finalType: FacilityAssetType = 'UNKNOWN_ASSET';
  let conf = 0.70;

  // 1. Text Evidence (Highest Priority)
  if (ocr.matchedType) {
    finalType = ocr.matchedType;
    conf = Math.max(conf, ocr.score);
    evidence.push(`OCR text match: "${ocr.keyword}" in "${nearbyText}" (score: ${ocr.score})`);
  }

  // 2. Geometry Evidence Validation
  if (geom.shape === 'CIRCULAR') {
    evidence.push(`Circular radial geometry (circularity: ${geom.circularity})`);
    if (!ocr.matchedType) {
      finalType = 'STORAGE_TANK';
      conf = 0.82;
    }
  } else if (geom.shape === 'HORIZONTAL_CAPSULE') {
    evidence.push(`Horizontal cylindrical capsule geometry (aspect ratio: ${geom.aspectRatio})`);
    if (!ocr.matchedType) {
      finalType = 'LPG_BULLET_TANK';
      conf = 0.86;
    }
  } else if (geom.shape === 'LINEAR') {
    evidence.push(`Elongated structural run (aspect ratio: ${geom.aspectRatio})`);
    if (!ocr.matchedType) {
      finalType = 'PIPE_RACK';
      conf = 0.84;
    }
  } else if (geom.shape === 'RECTANGULAR') {
    evidence.push(`Rectangular building footprint (${bbox.width}px × ${bbox.height}px)`);
    if (!ocr.matchedType) {
      finalType = 'BUILDING';
      conf = 0.80;
    }
  }

  // 3. Legend Match Integration
  if (legendMatchSymbol) {
    evidence.push(`Blueprint legend symbol correspondence: ${legendMatchSymbol}`);
    conf = Math.min(0.98, conf + 0.04);
  }

  // Sanity check: Long horizontal capsule should NEVER be classified as LPG_SPHERE
  if (finalType === 'LPG_SPHERE' && geom.shape === 'HORIZONTAL_CAPSULE') {
    finalType = 'LPG_BULLET_TANK';
    evidence.push('Classification override: Geometry is horizontal capsule; converted from sphere to bullet tank.');
  }

  // Sanity check: Circular tank should NOT be classified as bullet tank
  if (finalType === 'LPG_BULLET_TANK' && geom.shape === 'CIRCULAR' && geom.circularity > 0.85) {
    finalType = 'LPG_SPHERE';
    evidence.push('Classification override: Geometry is circular radial; converted from bullet tank to LPG sphere.');
  }

  const category = ASSET_CATEGORY_MAP[finalType] || 'UNKNOWN';

  let tier: ConfidenceTier = 'HIGH';
  if (conf >= 0.85) tier = 'HIGH';
  else if (conf >= 0.70) tier = 'MEDIUM';
  else tier = 'LOW';

  const semanticIdPrefix = getSemanticPrefix(finalType);

  return {
    type: finalType,
    category,
    confidence: Math.round(conf * 100) / 100,
    confidenceTier: tier,
    evidence,
    semanticIdPrefix,
  };
};

export const getSemanticPrefix = (type: FacilityAssetType): string => {
  switch (type) {
    case 'LPG_SPHERE':
      return 'TK-LPG';
    case 'LPG_BULLET_TANK':
      return 'TK-BULLET';
    case 'STORAGE_TANK':
      return 'TK-STORAGE';
    case 'FIRE_WATER_TANK':
      return 'FW';
    case 'CONTROL_ROOM':
      return 'CR';
    case 'WAREHOUSE':
      return 'WH';
    case 'MAINTENANCE_SHOP':
      return 'MS';
    case 'PUMP_HOUSE':
      return 'PH';
    case 'FIRE_PUMP_HOUSE':
      return 'FPH';
    case 'PROCESS_AREA':
      return 'PROC';
    case 'PIPE_RACK':
      return 'RACK';
    case 'COOLING_TOWER':
      return 'CT';
    case 'ELECTRICAL_SUBSTATION':
      return 'SUB';
    case 'FLARE_STACK':
      return 'STACK';
    case 'UTILITY_AREA':
      return 'UTIL';
    case 'ASSEMBLY_POINT':
      return 'AP';
    case 'TRUCK_LOADING_BAY':
      return 'BAY';
    case 'GATE':
      return 'GATE';
    default:
      return 'BLDG';
  }
};
