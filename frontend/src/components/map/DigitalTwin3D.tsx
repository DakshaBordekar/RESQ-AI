import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Incident, Resource, Hospital, Dispatch } from '../../types';
import { createRealisticAmbulanceMesh } from './assets/AmbulanceMesh';
import { createRealisticHospitalLandmarkMesh } from './assets/HospitalLandmarkMesh';
import {
  Compass,
  Eye,
  Camera,
  Truck,
  Building2,
  AlertTriangle,
  CloudRain,
  X,
  Zap,
} from 'lucide-react';

export type CameraMode = 'COMMAND' | 'STREET' | 'FOLLOW_VEHICLE';
export type WeatherIntensity = 'NORMAL' | 'RAIN' | 'HEAVY_RAIN' | 'STORM';

interface DigitalTwin3DProps {
  selectedIncident?: Incident;
  selectedHospital?: Hospital;
  selectedResource?: Resource;
  incidents: Incident[];
  hospitals: Hospital[];
  resources: Resource[];
  dispatches: Dispatch[];
  onExit3D: () => void;
  onSelectIncident: (inc: Incident) => void;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  selectedIncident,
  selectedHospital,
  selectedResource,
  incidents,
  hospitals,
  resources,
  dispatches,
  onExit3D,
  onSelectIncident,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('COMMAND');
  const [weatherIntensity, setWeatherIntensity] = useState<WeatherIntensity>('HEAVY_RAIN');
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Origin focus coordinates
  const focusLat = selectedIncident?.latitude || selectedHospital?.latitude || selectedResource?.latitude || 12.979;
  const focusLon = selectedIncident?.longitude || selectedHospital?.longitude || selectedResource?.longitude || 80.215;
  const locationTitle =
    selectedIncident?.location_name ||
    selectedHospital?.name ||
    selectedResource?.name ||
    'Velachery Sector East, Chennai';

  // Coordinate Conversion
  const SCALE = 8500;
  const latLonTo3D = (lat: number, lon: number, y: number = 0): THREE.Vector3 => {
    const x = (lon - focusLon) * SCALE;
    const z = (focusLat - lat) * SCALE;
    return new THREE.Vector3(x, y, z);
  };

