// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Unified Shared Hazard Simulation Engine
// Single Source of Truth for 3D Digital Twin & 2D Blueprint Threat Calculations
// Fully dynamic, parameter-reactive, calibrated against CCPS & NFPA physics models
// ────────────────────────────────────────────────────────────────────────────

import {
  ThreatCalculateParams,
  ThreatResponse,
  SpatialProbePoint,
} from './types';
import { FacilityAsset, FacilityAssetType } from './blueprintTypes';
import {
  computeSimulationThreatZones,
  SUBSTANCE_PRESETS,
  calculateBleveBlastOverpressureBar,
  calculateThermalFluxBleve,
  calculateThermalFluxPool,
  binarySearchCalmRadius,
  THERMAL_THRESHOLDS,
  BLAST_THRESHOLDS_BAR,
  getCardinalDirection,
} from './physicsEngine';
import { evaluateSpatialFieldPoint } from './spatialField';
import {
  CoordinateTransformConfig,
  worldToBlueprintCoordinates,
} from './coordinateTransformer';

export interface FacilitySimulationInput {
  incidentAssetId: string;
  scenario: 'BLEVE' | 'POOL_FIRE';
  fuelType: 'LPG' | 'Diesel' | 'Gasoline' | 'Crude Oil' | 'Propane' | 'Methane';
  tankDiameterM?: number;
  tankLengthM?: number;
  tankHeightM?: number;
  tankVolumeM3?: number;
  fillFraction?: number;
  storedMassKg?: number;
  windSpeedMs: number;
  windDirectionDeg: number;
  facilityAssets: FacilityAsset[];
  transformConfig: CoordinateTransformConfig;
}

export interface CascadeNode {
  assetId: string;
  assetName: string;
  assetType: FacilityAssetType;
  depth: number;
  triggerTimeSec: number;
  causeAssetId: string | null;
  worldPos: { x: number; y: number; z: number };
  pixelPos: { x: number; y: number };
  blastRadiusM: number;
  blastRadiusPx: number;
  fireballRadiusM: number;
  storedEnergyGJ: number;
  wTntEquivalentKg: number;
  thermalFluxKwM2: number;
  timeToFailureSec: number;
  isIgnited: boolean;
}

export interface FacilitySimulationResult {
  primaryAsset: FacilityAsset;
  originWorld: { x: number; y: number; z: number };
  originPixel: { x: number; y: number };
  threatParams: ThreatCalculateParams;
  threatResponse: ThreatResponse;
  physicsMetrics: {
    fireballRadiusM: number;
    fireballDurationS: number;
    totalEnergyGJ: number;
    wTntEquivalentKg: number;
    primaryHazard: string;
    dominantHazard: 'THERMAL' | 'BLAST';
    lethalRadiusM: number;
    seriousRadiusM: number;
    injuryRadiusM: number;
    awarenessRadiusM: number;
    safeHeadingDeg: number;
    safeCardinal: string;
  };
  zones: {
    lethal: {
      radiusM: number;
      radiusPx: number;
      thresholdKwM2: number;
      thresholdKPa: number;
      worldPolygon: [number, number][];
      pixelPolygon: [number, number][];
    };
    serious: {
      radiusM: number;
      radiusPx: number;
      thresholdKwM2: number;
      thresholdKPa: number;
      worldPolygon: [number, number][];
      pixelPolygon: [number, number][];
    };
    injury: {
      radiusM: number;
      radiusPx: number;
      thresholdKwM2: number;
      thresholdKPa: number;
      worldPolygon: [number, number][];
      pixelPolygon: [number, number][];
    };
    awareness: {
      radiusM: number;
      radiusPx: number;
      thresholdKwM2: number;
      thresholdKPa: number;
      worldPolygon: [number, number][];
      pixelPolygon: [number, number][];
    };
  };
  affectedAssets: Array<{
    asset: FacilityAsset;
    distanceM: number;
    heatFluxKwM2: number;
    overpressureBar: number;
    severityTier: 'ZONE_1_LETHAL' | 'ZONE_2_SERIOUS' | 'ZONE_3_INJURY' | 'ZONE_4_AWARENESS' | 'SAFE';
    riskState: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW' | 'SAFE';
    timeToRuptureSec: number;
  }>;
  cascadeChain: CascadeNode[];
  damagedStructuralAssetIds: string[];
}

