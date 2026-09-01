// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint Schema Validator & Confidence Engine
// Sanitizes raw detections, excludes legend/title metadata, and validates simulation readiness
// ────────────────────────────────────────────────────────────────────────────

import {
  FacilitySchema,
  FacilityAsset,
  FacilityRoad,
  FacilityZone,
  FacilityGate,
  FacilityMetadata,
  ConfidenceTier,
  FacilityAssetType,
} from './blueprintTypes';
import {
  blueprintToWorldCoordinates,
  pixelToWorldDimensions,
  CoordinateTransformConfig,
} from './coordinateTransformer';
import {
  isMetadataExclusionRegion,
  classifyIndustrialAsset,
  ASSET_CATEGORY_MAP,
} from './blueprintClassifier';

export const getConfidenceTier = (confidence: number): ConfidenceTier => {
  if (confidence >= 0.85) return 'HIGH';
  if (confidence >= 0.7) return 'MEDIUM';
  if (confidence > 0) return 'LOW';
  return 'UNKNOWN';
};

export const HAZARDOUS_ASSET_TYPES: FacilityAssetType[] = [
  'LPG_SPHERE',
  'LPG_BULLET_TANK',
  'STORAGE_TANK',
  'PROCESS_VESSEL',
  'PRESSURE_VESSEL',
  'FLARE_STACK',
  'PROCESS_COLUMN',
  'REACTOR',
  'HEAT_EXCHANGER',
  'FIRE_WATER_TANK',
];

/**
 * Validates and normalizes raw detection inputs into a strict, sanitized FacilitySchema
 */
