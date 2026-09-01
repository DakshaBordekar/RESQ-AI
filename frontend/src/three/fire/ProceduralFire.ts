// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 AAA-Grade Procedural Multi-Layer Fire VFX Engine
// Procedural Multi-Layer Flame Stack: White Core, Yellow Core, Turbulent Orange Body,
// Licking Flame Tongues, Soft GPU Embers, and Flickering Firelight (Zero Artifacts / Zero Cones)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { createEmberTexture } from './vfxTextures';
import { getDownwindVector } from '../utils/coordinateMath';

export interface ProceduralFireComponents {
  group: THREE.Group;
  update: (delta: number, time: number) => void;
  setFlameParameters: (heightM: number, tiltDeg: number, windDirDeg: number, windSpeedMs: number) => void;
  setVisible: (visible: boolean) => void;
  setIntensity: (intensity: number) => void;
}

export const createProceduralFire = (
  scene: THREE.Scene,
  initialFlameHeightM = 45,
  initialFlameTiltDeg = 25,
  initialWindDirDeg = 135,
  initialWindSpeedMs = 8.5
): ProceduralFireComponents => {
  const group = new THREE.Group();

  let flameHeight = initialFlameHeightM;
  let flameTilt = initialFlameTiltDeg;
  let windDir = initialWindDirDeg;
  let windSpeed = initialWindSpeedMs;
  let currentIntensity = 1.0;

  const tiltRad = (flameTilt * Math.PI) / 180;
  let downwindDir = getDownwindVector(windDir);

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 1: WHITE-HOT RADIANT CORE
  // ──────────────────────────────────────────────────────────────────────────
  const coreGeo = new THREE.SphereGeometry(3.5, 32, 32);
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        vNormal = normal;
        vPos = position;
        vec3 pos = position + normal * (sin(position.y * 5.0 + time * 8.0) * 0.25);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vNormal;
      varying vec3 vPos;
      void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        vec3 color = mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.9, 0.4), intensity);
        gl_FragColor = vec4(color * 2.5, 0.95);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.position.set(0, 3.5, 0);
  group.add(coreMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 2: YELLOW FLAME CORE
  // ──────────────────────────────────────────────────────────────────────────
  const yellowGeo = new THREE.ConeGeometry(5.5, flameHeight * 0.45, 32, 16, true);
  const yellowMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      windVec: { value: downwindDir.clone().multiplyScalar(Math.sin(tiltRad) * 0.4) },
    },
    vertexShader: `
      uniform float time;
      uniform vec3 windVec;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        vUv = uv;
        vPosition = position;
        float h = uv.y;
        vec3 pos = position;
        pos.x += sin(pos.y * 0.8 + time * 9.0) * (0.4 + h * 1.5) + windVec.x * h * 8.0;
        pos.z += cos(pos.y * 0.8 + time * 9.0) * (0.4 + h * 1.5) + windVec.z * h * 8.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vPosition;
      void main() {
        float h = vUv.y;
        vec3 col = mix(vec3(1.0, 0.95, 0.5), vec3(1.0, 0.6, 0.0), h);
        float alpha = (1.0 - h) * 0.85;
        gl_FragColor = vec4(col * 2.0, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const yellowMesh = new THREE.Mesh(yellowGeo, yellowMat);
  yellowMesh.position.set(0, (flameHeight * 0.45) / 2, 0);
  group.add(yellowMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 3: TURBULENT ORANGE MAIN FLAME BODY
  // ──────────────────────────────────────────────────────────────────────────
  const flameGeo = new THREE.ConeGeometry(8.5, flameHeight, 48, 32, true);
  const flameMat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      windVec: { value: downwindDir.clone().multiplyScalar(Math.sin(tiltRad)) },
    },
    vertexShader: `
      uniform float time;
      uniform vec3 windVec;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        float h = uv.y;
        vec3 pos = position;

        float lowFreq = sin(pos.y * 0.3 + time * 4.0) * 1.8;
        float medFreq = cos(pos.y * 0.8 + pos.x * 0.5 + time * 7.5) * 1.2;
        float highFreq = sin(pos.x * 2.0 + pos.z * 2.0 + time * 12.0) * 0.6;

        pos.x += (lowFreq + medFreq + highFreq) * h + windVec.x * h * 16.0;
        pos.z += (lowFreq + medFreq + highFreq) * h + windVec.z * h * 16.0;

        vWorldNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        float h = vUv.y;
        float flicker = 0.85 + 0.15 * sin(time * 18.0 + h * 10.0);

        vec3 colCore = vec3(1.0, 0.65, 0.1);
        vec3 colRim = vec3(0.9, 0.15, 0.05);
        vec3 colSmoke = vec3(0.25, 0.05, 0.02);

        vec3 finalCol = mix(colCore, colRim, smoothstep(0.1, 0.7, h));
        if (h > 0.75) {
          finalCol = mix(finalCol, colSmoke, (h - 0.75) / 0.25);
        }

        float alpha = (1.0 - pow(h, 1.4)) * 0.75 * flicker;
        gl_FragColor = vec4(finalCol * 2.2, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const flameMesh = new THREE.Mesh(flameGeo, flameMat);
  flameMesh.position.set(0, flameHeight / 2, 0);
  group.add(flameMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 4: INDEPENDENT LICKING FLAME TONGUES (4 Off-Center Flares)
  // ──────────────────────────────────────────────────────────────────────────
  const tongueMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const tongueGeo = new THREE.ConeGeometry(3.2, flameHeight * 0.8, 16, 16, true);
    const tongueMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        offset: { value: i * 1.57 },
        windVec: { value: downwindDir.clone().multiplyScalar(Math.sin(tiltRad)) },
      },
      vertexShader: `
        uniform float time;
        uniform float offset;
        uniform vec3 windVec;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          float h = uv.y;
          vec3 pos = position;
          pos.x += sin(pos.y * 0.6 + time * 6.0 + offset) * (1.2 + h * 2.5) + windVec.x * h * 18.0;
          pos.z += cos(pos.y * 0.6 + time * 6.0 + offset) * (1.2 + h * 2.5) + windVec.z * h * 18.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float h = vUv.y;
          vec3 col = mix(vec3(1.0, 0.5, 0.05), vec3(0.85, 0.1, 0.0), h);
          float alpha = (1.0 - h) * 0.55;
          gl_FragColor = vec4(col * 1.8, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const tongueMesh = new THREE.Mesh(tongueGeo, tongueMat);
    const radOffset = (i * Math.PI) / 2;
    tongueMesh.position.set(Math.cos(radOffset) * 2.5, (flameHeight * 0.8) / 2, Math.sin(radOffset) * 2.5);
    group.add(tongueMesh);
    tongueMeshes.push(tongueMesh);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 5: SOFT GLOWING WIND-DRIFTING EMBERS
  // ──────────────────────────────────────────────────────────────────────────
  const emberCount = 280;
  const emberGeo = new THREE.BufferGeometry();
  const emberPositions = new Float32Array(emberCount * 3);
  const emberScales = new Float32Array(emberCount);
  const emberLife = new Float32Array(emberCount);
  const emberMaxLife = new Float32Array(emberCount);
  const emberVelocity = new Float32Array(emberCount * 3);

  const emberTex = createEmberTexture();

  for (let i = 0; i < emberCount; i++) {
    const spawnRad = Math.random() * 6.5;
    const spawnAngle = Math.random() * Math.PI * 2;
    emberPositions[i * 3 + 0] = Math.cos(spawnAngle) * spawnRad;
    emberPositions[i * 3 + 1] = Math.random() * (flameHeight * 0.6);
    emberPositions[i * 3 + 2] = Math.sin(spawnAngle) * spawnRad;

    emberScales[i] = 1.4 + Math.random() * 2.2;
    emberMaxLife[i] = 1.8 + Math.random() * 3.2;
    emberLife[i] = Math.random() * emberMaxLife[i];

    emberVelocity[i * 3 + 0] = (Math.random() - 0.5) * 3.5;
    emberVelocity[i * 3 + 1] = 8.0 + Math.random() * 16.0;
    emberVelocity[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
  }

  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  emberGeo.setAttribute('scale', new THREE.BufferAttribute(emberScales, 1));

  const emberMat = new THREE.PointsMaterial({
    map: emberTex,
    size: 3.2,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const emberMesh = new THREE.Points(emberGeo, emberMat);
  group.add(emberMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // LAYER 6: DYNAMIC MULTI-HARMONIC FLICKERING FIRELIGHT
  // ──────────────────────────────────────────────────────────────────────────
  const fireLight = new THREE.PointLight(0xf97316, 8.5, 320, 1.2);
  fireLight.position.set(0, flameHeight * 0.4, 0);
  fireLight.castShadow = true;
  fireLight.shadow.bias = -0.0004;
  fireLight.shadow.mapSize.width = 1024;
  fireLight.shadow.mapSize.height = 1024;
  group.add(fireLight);

  const setFlameParameters = (hM: number, tDeg: number, wDirDeg: number, wSpeedMs: number) => {
    flameHeight = hM;
    flameTilt = tDeg;
    windDir = wDirDeg;
    windSpeed = wSpeedMs;

    const tRad = (flameTilt * Math.PI) / 180;
    downwindDir = getDownwindVector(windDir);

    flameMat.uniforms.windVec.value = downwindDir.clone().multiplyScalar(Math.sin(tRad));
    yellowMat.uniforms.windVec.value = downwindDir.clone().multiplyScalar(Math.sin(tRad) * 0.5);
    tongueMeshes.forEach((tm) => {
      (tm.material as THREE.ShaderMaterial).uniforms.windVec.value = downwindDir.clone().multiplyScalar(Math.sin(tRad));
    });
  };

  const setVisible = (visible: boolean) => {
    group.visible = visible;
    fireLight.intensity = visible ? 8.5 * currentIntensity : 0;
  };

  const setIntensity = (intensity: number) => {
    currentIntensity = intensity;
    if (group.visible) {
      fireLight.intensity = 8.5 * intensity;
    }
  };

  const update = (delta: number, time: number) => {
    if (!group.visible) return;

    coreMat.uniforms.time.value = time;
    yellowMat.uniforms.time.value = time;
    flameMat.uniforms.time.value = time;
    tongueMeshes.forEach((tm) => {
      (tm.material as THREE.ShaderMaterial).uniforms.time.value = time;
    });

    const f1 = Math.sin(time * 14.0) * 0.25;
    const f2 = Math.sin(time * 28.0) * 0.15;
    const f3 = Math.cos(time * 7.0) * 0.1;
    fireLight.intensity = 8.5 * currentIntensity * (1.0 + f1 + f2 + f3);

    const downwind = getDownwindVector(windDir);
    const windVx = downwind.x * (windSpeed * 1.2);
    const windVz = downwind.z * (windSpeed * 1.2);

    const posAttr = emberGeo.getAttribute('position') as THREE.BufferAttribute;

    for (let i = 0; i < emberCount; i++) {
      emberLife[i] += delta;

      if (emberLife[i] >= emberMaxLife[i]) {
        emberLife[i] = 0;
        const spawnRad = Math.random() * 6.5;
        const spawnAngle = Math.random() * Math.PI * 2;
        posAttr.setXYZ(
          i,
          Math.cos(spawnAngle) * spawnRad,
          Math.random() * 4.0,
          Math.sin(spawnAngle) * spawnRad
        );
      } else {
        const px = posAttr.getX(i) + (emberVelocity[i * 3 + 0] + windVx) * delta;
        const py = posAttr.getY(i) + emberVelocity[i * 3 + 1] * delta;
        const pz = posAttr.getZ(i) + (emberVelocity[i * 3 + 2] + windVz) * delta;
        posAttr.setXYZ(i, px, py, pz);
      }
    }
    posAttr.needsUpdate = true;
  };

  scene.add(group);

  return {
    group,
    update,
    setFlameParameters,
    setVisible,
    setIntensity,
  };
};
