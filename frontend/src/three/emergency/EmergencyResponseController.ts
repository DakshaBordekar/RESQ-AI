// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Master Emergency Response & Fire Suppression Sequence Controller
// Supports both Facility A (Pressurized LPG Sphere BLEVE) and Facility B (Petroleum Pool Fire):
// CALM -> INCIDENT (BLEVE / POOL IGNITION) -> EMERGENCY_DISPATCH (A* Road Graph Navigation)
// -> STAGED -> WATER_ATTACK -> SUPPRESSION (100% -> 0%) -> EXTINGUISHED (Permanent Safe Halt)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { BlevePhase } from '../../simulation/types';
import { FireTruckComponents } from './FireTruck';
import { WaterAttackComponents } from './WaterAttackSystem';
import { RoadNetworkComponents, EmergencyRouteResult } from '../environment/RoadNetwork';

export interface EmergencyResponseComponents {
  update: (delta: number, time: number, windDirDeg: number, windSpeedMs: number) => void;
  triggerScenario: (scenarioType: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE', maxDimensionM: number, safeHeadingDeg: number) => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  reset: () => void;
  getPhase: () => BlevePhase;
  isPaused: () => boolean;
  getFireIntensityFactor: () => number;
  getTelemetryStatus: () => {
    phase: BlevePhase;
    safeHeadingDeg: number;
    stagingDistanceM: number;
    waterFlowLpm: number;
    suppressionPercent: number;
    statusText: string;
    entryGateName?: string;
  };
}

export type EmergencyEventHook = (
  event:
    | 'BLEVE_TRIGGERED'
    | 'POOL_FIRE_TRIGGERED'
    | 'BLAST_OCCURRED'
    | 'FIRE_BRIGADE_DISPATCHED'
    | 'FIRE_BRIGADE_STAGED'
    | 'WATER_ATTACK_STARTED'
    | 'FIRE_SUPPRESSION_STARTED'
    | 'FIRE_EXTINGUISHED'
) => void;

export const createEmergencyResponseController = (
  fireTruck: FireTruckComponents,
  waterAttack: WaterAttackComponents,
  roadNetwork: RoadNetworkComponents,
  onPhaseChange?: (phase: BlevePhase) => void,
  onEvent?: EmergencyEventHook
): EmergencyResponseComponents => {
  let phase: BlevePhase = 'IDLE';
  let elapsed = 0;
  let paused = false;
  let currentScenario: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE' = 'FACILITY_A_LPG';
  let maxDimension = 120;
  let safeHeading = 315;
  let fireIntensityFactor = 1.0;
  let activeRoute: EmergencyRouteResult | null = null;

  const targetHotspotPos = new THREE.Vector3(0, 8.0, 0);

  const setPhaseInternal = (newPhase: BlevePhase) => {
    if (phase !== newPhase) {
      phase = newPhase;
      if (onPhaseChange) onPhaseChange(newPhase);
    }
  };

  const triggerScenario = (
    scenarioType: 'FACILITY_A_LPG' | 'FACILITY_B_POOL_FIRE',
    maxDimM = 120,
    safeAngleDeg = 315
  ) => {
    currentScenario = scenarioType;
    maxDimension = maxDimM;
    safeHeading = safeAngleDeg;
    elapsed = 0;
    paused = false;
    fireIntensityFactor = 1.0;
    activeRoute = null;

    fireTruck.reset();
    waterAttack.reset();

    if (scenarioType === 'FACILITY_A_LPG') {
      setPhaseInternal('THERMAL_STRESS');
      if (onEvent) onEvent('BLEVE_TRIGGERED');
    } else {
      setPhaseInternal('IGNITION');
      if (onEvent) onEvent('POOL_FIRE_TRIGGERED');
    }
  };

  const pause = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
  };

  const reset = () => {
    elapsed = 0;
    paused = false;
    fireIntensityFactor = 1.0;
    activeRoute = null;
    setPhaseInternal('IDLE');
    fireTruck.reset();
    waterAttack.reset();
  };

  const replay = () => {
    reset();
    triggerScenario(currentScenario, maxDimension, safeHeading);
  };

