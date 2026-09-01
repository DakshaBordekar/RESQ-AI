// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Ambient Wind Particle Flow Vector Field
// Luminous tracer streaks showing ambient wind flow across the operational site
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export interface WindParticlesComponents {
  points: THREE.Points;
  update: (delta: number) => void;
  setWindParameters: (speedMs: number, directionDeg: number) => void;
}

export const createWindParticles = (
  scene: THREE.Scene,
  initialWindSpeed = 8.5,
  initialWindDir = 135
): WindParticlesComponents => {
  const count = 600;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);

  let windSpeed = initialWindSpeed;
  let windDir = initialWindDir;
  const bounds = 350;

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * bounds * 2;
    positions[i * 3 + 1] = 2.0 + Math.random() * 45;
    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x38bdf8, // Luminous cyan
    size: 1.8,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const setWindParameters = (speedMs: number, directionDeg: number) => {
    windSpeed = speedMs;
    windDir = directionDeg;
  };

  const update = (delta: number) => {
    const posArr = geometry.attributes.position.array as Float32Array;
    const windRad = (windDir * Math.PI) / 180;
    const vx = -Math.sin(windRad) * (windSpeed * 4.0 + 8.0);
    const vz = -Math.cos(windRad) * (windSpeed * 4.0 + 8.0);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      posArr[idx] += vx * delta;
      posArr[idx + 2] += vz * delta;

      // Wrap around bounds
      if (posArr[idx] > bounds) posArr[idx] = -bounds;
      if (posArr[idx] < -bounds) posArr[idx] = bounds;
      if (posArr[idx + 2] > bounds) posArr[idx + 2] = -bounds;
      if (posArr[idx + 2] < -bounds) posArr[idx + 2] = bounds;
    }

    geometry.attributes.position.needsUpdate = true;
  };

  return {
    points,
    update,
    setWindParameters,
  };
};
