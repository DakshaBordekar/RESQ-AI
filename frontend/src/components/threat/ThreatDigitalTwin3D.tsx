import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreatResponse } from '../../services/threatApi';

interface ThreatDigitalTwin3DProps {
  threatData: ThreatResponse | null;
  onExit3D: () => void;
}

export const ThreatDigitalTwin3D: React.FC<ThreatDigitalTwin3DProps> = ({ threatData, onExit3D }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Sky & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16); // Dark tactical night canvas
    scene.fog = new THREE.FogExp2(0x090d16, 0.002);

    // 2. Camera & Renderer Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 120, 260);
    camera.lookAt(0, 15, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Environmental Lighting
    const ambientLight = new THREE.AmbientLight(0x475569, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfef08a, 2.5);
    sunLight.position.set(100, 200, 80);
    scene.add(sunLight);

    // 4. Ground Grid Plane
    const gridHelper = new THREE.GridHelper(600, 40, 0x334155, 0x1e293b);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 5. INDUSTRIAL STORAGE TANK MESH
    const isFacilityA = threatData?.facility_type === 'FACILITY_A_LPG';
    const tankGroup = new THREE.Group();

    if (isFacilityA) {
      // Facility A: Pressurized Spherical LPG Tank
      const sphereGeo = new THREE.SphereGeometry(14, 32, 32);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.7 });
      const sphereMesh = new THREE.Mesh(sphereGeo, tankMat);
      sphereMesh.position.y = 16;
      tankGroup.add(sphereMesh);

      // Support Columns
      const colMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      for (let angle = 0; angle < 360; angle += 60) {
        const rad = (angle * Math.PI) / 180;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 16, 8), colMat);
        col.position.set(12 * Math.sin(rad), 8, 12 * Math.cos(rad));
        tankGroup.add(col);
      }
    } else {
      // Facility B: Vertical Cylindrical Petroleum Tank
      const cylGeo = new THREE.CylinderGeometry(18, 18, 22, 32);
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.5 });
      const cylMesh = new THREE.Mesh(cylGeo, tankMat);
      cylMesh.position.y = 11;
      tankGroup.add(cylMesh);
    }

    scene.add(tankGroup);

    // 6. FIRE & VAPOR DISPERSION PLUME MESH (Tilting Downwind)
    const tiltDeg = threatData?.physics_metrics?.flame_tilt_deg || 35;
    const flameH = threatData?.physics_metrics?.flame_height_m || (isFacilityA ? 120 : 65);
    const tiltRad = (tiltDeg * Math.PI) / 180;

    const plumeGeo = new THREE.CylinderGeometry(2, isFacilityA ? 45 : 25, flameH, 32);
    const plumeMat = new THREE.MeshBasicMaterial({
      color: isFacilityA ? 0xef4444 : 0xf97316,
      transparent: true,
      opacity: 0.65,
      wireframe: false,
    });
    const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
    plumeMesh.rotation.z = -tiltRad;
    plumeMesh.position.set(Math.sin(tiltRad) * (flameH / 2), Math.cos(tiltRad) * (flameH / 2) + 15, 0);
    scene.add(plumeMesh);

    // 7. BLAST SHOCKWAVE EXPANSION RINGS (For Facility A BLEVE)
    if (isFacilityA) {
      const shockRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
      const shockRing = new THREE.Mesh(new THREE.RingGeometry(80, 85, 64), shockRingMat);
      shockRing.rotation.x = -Math.PI / 2;
      shockRing.position.y = 0.5;
      scene.add(shockRing);
    }

    // 8. GREEN SAFE APPROACH CORRIDOR ARROW
    const safeAngle = threatData?.safe_approach_vector?.safe_angle_deg || 315;
    const safeRad = (safeAngle * Math.PI) / 180;
    const arrowDir = new THREE.Vector3(Math.sin(safeRad), 0, Math.cos(safeRad)).normalize();
    const arrowOrigin = new THREE.Vector3(Math.sin(safeRad) * 160, 2, Math.cos(safeRad) * 160);
    const arrowHelper = new THREE.ArrowHelper(arrowDir.clone().negate(), arrowOrigin, 120, 0x10b981, 20, 10);
    scene.add(arrowHelper);

    // 9. Master Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Pulsate Plume Opacity
      plumeMat.opacity = 0.55 + Math.sin(time * 6) * 0.15;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [threatData?.facility_type]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 select-none">
      {/* Top HUD Switcher & Exit */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 p-3 rounded-xl shadow-2xl text-gray-100 font-mono">
        <div className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
          <span>LEVEL 2 IMMERSIVE 3D THREAT DIGITAL TWIN</span>
          <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
        </div>
        <button
          onClick={onExit3D}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold shadow-lg transition-all"
        >
          EXIT 3D VIEW (2D MAP)
        </button>
      </div>

      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative" />
    </div>
  );
};
