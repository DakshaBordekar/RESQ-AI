// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Procedural 3D Industrial Asset Factory
// High-quality procedural geometry & PBR materials for blueprint-derived structures
// Supports real tank rupture (setDestroyed) and structural blast scorching (setScorched)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { FacilityAsset } from '../../simulation/blueprintTypes';

export interface ProceduralAssetComponents {
  meshGroup: THREE.Group;
  assetId: string;
  worldPosition: THREE.Vector3;
  setDestroyed: (destroyed: boolean) => void;
  setScorched: (scorched: boolean) => void;
  dispose: () => void;
}

// ── Shared Materials Cache ──────────────────────────────────────────────────
const concreteMat = new THREE.MeshStandardMaterial({
  color: 0x94a3b8,
  roughness: 0.8,
  metalness: 0.1,
});

const steelVesselWhiteMat = new THREE.MeshStandardMaterial({
  color: 0xf1f5f9,
  roughness: 0.3,
  metalness: 0.35,
});

const steelVesselSelectedMat = new THREE.MeshStandardMaterial({
  color: 0x38bdf8,
  emissive: 0x0284c7,
  emissiveIntensity: 0.4,
  roughness: 0.25,
  metalness: 0.4,
});

const structuralSteelMat = new THREE.MeshStandardMaterial({
  color: 0x475569,
  roughness: 0.5,
  metalness: 0.6,
});

const fireWaterMat = new THREE.MeshStandardMaterial({
  color: 0x0284c7, // Distinct blue for fire water reservoir
  roughness: 0.3,
  metalness: 0.4,
});

const buildingWallMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.7,
  metalness: 0.15,
});

const controlRoomMat = new THREE.MeshStandardMaterial({
  color: 0x0f766e,
  roughness: 0.6,
  metalness: 0.2,
});

const firePumpHouseMat = new THREE.MeshStandardMaterial({
  color: 0x9f1239, // Deep red/rose fire pump shelter
  roughness: 0.6,
  metalness: 0.2,
});

const roofMat = new THREE.MeshStandardMaterial({
  color: 0x334155,
  roughness: 0.8,
  metalness: 0.2,
});

const pipelineInsulatedMat = new THREE.MeshStandardMaterial({
  color: 0x0284c7,
  roughness: 0.4,
  metalness: 0.5,
});

const pipelineYellowMat = new THREE.MeshStandardMaterial({
  color: 0xeab308,
  roughness: 0.4,
  metalness: 0.4,
});

const flareStackMat = new THREE.MeshStandardMaterial({
  color: 0xd97706,
  roughness: 0.5,
  metalness: 0.7,
});

const greenAssemblyMat = new THREE.MeshStandardMaterial({
  color: 0x16a34a,
  roughness: 0.9,
  metalness: 0.1,
});

// ── 1. LPG Spherical Storage Tank Builder ───────────────────────────────────
export const buildLpgSphereAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const radius = Math.max(5.0, asset.worldDimensions.width / 2);
  const sphereMat = isSelected ? steelVesselSelectedMat : steelVesselWhiteMat;

  // Primary High-Pressure Sphere
  const sphereGeo = new THREE.SphereGeometry(radius, 32, 24);
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  sphereMesh.position.set(0, radius + 2.5, 0);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  group.add(sphereMesh);

  // Equator Walkway Ring & Handrail
  const ringGeo = new THREE.RingGeometry(radius + 0.2, radius + 1.2, 32);
  const ringMesh = new THREE.Mesh(ringGeo, structuralSteelMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(0, radius + 2.5, 0);
  group.add(ringMesh);

  // Structural Support Columns (8 Legs around perimeter)
  const legRadius = radius * 0.88;
  const legCount = 8;
  const legGeo = new THREE.CylinderGeometry(0.35, 0.4, radius + 2.5, 12);

  for (let i = 0; i < legCount; i++) {
    const angle = (i / legCount) * Math.PI * 2;
    const legMesh = new THREE.Mesh(legGeo, structuralSteelMat);
    legMesh.position.set(
      Math.cos(angle) * legRadius,
      (radius + 2.5) / 2,
      Math.sin(angle) * legRadius
    );
    legMesh.castShadow = true;
    group.add(legMesh);
  }

  // Reinforced Concrete Foundation Pad
  const padGeo = new THREE.CylinderGeometry(radius * 1.2, radius * 1.25, 0.6, 32);
  const padMesh = new THREE.Mesh(padGeo, concreteMat);
  padMesh.position.set(0, 0.3, 0);
  padMesh.receiveShadow = true;
  group.add(padMesh);

  // Top Relief Valve & Instrumentation Nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.25, 0.35, 2.2, 12);
  const nozzleMesh = new THREE.Mesh(nozzleGeo, structuralSteelMat);
  nozzleMesh.position.set(0, radius * 2 + 3.6, 0);
  group.add(nozzleMesh);

  return group;
};

