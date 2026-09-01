// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Surrounding Petrochemical Complex Infrastructure
// 45+ Industrial structures arranged in functional operational sectors along the road network:
// - Sector A: Fractionation & Distillation Plant (East)
// - Sector B: Pressurized LPG Bullet Tank Farm (West)
// - Sector C: Logistics Hub & High-Bay Warehouses (North)
// - Sector D: Power Substation, Transformers & Cooling Towers (South)
// - Sector E: Central Operations & Control Building (Northwest)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export interface IndustrialComplexComponents {
  group: THREE.Group;
  updateBlastWave: (blastRadiusM: number, delta: number, time: number) => void;
  resetDamage: () => void;
}

interface ReactiveStructure {
  mesh: THREE.Mesh;
  worldPos: THREE.Vector3;
  distFromOrigin: number;
  initialPos: THREE.Vector3;
  initialRot: THREE.Euler;
  damagedPos?: THREE.Vector3;
  damagedRot?: THREE.Euler;
  initialMat: THREE.Material;
  charredMat: THREE.Material;
  isTriggered: boolean;
  collapseProgress: number;
  canCollapse?: boolean;
}

export const createSurroundingIndustrialComplex = (
  scene: THREE.Scene
): IndustrialComplexComponents => {
  const group = new THREE.Group();
  const reactiveStructures: ReactiveStructure[] = [];

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PBR ARCHITECTURAL MATERIALS
  // ──────────────────────────────────────────────────────────────────────────
  const lightConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.75,
    metalness: 0.1,
  });

  const beigeCladdingMat = new THREE.MeshStandardMaterial({
    color: 0xd6d3d1, // Industrial warm beige
    roughness: 0.55,
    metalness: 0.15,
  });

  const blueGrayCladdingMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Modern slate blue
    roughness: 0.45,
    metalness: 0.55,
  });

  const offWhiteCladdingMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9, // Clean white facility panel
    roughness: 0.4,
    metalness: 0.4,
  });

  const graphiteRoofMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.45,
    metalness: 0.65,
  });

  const terracottaRoofMat = new THREE.MeshStandardMaterial({
    color: 0x9a3412,
    roughness: 0.7,
    metalness: 0.1,
  });

  const brightSteelMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.25,
    metalness: 0.85,
  });

  const whiteTankMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.7,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.85,
  });

  const bayDoorYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.4,
    metalness: 0.4,
  });

  const bayDoorRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.4,
    metalness: 0.4,
  });

  const yellowGasPipeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.35,
    metalness: 0.6,
  });

  const blueCoolantPipeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.35,
    metalness: 0.6,
  });

  const redFirePipeMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.6,
  });

  const galvanizedPipeMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.85,
  });

  // Post-Blast Scorch Materials
  const charredWallMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.95,
    metalness: 0.2,
    emissive: new THREE.Color(0x380a0a),
    emissiveIntensity: 0.35,
  });

  const charredSteelMat = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.8,
    metalness: 0.4,
  });

  const shatteredGlassMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: 0.2,
  });

  const registerReactive = (
    mesh: THREE.Mesh,
    charred = charredWallMat,
    canCollapse = false,
    damagedRot?: THREE.Euler,
    damagedPos?: THREE.Vector3
  ) => {
    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    const dist = new THREE.Vector2(worldPos.x, worldPos.z).length();

    reactiveStructures.push({
      mesh,
      worldPos,
      distFromOrigin: dist,
      initialPos: mesh.position.clone(),
      initialRot: mesh.rotation.clone(),
      damagedPos: damagedPos ? damagedPos.clone() : undefined,
      damagedRot: damagedRot ? damagedRot.clone() : undefined,
      initialMat: mesh.material as THREE.Material,
      charredMat: charred,
      isTriggered: false,
      collapseProgress: 0,
      canCollapse,
    });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SECTOR A: FRACTIONATION & DISTILLATION TOWERS (East: x: 155, z: -40)
  // ──────────────────────────────────────────────────────────────────────────
  const distilGroup = new THREE.Group();
  distilGroup.position.set(155, 0, -40);

  const distilPad = new THREE.Mesh(new THREE.BoxGeometry(45, 1.4, 35), lightConcreteMat);
  distilPad.position.y = 0.7;
  distilPad.receiveShadow = true;
  distilGroup.add(distilPad);

  const towerConfigs = [
    { x: -12, z: 0, r: 3.2, h: 36, mat: brightSteelMat },
    { x: 0, z: -6, r: 2.6, h: 44, mat: brightSteelMat },
    { x: 12, z: 4, r: 2.2, h: 30, mat: whiteTankMat },
  ];

  towerConfigs.forEach(({ x, z, r, h, mat }) => {
    const colGeo = new THREE.CylinderGeometry(r, r, h, 24);
    const colMesh = new THREE.Mesh(colGeo, mat);
    colMesh.position.set(x, h / 2 + 1.4, z);
    colMesh.castShadow = true;
    distilGroup.add(colMesh);

    for (let py = 10; py < h; py += 10) {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.4, r + 1.4, 0.4, 16), galvanizedPipeMat);
      plat.position.set(x, py + 1.4, z);
      distilGroup.add(plat);
    }

    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.position.set(x, h + 1.4, z);
    distilGroup.add(dome);

    registerReactive(colMesh, charredSteelMat);
  });
  group.add(distilGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SECTOR B: HORIZONTAL LPG BULLET VESSEL FARM (West: x: -150, z: -35)
  // ──────────────────────────────────────────────────────────────────────────
  const bulletGroup = new THREE.Group();
  bulletGroup.position.set(-150, 0, -35);

  const bulletPad = new THREE.Mesh(new THREE.BoxGeometry(45, 1.2, 55), lightConcreteMat);
  bulletPad.position.set(0, 0.6, 0);
  bulletPad.receiveShadow = true;
  bulletGroup.add(bulletPad);

  for (let i = 0; i < 4; i++) {
    const bZ = -18 + i * 12;
    const bulletTank = new THREE.Group();
    bulletTank.position.set(0, 5.5, bZ);

    const cylGeo = new THREE.CylinderGeometry(3.2, 3.2, 28, 32);
    const cylMesh = new THREE.Mesh(cylGeo, whiteTankMat);
    cylMesh.rotation.z = Math.PI / 2;
    cylMesh.castShadow = true;
    bulletTank.add(cylMesh);

    const capGeo = new THREE.SphereGeometry(3.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);

    const capE = new THREE.Mesh(capGeo, whiteTankMat);
    capE.rotation.z = -Math.PI / 2;
    capE.position.x = 14;
    bulletTank.add(capE);

    const capW = new THREE.Mesh(capGeo, whiteTankMat);
    capW.rotation.z = Math.PI / 2;
    capW.position.x = -14;
    bulletTank.add(capW);

    const bandGeo = new THREE.CylinderGeometry(3.25, 3.25, 1.2, 32);
    const bandMesh = new THREE.Mesh(bandGeo, bayDoorRedMat);
    bandMesh.rotation.z = Math.PI / 2;
    bulletTank.add(bandMesh);

    for (let cx of [-8, 8]) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.5, 7.5), lightConcreteMat);
      saddle.position.set(cx, -2.5, 0);
      saddle.castShadow = true;
      bulletTank.add(saddle);
    }

    bulletGroup.add(bulletTank);
    registerReactive(
      cylMesh,
      charredSteelMat,
      true,
      new THREE.Euler(0, 0.08, 0.05),
      new THREE.Vector3(0, 5.0, bZ)
    );
  }
  group.add(bulletGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. SECTOR C: LOGISTICS HUB & WAREHOUSES (North: z in [-180, -95])
  // ──────────────────────────────────────────────────────────────────────────
  const createWarehouse = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    rotY = 0,
    wallMat = blueGrayCladdingMat,
    roofMat = graphiteRoofMat,
    canCollapseRoof = false
  ) => {
    const whGroup = new THREE.Group();
    whGroup.position.set(x, 0, z);
    whGroup.rotation.y = rotY;

    const fMesh = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 1.2, d + 1.6), lightConcreteMat);
    fMesh.position.y = 0.6;
    fMesh.receiveShadow = true;
    whGroup.add(fMesh);

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    bodyMesh.position.y = h / 2 + 1.2;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    whGroup.add(bodyMesh);

    const roofThick = 1.0;
    const roofM = new THREE.Mesh(new THREE.BoxGeometry(w + 2.2, roofThick, d + 2.2), roofMat);
    roofM.position.y = h + 1.2 + roofThick / 2;
    roofM.castShadow = true;
    whGroup.add(roofM);

    const numDoors = Math.max(1, Math.floor(w / 14));
    for (let doorIdx = 0; doorIdx < numDoors; doorIdx++) {
      const doorW = 5.5;
      const doorH = h * 0.55;
      const doorSpacing = w / (numDoors + 1);
      const doorX = -w / 2 + doorSpacing * (doorIdx + 1);

      const doorMesh = new THREE.Mesh(
        new THREE.BoxGeometry(doorW, doorH, 0.3),
        doorIdx % 2 === 0 ? bayDoorYellowMat : bayDoorRedMat
      );
      doorMesh.position.set(doorX, doorH / 2 + 1.2, d / 2 + 0.15);
      doorMesh.castShadow = true;
      whGroup.add(doorMesh);
    }

    const winMesh = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 1.8, 0.3), glassMat);
    winMesh.position.set(0, h * 0.85 + 1.2, d / 2 + 0.15);
    whGroup.add(winMesh);

    registerReactive(bodyMesh, charredWallMat);
    registerReactive(
      roofM,
      charredWallMat,
      canCollapseRoof,
      canCollapseRoof ? new THREE.Euler(0.08, 0, -0.12) : undefined,
      canCollapseRoof ? new THREE.Vector3(0, h * 0.75 + 1.2, 0) : undefined
    );
    registerReactive(winMesh, shatteredGlassMat);

    group.add(whGroup);
  };

  // High-Bay Warehouses along Road Corridors
  createWarehouse(60, -95, 34, 13, 24, 0, beigeCladdingMat, graphiteRoofMat, true);
  createWarehouse(125, -135, 48, 15, 28, 0, blueGrayCladdingMat, graphiteRoofMat, false);
  createWarehouse(-125, -135, 42, 14, 26, 0, offWhiteCladdingMat, terracottaRoofMat, false);
  createWarehouse(60, 145, 52, 16, 30, 0, blueGrayCladdingMat, graphiteRoofMat, false);
  createWarehouse(-135, 145, 38, 12, 22, 0, beigeCladdingMat, terracottaRoofMat, false);

  // Storage Silos Battery (North: x: -50, z: -150)
  const siloGroup = new THREE.Group();
  siloGroup.position.set(-50, 0, -150);

  for (let s = 0; s < 4; s++) {
    const sx = -24 + s * 16;
    const siloGeo = new THREE.CylinderGeometry(5.5, 5.5, 24, 32);
    const siloMesh = new THREE.Mesh(siloGeo, whiteTankMat);
    siloMesh.position.set(sx, 12, 0);
    siloMesh.castShadow = true;
    siloGroup.add(siloMesh);

    const coneGeo = new THREE.ConeGeometry(5.8, 4.5, 32);
    const coneMesh = new THREE.Mesh(coneGeo, graphiteRoofMat);
    coneMesh.position.set(sx, 24 + 2.25, 0);
    coneMesh.castShadow = true;
    siloGroup.add(coneMesh);

    registerReactive(siloMesh, charredWallMat);
  }
  group.add(siloGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SECTOR D: UTILITIES, SUBSTATION & COOLING TOWERS (South: z in [95, 175])
  // ──────────────────────────────────────────────────────────────────────────
  const coolingGroup = new THREE.Group();
  coolingGroup.position.set(135, 0, 100);

  for (let c = 0; c < 2; c++) {
    const cx = -14 + c * 28;
    const coolGeo = new THREE.CylinderGeometry(7.5, 10.5, 24, 32);
    const coolMesh = new THREE.Mesh(coolGeo, lightConcreteMat);
    coolMesh.position.set(cx, 12, 0);
    coolMesh.castShadow = true;
    coolingGroup.add(coolMesh);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.6, 0.5, 8, 32), galvanizedPipeMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(cx, 24, 0);
    coolingGroup.add(rim);

    registerReactive(coolMesh, charredWallMat);
  }
  group.add(coolingGroup);

  // Electrical Transformer Substation (South: x: -50, z: 125)
  const subGroup = new THREE.Group();
  subGroup.position.set(-50, 0, 125);

  const subPad = new THREE.Mesh(new THREE.BoxGeometry(28, 0.8, 22), lightConcreteMat);
  subPad.position.y = 0.4;
  subGroup.add(subPad);

  for (let t = 0; t < 3; t++) {
    const tx = -8 + t * 8;
    const trans = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 4.5), blueGrayCladdingMat);
    trans.position.set(tx, 3.65, 0);
    trans.castShadow = true;
    subGroup.add(trans);

    for (let f = -1.8; f <= 1.8; f += 0.9) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5.5, 5.2), galvanizedPipeMat);
      fin.position.set(tx + f, 3.65, 0);
      subGroup.add(fin);
    }

    for (let bx of [-1.2, 0, 1.2]) {
      const bush = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 2.2, 8), terracottaRoofMat);
      bush.position.set(tx + bx, 8, 0);
      subGroup.add(bush);
    }

    registerReactive(trans, charredSteelMat);
  }
  group.add(subGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. SECTOR E: OPERATIONS CONTROL CENTER (Northwest: x: -95, z: -95)
  // ──────────────────────────────────────────────────────────────────────────
  const controlRoomGroup = new THREE.Group();
  controlRoomGroup.position.set(-95, 0, -95);

  const crBase = new THREE.Mesh(new THREE.BoxGeometry(32, 10, 20), beigeCladdingMat);
  crBase.position.y = 5;
  crBase.castShadow = true;
  controlRoomGroup.add(crBase);

  const crRoof = new THREE.Mesh(new THREE.BoxGeometry(34, 1.4, 22), terracottaRoofMat);
  crRoof.position.y = 10.7;
  crRoof.castShadow = true;
  controlRoomGroup.add(crRoof);

  const crWinGeo = new THREE.BoxGeometry(26, 3.5, 0.4);
  const crWinMesh = new THREE.Mesh(crWinGeo, glassMat);
  crWinMesh.position.set(0, 6.5, 10.1);
  controlRoomGroup.add(crWinMesh);

  const crDoor = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 0.3), bayDoorYellowMat);
  crDoor.position.set(0, 2.25, 10.1);
  controlRoomGroup.add(crDoor);

  const mastGeo = new THREE.CylinderGeometry(0.2, 0.4, 14, 8);
  const mastMesh = new THREE.Mesh(mastGeo, galvanizedPipeMat);
  mastMesh.position.set(8, 17.7, 0);
  controlRoomGroup.add(mastMesh);

  registerReactive(crBase, charredWallMat);
  registerReactive(crRoof, charredWallMat, true, new THREE.Euler(0.04, 0, -0.05), new THREE.Vector3(0, 9.8, 0));
  registerReactive(crWinMesh, shatteredGlassMat);
  group.add(controlRoomGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. OVERHEAD HIGH-CLEARANCE PIPE BRIDGES (Spanning Roads, Clearance 11.5m)
  // ──────────────────────────────────────────────────────────────────────────
  const createOverheadPipeBridge = (x: number, z: number, length: number, rotY = 0) => {
    const bridge = new THREE.Group();
    bridge.position.set(x, 0, z);
    bridge.rotation.y = rotY;

    for (let px of [-length / 2 + 2, length / 2 - 2]) {
      const legA = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12, 0.9), galvanizedPipeMat);
      legA.position.set(px, 6, -3.0);
      bridge.add(legA);

      const legB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12, 0.9), galvanizedPipeMat);
      legB.position.set(px, 6, 3.0);
      bridge.add(legB);
    }

    const beamMesh = new THREE.Mesh(new THREE.BoxGeometry(length, 1.4, 6.5), galvanizedPipeMat);
    beamMesh.position.set(0, 12.2, 0);
    beamMesh.castShadow = true;
    bridge.add(beamMesh);

    const pipeMats = [yellowGasPipeMat, blueCoolantPipeMat, redFirePipeMat, galvanizedPipeMat];
    for (let p = 0; p < 4; p++) {
      const pGeo = new THREE.CylinderGeometry(0.38, 0.38, length + 4, 12);
      const pMesh = new THREE.Mesh(pGeo, pipeMats[p % pipeMats.length]);
      pMesh.rotation.z = Math.PI / 2;
      pMesh.position.set(0, 13.4 + p * 0.45, (p - 1.5) * 1.2);
      bridge.add(pMesh);
    }

    group.add(bridge);
  };

  createOverheadPipeBridge(0, -100, 48, 0);
  createOverheadPipeBridge(0, 100, 48, 0);
  createOverheadPipeBridge(100, 0, 48, Math.PI / 2);
  createOverheadPipeBridge(-100, 0, 48, Math.PI / 2);

  // ──────────────────────────────────────────────────────────────────────────
  // 8. RADIAL BLAST WAVE FAILURE CONTROLLER
  // ──────────────────────────────────────────────────────────────────────────
  const updateBlastWave = (blastRadiusM: number, delta: number, time: number) => {
    reactiveStructures.forEach((struct) => {
      if (blastRadiusM >= struct.distFromOrigin) {
        if (!struct.isTriggered) {
          struct.isTriggered = true;
          struct.mesh.material = struct.charredMat;
        }

        if (struct.canCollapse && struct.collapseProgress < 1.0) {
          struct.collapseProgress += delta * 1.6;
          const t = Math.min(1.0, struct.collapseProgress);

          if (struct.damagedPos) {
            struct.mesh.position.lerpVectors(struct.initialPos, struct.damagedPos, t);
          }
          if (struct.damagedRot) {
            struct.mesh.rotation.x = THREE.MathUtils.lerp(struct.initialRot.x, struct.damagedRot.x, t);
            struct.mesh.rotation.y = THREE.MathUtils.lerp(struct.initialRot.y, struct.damagedRot.y, t);
            struct.mesh.rotation.z = THREE.MathUtils.lerp(struct.initialRot.z, struct.damagedRot.z, t);
          }
        }
      }
    });
  };

  const resetDamage = () => {
    reactiveStructures.forEach((struct) => {
      struct.isTriggered = false;
      struct.collapseProgress = 0;
      struct.mesh.material = struct.initialMat;
      struct.mesh.position.copy(struct.initialPos);
      struct.mesh.rotation.copy(struct.initialRot);
    });
  };

  scene.add(group);

  return {
    group,
    updateBlastWave,
    resetDamage,
  };
};
