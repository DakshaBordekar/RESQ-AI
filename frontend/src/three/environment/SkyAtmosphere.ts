// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Sky & Atmospheric Lighting System
// Realistic Day, Dusk, and Night modes with dynamic atmosphere shaders,
// directional sun/moonlight, ambient fill, and optimized fog density
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { LightingMode } from '../../simulation/types';

export interface SkyAtmosphereComponents {
  skyDome: THREE.Mesh;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  hemiLight: THREE.HemisphereLight;
  setLightingMode: (mode: LightingMode) => void;
  updateSunPosition: (windDirDeg: number) => void;
}

export const createSkyAtmosphere = (
  scene: THREE.Scene,
  initialLighting: LightingMode = 'DAY'
): SkyAtmosphereComponents => {
  // 1. Scene Fog (balanced density so structures remain legible at all distances)
  const fogColor = new THREE.Color(0x334155);
  scene.fog = new THREE.FogExp2(fogColor, 0.0018);
  scene.background = fogColor;

  // 2. Procedural Gradient Sky Dome
  const skyRadius = 900;
  const skyGeo = new THREE.SphereGeometry(skyRadius, 32, 32);

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x1e293b) },
      bottomColor: { value: new THREE.Color(0x475569) },
      offset: { value: 30 },
      exponent: { value: 0.6 },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // 3. Ambient & Hemisphere Light
  const ambientLight = new THREE.AmbientLight(0x94a3b8, 1.3);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0x94a3b8, 0x334155, 1.0);
  hemiLight.position.set(0, 300, 0);
  scene.add(hemiLight);

  // 4. Directional Sun Light with soft shadows
  const sunLight = new THREE.DirectionalLight(0xfef08a, 2.5);
  sunLight.position.set(160, 280, 140);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 800;
  const d = 260;
  sunLight.shadow.camera.left = -d;
  sunLight.shadow.camera.right = d;
  sunLight.shadow.camera.top = d;
  sunLight.shadow.camera.bottom = -d;
  sunLight.shadow.bias = -0.0004;
  scene.add(sunLight);

  let currentMode: LightingMode = initialLighting;

  const setLightingMode = (mode: LightingMode) => {
    currentMode = mode;
    if (mode === 'DAY') {
      // Overcast industrial daylight
      skyMat.uniforms.topColor.value.set(0x1e293b);
      skyMat.uniforms.bottomColor.value.set(0x475569);
      if (scene.fog) (scene.fog as THREE.FogExp2).color.set(0x334155);
      scene.background = new THREE.Color(0x334155);

      ambientLight.color.set(0x94a3b8);
      ambientLight.intensity = 1.4;
      hemiLight.intensity = 1.1;
      sunLight.color.set(0xfef08a);
      sunLight.intensity = 2.5;
      sunLight.position.set(160, 280, 140);
    } else if (mode === 'DUSK') {
      // Golden hour / amber emergency sunset
      skyMat.uniforms.topColor.value.set(0x0f172a);
      skyMat.uniforms.bottomColor.value.set(0x9a3412);
      if (scene.fog) (scene.fog as THREE.FogExp2).color.set(0x431407);
      scene.background = new THREE.Color(0x431407);

      ambientLight.color.set(0xf97316);
      ambientLight.intensity = 1.1;
      hemiLight.intensity = 0.85;
      sunLight.color.set(0xfb923c);
      sunLight.intensity = 1.9;
      sunLight.position.set(160, 95, 140);
    } else if (mode === 'NIGHT') {
      // Tactical dark night with crisp dimensional moonlight
      skyMat.uniforms.topColor.value.set(0x020617);
      skyMat.uniforms.bottomColor.value.set(0x0f172a);
      if (scene.fog) (scene.fog as THREE.FogExp2).color.set(0x090d16);
      scene.background = new THREE.Color(0x090d16);

      ambientLight.color.set(0x64748b);
      ambientLight.intensity = 1.0; // Clear ambient fill so building geometry is distinct
      hemiLight.intensity = 0.85;
      sunLight.color.set(0x93c5fd); // Cool crisp moonlight
      sunLight.intensity = 1.5;
      sunLight.position.set(120, 180, 120);
    }
  };

  setLightingMode(initialLighting);

  const updateSunPosition = (windDirDeg: number) => {
    if (currentMode === 'NIGHT') return;
    const rad = ((windDirDeg + 60) * Math.PI) / 180;
    const elevation = currentMode === 'DUSK' ? 70 : 260;
    sunLight.position.set(200 * Math.sin(rad), elevation, 200 * Math.cos(rad));
  };

  return {
    skyDome,
    sunLight,
    ambientLight,
    hemiLight,
    setLightingMode,
    updateSunPosition,
  };
};