export const validateAndNormalizeFacilitySchema = (raw: {
  metadata?: Partial<FacilityMetadata>;
  assets?: Partial<FacilityAsset>[];
  roads?: Partial<FacilityRoad>[];
  zones?: Partial<FacilityZone>[];
  gates?: Partial<FacilityGate>[];
}): FacilitySchema => {
  const widthPx = Math.max(400, raw.metadata?.blueprintWidthPx || 1200);
  const heightPx = Math.max(400, raw.metadata?.blueprintHeightPx || 900);
  const ppm = Math.max(0.5, raw.metadata?.pixelsPerMeter || 3.5);

  const transformConfig: CoordinateTransformConfig = {
    blueprintWidthPx: widthPx,
    blueprintHeightPx: heightPx,
    pixelsPerMeter: ppm,
  };

  const metadata: FacilityMetadata = {
    id: raw.metadata?.id || `FAC-BP-${Date.now().toString(36).toUpperCase()}`,
    name: raw.metadata?.name || 'Imported Industrial Petrochemical Complex',
    blueprintWidthPx: widthPx,
    blueprintHeightPx: heightPx,
    realWorldWidthM: Math.round(widthPx / ppm),
    realWorldHeightM: Math.round(heightPx / ppm),
    pixelsPerMeter: ppm,
    scaleConfidence: raw.metadata?.scaleConfidence ?? 0.94,
    source: raw.metadata?.source || 'blueprint',
    sourceFileName: raw.metadata?.sourceFileName || 'blueprint_plan.png',
    createdAt: raw.metadata?.createdAt || new Date().toISOString(),
  };

  // 1. Sanitize & Normalize Assets (with Metadata Exclusion & Multi-Evidence Classification)
  const validAssets: FacilityAsset[] = [];
  const typeCounter: Record<string, number> = {};

  (raw.assets || []).forEach((rawAsset, idx) => {
    const posX = Math.max(0, Math.min(widthPx, rawAsset.pixelPos?.x ?? 200 + (idx % 4) * 150));
    const posY = Math.max(0, Math.min(heightPx, rawAsset.pixelPos?.y ?? 150 + Math.floor(idx / 4) * 150));
    const dimW = Math.max(10, rawAsset.pixelDimensions?.width ?? 45);
    const dimH = Math.max(10, rawAsset.pixelDimensions?.height ?? 45);

    // Filter out objects inside Legend, Title Block, Notes, Coordinate Table, or Grid Margin
    const exclusionCheck = isMetadataExclusionRegion(posX, posY, widthPx, heightPx);
    if (exclusionCheck.isExcluded) {
      return; // Skip legend / title block false positives!
    }

    // Run Multi-Evidence Classifier if type is not manually verified
    let assetType: FacilityAssetType = rawAsset.type || 'UNKNOWN_ASSET';
    let conf = Math.max(0.1, Math.min(1.0, rawAsset.confidence ?? 0.85));
    let evidence = rawAsset.evidence || [];
    let tier: ConfidenceTier = rawAsset.confidenceTier || getConfidenceTier(conf);

    if (!rawAsset.verified) {
      const cls = classifyIndustrialAsset(
        { width: dimW, height: dimH },
        rawAsset.nearbyText || rawAsset.name,
        rawAsset.legendMatch
      );
      if (rawAsset.type && rawAsset.type !== 'UNKNOWN_ASSET') {
        assetType = rawAsset.type;
      } else {
        assetType = cls.type;
      }
      conf = Math.min(1.0, Math.max(0.1, rawAsset.confidence ?? cls.confidence));
      tier = rawAsset.confidenceTier || getConfidenceTier(conf);
      evidence = cls.evidence;
    }

    // Generate Deterministic Semantic ID
    const prefix = rawAsset.id && !rawAsset.id.startsWith('ASSET-') ? rawAsset.id : null;
    let finalId = prefix;
    if (!finalId) {
      const count = (typeCounter[assetType] || 0) + 1;
      typeCounter[assetType] = count;
      finalId = `${assetType === 'LPG_SPHERE' ? 'TK-LPG' : assetType === 'LPG_BULLET_TANK' ? 'TK-BULLET' : assetType === 'STORAGE_TANK' ? 'TK-STORAGE' : assetType === 'CONTROL_ROOM' ? 'CR' : assetType === 'WAREHOUSE' ? 'WH' : assetType === 'MAINTENANCE_SHOP' ? 'MS' : assetType === 'PUMP_HOUSE' ? 'PH' : assetType === 'PIPE_RACK' ? 'RACK' : 'ASSET'}-${count.toString().padStart(2, '0')}`;
    }

    const worldPos = blueprintToWorldCoordinates(posX, posY, transformConfig, assetType);
    const worldDims = pixelToWorldDimensions(dimW, dimH, transformConfig, assetType);

    const isHazardous = HAZARDOUS_ASSET_TYPES.includes(assetType);
    const category = ASSET_CATEGORY_MAP[assetType] || 'UNKNOWN';

    validAssets.push({
      id: finalId,
      name: rawAsset.name || `${assetType.replace(/_/g, ' ')} #${finalId}`,
      type: assetType,
      category,
      pixelPos: { x: posX, y: posY },
      pixelDimensions: { width: dimW, height: dimH },
      worldPos,
      worldDimensions: worldDims,
      rotationDeg: rawAsset.rotationDeg ?? 0,
      detectionConfidence: rawAsset.detectionConfidence ?? 0.95,
      classificationConfidence: conf,
      confidence: conf,
      confidenceTier: tier,
      evidence,
      nearbyText: rawAsset.nearbyText,
      legendMatch: rawAsset.legendMatch,
      source: rawAsset.source || 'ai',
      confirmed: rawAsset.confirmed ?? (conf >= 0.85),
      verified: rawAsset.verified ?? false,
      simulationEnabled: isHazardous,
      hazardCompatibleTypes: isHazardous
        ? assetType === 'LPG_SPHERE' || assetType === 'LPG_BULLET_TANK'
          ? ['BLEVE', 'POOL_FIRE']
          : ['POOL_FIRE']
        : undefined,
      metadata: rawAsset.metadata || {
        capacityM3: assetType === 'LPG_SPHERE' ? 80 : 120,
        fuelType: assetType.includes('LPG') ? 'LPG' : 'Diesel',
        substanceName: assetType.includes('LPG') ? 'Liquefied Petroleum Gas' : 'Heavy Hydrocarbon',
      },
    });
  });

  // 2. Sanitize & Normalize Roads
  const roads: FacilityRoad[] = (raw.roads || []).map((rawRoad, idx) => {
    const roadPoints = (rawRoad.points || []).map((pt) => {
      const pxX = Math.max(0, Math.min(widthPx, pt.pixelX ?? 0));
      const pxY = Math.max(0, Math.min(heightPx, pt.pixelY ?? 0));
      const wPos = blueprintToWorldCoordinates(pxX, pxY, transformConfig, 'ROAD');
      return {
        pixelX: pxX,
        pixelY: pxY,
        worldX: wPos.x,
        worldZ: wPos.z,
      };
    });

    return {
      id: rawRoad.id || `ROAD-${(idx + 1).toString().padStart(2, '0')}`,
      name: rawRoad.name || `Internal Arterial Route #${idx + 1}`,
      type: rawRoad.type || 'ROAD',
      points: roadPoints,
      widthM: rawRoad.widthM || 12.0,
      confidence: Math.max(0.1, Math.min(1.0, rawRoad.confidence ?? 0.95)),
      confirmed: rawRoad.confirmed ?? true,
    };
  });

  // 3. Sanitize & Normalize Zones
  const zones: FacilityZone[] = (raw.zones || []).map((rawZone, idx) => {
    const polygon = (rawZone.polygon || []).map((pt) => {
      const pxX = Math.max(0, Math.min(widthPx, pt.pixelX ?? 0));
      const pxY = Math.max(0, Math.min(heightPx, pt.pixelY ?? 0));
      const wPos = blueprintToWorldCoordinates(pxX, pxY, transformConfig, 'STORAGE_AREA');
      return {
        pixelX: pxX,
        pixelY: pxY,
        worldX: wPos.x,
        worldZ: wPos.z,
      };
    });

    return {
      id: rawZone.id || `ZONE-${(idx + 1).toString().padStart(2, '0')}`,
      name: rawZone.name || `Safety Boundary Zone #${idx + 1}`,
      type: rawZone.type || 'RESTRICTED_AREA',
      polygon,
      confidence: Math.max(0.1, Math.min(1.0, rawZone.confidence ?? 0.90)),
      confirmed: rawZone.confirmed ?? true,
    };
  });

  // 4. Sanitize & Normalize Gates
  const gates: FacilityGate[] = (raw.gates || []).map((rawGate, idx) => {
    const pxX = Math.max(0, Math.min(widthPx, rawGate.pixelPos?.x ?? 0));
    const pxY = Math.max(0, Math.min(heightPx, rawGate.pixelPos?.y ?? 0));
    const wPos = blueprintToWorldCoordinates(pxX, pxY, transformConfig, 'GATE');

    return {
      id: rawGate.id || `GATE-${(idx + 1).toString().padStart(2, '0')}`,
      name: rawGate.name || `Perimeter Access Gate #${idx + 1}`,
      pixelPos: { x: pxX, y: pxY },
      worldPos: { x: wPos.x, z: wPos.z },
      headingDeg: rawGate.headingDeg ?? (idx === 0 ? 0 : idx === 1 ? 180 : idx === 2 ? 90 : 270),
      cardinal: rawGate.cardinal || (idx === 0 ? 'N' : idx === 1 ? 'S' : idx === 2 ? 'E' : 'W'),
      widthM: rawGate.widthM || 14.0,
      confidence: Math.max(0.1, Math.min(1.0, rawGate.confidence ?? 0.96)),
      confirmed: rawGate.confirmed ?? true,
    };
  });

  // 5. Summary Statistics
  const highConf = validAssets.filter((a) => a.confidenceTier === 'HIGH').length;
  const medConf = validAssets.filter((a) => a.confidenceTier === 'MEDIUM').length;
  const lowConf = validAssets.filter((a) => a.confidenceTier === 'LOW').length;
  const unkConf = validAssets.filter((a) => a.type === 'UNKNOWN_ASSET').length;
  const hazardousCount = validAssets.filter((a) => HAZARDOUS_ASSET_TYPES.includes(a.type)).length;
  const buildingsCount = validAssets.filter((a) => a.category === 'BUILDING').length;
  const processCount = validAssets.filter((a) => a.category === 'PROCESS_UTILITY').length;

  const totalDetections = Math.max(1, validAssets.length);
  const layoutConfidencePct = Math.round(
    ((highConf * 1.0 + medConf * 0.75 + lowConf * 0.4) / totalDetections) * 100
  );

  return {
    schemaVersion: 1,
    metadata,
    assets: validAssets,
    roads,
    zones,
    gates,
    summary: {
      totalAssets: validAssets.length,
      hazardousAssetsCount: hazardousCount,
      buildingsCount,
      processCount,
      roadsCount: roads.length,
      gatesCount: gates.length,
      highConfidenceCount: highConf,
      mediumConfidenceCount: medConf,
      lowConfidenceCount: lowConf,
      unknownCount: unkConf,
      layoutConfidencePct,
    },
  };
};

