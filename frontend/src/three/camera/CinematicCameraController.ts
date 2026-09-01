// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Cinematic Camera Controller & Advanced Interaction Engine
// Natural Orbit / Pan / Smooth Zoom, Double-Click Object Focus,
// 7 Cinematic Presets, Tank Hero Continuous Turntable Orbit & Blast Camera Shake
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { CameraPerspective } from '../../simulation/types';

export interface CameraControllerComponents {
  camera: THREE.PerspectiveCamera;
  setPerspective: (mode: CameraPerspective) => void;
  getPerspective: () => CameraPerspective;
  focusOnTarget: (targetPos: THREE.Vector3, distanceM?: number) => void;
  resetView: () => void;
  update: (delta: number, shakeIntensity?: number, windDirDeg?: number) => void;
  isTransitioning: () => boolean;
  handleResize: (width: number, height: number) => void;
  dispose: () => void;
}

export const createCinematicCameraController = (
  container: HTMLElement,
  initialMode: CameraPerspective = 'COMMAND'
): CameraControllerComponents => {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 3000);

  // Initial dive transition start (aerial overview)
  camera.position.set(0, 340, 400);
  const currentLookAt = new THREE.Vector3(0, 16, 0);
  camera.lookAt(currentLookAt);

  let currentMode: CameraPerspective = initialMode;
  let inTransition = true;
  let transitionProgress = 0;

  // Spherical Coordinates & Orbit Target
  const targetLookAt = new THREE.Vector3(0, 16, 0);
  const targetCamPos = new THREE.Vector3(0, 105, 210);

  // Orbit State
  let isOrbiting = false;
  let isPanning = false;
  let prevMouseX = 0;
  let prevMouseY = 0;

  // Orbit angles (Spherical coordinates around targetLookAt)
  let spherical = new THREE.Spherical(235, Math.PI / 3.2, 0);
  const minDistance = 12.0;
  const maxDistance = 500.0;
  const minPolarAngle = 0.05;
  const maxPolarAngle = Math.PI / 2 - 0.02; // Keep above ground

  // Tank Hero turntable orbit angle
  let heroOrbitAngle = 0;

  // Sync initial spherical from default target position
  const syncSphericalFromTarget = () => {
    const offset = targetCamPos.clone().sub(targetLookAt);
    spherical.setFromVector3(offset);
  };
  syncSphericalFromTarget();

  // Pointer Interaction Handlers
  const onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) {
      isOrbiting = true;
      isPanning = false;
    } else if (e.button === 2 || e.button === 1) {
      isPanning = true;
      isOrbiting = false;
    }
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isOrbiting && !isPanning) return;
    const dx = e.clientX - prevMouseX;
    const dy = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    if (isOrbiting) {
      if (currentMode === 'TANK_HERO') currentMode = 'COMMAND';

      spherical.theta -= dx * 0.005;
      spherical.phi -= dy * 0.005;
      spherical.phi = Math.max(minPolarAngle, Math.min(maxPolarAngle, spherical.phi));

      const offset = new THREE.Vector3().setFromSpherical(spherical);
      targetCamPos.copy(targetLookAt).add(offset);
    } else if (isPanning) {
      const panSpeed = spherical.radius * 0.0012;
      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

      const panDelta = camRight
        .clone()
        .multiplyScalar(-dx * panSpeed)
        .add(camUp.clone().multiplyScalar(dy * panSpeed));
      panDelta.y = Math.max(-targetLookAt.y + 1, panDelta.y);

      targetLookAt.add(panDelta);
      targetCamPos.add(panDelta);
    }
  };

  const onMouseUp = () => {
    isOrbiting = false;
    isPanning = false;
  };

  const onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  // Smooth Zoom (Mouse Wheel & Trackpad Pinch)
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = Math.pow(0.95, -e.deltaY * 0.02);
    spherical.radius = Math.max(minDistance, Math.min(maxDistance, spherical.radius * zoomFactor));

    if (spherical.radius < 50) {
      spherical.phi = Math.min(maxPolarAngle - 0.05, Math.PI / 2.3);
    }

    const offset = new THREE.Vector3().setFromSpherical(spherical);
    targetCamPos.copy(targetLookAt).add(offset);
  };

  container.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  container.addEventListener('contextmenu', onContextMenu);
  container.addEventListener('wheel', onWheel, { passive: false });

  // WASD Key state for Street View
  const keysPressed: Record<string, boolean> = {};
  const onKeyDown = (e: KeyboardEvent) => {
    keysPressed[e.key.toLowerCase()] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keysPressed[e.key.toLowerCase()] = false;
  };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  const focusOnTarget = (targetPos: THREE.Vector3, distanceM = 38) => {
    targetLookAt.copy(targetPos);
    spherical.radius = distanceM;
    spherical.phi = Math.PI / 2.8;
    const offset = new THREE.Vector3().setFromSpherical(spherical);
    targetCamPos.copy(targetLookAt).add(offset);
  };

  const resetView = () => {
    setPerspective('COMMAND');
  };

  const computePresetTarget = (mode: CameraPerspective, windDirDeg = 135) => {
    switch (mode) {
      case 'COMMAND':
        targetLookAt.set(0, 15, 0);
        spherical.set(230, Math.PI / 3.2, 0);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'FACILITY':
        targetLookAt.set(0, 14, 0);
        spherical.set(85, Math.PI / 2.8, Math.PI / 4);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'HAZARD': {
        const rad = (windDirDeg * Math.PI) / 180;
        targetLookAt.set(-40 * Math.sin(rad), 15, -40 * Math.cos(rad));
        spherical.set(260, Math.PI / 3.5, rad);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      }
      case 'THERMAL':
        targetLookAt.set(0, 22, 0);
        spherical.set(70, Math.PI / 2.6, Math.PI / 6);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'BLAST':
        targetLookAt.set(0, 10, 0);
        spherical.set(160, Math.PI / 3.0, -Math.PI / 3);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'STREET':
        targetLookAt.set(0, 8, 0);
        spherical.set(38, Math.PI / 2.1, Math.PI / 2);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'TANK_HERO':
        targetLookAt.set(0, 16, 0);
        spherical.set(52, Math.PI / 2.5, heroOrbitAngle);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      case 'FIRE_BRIGADE': {
        const safeAngleRad = ((windDirDeg + 180) * Math.PI) / 180;
        const truckStagingPos = new THREE.Vector3(
          Math.sin(safeAngleRad) * 78,
          6,
          -Math.cos(safeAngleRad) * 78
        );
        targetLookAt.copy(truckStagingPos);
        spherical.set(48, Math.PI / 2.6, safeAngleRad + Math.PI * 0.25);
        targetCamPos.copy(targetLookAt).add(new THREE.Vector3().setFromSpherical(spherical));
        break;
      }
    }
  };

  const setPerspective = (mode: CameraPerspective) => {
    currentMode = mode;
    computePresetTarget(mode);
  };

  const update = (delta: number, shakeIntensity = 0, windDirDeg = 135) => {
    // 1. Initial Dive Transition
    if (inTransition) {
      transitionProgress += delta * 0.45;
      if (transitionProgress >= 1.0) {
        inTransition = false;
      }
      computePresetTarget('COMMAND', windDirDeg);
      camera.position.lerp(targetCamPos, 0.045);
      currentLookAt.lerp(targetLookAt, 0.045);
      camera.lookAt(currentLookAt);
      return;
    }

    // 2. Tank Hero Continuous Cinematic Orbit
    if (currentMode === 'TANK_HERO') {
      heroOrbitAngle += delta * 0.18;
      computePresetTarget('TANK_HERO');
    }

    // 3. WASD keyboard navigation in Street mode
    if (currentMode === 'STREET') {
      const moveSpeed = 35 * delta;
      if (keysPressed['w'] || keysPressed['arrowup']) {
        targetLookAt.z -= moveSpeed;
        targetCamPos.z -= moveSpeed;
      }
      if (keysPressed['s'] || keysPressed['arrowdown']) {
        targetLookAt.z += moveSpeed;
        targetCamPos.z += moveSpeed;
      }
      if (keysPressed['a'] || keysPressed['arrowleft']) {
        targetLookAt.x -= moveSpeed;
        targetCamPos.x -= moveSpeed;
      }
      if (keysPressed['d'] || keysPressed['arrowright']) {
        targetLookAt.x += moveSpeed;
        targetCamPos.x += moveSpeed;
      }
    }

    camera.position.lerp(targetCamPos, 0.055);
    currentLookAt.lerp(targetLookAt, 0.055);

    // 4. Subtle High-Frequency Camera Shake during Blast Shockwave
    if (shakeIntensity > 0.01) {
      const shakeX = (Math.random() - 0.5) * shakeIntensity * 4.5;
      const shakeY = (Math.random() - 0.5) * shakeIntensity * 3.0;
      const shakeZ = (Math.random() - 0.5) * shakeIntensity * 4.5;
      camera.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
    }

    camera.lookAt(currentLookAt);
  };

  const handleResize = (w: number, h: number) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  const dispose = () => {
    container.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    container.removeEventListener('contextmenu', onContextMenu);
    container.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };

  return {
    camera,
    setPerspective,
    getPerspective: () => currentMode,
    focusOnTarget,
    resetView,
    update,
    isTransitioning: () => inTransition,
    handleResize,
    dispose,
  };
};
