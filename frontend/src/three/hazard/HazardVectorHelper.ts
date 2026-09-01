// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Real-Time Wind & Safe Approach Vector Compass Visualizer
// Renders dual 3D ground arrows originating from Facility A:
// - RED ARROW: Downwind Hazard Propagation Axis
// - GREEN ARROW: Upwind Safe Ingress Corridor Axis (180° opposite)
// With compass dial markings and numeric heading badges.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { getDownwindVector, getSafeApproachVector, getCardinalDirection } from '../utils/coordinateMath';

export interface HazardVectorHelperComponents {
  group: THREE.Group;
  updateWindHeading: (windHeadingDeg: number) => void;
  setVisible: (visible: boolean) => void;
}

export const createHazardVectorHelper = (scene: THREE.Scene, initialWindDeg = 135): HazardVectorHelperComponents => {
  const group = new THREE.Group();
  group.position.set(0, 0.4, 0);

  // 1. Compass Ground Ring
  const ringGeo = new THREE.RingGeometry(48, 50, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x334155,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  group.add(ringMesh);

  // Cardinal Tick Markers (N, E, S, W)
  const ticks = [
    { label: 'N', heading: 0, color: 0x38bdf8 },
    { label: 'E', heading: 90, color: 0x94a3b8 },
    { label: 'S', heading: 180, color: 0x94a3b8 },
    { label: 'W', heading: 270, color: 0x94a3b8 },
  ];

  ticks.forEach(({ heading, color }) => {
    const rad = (heading * Math.PI) / 180;
    const tickGeo = new THREE.BoxGeometry(0.8, 0.2, 4.0);
    const tickMat = new THREE.MeshBasicMaterial({ color });
    const tick = new THREE.Mesh(tickGeo, tickMat);
    tick.position.set(Math.sin(rad) * 49, 0.1, -Math.cos(rad) * 49);
    tick.rotation.y = -rad;
    group.add(tick);
  });

  // 2. Red Downwind / Hazard Propagation Arrow
  const arrowLength = 65;
  const downwindArrow = new THREE.ArrowHelper(
    getDownwindVector(initialWindDeg),
    new THREE.Vector3(0, 0.6, 0),
    arrowLength,
    0xef4444, // Red
    12,
    6
  );
  downwindArrow.line.material = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 3 });
  group.add(downwindArrow);

  // 3. Green Upwind / Safe Approach Corridor Arrow
  const safeApproachArrow = new THREE.ArrowHelper(
    getSafeApproachVector(initialWindDeg),
    new THREE.Vector3(0, 0.6, 0),
    arrowLength,
    0x10b981, // Emerald Green
    12,
    6
  );
  safeApproachArrow.line.material = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });
  group.add(safeApproachArrow);

  const updateWindHeading = (windHeadingDeg: number) => {
    const downwindVec = getDownwindVector(windHeadingDeg);
    const safeVec = getSafeApproachVector(windHeadingDeg);

    downwindArrow.setDirection(downwindVec);
    safeApproachArrow.setDirection(safeVec);
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
  };

  scene.add(group);

  return {
    group,
    updateWindHeading,
    setVisible,
  };
};
