// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Mission Casualty & Worker Personnel Renderer
// High-visibility industrial worker models, floating priority badges,
// health auras, and dynamic rescue extraction pathlines.
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { MissionCasualty } from '../../simulation/missionTypes';

export interface MissionCasualtyRendererComponents {
  group: THREE.Group;
  updateCasualties: (casualties: MissionCasualty[], time: number) => void;
  getCasualtyAtPointer: (
    e: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ) => MissionCasualty | null;
  dispose: () => void;
}

const PRIORITY_COLORS = {
  P1_CRITICAL: 0xef4444, // Red
  P2_URGENT: 0xf97316,   // Orange
  P3_STABLE: 0xeab308,   // Yellow
  RESCUED: 0x10b981,     // Emerald Green
};

export const createMissionCasualtyRenderer = (
  scene: THREE.Scene,
  initialCasualties: MissionCasualty[]
): MissionCasualtyRendererComponents => {
  const group = new THREE.Group();
  scene.add(group);

  let currentCasualties = initialCasualties;

  // Cached materials
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0xf97316, // High-vis orange safety vest
    roughness: 0.4,
    metalness: 0.1,
  });

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x334155, // Dark blue work coveralls
    roughness: 0.7,
  });

  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15, // Yellow hardhat
    roughness: 0.3,
  });

  const bootsMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a, // Steel-toe work boots
    roughness: 0.8,
  });

  // Map of 3D meshes per casualty
  const casualtyMeshes: Map<
    string,
    {
      rootGroup: THREE.Group;
      auraMesh: THREE.Mesh;
      gemMesh: THREE.Mesh;
      beamMesh: THREE.Mesh;
      pathLine: THREE.Line;
    }
  > = new Map();

  // Create 3D worker model for each casualty
  initialCasualties.forEach((cas) => {
    const root = new THREE.Group();
    const [x, y, z] = cas.worldPos;
    root.position.set(x, y, z);
    (root as any).userData = { casualtyId: cas.id };

    // 1. Worker Character Model (Height ~ 1.8m, scaled 2.2x for tactical visibility)
    const charGroup = new THREE.Group();
    charGroup.scale.set(2.2, 2.2, 2.2);

    // Torso / High-Vis Vest
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.65, 0.3);
    const torso = new THREE.Mesh(torsoGeo, vestMat);
    torso.position.set(0, 0.95, 0);
    torso.castShadow = true;
    charGroup.add(torso);

    // Reflective Silver Strips on Vest
    const stripeGeo = new THREE.BoxGeometry(0.52, 0.08, 0.32);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0.98, 0);
    charGroup.add(stripe);

    // Head & Safety Hardhat
    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xd4a373 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.42, 0);
    charGroup.add(head);

    const helmetGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.16, 12);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 1.52, 0);
    charGroup.add(helmet);

    // Legs
    for (let lx of [-0.14, 0.14]) {
      const legGeo = new THREE.BoxGeometry(0.18, 0.65, 0.2);
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(lx, 0.45, 0);
      leg.castShadow = true;
      charGroup.add(leg);

      const bootGeo = new THREE.BoxGeometry(0.2, 0.15, 0.28);
      const boot = new THREE.Mesh(bootGeo, bootsMat);
      boot.position.set(lx, 0.08, 0.04);
      charGroup.add(boot);
    }
    root.add(charGroup);

    // 2. Ground Glowing Health Aura Ring
    const auraGeo = new THREE.RingGeometry(2.5, 3.2, 32);
    const auraMat = new THREE.MeshBasicMaterial({
      color: PRIORITY_COLORS[cas.priority],
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    auraMesh.position.set(0, 0.15, 0);
    root.add(auraMesh);

    // 3. Floating Tactical Indicator Gem (Above Head)
    const gemGeo = new THREE.OctahedronGeometry(1.2, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: PRIORITY_COLORS[cas.priority],
      emissive: PRIORITY_COLORS[cas.priority],
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    gemMesh.position.set(0, 5.5, 0);
    root.add(gemMesh);

    // 4. Vertical Tactical Strobe Beacon Pillar
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.0, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: PRIORITY_COLORS[cas.priority],
      transparent: true,
      opacity: 0.4,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.set(0, 2.5, 0);
    root.add(beamMesh);

    // 5. Extraction Route Line to Safe Zone
    const pathMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 2,
      gapSize: 1.5,
      linewidth: 2,
    });
    const pathGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, 0.3, z),
      new THREE.Vector3(x * 0.5, 0.3, z * 0.5),
      new THREE.Vector3(0, 0.3, -78),
    ]);
    const pathLine = new THREE.Line(pathGeo, pathMat);
    pathLine.computeLineDistances();
    group.add(pathLine);

    group.add(root);
    casualtyMeshes.set(cas.id, {
      rootGroup: root,
      auraMesh,
      gemMesh,
      beamMesh,
      pathLine,
    });
  });

  const updateCasualties = (casualties: MissionCasualty[], time: number) => {
    currentCasualties = casualties;

    casualties.forEach((cas) => {
      const meshObj = casualtyMeshes.get(cas.id);
      if (!meshObj) return;

      const { rootGroup, auraMesh, gemMesh, beamMesh, pathLine } = meshObj;

      // Color based on status
      const colorHex = cas.extracted
        ? PRIORITY_COLORS.RESCUED
        : PRIORITY_COLORS[cas.priority];

      (auraMesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      (gemMesh.material as THREE.MeshStandardMaterial).color.setHex(colorHex);
      (gemMesh.material as THREE.MeshStandardMaterial).emissive.setHex(colorHex);
      (beamMesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);

      // Pulse animation for critical unrescued casualties
      const pulse = cas.extracted
        ? 1.0
        : 1.0 + Math.sin(time * 5 + cas.distanceFromHazardM) * 0.25;

      gemMesh.scale.set(pulse, pulse, pulse);
      gemMesh.rotation.y = time * 2;
      gemMesh.position.y = 5.5 + Math.sin(time * 3) * 0.35;

      // When rescued, show green glow
      auraMesh.scale.set(pulse, pulse, 1.0);
      pathLine.visible = !cas.extracted;
    });
  };

  const getCasualtyAtPointer = (
    e: MouseEvent,
    container: HTMLElement,
    camera: THREE.Camera
  ): MissionCasualty | null => {
    const rect = container.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const checkObjects: THREE.Object3D[] = [];
    casualtyMeshes.forEach(({ rootGroup }) => {
      checkObjects.push(rootGroup);
    });

    const intersects = raycaster.intersectObjects(checkObjects, true);
    if (intersects.length > 0) {
      let topObj: THREE.Object3D | null = intersects[0].object;
      while (topObj && !topObj.userData?.casualtyId && topObj.parent) {
        topObj = topObj.parent;
      }
      if (topObj && topObj.userData?.casualtyId) {
        const found = currentCasualties.find((c) => c.id === topObj!.userData.casualtyId);
        return found || null;
      }
    }
    return null;
  };

  const dispose = () => {
    scene.remove(group);
  };

  return {
    group,
    updateCasualties,
    getCasualtyAtPointer,
    dispose,
  };
};
