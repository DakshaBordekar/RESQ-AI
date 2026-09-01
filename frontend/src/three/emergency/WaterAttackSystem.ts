// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 High-Performance Firefighting Water Attack & Steam VFX Engine
// Zero per-frame memory allocations, shader-driven laminar flow, pooled particles
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { createSmokePuffTexture } from '../fire/vfxTextures';
import { getDownwindVector } from '../utils/coordinateMath';

export interface WaterAttackComponents {
  group: THREE.Group;
  startAttack: (nozzlePos: THREE.Vector3, targetPos: THREE.Vector3) => void;
  stopAttack: () => void;
  update: (
    delta: number,
    time: number,
    nozzlePos: THREE.Vector3,
    targetPos: THREE.Vector3,
    windDirDeg: number,
    windSpeedMs: number
  ) => void;
  getSuppressionProgress: () => number;
  isAttacking: () => boolean;
  reset: () => void;
}

export const createWaterAttackSystem = (scene: THREE.Scene): WaterAttackComponents => {
  const group = new THREE.Group();
  group.visible = false;

  let active = false;
  let suppressionProgress = 0;
  const suppressionRate = 0.12; // ~8.3 seconds for full suppression

  // Cached positions to avoid rebuilding curve if endpoints have not moved
  let lastNozzlePos = new THREE.Vector3(-999, -999, -999);
  let lastTargetPos = new THREE.Vector3(-999, -999, -999);
  let lastWindDir = -999;
  let lastWindSpeed = -999;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BALLISTIC LAMINAR JET STREAM TUBE
  // ──────────────────────────────────────────────────────────────────────────
  const streamSegments = 24;
  const initialCurvePoints: THREE.Vector3[] = [];
  for (let i = 0; i <= streamSegments; i++) {
    initialCurvePoints.push(new THREE.Vector3(0, 0, 0));
  }
  let curve = new THREE.CatmullRomCurve3(initialCurvePoints);
  let streamGeo = new THREE.TubeGeometry(curve, 28, 0.45, 8, false);

  const streamMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      void main() {
        float flow = sin(vUv.x * 40.0 - time * 35.0) * 0.15;
        float core = 1.0 - abs(vUv.y - 0.5) * 2.0;
        vec3 col = mix(vec3(0.6, 0.85, 1.0), vec3(0.9, 0.98, 1.0), core + flow);
        float alpha = clamp((core * 0.75 + flow * 0.25) * (1.0 - vUv.x * 0.3), 0.0, 0.85);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const streamMesh = new THREE.Mesh(streamGeo, streamMat);
  group.add(streamMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRESSURIZED SPRAY DROPLET PARTICLES (Pre-allocated pool)
  // ──────────────────────────────────────────────────────────────────────────
  const sprayCount = 300;
  const sprayGeo = new THREE.BufferGeometry();
  const sprayPositions = new Float32Array(sprayCount * 3);
  const sprayProgress = new Float32Array(sprayCount);
  const sprayOffsets = new Float32Array(sprayCount * 3);

  for (let i = 0; i < sprayCount; i++) {
    sprayProgress[i] = Math.random();
    sprayOffsets[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
    sprayOffsets[i * 3 + 1] = (Math.random() - 0.5) * 1.5;
    sprayOffsets[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }

  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPositions, 3));

  const sprayMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 2.2,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const sprayMesh = new THREE.Points(sprayGeo, sprayMat);
  group.add(sprayMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. LOCALIZED BILLOWING IMPACT STEAM (Pre-allocated pool)
  // ──────────────────────────────────────────────────────────────────────────
  const steamCount = 200;
  const steamGeo = new THREE.BufferGeometry();
  const steamPositions = new Float32Array(steamCount * 3);
  const steamVelocities = new Float32Array(steamCount * 3);
  const steamLifespans = new Float32Array(steamCount);
  const steamMaxLives = new Float32Array(steamCount);

  const steamTex = createSmokePuffTexture();

  for (let i = 0; i < steamCount; i++) {
    steamMaxLives[i] = 2.2 + Math.random() * 1.8;
    steamLifespans[i] = Math.random() * steamMaxLives[i];
    steamPositions[i * 3 + 0] = 0;
    steamPositions[i * 3 + 1] = 6;
    steamPositions[i * 3 + 2] = 0;

    steamVelocities[i * 3 + 0] = (Math.random() - 0.5) * 7.0;
    steamVelocities[i * 3 + 1] = 5.0 + Math.random() * 10.0;
    steamVelocities[i * 3 + 2] = (Math.random() - 0.5) * 7.0;
  }

  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));

  const steamMat = new THREE.PointsMaterial({
    map: steamTex,
    size: 20.0,
    transparent: true,
    opacity: 0.6,
    blending: THREE.NormalBlending,
    depthWrite: false,
  });

  const steamMesh = new THREE.Points(steamGeo, steamMat);
  group.add(steamMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. IMPACT GROUND SPLASH
  // ──────────────────────────────────────────────────────────────────────────
  const splashGeo = new THREE.RingGeometry(1, 8, 24);
  const splashMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  });
  const splashMesh = new THREE.Mesh(splashGeo, splashMat);
  splashMesh.rotation.x = -Math.PI / 2;
  splashMesh.position.set(0, 0.7, 0);
  group.add(splashMesh);

  const rebuildArcGeometry = (
    nozzlePos: THREE.Vector3,
    targetPos: THREE.Vector3,
    windDirDeg: number,
    windSpeedMs: number
  ) => {
    const arcPoints: THREE.Vector3[] = [];
    const apexHeight = Math.max(nozzlePos.y, targetPos.y) + 12.0;

    const downwind = getDownwindVector(windDirDeg);
    const windDrift = new THREE.Vector3(downwind.x, 0, downwind.z).multiplyScalar(windSpeedMs * 0.15);

    for (let i = 0; i <= streamSegments; i++) {
      const t = i / streamSegments;
      const pt = new THREE.Vector3().lerpVectors(nozzlePos, targetPos, t);
      pt.y += Math.sin(t * Math.PI) * (apexHeight - nozzlePos.y);
      pt.addScaledVector(windDrift, Math.sin(t * Math.PI));
      arcPoints.push(pt);
    }

    curve = new THREE.CatmullRomCurve3(arcPoints);
    streamMesh.geometry.dispose();
    streamMesh.geometry = new THREE.TubeGeometry(curve, 28, 0.45, 8, false);

    lastNozzlePos.copy(nozzlePos);
    lastTargetPos.copy(targetPos);
    lastWindDir = windDirDeg;
    lastWindSpeed = windSpeedMs;
  };

  const startAttack = (nozzlePos: THREE.Vector3, targetPos: THREE.Vector3) => {
    active = true;
    group.visible = true;
    rebuildArcGeometry(nozzlePos, targetPos, 135, 8.5);
  };

  const stopAttack = () => {
    active = false;
    group.visible = false;
  };

  // Reusable dummy vector to avoid runtime GC allocations
  const tempCurvePoint = new THREE.Vector3();

  const update = (
    delta: number,
    time: number,
    nozzlePos: THREE.Vector3,
    targetPos: THREE.Vector3,
    windDirDeg: number,
    windSpeedMs: number
  ) => {
    if (!active) return;

    streamMat.uniforms.time.value = time;

    // 1. Progressively increase fire suppression
    if (suppressionProgress < 1.0) {
      suppressionProgress = Math.min(1.0, suppressionProgress + suppressionRate * delta);
    }

    // 2. Only rebuild curve geometry if endpoints or wind have significantly changed
    if (
      nozzlePos.distanceToSquared(lastNozzlePos) > 0.05 ||
      targetPos.distanceToSquared(lastTargetPos) > 0.05 ||
      Math.abs(windDirDeg - lastWindDir) > 1.0 ||
      Math.abs(windSpeedMs - lastWindSpeed) > 0.5
    ) {
      rebuildArcGeometry(nozzlePos, targetPos, windDirDeg, windSpeedMs);
    }

    // 3. Update Pressurized Droplet Envelope (Zero allocations in loop)
    const sprayPosAttr = sprayGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < sprayCount; i++) {
      sprayProgress[i] += delta * 2.8;
      if (sprayProgress[i] > 1.0) sprayProgress[i] -= 1.0;

      const t = sprayProgress[i];
      curve.getPoint(t, tempCurvePoint);
      const spread = t * 2.5;

      sprayPosAttr.setXYZ(
        i,
        tempCurvePoint.x + sprayOffsets[i * 3 + 0] * spread,
        tempCurvePoint.y + sprayOffsets[i * 3 + 1] * spread,
        tempCurvePoint.z + sprayOffsets[i * 3 + 2] * spread
      );
    }
    sprayPosAttr.needsUpdate = true;

    // 4. Update Billowing Impact Steam Clouds
    const steamPosAttr = steamGeo.getAttribute('position') as THREE.BufferAttribute;
    const downwind = getDownwindVector(windDirDeg);
    const windVx = downwind.x * (windSpeedMs * 0.8);
    const windVz = downwind.z * (windSpeedMs * 0.8);

    for (let i = 0; i < steamCount; i++) {
      steamLifespans[i] += delta;
      if (steamLifespans[i] >= steamMaxLives[i]) {
        steamLifespans[i] = 0;
        steamPosAttr.setXYZ(
          i,
          targetPos.x + (Math.random() - 0.5) * 6,
          targetPos.y + (Math.random() - 0.5) * 3,
          targetPos.z + (Math.random() - 0.5) * 6
        );
      } else {
        const px = steamPosAttr.getX(i) + (steamVelocities[i * 3 + 0] + windVx) * delta;
        const py = steamPosAttr.getY(i) + steamVelocities[i * 3 + 1] * delta;
        const pz = steamPosAttr.getZ(i) + (steamVelocities[i * 3 + 2] + windVz) * delta;
        steamPosAttr.setXYZ(i, px, py, pz);
      }
    }
    steamPosAttr.needsUpdate = true;

    // 5. Ground splash animation
    const splashPulse = 1.0 + Math.sin(time * 18.0) * 0.2;
    splashMesh.scale.set(splashPulse, splashPulse, splashPulse);
  };

  const reset = () => {
    active = false;
    group.visible = false;
    suppressionProgress = 0;
    lastNozzlePos.set(-999, -999, -999);
  };

  scene.add(group);

  return {
    group,
    startAttack,
    stopAttack,
    update,
    getSuppressionProgress: () => suppressionProgress,
    isAttacking: () => active,
    reset,
  };
};
