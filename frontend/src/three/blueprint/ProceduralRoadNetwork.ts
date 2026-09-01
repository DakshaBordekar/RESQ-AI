// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Procedural Road Network & Topological Graph Engine
// Builds 3D asphalt roadways and generates an A* road graph for emergency routing
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { FacilityRoad, FacilityGate } from '../../simulation/blueprintTypes';
import { EmergencyRouteResult } from '../environment/RoadNetwork';

export interface ProceduralRoadNetworkComponents {
  group: THREE.Group;
  findEmergencyRoute: (safeHeadingDeg: number, targetPos?: THREE.Vector3) => EmergencyRouteResult;
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
  roads.forEach((road) => {
    const pts = road.points;
    const width = road.widthM || 12.0;

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];

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

  // 3. Find Emergency Route (Closest upwind gate to target standoff staging node)
  const findEmergencyRoute = (
    safeHeadingDeg: number,
    targetPos?: THREE.Vector3
  ): EmergencyRouteResult => {
    // If no gates exist, fallback to default compass cardinal gate
    const activeGates = gates.length > 0
      ? gates
      : [
          { id: 'GATE_NORTH', name: 'NORTH ACCESS GATE', worldPos: { x: 0, z: -150 }, headingDeg: 0, cardinal: 'N' },
          { id: 'GATE_SOUTH', name: 'SOUTH ACCESS GATE', worldPos: { x: 0, z: 150 }, headingDeg: 180, cardinal: 'S' },
          { id: 'GATE_EAST', name: 'EAST ACCESS GATE', worldPos: { x: 150, z: 0 }, headingDeg: 90, cardinal: 'E' },
          { id: 'GATE_WEST', name: 'WEST ACCESS GATE', worldPos: { x: -150, z: 0 }, headingDeg: 270, cardinal: 'W' },
        ];

    // Find best gate closest to safe upwind heading
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

    // Calculate staging standoff position ~65m upwind from incident
    const safeRad = (bestGate.headingDeg * Math.PI) / 180;
    const stagePos = new THREE.Vector3(
      incidentPos.x + Math.sin(safeRad) * 65,
      0.5,
      incidentPos.z - Math.cos(safeRad) * 65
    );

    // Smooth waypoints from gate to staging bay
    const midPos1 = new THREE.Vector3(
      gatePos.x * 0.7 + stagePos.x * 0.3,
      0.5,
      gatePos.z * 0.7 + stagePos.z * 0.3
    );

    const midPos2 = new THREE.Vector3(
      gatePos.x * 0.3 + stagePos.x * 0.7,
      0.5,
      gatePos.z * 0.3 + stagePos.z * 0.7
    );

    const waypoints = [gatePos, midPos1, midPos2, stagePos];
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
    dispose,
  };
};
