// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Connected Industrial Road Network & Topological Graph Engine
// Full 3D Road Infrastructure with 4 Major Perimeter Gateways (N, S, E, W),
// Inner Facility Loop, Cross Arterials, Staging Bays, PBR Asphalt, Markings,
// and Dynamic A* Shortest-Path Navigation derived from the Safe Approach Corridor.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export interface RoadGraphNode {
  id: string;
  x: number;
  z: number;
  isGate?: boolean;
  isStagingBay?: boolean;
  headingDeg?: number; // Approximate angle from center
}

export interface RoadGraphEdge {
  from: string;
  to: string;
  weight: number;
}

export interface EmergencyRouteResult {
  entryGateId: string;
  entryGatePos: THREE.Vector3;
  stagingBayId: string;
  stagingBayPos: THREE.Vector3;
  waypoints: THREE.Vector3[];
  totalDistanceM: number;
  entryHeadingDeg: number;
}

export interface RoadNetworkComponents {
  group: THREE.Group;
  findEmergencyRoute: (safeHeadingDeg: number) => EmergencyRouteResult;
  getGraphNodes: () => RoadGraphNode[];
}

export const createRoadNetwork = (scene: THREE.Scene): RoadNetworkComponents => {
  const group = new THREE.Group();

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PBR ROAD MATERIALS
  // ──────────────────────────────────────────────────────────────────────────
  const asphaltMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b, // Dark industrial asphalt
    roughness: 0.35, // Semi-reflective road
    metalness: 0.25,
  });

  const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const whiteEdgeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const concreteCurbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
  const gateGuardhouseMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.5 });
  const gateRoofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 });
  const barrierBarrierMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. 3D ROAD SEGMENT BUILDERS
  // ──────────────────────────────────────────────────────────────────────────
  const roadWidth = 14.0; // Standard 2-lane industrial heavy transport road

  const createRoadSegment = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    hasCenterStripe = true
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    const roadGeo = new THREE.PlaneGeometry(roadWidth, length);
    const roadMesh = new THREE.Mesh(roadGeo, asphaltMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.rotation.z = -angle;
    roadMesh.position.set(midX, 0.04, midZ);
    roadMesh.receiveShadow = true;
    group.add(roadMesh);

    // Concrete Shoulder Curbs (Left & Right)
    for (let side of [-1, 1]) {
      const curbGeo = new THREE.BoxGeometry(0.8, 0.35, length);
      const curbMesh = new THREE.Mesh(curbGeo, concreteCurbMat);
      curbMesh.rotation.y = angle;
      const offsetX = -Math.cos(angle) * (side * (roadWidth / 2 + 0.4));
      const offsetZ = Math.sin(angle) * (side * (roadWidth / 2 + 0.4));
      curbMesh.position.set(midX + offsetX, 0.18, midZ + offsetZ);
      curbMesh.castShadow = true;
      curbMesh.receiveShadow = true;
      group.add(curbMesh);
    }

    // Yellow Dashed Center Line
    if (hasCenterStripe && length > 18) {
      const numDashes = Math.floor(length / 16);
      for (let i = 0; i < numDashes; i++) {
        const t = (i + 0.5) / numDashes;
        const stripeX = x1 + dx * t;
        const stripeZ = z1 + dz * t;
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 7.0), yellowStripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.rotation.z = -angle;
        stripe.position.set(stripeX, 0.06, stripeZ);
        group.add(stripe);
      }
    }

    // Solid White Edge Lines
    for (let side of [-1, 1]) {
      const edgeGeo = new THREE.PlaneGeometry(0.35, length);
      const edgeMesh = new THREE.Mesh(edgeGeo, whiteEdgeMat);
      edgeMesh.rotation.x = -Math.PI / 2;
      edgeMesh.rotation.z = -angle;
      const offsetX = -Math.cos(angle) * (side * (roadWidth / 2 - 0.8));
      const offsetZ = Math.sin(angle) * (side * (roadWidth / 2 - 0.8));
      edgeMesh.position.set(midX + offsetX, 0.05, midZ + offsetZ);
      group.add(edgeMesh);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 3. TOPOLOGICAL ROAD GRAPH (Nodes & Weighted Edges)
  // ──────────────────────────────────────────────────────────────────────────
  const graphNodes: RoadGraphNode[] = [
    // 4 Primary Outer Perimeter Gateways
    { id: 'GATE_NORTH', x: 0, z: -260, isGate: true, headingDeg: 0 },
    { id: 'GATE_SOUTH', x: 0, z: 260, isGate: true, headingDeg: 180 },
    { id: 'GATE_EAST', x: 260, z: 0, isGate: true, headingDeg: 90 },
    { id: 'GATE_WEST', x: -260, z: 0, isGate: true, headingDeg: 270 },

    // 4 Diagonal Outer Perimeter Corners
    { id: 'CORNER_NW', x: -200, z: -200, headingDeg: 315 },
    { id: 'CORNER_NE', x: 200, z: -200, headingDeg: 45 },
    { id: 'CORNER_SW', x: -200, z: 200, headingDeg: 225 },
    { id: 'CORNER_SE', x: 200, z: 200, headingDeg: 135 },

    // Outer Perimeter Midpoints
    { id: 'OUTER_N_MID', x: 0, z: -200, headingDeg: 0 },
    { id: 'OUTER_S_MID', x: 0, z: 200, headingDeg: 180 },
    { id: 'OUTER_E_MID', x: 200, z: 0, headingDeg: 90 },
    { id: 'OUTER_W_MID', x: -200, z: 0, headingDeg: 270 },

    // Inner Facility Loop Junctions (Surrounding Tank Pad at x = ±65, z = ±65)
    { id: 'INNER_NW', x: -65, z: -65, headingDeg: 315 },
    { id: 'INNER_NE', x: 65, z: -65, headingDeg: 45 },
    { id: 'INNER_SW', x: -65, z: 65, headingDeg: 225 },
    { id: 'INNER_SE', x: 65, z: 65, headingDeg: 135 },

    // Intermediate Mid-Ring Arterial Junctions
    { id: 'MID_NORTH', x: 0, z: -125, headingDeg: 0 },
    { id: 'MID_SOUTH', x: 0, z: 125, headingDeg: 180 },
    { id: 'MID_EAST', x: 125, z: 0, headingDeg: 90 },
    { id: 'MID_WEST', x: -125, z: 0, headingDeg: 270 },

    // Dedicated Safe Staging Bays outside Zone 1 (at ~78m standoff)
    { id: 'STAGE_NORTH', x: 0, z: -78, isStagingBay: true, headingDeg: 0 },
    { id: 'STAGE_SOUTH', x: 0, z: 78, isStagingBay: true, headingDeg: 180 },
    { id: 'STAGE_EAST', x: 78, z: 0, isStagingBay: true, headingDeg: 90 },
    { id: 'STAGE_WEST', x: -78, z: 0, isStagingBay: true, headingDeg: 270 },
    { id: 'STAGE_NW', x: -55, z: -55, isStagingBay: true, headingDeg: 315 },
    { id: 'STAGE_NE', x: 55, z: -55, isStagingBay: true, headingDeg: 45 },
    { id: 'STAGE_SW', x: -55, z: 55, isStagingBay: true, headingDeg: 225 },
    { id: 'STAGE_SE', x: 55, z: 55, isStagingBay: true, headingDeg: 135 },
  ];

  const nodeMap = new Map<string, RoadGraphNode>();
  graphNodes.forEach((n) => nodeMap.set(n.id, n));

  const edges: RoadGraphEdge[] = [];

  const addEdge = (fromId: string, toId: string) => {
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (!from || !to) return;
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const weight = Math.sqrt(dx * dx + dz * dz);
    edges.push({ from: fromId, to: toId, weight });
    edges.push({ from: toId, to: fromId, weight });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ROAD GRAPH TOPOLOGY & GEOMETRY GENERATION
  // ──────────────────────────────────────────────────────────────────────────
  // Gateway Approaches
  addEdge('GATE_NORTH', 'OUTER_N_MID');
  createRoadSegment(0, -260, 0, -200);

  addEdge('GATE_SOUTH', 'OUTER_S_MID');
  createRoadSegment(0, 260, 0, 200);

  addEdge('GATE_EAST', 'OUTER_E_MID');
  createRoadSegment(260, 0, 200, 0);

  addEdge('GATE_WEST', 'OUTER_W_MID');
  createRoadSegment(-260, 0, -200, 0);

  // Outer Perimeter Ring Road
  addEdge('CORNER_NW', 'OUTER_N_MID');
  createRoadSegment(-200, -200, 0, -200);

  addEdge('OUTER_N_MID', 'CORNER_NE');
  createRoadSegment(0, -200, 200, -200);

  addEdge('CORNER_NE', 'OUTER_E_MID');
  createRoadSegment(200, -200, 200, 0);

  addEdge('OUTER_E_MID', 'CORNER_SE');
  createRoadSegment(200, 0, 200, 200);

  addEdge('CORNER_SE', 'OUTER_S_MID');
  createRoadSegment(200, 200, 0, 200);

  addEdge('OUTER_S_MID', 'CORNER_SW');
  createRoadSegment(0, 200, -200, 200);

  addEdge('CORNER_SW', 'OUTER_W_MID');
  createRoadSegment(-200, 200, -200, 0);

  addEdge('OUTER_W_MID', 'CORNER_NW');
  createRoadSegment(-200, 0, -200, -200);

  // Radial Connecting Arterials (Outer -> Mid -> Inner)
  addEdge('OUTER_N_MID', 'MID_NORTH');
  createRoadSegment(0, -200, 0, -125);

  addEdge('MID_NORTH', 'STAGE_NORTH');
  createRoadSegment(0, -125, 0, -78);

  addEdge('OUTER_S_MID', 'MID_SOUTH');
  createRoadSegment(0, 200, 0, 125);

  addEdge('MID_SOUTH', 'STAGE_SOUTH');
  createRoadSegment(0, 125, 0, 78);

  addEdge('OUTER_E_MID', 'MID_EAST');
  createRoadSegment(200, 0, 125, 0);

  addEdge('MID_EAST', 'STAGE_EAST');
  createRoadSegment(125, 0, 78, 0);

  addEdge('OUTER_W_MID', 'MID_WEST');
  createRoadSegment(-200, 0, -125, 0);

  addEdge('MID_WEST', 'STAGE_WEST');
  createRoadSegment(-125, 0, -78, 0);

  // Diagonal Arterials (Corner -> Inner)
  addEdge('CORNER_NW', 'INNER_NW');
  createRoadSegment(-200, -200, -65, -65);

  addEdge('CORNER_NE', 'INNER_NE');
  createRoadSegment(200, -200, 65, -65);

  addEdge('CORNER_SW', 'INNER_SW');
  createRoadSegment(-200, 200, -65, 65);

  addEdge('CORNER_SE', 'INNER_SE');
  createRoadSegment(200, 200, 65, 65);

  // Inner Ring Loop Road (Encircling Central Tank Pad)
  addEdge('INNER_NW', 'STAGE_NORTH');
  createRoadSegment(-65, -65, 0, -78);

  addEdge('STAGE_NORTH', 'INNER_NE');
  createRoadSegment(0, -78, 65, -65);

  addEdge('INNER_NE', 'STAGE_EAST');
  createRoadSegment(65, -65, 78, 0);

  addEdge('STAGE_EAST', 'INNER_SE');
  createRoadSegment(78, 0, 65, 65);

  addEdge('INNER_SE', 'STAGE_SOUTH');
  createRoadSegment(65, 65, 0, 78);

  addEdge('STAGE_SOUTH', 'INNER_SW');
  createRoadSegment(0, 78, -65, 65);

  addEdge('INNER_SW', 'STAGE_WEST');
  createRoadSegment(-65, 65, -78, 0);

  addEdge('STAGE_WEST', 'INNER_NW');
  createRoadSegment(-78, 0, -65, -65);

  // Diagonal Staging Bay Links
  addEdge('INNER_NW', 'STAGE_NW');
  addEdge('INNER_NE', 'STAGE_NE');
  addEdge('INNER_SW', 'STAGE_SW');
  addEdge('INNER_SE', 'STAGE_SE');

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PERIMETER SECURITY GATE CHECKPOINTS & BARRIERS
  // ──────────────────────────────────────────────────────────────────────────
  const gates = [
    { id: 'GATE_NORTH', x: 0, z: -260, rot: 0, name: 'NORTH ACCESS GATE' },
    { id: 'GATE_SOUTH', x: 0, z: 260, rot: Math.PI, name: 'SOUTH ACCESS GATE' },
    { id: 'GATE_EAST', x: 260, z: 0, rot: -Math.PI / 2, name: 'EAST ACCESS GATE' },
    { id: 'GATE_WEST', x: -260, z: 0, rot: Math.PI / 2, name: 'WEST ACCESS GATE' },
  ];

  gates.forEach(({ x, z, rot }) => {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(x, 0, z);
    gateGroup.rotation.y = rot;

    // Guardhouse
    const guardhouse = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 4.5), gateGuardhouseMat);
    guardhouse.position.set(10.5, 1.75, 0);
    guardhouse.castShadow = true;
    gateGroup.add(guardhouse);

    const ghRoof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 5.2), gateRoofMat);
    ghRoof.position.set(10.5, 3.8, 0);
    gateGroup.add(ghRoof);

    // Security Gate Barrier Arm
    const barrierArm = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.35, 0.35), barrierBarrierMat);
    barrierArm.position.set(0, 1.2, 0);
    gateGroup.add(barrierArm);

    // Safety Bollards
    for (let bx of [-8.5, 8.5]) {
      const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.4, 8), barrierBarrierMat);
      bollard.position.set(bx, 0.7, 0);
      gateGroup.add(bollard);
    }

    group.add(gateGroup);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. A* SHORTEST-PATH PATHFINDING ALGORITHM
  // ──────────────────────────────────────────────────────────────────────────
  const findPath = (startId: string, goalId: string): THREE.Vector3[] => {
    const openSet = new Set<string>([startId]);
    const cameFrom = new Map<string, string>();

    const gScore = new Map<string, number>();
    gScore.set(startId, 0);

    const fScore = new Map<string, number>();
    const startNode = nodeMap.get(startId)!;
    const goalNode = nodeMap.get(goalId)!;

    const heuristic = (idA: string, idB: string): number => {
      const a = nodeMap.get(idA)!;
      const b = nodeMap.get(idB)!;
      return Math.hypot(a.x - b.x, a.z - b.z);
    };

    fScore.set(startId, heuristic(startId, goalId));

    while (openSet.size > 0) {
      // Find node in openSet with lowest fScore
      let current: string | null = null;
      let lowestF = Infinity;
      for (const id of openSet) {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          current = id;
        }
      }

      if (!current) break;
      if (current === goalId) {
        // Reconstruct path
        const path: THREE.Vector3[] = [];
        let curr: string | undefined = current;
        while (curr) {
          const n = nodeMap.get(curr)!;
          path.unshift(new THREE.Vector3(n.x, 0, n.z));
          curr = cameFrom.get(curr);
        }
        return path;
      }

      openSet.delete(current);

      // Inspect neighbors
      const neighborEdges = edges.filter((e) => e.from === current);
      for (const edge of neighborEdges) {
        const neighbor = edge.to;
        const tentativeG = (gScore.get(current) ?? Infinity) + edge.weight;

        if (tentativeG < (gScore.get(neighbor) ?? Infinity)) {
          cameFrom.set(neighbor, current);
          gScore.set(neighbor, tentativeG);
          fScore.set(neighbor, tentativeG + heuristic(neighbor, goalId));
          openSet.add(neighbor);
        }
      }
    }

    // Fallback: direct line if disconnected
    return [
      new THREE.Vector3(startNode.x, 0, startNode.z),
      new THREE.Vector3(goalNode.x, 0, goalNode.z),
    ];
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 7. DYNAMIC WIND-DEPENDENT ROUTE SELECTOR
  // ──────────────────────────────────────────────────────────────────────────
  const findEmergencyRoute = (safeHeadingDeg: number): EmergencyRouteResult => {
    const normAngle = ((safeHeadingDeg % 360) + 360) % 360;

    // 1. Select the entry gate closest to the upwind safe corridor
    const gateNodes = graphNodes.filter((n) => n.isGate);
    let bestGate = gateNodes[0];
    let minGateDiff = Infinity;

    gateNodes.forEach((gate) => {
      let diff = Math.abs(gate.headingDeg! - normAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff < minGateDiff) {
        minGateDiff = diff;
        bestGate = gate;
      }
    });

    // 2. Select the optimal safe staging bay closest to the safe corridor
    const stagingNodes = graphNodes.filter((n) => n.isStagingBay);
    let bestStaging = stagingNodes[0];
    let minStageDiff = Infinity;

    stagingNodes.forEach((stage) => {
      let diff = Math.abs(stage.headingDeg! - normAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff < minStageDiff) {
        minStageDiff = diff;
        bestStaging = stage;
      }
    });

    // 3. Compute A* road path from Gate to Staging Bay
    const waypoints = findPath(bestGate.id, bestStaging.id);

    let totalDist = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDist += waypoints[i].distanceTo(waypoints[i + 1]);
    }

    return {
      entryGateId: bestGate.id,
      entryGatePos: new THREE.Vector3(bestGate.x, 0, bestGate.z),
      stagingBayId: bestStaging.id,
      stagingBayPos: new THREE.Vector3(bestStaging.x, 0, bestStaging.z),
      waypoints,
      totalDistanceM: Math.round(totalDist),
      entryHeadingDeg: bestGate.headingDeg!,
    };
  };

  scene.add(group);

  return {
    group,
    findEmergencyRoute,
    getGraphNodes: () => graphNodes,
  };
};
