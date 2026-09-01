// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Blueprint 3D Digital Twin Simulation Engine
// Authoritative Incident Origin + Real Tank Rupture + Structural Blast Scorching
// Continuous Single-Vehicle Road Response: Gate -> Target 1 -> Target 2 -> ... -> Return
// ────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FacilitySchema, FacilityAsset } from '../../simulation/blueprintTypes';
import { FacilitySimulationResult, runFacilityHazardSimulation } from '../../simulation/hazardEngine';
import { createSkyAtmosphere } from '../environment/SkyAtmosphere';
import { createIndustrialTerrain } from '../environment/IndustrialTerrain';
import { createProceduralRoadNetwork } from './ProceduralRoadNetwork';
import { createProceduralAssetMesh, ProceduralAssetComponents } from './ProceduralAssetFactory';
import { createCinematicCameraController } from '../camera/CinematicCameraController';
import { createProceduralFire, ProceduralFireComponents } from '../fire/ProceduralFire';
import { createDynamicSmokePlume } from '../smoke/DynamicSmokePlume';
import { createBleveExplosion, BleveSystemComponents } from '../fire/BleveExplosion';
import { createBlastDebrisSystem } from '../fire/BlastDebrisSystem';
import { createHazardVectorHelper } from '../hazard/HazardVectorHelper';
import { createHazardFieldVolume } from '../hazard/HazardFieldVolume';
import { createFireTruck } from '../emergency/FireTruck';
import { createWaterAttackSystem } from '../emergency/WaterAttackSystem';
import { getSafeApproachHeading } from '../utils/coordinateMath';

export type SimulationPhase =
  | 'IDLE'
  | 'PRIMARY_EXPLOSION'
  | 'CASCADE_PROCESSING'
  | 'CASCADE_COMPLETE'
  | 'FIRE_BRIGADE_DEPLOYING'
  | 'FIRE_BRIGADE_EXTINGUISHING'
  | 'RETURNING_TO_SAFE_POSITION'
  | 'INCIDENT_RESOLVED';

interface BlueprintDigitalTwinSceneProps {
  schema: FacilitySchema;
  selectedAssetId: string | null;
  onSelectAsset: (asset: FacilityAsset | null) => void;
  activeIncidentAssetId: string | null;
  activeIncidentType: 'BLEVE' | 'POOL_FIRE' | null;
  isSimulating: boolean;
  deployBrigadeTrigger?: number;
  windDirectionDeg: number;
  windSpeedMs: number;
  simulationResult?: FacilitySimulationResult | null;
  onPhaseChange?: (
    phase: SimulationPhase,
    activeFires: number,
    totalExplosions: number,
    extinguishedCount: number
  ) => void;
  onSimulationEvent?: (title: string, msg: string) => void;
  onSimulationCompleted?: () => void;
}

interface CascadeExplosionInstance {
  id: string;
  sequenceIndex: number;
  depth: number;
  assetId: string;
  assetName: string;
  worldPos: THREE.Vector3;
  blastRadiusM: number;
  triggerTimeSec: number;
  causeAssetId: string | null;
  triggered: boolean;
  isExtinguished: boolean;
  bleveSystem: BleveSystemComponents;
  fireSystem: ProceduralFireComponents;
}

