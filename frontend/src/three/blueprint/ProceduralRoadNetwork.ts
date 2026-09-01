// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Procedural Road Network & Connected Topological Routing Engine
// Builds 3D asphalt roadways and provides continuous graph pathfinding between targets
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { FacilityRoad, FacilityGate } from '../../simulation/blueprintTypes';
import { EmergencyRouteResult } from '../environment/RoadNetwork';

export interface ProceduralRoadNetworkComponents {
  group: THREE.Group;
  findEmergencyRoute: (safeHeadingDeg: number, targetPos?: THREE.Vector3) => EmergencyRouteResult;
  findRouteBetween: (startPos: THREE.Vector3, targetPos: THREE.Vector3, safeHeadingDeg?: number) => EmergencyRouteResult;
  findReturnRoute: (currentPos: THREE.Vector3, safeHeadingDeg: number) => EmergencyRouteResult;
  getStandoffPosition: (targetPos: THREE.Vector3, safeHeadingDeg?: number) => THREE.Vector3;
  dispose: () => void;
}

export const createProceduralRoadNetwork = (
  scene: THREE.Scene,
  roads: FacilityRoad[],
  gates: FacilityGate[]
): ProceduralRoadNetworkComponents => {
  const group = new THREE.Group();
  scene.add(group);

  // Materials
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark industrial asphalt
    roughness: 0.4,
    metalness: 0.2,
  });

  const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
  const guardhouseMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.5 });
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });

  // 1. Build 3D Road Segments from Road Polylines
  const allRoadPoints: THREE.Vector3[] = [];

  roads.forEach((road) => {
    const pts = road.points;
    const width = road.widthM || 12.0;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

      const v1 = new THREE.Vector3(p1.worldX, 0.5, p1.worldZ);
      const v2 = new THREE.Vector3(p2.worldX, 0.5, p2.worldZ);
      allRoadPoints.push(v1, v2);

      const dx = p2.worldX - p1.worldX;
      const dz = p2.worldZ - p1.worldZ;
      const length = Math.sqrt(dx * dx + dz * dz);
      if (length < 1.0) continue;

      const angle = Math.atan2(dx, dz);
      const midX = (p1.worldX + p2.worldX) / 2;
      const midZ = (p1.worldZ + p2.worldZ) / 2;

      // Asphalt Plane
      const roadGeo = new THREE.PlaneGeometry(width, length);
      const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.rotation.z = -angle;
      roadMesh.position.set(midX, 0.05, midZ);
      roadMesh.receiveShadow = true;
      group.add(roadMesh);

      // Curbs (Left & Right)
      for (let side of [-1, 1]) {
        const curbGeo = new THREE.BoxGeometry(0.8, 0.35, length);
        const curbMesh = new THREE.Mesh(curbGeo, curbMat);
        curbMesh.rotation.y = angle;
        const offsetX = -Math.cos(angle) * (side * (width / 2 + 0.4));
        const offsetZ = Math.sin(angle) * (side * (width / 2 + 0.4));
        curbMesh.position.set(midX + offsetX, 0.18, midZ + offsetZ);
        group.add(curbMesh);
      }

      // Yellow Dashed Center Line
      const stripeCount = Math.floor(length / 8);
      for (let s = 0; s < stripeCount; s++) {
        const t = (s + 0.5) / stripeCount;
        const sx = p1.worldX + dx * t;
        const sz = p1.worldZ + dz * t;

        const stripeGeo = new THREE.PlaneGeometry(0.3, 4.0);
        const stripeMesh = new THREE.Mesh(stripeGeo, yellowStripeMat);
        stripeMesh.rotation.x = -Math.PI / 2;
        stripeMesh.rotation.z = -angle;
        stripeMesh.position.set(sx, 0.07, sz);
        group.add(stripeMesh);
      }
    }
  });

  // 2. Build Perimeter Checkpoint Gate Structures
  gates.forEach((gate) => {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(gate.worldPos.x, 0, gate.worldPos.z);
    gateGroup.rotation.y = (gate.headingDeg * Math.PI) / 180;

    // Guardhouse
    const guardhouse = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 4.5), guardhouseMat);
    guardhouse.position.set(8.5, 1.75, 0);
    guardhouse.castShadow = true;
    gateGroup.add(guardhouse);

    // Barrier Arm
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.35, 0.35), barrierMat);
    barrier.position.set(0, 1.2, 0);
    gateGroup.add(barrier);

    group.add(gateGroup);
  });

  // 3. Helper to find closest point on existing road network
  const getNearestRoadPoint = (pos: THREE.Vector3): THREE.Vector3 => {
    if (allRoadPoints.length === 0) {
      return new THREE.Vector3(pos.x, 0.5, pos.z);
    }

    let nearest = allRoadPoints[0];
    let minDist = pos.distanceTo(nearest);

    for (let i = 1; i < allRoadPoints.length; i++) {
      const d = pos.distanceTo(allRoadPoints[i]);
      if (d < minDist) {
        minDist = d;
        nearest = allRoadPoints[i];
      }
    }

    return nearest.clone();
  };

  // 4. Helper to compute a safe road-accessible standoff firefighting point for a target
  const getStandoffPosition = (targetPos: THREE.Vector3, safeHeadingDeg = 315): THREE.Vector3 => {
    const rad = (safeHeadingDeg * Math.PI) / 180;
    // Upwind standoff offset ~45m
    const rawStandoff = new THREE.Vector3(
      targetPos.x + Math.sin(rad) * 48.0,
      0.5,
      targetPos.z - Math.cos(rad) * 48.0
    );

    // Snap towards the closest road point near this standoff
    const roadPt = getNearestRoadPoint(rawStandoff);
    return new THREE.Vector3(
      rawStandoff.x * 0.4 + roadPt.x * 0.6,
      0.5,
      rawStandoff.z * 0.4 + roadPt.z * 0.6
    );
  };

  // 5. Initial Emergency Route from Entry Gate to Target 1
  const findEmergencyRoute = (
    safeHeadingDeg: number,
    targetPos?: THREE.Vector3
  ): EmergencyRouteResult => {
    const activeGates = gates.length > 0
      ? gates
      : [
          { id: 'GATE_NORTH', name: 'NORTH ACCESS GATE', worldPos: { x: 0, z: -150 }, headingDeg: 0, cardinal: 'N' },
          { id: 'GATE_SOUTH', name: 'SOUTH ACCESS GATE', worldPos: { x: 0, z: 150 }, headingDeg: 180, cardinal: 'S' },
          { id: 'GATE_EAST', name: 'EAST ACCESS GATE', worldPos: { x: 150, z: 0 }, headingDeg: 90, cardinal: 'E' },
          { id: 'GATE_WEST', name: 'WEST ACCESS GATE', worldPos: { x: -150, z: 0 }, headingDeg: 270, cardinal: 'W' },
        ];

    // Find gate closest to safe upwind heading
    let bestGate = activeGates[0];
    let minDiff = 999;

    activeGates.forEach((g) => {
      const diff = Math.abs(g.headingDeg - safeHeadingDeg);
      const norm = Math.min(diff, 360 - diff);
      if (norm < minDiff) {
        minDiff = norm;
        bestGate = g;
      }
    });

    const gatePos = new THREE.Vector3(bestGate.worldPos.x, 0.5, bestGate.worldPos.z);
    const incidentPos = targetPos || new THREE.Vector3(0, 0, 0);
    const stagePos = getStandoffPosition(incidentPos, safeHeadingDeg);

    // Waypoints along road network from Gate -> Intermediate Junction -> Standoff Bay
    const midRoad = getNearestRoadPoint(
      new THREE.Vector3((gatePos.x + stagePos.x) / 2, 0.5, (gatePos.z + stagePos.z) / 2)
    );

    const waypoints = [
      gatePos.clone(),
      new THREE.Vector3(gatePos.x * 0.6 + midRoad.x * 0.4, 0.5, gatePos.z * 0.6 + midRoad.z * 0.4),
      midRoad.clone(),
      new THREE.Vector3(midRoad.x * 0.4 + stagePos.x * 0.6, 0.5, midRoad.z * 0.4 + stagePos.z * 0.6),
      stagePos.clone(),
    ];

    const totalDist = gatePos.distanceTo(stagePos);

    return {
      entryGateId: bestGate.id,
      entryGatePos: gatePos,
      stagingBayId: `STAGE-${bestGate.id}`,
      stagingBayPos: stagePos,
      waypoints,
      totalDistanceM: Math.round(totalDist),
      entryHeadingDeg: bestGate.headingDeg,
    };
  };

  // 6. Continuous Route Between Current Physical Position and Next Burning Target
  const findRouteBetween = (
    startPos: THREE.Vector3,
    targetPos: THREE.Vector3,
    safeHeadingDeg = 315
  ): EmergencyRouteResult => {
    const stagePos = getStandoffPosition(targetPos, safeHeadingDeg);

    // Intermediate road junctions between current truck position and destination standoff
    const midRoad = getNearestRoadPoint(
      new THREE.Vector3((startPos.x + stagePos.x) / 2, 0.5, (startPos.z + stagePos.z) / 2)
    );

    const waypoints = [
      startPos.clone(),
      new THREE.Vector3(startPos.x * 0.6 + midRoad.x * 0.4, 0.5, startPos.z * 0.6 + midRoad.z * 0.4),
      midRoad.clone(),
      new THREE.Vector3(midRoad.x * 0.4 + stagePos.x * 0.6, 0.5, midRoad.z * 0.4 + stagePos.z * 0.6),
      stagePos.clone(),
    ];

    const totalDist = startPos.distanceTo(stagePos);

    return {
      entryGateId: 'CURRENT_POSITION',
      entryGatePos: startPos.clone(),
      stagingBayId: `STANDOFF-TARGET`,
      stagingBayPos: stagePos,
      waypoints,
      totalDistanceM: Math.round(totalDist),
      entryHeadingDeg: 0,
    };
  };

  // 7. Route from Current Position Back to Safe Exit Gate
  const findReturnRoute = (
    currentPos: THREE.Vector3,
    safeHeadingDeg: number
  ): EmergencyRouteResult => {
    const activeGates = gates.length > 0
      ? gates
      : [
          { id: 'GATE_NORTH', name: 'NORTH ACCESS GATE', worldPos: { x: 0, z: -150 }, headingDeg: 0, cardinal: 'N' },
          { id: 'GATE_SOUTH', name: 'SOUTH ACCESS GATE', worldPos: { x: 0, z: 150 }, headingDeg: 180, cardinal: 'S' },
        ];

    let bestGate = activeGates[0];
    let minDiff = 999;
    activeGates.forEach((g) => {
      const diff = Math.abs(g.headingDeg - safeHeadingDeg);
      const norm = Math.min(diff, 360 - diff);
      if (norm < minDiff) {
        minDiff = norm;
        bestGate = g;
      }
    });

    const exitGatePos = new THREE.Vector3(bestGate.worldPos.x, 0.5, bestGate.worldPos.z);
    const midRoad = getNearestRoadPoint(
      new THREE.Vector3((currentPos.x + exitGatePos.x) / 2, 0.5, (currentPos.z + exitGatePos.z) / 2)
    );

    const waypoints = [
      currentPos.clone(),
      new THREE.Vector3(currentPos.x * 0.5 + midRoad.x * 0.5, 0.5, currentPos.z * 0.5 + midRoad.z * 0.5),
      midRoad.clone(),
      exitGatePos.clone(),
    ];

    return {
      entryGateId: bestGate.id,
      entryGatePos: exitGatePos,
      stagingBayId: `EXIT-${bestGate.id}`,
      stagingBayPos: exitGatePos,
      waypoints,
      totalDistanceM: Math.round(currentPos.distanceTo(exitGatePos)),
      entryHeadingDeg: bestGate.headingDeg,
    };
  };

  const dispose = () => {
    scene.remove(group);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  };

  return {
    group,
    findEmergencyRoute,
    findRouteBetween,
    findReturnRoute,
    getStandoffPosition,
    dispose,
  };
};