// ── 2. LPG Horizontal Bullet Tank Builder ───────────────────────────────────
export const buildLpgBulletAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const radius = Math.max(3.0, asset.worldDimensions.width / 2);
  const length = Math.max(12.0, asset.worldDimensions.depth);
  const vesselMat = isSelected ? steelVesselSelectedMat : steelVesselWhiteMat;

  // Main Cylindrical Body
  const cylGeo = new THREE.CylinderGeometry(radius, radius, length, 32);
  const cylMesh = new THREE.Mesh(cylGeo, vesselMat);
  cylMesh.rotation.z = Math.PI / 2;
  cylMesh.position.set(0, radius + 1.8, 0);
  cylMesh.castShadow = true;
  cylMesh.receiveShadow = true;
  group.add(cylMesh);

  // Hemispherical End Caps
  const capGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);

  const cap1 = new THREE.Mesh(capGeo, vesselMat);
  cap1.rotation.z = -Math.PI / 2;
  cap1.position.set(-length / 2, radius + 1.8, 0);
  cap1.castShadow = true;
  group.add(cap1);

  const cap2 = new THREE.Mesh(capGeo, vesselMat);
  cap2.rotation.z = Math.PI / 2;
  cap2.position.set(length / 2, radius + 1.8, 0);
  cap2.castShadow = true;
  group.add(cap2);

  // Dual Concrete Saddle Piers
  const saddleGeo = new THREE.BoxGeometry(length * 0.22, radius + 1.8, radius * 2.2);
  for (const offset of [-length * 0.28, length * 0.28]) {
    const saddle = new THREE.Mesh(saddleGeo, concreteMat);
    saddle.position.set(offset, (radius + 1.8) / 2, 0);
    saddle.castShadow = true;
    saddle.receiveShadow = true;
    group.add(saddle);
  }

  return group;
};

// ── 3. Atmospheric Vertical Storage Tank Builder ────────────────────────────
export const buildVerticalStorageTankAsset = (
  asset: FacilityAsset,
  isSelected = false
): THREE.Group => {
  const group = new THREE.Group();
  const radius = Math.max(6.0, asset.worldDimensions.width / 2);
  const height = Math.max(10.0, asset.worldDimensions.height);
  const isWater = asset.type === 'FIRE_WATER_TANK';
  const tankMat = isWater ? fireWaterMat : isSelected ? steelVesselSelectedMat : steelVesselWhiteMat;

  // Main Vertical Cylinder
  const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 36);
  const cylMesh = new THREE.Mesh(cylGeo, tankMat);
  cylMesh.position.set(0, height / 2 + 0.3, 0);
  cylMesh.castShadow = true;
  cylMesh.receiveShadow = true;
  group.add(cylMesh);

  // Conical / Domed Roof
  const roofGeo = new THREE.ConeGeometry(radius * 1.02, radius * 0.22, 36);
  const roofMesh = new THREE.Mesh(roofGeo, structuralSteelMat);
  roofMesh.position.set(0, height + radius * 0.11 + 0.3, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Concrete Foundation Ring Wall
  const baseGeo = new THREE.CylinderGeometry(radius * 1.08, radius * 1.12, 0.6, 36);
  const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
  baseMesh.position.set(0, 0.3, 0);
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  return group;
};