/**
 * Identify if an asset qualifies as an explosion/fire-capable vessel
 */
export const isHazardousExplodableAsset = (asset: FacilityAsset): boolean => {
  if (asset.type === 'FIRE_WATER_TANK') return false; // Sanity check: Water tanks do not explode
  if (asset.category === 'BUILDING' || asset.type === 'CONTROL_ROOM' || asset.type === 'WAREHOUSE') return false;
  return (
    asset.category === 'HAZARDOUS_STORAGE' ||
    asset.type.includes('TANK') ||
    asset.type.includes('SPHERE') ||
    asset.type.includes('BULLET') ||
    asset.type.includes('PROCESS_VESSEL') ||
    asset.type.includes('PROCESS_COLUMN') ||
    asset.type.includes('FLARE_STACK') ||
    asset.simulationEnabled
  );
};

/**
 * Resolves physical tank geometry and mass parameters for any facility asset
 */
export const getAssetPhysicsParameters = (
  asset: FacilityAsset,
  fillFraction = 0.85,
  fuelType = 'LPG',
  overrideDiameter?: number,
  overrideLength?: number,
  overrideHeight?: number
): {
  diameterM: number;
  lengthM: number;
  heightM: number;
  volumeM3: number;
  massKg: number;
  densityKgM3: number;
} => {
  const preset = SUBSTANCE_PRESETS[fuelType] || SUBSTANCE_PRESETS['LPG'];
  const rho = preset.liquidDensityKgM3;
  const diameterM = Math.max(3.0, overrideDiameter || asset.worldDimensions?.width || 14.0);
  const lengthM = Math.max(4.0, overrideLength || asset.worldDimensions?.depth || diameterM * 3.0);
  const heightM = Math.max(3.0, overrideHeight || asset.worldDimensions?.height || 14.0);

  let volumeM3 = 80.0;
  if (asset.type === 'LPG_SPHERE') {
    volumeM3 = (4 / 3) * Math.PI * Math.pow(diameterM / 2, 3);
  } else if (asset.type === 'LPG_BULLET' || asset.type === 'LPG_BULLET_TANK') {
    volumeM3 = Math.PI * Math.pow(diameterM / 2, 2) * lengthM;
  } else {
    volumeM3 = Math.PI * Math.pow(diameterM / 2, 2) * heightM;
  }

  const massKg = Math.round(volumeM3 * fillFraction * rho);
  return {
    diameterM: Math.round(diameterM * 10) / 10,
    lengthM: Math.round(lengthM * 10) / 10,
    heightM: Math.round(heightM * 10) / 10,
    volumeM3: Math.round(volumeM3 * 10) / 10,
    massKg: Math.max(100, massKg),
    densityKgM3: rho,
  };
};

/**
 * Calculates asset-specific blast radius and energy using Kingery-Bulmash & Roberts correlations
 */
