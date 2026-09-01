// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Radial Ground Dust Wave, Ballistic Debris & Secondary Hotspots Engine
// (Visible strictly upon and after explosion event; zero pre-blast artifacts)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { createSmokePuffTexture, createEmberTexture } from './vfxTextures';

export interface BlastDebrisComponents {
  group: THREE.Group;
  triggerBlast: (origin: THREE.Vector3, maxRadius?: number) => void;
  update: (delta: number, time: number, blastWaveRadius: number, windDirDeg: number, windSpeedMs: number) => void;
  reset: () => void;
}

export const createBlastDebrisSystem = (scene: THREE.Scene): BlastDebrisComponents => {
  const group = new THREE.Group();

  let isActive = false;
  let elapsed = 0;
  let maxBlastRadius = 180;

  // ──────────────────────────────────────────────────────────────────────────
  // 1. RADIAL GROUND DUST RING
  // ──────────────────────────────────────────────────────────────────────────
  const dustCount = 320;
  const dustGeo = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocities = new Float32Array(dustCount * 3);
  const dustScales = new Float32Array(dustCount);
  const dustLife = new Float32Array(dustCount);

  const dustTex = createSmokePuffTexture();

  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3 + 0] = 0;
    dustPositions[i * 3 + 1] = 0.8;
    dustPositions[i * 3 + 2] = 0;

    const angle = (i / dustCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const speed = 45 + Math.random() * 65;
    dustVelocities[i * 3 + 0] = Math.cos(angle) * speed;
    dustVelocities[i * 3 + 1] = 0.5 + Math.random() * 2.5;
    dustVelocities[i * 3 + 2] = Math.sin(angle) * speed;

    dustScales[i] = 16.0 + Math.random() * 18.0;
    dustLife[i] = 0;
  }

  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute('scale', new THREE.BufferAttribute(dustScales, 1));

  const dustMat = new THREE.PointsMaterial({
    map: dustTex,
    size: 28.0,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const dustMesh = new THREE.Points(dustGeo, dustMat);
  dustMesh.visible = false;
  group.add(dustMesh);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BALLISTIC FLYING DEBRIS FRAGMENTS (Instanced Mesh)
  // ──────────────────────────────────────────────────────────────────────────
  const debrisCount = 140;
  const debrisGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
  const debrisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.3,
  });

  const debrisInstMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
  debrisInstMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  debrisInstMesh.castShadow = false;
  debrisInstMesh.receiveShadow = false;
  debrisInstMesh.visible = false;
  group.add(debrisInstMesh);

  interface DebrisParticle {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    rot: THREE.Euler;
    rotVel: THREE.Vector3;
    landed: boolean;
  }

  const debrisList: DebrisParticle[] = [];
  const dummy = new THREE.Object3D();

  for (let i = 0; i < debrisCount; i++) {
    dummy.position.set(0, -100, 0);
    dummy.updateMatrix();
    debrisInstMesh.setMatrixAt(i, dummy.matrix);

    debrisList.push({
      pos: new THREE.Vector3(0, -100, 0),
      vel: new THREE.Vector3(0, 0, 0),
      rot: new THREE.Euler(0, 0, 0),
      rotVel: new THREE.Vector3(0, 0, 0),
      landed: true,
    });
  }
  debrisInstMesh.instanceMatrix.needsUpdate = true;

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SECONDARY LOCALIZED SMOKE & FIRE HOTSPOTS
  // ──────────────────────────────────────────────────────────────────────────
  const hotspotPositions = [
    new THREE.Vector3(-60, 0, -25),
    new THREE.Vector3(55, 0, -50),
    new THREE.Vector3(-45, 0, 45),
  ];

  const hotspotEmberCount = 90;
  const hotspotGeo = new THREE.BufferGeometry();
  const hotspotPositionsArr = new Float32Array(hotspotEmberCount * 3);
  const hotspotVel = new Float32Array(hotspotEmberCount * 3);
  const hotspotLife = new Float32Array(hotspotEmberCount);

  const emberTex = createEmberTexture();

  for (let i = 0; i < hotspotEmberCount; i++) {
    const spot = hotspotPositions[i % hotspotPositions.length];
    hotspotPositionsArr[i * 3 + 0] = spot.x + (Math.random() - 0.5) * 6;
    hotspotPositionsArr[i * 3 + 1] = spot.y + Math.random() * 2;
    hotspotPositionsArr[i * 3 + 2] = spot.z + (Math.random() - 0.5) * 6;

    hotspotVel[i * 3 + 0] = (Math.random() - 0.5) * 2;
    hotspotVel[i * 3 + 1] = 3.0 + Math.random() * 5.0;
    hotspotVel[i * 3 + 2] = (Math.random() - 0.5) * 2;
    hotspotLife[i] = Math.random() * 2.5;
  }

  hotspotGeo.setAttribute('position', new THREE.BufferAttribute(hotspotPositionsArr, 3));

  const hotspotMat = new THREE.PointsMaterial({
    map: emberTex,
    size: 2.5,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const hotspotMesh = new THREE.Points(hotspotGeo, hotspotMat);
  hotspotMesh.visible = false;
  group.add(hotspotMesh);

  // Secondary Hotspot Point Lights
  const hotspotLights: THREE.PointLight[] = [];
  hotspotPositions.forEach((pos) => {
    const pl = new THREE.PointLight(0xf97316, 0, 45, 1.5);
    pl.position.copy(pos).add(new THREE.Vector3(0, 2.5, 0));
    group.add(pl);
    hotspotLights.push(pl);
  });

  const triggerBlast = (origin: THREE.Vector3, maxR = 180) => {
    isActive = true;
    elapsed = 0;
    maxBlastRadius = maxR;
    dustMat.opacity = 0.85;
    dustMesh.visible = true;
    debrisInstMesh.visible = true;

    // Reset dust positions at blast origin
    const dustPosAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      dustPosAttr.setXYZ(i, origin.x, 0.6, origin.z);
      dustLife[i] = 0;
    }
    dustPosAttr.needsUpdate = true;

    // Launch Ballistic Debris from center
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 55;
      const upSpeed = 12 + Math.random() * 32;

      debrisList[i] = {
        pos: new THREE.Vector3(
          origin.x + (Math.random() - 0.5) * 12,
          origin.y + 4 + Math.random() * 10,
          origin.z + (Math.random() - 0.5) * 12
        ),
        vel: new THREE.Vector3(Math.cos(angle) * speed, upSpeed, Math.sin(angle) * speed),
        rot: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 12
        ),
        landed: false,
      };
    }
  };

  const reset = () => {
    isActive = false;
    elapsed = 0;
    dustMat.opacity = 0;
    dustMesh.visible = false;
    debrisInstMesh.visible = false;
    hotspotMat.opacity = 0;
    hotspotMesh.visible = false;
    hotspotLights.forEach((pl) => (pl.intensity = 0));

    // Hide debris underground
    for (let i = 0; i < debrisCount; i++) {
      dummy.position.set(0, -100, 0);
      dummy.updateMatrix();
      debrisInstMesh.setMatrixAt(i, dummy.matrix);
      debrisList[i].landed = true;
    }
    debrisInstMesh.instanceMatrix.needsUpdate = true;
  };

  const update = (
    delta: number,
    time: number,
    blastWaveRadius: number,
    windDirDeg: number,
    windSpeedMs: number
  ) => {
    if (!isActive) return;
    elapsed += delta;

    // 1. Update Expanding Dust Wave
    if (elapsed < 4.5) {
      dustMesh.visible = true;
      dustMat.opacity = Math.max(0, (1 - elapsed / 4.5) * 0.85);
      const dustPosAttr = dustGeo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < dustCount; i++) {
        const px = dustPosAttr.getX(i) + dustVelocities[i * 3 + 0] * delta;
        const py = Math.min(3.5, dustPosAttr.getY(i) + dustVelocities[i * 3 + 1] * delta);
        const pz = dustPosAttr.getZ(i) + dustVelocities[i * 3 + 2] * delta;
        dustPosAttr.setXYZ(i, px, py, pz);
      }
      dustPosAttr.needsUpdate = true;
    } else {
      dustMat.opacity = 0;
      dustMesh.visible = false;
    }

    // 2. Update Ballistic Flying Debris
    let matrixUpdated = false;
    for (let i = 0; i < debrisCount; i++) {
      const d = debrisList[i];
      if (!d.landed) {
        d.vel.y -= 32 * delta;
        d.pos.x += d.vel.x * delta;
        d.pos.y += d.vel.y * delta;
        d.pos.z += d.vel.z * delta;

        d.rot.x += d.rotVel.x * delta;
        d.rot.y += d.rotVel.y * delta;
        d.rot.z += d.rotVel.z * delta;

        if (d.pos.y <= 0.3) {
          d.pos.y = 0.3;
          d.landed = true;
          d.vel.set(0, 0, 0);
        }

        dummy.position.copy(d.pos);
        dummy.rotation.copy(d.rot);
        dummy.updateMatrix();
        debrisInstMesh.setMatrixAt(i, dummy.matrix);
        matrixUpdated = true;
      }
    }
    if (matrixUpdated) {
      debrisInstMesh.instanceMatrix.needsUpdate = true;
    }

    // 3. Secondary Localized Hotspots (Ignites once shockwave passes)
    if (elapsed > 2.0) {
      hotspotMesh.visible = true;
      const spotIntensity = Math.min(1.0, (elapsed - 2.0) / 1.5);
      hotspotMat.opacity = spotIntensity * 0.85;

      const f = 1.0 + Math.sin(time * 16.0) * 0.3;
      hotspotLights.forEach((pl) => {
        pl.intensity = spotIntensity * 3.5 * f;
      });

      const wRad = (windDirDeg * Math.PI) / 180;
      const windVx = -Math.sin(wRad) * (windSpeedMs * 0.8);
      const windVz = -Math.cos(wRad) * (windSpeedMs * 0.8);

      const hotAttr = hotspotGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < hotspotEmberCount; i++) {
        hotspotLife[i] += delta;
        if (hotspotLife[i] >= 2.5) {
          hotspotLife[i] = 0;
          const spot = hotspotPositions[i % hotspotPositions.length];
          hotAttr.setXYZ(
            i,
            spot.x + (Math.random() - 0.5) * 6,
            0.5,
            spot.z + (Math.random() - 0.5) * 6
          );
        } else {
          const px = hotAttr.getX(i) + (hotspotVel[i * 3 + 0] + windVx) * delta;
          const py = hotAttr.getY(i) + hotspotVel[i * 3 + 1] * delta;
          const pz = hotAttr.getZ(i) + (hotspotVel[i * 3 + 2] + windVz) * delta;
          hotAttr.setXYZ(i, px, py, pz);
        }
      }
      hotAttr.needsUpdate = true;
    }
  };

  scene.add(group);

  return {
    group,
    triggerBlast,
    update,
    reset,
  };
};
