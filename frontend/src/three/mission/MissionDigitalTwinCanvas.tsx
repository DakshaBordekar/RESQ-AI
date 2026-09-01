// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Dedicated Mission Mode 3D Digital Twin Canvas
// Renders the 3D Industrial Complex with Hero Vessels, 3D Casualties,
// Dynamic Tactical Ingress Paths, Fire Truck Ingress, and Water Attack.
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  MissionCasualty,
  MissionStrategy,
  MissionPhase,
  CandidateRouteEvaluation,
} from '../../simulation/missionTypes';
import { createSkyAtmosphere } from '../environment/SkyAtmosphere';
import { createIndustrialTerrain } from '../environment/IndustrialTerrain';
import { createRoadNetwork } from '../environment/RoadNetwork';
import { createSurroundingIndustrialComplex } from '../environment/SurroundingBuildings';
import { createHeroLpgSphere } from '../facility/HeroLpgSphere';
import { createProceduralFire } from '../fire/ProceduralFire';
import { createBleveExplosion } from '../fire/BleveExplosion';
import { createBlastDebrisSystem } from '../fire/BlastDebrisSystem';
import { createDynamicSmokePlume } from '../smoke/DynamicSmokePlume';
import { createHazardVectorHelper } from '../hazard/HazardVectorHelper';
import { createCinematicCameraController } from '../camera/CinematicCameraController';
import { createFireTruck } from '../emergency/FireTruck';
import { createWaterAttackSystem } from '../emergency/WaterAttackSystem';
import { createMissionCasualtyRenderer } from './MissionCasualtyRenderer';
import { createMissionPathRenderer } from './MissionPathRenderer';
import { getSafeApproachHeading } from '../utils/coordinateMath';

interface MissionDigitalTwinCanvasProps {
  casualties: MissionCasualty[];
  candidateRoutes: CandidateRouteEvaluation[];
  selectedStrategy: MissionStrategy;
  missionPhase: MissionPhase;
  windDirectionDeg: number;
  windSpeedMs: number;
  onSelectCasualty: (casualty: MissionCasualty) => void;
  onMissionEvent: (title: string, desc: string, type: 'INCIDENT' | 'ROUTING' | 'RESCUE' | 'SUPPRESSION' | 'WARNING' | 'SUCCESS') => void;
  onCasualtyRescued: (casualtyId: string) => void;
  onMissionCompleted: () => void;
}

