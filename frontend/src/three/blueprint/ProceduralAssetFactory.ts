// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 Procedural 3D Industrial Asset Factory
// High-quality procedural geometry & PBR materials for blueprint-derived structures
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { FacilityAsset } from '../../simulation/blueprintTypes';

export interface ProceduralAssetComponents {
  meshGroup: THREE.Group;
  assetId: string;
  worldPosition: THREE.Vector3;
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
  for (let i = 0; i < legCount; i++) {
    const angle = (i * 2 * Math.PI) / legCount;
    const lx = Math.cos(angle) * legRadius;
    const lz = Math.sin(angle) * legRadius;

    const legGeo = new THREE.CylinderGeometry(0.35, 0.4, radius + 2.5, 12);
    const legMesh = new THREE.Mesh(legGeo, structuralSteelMat);
    legMesh.position.set(lx, (radius + 2.5) / 2, lz);
    legMesh.castShadow = true;
    group.add(legMesh);

    // Concrete Footing Pier
    const pierGeo = new THREE.CylinderGeometry(0.7, 0.9, 0.8, 12);
    const pierMesh = new THREE.Mesh(pierGeo, concreteMat);
    pierMesh.position.set(lx, 0.4, lz);
    group.add(pierMesh);
  }

  // Top Relief Valve & Flange
  const valveGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.8, 12);
  const valveMesh = new THREE.Mesh(valveGeo, structuralSteelMat);
  valveMesh.position.set(0, radius * 2 + 3.0, 0);
  group.add(valveMesh);

  return group;
};

// ── 2. Horizontal LPG Bullet Tank Builder ───────────────────────────────────
export const buildLpgBulletAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const length = Math.max(12.0, asset.worldDimensions.width);
  const radius = Math.max(2.5, asset.worldDimensions.depth / 2);
  const vesselMat = isSelected ? steelVesselSelectedMat : steelVesselWhiteMat;

  // Main Cylinder
  const cylGeo = new THREE.CylinderGeometry(radius, radius, length - radius * 2, 24);
  const cylMesh = new THREE.Mesh(cylGeo, vesselMat);
  cylMesh.rotation.z = Math.PI / 2;
  cylMesh.position.set(0, radius + 1.5, 0);
  cylMesh.castShadow = true;
  cylMesh.receiveShadow = true;
  group.add(cylMesh);

  // Hemispherical End Caps
  for (let side of [-1, 1]) {
    const capGeo = new THREE.SphereGeometry(radius, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMesh = new THREE.Mesh(capGeo, vesselMat);
    capMesh.rotation.z = (side * Math.PI) / 2;
    capMesh.position.set(side * ((length - radius * 2) / 2), radius + 1.5, 0);
    capMesh.castShadow = true;
    group.add(capMesh);
  }

  // Dual Concrete Support Saddles
  for (let side of [-1, 1]) {
    const saddleGeo = new THREE.BoxGeometry(2.0, 1.6, radius * 2.4);
    const saddleMesh = new THREE.Mesh(saddleGeo, concreteMat);
    saddleMesh.position.set(side * (length * 0.28), 0.8, 0);
    saddleMesh.castShadow = true;
    group.add(saddleMesh);
  }

  return group;
};

// ── 3. Atmospheric Cylindrical Storage Tank Builder ─────────────────────────
export const buildStorageTankAsset = (
  asset: FacilityAsset,
  isFireWater = false,
  isSelected = false
): THREE.Group => {
  const group = new THREE.Group();
  const radius = Math.max(5.0, asset.worldDimensions.width / 2);
  const height = Math.max(8.0, asset.worldDimensions.height);
  const vesselMat = isSelected
    ? steelVesselSelectedMat
    : isFireWater
    ? fireWaterMat
    : steelVesselWhiteMat;

  // Tank Shell
  const tankGeo = new THREE.CylinderGeometry(radius, radius, height, 32);
  const tankMesh = new THREE.Mesh(tankGeo, vesselMat);
  tankMesh.position.set(0, height / 2, 0);
  tankMesh.castShadow = true;
  tankMesh.receiveShadow = true;
  group.add(tankMesh);

  // Conical Roof
  const roofGeo = new THREE.ConeGeometry(radius + 0.3, 1.8, 32);
  const roofMesh = new THREE.Mesh(roofGeo, structuralSteelMat);
  roofMesh.position.set(0, height + 0.9, 0);
  group.add(roofMesh);

  return group;
};

