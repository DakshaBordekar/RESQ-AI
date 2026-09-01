// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Hero LPG Spherical Tank Installation
// High-detail PBR pressure vessel with Thermal Stress, Critical Expansion & Ruptured Aftermath
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { BlevePhase } from '../../simulation/types';

export interface HeroLpgSphereComponents {
  group: THREE.Group;
  updateBleveState: (phase: BlevePhase, delta: number) => void;
  reset: () => void;
}

// Procedural UN 1075 Flammable Gas Diamond Placard
const createLpgTankDecalTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 12;
  ctx.strokeRect(16, 16, 480, 480);

  ctx.save();
  ctx.translate(256, 180);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-70, -70, 140, 140);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(-66, -66, 132, 132);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('1075', 256, 192);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('PROPANE / LPG', 256, 310);
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('CAPACITY: 80,000 L', 256, 345);
  ctx.fillText('DESIGN: 1.8 MPa', 256, 375);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
};

export const createHeroLpgSphere = (
  tankDiameterM = 14,
  fillFraction = 0.85
): HeroLpgSphereComponents => {
  const group = new THREE.Group();
  const tankRadius = tankDiameterM / 2;
  const sphereElevationY = tankRadius + 7;

  // 1. Materials
  const decalTex = createLpgTankDecalTexture();
  const pristineMat = new THREE.MeshStandardMaterial({
    map: decalTex,
    color: 0xf1f5f9,
    metalness: 0.85,
    roughness: 0.25,
    emissive: new THREE.Color(0x000000),
  });

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.3,
    roughness: 0.9,
    emissive: new THREE.Color(0x450a0a),
    emissiveIntensity: 0.4,
  });

  const steelLegMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.85,
    roughness: 0.35,
  });

  const charredSteelMat = new THREE.MeshStandardMaterial({
    color: 0x27272a,
    metalness: 0.5,
    roughness: 0.85,
  });

  const safetyYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.4,
    roughness: 0.5,
  });

  const industrialPipeMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.8,
    roughness: 0.35,
  });

  // 2. PRISTINE TANK SUB-GROUP
  const pristineGroup = new THREE.Group();
  group.add(pristineGroup);

  // Main Sphere
  const sphereGeo = new THREE.SphereGeometry(tankRadius, 64, 64);
  const sphereMesh = new THREE.Mesh(sphereGeo, pristineMat);
  sphereMesh.position.y = sphereElevationY;
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  sphereMesh.userData = {
    isInteractable: true,
    objectName: 'LPG Spherical Storage Tank (#TK-LPG-01A)',
    details: `Diameter: ${tankDiameterM}m • Fill: ${Math.round(fillFraction * 100)}% • LPG BLEVE Threat Origin`,
    targetFocusY: sphereElevationY,
  };
  pristineGroup.add(sphereMesh);

  // Weld Ring
  const seamGeo = new THREE.TorusGeometry(tankRadius + 0.08, 0.18, 12, 64);
  const seamMesh = new THREE.Mesh(seamGeo, steelLegMat);
  seamMesh.rotation.x = Math.PI / 2;
  seamMesh.position.y = sphereElevationY;
  pristineGroup.add(seamMesh);

  // Top Catwalk Platform & Railings
  const catwalkY = sphereElevationY + tankRadius * 0.96;
  const platformGeo = new THREE.CylinderGeometry(tankRadius * 0.45, tankRadius * 0.45, 0.25, 24);
  const platformMesh = new THREE.Mesh(platformGeo, steelLegMat);
  platformMesh.position.y = catwalkY;
  pristineGroup.add(platformMesh);

  const railingGeo = new THREE.TorusGeometry(tankRadius * 0.44, 0.06, 8, 24);
  const railingMesh = new THREE.Mesh(railingGeo, safetyYellowMat);
  railingMesh.rotation.x = Math.PI / 2;
  railingMesh.position.y = catwalkY + 1.1;
  pristineGroup.add(railingMesh);

  // Top Pressure Relief Valve Stack
  const valveStackGeo = new THREE.CylinderGeometry(0.3, 0.3, 4.5, 16);
  const valveStackMesh = new THREE.Mesh(valveStackGeo, industrialPipeMat);
  valveStackMesh.position.set(0, catwalkY + 2.25, 0);
  pristineGroup.add(valveStackMesh);

  // 3. RUPTURED / CHARRED AFTERMATH SUB-GROUP
  const aftermathGroup = new THREE.Group();
  aftermathGroup.visible = false;
  group.add(aftermathGroup);

  // Charred, Torn Lower Hemisphere (Blown-out Top)
  const tornSphereGeo = new THREE.SphereGeometry(
    tankRadius * 1.05,
    48,
    32,
    0,
    Math.PI * 2,
    Math.PI * 0.35,
    Math.PI * 0.65
  );
  const tornSphereMesh = new THREE.Mesh(tornSphereGeo, charredMat);
  tornSphereMesh.position.y = sphereElevationY - 1.2;
  tornSphereMesh.rotation.z = 0.08;
  tornSphereMesh.castShadow = true;
  tornSphereMesh.receiveShadow = true;
  aftermathGroup.add(tornSphereMesh);

  // Jagged Metal Shards / Ruptured Top Flaps
  for (let i = 0; i < 6; i++) {
    const shardAngle = (i * Math.PI * 2) / 6;
    const shardGeo = new THREE.ConeGeometry(tankRadius * 0.35, tankRadius * 0.7, 3);
    const shardMesh = new THREE.Mesh(shardGeo, charredMat);
    shardMesh.position.set(
      Math.cos(shardAngle) * (tankRadius * 0.85),
      sphereElevationY + tankRadius * 0.3,
      Math.sin(shardAngle) * (tankRadius * 0.85)
    );
    shardMesh.rotation.set(
      Math.sin(shardAngle) * 0.7 + (Math.random() - 0.5) * 0.4,
      shardAngle,
      -Math.cos(shardAngle) * 0.7
    );
    aftermathGroup.add(shardMesh);
  }

  // 4. SHARED SUPPORT COLUMNS (8 Heavy Tubular Legs)
  const legsGroup = new THREE.Group();
  const numLegs = 8;
  const legRadius = tankRadius * 0.88;
  const legHeight = sphereElevationY + 1.0;
  const legMeshes: THREE.Mesh[] = [];

  for (let i = 0; i < numLegs; i++) {
    const angle = (i * (Math.PI * 2)) / numLegs;
    const lx = Math.cos(angle) * legRadius;
    const lz = Math.sin(angle) * legRadius;

    // Concrete Footing
    const footingGeo = new THREE.BoxGeometry(2.4, 1.2, 2.4);
    const footingMesh = new THREE.Mesh(footingGeo, steelLegMat);
    footingMesh.position.set(lx, 0.6, lz);
    legsGroup.add(footingMesh);

    // Steel Tubular Leg
    const legGeo = new THREE.CylinderGeometry(0.42, 0.5, legHeight, 16);
    const legMesh = new THREE.Mesh(legGeo, steelLegMat);
    legMesh.position.set(lx, legHeight / 2, lz);
    legMesh.castShadow = true;
    legsGroup.add(legMesh);
    legMeshes.push(legMesh);
  }
  group.add(legsGroup);

  // 5. Ground Manifold Piping
  const manifoldGeo = new THREE.CylinderGeometry(0.35, 0.35, tankRadius * 2.2, 16);
  const manifoldMesh = new THREE.Mesh(manifoldGeo, industrialPipeMat);
  manifoldMesh.rotation.z = Math.PI / 2;
  manifoldMesh.position.set(0, 1.2, tankRadius * 0.85);
  group.add(manifoldMesh);

  const updateBleveState = (blevePhase: BlevePhase, delta: number) => {
    if (blevePhase === 'IDLE') {
      pristineGroup.visible = true;
      aftermathGroup.visible = false;
      pristineMat.emissive.set(0x000000);
      legMeshes.forEach((m) => (m.material = steelLegMat));
    } else if (blevePhase === 'THERMAL_STRESS') {
      pristineGroup.visible = true;
      aftermathGroup.visible = false;
      pristineMat.emissive.set(0x7c2d12);
      pristineMat.emissiveIntensity = 0.35;
    } else if (blevePhase === 'CRITICAL_EXPANSION') {
      pristineGroup.visible = true;
      aftermathGroup.visible = false;
      pristineMat.emissive.set(0xf97316);
      pristineMat.emissiveIntensity = 0.85;
    } else if (
      blevePhase === 'BLAST_IGNITION' ||
      blevePhase === 'FIREBALL_PEAK' ||
      blevePhase === 'SHOCKWAVE_PROPAGATION' ||
      blevePhase === 'DEBRIS_COLLAPSE' ||
      blevePhase === 'AFTERMATH'
    ) {
      pristineGroup.visible = false;
      aftermathGroup.visible = true;
      legMeshes.forEach((m) => (m.material = charredSteelMat));
    }
  };

  const reset = () => {
    pristineGroup.visible = true;
    aftermathGroup.visible = false;
    pristineMat.emissive.set(0x000000);
    legMeshes.forEach((m) => (m.material = steelLegMat));
  };

  return {
    group,
    updateBleveState,
    reset,
  };
};