// ── 4. Industrial Building Builder ──────────────────────────────────────────
export const buildIndustrialBuildingAsset = (
  asset: FacilityAsset,
  isSelected = false
): THREE.Group => {
  const group = new THREE.Group();
  const w = Math.max(10.0, asset.worldDimensions.width);
  const d = Math.max(10.0, asset.worldDimensions.depth);
  const h = Math.max(5.0, asset.worldDimensions.height);

  let wallMat = buildingWallMat;
  if (asset.type === 'CONTROL_ROOM') wallMat = controlRoomMat;
  else if (asset.type === 'FIRE_PUMP_HOUSE') wallMat = firePumpHouseMat;

  // Main Building Block
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, wallMat);
  bodyMesh.position.set(0, h / 2 + 0.2, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Flat Roof Trim with Parapet
  const roofGeo = new THREE.BoxGeometry(w * 1.04, 0.4, d * 1.04);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.set(0, h + 0.4, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // HVAC Rooftop Unit
  const hvacGeo = new THREE.BoxGeometry(w * 0.25, 1.2, d * 0.25);
  const hvacMesh = new THREE.Mesh(hvacGeo, structuralSteelMat);
  hvacMesh.position.set(w * 0.2, h + 1.2, -d * 0.15);
  group.add(hvacMesh);

  return group;
};

// ── 5. Elevated Industrial Pipe Rack Builder ────────────────────────────────
export const buildPipeRackAsset = (asset: FacilityAsset): THREE.Group => {
  const group = new THREE.Group();
  const length = Math.max(16.0, asset.worldDimensions.depth || asset.worldDimensions.width);
  const width = 4.5;
  const height = 6.0;

  const bays = Math.max(2, Math.floor(length / 8));
  const baySpacing = length / bays;

  // Structural Portal Frames
  const colGeo = new THREE.BoxGeometry(0.35, height, 0.35);
  const beamGeo = new THREE.BoxGeometry(width, 0.35, 0.35);

  for (let i = 0; i <= bays; i++) {
    const z = -length / 2 + i * baySpacing;

    // Left Column
    const colL = new THREE.Mesh(colGeo, structuralSteelMat);
    colL.position.set(-width / 2, height / 2, z);
    colL.castShadow = true;
    group.add(colL);

    // Right Column
    const colR = new THREE.Mesh(colGeo, structuralSteelMat);
    colR.position.set(width / 2, height / 2, z);
    colR.castShadow = true;
    group.add(colR);

    // Transverse Beams (Tier 1 & Tier 2)
    const beam1 = new THREE.Mesh(beamGeo, structuralSteelMat);
    beam1.position.set(0, height * 0.55, z);
    group.add(beam1);

    const beam2 = new THREE.Mesh(beamGeo, structuralSteelMat);
    beam2.position.set(0, height, z);
    group.add(beam2);
  }

  // Longitudinal Utility Pipes along the rack
  const pipeGeo = new THREE.CylinderGeometry(0.2, 0.2, length, 12);

  const pipe1 = new THREE.Mesh(pipeGeo, pipelineInsulatedMat);
  pipe1.rotation.x = Math.PI / 2;
  pipe1.position.set(-1.2, height * 0.55 + 0.35, 0);
  group.add(pipe1);

  const pipe2 = new THREE.Mesh(pipeGeo, pipelineYellowMat);
  pipe2.rotation.x = Math.PI / 2;
  pipe2.position.set(0.2, height * 0.55 + 0.35, 0);
  group.add(pipe2);

  const pipe3 = new THREE.Mesh(pipeGeo, pipelineInsulatedMat);
  pipe3.rotation.x = Math.PI / 2;
  pipe3.position.set(1.4, height + 0.35, 0);
  group.add(pipe3);

  return group;
};

// ── 6. Flare Stack Builder ─────────────────────────────────────────────────
export const buildFlareStackAsset = (asset: FacilityAsset): THREE.Group => {
  const group = new THREE.Group();
  const height = Math.max(28.0, asset.worldDimensions.height || 32.0);

  // Tapered Vertical Stack Mast
  const stackGeo = new THREE.CylinderGeometry(0.6, 1.4, height, 16);
  const stackMesh = new THREE.Mesh(stackGeo, flareStackMat);
  stackMesh.position.set(0, height / 2, 0);
  stackMesh.castShadow = true;
  group.add(stackMesh);

  // Flare Tip Burner Assembly
  const tipGeo = new THREE.CylinderGeometry(1.1, 0.7, 2.5, 16);
  const tipMesh = new THREE.Mesh(tipGeo, structuralSteelMat);
  tipMesh.position.set(0, height + 1.25, 0);
  group.add(tipMesh);

  // Pilot Light Glow
  const pilotLight = new THREE.PointLight(0xf59e0b, 2.5, 45);
  pilotLight.position.set(0, height + 3.0, 0);
  group.add(pilotLight);

  return group;
};

// ── 7. Assembly / Muster Point Builder ──────────────────────────────────────
export const buildAssemblyPointAsset = (asset: FacilityAsset): THREE.Group => {
  const group = new THREE.Group();
  const w = Math.max(8.0, asset.worldDimensions.width);
  const d = Math.max(8.0, asset.worldDimensions.depth);

  const padGeo = new THREE.PlaneGeometry(w, d);
  const padMesh = new THREE.Mesh(padGeo, greenAssemblyMat);
  padMesh.rotation.x = -Math.PI / 2;
  padMesh.position.set(0, 0.04, 0);
  padMesh.receiveShadow = true;
  group.add(padMesh);

  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8);
  const pole = new THREE.Mesh(poleGeo, structuralSteelMat);
  pole.position.set(0, 1.75, 0);
  group.add(pole);

  return group;
};

