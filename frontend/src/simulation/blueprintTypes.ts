// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Industrial Asset Taxonomy & Normalized Facility Schema
// Centralized Canonical Asset Classification, Evidence Modeling, and Metadata
// ────────────────────────────────────────────────────────────────────────────

export type FacilityAssetCategory =
  | 'HAZARDOUS_STORAGE'
  | 'PROCESS_UTILITY'
  | 'BUILDING'
  | 'INFRASTRUCTURE'
  | 'SAFETY'
  | 'UNKNOWN';

export type FacilityAssetType =
  // ── Hazardous Assets ──
  | 'LPG_SPHERE'
  | 'LPG_BULLET_TANK'
  | 'LPG_BULLET'
  | 'STORAGE_TANK'
  | 'PROCESS_VESSEL'
  | 'PRESSURE_VESSEL'
  | 'FLARE_STACK'
  | 'PROCESS_COLUMN'
  | 'REACTOR'
  | 'HEAT_EXCHANGER'
  | 'FIRE_WATER_TANK'
  // ── Process / Utility Assets ──
  | 'PIPE_RACK'
  | 'PUMP_HOUSE'
  | 'PROCESS_AREA'
  | 'UTILITY_AREA'
  | 'FIRE_PUMP_HOUSE'
  | 'COOLING_TOWER'
  | 'ELECTRICAL_SUBSTATION'
  // ── Buildings ──
  | 'CONTROL_ROOM'
  | 'WAREHOUSE'
  | 'MAINTENANCE_SHOP'
  | 'ADMIN_BUILDING'
  | 'OPERATIONS_BUILDING'
  | 'OTHER_BUILDING'
  | 'BUILDING'
  // ── Infrastructure & Safety ──
  | 'ROAD'
  | 'ACCESS_ROAD'
  | 'GATE'
  | 'PERIMETER_FENCE'
  | 'ASSEMBLY_POINT'
  | 'TRUCK_LOADING_BAY'
  | 'LOADING_BAY'
  | 'PARKING_AREA'
  | 'RESTRICTED_AREA'
  | 'STORAGE_AREA'
  | 'FIRE_WATER_SYSTEM'
  | 'EMERGENCY_ACCESS'
  // ── Unknown / Fallback ──
  | 'UNKNOWN_ASSET'
  | 'UNKNOWN';

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export type WorkflowStage =
  | 'UPLOAD'
  | 'ANALYZE'
  | 'REVIEW'
  | 'GENERATE'
  | 'SIMULATE';

export interface GeometryEvidence {
  shape: 'CIRCULAR' | 'HORIZONTAL_CAPSULE' | 'RECTANGULAR' | 'LINEAR' | 'IRREGULAR';
  aspectRatio: number; // width / height
  circularity: number; // 0.0 to 1.0
  areaPx: number;
  orientationDeg: number;
}

export interface FacilityMetadata {
  id: string;
  name: string;
  blueprintWidthPx: number;
  blueprintHeightPx: number;
  realWorldWidthM: number;
  realWorldHeightM: number;
  pixelsPerMeter: number;
  scaleConfidence: number;
  source: 'blueprint' | 'demo_template' | 'manual';
  sourceFileName?: string;
  createdAt: string;
}

export interface FacilityAsset {
  id: string;
  name: string;
  type: FacilityAssetType;
  category: FacilityAssetCategory;
  // 2D Blueprint pixel space (top-left origin)
  pixelPos: {
    x: number;
    y: number;
  };
  pixelDimensions: {
    width: number;
    height: number;
  };
  // 3D World space (center origin in meters)
  worldPos: {
    x: number;
    y: number; // Elevation
    z: number;
  };
  worldDimensions: {
    width: number;
    depth: number;
    height: number;
  };
  rotationDeg: number;
  // Confidence breakdown & multi-modal evidence
  detectionConfidence: number;
  classificationConfidence: number;
  confidence: number;
  confidenceTier: ConfidenceTier;
  evidence: string[];
  nearbyText?: string;
  geometryFeatures?: GeometryEvidence;
  legendMatch?: string;
  source: 'ai' | 'manual' | 'template';
  confirmed: boolean;
  verified: boolean;
  simulationEnabled: boolean;
  hazardCompatibleTypes?: ('BLEVE' | 'POOL_FIRE')[];
  metadata?: {
    capacityM3?: number;
    fuelType?: string;
    substanceName?: string;
    temperatureC?: number;
    pressureBar?: number;
    equipmentTag?: string;
  };
}

export interface FacilityRoadPoint {
  pixelX: number;
  pixelY: number;
  worldX: number;
  worldZ: number;
}

export interface FacilityRoad {
  id: string;
  name: string;
  type: 'ROAD' | 'ACCESS_ROAD';
  points: FacilityRoadPoint[];
  widthM: number;
  confidence: number;
  confirmed: boolean;
}

export interface FacilityZone {
  id: string;
  name: string;
  type: 'RESTRICTED_AREA' | 'STORAGE_AREA' | 'ASSEMBLY_AREA';
  polygon: FacilityRoadPoint[];
  confidence: number;
  confirmed: boolean;
}

export interface FacilityGate {
  id: string;
  name: string;
  pixelPos: { x: number; y: number };
  worldPos: { x: number; z: number };
  headingDeg: number;
  cardinal: string;
  widthM: number;
  confidence: number;
  confirmed: boolean;
}

export interface FacilitySchema {
  schemaVersion: number;
  metadata: FacilityMetadata;
  assets: FacilityAsset[];
  roads: FacilityRoad[];
  zones: FacilityZone[];
  gates: FacilityGate[];
  summary: {
    totalAssets: number;
    hazardousAssetsCount: number;
    buildingsCount: number;
    processCount: number;
    roadsCount: number;
    gatesCount: number;
    highConfidenceCount: number;
    mediumConfidenceCount: number;
    lowConfidenceCount: number;
    unknownCount: number;
    layoutConfidencePct: number;
  };
}

export interface BlueprintScaleConfig {
  mode: 'AUTO' | 'REFERENCE_DIMENSION' | 'MANUAL_PX_PER_M' | 'APPROXIMATE';
  pixelsPerMeter: number;
  referenceObject?: {
    assetId: string;
    label: string;
    actualDimensionM: number;
  };
  confidence: number;
}
