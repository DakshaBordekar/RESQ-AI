// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Cascading Domino Effect & Industrial Asset Risk Engine
// Evaluates radiant thermal heat flux on adjacent tanks, columns, and pipe racks,
// calculates dynamic time-to-critical rupture countdowns, and models cooling recovery.
// ────────────────────────────────────────────────────────────────────────────

import {
  MonitoredIndustrialAsset,
  AssetRiskProfile,
  AssetRiskState,
} from './types';
import { getDownwindVector } from '../three/utils/coordinateMath';

// ────────────────────────────────────────────────────────────────────────────
// 8 MONITORED INDUSTRIAL ASSETS (Spatially aligned with SurroundingBuildings.ts)
// ────────────────────────────────────────────────────────────────────────────
export const MONITORED_FACILITY_ASSETS: MonitoredIndustrialAsset[] = [
  {
    id: 'TK-LPG-02',
    name: 'Pressurized LPG Bullet Tank #2',
    type: 'LPG_BULLET_TANK',
    worldPosition: [-52, 4.5, -28], // Sector B: West Farm
    dimensionsM: [24, 7, 7],
    criticalThresholdKwM2: 15.0,
    thermalInertiaSec: 48,
  },
  {
    id: 'TK-LPG-03',
    name: 'Pressurized LPG Bullet Tank #3',
    type: 'LPG_BULLET_TANK',
    worldPosition: [-52, 4.5, 28], // Sector B: West Farm
    dimensionsM: [24, 7, 7],
    criticalThresholdKwM2: 15.0,
    thermalInertiaSec: 58,
  },
  {
    id: 'COL-DIST-01',
    name: 'Fractionation Distillation Column',
    type: 'DISTILLATION_COLUMN',
    worldPosition: [58, 22, -32], // Sector A: East Process
    dimensionsM: [8, 44, 8],
    criticalThresholdKwM2: 18.0,
    thermalInertiaSec: 65,
  },
  {
    id: 'PR-MAIN-01',
    name: 'High-Pressure Hydrocarbon Pipe Rack',
    type: 'PIPE_RACK',
    worldPosition: [0, 8, -48], // Overhead Pipe Bridge
    dimensionsM: [48, 14, 6],
    criticalThresholdKwM2: 12.5,
    thermalInertiaSec: 36,
  },
  {
    id: 'PUMP-STA-01',
    name: 'LPG High-Volume Transfer Pump House',
    type: 'PUMP_STATION',
    worldPosition: [-32, 5, -55], // Sector B Pumping
    dimensionsM: [18, 9, 14],
    criticalThresholdKwM2: 14.0,
    thermalInertiaSec: 52,
  },
  {
    id: 'CR-CTRL-NW',
    name: 'Main Plant Operations & Control Center',
    type: 'CONTROL_ROOM',
    worldPosition: [-92, 6, -85], // Sector E: NW Safe Bastion
    dimensionsM: [32, 12, 22],
    criticalThresholdKwM2: 8.0,
    thermalInertiaSec: 120,
  },
  {
    id: 'SUB-ELEC-SE',
    name: 'Main 33kV Power Distribution Substation',
    type: 'SUBSTATION',
    worldPosition: [68, 6, 62], // Sector D: SE Power Hub
    dimensionsM: [26, 10, 18],
    criticalThresholdKwM2: 12.5,
    thermalInertiaSec: 70,
  },
  {
    id: 'WH-LOG-01',
    name: 'High-Bay Logistics & Drum Storage Warehouse',
    type: 'WAREHOUSE',
    worldPosition: [0, 10, 88], // Sector C: North Logistics
    dimensionsM: [55, 18, 30],
    criticalThresholdKwM2: 10.0,
    thermalInertiaSec: 90,
  },
];

export interface AssetRiskUpdateInput {
  incidentType: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE';
  incidentPhase: string;
  sourceRadiantPowerMw: number; // e.g. 180 MW
  flameRadiusM: number; // e.g. 35m
  flameTiltDeg: number; // e.g. 25°
  windDirDeg: number; // 0-360°
  windSpeedMs: number;
  fireIntensityFactor: number; // 1.0 down to 0.0
  isWaterAttackActive: boolean;
  waterSuppressionProgress: number; // 0.0 to 1.0
  elapsedSimulationSec: number;
}

/**
 * Evaluates the full fleet of industrial assets under current dynamic fire & wind conditions
 */