  const update = (delta: number, time: number, windDirDeg: number, windSpeedMs: number) => {
    if (phase === 'IDLE' || paused) return;

    elapsed += delta;

    if (currentScenario === 'FACILITY_A_LPG') {
      // ──────────────────────────────────────────────────────────────────────
      // FACILITY A: BLEVE & BLAST LIFECYCLE
      // ──────────────────────────────────────────────────────────────────────
      if (elapsed < 1.5) {
        setPhaseInternal('THERMAL_STRESS');
      } else if (elapsed < 2.5) {
        setPhaseInternal('CRITICAL_EXPANSION');
      } else if (elapsed < 4.0) {
        if (phase !== 'BLAST_IGNITION') {
          setPhaseInternal('BLAST_IGNITION');
          if (onEvent) onEvent('BLAST_OCCURRED');
        }
      } else if (elapsed < 4.8) {
        setPhaseInternal('FIREBALL_PEAK');
      } else if (elapsed < 5.5) {
        setPhaseInternal('SHOCKWAVE_PROPAGATION');
      } else if (elapsed < 7.0) {
        setPhaseInternal('DEBRIS_COLLAPSE');
      } else if (elapsed < 8.5) {
        setPhaseInternal('POST_BLAST');
      } else if (elapsed < 16.5 && !fireTruck.isStaged()) {
        if (phase !== 'EMERGENCY_RESPONSE') {
          setPhaseInternal('EMERGENCY_RESPONSE');
          activeRoute = roadNetwork.findEmergencyRoute(safeHeading);
          fireTruck.dispatchOnRoute(activeRoute.waypoints);
          if (onEvent) onEvent('FIRE_BRIGADE_DISPATCHED');
        }
        fireTruck.update(delta, time);
      } else if (elapsed < 19.0 || (fireTruck.isStaged() && elapsed < 20.0)) {
        if (phase !== 'TRUCK_STAGED') {
          setPhaseInternal('TRUCK_STAGED');
          if (onEvent) onEvent('FIRE_BRIGADE_STAGED');
        }
        fireTruck.update(delta, time);
        fireTruck.aimTurretAt(targetHotspotPos);
      } else if (elapsed < 27.5) {
        if (phase !== 'WATER_ATTACK') {
          setPhaseInternal('WATER_ATTACK');
          waterAttack.startAttack(fireTruck.getNozzleWorldPosition(), targetHotspotPos);
          if (onEvent) onEvent('WATER_ATTACK_STARTED');
        }
        fireTruck.update(delta, time);
        fireTruck.aimTurretAt(targetHotspotPos);

        const nozzlePos = fireTruck.getNozzleWorldPosition();
        waterAttack.update(delta, time, nozzlePos, targetHotspotPos, windDirDeg, windSpeedMs);

        const supProgress = waterAttack.getSuppressionProgress();
        fireIntensityFactor = Math.max(0, 1.0 - supProgress);
      } else if (elapsed < 30.0) {
        if (phase !== 'EXTINGUISHED') {
          setPhaseInternal('EXTINGUISHED');
          waterAttack.stopAttack();
          if (onEvent) onEvent('FIRE_EXTINGUISHED');
        }
        fireIntensityFactor = 0;
        fireTruck.update(delta, time);
      } else {
        if (phase !== 'AFTERMATH') {
          setPhaseInternal('AFTERMATH');
        }
        fireIntensityFactor = 0;
        fireTruck.update(delta, time);
      }
    } else {
      // ──────────────────────────────────────────────────────────────────────
      // FACILITY B: SUSTAINED POOL FIRE & SUPPRESSION LIFECYCLE
      // ──────────────────────────────────────────────────────────────────────
      if (elapsed < 2.0) {
        // Phase 1: Pool Ignition & Flame Rise
        setPhaseInternal('IGNITION');
        fireIntensityFactor = Math.min(1.0, elapsed / 2.0);
      } else if (elapsed < 8.0) {
        // Phase 2: Fully Developed Sustained Pool Fire
        setPhaseInternal('SUSTAINED_FIRE');
        fireIntensityFactor = 1.0;
      } else if (elapsed < 16.5 && !fireTruck.isStaged()) {
        // Phase 3: Emergency Dispatch via Upwind Road Gateway
        if (phase !== 'EMERGENCY_RESPONSE') {
          setPhaseInternal('EMERGENCY_RESPONSE');
          activeRoute = roadNetwork.findEmergencyRoute(safeHeading);
          fireTruck.dispatchOnRoute(activeRoute.waypoints);
          if (onEvent) onEvent('FIRE_BRIGADE_DISPATCHED');
        }
        fireTruck.update(delta, time);
        fireIntensityFactor = 1.0;
      } else if (elapsed < 19.0 || (fireTruck.isStaged() && elapsed < 20.0)) {
        // Phase 4: Staged outside Zone 1 & Aiming Turret at Pool Base
        if (phase !== 'TRUCK_STAGED') {
          setPhaseInternal('TRUCK_STAGED');
          if (onEvent) onEvent('FIRE_BRIGADE_STAGED');
        }
        fireTruck.update(delta, time);
        fireTruck.aimTurretAt(targetHotspotPos);
        fireIntensityFactor = 1.0;
      } else if (elapsed < 27.5) {
        // Phase 5: High-Pressure Water Monitor Attack & Progressive Suppression
        if (phase !== 'WATER_ATTACK') {
          setPhaseInternal('WATER_ATTACK');
          waterAttack.startAttack(fireTruck.getNozzleWorldPosition(), targetHotspotPos);
          if (onEvent) onEvent('WATER_ATTACK_STARTED');
        }
        fireTruck.update(delta, time);
        fireTruck.aimTurretAt(targetHotspotPos);

        const nozzlePos = fireTruck.getNozzleWorldPosition();
        waterAttack.update(delta, time, nozzlePos, targetHotspotPos, windDirDeg, windSpeedMs);

        const supProgress = waterAttack.getSuppressionProgress();
        fireIntensityFactor = Math.max(0, 1.0 - supProgress);
      } else if (elapsed < 30.0) {
        // Phase 6: Pool Fire Extinguished & Steam Cool-Down
        if (phase !== 'EXTINGUISHED') {
          setPhaseInternal('EXTINGUISHED');
          waterAttack.stopAttack();
          if (onEvent) onEvent('FIRE_EXTINGUISHED');
        }
        fireIntensityFactor = 0;
        fireTruck.update(delta, time);
      } else {
        // Phase 7: Stabilized Safe Aftermath
        if (phase !== 'AFTERMATH') {
          setPhaseInternal('AFTERMATH');
        }
        fireIntensityFactor = 0;
        fireTruck.update(delta, time);
      }
    }
  };

