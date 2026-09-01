// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Spatial Field Evaluator & Raycast Probe
// Evaluates exact physical values at any coordinate (x, z) relative to facility
// ────────────────────────────────────────────────────────────────────────────

import {
  ThreatCalculateParams,
  SpatialProbePoint,
} from './types';
import {
  SUBSTANCE_PRESETS,
  calculateThermalFluxBleve,
  calculateThermalFluxPool,
  calculateBleveBlastOverpressureBar,
  calculateWindRadius,
  THERMAL_THRESHOLDS,
  BLAST_THRESHOLDS_BAR,
} from './physicsEngine';

export const evaluateSpatialFieldPoint = (
  x: number,
  z: number,
  params: ThreatCalculateParams
): SpatialProbePoint => {
  const distanceM = Math.sqrt(x * x + z * z);
  if (distanceM < 0.1) {
    return {
      x,
      z,
      distanceM: 0,
      heatFluxKwM2: 200,
      overpressureBar: 2.0,
      overpressurePsi: 29.0,
      dominantHazard: params.facility_type === 'FACILITY_A_LPG' ? 'BLAST' : 'THERMAL',
      severityTier: 'ZONE_1_LETHAL',
    };
  }

  // Calculate bearing from origin (0 = North, 90 = East, 180 = South, 270 = West)
  // In Three.js: +X is East, -Z is North
  let bearingDeg = (Math.atan2(x, -z) * 180) / Math.PI;
  bearingDeg = (bearingDeg + 360) % 360;

  const preset = SUBSTANCE_PRESETS[params.fuel_type] ?? SUBSTANCE_PRESETS['LPG'];
  const SEP = preset.SEP;
  const eta = preset.eta;
  const U = params.wind_speed_ms;
  const windDir = params.wind_direction_deg;

  // Wind modification factor: effective distance adjusted by wind
  const dTheta = ((bearingDeg - windDir) * Math.PI) / 180;
  const k = params.facility_type === 'FACILITY_A_LPG' ? 0.055 : 0.085;
  const windFactor = 1 + k * U * Math.cos(dTheta);
  // Equivalent calm distance that would experience this level of threat
  const equivalentCalmDist = distanceM / Math.max(0.1, windFactor);

  let heatFluxKwM2 = 0;
  let overpressureBar = 0;

  if (params.facility_type === 'FACILITY_A_LPG') {
    const M = Math.max(100, params.mass_kg);
    const r_f = 3.86 * Math.pow(M, 0.325);
    const storedEnergyJ = M * (preset.heatOfCombustionMjKg * 1e6);

    heatFluxKwM2 = calculateThermalFluxBleve(equivalentCalmDist, SEP, r_f);
    overpressureBar = calculateBleveBlastOverpressureBar(equivalentCalmDist, storedEnergyJ, eta);
  } else {
    const D = Math.max(2, params.pool_diameter_m || params.tank_diameter_m || 20);
    const m_dot = 0.055;
    const H = 42.0 * D * Math.pow(m_dot / (1.2 * Math.sqrt(9.81 * D)), 0.61);
    const H_safe = Math.max(H, 1.0);

    heatFluxKwM2 = calculateThermalFluxPool(equivalentCalmDist, SEP, D, H_safe);
    overpressureBar = 0; // Pool fires do not generate explosive overpressure
  }

  const overpressurePsi = overpressureBar * 14.5038;

  // Classify dominant hazard mechanism
  let dominantHazard: 'THERMAL' | 'BLAST' | 'NONE' = 'NONE';
  if (params.facility_type === 'FACILITY_A_LPG') {
    // Compare severity ratios relative to lethal thresholds
    const thermRatio = heatFluxKwM2 / THERMAL_THRESHOLDS.lethal;
    const blastRatio = overpressureBar / BLAST_THRESHOLDS_BAR.lethal;
    dominantHazard = blastRatio > thermRatio ? 'BLAST' : 'THERMAL';
  } else {
    dominantHazard = heatFluxKwM2 > 0.5 ? 'THERMAL' : 'NONE';
  }

  // Classify CCPS Severity Tier
  let severityTier: SpatialProbePoint['severityTier'] = 'SAFE';
  if (
    heatFluxKwM2 >= THERMAL_THRESHOLDS.lethal ||
    overpressureBar >= BLAST_THRESHOLDS_BAR.lethal
  ) {
    severityTier = 'ZONE_1_LETHAL';
  } else if (
    heatFluxKwM2 >= THERMAL_THRESHOLDS.serious ||
    overpressureBar >= BLAST_THRESHOLDS_BAR.serious
  ) {
    severityTier = 'ZONE_2_SERIOUS';
  } else if (
    heatFluxKwM2 >= THERMAL_THRESHOLDS.injury ||
    overpressureBar >= BLAST_THRESHOLDS_BAR.injury
  ) {
    severityTier = 'ZONE_3_INJURY';
  } else if (
    heatFluxKwM2 >= THERMAL_THRESHOLDS.awareness ||
    overpressureBar >= BLAST_THRESHOLDS_BAR.awareness
  ) {
    severityTier = 'ZONE_4_AWARENESS';
  }

  return {
    x: Math.round(x * 10) / 10,
    z: Math.round(z * 10) / 10,
    distanceM: Math.round(distanceM * 10) / 10,
    heatFluxKwM2: Math.round(heatFluxKwM2 * 10) / 10,
    overpressureBar: Math.round(overpressureBar * 1000) / 1000,
    overpressurePsi: Math.round(overpressurePsi * 100) / 100,
    dominantHazard,
    severityTier,
  };
};