export const calculateAssetSpecificPhysics = (
  asset: FacilityAsset,
  fuelType = 'LPG',
  fillFraction = 0.85
): {
  blastRadiusM: number;
  fireballRadiusM: number;
  storedEnergyGJ: number;
  wTntEquivalentKg: number;
} => {
  const { massKg } = getAssetPhysicsParameters(asset, fillFraction, fuelType);
  const preset = SUBSTANCE_PRESETS[fuelType] || SUBSTANCE_PRESETS['LPG'];
  const storedEnergyJ = massKg * (preset.heatOfCombustionMjKg * 1e6);
  const eta = preset.eta || 0.04;
  const wTntKg = (storedEnergyJ * eta) / 4.52e6;
  const storedEnergyGJ = Math.round((storedEnergyJ / 1e9) * 100) / 100;

  const blastFn = (r: number) => calculateBleveBlastOverpressureBar(r, storedEnergyJ, eta);
  const rLethalBlast = binarySearchCalmRadius(blastFn, BLAST_THRESHOLDS_BAR.lethal);

  // Roberts fireball radius
  const r_f = 3.86 * Math.pow(massKg, 0.325);

  let blastRadiusM = rLethalBlast;
  if (asset.type === 'LPG_SPHERE') {
    const thermalFn = (r: number) => calculateThermalFluxBleve(r, preset.SEP, r_f);
    const rLethalTherm = binarySearchCalmRadius(thermalFn, THERMAL_THRESHOLDS.lethal);
    blastRadiusM = Math.max(rLethalBlast, rLethalTherm);
  }

  return {
    blastRadiusM: Math.max(20.0, Math.round(blastRadiusM)),
    fireballRadiusM: Math.round(r_f * 10) / 10,
    storedEnergyGJ,
    wTntEquivalentKg: Math.round(wTntKg),
  };
};

/**
 * MASTER HAZARD SIMULATION ENGINE
 * Pure, deterministic solver consumed by both 3D Digital Twin and 2D Blueprint Canvas
 */
