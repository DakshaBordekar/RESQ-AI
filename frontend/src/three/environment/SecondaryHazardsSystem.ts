// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Secondary Industrial Hazards & Facility Emergency Sirens
// Staged post-incident environmental reactions:
// - Pressure relief steam jets venting from damaged overhead pipe manifolds
// - Rotating red industrial emergency beacons on control buildings and warehouses
// - Electrical conduit arcing flashes near damaged utility areas
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { createSmokePuffTexture } from '../fire/vfxTextures';

export interface SecondaryHazardsComponents {
  group: THREE.Group;
  triggerHazards: () => void;
  update: (delta: number, time: number) => void;
  reset: () => void;
}

export const createSecondaryHazardsSystem = (scene: THREE.Scene): SecondaryHazardsComponents => {
  const group = new THREE.Group();
  let isActive = false;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ROTATING FACILITY EMERGENCY SIREN BEACONS
  // ──────────────────────────────────────────────────────────────────────────
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const beaconPositions = [
    new THREE.Vector3(-95, 11.5, -95), // Control Room Roof
    new THREE.Vector3(60, 14.5, -95),  // Warehouse A Roof
    new THREE.Vector3(125, 16.5, -135),// Warehouse B Roof
    new THREE.Vector3(-150, 6.5, -35), // LPG Bullet Farm Perimeter
  ];

  const beaconLights: THREE.PointLight[] = [];
  const beaconMeshes: THREE.Mesh[] = [];

  beaconPositions.forEach((pos) => {
    const beaconGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12);
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.copy(pos);
    group.add(beaconMesh);
    beaconMeshes.push(beaconMesh);

    const light = new THREE.PointLight(0xef4444, 0, 32, 1.8);
    light.position.copy(pos).add(new THREE.Vector3(0, 0.4, 0));
    group.add(light);
    beaconLights.push(light);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PRESSURE RELIEF STEAM JETS (From Damaged Overhead Pipe Bridges)
  // ──────────────────────────────────────────────────────────────────────────
  const steamTex = createSmokePuffTexture();
  const steamCount = 80;
  const steamGeo = new THREE.BufferGeometry();
  const steamPositions = new Float32Array(steamCount * 3);
  const steamLifespans = new Float32Array(steamCount);
  const steamMaxLives = new Float32Array(steamCount);

  for (let i = 0; i < steamCount; i++) {
    steamMaxLives[i] = 1.2 + Math.random() * 0.8;
    steamLifespans[i] = Math.random() * steamMaxLives[i];
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPositions, 3));

  const steamMat = new THREE.PointsMaterial({
    map: steamTex,
    color: 0xf8fafc,
    size: 9.0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const steamMesh = new THREE.Points(steamGeo, steamMat);
  steamMesh.visible = false;
  group.add(steamMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ELECTRICAL ARCING FLASHES
  // ──────────────────────────────────────────────────────────────────────────
  const arcLight = new THREE.PointLight(0x38bdf8, 0, 24, 2.0);
  arcLight.position.set(-50, 4.5, 125); // Substation area
  group.add(arcLight);

  const triggerHazards = () => {
    isActive = true;
    steamMesh.visible = true;
  };

  const update = (delta: number, time: number) => {
    if (!isActive) return;

    // 1. Rotating Sirens
    const strobe = Math.sin(time * 16.0) > 0.05 ? 3.5 : 0;
    beaconLights.forEach((light) => {
      light.intensity = strobe;
    });

    // 2. High-Pressure Steam Jets
    const posAttr = steamGeo.getAttribute('position') as THREE.BufferAttribute;
    const ventOrigins = [
      new THREE.Vector3(0, 13.5, -100),
      new THREE.Vector3(100, 13.5, 0),
    ];

    for (let i = 0; i < steamCount; i++) {
      steamLifespans[i] += delta;
      const origin = ventOrigins[i % ventOrigins.length];

      if (steamLifespans[i] >= steamMaxLives[i]) {
        steamLifespans[i] = 0;
        posAttr.setXYZ(i, origin.x, origin.y, origin.z);
      } else {
        const t = steamLifespans[i] / steamMaxLives[i];
        const jetSpeed = 22.0 * (1.0 - t * 0.4);
        const spreadX = (Math.sin(time * 8.0 + i) - 0.5) * 4.0 * t;
        const spreadZ = (Math.cos(time * 8.0 + i) - 0.5) * 4.0 * t;

        const px = origin.x + spreadX;
        const py = origin.y + jetSpeed * t;
        const pz = origin.z + spreadZ;

        posAttr.setXYZ(i, px, py, pz);
      }
    }
    posAttr.needsUpdate = true;

    // 3. Electrical Arcing
    if (Math.random() < 0.08) {
      arcLight.intensity = 8.0 + Math.random() * 6.0;
    } else {
      arcLight.intensity = 0;
    }
  };

  const reset = () => {
    isActive = false;
    steamMesh.visible = false;
    arcLight.intensity = 0;
    beaconLights.forEach((light) => {
      light.intensity = 0;
    });
  };

  scene.add(group);

  return {
    group,
    triggerHazards,
    update,
    reset,
  };
};