  const getTelemetryStatus = () => {
    const supProgress = waterAttack.getSuppressionProgress();
    const supPercent = Math.round(supProgress * 100);

    let statusText = 'MONITORING STANDBY';
    let waterFlowLpm = 0;

    if (phase === 'THERMAL_STRESS' || phase === 'CRITICAL_EXPANSION') {
      statusText = 'VESSEL INTEGRITY CRITICAL';
    } else if (phase === 'IGNITION') {
      statusText = 'POOL IGNITION DETECTED';
    } else if (phase === 'SUSTAINED_FIRE') {
      statusText = 'SUSTAINED POOL FIRE ACTIVE';
    } else if (phase === 'BLAST_IGNITION' || phase === 'FIREBALL_PEAK' || phase === 'SHOCKWAVE_PROPAGATION') {
      statusText = 'BLEVE BLAST EVENT OCCURRING';
    } else if (phase === 'DEBRIS_COLLAPSE' || phase === 'POST_BLAST') {
      statusText = 'ASSESSING SAFE UPWIND CORRIDOR';
    } else if (phase === 'EMERGENCY_RESPONSE') {
      const gate = activeRoute?.entryGateId?.replace('GATE_', '') || 'NORTH';
      statusText = `EN ROUTE: ${gate} GATE (${Math.round(safeHeading)}°)`;
    } else if (phase === 'TRUCK_STAGED') {
      statusText = 'STAGED OUTSIDE ZONE 1 • AIMING MONITOR';
    } else if (phase === 'WATER_ATTACK' || phase === 'SUPPRESSION') {
      statusText = `WATER ATTACK ACTIVE (${supPercent}% SUPPRESSED)`;
      waterFlowLpm = 4500;
    } else if (phase === 'EXTINGUISHED' || phase === 'AFTERMATH') {
      statusText = 'FIRE SUPPRESSION COMPLETE • SITE SECURED';
      waterFlowLpm = 0;
    }

    return {
      phase,
      safeHeadingDeg: safeHeading,
      stagingDistanceM: 78,
      waterFlowLpm,
      suppressionPercent: supPercent,
      statusText,
      entryGateName: activeRoute?.entryGateId?.replace('GATE_', ''),
    };
  };

  return {
    update,
    triggerScenario,
    pause,
    resume,
    replay,
    reset,
    getPhase: () => phase,
    isPaused: () => paused,
    getFireIntensityFactor: () => fireIntensityFactor,
    getTelemetryStatus,
  };
};