export const MissionDigitalTwinCanvas: React.FC<MissionDigitalTwinCanvasProps> = ({
  casualties,
  candidateRoutes,
  selectedStrategy,
  missionPhase,
  windDirectionDeg,
  windSpeedMs,
  onSelectCasualty,
  onMissionEvent,
  onCasualtyRescued,
  onMissionCompleted,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References for live updates
  const casualtiesRef = useRef(casualties);
  casualtiesRef.current = casualties;

  const candidateRoutesRef = useRef(candidateRoutes);
  candidateRoutesRef.current = candidateRoutes;

  const missionPhaseRef = useRef(missionPhase);
  missionPhaseRef.current = missionPhase;

  const windDirRef = useRef(windDirectionDeg);
  windDirRef.current = windDirectionDeg;

  const windSpeedRef = useRef(windSpeedMs);
  windSpeedRef.current = windSpeedMs;

  const triggerMissionActionRef = useRef<(phase: MissionPhase) => void>(() => {});
  const updateWindIn3DRef = useRef<(deg: number, speed: number) => void>(() => {});

  useEffect(() => {
    if (triggerMissionActionRef.current) {
      triggerMissionActionRef.current(missionPhase);
    }
  }, [missionPhase]);

  useEffect(() => {
    if (updateWindIn3DRef.current) {
      updateWindIn3DRef.current(windDirectionDeg, windSpeedMs);
    }
  }, [windDirectionDeg, windSpeedMs]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Sky & Night Tactical Atmosphere
    createSkyAtmosphere(scene, 'NIGHT');

    // 3. Road Network & Industrial Complex
    const roadNetwork = createRoadNetwork(scene);
    const terrain = createIndustrialTerrain(scene);
    const complex = createSurroundingIndustrialComplex(scene);

    // 4. Hero Vessel (Facility A LPG Sphere)
    const heroLpg = createHeroLpgSphere(14, 0.85);
    scene.add(heroLpg.group);
    const fireOriginY = 14;

    // 5. Fire & Smoke VFX
    let activeWindDir = windDirectionDeg;
    let activeWindSpeed = windSpeedMs;

    const fireSystem = createProceduralFire(scene, 45, 30, activeWindDir, activeWindSpeed);
    fireSystem.group.position.set(0, fireOriginY, 0);

    const smokePlume = createDynamicSmokePlume(scene, activeWindSpeed, activeWindDir);
    smokePlume.setWindParameters(activeWindSpeed, activeWindDir, fireOriginY + 5);

    const debrisSystem = createBlastDebrisSystem(scene);
    const vectorHelper = createHazardVectorHelper(scene, activeWindDir);

    // 6. 3D Casualties & Path Renderers
    const casualtyRenderer = createMissionCasualtyRenderer(scene, casualtiesRef.current);
    const pathRenderer = createMissionPathRenderer(scene);

    const safeHeading = getSafeApproachHeading(activeWindDir);
    pathRenderer.updateRoutes(candidateRoutesRef.current, 'GATE_WEST', safeHeading);

    // 7. Fire Brigade & Suppression
    const fireTruck = createFireTruck(scene);
    const waterAttack = createWaterAttackSystem(scene);
    const bleveSystem = createBleveExplosion(scene, () => {});

    // Camera
    const cameraController = createCinematicCameraController(container, 'COMMAND');

    // Wind Updater
    updateWindIn3DRef.current = (newDeg: number, newSpeed: number) => {
      activeWindDir = newDeg;
      activeWindSpeed = newSpeed;

      vectorHelper.updateWindHeading(newDeg);
      smokePlume.setWindParameters(newSpeed, newDeg, fireOriginY + 5);
      fireSystem.setFlameParameters(45, 30, newDeg, newSpeed);

      const newSafe = getSafeApproachHeading(newDeg);
      pathRenderer.updateRoutes(candidateRoutesRef.current, 'GATE_WEST', newSafe);

      // If truck en-route, replan path
      const route = roadNetwork.findEmergencyRoute(newSafe);
      fireTruck.dispatchOnRoute(route.waypoints);
    };

    // Mission Phase State Controller
    let currentMissionPhase: MissionPhase = 'PLANNING';
    let missionElapsed = 0;
    let truckDispatched = false;
    let suppressionActive = false;

    triggerMissionActionRef.current = (phase: MissionPhase) => {
      currentMissionPhase = phase;

      if (phase === 'DISPATCHED' || phase === 'APPROACHING') {
        const curSafe = getSafeApproachHeading(activeWindDir);
        const route = roadNetwork.findEmergencyRoute(curSafe);
        fireTruck.dispatchOnRoute(route.waypoints);
        truckDispatched = true;
        debrisSystem.triggerBlast(new THREE.Vector3(0, fireOriginY, 0), 110);
      } else if (phase === 'SUPPRESSING' || phase === 'RESCUING') {
        if (!suppressionActive) {
          suppressionActive = true;
          const targetHotspot = new THREE.Vector3(0, fireOriginY, 0);
          waterAttack.startAttack(fireTruck.getNozzleWorldPosition(), targetHotspot);
        }
      }
    };

    // Click Raycast for Casualty Inspection
    const onClick = (e: MouseEvent) => {
      const cas = casualtyRenderer.getCasualtyAtPointer(e, container, cameraController.camera);
      if (cas) {
        onSelectCasualty(cas);
      }
    };
    container.addEventListener('click', onClick);

    // Master Render Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (currentMissionPhase !== 'PLANNING') {
        missionElapsed += delta;
      }

      fireTruck.update(delta, time);
      casualtyRenderer.updateCasualties(casualtiesRef.current, time);

      if (suppressionActive) {
        const targetHotspot = new THREE.Vector3(0, fireOriginY, 0);
        fireTruck.aimTurretAt(targetHotspot);
        waterAttack.update(
          delta,
          time,
          fireTruck.getNozzleWorldPosition(),
          targetHotspot,
          activeWindDir,
          activeWindSpeed
        );

        const supProg = waterAttack.getSuppressionProgress();
        fireSystem.setIntensity(Math.max(0.1, 1.0 - supProg));
      }

      fireSystem.update(delta, time);
      smokePlume.update(delta, time);
      bleveSystem.update(delta);
      cameraController.update(delta, 0, activeWindDir);

      renderer.render(scene, cameraController.camera);
    };
    animate();

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
      container.removeEventListener('click', onClick);
      cameraController.dispose();
      casualtyRenderer.dispose();
      pathRenderer.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[560px] overflow-hidden bg-slate-950">
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
