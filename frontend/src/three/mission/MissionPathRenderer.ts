// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Tactical Mission Path & Ingress Route Visualizer
// Renders active upwind corridors (Green Neon), rejected routes (Red Dashed + ❌),
// and tactical casualty extraction corridors.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { CandidateRouteEvaluation } from '../../simulation/missionTypes';

export interface MissionPathRendererComponents {
  group: THREE.Group;
  updateRoutes: (
    routes: CandidateRouteEvaluation[],
    activeGateId: string,
    safeHeadingDeg: number
  ) => void;
  dispose: () => void;
}

export const createMissionPathRenderer = (scene: THREE.Scene): MissionPathRendererComponents => {
  const group = new THREE.Group();
  scene.add(group);

  // Materials
  const recommendedPathMat = new THREE.MeshBasicMaterial({
    color: 0x10b981, // Emerald Green
    transparent: true,
    opacity: 0.65,
  });

  const rejectedPathMat = new THREE.LineDashedMaterial({
    color: 0xef4444, // Red
    dashSize: 4,
    gapSize: 2.5,
    linewidth: 2,
  });

  let activeRouteMesh: THREE.Mesh | null = null;
  const rejectedLines: THREE.Line[] = [];

  const updateRoutes = (
    routes: CandidateRouteEvaluation[],
    activeGateId: string,
    safeHeadingDeg: number
  ) => {
    // Clear old lines
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
    rejectedLines.length = 0;

    routes.forEach((route) => {
      let startX = 0;
      let startZ = 0;

      if (route.gateId === 'GATE_NORTH') { startX = 0; startZ = -260; }
      else if (route.gateId === 'GATE_SOUTH') { startX = 0; startZ = 260; }
      else if (route.gateId === 'GATE_EAST') { startX = 260; startZ = 0; }
      else if (route.gateId === 'GATE_WEST') { startX = -260; startZ = 0; }

      // Target staging node ~ 78m from center
      const angleRad = (route.headingDeg * Math.PI) / 180;
      const endX = Math.sin(angleRad) * 78;
      const endZ = -Math.cos(angleRad) * 78;

      if (route.status === 'RECOMMENDED') {
        // High-vis glowing green corridor strip
        const curve = new THREE.LineCurve3(
          new THREE.Vector3(startX, 0.4, startZ),
          new THREE.Vector3(endX, 0.4, endZ)
        );
        const tubeGeo = new THREE.TubeGeometry(curve, 24, 2.5, 8, false);
        activeRouteMesh = new THREE.Mesh(tubeGeo, recommendedPathMat);
        group.add(activeRouteMesh);

        // Ground Ingress Chevron Indicators
        for (let i = 0.2; i <= 0.8; i += 0.15) {
          const pt = curve.getPoint(i);
          const chevronGeo = new THREE.ConeGeometry(3.0, 5.0, 3);
          const chevronMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
          const chevron = new THREE.Mesh(chevronGeo, chevronMat);
          chevron.rotation.x = -Math.PI / 2;
          chevron.rotation.z = -angleRad + Math.PI;
          chevron.position.set(pt.x, 0.45, pt.z);
          group.add(chevron);
        }
      } else {
        // Red dashed disqualified line
        const pathGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(startX, 0.35, startZ),
          new THREE.Vector3(endX, 0.35, endZ),
        ]);
        const line = new THREE.Line(pathGeo, rejectedPathMat);
        line.computeLineDistances();
        group.add(line);
        rejectedLines.push(line);

        // 3D ❌ Rejection Marker at Disqualified Gate
        const xGeo1 = new THREE.BoxGeometry(1.2, 0.4, 6.0);
        const xGeo2 = new THREE.BoxGeometry(6.0, 0.4, 1.2);
        const xMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

        const xMesh1 = new THREE.Mesh(xGeo1, xMat);
        const xMesh2 = new THREE.Mesh(xGeo2, xMat);
        xMesh1.rotation.y = Math.PI / 4;
        xMesh2.rotation.y = Math.PI / 4;

        const xGroup = new THREE.Group();
        xGroup.add(xMesh1);
        xGroup.add(xMesh2);
        xGroup.position.set(startX * 0.85, 0.6, startZ * 0.85);
        group.add(xGroup);
      }
    });
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    updateRoutes,
    dispose,
  };
};
