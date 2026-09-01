// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Master 3D Tactical Digital Twin Coordinator
// Integrates Sky Atmosphere, Industrial Complex, Hero Facilities (A: LPG BLEVE vs B: Pool Fire),
// Multi-Layer Fire & Smoke VFX, Deterministic Timeline, Emergency Response & A* Road Navigation
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  ThreatResponse,
  HazardMode,
  CameraPerspective,
  LightingMode,
  BlevePhase,
  SpatialProbePoint,
  ThreatCalculateParams,
} from '../simulation/types';
import { createSkyAtmosphere } from './environment/SkyAtmosphere';
import { createIndustrialTerrain } from './environment/IndustrialTerrain';
import { createRoadNetwork } from './environment/RoadNetwork';
import { createSurroundingIndustrialComplex } from './environment/SurroundingBuildings';
import { createHeroLpgSphere } from './facility/HeroLpgSphere';
import { createHeroPoolFireTank } from './facility/HeroPoolFireTank';
import { createProceduralFire } from './fire/ProceduralFire';
import { createBleveExplosion } from './fire/BleveExplosion';
import { createBlastDebrisSystem } from './fire/BlastDebrisSystem';
import { createDynamicSmokePlume } from './smoke/DynamicSmokePlume';
import { createHazardFieldVolume } from './hazard/HazardFieldVolume';
import { createHazardVectorHelper } from './hazard/HazardVectorHelper';
import { createHazardInspector } from './hazard/HazardInspector';
import { createCinematicCameraController } from './camera/CinematicCameraController';
import { createFireTruck } from './emergency/FireTruck';
import { createWaterAttackSystem } from './emergency/WaterAttackSystem';
import { createEmergencyResponseController } from './emergency/EmergencyResponseController';
import { getSafeApproachHeading } from './utils/coordinateMath';
import { DigitalTwinHUD } from './hud/DigitalTwinHUD';

interface DigitalTwinCanvasProps {
  threatData: ThreatResponse | null;
  params?: ThreatCalculateParams;
  isImmersive?: boolean;
  onToggleImmersive?: () => void;
  onExit3D: () => void;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  threatData,
  params,
  isImmersive = false,
  onToggleImmersive = () => {},
  onExit3D,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // HUD & Simulation State
  const [currentMode, setCurrentMode] = useState<HazardMode>('COMBINED');
  const [currentPerspective, setCurrentPerspective] = useState<CameraPerspective>('COMMAND');
  const [lightingMode, setLightingMode] = useState<LightingMode>('NIGHT');
  const [blevePhase, setBlevePhase] = useState<BlevePhase>('IDLE');
  const [isPaused, setIsPaused] = useState(false);
  const [probePoint, setProbePoint] = useState<SpatialProbePoint | null>(null);

  // References for animation loop
  const currentModeRef = useRef<HazardMode>(currentMode);
  const currentPerspectiveRef = useRef<CameraPerspective>(currentPerspective);
  const scenarioTriggerRef = useRef<() => void>(() => {});
  const scenarioPauseRef = useRef<() => void>(() => {});
  const scenarioResumeRef = useRef<() => void>(() => {});
  const scenarioReplayRef = useRef<() => void>(() => {});
  const scenarioResetRef = useRef<() => void>(() => {});
  const setCamPerspectiveRef = useRef<(p: CameraPerspective) => void>(() => {});
  const resetCamViewRef = useRef<() => void>(() => {});
  const setLightingRef = useRef<(m: LightingMode) => void>(() => {});

  useEffect(() => {
    currentModeRef.current = currentMode;
  }, [currentMode]);

  useEffect(() => {
    currentPerspectiveRef.current = currentPerspective;
    if (setCamPerspectiveRef.current) {
      setCamPerspectiveRef.current(currentPerspective);
    }
  }, [currentPerspective]);

