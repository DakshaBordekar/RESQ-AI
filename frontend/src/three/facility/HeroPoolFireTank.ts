// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Hero Facility B: Petroleum Storage Tank & Containment Bund
// High-detail vertical cylindrical storage tank, spiral access staircase, walkway,
// reinforced concrete containment bund, liquid pool surface, and dynamic thermal scorch state.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { BlevePhase } from '../../simulation/types';

export interface HeroPoolFireTankComponents {
  group: THREE.Group;
  updateState: (phase: BlevePhase, intensityFactor: number, delta: number) => void;
  reset: () => void;
}

const createPetroleumDecalTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 1024, 512);

  // Amber warning band
  ctx.fillStyle = '#d97706';
  ctx.fillRect(0, 180, 1024, 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('DIESEL / CLASS III FLAMMABLE LIQUID STORAGE', 80, 222);

  // NFPA 704 Diamond
  const cx = 512;
  const cy = 100;
  const s = 45;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('2', cx, cy + 10);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 38px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FACILITY B — TANK #TK-PETRO-02B', 80, 340);
  ctx.font = 'bold 20px monospace';
  ctx.fillText('VOLUME: 150,000 L | BUND BASIN CAPACITY: 110%', 80, 380);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

export const createHeroPoolFireTank = (
  tankDiameterM = 20,
  poolDiameterM = 24
): HeroPoolFireTankComponents => {
  const tankGroup = new THREE.Group();
  const tankRadius = tankDiameterM / 2;
  const tankHeight = 18;

  // Materials
  const decalTex = createPetroleumDecalTexture();
  const tankMat = new THREE.MeshStandardMaterial({
    map: decalTex,
    color: 0x94a3b8,
    metalness: 0.75,
    roughness: 0.35,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.85,
    roughness: 0.3,
  });

  const yellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.4,
    roughness: 0.5,
  });

  const bundMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.8,
    metalness: 0.1,
  });

  const liquidFuelMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.9,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0,
  });

  // 1. MAIN VERTICAL CYLINDRICAL STORAGE TANK
  const cylGeo = new THREE.CylinderGeometry(tankRadius, tankRadius, tankHeight, 48);
  const cylMesh = new THREE.Mesh(cylGeo, tankMat);
  cylMesh.position.y = tankHeight / 2 + 0.6;
  cylMesh.castShadow = true;
  cylMesh.receiveShadow = true;
  cylMesh.userData = {
    isInteractable: true,
    objectName: 'Petroleum Storage Tank (#TK-PETRO-02B)',
    details: `Diameter: ${tankDiameterM}m • Height: ${tankHeight}m • Pool Fire Origin`,
    targetFocusY: tankHeight / 2 + 0.6,
  };
  tankGroup.add(cylMesh);

  // Cone Roof
  const roofGeo = new THREE.ConeGeometry(tankRadius + 0.3, 2.5, 48);
  const roofMesh = new THREE.Mesh(roofGeo, steelMat);
  roofMesh.position.y = tankHeight + 1.8;
  roofMesh.castShadow = true;
  tankGroup.add(roofMesh);

  // 2. SPIRAL EXTERIOR ACCESS STAIRWAY
  const stairTurns = 1.25;
  const numSteps = 36;
  for (let s = 0; s < numSteps; s++) {
    const t = s / numSteps;
    const angle = t * stairTurns * 2 * Math.PI;
    const y = t * tankHeight + 0.6;
    const sr = tankRadius + 0.9;

    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 0.8), steelMat);
    step.position.set(sr * Math.sin(angle), y, sr * Math.cos(angle));
    step.rotation.y = -angle;
    step.castShadow = true;
    tankGroup.add(step);

    if (s % 3 === 0) {
      const hrPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), yellowMat);
      hrPost.position.set((sr + 0.7) * Math.sin(angle), y + 0.7, (sr + 0.7) * Math.cos(angle));
      tankGroup.add(hrPost);
    }
  }

  // 3. TOP PERIMETER WALKWAY & HANDRAILS
  const topPlatformY = tankHeight + 0.6;
  for (let p = 0; p < 24; p++) {
    const pAng = (p * 2 * Math.PI) / 24;
    const px = (tankRadius - 0.2) * Math.sin(pAng);
    const pz = (tankRadius - 0.2) * Math.cos(pAng);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), yellowMat);
    post.position.set(px, topPlatformY + 0.8, pz);
    tankGroup.add(post);
  }
  const topRail = new THREE.Mesh(
    new THREE.TorusGeometry(tankRadius - 0.2, 0.06, 8, 48),
    yellowMat
  );
  topRail.rotation.x = Math.PI / 2;
  topRail.position.set(0, topPlatformY + 1.6, 0);
  tankGroup.add(topRail);

  // 4. DIKED RECTANGULAR REINFORCED CONCRETE BUND CONTAINMENT WALL
  const bundSize = Math.max(38, poolDiameterM + 14);
  const bundWallH = 2.4;
  const bundWallThick = 1.4;

  const bundN = new THREE.Mesh(new THREE.BoxGeometry(bundSize, bundWallH, bundWallThick), bundMat);
  bundN.position.set(0, bundWallH / 2 + 0.6, -bundSize / 2);
  bundN.castShadow = true;
  bundN.receiveShadow = true;
  tankGroup.add(bundN);

  const bundS = new THREE.Mesh(new THREE.BoxGeometry(bundSize, bundWallH, bundWallThick), bundMat);
  bundS.position.set(0, bundWallH / 2 + 0.6, bundSize / 2);
  bundS.castShadow = true;
  bundS.receiveShadow = true;
  tankGroup.add(bundS);

  const bundE = new THREE.Mesh(new THREE.BoxGeometry(bundWallThick, bundWallH, bundSize), bundMat);
  bundE.position.set(bundSize / 2, bundWallH / 2 + 0.6, 0);
  bundE.castShadow = true;
  bundE.receiveShadow = true;
  tankGroup.add(bundE);

  const bundW = new THREE.Mesh(new THREE.BoxGeometry(bundWallThick, bundWallH, bundSize), bundMat);
  bundW.position.set(-bundSize / 2, bundWallH / 2 + 0.6, 0);
  bundW.castShadow = true;
  bundW.receiveShadow = true;
  tankGroup.add(bundW);

  // 5. LIQUID BURNING FUEL POOL SURFACE INSIDE BUND
  const poolGeo = new THREE.PlaneGeometry(bundSize - 2.8, bundSize - 2.8);
  const poolMesh = new THREE.Mesh(poolGeo, liquidFuelMat);
  poolMesh.rotation.x = -Math.PI / 2;
  poolMesh.position.set(0, 0.9, 0);
  poolMesh.receiveShadow = true;
  tankGroup.add(poolMesh);

  // 6. EMERGENCY FOAM POURER PIPING
  for (let fp of [-tankRadius - 2, tankRadius + 2]) {
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, tankHeight + 2, 12), steelMat);
    riser.position.set(fp, (tankHeight + 2) / 2 + 0.6, 0);
    riser.castShadow = true;
    tankGroup.add(riser);

    const pourer = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.4), yellowMat);
    pourer.position.set(fp > 0 ? fp - 0.8 : fp + 0.8, tankHeight + 1.2, 0);
    tankGroup.add(pourer);
  }

  const updateState = (phase: BlevePhase, intensityFactor: number, delta: number) => {
    if (phase === 'IDLE') {
      tankMat.emissive.setHex(0x000000);
      tankMat.emissiveIntensity = 0;
      liquidFuelMat.emissive.setHex(0x000000);
      liquidFuelMat.emissiveIntensity = 0;
      liquidFuelMat.color.setHex(0x1e1b4b);
    } else if (
      phase === 'IGNITION' ||
      phase === 'SUSTAINED_FIRE' ||
      phase === 'EMERGENCY_RESPONSE' ||
      phase === 'TRUCK_STAGED' ||
      phase === 'WATER_ATTACK' ||
      phase === 'SUPPRESSION'
    ) {
      const glow = Math.max(0, intensityFactor);
      tankMat.emissive.setHex(0x7c2d12);
      tankMat.emissiveIntensity = 0.45 * glow;
      liquidFuelMat.emissive.setHex(0xea580c);
      liquidFuelMat.emissiveIntensity = 0.85 * glow;
    } else if (phase === 'EXTINGUISHED' || phase === 'AFTERMATH') {
      tankMat.emissive.setHex(0x1e293b);
      tankMat.emissiveIntensity = 0.15;
      liquidFuelMat.emissive.setHex(0x000000);
      liquidFuelMat.emissiveIntensity = 0;
      liquidFuelMat.color.setHex(0x0f172a); // Charred wet residue
    }
  };

  const reset = () => {
    updateState('IDLE', 0, 0);
  };

  return {
    group: tankGroup,
    updateState,
    reset,
  };
};