export const BlueprintDigitalTwinScene: React.FC<BlueprintDigitalTwinSceneProps> = ({
  schema,
  selectedAssetId,
  onSelectAsset,
  activeIncidentAssetId,
  activeIncidentType,
  isSimulating,
  deployBrigadeTrigger = 0,
  windDirectionDeg,
  windSpeedMs,
  simulationResult,
  onPhaseChange,
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

  const simResultRef = useRef(simulationResult);
  simResultRef.current = simulationResult;

  const deployBrigadeRef = useRef<() => void>(() => {});
  const updateWindIn3DRef = useRef<(deg: number, speed: number) => void>(() => {});
  const triggerSimulationRef = useRef<(assetId: string, type: 'BLEVE' | 'POOL_FIRE') => void>(() => {});
  const resetSimulationRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (isSimulating && activeIncidentAssetId && activeIncidentType && triggerSimulationRef.current) {
      triggerSimulationRef.current(activeIncidentAssetId, activeIncidentType);
    } else if (!isSimulating && resetSimulationRef.current) {
      resetSimulationRef.current();
    }
  }, [isSimulating, activeIncidentAssetId, activeIncidentType]);

  useEffect(() => {
    if (deployBrigadeTrigger > 0 && deployBrigadeRef.current) {
      deployBrigadeRef.current();
    }
  }, [deployBrigadeTrigger]);

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

    // 1. Scene & High-Performance Renderer with Crisp Exposure
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35; // Enhanced scene clarity & visibility
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Sky Atmosphere & Night Lighting
    createSkyAtmosphere(scene, 'NIGHT');

    // 3. Terrain Base Pad
    createIndustrialTerrain(scene);

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
    const cameraController = createCinematicCameraController(renderer.domElement, 'COMMAND');

    // 7. Global Simulation Utilities
    let activeWindDir = windDirectionDeg;
    let activeWindSpeed = windSpeedMs;

    const smokePlume = createDynamicSmokePlume(scene, activeWindSpeed, activeWindDir);
    const debrisSystem = createBlastDebrisSystem(scene);
    const vectorHelper = createHazardVectorHelper(scene, activeWindDir);
    const hazardVolume = createHazardFieldVolume(scene);

    const fireTruck = createFireTruck(scene);
    const waterAttack = createWaterAttackSystem(scene);

    // Simulation State Machine Variables
    const incidentOrigin = new THREE.Vector3(0, 10, 0);
    let currentPhase: SimulationPhase = 'IDLE';
    let simulationElapsed = 0;
    let cascadeInstances: CascadeExplosionInstance[] = [];
    let damagedStructuralIds: string[] = [];

    // Continuous Single-Vehicle Mission State
    let targetQueue: CascadeExplosionInstance[] = [];
    let targetIndex = -1;
    let stageStartTime = 0;
    let waterAttacking = false;
    let extinguishedCount = 0;

    const updatePhase = (newPhase: SimulationPhase) => {
      currentPhase = newPhase;
      const activeFires = cascadeInstances.filter((c) => c.triggered && !c.isExtinguished).length;
      if (onPhaseChange) {
        onPhaseChange(newPhase, activeFires, cascadeInstances.length, extinguishedCount);
      }
    };

    // Reset Simulation Callback
    resetSimulationRef.current = () => {
      currentPhase = 'IDLE';
      simulationElapsed = 0;
      targetQueue = [];
      targetIndex = -1;
      stageStartTime = 0;
      waterAttacking = false;
      extinguishedCount = 0;

      // Reset global visual utilities
      smokePlume.reset();
      debrisSystem.reset();
      hazardVolume.updateThreatData(null, 'COMBINED');
      waterAttack.stopAttack();
      fireTruck.reset();

      // Reset & dispose all cascading explosion event instances
      cascadeInstances.forEach((inst) => {
        inst.bleveSystem.reset();
        inst.fireSystem.setVisible(false);
        scene.remove(inst.bleveSystem.group);
        scene.remove(inst.fireSystem.group);
      });
      cascadeInstances = [];
      damagedStructuralIds = [];

      // Restore all 3D tank and building meshes back to intact healthy state
      assetMeshes.forEach((comp) => {
        comp.setDestroyed(false);
        comp.setScorched(false);
      });

      updatePhase('IDLE');
    };

    // Trigger Primary Incident & Blast Cascade
    triggerSimulationRef.current = (assetId: string, type: 'BLEVE' | 'POOL_FIRE') => {
      // 1. Resolve Master Physics Simulation Result
      const activeResult =
        simResultRef.current ||
        runFacilityHazardSimulation({
          incidentAssetId: assetId,
          scenario: type,
          fuelType: 'LPG',
          windSpeedMs: activeWindSpeed,
          windDirectionDeg: activeWindDir,
          facilityAssets: schema.assets,
          transformConfig: {
            blueprintWidthPx: schema.metadata.blueprintWidthPx,
            blueprintHeightPx: schema.metadata.blueprintHeightPx,
            pixelsPerMeter: schema.metadata.pixelsPerMeter,
          },
        });

      const { originWorld, cascadeChain, threatResponse, physicsMetrics, damagedStructuralAssetIds } = activeResult;

      // Update Authoritative Incident Origin
      incidentOrigin.set(originWorld.x, originWorld.y, originWorld.z);

      // Clean reset any prior active incident instances
      resetSimulationRef.current();

      damagedStructuralIds = damagedStructuralAssetIds || [];

      // 2. Build Cascade Event Instances from Shared Engine
      cascadeInstances = cascadeChain.map((node, idx) => {
        const nodePos = new THREE.Vector3(node.worldPos.x, node.worldPos.y, node.worldPos.z);
        const bleveSys = createBleveExplosion(scene, () => {});
        bleveSys.group.position.copy(nodePos);

        const fireSys = createProceduralFire(scene, node.blastRadiusM * 0.45, 24, activeWindDir, activeWindSpeed);
        fireSys.group.position.copy(nodePos);
        fireSys.setVisible(false);

        return {
          id: `INST-${node.assetId}-${idx}`,
          sequenceIndex: idx,
          depth: node.depth,
          assetId: node.assetId,
          assetName: node.assetName,
          worldPos: nodePos,
          blastRadiusM: node.blastRadiusM,
          triggerTimeSec: node.triggerTimeSec,
          causeAssetId: node.causeAssetId,
          triggered: false,
          isExtinguished: false,
          bleveSystem: bleveSys,
          fireSystem: fireSys,
        };
      });

      // 3. Volumetric Hazard Zones strictly centered at Incident Origin
      hazardVolume.group.position.set(incidentOrigin.x, 0, incidentOrigin.z);
      hazardVolume.updateThreatData(threatResponse, type === 'BLEVE' ? 'COMBINED' : 'THERMAL');

      // 4. Bind Global Directional & Smoke Emitters strictly to Incident Origin
      smokePlume.group.position.set(incidentOrigin.x, 0, incidentOrigin.z);
      smokePlume.setWindParameters(activeWindSpeed, activeWindDir, incidentOrigin.y + 4);
      smokePlume.setActive(true);

      vectorHelper.group.position.set(incidentOrigin.x, 0.4, incidentOrigin.z);
      vectorHelper.updateWindHeading(activeWindDir);

      debrisSystem.triggerBlast(incidentOrigin, physicsMetrics.lethalRadiusM);

      simulationElapsed = 0;
      targetIndex = -1;
      waterAttacking = false;
      extinguishedCount = 0;

      updatePhase('CASCADE_PROCESSING');

      if (onSimulationEvent) {
        onSimulationEvent(
          'PRIMARY DETONATION',
          `${type} blast initiated at ${activeResult.primaryAsset.name} (${activeResult.primaryAsset.id}). Cascade envelope: ${cascadeInstances.length} vessels.`
        );
      }
    };

    // User-Triggered Manual Fire Brigade Deployment (Starts Continuous Journey)
    deployBrigadeRef.current = () => {
      if (currentPhase !== 'CASCADE_COMPLETE') {
        return; // Guard: Cannot deploy while explosions are still occurring
      }

      // Collect all currently active burning targets
      targetQueue = cascadeInstances.filter((c) => c.triggered && !c.isExtinguished);
      if (targetQueue.length === 0) return;

      targetIndex = 0;
      extinguishedCount = 0;
      stageStartTime = simulationElapsed;
      waterAttacking = false;

      const safeHeading = getSafeApproachHeading(activeWindDir);
      const firstTarget = targetQueue[0];

      // Initial route from optimal safe perimeter gate to first target's standoff bay
      const initialRoute = roadNetwork.findEmergencyRoute(safeHeading, firstTarget.worldPos);
      fireTruck.dispatchOnRoute(initialRoute.waypoints);

      updatePhase('FIRE_BRIGADE_DEPLOYING');

      if (onSimulationEvent) {
        onSimulationEvent(
          'FIRE BRIGADE DISPATCHED',
          `Single Fire Tender entered via ${initialRoute.entryGateId} (${Math.round(safeHeading)}° Upwind). En route to Target #1: ${firstTarget.assetName}.`
        );
      }
    };

    updateWindIn3DRef.current = (newDeg: number, newSpeed: number) => {
      activeWindDir = newDeg;
      activeWindSpeed = newSpeed;

      vectorHelper.updateWindHeading(newDeg);
      smokePlume.setWindParameters(newSpeed, newDeg, incidentOrigin.y + 4);

      cascadeInstances.forEach((inst) => {
        inst.fireSystem.setFlameParameters(inst.blastRadiusM * 0.45, 24, newDeg, newSpeed);
      });
    };

    // 8. Asset Picking Raycaster (Click to select incident target)
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

      if (currentPhase !== 'IDLE') {
        simulationElapsed += delta;

        // ── PHASE 1: BLAST CASCADE & ENVIRONMENTAL DAMAGE ───────────────────
        if (currentPhase === 'CASCADE_PROCESSING') {
          let allTriggered = true;

          cascadeInstances.forEach((inst) => {
            if (simulationElapsed >= inst.triggerTimeSec && !inst.triggered) {
              inst.triggered = true;
              inst.bleveSystem.group.position.copy(inst.worldPos);
              inst.bleveSystem.triggerBleve(inst.blastRadiusM);
              inst.fireSystem.group.position.copy(inst.worldPos);
              inst.fireSystem.setVisible(true);

              // Rupture & char explodable tank mesh
              const assetComp = assetMeshes.get(inst.assetId);
              if (assetComp) {
                assetComp.setDestroyed(true);
              }

              if (onSimulationEvent) {
                const tag = inst.depth === 0 ? 'PRIMARY EXPLOSION' : `CASCADING DOMINO #${inst.depth}`;
                const causeText = inst.causeAssetId ? ` (Triggered by blast from ${inst.causeAssetId})` : '';
                onSimulationEvent(
                  tag,
                  `Vessel destroyed: ${inst.assetName} (${inst.assetId})${causeText} [Radius: ${inst.blastRadiusM}m]. Active fire ignited.`
                );
              }
            }

            if (!inst.triggered) {
              allTriggered = false;
            }

            inst.bleveSystem.update(delta);
            inst.fireSystem.update(delta, time);
          });

          // Check if all cascade explosions have completed
          const lastTriggerTime = cascadeInstances.length > 0
            ? cascadeInstances[cascadeInstances.length - 1].triggerTimeSec
            : 0;

          if (allTriggered && simulationElapsed >= lastTriggerTime + 3.0) {
            // Apply structural blast scorching to non-combustible assets in damage zone
            damagedStructuralIds.forEach((id) => {
              const comp = assetMeshes.get(id);
              if (comp) {
                comp.setScorched(true);
              }
            });

            updatePhase('CASCADE_COMPLETE');

            if (onSimulationEvent) {
              onSimulationEvent(
                'CASCADE COMPLETE',
                `All ${cascadeInstances.length} explosions complete. ${cascadeInstances.length} active fires burning. Environment damaged. Awaiting Fire Brigade deployment.`
              );
            }
          }
        }

        // ── POST-CASCADE IDLE (FIRES PERSIST, WAITING FOR USER ACTION) ──────
        else if (currentPhase === 'CASCADE_COMPLETE') {
          cascadeInstances.forEach((inst) => {
            inst.bleveSystem.update(delta);
            if (!inst.isExtinguished) {
              inst.fireSystem.update(delta, time);
            }
          });
        }

        // ── PHASE 2: CONTINUOUS SINGLE-VEHICLE RESPONSE & EXTINGUISHMENT ─────
        else if (
          currentPhase === 'FIRE_BRIGADE_DEPLOYING' ||
          currentPhase === 'FIRE_BRIGADE_EXTINGUISHING'
        ) {
          cascadeInstances.forEach((inst) => {
            inst.bleveSystem.update(delta);
            if (!inst.isExtinguished) {
              inst.fireSystem.update(delta, time);
            }
          });

          if (targetIndex >= 0 && targetIndex < targetQueue.length) {
            const currentTarget = targetQueue[targetIndex];
            const timeInStage = simulationElapsed - stageStartTime;

            // Travel phase (Truck driving on road network towards target standoff bay)
            if (timeInStage < 3.2) {
              if (currentPhase !== 'FIRE_BRIGADE_DEPLOYING') {
                updatePhase('FIRE_BRIGADE_DEPLOYING');
              }
            }
            // Fire suppression attack phase (Water monitor aimed at target)
            else if (timeInStage < 6.8) {
              if (!waterAttacking) {
                waterAttacking = true;
                updatePhase('FIRE_BRIGADE_EXTINGUISHING');
                waterAttack.startAttack(fireTruck.getNozzleWorldPosition(), currentTarget.worldPos);
                if (onSimulationEvent) {
                  onSimulationEvent(
                    'SUPPRESSION ENGAGED',
                    `High-pressure 4,500 L/min monitor streaming onto ${currentTarget.assetName} (#${targetIndex + 1}/${targetQueue.length}).`
                  );
                }
              }

              fireTruck.aimTurretAt(currentTarget.worldPos);
              waterAttack.update(
                delta,
                time,
                fireTruck.getNozzleWorldPosition(),
                currentTarget.worldPos,
                activeWindDir,
                activeWindSpeed
              );

              // Progressively reduce flame intensity from 1.0 down to 0.0
              const progress = Math.min(1.0, (timeInStage - 3.2) / 3.2);
              currentTarget.fireSystem.setIntensity(Math.max(0, 1.0 - progress));
            }
            // Extinguishment complete for current target -> Drive to NEXT target without resetting!
            else {
              currentTarget.isExtinguished = true;
              currentTarget.fireSystem.setVisible(false);
              waterAttack.stopAttack();
              waterAttacking = false;
              extinguishedCount++;

              if (onSimulationEvent) {
                onSimulationEvent(
                  'TARGET EXTINGUISHED',
                  `Fire on ${currentTarget.assetName} extinguished. Structure secured.`
                );
              }

              // Advance to next target in queue
              targetIndex++;

              if (targetIndex < targetQueue.length) {
                const nextTarget = targetQueue[targetIndex];
                const safeHeading = getSafeApproachHeading(activeWindDir);

                // CONTINUOUS ROAD ROUTE: Starts from truck's CURRENT physical world position!
                const currentTruckPos = fireTruck.group.position.clone();
                const nextRoute = roadNetwork.findRouteBetween(currentTruckPos, nextTarget.worldPos, safeHeading);
                fireTruck.dispatchOnRoute(nextRoute.waypoints);

                stageStartTime = simulationElapsed;
                updatePhase('FIRE_BRIGADE_DEPLOYING');

                if (onSimulationEvent) {
                  onSimulationEvent(
                    'CONTINUING MISSION',
                    `Fire tender in transit along facility road from current position to Target #${targetIndex + 1}: ${nextTarget.assetName}.`
                  );
                }
              } else {
                // All active targets extinguished! Return to safe exit gate via road network
                const safeHeading = getSafeApproachHeading(activeWindDir);
                const currentTruckPos = fireTruck.group.position.clone();
                const returnRoute = roadNetwork.findReturnRoute(currentTruckPos, safeHeading);
                fireTruck.dispatchOnRoute(returnRoute.waypoints);

                stageStartTime = simulationElapsed;
                updatePhase('RETURNING_TO_SAFE_POSITION');

                if (onSimulationEvent) {
                  onSimulationEvent(
                    'RETURNING TO BASE',
                    `All ${targetQueue.length} fires extinguished. Fire tender returning along road network to safe perimeter gate.`
                  );
                }
              }
            }
          }
        }

        // ── RETURNING TO SAFE STAGING / PERIMETER GATE ───────────────────────
        else if (currentPhase === 'RETURNING_TO_SAFE_POSITION') {
          const timeReturning = simulationElapsed - stageStartTime;
          if (timeReturning >= 3.5 || fireTruck.isStaged()) {
            smokePlume.setActive(false);
            fireTruck.setEmergencyLights(false);
            updatePhase('INCIDENT_RESOLVED');

            if (onSimulationEvent) {
              onSimulationEvent(
                'MISSION COMPLETE',
                `All active fires extinguished. Incident successfully contained. Fire tender secured at safe perimeter.`
              );
            }

            if (onSimulationCompleted) {
              onSimulationCompleted();
            }
          }
        }
      }

      hazardVolume.update(time);
      fireTruck.update(delta, time);
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