// ── 4. Industrial Process Building & Control Room Builder ───────────────────
export const buildBuildingAsset = (
  asset: FacilityAsset,
  variant: 'CONTROL_ROOM' | 'WAREHOUSE' | 'MAINTENANCE_SHOP' | 'FIRE_PUMP' | 'GENERIC' = 'GENERIC',
  isSelected = false
): THREE.Group => {
  const group = new THREE.Group();
  const width = Math.max(8.0, asset.worldDimensions.width);
  const depth = Math.max(6.0, asset.worldDimensions.depth);
  const height = Math.max(5.0, asset.worldDimensions.height);

  let wallMat = buildingWallMat;
  if (isSelected) wallMat = steelVesselSelectedMat;
  else if (variant === 'CONTROL_ROOM') wallMat = controlRoomMat;
  else if (variant === 'FIRE_PUMP') wallMat = firePumpHouseMat;

  // Main Building Block
  const bldgGeo = new THREE.BoxGeometry(width, height, depth);
  const bldgMesh = new THREE.Mesh(bldgGeo, wallMat);
  bldgMesh.position.set(0, height / 2, 0);
  bldgMesh.castShadow = true;
  bldgMesh.receiveShadow = true;
  group.add(bldgMesh);

  // Roof
  const roofGeo = new THREE.BoxGeometry(width + 0.8, 0.8, depth + 0.8);
  const roofMesh = new THREE.Mesh(roofGeo, roofMat);
  roofMesh.position.set(0, height + 0.4, 0);
  roofMesh.castShadow = true;
  group.add(roofMesh);

  // Entry Doors & Windows
  const doorGeo = new THREE.BoxGeometry(Math.min(4.0, width * 0.3), 3.2, 0.2);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 1.6, depth / 2 + 0.05);
  group.add(doorMesh);

  return group;
};

// ── 5. Pipe Rack Girder Bridge Builder ──────────────────────────────────────
export const buildPipeRackAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const length = Math.max(15.0, asset.worldDimensions.width);
  const height = 6.0;

  const bentCount = Math.max(2, Math.floor(length / 8));
  for (let i = 0; i <= bentCount; i++) {
    const x = -length / 2 + (i * length) / bentCount;

    for (let z of [-1.5, 1.5]) {
      const colGeo = new THREE.BoxGeometry(0.4, height, 0.4);
      const colMesh = new THREE.Mesh(colGeo, structuralSteelMat);
      colMesh.position.set(x, height / 2, z);
      colMesh.castShadow = true;
      group.add(colMesh);
    }

    const girderGeo = new THREE.BoxGeometry(0.4, 0.4, 3.4);
    const girderMesh = new THREE.Mesh(girderGeo, structuralSteelMat);
    girderMesh.position.set(x, height - 0.2, 0);
    group.add(girderMesh);
  }

  for (let z of [-1.0, 0.0, 1.0]) {
    const pipeMat = z === 0.0 ? pipelineYellowMat : pipelineInsulatedMat;
    const pipeGeo = new THREE.CylinderGeometry(0.35, 0.35, length, 16);
    const pipeMesh = new THREE.Mesh(pipeGeo, pipeMat);
    pipeMesh.rotation.z = Math.PI / 2;
    pipeMesh.position.set(0, height + 0.35, z);
    pipeMesh.castShadow = true;
    group.add(pipeMesh);
  }

  return group;
};

// ── 6. Industrial Flare / Vent Stack Builder ────────────────────────────────
export const buildStackAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const height = Math.max(25.0, asset.worldDimensions.height);
  const bottomRadius = 2.0;
  const topRadius = 1.0;

  const stackGeo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 24);
  const stackMesh = new THREE.Mesh(stackGeo, structuralSteelMat);
  stackMesh.position.set(0, height / 2, 0);
  stackMesh.castShadow = true;
  group.add(stackMesh);

  // Top Flare Tip
  const tipGeo = new THREE.CylinderGeometry(1.2, 1.0, 3.0, 24);
  const tipMesh = new THREE.Mesh(tipGeo, flareStackMat);
  tipMesh.position.set(0, height + 1.5, 0);
  group.add(tipMesh);

  return group;
};

