// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Volumetric Soft Smoke Plume System
// Soft-edged expanding smoke puffs, buoyancy acceleration, wind drift velocity & turbulence
// (Event-driven emission: active only after incident ignition)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { createSmokePuffTexture } from '../fire/vfxTextures';
import { getDownwindVector } from '../utils/coordinateMath';

export interface DynamicSmokePlumeComponents {
  group: THREE.Group;
  update: (delta: number, time: number) => void;
  setWindParameters: (windSpeedMs: number, windDirectionDeg: number, sourceHeightM?: number) => void;
  setActive: (active: boolean) => void;
  reset: () => void;
}

export const createDynamicSmokePlume = (
  scene: THREE.Scene,
  initialWindSpeedMs = 8.5,
  initialWindDirDeg = 135,
  initialSourceHeightM = 22
): DynamicSmokePlumeComponents => {
  const group = new THREE.Group();

  let windSpeed = initialWindSpeedMs;
  let windDirDeg = initialWindDirDeg;
  let sourceHeight = initialSourceHeightM;
  let isActive = false; // Starts inactive (calm pre-blast state)

  const smokeCount = 450;
  const smokeGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(smokeCount * 3);
  const scales = new Float32Array(smokeCount);
  const lifespans = new Float32Array(smokeCount);
  const maxLifespans = new Float32Array(smokeCount);
  const randomOffsets = new Float32Array(smokeCount * 3);

  const smokeTex = createSmokePuffTexture();

  const resetParticles = () => {
    for (let i = 0; i < smokeCount; i++) {
      maxLifespans[i] = 7.0 + Math.random() * 5.5;
      lifespans[i] = Math.random() * maxLifespans[i];

      randomOffsets[i * 3 + 0] = (Math.random() - 0.5) * 6.0;
      randomOffsets[i * 3 + 1] = Math.random() * 3.0;
      randomOffsets[i * 3 + 2] = (Math.random() - 0.5) * 6.0;

      positions[i * 3 + 0] = randomOffsets[i * 3 + 0];
      positions[i * 3 + 1] = sourceHeight + randomOffsets[i * 3 + 1];
      positions[i * 3 + 2] = randomOffsets[i * 3 + 2];
      scales[i] = 12.0;
    }
  };
  resetParticles();

  smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  smokeGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

  const smokeMat = new THREE.PointsMaterial({
    map: smokeTex,
    size: 34.0,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const smokeMesh = new THREE.Points(smokeGeo, smokeMat);
  smokeMesh.visible = false;
  group.add(smokeMesh);

  const setActive = (active: boolean) => {
    isActive = active;
    smokeMesh.visible = active;
    if (!active) {
      resetParticles();
      const posAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
    }
  };

  const reset = () => {
    setActive(false);
  };

  const setWindParameters = (wSpeedMs: number, wDirDeg: number, sHeightM = sourceHeight) => {
    windSpeed = wSpeedMs;
    windDirDeg = wDirDeg;
    sourceHeight = sHeightM;
  };

  const update = (delta: number, time: number) => {
    if (!isActive) return;

    const downwind = getDownwindVector(windDirDeg);
    const windVx = downwind.x * (windSpeed * 1.8);
    const windVz = downwind.z * (windSpeed * 1.8);

    const posAttr = smokeGeo.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < smokeCount; i++) {
      lifespans[i] += delta;

      if (lifespans[i] >= maxLifespans[i]) {
        lifespans[i] = 0;
        posAttr.setXYZ(
          i,
          randomOffsets[i * 3 + 0],
          sourceHeight + randomOffsets[i * 3 + 1],
          randomOffsets[i * 3 + 2]
        );
      } else {
        const ageT = lifespans[i] / maxLifespans[i];
        const riseSpeed = 16.0 * Math.max(0.2, 1.0 - ageT * 0.7);

        const turbX = Math.sin(time * 2.0 + i) * (2.0 + ageT * 8.0);
        const turbZ = Math.cos(time * 2.0 + i) * (2.0 + ageT * 8.0);

        const px = posAttr.getX(i) + (windVx + turbX) * delta;
        const py = posAttr.getY(i) + riseSpeed * delta;
        const pz = posAttr.getZ(i) + (windVz + turbZ) * delta;

        posAttr.setXYZ(i, px, py, pz);
      }
    }
    posAttr.needsUpdate = true;
  };

  scene.add(group);

  return {
    group,
    update,
    setWindParameters,
    setActive,
    reset,
  };
};
