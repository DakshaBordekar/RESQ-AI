// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Cinematic BLEVE Explosion & Shockwave VFX Engine
// 7-Phase Timeline: IDLE -> THERMAL_STRESS -> CRITICAL_EXPANSION -> BLAST_IGNITION
// -> FIREBALL_PEAK -> SHOCKWAVE_PROPAGATION -> DEBRIS_COLLAPSE -> AFTERMATH
// (Zero unrendered artifacts / spark points hidden in IDLE)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { BlevePhase } from '../../simulation/types';
import { createSparkTexture } from './vfxTextures';

export interface BleveSystemComponents {
  group: THREE.Group;
  triggerBleve: (fireballRadiusM?: number) => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  reset: () => void;
  update: (delta: number) => void;
  getPhase: () => BlevePhase;
  isPaused: () => boolean;
  getBlastWaveRadius: () => number;
  getCameraShakeIntensity: () => number;
  getDamageFactorAt: (position: THREE.Vector3) => number;
}

export const createBleveExplosion = (
  scene: THREE.Scene,
  onPhaseChange?: (phase: BlevePhase) => void
): BleveSystemComponents => {
  const group = new THREE.Group();

  let phase: BlevePhase = 'IDLE';
  let elapsed = 0;
  let maxRadius = 120;
  let blastWaveRadius = 0;
  let cameraShake = 0;
  let paused = false;

  // 1. High-Intensity Explosive Light Flash
  const flashLight = new THREE.PointLight(0xffedd5, 0, 950, 1.1);
  flashLight.position.set(0, 25, 0);
  group.add(flashLight);

  // 2. Layer A: Inner Supersonic White-Hot Core
  const innerCoreGeo = new THREE.SphereGeometry(1, 32, 32);
  const innerCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
  innerCoreMesh.position.set(0, 18, 0);
  innerCoreMesh.visible = false;
  group.add(innerCoreMesh);

  // 3. Layer B: Main Turbulent Fireball with Noise Displacement Shader
  const fireballGeo = new THREE.SphereGeometry(1, 48, 48);
  const fireballMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      progress: { value: 0 },
      coreColor: { value: new THREE.Color(0xfff7ed) },
      flameColor: { value: new THREE.Color(0xf97316) },
      smokeColor: { value: new THREE.Color(0x7f1d1d) },
    },
    vertexShader: `
      uniform float time;
      uniform float progress;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vNormal = normal;
        vPosition = position;
        float displacement = sin(position.x * 3.5 + time * 6.0) * cos(position.y * 3.5 + time * 6.0) * (0.18 + progress * 0.12);
        vec3 newPos = position + normal * displacement;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform float progress;
      uniform vec3 coreColor;
      uniform vec3 flameColor;
      uniform vec3 smokeColor;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        float h = vUv.y;
        vec3 col = mix(flameColor, smokeColor, h * 0.8 + progress * 0.4);
        if (progress < 0.4) {
          col = mix(coreColor, col, (progress / 0.4));
        }
        float alpha = clamp((1.0 - progress * 1.1) * 0.95, 0.0, 1.0);
        gl_FragColor = vec4(col * 1.8, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fireballMesh = new THREE.Mesh(fireballGeo, fireballMat);
  fireballMesh.position.set(0, 18, 0);
  fireballMesh.visible = false;
  group.add(fireballMesh);

  // 4. Concentric Expanding Blast Shockwave Rings
  const shockwaveGeo1 = new THREE.RingGeometry(0.5, 4.5, 64);
  const shockwaveMat1 = new THREE.MeshBasicMaterial({
    color: 0xfca5a5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const shockwaveMesh1 = new THREE.Mesh(shockwaveGeo1, shockwaveMat1);
  shockwaveMesh1.rotation.x = -Math.PI / 2;
  shockwaveMesh1.position.set(0, 0.8, 0);
  shockwaveMesh1.visible = false;
  group.add(shockwaveMesh1);

  const shockwaveGeo2 = new THREE.RingGeometry(0.5, 2.8, 64);
  const shockwaveMat2 = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const shockwaveMesh2 = new THREE.Mesh(shockwaveGeo2, shockwaveMat2);
  shockwaveMesh2.rotation.x = -Math.PI / 2;
  shockwaveMesh2.position.set(0, 1.0, 0);
  shockwaveMesh2.visible = false;
  group.add(shockwaveMesh2);

  // 5. Ballistic High-Velocity Spark Streaks
  const sparkCount = 350;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(sparkCount * 3);
  const sparkVelocities = new Float32Array(sparkCount * 3);

  const sparkTex = createSparkTexture();

  for (let i = 0; i < sparkCount; i++) {
    sparkPositions[i * 3 + 0] = 0;
    sparkPositions[i * 3 + 1] = 18;
    sparkPositions[i * 3 + 2] = 0;

    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 55;
    const upSpeed = 15 + Math.random() * 50;
    sparkVelocities[i * 3 + 0] = Math.cos(angle) * speed;
    sparkVelocities[i * 3 + 1] = upSpeed;
    sparkVelocities[i * 3 + 2] = Math.sin(angle) * speed;
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));

  const sparkMat = new THREE.PointsMaterial({
    map: sparkTex,
    size: 4.5,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparkMesh = new THREE.Points(sparkGeo, sparkMat);
  sparkMesh.visible = false; // Hidden in IDLE!
  group.add(sparkMesh);

  // Ground Scorch Decal
  const scorchGeo = new THREE.CircleGeometry(48, 32);
  const scorchMat = new THREE.MeshBasicMaterial({
    color: 0x09090b,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scorchMesh = new THREE.Mesh(scorchGeo, scorchMat);
  scorchMesh.rotation.x = -Math.PI / 2;
  scorchMesh.position.set(0, 0.4, 0);
  scorchMesh.visible = false;
  group.add(scorchMesh);

  const setPhaseInternal = (newPhase: BlevePhase) => {
    if (phase !== newPhase) {
      phase = newPhase;
      if (onPhaseChange) onPhaseChange(newPhase);
    }
  };

  const triggerBleve = (fireballRadiusM = 120) => {
    if (phase !== 'IDLE' && phase !== 'AFTERMATH') return;
    maxRadius = fireballRadiusM;
    elapsed = 0;
    blastWaveRadius = 0;
    paused = false;
    setPhaseInternal('THERMAL_STRESS');
  };

  const pause = () => {
    paused = true;
  };

  const resume = () => {
    paused = false;
  };

  const reset = () => {
    setPhaseInternal('IDLE');
    elapsed = 0;
    blastWaveRadius = 0;
    paused = false;
    cameraShake = 0;

    innerCoreMesh.visible = false;
    innerCoreMesh.scale.set(1, 1, 1);
    innerCoreMat.opacity = 0;

    fireballMesh.visible = false;
    fireballMesh.scale.set(1, 1, 1);
    fireballMat.uniforms.progress.value = 0;

    shockwaveMesh1.visible = false;
    shockwaveMesh2.visible = false;
    shockwaveMat1.opacity = 0;
    shockwaveMat2.opacity = 0;

    sparkMesh.visible = false;
    sparkMat.opacity = 0;

    scorchMesh.visible = false;
    scorchMat.opacity = 0;
    flashLight.intensity = 0;

    const posAttr = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < sparkCount; i++) {
      posAttr.setXYZ(i, 0, 18, 0);
    }
    posAttr.needsUpdate = true;
  };

  const replay = () => {
    reset();
    triggerBleve(maxRadius);
  };

  const update = (delta: number) => {
    if (phase === 'IDLE' || paused) return;

    elapsed += delta;
    fireballMat.uniforms.time.value += delta;

    if (elapsed < 1.5) {
      // 1. THERMAL STRESS (0.0s - 1.5s)
      setPhaseInternal('THERMAL_STRESS');
      flashLight.intensity = Math.sin(elapsed * 8.0) * 0.8;
      blastWaveRadius = 0;
      cameraShake = 0;
      sparkMesh.visible = false;
    } else if (elapsed < 2.5) {
      // 2. CRITICAL EXPANSION (1.5s - 2.5s)
      setPhaseInternal('CRITICAL_EXPANSION');
      const heatT = (elapsed - 1.5) / 1.0;
      flashLight.intensity = 2.0 + heatT * 8.0;
      blastWaveRadius = 0;
      cameraShake = heatT * 0.15;
      sparkMesh.visible = false;
    } else if (elapsed < 4.0) {
      // 3. BLAST IGNITION & RAPID FIREBALL BLOOM (2.5s - 4.0s)
      setPhaseInternal('BLAST_IGNITION');
      innerCoreMesh.visible = true;
      fireballMesh.visible = true;
      sparkMesh.visible = true;

      const expT = (elapsed - 2.5) / 1.5;
      const easeExp = 1 - Math.pow(1 - expT, 3);
      const currentR = Math.max(2, maxRadius * easeExp);

      fireballMesh.scale.set(currentR, currentR, currentR);
      fireballMesh.position.y = 18 + easeExp * (maxRadius * 0.25);
      fireballMat.uniforms.progress.value = expT * 0.4;

      innerCoreMesh.scale.set(currentR * 0.55, currentR * 0.55, currentR * 0.55);
      innerCoreMat.opacity = Math.max(0, (1 - expT) * 0.9);

      blastWaveRadius = maxRadius * 0.8 * easeExp;

      if (elapsed < 3.0) {
        flashLight.intensity = (1 - (elapsed - 2.5) / 0.5) * 45.0;
      } else {
        flashLight.intensity = Math.max(3, (1 - (elapsed - 3.0) / 1.0) * 16.0);
      }

      // Ballistic Sparks
      sparkMat.opacity = Math.min(1.0, expT * 2.0);
      const posAttr = sparkGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < sparkCount; i++) {
        const vx = sparkVelocities[i * 3 + 0];
        const vy = sparkVelocities[i * 3 + 1];
        const vz = sparkVelocities[i * 3 + 2];
        const px = posAttr.getX(i) + vx * delta;
        const py = Math.max(0.5, posAttr.getY(i) + vy * delta);
        const pz = posAttr.getZ(i) + vz * delta;
        sparkVelocities[i * 3 + 1] -= 22 * delta;
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;

      cameraShake = 0.45;
    } else if (elapsed < 4.8) {
      // 4. FIREBALL PEAK (4.0s - 4.8s)
      setPhaseInternal('FIREBALL_PEAK');
      fireballMesh.scale.set(maxRadius, maxRadius, maxRadius);
      fireballMat.uniforms.progress.value = 0.45;
      flashLight.intensity = 5.5;
      blastWaveRadius = maxRadius * 1.3;
      cameraShake = 0.25;
      sparkMesh.visible = true;
    } else if (elapsed < 5.5) {
      // 5. SHOCKWAVE PROPAGATION (4.8s - 5.5s)
      setPhaseInternal('SHOCKWAVE_PROPAGATION');
      shockwaveMesh1.visible = true;
      shockwaveMesh2.visible = true;
      scorchMesh.visible = true;
      sparkMesh.visible = true;

      const waveT = (elapsed - 4.8) / 0.7;
      const shockR1 = maxRadius * 2.6 * Math.pow(waveT, 0.6);
      shockwaveMesh1.scale.set(shockR1, shockR1, shockR1);
      shockwaveMat1.opacity = Math.max(0, (1 - waveT) * 0.9);

      blastWaveRadius = shockR1;

      if (waveT > 0.15) {
        const shockR2 = maxRadius * 2.0 * Math.pow(waveT - 0.15, 0.6);
        shockwaveMesh2.scale.set(shockR2, shockR2, shockR2);
        shockwaveMat2.opacity = Math.max(0, (1 - (waveT - 0.15)) * 0.75);
      }

      cameraShake = Math.max(0, (1 - waveT) * 0.85);
      scorchMat.opacity = Math.min(0.85, waveT * 0.85);
    } else if (elapsed < 7.0) {
      // 6. DEBRIS & COLLAPSE AFTERMATH TRANSITION (5.5s - 7.0s)
      setPhaseInternal('DEBRIS_COLLAPSE');
      const fadeT = (elapsed - 5.5) / 1.5;

      const riseR = maxRadius * (1.0 + fadeT * 0.2);
      fireballMesh.scale.set(riseR, riseR * 1.15, riseR);
      fireballMesh.position.y = 18 + (maxRadius * 0.25) + fadeT * 45;
      fireballMat.uniforms.progress.value = 0.45 + fadeT * 0.55;

      blastWaveRadius = maxRadius * 2.6;

      innerCoreMesh.visible = false;
      shockwaveMesh1.visible = false;
      shockwaveMesh2.visible = false;

      sparkMat.opacity = Math.max(0, (1 - fadeT) * 0.8);
      flashLight.intensity = Math.max(0, (1 - fadeT) * 2.0);
      cameraShake = Math.max(0, (1 - fadeT) * 0.1);
      scorchMat.opacity = 0.85;
      scorchMesh.visible = true;
    } else {
      // 7. AFTERMATH (7.0s+ - Deterministic Permanent Stop)
      if (phase !== 'AFTERMATH') {
        setPhaseInternal('AFTERMATH');
      }
      fireballMesh.visible = false;
      innerCoreMesh.visible = false;
      shockwaveMesh1.visible = false;
      shockwaveMesh2.visible = false;
      sparkMesh.visible = false;
      flashLight.intensity = 0.8;
      blastWaveRadius = maxRadius * 2.6;
      cameraShake = 0;
      scorchMat.opacity = 0.85;
      scorchMesh.visible = true;
    }
  };

  const getDamageFactorAt = (position: THREE.Vector3): number => {
    if (phase === 'IDLE' || phase === 'THERMAL_STRESS' || phase === 'CRITICAL_EXPANSION') {
      return 0;
    }
    const dist = new THREE.Vector2(position.x, position.z).length();
    const maxDamageRadius = 180;
    return 1 - THREE.MathUtils.clamp(dist / maxDamageRadius, 0, 1);
  };

  scene.add(group);

  return {
    group,
    triggerBleve,
    pause,
    resume,
    replay,
    reset,
    update,
    getPhase: () => phase,
    isPaused: () => paused,
    getBlastWaveRadius: () => blastWaveRadius,
    getCameraShakeIntensity: () => cameraShake,
    getDamageFactorAt,
  };
};
