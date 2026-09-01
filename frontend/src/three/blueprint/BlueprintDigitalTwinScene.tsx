// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint-Derived 3D Digital Twin Viewport & Simulation Coordinator
// Procedural Facility Rendering, Asset Picking, Real-Time Incident Anchoring, and Suppression
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FacilitySchema, FacilityAsset } from '../../simulation/blueprintTypes';
import { createProceduralAssetMesh, ProceduralAssetComponents } from './ProceduralAssetFactory';
import { createProceduralRoadNetwork, ProceduralRoadNetworkComponents } from './ProceduralRoadNetwork';
import { createSkyAtmosphere } from '../environment/SkyAtmosphere';
import { createIndustrialTerrain } from '../environment/IndustrialTerrain';
import { createProceduralFire } from '../fire/ProceduralFire';
import { createDynamicSmokePlume } from '../smoke/DynamicSmokePlume';
import { createBleveExplosion } from '../fire/BleveExplosion';
import { createBlastDebrisSystem } from '../fire/BlastDebrisSystem';
import { createHazardVectorHelper } from '../hazard/HazardVectorHelper';
import { createCinematicCameraController } from '../camera/CinematicCameraController';
import { createFireTruck } from '../emergency/FireTruck';
import { createWaterAttackSystem } from '../emergency/WaterAttackSystem';
import { getSafeApproachHeading } from '../utils/coordinateMath';

interface BlueprintDigitalTwinSceneProps {
  schema: FacilitySchema;
  selectedAssetId: string | null;
  onSelectAsset: (asset: FacilityAsset) => void;
  // Simulation Controls
  activeIncidentAssetId: string | null;
  activeIncidentType: 'BLEVE' | 'POOL_FIRE' | null;
  isSimulating: boolean;
  windDirectionDeg: number;
  windSpeedMs: number;
  onSimulationEvent?: (title: string, msg: string) => void;
  onSimulationCompleted?: () => void;
}

