import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SituationMap } from './SituationMap';
import { MapControlBar, MapLayerState } from './MapControlBar';
import { Incident, Resource, Hospital, RoadSegment, Dispatch } from '../../types';
import { AlertTriangle, Building2, Truck, Activity, Navigation, Waves, ArrowUpRight, CloudRain } from 'lucide-react';

interface SituationMap3DProps {
  incidents: Incident[];
  resources: Resource[];
  hospitals: Hospital[];
  roadSegments: RoadSegment[];
  dispatches: Dispatch[];
  selectedIncidentId?: string;
  onSelectIncident: (inc: Incident) => void;
  onToggleRoad: (roadId: string) => void;
}

export const SituationMap3D: React.FC<SituationMap3DProps> = ({
  incidents,
  resources,
  hospitals,
  roadSegments,
  dispatches,
  selectedIncidentId,
  onSelectIncident,
  onToggleRoad,
}) => {
  const [is3DMode, setIs3DMode] = useState(true);
  const [layers, setLayers] = useState<MapLayerState>({
    incidents: true,
    hospitals: true,
    vehicles: true,
    flood: true,
    routes: true,
  });

  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredObjectInfo, setHoveredObjectInfo] = useState<{
    type: 'incident' | 'hospital' | 'resource';
    data: any;
    x: number;
    y: number;
  } | null>(null);

  // Coordinate conversion: Chennai center (13.0300 N, 80.2350 E) -> 3D World X/Z
  const CENTER_LAT = 13.0300;
  const CENTER_LON = 80.2350;
  const SCALE = 7200;

  const latLonTo3D = (lat: number, lon: number, y: number = 0): THREE.Vector3 => {
    const x = (lon - CENTER_LON) * SCALE;
    const z = (CENTER_LAT - lat) * SCALE;
    return new THREE.Vector3(x, y, z);
  };

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // Toggle single layer
  const handleToggleLayer = (layer: keyof MapLayerState) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Reset Camera View Callback
  const resetCameraRef = useRef<() => void>(() => {});

  // Generate Procedural Lit Window Texture for Buildings
  const createBuildingWindowTexture = (): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 128);

    // Draw lit window grid
    for (let x = 8; x < 128; x += 16) {
      for (let y = 8; y < 128; y += 16) {
        if (Math.random() > 0.45) {
          ctx.fillStyle = Math.random() > 0.7 ? '#f59e0b' : '#38bdf8'; // Warm gold or cool cyan window glow
          ctx.fillRect(x, y, 8, 10);
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
  };

  // Three.js 3D Scene Construction
  useEffect(() => {
    if (!is3DMode || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene, Camera, WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030712); // Midnight tactical background
    scene.fog = new THREE.FogExp2(0x030712, 0.0022);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 2500);
    const defaultCamPos = new THREE.Vector3(0, 220, 280);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    const currentCamPos = defaultCamPos.clone();
    const currentCamTarget = cameraTarget.clone();

    camera.position.copy(defaultCamPos);
    camera.lookAt(cameraTarget);

    resetCameraRef.current = () => {
      currentCamPos.copy(defaultCamPos);
      currentCamTarget.set(0, 0, 0);
    };

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. Cinematic Tactical Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.2);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0x38bdf8, 2.5);
    mainSun.position.set(150, 300, 150);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    scene.add(mainSun);

    const rimLight = new THREE.DirectionalLight(0x818cf8, 1.5);
    rimLight.position.set(-200, 150, -200);
    scene.add(rimLight);

    const floodCyanLight = new THREE.PointLight(0x06b6d4, 3, 500);
    floodCyanLight.position.set(-60, 40, -40);
    scene.add(floodCyanLight);

    const emergencyRedLight = new THREE.PointLight(0xef4444, 3.5, 400);
    emergencyRedLight.position.set(40, 50, 60);
    scene.add(emergencyRedLight);

    // 3. Ground Base Grid & Coastline Mesh
    const groundGeo = new THREE.PlaneGeometry(1200, 1200, 64, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.85,
      metalness: 0.2,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid Matrix Overlay
    const gridHelper = new THREE.GridHelper(1200, 120, 0x1e293b, 0x0f172a);
    gridHelper.position.y = 0.15;
    scene.add(gridHelper);

    // 4. Dense Procedural Chennai Buildings (300+ Structures)
    const windowTexture = createBuildingWindowTexture();
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.5,
      map: windowTexture,
    });
    const bldgEdgeMat = new THREE.LineBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.3 });

    const buildingGroup = new THREE.Group();
    const buildingBoxes: THREE.Box3[] = [];

    // Seed buildings in district blocks
    const districtCenters = [
      { name: 'Velachery', x: -80, z: 60, count: 45, maxH: 40 },
      { name: 'Saidapet', x: -20, z: -10, count: 50, maxH: 55 },
      { name: 'Adyar', x: 40, z: 30, count: 40, maxH: 45 },
      { name: 'Guindy', x: -60, z: -50, count: 40, maxH: 60 },
      { name: 'Taramani', x: 20, z: 70, count: 35, maxH: 50 },
      { name: 'Anna Nagar', x: -100, z: -110, count: 45, maxH: 50 },
      { name: 'T. Nagar', x: -30, z: -60, count: 45, maxH: 65 },
    ];

    districtCenters.forEach((dist) => {
      for (let b = 0; b < dist.count; b++) {
        const offsetX = (Math.random() - 0.5) * 110;
        const offsetZ = (Math.random() - 0.5) * 110;
        const bw = 10 + Math.random() * 14;
        const bd = 10 + Math.random() * 14;
        const bh = 12 + Math.random() * dist.maxH;

        const bGeo = new THREE.BoxGeometry(bw, bh, bd);
        const bMesh = new THREE.Mesh(bGeo, bldgMat);
        const px = dist.x + offsetX;
        const pz = dist.z + offsetZ;
        bMesh.position.set(px, bh / 2, pz);
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;

        buildingGroup.add(bMesh);

        // Building Wireframe Edges
        const edges = new THREE.EdgesGeometry(bGeo);
        const line = new THREE.LineSegments(edges, bldgEdgeMat);
        line.position.copy(bMesh.position);
        buildingGroup.add(line);

        // Rooftop Details: Red Aviation Beacon for Tall Buildings
        if (bh > 45) {
          const redBeaconGeo = new THREE.SphereGeometry(0.8, 8, 8);
          const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const beaconMesh = new THREE.Mesh(redBeaconGeo, redBeaconMat);
          beaconMesh.position.set(px, bh + 1, pz);
          buildingGroup.add(beaconMesh);
        }
      }
    });
    scene.add(buildingGroup);

    // 5. Road Network Overlay Mesh
    const roadGroup = new THREE.Group();
    roadSegments.forEach((road) => {
      const src = latLonTo3D(road.source_coords[0], road.source_coords[1], 0.3);
      const tgt = latLonTo3D(road.target_coords[0], road.target_coords[1], 0.3);

      const isBlocked = road.status === 'BLOCKED';
      const isWaterlogged = road.status === 'WATERLOGGED';
      const roadColor = isBlocked ? 0xef4444 : isWaterlogged ? 0x06b6d4 : 0x38bdf8;

      const points = [src, tgt];
      const roadGeo = new THREE.BufferGeometry().setFromPoints(points);
      const roadMat = new THREE.LineBasicMaterial({
        color: roadColor,
        linewidth: isBlocked || isWaterlogged ? 3 : 1.5,
        transparent: true,
        opacity: isBlocked ? 0.95 : 0.65,
      });
      const roadLine = new THREE.Line(roadGeo, roadMat);
      roadGroup.add(roadLine);
    });
    scene.add(roadGroup);

    // 6. Dynamic 3D Animated Flood Water Surface
    let floodMesh: THREE.Mesh | null = null;
    if (layers.flood) {
      const floodGeo = new THREE.PlaneGeometry(800, 800, 48, 48);
      const floodMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.15,
      });
      floodMesh = new THREE.Mesh(floodGeo, floodMat);
      floodMesh.rotation.x = -Math.PI / 2;
      floodMesh.position.y = 1.8;
      scene.add(floodMesh);
    }

    // 7. Interactive Objects Setup
    const interactiveObjects: THREE.Object3D[] = [];

    // --- A. 3D INCIDENT BEACONS ---
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const pos = latLonTo3D(inc.latitude, inc.longitude, 0);
        const colorHex =
          inc.priority_tier === 'CRITICAL'
            ? 0xef4444
            : inc.priority_tier === 'HIGH'
            ? 0xf97316
            : 0xeab308;

        const isSelected = inc.id === selectedIncidentId;

        // Vertical Light Beam Shaft
        const cylinderGeo = new THREE.CylinderGeometry(
          isSelected ? 2.5 : 1.2,
          isSelected ? 2.5 : 1.2,
          isSelected ? 70 : 45,
          16
        );
        const cylinderMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          transparent: true,
          opacity: isSelected ? 0.95 : 0.75,
        });
        const beacon = new THREE.Mesh(cylinderGeo, cylinderMat);
        beacon.position.set(pos.x, isSelected ? 35 : 22.5, pos.z);
        beacon.userData = { type: 'incident', data: inc };
        scene.add(beacon);
        interactiveObjects.push(beacon);

        // Ground Ripple Circle
        const ringGeo = new THREE.RingGeometry(3, isSelected ? 12 : 7, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.5, pos.z);
        scene.add(ring);
      });
    }

    // --- B. 3D HOSPITALS ---
    if (layers.hospitals) {
      hospitals.forEach((hosp) => {
        const pos = latLonTo3D(hosp.latitude, hosp.longitude, 0);
        const isFull = hosp.status === 'DIVERT_FULL' || hosp.available_beds === 0;
        const colorHex = isFull ? 0xef4444 : 0x6366f1;

        const hospGeo = new THREE.BoxGeometry(14, 26, 14);
        const hospMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          emissive: colorHex,
          emissiveIntensity: 0.4,
          roughness: 0.3,
        });
        const hospMesh = new THREE.Mesh(hospGeo, hospMat);
        hospMesh.position.set(pos.x, 13, pos.z);
        hospMesh.userData = { type: 'hospital', data: hosp };
        scene.add(hospMesh);
        interactiveObjects.push(hospMesh);

        // 3D Roof Medical Cross Landmark
        const crossHGeo = new THREE.BoxGeometry(10, 3, 3);
        const crossVGeo = new THREE.BoxGeometry(3, 3, 10);
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const crossH = new THREE.Mesh(crossHGeo, crossMat);
        const crossV = new THREE.Mesh(crossVGeo, crossMat);
        crossH.position.set(pos.x, 28, pos.z);
        crossV.position.set(pos.x, 28, pos.z);
        scene.add(crossH);
        scene.add(crossV);

        // Status Glow Ring
        const ringGeo = new THREE.RingGeometry(8, 11, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: colorHex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(pos.x, 0.5, pos.z);
        scene.add(ring);
      });
    }

    // --- C. 3D EMERGENCY FLEET VEHICLES ---
    const vehicleMeshes: { mesh: THREE.Mesh; resource: Resource; startPos: THREE.Vector3; targetPos?: THREE.Vector3 }[] = [];
    if (layers.vehicles) {
      resources.forEach((res) => {
        const pos = latLonTo3D(res.latitude, res.longitude, 0);
        const isBoat = res.type.includes('BOAT') || res.type.includes('NDRF');
        const colorHex = isBoat ? 0xf97316 : res.status !== 'AVAILABLE' ? 0x3b82f6 : 0x10b981;

        const vehGeo = new THREE.BoxGeometry(7, 5, 12);
        const vehMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          roughness: 0.3,
          metalness: 0.7,
        });
        const vehMesh = new THREE.Mesh(vehGeo, vehMat);
        vehMesh.position.set(pos.x, 2.5, pos.z);
        vehMesh.userData = { type: 'resource', data: res };
        scene.add(vehMesh);
        interactiveObjects.push(vehMesh);

        // Siren Light Bar
        const sirenGeo = new THREE.BoxGeometry(3, 1.2, 2);
        const sirenMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
        const sirenMesh = new THREE.Mesh(sirenGeo, sirenMat);
        sirenMesh.position.set(pos.x, 5.6, pos.z);
        scene.add(sirenMesh);

        // Check if assigned dispatch
        const dispatch = dispatches.find(
          (d) => d.resource === res.id || d.resource_details?.id === res.id
        );
        let targetPos: THREE.Vector3 | undefined;
        if (dispatch && dispatch.incident_details) {
          targetPos = latLonTo3D(dispatch.incident_details.latitude, dispatch.incident_details.longitude, 0);
        }

        vehicleMeshes.push({ mesh: vehMesh, resource: res, startPos: pos, targetPos });
      });
    }

    // --- D. NEON DIJKSTRA DISPATCH ROUTES & MOVING PULSE SPHERES ---
    const pulseSpheres: { sphere: THREE.Mesh; curve: THREE.CatmullRomCurve3 }[] = [];
    if (layers.routes) {
      dispatches.forEach((disp) => {
        if (!disp.route_geometry || disp.route_geometry.length < 2) return;
        const points = disp.route_geometry.map(([lat, lon]) => latLonTo3D(lat, lon, 2.5));
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 1.2, 8, false);
        const tubeMat = new THREE.MeshBasicMaterial({
          color: disp.status === 'APPROVED' ? 0x10b981 : 0x3b82f6,
          transparent: true,
          opacity: 0.85,
        });
        const routeTube = new THREE.Mesh(tubeGeo, tubeMat);
        scene.add(routeTube);

        // Animated Traveling Pulse Sphere
        const sphereGeo = new THREE.SphereGeometry(2.5, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        const pulseSphere = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(pulseSphere);
        pulseSpheres.push({ sphere: pulseSphere, curve });
      });
    }

    // --- E. MONSOON RAIN PARTICLE SYSTEM ---
    const rainCount = 1200;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let r = 0; r < rainCount * 3; r += 3) {
      rainPositions[r] = (Math.random() - 0.5) * 1000;
      rainPositions[r + 1] = Math.random() * 300;
      rainPositions[r + 2] = (Math.random() - 0.5) * 1000;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 1.2,
      transparent: true,
      opacity: 0.4,
    });
    const rainParticles = new THREE.Points(rainGeo, rainMat);
    scene.add(rainParticles);

    // 8. Camera Target Smooth Interpolation on Incident Selection
    if (selectedIncident) {
      const incPos = latLonTo3D(selectedIncident.latitude, selectedIncident.longitude, 0);
      currentCamPos.set(incPos.x + 60, 90, incPos.z + 80);
      currentCamTarget.copy(incPos);
    }

    // 9. Mouse Raycaster & Interactivity
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);

      if (intersects.length > 0) {
        const top = intersects[0].object;
        const info = top.userData;
        if (info && info.data) {
          setHoveredObjectInfo({
            type: info.type,
            data: info.data,
            x: e.clientX,
            y: e.clientY,
          });
          container.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredObjectInfo(null);
      container.style.cursor = 'grab';
    };

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjects);

      if (intersects.length > 0) {
        const info = intersects[0].object.userData;
        if (info && info.type === 'incident') {
          onSelectIncident(info.data);
        }
      }
    };

    // Orbit Drag Controls
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleMouseDrag = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;

      currentCamPos.x -= dx * 0.5;
      currentCamPos.z += dy * 0.5;

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      currentCamPos.y = THREE.MathUtils.clamp(currentCamPos.y + e.deltaY * 0.2, 40, 500);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousemove', handleMouseMove);
    domEl.addEventListener('click', handleClick);
    domEl.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseDrag);
    domEl.addEventListener('wheel', handleWheel, { passive: false });

    // 10. Master Animation & Render Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth Camera Fly-To
      camera.position.lerp(currentCamPos, 0.08);
      cameraTarget.lerp(currentCamTarget, 0.08);
      camera.lookAt(cameraTarget);

      // Animate Flood Water Surface
      if (floodMesh) {
        floodMesh.position.y = 1.8 + Math.sin(time * 1.8) * 0.5;
      }

      // Animate Vehicle Path Interpolation along Dispatches
      vehicleMeshes.forEach((item) => {
        if (item.targetPos) {
          const progress = (Math.sin(time * 0.8) + 1) / 2; // Smooth 0 to 1 movement loop
          item.mesh.position.lerpVectors(item.startPos, item.targetPos, progress);
        }
      });

      // Animate Route Pulse Spheres
      pulseSpheres.forEach((p) => {
        const t = (time * 0.3) % 1;
        const pt = p.curve.getPoint(t);
        p.sphere.position.copy(pt);
      });

      // Animate Rain Falling
      const rainPos = rainGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < rainCount * 3; i += 3) {
        rainPos[i] -= 350 * delta;
        if (rainPos[i] < 0) rainPos[i] = 300;
      }
      rainGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // 11. Resize & Cleanup
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
      domEl.removeEventListener('mousemove', handleMouseMove);
      domEl.removeEventListener('click', handleClick);
      domEl.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseDrag);
      domEl.removeEventListener('wheel', handleWheel);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [is3DMode, layers, selectedIncidentId, incidents, hospitals, resources, roadSegments, dispatches]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950">
      {/* Map Control Toolbar */}
      <MapControlBar
        is3DMode={is3DMode}
        onToggle3DMode={() => setIs3DMode(!is3DMode)}
        layers={layers}
        onToggleLayer={handleToggleLayer}
        onResetView={() => resetCameraRef.current()}
      />

      {/* Mode Viewport */}
      {is3DMode ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative">
          {/* Tactical 3D Digital Twin Overlay Tag */}
          <div className="absolute bottom-4 left-4 z-[900] pointer-events-none flex items-center gap-2 text-[11px] font-mono text-cyan-400/90 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/30 shadow-2xl">
            <CloudRain className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
            <span>CHENNAI DIGITAL TWIN • 3D EMERGENCY COMMAND MATRIX</span>
          </div>

          {/* Floating District Badges */}
          <div className="absolute top-16 right-4 z-[800] pointer-events-none flex flex-col gap-1.5 text-[10px] font-mono select-none">
            <div className="bg-slate-950/80 border border-cyan-500/30 text-cyan-400 px-2.5 py-1 rounded shadow flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>VELACHERY: HIGH FLOOD 5FT</span>
            </div>
            <div className="bg-slate-950/80 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded shadow">
              SAIDAPET: BRIDGE SUBMERGED
            </div>
            <div className="bg-slate-950/80 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded shadow">
              ADYAR: DISPATCH DEPOT ACTIVE
            </div>
          </div>

          {/* Interactive Raycast Hover Tooltip */}
          {hoveredObjectInfo && (
            <div
              style={{
                left: `${hoveredObjectInfo.x + 14}px`,
                top: `${hoveredObjectInfo.y + 14}px`,
              }}
              className="fixed z-[2500] pointer-events-none bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 p-3 rounded-lg shadow-2xl shadow-cyan-950 text-xs font-mono text-gray-100 min-w-[230px] max-w-[290px] animate-in fade-in duration-150"
            >
              {hoveredObjectInfo.type === 'incident' && (
                <div>
                  <div className="flex items-center gap-1.5 text-red-400 font-bold border-b border-slate-800 pb-1 mb-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      [{hoveredObjectInfo.data.priority_tier}] {hoveredObjectInfo.data.title}
                    </span>
                  </div>
                  <div className="text-gray-300">
                    Location: <span className="text-gray-100 font-semibold">{hoveredObjectInfo.data.location_name}</span>
                  </div>
                  <div className="text-gray-300">
                    Affected: <span className="text-amber-400 font-bold">{hoveredObjectInfo.data.people_affected} people</span>
                  </div>
                  <div className="text-gray-300">
                    Priority Score: <span className="text-cyan-400 font-bold font-mono">{hoveredObjectInfo.data.calculated_priority.toFixed(1)}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1 pt-1 border-t border-slate-800 flex items-center justify-between">
                    <span>Click to focus 3D scene &amp; action plan</span>
                    <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                  </div>
                </div>
              )}

              {hoveredObjectInfo.type === 'hospital' && (
                <div>
                  <div className="flex items-center gap-1.5 text-indigo-400 font-bold border-b border-slate-800 pb-1 mb-1.5">
                    <Building2 className="w-4 h-4" />
                    <span>{hoveredObjectInfo.data.name}</span>
                  </div>
                  <div className="text-gray-300">
                    Available Beds: <span className="text-emerald-400 font-bold">{hoveredObjectInfo.data.available_beds}</span> / {hoveredObjectInfo.data.total_beds}
                  </div>
                  <div className="text-gray-300">
                    ICU Vacancy: <span className="text-cyan-400 font-bold">{hoveredObjectInfo.data.available_icu}</span> / {hoveredObjectInfo.data.total_icu}
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1">Status: {hoveredObjectInfo.data.status_display}</div>
                </div>
              )}

              {hoveredObjectInfo.type === 'resource' && (
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold border-b border-slate-800 pb-1 mb-1.5">
                    <Truck className="w-4 h-4" />
                    <span>{hoveredObjectInfo.data.call_sign} — {hoveredObjectInfo.data.name}</span>
                  </div>
                  <div className="text-gray-300">Type: {hoveredObjectInfo.data.type_display}</div>
                  <div className="text-gray-300">
                    Status: <span className="text-cyan-400 font-semibold">{hoveredObjectInfo.data.status_display}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1">Capabilities: {hoveredObjectInfo.data.capabilities.join(', ')}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Fallback 2D Leaflet Situation GIS Map */
        <SituationMap
          incidents={incidents}
          resources={resources}
          hospitals={hospitals}
          roadSegments={roadSegments}
          dispatches={dispatches}
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={onSelectIncident}
          onToggleRoad={onToggleRoad}
        />
      )}
    </div>
  );
};