// ── 7. Cooling Tower Builder ────────────────────────────────────────────────
export const buildCoolingTowerAsset = (asset: FacilityAsset, isSelected = false): THREE.Group => {
  const group = new THREE.Group();
  const width = Math.max(12.0, asset.worldDimensions.width);
  const depth = Math.max(10.0, asset.worldDimensions.depth);
  const height = 10.0;

  // Main Basin Structure
  const basinGeo = new THREE.BoxGeometry(width, height, depth);
  const basinMesh = new THREE.Mesh(basinGeo, concreteMat);
  basinMesh.position.set(0, height / 2, 0);
  basinMesh.castShadow = true;
  group.add(basinMesh);

  // Dual Top Fan Cowls
  for (let side of [-width * 0.25, width * 0.25]) {
    const cowlGeo = new THREE.CylinderGeometry(2.5, 3.0, 2.0, 20);
    const cowlMesh = new THREE.Mesh(cowlGeo, structuralSteelMat);
    cowlMesh.position.set(side, height + 1.0, 0);
    group.add(cowlMesh);
  }

  return group;
};

// ── 8. Assembly Point Ground Pad Builder ────────────────────────────────────
export const buildAssemblyPointAsset = (asset: FacilityAsset): THREE.Group => {
  const group = new THREE.Group();
  const width = Math.max(8.0, asset.worldDimensions.width);
  const depth = Math.max(8.0, asset.worldDimensions.depth);

  const padGeo = new THREE.BoxGeometry(width, 0.15, depth);
  const padMesh = new THREE.Mesh(padGeo, greenAssemblyMat);
  padMesh.position.set(0, 0.08, 0);
  padMesh.receiveShadow = true;
  group.add(padMesh);

  return group;
};

// ── 9. Master Procedural Asset Dispatcher ───────────────────────────────────
export const createProceduralAssetMesh = (
  asset: FacilityAsset,
  isSelected = false
): ProceduralAssetComponents => {
  let meshGroup: THREE.Group;

  switch (asset.type) {
    case 'LPG_SPHERE':
      meshGroup = buildLpgSphereAsset(asset, isSelected);
      break;
    case 'LPG_BULLET_TANK':
      meshGroup = buildLpgBulletAsset(asset, isSelected);
      break;
    case 'STORAGE_TANK':
      meshGroup = buildStorageTankAsset(asset, false, isSelected);
      break;
    case 'FIRE_WATER_TANK':
      meshGroup = buildStorageTankAsset(asset, true, isSelected);
      break;
    case 'CONTROL_ROOM':
      meshGroup = buildBuildingAsset(asset, 'CONTROL_ROOM', isSelected);
      break;
    case 'FIRE_PUMP_HOUSE':
      meshGroup = buildBuildingAsset(asset, 'FIRE_PUMP', isSelected);
      break;
    case 'WAREHOUSE':
      meshGroup = buildBuildingAsset(asset, 'WAREHOUSE', isSelected);
      break;
    case 'MAINTENANCE_SHOP':
      meshGroup = buildBuildingAsset(asset, 'MAINTENANCE_SHOP', isSelected);
      break;
    case 'PUMP_HOUSE':
    case 'PROCESS_AREA':
    case 'UTILITY_AREA':
    case 'ELECTRICAL_SUBSTATION':
    case 'TRUCK_LOADING_BAY':
    case 'BUILDING':
    case 'ADMIN_BUILDING':
    case 'OPERATIONS_BUILDING':
    case 'OTHER_BUILDING':
      meshGroup = buildBuildingAsset(asset, 'GENERIC', isSelected);
      break;
    case 'PIPE_RACK':
      meshGroup = buildPipeRackAsset(asset, isSelected);
      break;
    case 'FLARE_STACK':
    case 'PROCESS_VESSEL':
    case 'PROCESS_COLUMN':
      meshGroup = buildStackAsset(asset, isSelected);
      break;
    case 'COOLING_TOWER':
      meshGroup = buildCoolingTowerAsset(asset, isSelected);
      break;
    case 'ASSEMBLY_POINT':
      meshGroup = buildAssemblyPointAsset(asset);
      break;
    default:
      meshGroup = buildBuildingAsset(asset, 'GENERIC', isSelected);
      break;
  }

  meshGroup.position.set(asset.worldPos.x, 0, asset.worldPos.z);
  if (asset.rotationDeg) {
    meshGroup.rotation.y = (asset.rotationDeg * Math.PI) / 180;
  }

  (meshGroup as any).userData = {
    assetId: asset.id,
    assetType: asset.type,
    assetName: asset.name,
  };

  const dispose = () => {
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
    dispose,
  };
};