  useEffect(() => {
    if (setLightingRef.current) {
      setLightingRef.current(lightingMode);
    }
  }, [lightingMode]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Sky, Atmosphere & Dynamic Lighting
    const atmosphere = createSkyAtmosphere(scene, lightingMode);
    setLightingRef.current = atmosphere.setLightingMode;

    // 3. Functional Connected Industrial Road Network & Perimeter Gateways
    const roadNetwork = createRoadNetwork(scene);

    // 4. Realistic Industrial Terrain Pad & Security Perimeter
    const terrain = createIndustrialTerrain(scene);

    // 5. Dense Surrounding Industrial Complex (Zoned along roads)
    const complex = createSurroundingIndustrialComplex(scene);

    // 6. Hero Facility Switcher (A: Pressurized LPG Sphere vs B: Petroleum Tank Pool Fire)
    const isFacilityA = (threatData?.facility_type || params?.facility_type) !== 'FACILITY_B_POOL_FIRE';
    const scenarioType = isFacilityA ? 'FACILITY_A_LPG' : 'FACILITY_B_POOL_FIRE';

    let heroLpgSphereSystem: ReturnType<typeof createHeroLpgSphere> | null = null;
    let heroPoolFireTankSystem: ReturnType<typeof createHeroPoolFireTank> | null = null;
    let fireOriginY = 16.0;

    if (isFacilityA) {
      const tankDiameter = params?.tank_diameter_m || 14;
      const fillFrac = params?.fill_fraction || 0.85;
      heroLpgSphereSystem = createHeroLpgSphere(tankDiameter, fillFrac);
      scene.add(heroLpgSphereSystem.group);
      fireOriginY = (tankDiameter / 2) + 7;
    } else {
      const tankDiameter = params?.tank_diameter_m || 20;
      const poolDiameter = params?.pool_diameter_m || 24;
      heroPoolFireTankSystem = createHeroPoolFireTank(tankDiameter, poolDiameter);
      scene.add(heroPoolFireTankSystem.group);
      fireOriginY = 18.0;
    }

    // 7. Multi-Layer Fire & Smoke VFX Systems
    const initialFlameH = threatData?.physics_metrics?.flame_height_m || 45;
    const initialFlameTilt = threatData?.physics_metrics?.flame_tilt_deg || 30;
    const windSpeed = params?.wind_speed_ms || 8.5;
    const windDir = params?.wind_direction_deg || 135;

    const fireSystem = createProceduralFire(scene, initialFlameH, initialFlameTilt, windDir, windSpeed);
    fireSystem.group.position.set(0, fireOriginY, 0);

    const smokePlume = createDynamicSmokePlume(scene, windSpeed, windDir);
    smokePlume.setWindParameters(windSpeed, windDir, fireOriginY + 5);

    const debrisSystem = createBlastDebrisSystem(scene);

    // 8. Dual 3D Compass Vector Helper (Red Downwind vs Green Upwind)
    const vectorHelper = createHazardVectorHelper(scene, windDir);

    // BOTH Facility A and Facility B start completely clean in CALM (IDLE)
    fireSystem.setVisible(false);
    smokePlume.setActive(false);

    // 9. Fire Brigade & Water Attack Systems
    const fireTruck = createFireTruck(scene);
    const waterAttack = createWaterAttackSystem(scene);

    // 10. Deterministic Incident & Suppression Sequence Controller
    const bleveSystem = createBleveExplosion(scene, (newPhase) => {
      setBlevePhase(newPhase);
    });

    const responseController = createEmergencyResponseController(
      fireTruck,
      waterAttack,
      roadNetwork,
      (newPhase) => {
        setBlevePhase(newPhase);
      }
    );

    scenarioTriggerRef.current = () => {
      const maxDim = isFacilityA
        ? (threatData?.physics_metrics?.fireball_radius_m || 120)
        : (threatData?.physics_metrics?.flame_height_m || 45);
      const safeAngle = threatData?.safe_approach_vector?.safe_angle_deg ?? getSafeApproachHeading(windDir);

      if (isFacilityA) {
        bleveSystem.triggerBleve(maxDim);
        debrisSystem.triggerBlast(new THREE.Vector3(0, fireOriginY, 0), maxDim);
      }
      responseController.triggerScenario(scenarioType, maxDim, safeAngle);
      setIsPaused(false);
    };

    scenarioPauseRef.current = () => {
      if (isFacilityA) bleveSystem.pause();
      responseController.pause();
      setIsPaused(true);
    };

    scenarioResumeRef.current = () => {
      if (isFacilityA) bleveSystem.resume();
      responseController.resume();
      setIsPaused(false);
    };

    scenarioReplayRef.current = () => {
      const maxDim = isFacilityA
        ? (threatData?.physics_metrics?.fireball_radius_m || 120)
        : (threatData?.physics_metrics?.flame_height_m || 45);
      const safeAngle = threatData?.safe_approach_vector?.safe_angle_deg ?? getSafeApproachHeading(windDir);

      if (heroLpgSphereSystem) heroLpgSphereSystem.reset();
      if (heroPoolFireTankSystem) heroPoolFireTankSystem.reset();
      complex.resetDamage();
      debrisSystem.reset();
      fireSystem.setVisible(false);
      smokePlume.reset();

      if (isFacilityA) {
        bleveSystem.triggerBleve(maxDim);
        debrisSystem.triggerBlast(new THREE.Vector3(0, fireOriginY, 0), maxDim);
      }
      responseController.triggerScenario(scenarioType, maxDim, safeAngle);
      setIsPaused(false);
    };

    scenarioResetRef.current = () => {
      bleveSystem.reset();
      responseController.reset();
      if (heroLpgSphereSystem) heroLpgSphereSystem.reset();
      if (heroPoolFireTankSystem) heroPoolFireTankSystem.reset();
      complex.resetDamage();
      debrisSystem.reset();
      fireSystem.setVisible(false);
      smokePlume.reset();
      setBlevePhase('IDLE');
      setIsPaused(false);
    };

    // 11. 3D Hazard Contour Volumes
    const hazardVolumes = createHazardFieldVolume(scene);
    hazardVolumes.updateThreatData(threatData, currentModeRef.current);

    // 12. Advanced Cinematic Camera Controller
    const cameraController = createCinematicCameraController(container, currentPerspectiveRef.current);
    setCamPerspectiveRef.current = cameraController.setPerspective;
    resetCamViewRef.current = cameraController.resetView;

    // 13. Interactive Raycast Inspector & Double-Click Focus
    const inspector = createHazardInspector(scene, () => ({
      facility_type: isFacilityA ? 'FACILITY_A_LPG' : 'FACILITY_B_POOL_FIRE',
      latitude: params?.latitude || 13.03,
      longitude: params?.longitude || 80.235,
      mass_kg: params?.mass_kg || 40000,
      pool_diameter_m: params?.pool_diameter_m || 20,
      fill_fraction: params?.fill_fraction || 0.85,
      tank_diameter_m: params?.tank_diameter_m || 14,
      tank_volume_m3: params?.tank_volume_m3 || 80,
      fuel_type: params?.fuel_type || 'LPG',
      wind_speed_ms: windSpeed,
      wind_direction_deg: windDir,
    }));

    const onPointerMove = (e: MouseEvent) => {
      const probe = inspector.handlePointerMove(e, container, cameraController.camera);
      setProbePoint(probe);
    };
    container.addEventListener('mousemove', onPointerMove);

    const onDblClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraController.camera);