  const cameraModeRef = useRef<CameraMode>(cameraMode);
  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  // Three.js 3D Engine
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Sky & Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x64748b); // Monsoon overcast slate sky
    scene.fog = new THREE.FogExp2(0x64748b, 0.0035);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    const targetCamPos = new THREE.Vector3(0, 75, 110);
    const targetLookAt = new THREE.Vector3(0, 8, 0);

    // Transition start from high altitude
    camera.position.set(0, 320, 380);
    camera.lookAt(targetLookAt);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 3. Sky Dome Mesh
    const skyGeo = new THREE.SphereGeometry(800, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x475569, side: THREE.BackSide });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyMesh);

    // 4. Lighting (Overcast Daylight)
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 2.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xf8fafc, 2.8);
    sunLight.position.set(120, 250, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // 5. Asphalt Road & Sidewalk Environment
    const roadWidth = 26;
    const roadLength = 600;

    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.2, // Wet asphalt reflection
      metalness: 0.4,
    });
    const mainRoad = new THREE.Mesh(roadGeo, roadMat);
    mainRoad.rotation.x = -Math.PI / 2;
    mainRoad.position.set(0, 0.1, 0);
    mainRoad.receiveShadow = true;
    scene.add(mainRoad);

    // Cross Road
    const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(roadLength, roadWidth), roadMat);
    crossRoad.rotation.x = -Math.PI / 2;
    crossRoad.position.set(0, 0.12, 0);
    crossRoad.receiveShadow = true;
    scene.add(crossRoad);

    // Yellow Center Line Markings
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let z = -280; z < 280; z += 30) {
      const lineMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 14), lineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(0, 0.15, z);
      scene.add(lineMesh);
    }

    // Sidewalk Blocks & Street Light Posts
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 });
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, roadLength), sidewalkMat);
    swLeft.position.set(-roadWidth / 2 - 3, 0.6, 0);
    scene.add(swLeft);

    const swRight = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, roadLength), sidewalkMat);
    swRight.position.set(roadWidth / 2 + 3, 0.6, 0);
    scene.add(swRight);

    // Street Light Posts
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (let z = -240; z <= 240; z += 60) {
      for (let side = -1; side <= 1; side += 2) {
        const postMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 14, 8), postMat);
        const px = side * (roadWidth / 2 + 2);
        postMesh.position.set(px, 7, z);
        scene.add(postMesh);

        const lampMesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 8), lampMat);
        lampMesh.position.set(px, 14.5, z);
        scene.add(lampMesh);

        const streetLight = new THREE.PointLight(0xfef08a, 1.8, 40);
        streetLight.position.set(px, 14, z);
        scene.add(streetLight);
      }
    }

    // 6. Detailed Residential & Commercial Buildings
    const bldgGroup = new THREE.Group();
    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.8 });

    for (let side = -1; side <= 1; side += 2) {
      for (let z = -250; z <= 250; z += 45) {
        if (Math.abs(z) < 25) continue; // Leave intersection open

        const bw = 24 + Math.random() * 12;
        const bd = 24 + Math.random() * 12;
        const bh = 22 + Math.random() * 45;
        const bx = side * (roadWidth / 2 + 20 + bw / 2);

        const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), concreteMat);
        bMesh.position.set(bx, bh / 2, z);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        bldgGroup.add(bMesh);

        const glassStrip = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, bh * 0.7, bd + 0.4), glassMat);
        glassStrip.position.set(bx, bh / 2, z);
        bldgGroup.add(glassStrip);
      }
    }
    scene.add(bldgGroup);

    // 7. REALISTIC HOSPITAL LANDMARK MESH (Reference Image 2)
    const hospMeshGroup = createRealisticHospitalLandmarkMesh();
    const hospPos = selectedHospital ? latLonTo3D(selectedHospital.latitude, selectedHospital.longitude, 0) : new THREE.Vector3(-80, 0, -60);
    hospMeshGroup.position.set(hospPos.x, hospPos.y, hospPos.z);
    scene.add(hospMeshGroup);

    // 8. REALISTIC FLOOD WATER SURFACE
    const floodGeo = new THREE.PlaneGeometry(500, 500, 32, 32);
    const floodMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.65,
      roughness: 0.05,
      metalness: 0.85,
    });
    const floodSurface = new THREE.Mesh(floodGeo, floodMat);
    floodSurface.rotation.x = -Math.PI / 2;
    floodSurface.position.set(0, 2.8, 0); // Floods road to 2.8m height
    scene.add(floodSurface);

    // 9. INCIDENT BUILDING & 3D HUMAN CHARACTER SILHOUETTES
    const incPos = selectedIncident ? latLonTo3D(selectedIncident.latitude, selectedIncident.longitude, 0) : new THREE.Vector3(0, 0, 0);
    const incBldgH = 28;
    const incBldg = new THREE.Mesh(new THREE.BoxGeometry(22, incBldgH, 22), concreteMat);
    incBldg.position.set(incPos.x, incBldgH / 2, incPos.z);
    scene.add(incBldg);

    // Rooftop Trapped Victim 3D Characters (Head + Torso + Limbs)
    const victimMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 });
    for (let p = 0; p < 3; p++) {
      const charGroup = new THREE.Group();
      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), victimMat);
      head.position.y = 2.8;
      charGroup.add(head);
      // Torso
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.5, 2.2, 12), victimMat);
      torso.position.y = 1.3;
      charGroup.add(torso);

      charGroup.position.set(incPos.x - 4 + p * 4, incBldgH + 0.1, incPos.z);
      scene.add(charGroup);
    }

    // Incident Red Beacon Beam & Ring
    const beaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 80, 16),
      new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.85 })
    );
    beaconBeam.position.set(incPos.x, 40, incPos.z);
    scene.add(beaconBeam);

    // 10. REALISTIC AMBULANCE MESH (Reference Image 1)
    const { group: ambMeshGroup, sirenRedLight, sirenBlueLight } = createRealisticAmbulanceMesh();
    ambMeshGroup.position.set(0, 0.1, 80);
    scene.add(ambMeshGroup);

    // 11. MONSOON RAIN PARTICLE SYSTEM
    const rainCount = 1500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let r = 0; r < rainCount * 3; r += 3) {
      rainPos[r] = (Math.random() - 0.5) * 450;
      rainPos[r + 1] = Math.random() * 250;
      rainPos[r + 2] = (Math.random() - 0.5) * 450;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainParticles = new THREE.Points(
      rainGeo,
      new THREE.PointsMaterial({ color: 0x93c5fd, size: 1.4, transparent: true, opacity: 0.5 })
    );
    scene.add(rainParticles);

    // 12. WASD Keyboard Controls
    const keysPressed: Record<string, boolean> = {};
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 13. Master Animation & Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Camera Dive Transition Lerp
      if (camera.position.y > targetCamPos.y + 1) {
        camera.position.lerp(targetCamPos, 0.04);
        camera.lookAt(targetLookAt);
      } else if (isTransitioning) {
        setIsTransitioning(false);
      }

      // WASD Keyboard Movement
      const speed = 35 * delta;
      if (keysPressed['w'] || keysPressed['arrowup']) {
        targetCamPos.z -= speed;
        targetLookAt.z -= speed;
      }
      if (keysPressed['s'] || keysPressed['arrowdown']) {
        targetCamPos.z += speed;
        targetLookAt.z += speed;
      }
      if (keysPressed['a'] || keysPressed['arrowleft']) {
        targetCamPos.x -= speed;
        targetLookAt.x -= speed;
      }
      if (keysPressed['d'] || keysPressed['arrowright']) {
        targetCamPos.x += speed;
        targetLookAt.x += speed;
      }

      // Camera Modes
      const mode = cameraModeRef.current;
      if (mode === 'STREET') {
        const streetCamPos = new THREE.Vector3(targetLookAt.x + 2, 8, targetLookAt.z + 35);
        camera.position.lerp(streetCamPos, 0.05);
        camera.lookAt(new THREE.Vector3(targetLookAt.x, 22, targetLookAt.z));
      } else if (mode === 'FOLLOW_VEHICLE') {
        const vehiclePos = ambMeshGroup.position;
        const followPos = new THREE.Vector3(vehiclePos.x, vehiclePos.y + 12, vehiclePos.z + 28);
        camera.position.lerp(followPos, 0.08);
        camera.lookAt(vehiclePos);
      } else {
        camera.position.lerp(targetCamPos, 0.06);
        camera.lookAt(targetLookAt);
      }

      // Animate Ambulance Driving & Siren Light Flashing
      if (ambMeshGroup.position.z > incPos.z + 18) {
        ambMeshGroup.position.z -= 14 * delta;
      }
      sirenRedLight.intensity = Math.sin(time * 12) > 0 ? 6 : 0.5;
      sirenBlueLight.intensity = Math.cos(time * 12) > 0 ? 6 : 0.5;

      // Animate Flood Water Wave Height
      floodSurface.position.y = 2.8 + Math.sin(time * 2) * 0.35;

      // Animate Rain Particles
      const positions = rainGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < rainCount * 3; i += 3) {
        positions[i] -= 320 * delta;
        if (positions[i] < 0) positions[i] = 250;
      }
      rainGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // 14. Window Resize & Cleanup
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [selectedIncident?.id, selectedHospital?.id, selectedResource?.id]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900 select-none">
      {/* Cinematic Transition Loading Banner */}
      {isTransitioning && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md text-cyan-400 font-mono animate-in fade-in duration-300">
          <CloudRain className="w-10 h-10 animate-bounce mb-3 text-cyan-400" />
          <div className="text-sm font-bold tracking-widest uppercase text-gray-100 mb-1">
            DIVING INTO 3D DIGITAL TWIN...
          </div>
          <div className="text-xs text-cyan-400 font-mono">
            Loading Real-World Environment &amp; Telemetry for {locationTitle}
          </div>
        </div>
      )}

      {/* 1. Top HUD Header Banner */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 p-3 rounded-xl shadow-2xl text-gray-100 font-mono">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
            <Compass className="w-5 h-5 animate-spin-slow text-cyan-400" />
          </div>
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <span>LEVEL 2 IMMERSIVE 3D DIGITAL TWIN</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <div className="text-sm font-bold text-gray-100 mt-0.5">{locationTitle}</div>
          </div>
        </div>

        {/* Camera Navigation Modes & Exit 3D */}
        <div className="flex items-center gap-2">
          {/* Weather Selector */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 gap-1 text-xs">
            <CloudRain className="w-3.5 h-3.5 text-cyan-400 ml-1" />
            {(['RAIN', 'HEAVY_RAIN', 'STORM'] as WeatherIntensity[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setWeatherIntensity(mode)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  weatherIntensity === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-gray-200'
                }`}
              >
                {mode.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Mode Switchers */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1 gap-1 text-xs">
            <button
              onClick={() => setCameraMode('COMMAND')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                cameraMode === 'COMMAND'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-gray-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>COMMAND VIEW</span>
            </button>

            <button
              onClick={() => setCameraMode('STREET')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                cameraMode === 'STREET'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-gray-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>STREET VIEW (WASD)</span>
            </button>

            <button
              onClick={() => setCameraMode('FOLLOW_VEHICLE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                cameraMode === 'FOLLOW_VEHICLE'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-gray-200'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>FOLLOW AMBULANCE</span>
            </button>
          </div>

          {/* EXIT 3D BUTTON */}
          <button
            onClick={onExit3D}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold text-xs shadow-lg shadow-red-950/50 transition-all hover:scale-105"
          >
            <X className="w-4 h-4" />
            <span>EXIT 3D VIEW (2D MAP)</span>
          </button>
        </div>
      </div>

      {/* 2. 3D WebGL Canvas Viewport */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative" />

      {/* 3. Floating 3D Telemetry Badges */}
      {selectedIncident && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-slate-950/90 backdrop-blur-xl border border-red-500/50 p-3.5 rounded-xl shadow-2xl text-xs font-mono text-gray-100 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between text-red-400 font-bold border-b border-slate-800 pb-1 mb-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              CRITICAL INCIDENT LOCATION
            </span>
            <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-700">
              PRIORITY {selectedIncident.calculated_priority.toFixed(1)}
            </span>
          </div>
          <div className="text-gray-200 font-semibold mb-1">{selectedIncident.title}</div>
          <div className="text-gray-400 text-[11px] space-y-0.5">
            <div>
              Victims: <strong className="text-amber-400">{selectedIncident.people_affected} trapped</strong> (Vulnerable: {selectedIncident.vulnerable_people})
            </div>
            <div>
              Status: <span className="text-emerald-400 font-bold">{selectedIncident.status}</span>
            </div>
            <div>
              Flood Water Level: <span className="text-cyan-400 font-bold">5 FT (Inundated Road)</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Dispatch Ambulance Live Telemetry Badge */}
      <div className="absolute bottom-6 right-6 z-[1000] bg-slate-950/90 backdrop-blur-xl border border-blue-500/50 p-3.5 rounded-xl shadow-2xl text-xs font-mono text-gray-100 max-w-xs animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between text-blue-400 font-bold border-b border-slate-800 pb-1 mb-2">
          <span className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-400" />
            AMBULANCE AMB-07
          </span>
          <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-700">
            EN ROUTE
          </span>
        </div>
        <div className="text-gray-300 text-[11px] space-y-1">
          <div className="flex items-center justify-between">
            <span>ETA to Incident:</span>
            <strong className="text-emerald-400 font-mono">04:12 mins</strong>
          </div>
          <div className="flex items-center justify-between">
            <span>Target Facility:</span>
            <strong className="text-indigo-300">Rajiv Gandhi GH</strong>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-slate-800">
            <span>Sirens &amp; Lights: ACTIVE</span>
            <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};
