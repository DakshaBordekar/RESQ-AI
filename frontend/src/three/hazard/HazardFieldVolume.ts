// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Physics Hazard Contour Volumes
// Semi-transparent volumetric contour zones (1 to 4) derived from physics models
// Supports COMBINED, THERMAL, and BLAST modes
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';
import { ThreatResponse, HazardMode } from '../../simulation/types';

const ZONE_CONFIGS = [
  {
    key: 'green_awareness' as const,
    color: 0x22c55e,
    opacity: 0.12,
    elevation: 0.2,
    borderWidth: 2,
    dashArray: true,
  },
  {
    key: 'yellow_injury' as const,
    color: 0xeab308,
    opacity: 0.22,
    elevation: 0.35,
    borderWidth: 2,
    dashArray: false,
  },
  {
    key: 'orange_serious' as const,
    color: 0xf97316,
    opacity: 0.34,
    elevation: 0.5,
    borderWidth: 3,
    dashArray: false,
  },
  {
    key: 'red_lethal' as const,
    color: 0xef4444,
    opacity: 0.52,
    elevation: 0.7,
    borderWidth: 3.5,
    dashArray: false,
  },
];

export interface HazardFieldVolumeComponents {
  group: THREE.Group;
  updateThreatData: (threatData: ThreatResponse | null, mode: HazardMode) => void;
  update: (time: number) => void;
}

export const createHazardFieldVolume = (scene: THREE.Scene): HazardFieldVolumeComponents => {
  const group = new THREE.Group();
  scene.add(group);

  let currentMode: HazardMode = 'COMBINED';
  let pulseMaterials: THREE.MeshBasicMaterial[] = [];

  const updateThreatData = (threatData: ThreatResponse | null, mode: HazardMode) => {
    currentMode = mode;
    // Clear previous geometries
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
    pulseMaterials = [];

    if (!threatData) return;

    const sourceBands =
      mode === 'BLAST' && threatData.blast_bands
        ? threatData.blast_bands
        : threatData.threat_bands;

    // Render each zone from outermost (Green) to innermost (Red)
    ZONE_CONFIGS.forEach(({ key, color, opacity, elevation }) => {
      const band = sourceBands[key];
      if (!band || !band.localPolygon || band.localPolygon.length < 3) return;

      const pts = band.localPolygon;
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], -pts[0][1]); // local [x, z] -> Three.js shape (X, Y)

      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], -pts[i][1]);
      }
      shape.closePath();

      // 1. Semi-transparent extruded contour surface
      const geom = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      pulseMaterials.push(mat);

      const mesh = new THREE.Mesh(geom, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = elevation;
      group.add(mesh);

      // 2. Glowing Contour Boundary Line
      const linePts = pts.map(([x, z]) => new THREE.Vector3(x, elevation + 0.05, z));
      linePts.push(new THREE.Vector3(pts[0][0], elevation + 0.05, pts[0][1]));

      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: Math.min(1.0, opacity * 2.2),
        linewidth: 2,
      });
      const lineMesh = new THREE.Line(lineGeo, lineMat);
      group.add(lineMesh);
    });
  };

  const update = (time: number) => {
    // Subtle pulsating glow on hazard volumes
    const pulse = 1.0 + Math.sin(time * 3.0) * 0.08;
    ZONE_CONFIGS.forEach((cfg, i) => {
      if (pulseMaterials[i]) {
        pulseMaterials[i].opacity = cfg.opacity * pulse;
      }
    });
  };

  return {
    group,
    updateThreatData,
    update,
  };
};
