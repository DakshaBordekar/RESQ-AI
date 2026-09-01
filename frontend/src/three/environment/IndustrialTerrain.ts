// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Industrial Terrain & Infrastructure Environment
// Asphalt roads, wet surface reflections, concrete pads, markings, fences, lighting
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

// Procedural Canvas Texture for Asphalt Ground
const createAsphaltTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Micro grain noise
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const g = Math.floor(Math.random() * 35) + 20;
    ctx.fillStyle = `rgb(${g},${g + 5},${g + 12})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(40, 40);
  return texture;
};

// Procedural Canvas Texture for Concrete Tank Pad with Yellow/Black Hazard Border
const createHazardBorderTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Concrete central floor
  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, 512, 512);

  // Concrete grid lines
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  for (let i = 0; i < 512; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Yellow & Black diagonal warning stripe border
  const borderW = 32;
  ctx.save();
  ctx.rect(0, 0, 512, borderW);
  ctx.rect(0, 512 - borderW, 512, borderW);
  ctx.rect(0, 0, borderW, 512);
  ctx.rect(512 - borderW, 0, borderW, 512);
  ctx.clip();

  ctx.fillStyle = '#eab308';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = '#0f172a';
  for (let i = -512; i < 1024; i += 40) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 30, 0);
    ctx.lineTo(i + 30 - 512, 512);
    ctx.lineTo(i - 512, 512);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

export const createIndustrialTerrain = (scene: THREE.Scene): THREE.Group => {
  const terrainGroup = new THREE.Group();

  // 1. Base Industrial Ground (600m x 600m)
  const asphaltTex = createAsphaltTexture();
  const groundGeo = new THREE.PlaneGeometry(700, 700);
  const groundMat = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    color: 0x334155,
    roughness: 0.5,
    metalness: 0.15,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  ground.receiveShadow = true;
  terrainGroup.add(ground);

  // 2. Central Hero Facility Concrete Foundation Pad (80m x 80m)
  const padGeo = new THREE.BoxGeometry(84, 1.2, 84);
  const padTex = createHazardBorderTexture();
  const padMat = new THREE.MeshStandardMaterial({
    map: padTex,
    color: 0x94a3b8,
    roughness: 0.6,
    metalness: 0.1,
  });
  const padMesh = new THREE.Mesh(padGeo, padMat);
  padMesh.position.set(0, 0.6, 0);
  padMesh.receiveShadow = true;
  padMesh.castShadow = true;
  terrainGroup.add(padMesh);

  // 3. Concrete Protective Berm / Curb perimeter around pad
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65, metalness: 0.1 });
  const curbWidth = 1.2;
  const curbHeight = 1.6;
  const curbLength = 84;

  const curbN = new THREE.Mesh(new THREE.BoxGeometry(curbLength, curbHeight, curbWidth), curbMat);
  curbN.position.set(0, 1.2, -42);
  curbN.castShadow = true;
  curbN.receiveShadow = true;
  terrainGroup.add(curbN);

  const curbS = new THREE.Mesh(new THREE.BoxGeometry(curbLength, curbHeight, curbWidth), curbMat);
  curbS.position.set(0, 1.2, 42);
  curbS.castShadow = true;
  curbS.receiveShadow = true;
  terrainGroup.add(curbS);

  const curbE = new THREE.Mesh(new THREE.BoxGeometry(curbWidth, curbHeight, curbLength), curbMat);
  curbE.position.set(42, 1.2, 0);
  curbE.castShadow = true;
  curbE.receiveShadow = true;
  terrainGroup.add(curbE);

  const curbW = new THREE.Mesh(new THREE.BoxGeometry(curbWidth, curbHeight, curbLength), curbMat);
  curbW.position.set(-42, 1.2, 0);
  curbW.castShadow = true;
  curbW.receiveShadow = true;
  terrainGroup.add(curbW);

  // 4. Industrial Street Lighting Posts with Glowing Fixtures
  const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

  const lightPositions = [
    { x: 50, z: -180 },
    { x: 50, z: -90 },
    { x: 50, z: 0 },
    { x: 50, z: 90 },
    { x: 50, z: 180 },
    { x: -180, z: 50 },
    { x: -90, z: 50 },
    { x: 0, z: 50 },
    { x: 90, z: 50 },
    { x: 180, z: 50 },
  ];

  lightPositions.forEach(({ x, z }) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 16, 8), postMat);
    post.position.set(x, 8, z);
    post.castShadow = true;
    terrainGroup.add(post);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 0.3), postMat);
    arm.position.set(x > 0 ? x + 1.5 : x - 1.5, 15.8, z);
    terrainGroup.add(arm);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 12), lampGlowMat);
    lamp.position.set(x > 0 ? x + 3.2 : x - 3.2, 15.4, z);
    terrainGroup.add(lamp);

    const streetLight = new THREE.PointLight(0xfef08a, 1.4, 55);
    streetLight.position.set(x > 0 ? x + 3.2 : x - 3.2, 14.8, z);
    terrainGroup.add(streetLight);
  });

  // 6. Perimeter Security Chainlink Fence
  const fenceMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.9,
    roughness: 0.2,
    wireframe: true,
  });
  const fencePostMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });

  const fenceSections = [
    { x: 0, z: -48, w: 96, d: 0.1 },
    { x: 0, z: 48, w: 96, d: 0.1 },
    { x: -48, z: 0, w: 0.1, d: 96 },
    { x: 48, z: 0, w: 0.1, d: 96 },
  ];

  fenceSections.forEach(({ x, z, w, d }) => {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(w || 0.1, 4.5, d || 0.1), fenceMat);
    fence.position.set(x, 2.25, z);
    terrainGroup.add(fence);
  });

  // Fence Corner & Interval Posts
  for (let fx = -48; fx <= 48; fx += 16) {
    for (let fz of [-48, 48]) {
      const fpost = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 8), fencePostMat);
      fpost.position.set(fx, 2.5, fz);
      terrainGroup.add(fpost);
    }
  }

  scene.add(terrainGroup);
  return terrainGroup;
};