      const intersects = raycaster.intersectObjects(scene.children, true);
      for (const hit of intersects) {
        if (hit.object && hit.object !== terrain.children[0]) {
          cameraController.focusOnTarget(hit.point, 42);
          break;
        }
      }
    };
    container.addEventListener('dblclick', onDblClick);

    // 14. Master Animation Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (isFacilityA) {
        bleveSystem.update(delta);
      }
      responseController.update(delta, time, windDir, windSpeed);

      const currentPhase = responseController.getPhase();
      const fireIntensity = responseController.getFireIntensityFactor();

      // State synchronization for Facility A:
      if (isFacilityA) {
        const blastRadius = bleveSystem.getBlastWaveRadius();
        if (
          currentPhase === 'IDLE' ||
          currentPhase === 'THERMAL_STRESS' ||
          currentPhase === 'CRITICAL_EXPANSION'
        ) {
          fireSystem.setVisible(false);
          smokePlume.setActive(false);
        } else if (
          currentPhase === 'BLAST_IGNITION' ||
          currentPhase === 'FIREBALL_PEAK' ||
          currentPhase === 'SHOCKWAVE_PROPAGATION' ||
          currentPhase === 'DEBRIS_COLLAPSE' ||
          currentPhase === 'POST_BLAST' ||
          currentPhase === 'EMERGENCY_RESPONSE' ||
          currentPhase === 'TRUCK_STAGED' ||
          currentPhase === 'WATER_ATTACK' ||
          currentPhase === 'SUPPRESSION'
        ) {
          fireSystem.setVisible(fireIntensity > 0.02);
          fireSystem.setIntensity(fireIntensity);
          smokePlume.setActive(fireIntensity > 0.05);
        } else if (currentPhase === 'EXTINGUISHED' || currentPhase === 'AFTERMATH') {
          fireSystem.setVisible(false);
          smokePlume.setActive(false);
        }

        if (heroLpgSphereSystem) {
          heroLpgSphereSystem.updateBleveState(currentPhase, delta);
        }

        complex.updateBlastWave(blastRadius, delta, time);
        debrisSystem.update(delta, time, blastRadius, windDir, windSpeed);
      } else {
        // State synchronization for Facility B (Pool Fire):
        if (currentPhase === 'IDLE') {
          fireSystem.setVisible(false);
          smokePlume.setActive(false);
        } else if (
          currentPhase === 'IGNITION' ||
          currentPhase === 'SUSTAINED_FIRE' ||
          currentPhase === 'EMERGENCY_RESPONSE' ||
          currentPhase === 'TRUCK_STAGED' ||
          currentPhase === 'WATER_ATTACK' ||
          currentPhase === 'SUPPRESSION'
        ) {
          fireSystem.setVisible(fireIntensity > 0.02);
          fireSystem.setIntensity(fireIntensity);
          smokePlume.setActive(fireIntensity > 0.05);
        } else if (currentPhase === 'EXTINGUISHED' || currentPhase === 'AFTERMATH') {
          fireSystem.setVisible(false);
          smokePlume.setActive(false);
        }

        if (heroPoolFireTankSystem) {
          heroPoolFireTankSystem.updateState(currentPhase, fireIntensity, delta);
        }
      }

      fireSystem.update(delta, time);
      smokePlume.update(delta, time);
      hazardVolumes.update(time);

      const shake = isFacilityA ? bleveSystem.getCameraShakeIntensity() : 0;
      cameraController.update(delta, shake, windDir);

      renderer.render(scene, cameraController.camera);
    };
    animate();

    // 15. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          cameraController.handleResize(w, h);
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', onPointerMove);
      container.removeEventListener('dblclick', onDblClick);
      cameraController.dispose();
      inspector.dispose();
      renderer.dispose();
    };
  }, [threatData, params]);

  return (
    <div className="relative w-full h-full min-h-[600px] overflow-hidden bg-slate-950 font-sans">
      {/* 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Modern Tactical HUD & Timeline Controller */}
      <DigitalTwinHUD
        threatData={threatData}
        params={params}
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        currentPerspective={currentPerspective}
        onSelectPerspective={setCurrentPerspective}
        onResetView={() => {
          if (resetCamViewRef.current) resetCamViewRef.current();
        }}
        lightingMode={lightingMode}
        onSelectLightingMode={setLightingMode}
        isImmersive={isImmersive}
        onToggleImmersive={onToggleImmersive}
        blevePhase={blevePhase}
        isPaused={isPaused}
        onTriggerScenario={() => scenarioTriggerRef.current()}
        onPauseScenario={() => scenarioPauseRef.current()}
        onResumeScenario={() => scenarioResumeRef.current()}
        onReplayScenario={() => scenarioReplayRef.current()}
        onResetScene={() => scenarioResetRef.current()}
        probePoint={probePoint}
        onExit3D={onExit3D}
      />
    </div>
  );
};
