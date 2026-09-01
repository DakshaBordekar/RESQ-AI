// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Deterministic Coordinate Transformation System
// Maps 2D Blueprint pixel space (top-left origin) to 3D World space (meters, centered)
// ────────────────────────────────────────────────────────────────────────────

import { FacilityAssetType } from './blueprintTypes';

export interface CoordinateTransformConfig {
  blueprintWidthPx: number;
  blueprintHeightPx: number;
  pixelsPerMeter: number;
  facilityRotationDeg?: number;
}

export const ASSET_DEFAULT_HEIGHTS_M: Record<FacilityAssetType, number> = {
  LPG_SPHERE: 14.0,
  LPG_BULLET_TANK: 6.5,
  LPG_BULLET: 6.5,
  STORAGE_TANK: 15.0,
  PROCESS_VESSEL: 28.0,
  PRESSURE_VESSEL: 8.0,
  FLARE_STACK: 45.0,
  PROCESS_COLUMN: 32.0,
  REACTOR: 18.0,
  HEAT_EXCHANGER: 5.0,
  FIRE_WATER_TANK: 14.0,

  PIPE_RACK: 6.0,
  PUMP_HOUSE: 6.5,
  PROCESS_AREA: 12.0,
  UTILITY_AREA: 5.0,
  FIRE_PUMP_HOUSE: 6.5,
  COOLING_TOWER: 12.0,
  ELECTRICAL_SUBSTATION: 5.0,

  CONTROL_ROOM: 7.5,
  WAREHOUSE: 10.0,
  MAINTENANCE_SHOP: 9.0,
  ADMIN_BUILDING: 10.0,
  OPERATIONS_BUILDING: 9.0,
  OTHER_BUILDING: 8.0,
  BUILDING: 8.0,

  ROAD: 0.1,
  ACCESS_ROAD: 0.1,
  GATE: 3.5,
  PERIMETER_FENCE: 3.0,
  ASSEMBLY_POINT: 0.2,
  TRUCK_LOADING_BAY: 6.0,
  LOADING_BAY: 6.0,
  PARKING_AREA: 0.1,
  RESTRICTED_AREA: 0.2,
  STORAGE_AREA: 0.2,
  FIRE_WATER_SYSTEM: 2.0,
  EMERGENCY_ACCESS: 0.1,
  UNKNOWN_ASSET: 5.0,
  UNKNOWN: 5.0,
};

export const ASSET_DEFAULT_ELEVATIONS_M: Record<FacilityAssetType, number> = {
  LPG_SPHERE: 9.5, // Sphere center elevated above ground support pillars
  LPG_BULLET_TANK: 3.25,
  LPG_BULLET: 3.25,
  STORAGE_TANK: 7.5,
  PROCESS_VESSEL: 14.0,
  PRESSURE_VESSEL: 4.0,
  FLARE_STACK: 22.5,
  PROCESS_COLUMN: 16.0,
  REACTOR: 9.0,
  HEAT_EXCHANGER: 2.5,
  FIRE_WATER_TANK: 7.0,

  PIPE_RACK: 3.0,
  PUMP_HOUSE: 3.25,
  PROCESS_AREA: 6.0,
  UTILITY_AREA: 2.5,
  FIRE_PUMP_HOUSE: 3.25,
  COOLING_TOWER: 6.0,
  ELECTRICAL_SUBSTATION: 2.5,

  CONTROL_ROOM: 3.75,
  WAREHOUSE: 5.0,
  MAINTENANCE_SHOP: 4.5,
  ADMIN_BUILDING: 5.0,
  OPERATIONS_BUILDING: 4.5,
  OTHER_BUILDING: 4.0,
  BUILDING: 4.0,

  ROAD: 0.05,
  ACCESS_ROAD: 0.05,
  GATE: 1.75,
  PERIMETER_FENCE: 1.5,
  ASSEMBLY_POINT: 0.1,
  TRUCK_LOADING_BAY: 3.0,
  LOADING_BAY: 3.0,
  PARKING_AREA: 0.05,
  RESTRICTED_AREA: 0.1,
  STORAGE_AREA: 0.1,
  FIRE_WATER_SYSTEM: 1.0,
  EMERGENCY_ACCESS: 0.05,
  UNKNOWN_ASSET: 2.5,
  UNKNOWN: 2.5,
};

/**
 * Transforms 2D Blueprint pixel coordinate to 3D World coordinate in meters
 */
export const blueprintToWorldCoordinates = (
  pixelX: number,
  pixelY: number,
  config: CoordinateTransformConfig,
  assetType?: FacilityAssetType
): { x: number; y: number; z: number } => {
  const { blueprintWidthPx, blueprintHeightPx, pixelsPerMeter } = config;
  const ppm = Math.max(0.1, pixelsPerMeter);

  // Center the coordinates around the facility mid-point
  const rawWorldX = (pixelX - blueprintWidthPx / 2) / ppm;
  const rawWorldZ = (pixelY - blueprintHeightPx / 2) / ppm;

  // Apply facility rotation if present
  let worldX = rawWorldX;
  let worldZ = rawWorldZ;

  if (config.facilityRotationDeg) {
    const rad = (config.facilityRotationDeg * Math.PI) / 180;
    worldX = rawWorldX * Math.cos(rad) - rawWorldZ * Math.sin(rad);
    worldZ = rawWorldX * Math.sin(rad) + rawWorldZ * Math.cos(rad);
  }

  const elevationY = assetType ? ASSET_DEFAULT_ELEVATIONS_M[assetType] ?? 0.0 : 0.0;

  return {
    x: Math.round(worldX * 100) / 100,
    y: elevationY,
    z: Math.round(worldZ * 100) / 100,
  };
};

/**
 * Inverse transform: 3D World coordinate in meters to 2D Blueprint pixel coordinate
 */
export const worldToBlueprintCoordinates = (
  worldX: number,
  worldZ: number,
  config: CoordinateTransformConfig
): { x: number; y: number } => {
  const { blueprintWidthPx, blueprintHeightPx, pixelsPerMeter } = config;
  const ppm = Math.max(0.1, pixelsPerMeter);

  let rawX = worldX;
  let rawZ = worldZ;

  if (config.facilityRotationDeg) {
    const rad = (-config.facilityRotationDeg * Math.PI) / 180;
    rawX = worldX * Math.cos(rad) - worldZ * Math.sin(rad);
    rawZ = worldX * Math.sin(rad) + worldZ * Math.cos(rad);
  }

  const pixelX = rawX * ppm + blueprintWidthPx / 2;
  const pixelY = rawZ * ppm + blueprintHeightPx / 2;

  return {
    x: Math.round(pixelX),
    y: Math.round(pixelY),
  };
};

/**
 * Converts 2D pixel dimensions to 3D world dimensions in meters
 */
export const pixelToWorldDimensions = (
  widthPx: number,
  heightPx: number,
  config: CoordinateTransformConfig,
  assetType: FacilityAssetType
): { width: number; depth: number; height: number } => {
  const ppm = Math.max(0.1, config.pixelsPerMeter);
  const widthM = Math.max(2.0, widthPx / ppm);
  const depthM = Math.max(2.0, heightPx / ppm);
  const heightM = ASSET_DEFAULT_HEIGHTS_M[assetType] || 8.0;

  return {
    width: Math.round(widthM * 10) / 10,
    depth: Math.round(depthM * 10) / 10,
    height: Math.round(heightM * 10) / 10,
  };
};