export const evaluateAssetRiskFleet = (
  input: AssetRiskUpdateInput,
  currentProfiles?: Map<string, AssetRiskProfile>
): AssetRiskProfile[] => {
  const {
    incidentType,
    incidentPhase,
    sourceRadiantPowerMw,
    flameRadiusM,
    flameTiltDeg,
    windDirDeg,
    windSpeedMs,
    fireIntensityFactor,
    isWaterAttackActive,
    waterSuppressionProgress,
    elapsedSimulationSec,
  } = input;

  const isFireActive =
    fireIntensityFactor > 0.05 &&
    incidentPhase !== 'IDLE' &&
    incidentPhase !== 'EXTINGUISHED' &&
    incidentPhase !== 'AFTERMATH';

  const downwindVec = getDownwindVector(windDirDeg);

  return MONITORED_FACILITY_ASSETS.map((asset) => {
    const [ax, , az] = asset.worldPosition;
    const distanceM = Math.hypot(ax, az);

    // Vector from fire origin (0,0) to asset
    const assetDirX = ax / Math.max(1, distanceM);
    const assetDirZ = az / Math.max(1, distanceM);

    // Bearing in degrees (0=North, 90=East)
    const bearingDeg = Math.round(((Math.atan2(ax, -az) * 180) / Math.PI + 360) % 360);

    // Alignment with downwind plume: dot product with downwind vector
    const windAlignment = assetDirX * downwindVec.x + assetDirZ * downwindVec.z;
    const windAmplification = Math.max(0.35, 1.0 + windAlignment * (flameTiltDeg / 55.0));

    // Inverse-square radiant flux formulation: I = (P_rad / (4 * pi * d^2)) * windFactor
    let baseFluxKwM2 = 0;
    if (isFireActive) {
      const geometricFlux =
        ((sourceRadiantPowerMw * 1000) / (4 * Math.PI * Math.max(15, distanceM) ** 1.7)) *
        windAmplification *
        fireIntensityFactor;
      baseFluxKwM2 = Math.min(65.0, Math.max(0, geometricFlux));
    }

    // Cooling water attenuation
    let coolingStatus: 'INACTIVE' | 'COOLING_ENGAGED' | 'QUENCHED' = 'INACTIVE';
    if (waterSuppressionProgress >= 0.95 || incidentPhase === 'EXTINGUISHED' || incidentPhase === 'AFTERMATH') {
      coolingStatus = 'QUENCHED';
      baseFluxKwM2 = 0;
    } else if (isWaterAttackActive) {
      coolingStatus = 'COOLING_ENGAGED';
      baseFluxKwM2 = baseFluxKwM2 * Math.max(0.15, 1.0 - waterSuppressionProgress * 0.85);
    }

    const roundedFlux = Math.round(baseFluxKwM2 * 10) / 10;

    // Determine Risk State
    let riskState: AssetRiskState = 'SAFE';
    if (roundedFlux >= 25.0) {
      riskState = 'CRITICAL';
    } else if (roundedFlux >= 12.5) {
      riskState = 'HIGH';
    } else if (roundedFlux >= 8.0) {
      riskState = 'ELEVATED';
    } else if (roundedFlux >= 4.0) {
      riskState = 'LOW';
    } else {
      riskState = 'SAFE';
    }

    // Calculate Dynamic Time to Critical Failure Countdown
    let timeToCriticalSec: number | null = null;
    const initialTimeToCriticalSec =
      riskState === 'CRITICAL' || riskState === 'HIGH' || riskState === 'ELEVATED'
        ? Math.max(12, Math.round(asset.thermalInertiaSec * (asset.criticalThresholdKwM2 / Math.max(1, roundedFlux))))
        : null;

    if (initialTimeToCriticalSec !== null && isFireActive) {
      if (coolingStatus === 'COOLING_ENGAGED') {
        // Recovery curve under cooling water stream
        const recoveredTime = initialTimeToCriticalSec + Math.round(waterSuppressionProgress * 45);
        timeToCriticalSec = Math.min(120, recoveredTime);
      } else {
        // Countdown during active heating
        const activeHeatingDuration = Math.max(0, elapsedSimulationSec - 3.0);
        const remaining = Math.max(4, initialTimeToCriticalSec - Math.round(activeHeatingDuration));
        timeToCriticalSec = remaining;
      }
    }

    // Calculate Structural Integrity (100% down to 80% under stress, recovers on cooling)
    let structuralIntegrityPct = 100;
    if (riskState === 'CRITICAL') {
      structuralIntegrityPct = Math.max(72, Math.round(100 - (roundedFlux / 25.0) * 18));
    } else if (riskState === 'HIGH') {
      structuralIntegrityPct = Math.max(85, Math.round(100 - (roundedFlux / 15.0) * 10));
    }

    // Trend
    let riskTrend: 'STABLE' | 'HEATING' | 'COOLING_DOWN' = 'STABLE';
    if (coolingStatus === 'COOLING_ENGAGED' || coolingStatus === 'QUENCHED') {
      riskTrend = 'COOLING_DOWN';
    } else if (isFireActive && (riskState === 'CRITICAL' || riskState === 'HIGH')) {
      riskTrend = 'HEATING';
    }

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type.replace(/_/g, ' '),
      worldPosition: asset.worldPosition,
      distanceM: Math.round(distanceM),
      bearingDeg,
      thermalFluxKwM2: roundedFlux,
      riskState,
      timeToCriticalSec,
      initialTimeToCriticalSec,
      coolingStatus,
      structuralIntegrityPct,
      riskTrend,
    };
  });
};
