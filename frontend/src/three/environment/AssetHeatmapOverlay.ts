// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Facility Asset Health & Risk Heatmap Overlay
// Renders dynamic 3D risk markers, glowing boundary decals, and click raycasting
// for all 8 monitored petrochemical infrastructure assets
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { AssetRiskProfile, TacticalOverlayMode, AssetRiskState } from '../../simulation/types';

export interface AssetHeatmapComponents {
  group: THREE.Group;
  updateAssetProfiles: (profiles: AssetRiskProfile[], mode: TacticalOverlayMode) => void;
  getAssetAtPointer: (e: MouseEvent, container: HTMLElement, camera: THREE.Camera) => AssetRiskProfile | null;
  dispose: () => void;
}

const RISK_COLOR_HEX = {
  CRITICAL: 0xef4444, // Red
  HIGH: 0xf97316,     // Orange
  ELEVATED: 0xeab308, // Yellow
  LOW: 0x06b6d4,      // Cyan
  SAFE: 0x22c55e,     // Green
};

export const createAssetHeatmapOverlay = (scene: THREE.Scene): AssetHeatmapComponents => {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  let currentMode: TacticalOverlayMode = 'OFF';
  let cachedProfiles: AssetRiskProfile[] = [];

  // Reusable raycaster for asset clicks
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Keep track of clickable visual meshes and their associated profile
  const assetMeshes: { mesh: THREE.Mesh; profile: AssetRiskProfile }[] = [];

  const createMarkerVisuals = (profiles: AssetRiskProfile[], mode: TacticalOverlayMode) => {
    // Clear previous visuals
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        if (Array.isArray((obj as any).material)) {
          (obj as any).material.forEach((m: any) => m.dispose());
        } else {
          (obj as any).material.dispose();
        }
      }
    }
    assetMeshes.length = 0;

    if (mode === 'OFF' || profiles.length === 0) {
      group.visible = false;
      return;
    }

    group.visible = true;

    profiles.forEach((profile) => {
      const [x, y, z] = profile.worldPosition;
      const color = RISK_COLOR_HEX[profile.riskState] || 0x22c55e;

      // 1. Glowing Ground Footprint Decal Ring
      const ringRadius = Math.max(8, profile.distanceM * 0.12);
      const ringGeo = new THREE.RingGeometry(ringRadius - 1.2, ringRadius + 1.2, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: profile.riskState === 'CRITICAL' ? 0.85 : 0.55,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(x, 0.45, z);
      group.add(ringMesh);

      // 2. 3D Bounding Target Pillar (Clickable Mesh)
      const pillarGeo = new THREE.CylinderGeometry(ringRadius * 0.85, ringRadius * 0.85, 4.0, 16);
      const pillarMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: profile.riskState === 'CRITICAL' ? 0.25 : 0.12,
        depthWrite: false,
        wireframe: true,
      });
      const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
      pillarMesh.position.set(x, y + 2.0, z);
      group.add(pillarMesh);

      assetMeshes.push({ mesh: pillarMesh, profile });

      // 3. Floating Tactical Indicator Gem (Above Asset)
      const gemGeo = new THREE.OctahedronGeometry(2.2, 0);
      const gemMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });
      const gemMesh = new THREE.Mesh(gemGeo, gemMat);
      gemMesh.position.set(x, y + 16.0, z);
      group.add(gemMesh);
    });
  };

  const updateAssetProfiles = (profiles: AssetRiskProfile[], mode: TacticalOverlayMode) => {
    currentMode = mode;
    cachedProfiles = profiles;
    createMarkerVisuals(profiles, mode);
  };

  const getAssetAtPointer = (
    e: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): AssetRiskProfile | null => {
    if (currentMode === 'OFF' || assetMeshes.length === 0) return null;

    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const meshesToTest = assetMeshes.map((am) => am.mesh);
    const hits = raycaster.intersectObjects(meshesToTest, false);

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const found = assetMeshes.find((am) => am.mesh === hitMesh);
      return found ? found.profile : null;
    }

    return null;
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    updateAssetProfiles,
    getAssetAtPointer,
    dispose,
  };
};
