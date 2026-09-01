// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Real-Time Hazard Raycast Inspector
// Projects mouse coordinates onto terrain and evaluates spatial physics values
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { ThreatCalculateParams, SpatialProbePoint } from '../../simulation/types';
import { evaluateSpatialFieldPoint } from '../../simulation/spatialField';

export interface HazardInspectorComponents {
  cursorMarker: THREE.Group;
  handlePointerMove: (e: MouseEvent, container: HTMLElement, camera: THREE.Camera) => SpatialProbePoint | null;
  dispose: () => void;
}

export const createHazardInspector = (
  scene: THREE.Scene,
  getParams: () => ThreatCalculateParams
): HazardInspectorComponents => {
  const cursorMarker = new THREE.Group();

  // Target reticle ring
  const ringGeo = new THREE.RingGeometry(1.4, 1.8, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.25;
  cursorMarker.add(ring);

  // Crosshairs
  const crossMat = new THREE.LineBasicMaterial({ color: 0x22d3ee });
  const crossPts = [
    new THREE.Vector3(-3, 0.25, 0),
    new THREE.Vector3(3, 0.25, 0),
    new THREE.Vector3(0, 0.25, -3),
    new THREE.Vector3(0, 0.25, 3),
  ];
  const crossGeo = new THREE.BufferGeometry().setFromPoints(crossPts);
  const cross = new THREE.LineSegments(crossGeo, crossMat);
  cursorMarker.add(cross);

  cursorMarker.visible = false;
  scene.add(cursorMarker);

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersectPoint = new THREE.Vector3();

  const handlePointerMove = (
    e: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): SpatialProbePoint | null => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, intersectPoint);

    if (hit) {
      cursorMarker.position.set(intersectPoint.x, 0.2, intersectPoint.z);
      cursorMarker.visible = true;

      const params = getParams();
      return evaluateSpatialFieldPoint(intersectPoint.x, intersectPoint.z, params);
    } else {
      cursorMarker.visible = false;
      return null;
    }
  };

  const dispose = () => {
    scene.remove(cursorMarker);
  };

  return {
    cursorMarker,
    handlePointerMove,
    dispose,
  };
};