/**
 * Pre-simulation validation checklist ensuring safety readiness
 */
export const validateSimulationReadiness = (schema: FacilitySchema): {
  ready: boolean;
  checks: { name: string; label: string; valid: boolean; reason?: string }[];
} => {
  const hasHazardAsset = schema.assets.some(
    (a) => HAZARDOUS_ASSET_TYPES.includes(a.type) && a.confirmed
  );
  const hasRoads = schema.roads.length > 0;
  const hasGates = schema.gates.length > 0;
  const hasValidScale = schema.metadata.pixelsPerMeter > 0.2;

  const checks = [
    {
      name: 'hazardAsset',
      label: 'Hazardous Vessel Asset Available',
      valid: hasHazardAsset,
      reason: hasHazardAsset ? undefined : 'At least one confirmed LPG sphere or storage tank is required.',
    },
    {
      name: 'roadNetwork',
      label: 'Emergency Access Road Network',
      valid: hasRoads,
      reason: hasRoads ? undefined : 'No navigable access road polylines detected.',
    },
    {
      name: 'gateEntry',
      label: 'Perimeter Access Checkpoint Gate',
      valid: hasGates,
      reason: hasGates ? undefined : 'No perimeter security entry gate identified.',
    },
    {
      name: 'scaleCalibration',
      label: 'Scale & Dimensions Calibrated',
      valid: hasValidScale,
      reason: hasValidScale ? undefined : 'Pixels-to-meter scale uncalibrated.',
    },
  ];

  const ready = checks.every((c) => c.valid);

  return { ready, checks };
};