export const BlueprintDigitalTwinScene: React.FC<BlueprintDigitalTwinSceneProps> = ({
  schema,
  selectedAssetId,
  onSelectAsset,
  activeIncidentAssetId,
  activeIncidentType,
  isSimulating,
  windDirectionDeg,
  windSpeedMs,
  onSimulationEvent,
  onSimulationCompleted,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // Live References
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  const selectedAssetIdRef = useRef(selectedAssetId);
  selectedAssetIdRef.current = selectedAssetId;

  const isSimulatingRef = useRef(isSimulating);
  isSimulatingRef.current = isSimulating;

  const windDirRef = useRef(windDirectionDeg);
  windDirRef.current = windDirectionDeg;

  const windSpeedRef = useRef(windSpeedMs);
  windSpeedRef.current = windSpeedMs;

  const updateWindIn3DRef = useRef<(deg: number, speed: number) => void>(() => {});
  const triggerSimulationRef = useRef<(assetId: string, type: 'BLEVE' | 'POOL_FIRE') => void>(() => {});

  useEffect(() => {
    if (isSimulating && activeIncidentAssetId && activeIncidentType && triggerSimulationRef.current) {
      triggerSimulationRef.current(activeIncidentAssetId, activeIncidentType);
    }
  }, [isSimulating, activeIncidentAssetId, activeIncidentType]);

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

    // 2. Sky Atmosphere & Night Lighting
    createSkyAtmosphere(scene, 'NIGHT');

    // 3. Terrain Base Pad
    const terrain = createIndustrialTerrain(scene);

    // 4. Procedural Road Network
    const roadNetwork = createProceduralRoadNetwork(scene, schema.roads, schema.gates);

    // 5. Build Procedural 3D Assets
    const assetMeshes: Map<string, ProceduralAssetComponents> = new Map();
    schema.assets.forEach((asset) => {
      const isSelected = asset.id === selectedAssetIdRef.current;
      const comp = createProceduralAssetMesh(asset, isSelected);
      scene.add(comp.meshGroup);
      assetMeshes.set(asset.id, comp);
    });

    // 6. Camera Controller
    const cameraController = createCinematicCameraController(container, 'COMMAND');

    // 7. Simulation Systems (Fire, Smoke, Explosion, Debris, Fire Brigade, Water)
    let activeWindDir = windDirectionDeg;
    let activeWindSpeed = windSpeedMs;

    const fireSystem = createProceduralFire(scene, 45, 30, activeWindDir, activeWindSpeed);
    const smokePlume = createDynamicSmokePlume(scene, activeWindSpeed, activeWindDir);
    const bleveExplosion = createBleveExplosion(scene, () => {});
    const debrisSystem = createBlastDebrisSystem(scene);
    const vectorHelper = createHazardVectorHelper(scene, activeWindDir);

    const fireTruck = createFireTruck(scene);
    const waterAttack = createWaterAttackSystem(scene);

    // Initial Calm State
    fireSystem.setVisible(false);
    smokePlume.setActive(false);

    let incidentOrigin = new THREE.Vector3(0, 10, 0);
    let simulationActive = false;
    let suppressionActive = false;
    let simulationElapsed = 0;

    triggerSimulationRef.current = (assetId: string, type: 'BLEVE' | 'POOL_FIRE') => {
      const targetAsset = schema.assets.find((a) => a.id === assetId);
      if (targetAsset) {
        incidentOrigin.set(targetAsset.worldPos.x, targetAsset.worldPos.y, targetAsset.worldPos.z);
      }

      fireSystem.group.position.copy(incidentOrigin);
      smokePlume.setWindParameters(activeWindSpeed, activeWindDir, incidentOrigin.y + 5);

      simulationActive = true;
      simulationElapsed = 0;
      suppressionActive = false;

      const safeHeading = getSafeApproachHeading(activeWindDir);
      const route = roadNetwork.findEmergencyRoute(safeHeading, incidentOrigin);

      if (type === 'BLEVE') {
        bleveExplosion.triggerBleve(110);
        debrisSystem.triggerBlast(incidentOrigin, 110);
      }

      fireTruck.dispatchOnRoute(route.waypoints);
      if (onSimulationEvent) {
        onSimulationEvent(
          'INCIDENT TRIGGERED',
          `${type} incident initiated at ${targetAsset?.name || assetId}. Ingress assigned via ${route.entryGateId}.`
        );
      }
    };

    updateWindIn3DRef.current = (newDeg: number, newSpeed: number) => {
      activeWindDir = newDeg;
      activeWindSpeed = newSpeed;

      vectorHelper.updateWindHeading(newDeg);
      smokePlume.setWindParameters(newSpeed, newDeg, incidentOrigin.y + 5);
      fireSystem.setFlameParameters(45, 30, newDeg, newSpeed);

      if (simulationActive) {
        const safeHeading = getSafeApproachHeading(newDeg);
        const route = roadNetwork.findEmergencyRoute(safeHeading, incidentOrigin);
        fireTruck.dispatchOnRoute(route.waypoints);
      }
    };

    // 8. Asset Picking Raycaster (Click to inspect)
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraController.camera);

      const hitObjects: THREE.Object3D[] = [];
      assetMeshes.forEach((comp) => hitObjects.push(comp.meshGroup));

      const intersects = raycaster.intersectObjects(hitObjects, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.assetId && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData?.assetId) {
          const found = schema.assets.find((a) => a.id === obj!.userData.assetId);
          if (found) {
            onSelectAsset(found);
          }
        }
      }
    };
    container.addEventListener('click', onClick);

    // 9. Master Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      if (simulationActive) {
        simulationElapsed += delta;

        if (simulationElapsed >= 2.0 && simulationElapsed < 18.0) {
          fireSystem.setVisible(true);
          smokePlume.setActive(true);
        } else if (simulationElapsed >= 10.0 && !suppressionActive) {
          suppressionActive = true;
          waterAttack.startAttack(fireTruck.getNozzleWorldPosition(), incidentOrigin);
          if (onSimulationEvent) {
            onSimulationEvent('SUPPRESSION ENGAGED', '4,500 L/min monitor active from upwind staging bay.');
          }
        } else if (simulationElapsed >= 24.0) {
          fireSystem.setVisible(false);
          smokePlume.setActive(false);
          waterAttack.stopAttack();
          simulationActive = false;
          if (onSimulationCompleted) {
            onSimulationCompleted();
          }
        }

        if (suppressionActive) {
          fireTruck.aimTurretAt(incidentOrigin);
          waterAttack.update(
            delta,
            time,
            fireTruck.getNozzleWorldPosition(),
            incidentOrigin,
            activeWindDir,
            activeWindSpeed
          );
          const prog = waterAttack.getSuppressionProgress();
          fireSystem.setIntensity(Math.max(0.1, 1.0 - prog));
        }

        bleveExplosion.update(delta);
      }

      fireTruck.update(delta, time);
      fireSystem.update(delta, time);
      smokePlume.update(delta, time);
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
      assetMeshes.forEach((c) => c.dispose());
      roadNetwork.dispose();
      renderer.dispose();
    };
  }, [schema]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-950">
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
};
