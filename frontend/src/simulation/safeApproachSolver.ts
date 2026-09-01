// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 8-Sector Safe Approach Solver
// Evaluates N, NE, E, SE, S, SW, W, NW Ingress Corridors
// ────────────────────────────────────────────────────────────────────────────

import {
  ThreatCalculateParams,
  ThreatResponse,
  SectorExposure,
} from './types';
import { bearingDistanceToLocalXZ } from './physicsEngine';

export const SECTORS = [
  { cardinal: 'N', bearingDeg: 0 },
  { cardinal: 'NE', bearingDeg: 45 },
  { cardinal: 'E', bearingDeg: 90 },
  { cardinal: 'SE', bearingDeg: 135 },
  { cardinal: 'S', bearingDeg: 180 },
  { cardinal: 'SW', bearingDeg: 225 },
  { cardinal: 'W', bearingDeg: 270 },
  { cardinal: 'NW', bearingDeg: 315 },
];

export const evaluateAllSectors = (
  params: ThreatCalculateParams,
  threatData: ThreatResponse
): SectorExposure[] => {
  const windDir = params.wind_direction_deg;
  const maxAwarenessR = threatData.threat_bands.green_awareness?.max_radius_m || 500;
  const maxLethalR = threatData.threat_bands.red_lethal?.max_radius_m || 80;

  return SECTORS.map(({ cardinal, bearingDeg }) => {
    // Angular difference relative to downwind direction
    let diff = Math.abs(bearingDeg - windDir);
    if (diff > 180) diff = 360 - diff;

    // Upwind angle has diff = 180 (safest), downwind has diff = 0 (worst)
    // Normalize to exposure score 0 (safest) to 100 (most dangerous)
    const exposureScore = Math.round((1 - diff / 180) * 100);

    let classification: SectorExposure['classification'] = 'ACCEPTABLE';
    let operationalAdvice = '';

    if (exposureScore <= 20) {
      classification = 'OPTIMAL';
      operationalAdvice = 'Optimal upwind entry corridor. Zero toxic/thermal plume crossing.';
    } else if (exposureScore <= 45) {
      classification = 'ACCEPTABLE';
      operationalAdvice = 'Cross-wind approach. Low thermal flux exposure outside Zone 3.';
    } else if (exposureScore <= 70) {
      classification = 'CAUTION';
      operationalAdvice = 'Elevated radiant heat. Approach with structural water curtain.';
    } else if (exposureScore <= 85) {
      classification = 'RESTRICTED';
      operationalAdvice = 'Direct plume trajectory. Emergency transit only with full PPE.';
    } else {
      classification = 'PROHIBITED';
      operationalAdvice = 'Direct downwind hazard axis. Catastrophic thermal/blast exposure.';
    }

    const maxSafeDistanceM = Math.round(maxLethalR * (1 + (exposureScore / 100) * 2.5));

    return {
      cardinal,
      bearingDeg,
      exposureScore,
      classification,
      maxSafeDistanceM,
      operationalAdvice,
    };
  });
};

// ── Generate 3D Waypoint Path for Emergency Vehicles ────────────────────────
export const generateSafeApproachWaypoints = (
  safeAngleDeg: number,
  standoffDistM = 220,
  targetDistM = 28
): Array<{ x: number; y: number; z: number }> => {
  const waypoints: Array<{ x: number; y: number; z: number }> = [];

  // Generate 8 smooth waypoints along the safe radial vector into the facility
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const currentDist = standoffDistM * (1 - t) + targetDistM * t;
    const [x, z] = bearingDistanceToLocalXZ(safeAngleDeg, currentDist);
    waypoints.push({ x, y: 0.1, z });
  }

  return waypoints;
};