// ── Master Dispatcher & Procedural Asset Mesh Generator ─────────────────────
export const createProceduralAssetMesh = (
  asset: FacilityAsset,
  isSelected = false
): ProceduralAssetComponents => {
  let meshGroup: THREE.Group;

  switch (asset.type) {
    case 'LPG_SPHERE':
      meshGroup = buildLpgSphereAsset(asset, isSelected);
      break;
    case 'LPG_BULLET':
    case 'LPG_BULLET_TANK':
      meshGroup = buildLpgBulletAsset(asset, isSelected);
      break;
    case 'STORAGE_TANK':
    case 'FIRE_WATER_TANK':
    case 'PROCESS_VESSEL':
    case 'PROCESS_COLUMN':
      meshGroup = buildVerticalStorageTankAsset(asset, isSelected);
      break;
    case 'CONTROL_ROOM':
    case 'WAREHOUSE':
    case 'FIRE_PUMP_HOUSE':
    case 'PUMP_HOUSE':
    case 'MAINTENANCE_SHOP':
    case 'ADMIN_BUILDING':
    case 'OPERATIONS_BUILDING':
    case 'ELECTRICAL_SUBSTATION':
    case 'BUILDING':
    case 'OTHER_BUILDING':
      meshGroup = buildIndustrialBuildingAsset(asset, isSelected);
      break;
    case 'PIPE_RACK':
      meshGroup = buildPipeRackAsset(asset);
      break;
    case 'FLARE_STACK':
      meshGroup = buildFlareStackAsset(asset);
      break;
    case 'ASSEMBLY_POINT':
      meshGroup = buildAssemblyPointAsset(asset);
      break;
    default:
      meshGroup = buildIndustrialBuildingAsset(asset, isSelected);
      break;
  }

  // Anchor in 3D scene at asset.worldPos
  meshGroup.position.set(asset.worldPos.x, 0, asset.worldPos.z);
  const initialRotY = ((asset.rotationDeg || 0) * Math.PI) / 180;
  meshGroup.rotation.y = initialRotY;
  meshGroup.userData = { assetId: asset.id, assetType: asset.type, name: asset.name };

  const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  meshGroup.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      originalMaterials.set(obj, obj.material);
    }
  });

  const charredMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.35,
    roughness: 0.95,
    metalness: 0.25,
  });

  const scorchedMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917, // Dark soot/charcoal scorched
    roughness: 0.95,
    metalness: 0.1,
  });

  // Physical collapse & charring on explodable vessels
  const setDestroyed = (destroyed: boolean) => {
    meshGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (destroyed) {
          obj.material = charredMat;
        } else {
          const orig = originalMaterials.get(obj);
          if (orig) obj.material = orig;
        }
      }
    });

    if (destroyed) {
      meshGroup.position.y = -0.6;
      meshGroup.rotation.z = -0.12;
      meshGroup.rotation.x = 0.08;
      meshGroup.scale.set(0.95, 0.72, 0.95);
    } else {
      meshGroup.position.y = 0;
      meshGroup.rotation.z = 0;
      meshGroup.rotation.x = 0;
      meshGroup.rotation.y = initialRotY;
      meshGroup.scale.set(1.0, 1.0, 1.0);
    }
  };

  // Scorched blackened damage on non-ignitable structural assets
  const setScorched = (scorched: boolean) => {
    meshGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (scorched) {
          obj.material = scorchedMat;
        } else {
          const orig = originalMaterials.get(obj);
          if (orig) obj.material = orig;
        }
      }
    });
  };

  const dispose = () => {
    charredMat.dispose();
    scorchedMat.dispose();
    meshGroup.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  };

  return {
    meshGroup,
    assetId: asset.id,
    worldPosition: new THREE.Vector3(asset.worldPos.x, asset.worldPos.y, asset.worldPos.z),
    setDestroyed,
    setScorched,
    dispose,
  };
};