export const runFacilityHazardSimulation = (
  input: FacilitySimulationInput
): FacilitySimulationResult => {
  const {
    incidentAssetId,
    scenario,
    fuelType,
    tankDiameterM,
    tankLengthM,
    tankHeightM,
    tankVolumeM3,
    fillFraction = 0.85,
    storedMassKg,
    windSpeedMs,
    windDirectionDeg,
    facilityAssets,
    transformConfig,
  } = input;

  // 1. Resolve Primary Incident Target Asset
  const primaryAsset =
    facilityAssets.find((a) => a.id === incidentAssetId) ||
    facilityAssets.find((a) => isHazardousExplodableAsset(a)) ||
    facilityAssets[0];

  if (!primaryAsset) {
    throw new Error('No facility assets provided to simulation engine.');
  }

  const originWorld = {
    x: Number.isFinite(primaryAsset.worldPos?.x) ? primaryAsset.worldPos.x : 0,
    y: Number.isFinite(primaryAsset.worldPos?.y) ? primaryAsset.worldPos.y : 8,
    z: Number.isFinite(primaryAsset.worldPos?.z) ? primaryAsset.worldPos.z : 0,
  };

  const originPixel = {
    x: Number.isFinite(primaryAsset.pixelPos?.x) ? primaryAsset.pixelPos.x : transformConfig.blueprintWidthPx / 2,
    y: Number.isFinite(primaryAsset.pixelPos?.y) ? primaryAsset.pixelPos.y : transformConfig.blueprintHeightPx / 2,
  };

  // 2. Physical Tank Geometry & Mass Resolution
  const defaultParams = getAssetPhysicsParameters(
    primaryAsset,
    fillFraction,
    fuelType,
    tankDiameterM,
    tankLengthM,
    tankHeightM
  );
  const activeDiameter = tankDiameterM || defaultParams.diameterM;
  const activeVolume = tankVolumeM3 || defaultParams.volumeM3;
  const activeMass = storedMassKg || defaultParams.massKg;

  const threatParams: ThreatCalculateParams = {
    facility_type: scenario === 'BLEVE' ? 'FACILITY_A_LPG' : 'FACILITY_B_POOL_FIRE',
    fuel_type: fuelType,
    mass_kg: activeMass,
    tank_diameter_m: activeDiameter,
    tank_volume_m3: activeVolume,
    fill_fraction: fillFraction,
    pool_diameter_m: activeDiameter,
    wind_speed_ms: windSpeedMs,
    wind_direction_deg: windDirectionDeg,
    latitude: 13.03,
    longitude: 80.235,
  };

  // 3. Compute Threat Zones via Master Physics Engine
  const threatResponse = computeSimulationThreatZones(threatParams);
  const bands = threatResponse.threat_bands;
  const ppm = Math.max(0.1, transformConfig.pixelsPerMeter);

  // 4. Build Polygon Contours in both 3D World (m) and 2D Blueprint (px)
  const buildZoneData = (key: 'red_lethal' | 'orange_serious' | 'yellow_injury' | 'green_awareness') => {
    const band = bands[key];
    const radiusM = band.max_radius_m;
    const radiusPx = Math.round(radiusM * ppm);
    const local = band.localPolygon || [];

    // Shift local relative polygon [lx, lz] to actual world position
    const worldPolygon: [number, number][] = local.map(([lx, lz]) => [
      Math.round((originWorld.x + lx) * 10) / 10,
      Math.round((originWorld.z + lz) * 10) / 10,
    ]);

    // Map world polygon to 2D blueprint pixel coordinates
    const pixelPolygon: [number, number][] = worldPolygon.map(([wx, wz]) => {
      const p = worldToBlueprintCoordinates(wx, wz, transformConfig);
      return [p.x, p.y];
    });

    return {
      radiusM,
      radiusPx,
      thresholdKwM2: band.threshold_kw_m2 ?? 0,
      thresholdKPa: band.threshold_kpa ?? 0,
      worldPolygon,
      pixelPolygon,
    };
  };

  const zones = {
    lethal: buildZoneData('red_lethal'),
    serious: buildZoneData('orange_serious'),
    injury: buildZoneData('yellow_injury'),
    awareness: buildZoneData('green_awareness'),
  };

  // 5. Evaluate Risk for Every Asset in the Facility
  const affectedAssets = facilityAssets
    .filter((a) => a.id !== primaryAsset.id)
    .map((asset) => {
      const relX = asset.worldPos.x - originWorld.x;
      const relZ = asset.worldPos.z - originWorld.z;
      const distanceM = Math.hypot(relX, relZ);

      const probe = evaluateSpatialFieldPoint(relX, relZ, threatParams);
      const heatFluxKwM2 = probe.heatFluxKwM2;
      const overpressureBar = probe.overpressureBar;
      const severityTier = probe.severityTier;

      let riskState: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW' | 'SAFE' = 'SAFE';
      if (severityTier === 'ZONE_1_LETHAL') riskState = 'CRITICAL';
      else if (severityTier === 'ZONE_2_SERIOUS') riskState = 'HIGH';
      else if (severityTier === 'ZONE_3_INJURY') riskState = 'ELEVATED';
      else if (severityTier === 'ZONE_4_AWARENESS') riskState = 'LOW';

      // Dynamic Time-To-Rupture based on radiant flux intensity
      const timeToRuptureSec = Math.max(8, Math.round(160 / Math.max(1, heatFluxKwM2)));

      return {
        asset,
        distanceM: Math.round(distanceM * 10) / 10,
        heatFluxKwM2: Math.round(heatFluxKwM2 * 10) / 10,
        overpressureBar: Math.round(overpressureBar * 1000) / 1000,
        severityTier,
        riskState,
        timeToRuptureSec,
      };
    })
    .sort((a, b) => a.distanceM - b.distanceM);

  // 6. Multi-Hop BFS Cascading Chain Reaction (Sequential Domino Propagation)
  const cascadeChain: CascadeNode[] = [];
  const visited = new Set<string>();
  visited.add(primaryAsset.id);

  const primaryPhysics = calculateAssetSpecificPhysics(primaryAsset, fuelType, fillFraction);
  const primaryRadiusM = zones.lethal.radiusM;
  const primaryRadiusPx = zones.lethal.radiusPx;

  cascadeChain.push({
    assetId: primaryAsset.id,
    assetName: primaryAsset.name,
    assetType: primaryAsset.type,
    depth: 0,
    triggerTimeSec: 0.0,
    causeAssetId: null,
    worldPos: originWorld,
    pixelPos: originPixel,
    blastRadiusM: primaryRadiusM,
    blastRadiusPx: primaryRadiusPx,
    fireballRadiusM: primaryPhysics.fireballRadiusM,
    storedEnergyGJ: primaryPhysics.storedEnergyGJ,
    wTntEquivalentKg: primaryPhysics.wTntEquivalentKg,
    thermalFluxKwM2: 200.0,
    timeToFailureSec: 0,
    isIgnited: true,
  });

  const queue: Array<{ asset: FacilityAsset; depth: number; causeId: string | null }> = [
    { asset: primaryAsset, depth: 0, causeId: null },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curAsset = current.asset;
    const curPos = curAsset.worldPos;
    const curPhysics = calculateAssetSpecificPhysics(curAsset, fuelType, fillFraction);
    const curRadius = curPhysics.blastRadiusM;

    for (const cand of facilityAssets) {
      if (visited.has(cand.id)) continue;
      if (!isHazardousExplodableAsset(cand)) continue;

      const dist = Math.hypot(cand.worldPos.x - curPos.x, cand.worldPos.z - curPos.z);
      if (dist <= curRadius) {
        visited.add(cand.id);

        const candPhysics = calculateAssetSpecificPhysics(cand, fuelType, fillFraction);
        const candRadiusM = candPhysics.blastRadiusM;
        const candRadiusPx = Math.round(candRadiusM * ppm);
        const triggerTime = cascadeChain.length * 5.5; // Controlled sequential pacing

        const node: CascadeNode = {
          assetId: cand.id,
          assetName: cand.name,
          assetType: cand.type,
          depth: current.depth + 1,
          triggerTimeSec: triggerTime,
          causeAssetId: curAsset.id,
          worldPos: cand.worldPos,
          pixelPos: cand.pixelPos,
          blastRadiusM: candRadiusM,
          blastRadiusPx: candRadiusPx,
          fireballRadiusM: candPhysics.fireballRadiusM,
          storedEnergyGJ: candPhysics.storedEnergyGJ,
          wTntEquivalentKg: candPhysics.wTntEquivalentKg,
          thermalFluxKwM2: Math.round(35.0 / Math.max(1, dist * 0.05)),
          timeToFailureSec: Math.max(6, Math.round(triggerTime)),
          isIgnited: true,
        };

        cascadeChain.push(node);

        queue.push({
          asset: cand,
          depth: current.depth + 1,
          causeId: curAsset.id,
        });
      }
    }
  }

  // 7. Evaluate Non-Ignitable Assets for Structural Scorching / Blast Damage
  const damagedStructuralAssetIds: string[] = [];
  facilityAssets.forEach((asset) => {
    if (isHazardousExplodableAsset(asset)) return; // Ignitable assets explode and burn

    // Check if within the blast envelope of ANY exploded node in cascade
    const hitByBlast = cascadeChain.some((node) => {
      const d = Math.hypot(asset.worldPos.x - node.worldPos.x, asset.worldPos.z - node.worldPos.z);
      return d <= node.blastRadiusM * 1.15;
    });

    if (hitByBlast) {
      damagedStructuralAssetIds.push(asset.id);
    }
  });

  const safeHeadingDeg = (windDirectionDeg + 180) % 360;

  return {
    primaryAsset,
    originWorld,
    originPixel,
    threatParams,
    threatResponse,
    physicsMetrics: {
      fireballRadiusM: threatResponse.physics_metrics.fireball_radius_m ?? threatResponse.physics_metrics.flame_height_m ?? 25,
      fireballDurationS: threatResponse.physics_metrics.fireball_duration_s ?? 30,
      totalEnergyGJ: threatResponse.physics_metrics.total_energy_gj ?? 150,
      wTntEquivalentKg: threatResponse.physics_metrics.w_tnt_equivalent_kg ?? 500,
      primaryHazard: threatResponse.physics_metrics.primary_hazard,
      dominantHazard: scenario === 'BLEVE' ? 'BLAST' : 'THERMAL',
      lethalRadiusM: zones.lethal.radiusM,
      seriousRadiusM: zones.serious.radiusM,
      injuryRadiusM: zones.injury.radiusM,
      awarenessRadiusM: zones.awareness.radiusM,
      safeHeadingDeg,
      safeCardinal: getCardinalDirection(safeHeadingDeg),
    },
    zones,
    affectedAssets,
    cascadeChain,
    damagedStructuralAssetIds,
  };
};
