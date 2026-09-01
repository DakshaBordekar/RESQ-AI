// ────────────────────────────────────────────────────────────────────────────
// RESQ-AI DER-02 3D Emergency Response Heavy Fire Tender / Rescue Truck
// High-detail PBR emergency vehicle: 6x6 chassis, equipment lockers, roll-up doors,
// rotating rubber wheels, alternating LED strobe lightbars, articulated rooftop water cannon.
// (Follows continuous multi-waypoint road network routes with cornering deceleration)
// ────────────────────────────────────────────────────────────────────────────

import * as THREE from 'three';

export interface FireTruckComponents {
  group: THREE.Group;
  update: (delta: number, time: number) => void;
  dispatchOnRoute: (waypoints: THREE.Vector3[]) => void;
  isStaged: () => boolean;
  getStagingPosition: () => THREE.Vector3;
  getNozzleWorldPosition: () => THREE.Vector3;
  aimTurretAt: (target: THREE.Vector3) => void;
  setEmergencyLights: (active: boolean) => void;
  reset: () => void;
}

export const createFireTruck = (scene: THREE.Scene): FireTruckComponents => {
  const group = new THREE.Group();
  group.visible = false; // Hidden in calm pre-blast state

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PBR MATERIALS
  // ──────────────────────────────────────────────────────────────────────────
  const rescueRedMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Vibrant emergency red
    roughness: 0.25,
    metalness: 0.65,
  });

  const whiteStripeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
    metalness: 0.2,
  });

  const darkChassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.4,
  });

  const tireRubberMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.9,
    metalness: 0.05,
  });

  const steelRimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.9,
  });

  const tintedGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.85,
  });

  const aluminumShutterMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.8,
  });

  const cautionChevronMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.2,
  });

  const chromeTurretMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.15,
    metalness: 0.95,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. VEHICLE CHASSIS & CABIN ASSEMBLY
  // ──────────────────────────────────────────────────────────────────────────
  const vehicleBody = new THREE.Group();
  group.add(vehicleBody);

  // Lower Heavy Chassis Frame
  const chassisGeo = new THREE.BoxGeometry(3.0, 0.8, 10.5);
  const chassisMesh = new THREE.Mesh(chassisGeo, darkChassisMat);
  chassisMesh.position.y = 1.0;
  chassisMesh.castShadow = true;
  vehicleBody.add(chassisMesh);

  // Front Crew Cabin (Dual-cab)
  const cabGeo = new THREE.BoxGeometry(3.1, 2.6, 3.8);
  const cabMesh = new THREE.Mesh(cabGeo, rescueRedMat);
  cabMesh.position.set(0, 2.4, 3.2);
  cabMesh.castShadow = true;
  vehicleBody.add(cabMesh);

  // Windshield & Side Windows
  const windshieldGeo = new THREE.BoxGeometry(2.9, 1.2, 0.2);
  const windshieldMesh = new THREE.Mesh(windshieldGeo, tintedGlassMat);
  windshieldMesh.position.set(0, 2.7, 5.12);
  windshieldMesh.rotation.x = -0.15;
  vehicleBody.add(windshieldMesh);

  const sideWinGeo = new THREE.BoxGeometry(3.15, 1.0, 2.4);
  const sideWinMesh = new THREE.Mesh(sideWinGeo, tintedGlassMat);
  sideWinMesh.position.set(0, 2.7, 3.2);
  vehicleBody.add(sideWinMesh);

  // Rear Equipment Body / Pump Module
  const rearBodyGeo = new THREE.BoxGeometry(3.1, 2.8, 6.2);
  const rearBodyMesh = new THREE.Mesh(rearBodyGeo, rescueRedMat);
  rearBodyMesh.position.set(0, 2.5, -1.8);
  rearBodyMesh.castShadow = true;
  vehicleBody.add(rearBodyMesh);

  // White High-Visibility Side Stripes
  const stripeGeo = new THREE.BoxGeometry(3.15, 0.4, 10.0);
  const stripeMesh = new THREE.Mesh(stripeGeo, whiteStripeMat);
  stripeMesh.position.set(0, 2.1, 0.2);
  vehicleBody.add(stripeMesh);

  // Aluminum Roll-Up Equipment Lockers (3 per side)
  for (let side of [-1.58, 1.58]) {
    for (let l = 0; l < 3; l++) {
      const locker = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 1.6), aluminumShutterMat);
      locker.position.set(side, 2.3, -3.4 + l * 1.8);
      vehicleBody.add(locker);
    }
  }

  // Rear Chevron Safety Plate
  const chevron = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.8, 0.1), cautionChevronMat);
  chevron.position.set(0, 2.0, -4.95);
  vehicleBody.add(chevron);

  // Front Bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.6, 0.6), darkChassisMat);
  bumper.position.set(0, 0.9, 5.3);
  vehicleBody.add(bumper);

  // Headlights
  for (let hx of [-1.1, 1.1]) {
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.3, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    headlight.position.set(hx, 1.3, 5.15);
    vehicleBody.add(headlight);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. 6 ROTATING RUBBER WHEELS
  // ──────────────────────────────────────────────────────────────────────────
  const wheelMeshes: THREE.Mesh[] = [];
  const wheelRadius = 0.75;
  const wheelPositions = [
    { x: -1.6, z: 3.4 },
    { x: 1.6, z: 3.4 },
    { x: -1.6, z: -1.6 },
    { x: 1.6, z: -1.6 },
    { x: -1.6, z: -3.6 },
    { x: 1.6, z: -3.6 },
  ];

  wheelPositions.forEach(({ x, z }) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(x, wheelRadius, z);

    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.55, 24);
    const tire = new THREE.Mesh(tireGeo, tireRubberMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    const hubGeo = new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, 0.58, 16);
    const hub = new THREE.Mesh(hubGeo, steelRimMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    vehicleBody.add(wheelGroup);
    wheelMeshes.push(tire);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. ROOFTOP EMERGENCY LED STROBE LIGHTBARS
  // ──────────────────────────────────────────────────────────────────────────
  const lightbarGroup = new THREE.Group();
  lightbarGroup.position.set(0, 3.85, 3.2);

  const barHousing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 0.5), darkChassisMat);
  lightbarGroup.add(barHousing);

  const redBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.22, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  redBeacon.position.set(-0.6, 0.05, 0);
  lightbarGroup.add(redBeacon);

  const blueBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.22, 0.45),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6 })
  );
  blueBeacon.position.set(0.6, 0.05, 0);
  lightbarGroup.add(blueBeacon);

  const redLight = new THREE.PointLight(0xef4444, 0, 35, 1.5);
  redLight.position.set(-0.6, 0.4, 0);
  lightbarGroup.add(redLight);

  const blueLight = new THREE.PointLight(0x3b82f6, 0, 35, 1.5);
  blueLight.position.set(0.6, 0.4, 0);
  lightbarGroup.add(blueLight);

  vehicleBody.add(lightbarGroup);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. ARTICULATED ROOFTOP WATER MONITOR / TURRET CANNON
  // ──────────────────────────────────────────────────────────────────────────
  const turretBase = new THREE.Group();
  turretBase.position.set(0, 4.0, 0.5);

  const baseMount = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.4, 16), chromeTurretMat);
  turretBase.add(baseMount);

  const turretPitchGroup = new THREE.Group();
  turretPitchGroup.position.set(0, 0.35, 0);
  turretBase.add(turretPitchGroup);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 16), chromeTurretMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, 1.1);
  barrel.castShadow = true;
  turretPitchGroup.add(barrel);

  const nozzleTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, 0.6, 16),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
  );
  nozzleTip.rotation.x = Math.PI / 2;
  nozzleTip.position.set(0, 0, 2.4);
  turretPitchGroup.add(nozzleTip);

  vehicleBody.add(turretBase);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. MULTI-WAYPOINT ROAD NETWORK KINEMATICS
  // ──────────────────────────────────────────────────────────────────────────
  let routeWaypoints: THREE.Vector3[] = [];
  let currentWpIndex = 0;
  let isNavigating = false;
  let hasStaged = false;
  let emergencyLightsActive = false;

  let travelSpeed = 0;
  const maxCruisingSpeed = 32.0; // m/s (~115 km/h on straight open roads)
  const corneringSpeed = 12.0; // m/s around intersections
  const accelRate = 18.0;

  const dispatchOnRoute = (waypoints: THREE.Vector3[]) => {
    if (!waypoints || waypoints.length < 2) return;

    routeWaypoints = waypoints.map((w) => w.clone());
    currentWpIndex = 1;
    isNavigating = true;
    hasStaged = false;
    emergencyLightsActive = true;
    travelSpeed = 0;

    // Place truck at start waypoint (Perimeter Gateway)
    group.position.copy(routeWaypoints[0]);
    group.visible = true;

    // Initial heading towards the next road junction
    const nextWp = routeWaypoints[1];
    const dx = nextWp.x - routeWaypoints[0].x;
    const dz = nextWp.z - routeWaypoints[0].z;
    group.rotation.y = Math.atan2(dx, dz);
  };

  const setEmergencyLights = (active: boolean) => {
    emergencyLightsActive = active;
    if (!active) {
      redLight.intensity = 0;
      blueLight.intensity = 0;
    }
  };

  const aimTurretAt = (targetWorldPos: THREE.Vector3) => {
    const nozzlePos = new THREE.Vector3();
    turretBase.getWorldPosition(nozzlePos);

    const dir = targetWorldPos.clone().sub(nozzlePos);
    const localDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -group.rotation.y);

    const yaw = Math.atan2(localDir.x, localDir.z);
    turretBase.rotation.y = THREE.MathUtils.lerp(turretBase.rotation.y, yaw, 0.1);

    const horizDist = Math.sqrt(localDir.x * localDir.x + localDir.z * localDir.z);
    const pitch = -Math.atan2(localDir.y, horizDist) * 0.65;
    turretPitchGroup.rotation.x = THREE.MathUtils.lerp(turretPitchGroup.rotation.x, pitch, 0.1);
  };

  const getNozzleWorldPosition = (): THREE.Vector3 => {
    const pos = new THREE.Vector3();
    nozzleTip.getWorldPosition(pos);
    return pos;
  };

  const getStagingPosition = (): THREE.Vector3 => {
    return group.position.clone();
  };

  const update = (delta: number, time: number) => {
    if (!group.visible) return;

    // 1. Waypoint Road Navigation
    if (isNavigating && currentWpIndex < routeWaypoints.length) {
      const targetWp = routeWaypoints[currentWpIndex];
      const distToTarget = group.position.distanceTo(targetWp);
      const isFinalWp = currentWpIndex === routeWaypoints.length - 1;

      // Adjust speed for straight road vs approaching junction
      let desiredSpeed = isFinalWp ? 0 : maxCruisingSpeed;
      if (!isFinalWp && distToTarget < 18.0) {
        desiredSpeed = corneringSpeed;
      }

      if (isFinalWp && distToTarget < 12.0) {
        desiredSpeed = Math.max(2.0, distToTarget * 0.8);
      }

      // Smooth acceleration / braking
      if (travelSpeed < desiredSpeed) {
        travelSpeed = Math.min(desiredSpeed, travelSpeed + accelRate * delta);
      } else {
        travelSpeed = Math.max(desiredSpeed, travelSpeed - accelRate * 1.5 * delta);
      }

      // Move forward towards target waypoint
      const moveDist = travelSpeed * delta;
      if (distToTarget > 1.2) {
        const dx = targetWp.x - group.position.x;
        const dz = targetWp.z - group.position.z;
        const targetHeading = Math.atan2(dx, dz);

        // Smooth steering angle interpolation
        let angleDiff = targetHeading - group.rotation.y;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        group.rotation.y += angleDiff * Math.min(1.0, 6.0 * delta);

        const moveVec = new THREE.Vector3(Math.sin(group.rotation.y), 0, Math.cos(group.rotation.y));
        group.position.addScaledVector(moveVec, moveDist);

        // Rotate rubber wheels
        const wheelRotDelta = (moveDist / wheelRadius);
        wheelMeshes.forEach((w) => {
          w.rotation.x += wheelRotDelta;
        });
      } else {
        // Reached current waypoint
        currentWpIndex++;
        if (currentWpIndex >= routeWaypoints.length) {
          isNavigating = false;
          hasStaged = true;
          travelSpeed = 0;

          // Orient front directly towards central facility origin (0, 0, 0)
          const aimHeading = Math.atan2(-group.position.x, -group.position.z);
          group.rotation.y = aimHeading;
        }
      }
    }

    // 2. Emergency Strobe Lightbars (Alternating dual strobe)
    if (emergencyLightsActive) {
      const strobe1 = Math.sin(time * 28.0) > 0.1 ? 4.5 : 0;
      const strobe2 = Math.sin(time * 28.0 + Math.PI) > 0.1 ? 4.5 : 0;
      redLight.intensity = strobe1;
      blueLight.intensity = strobe2;
    }
  };

  const reset = () => {
    group.visible = false;
    isNavigating = false;
    hasStaged = false;
    emergencyLightsActive = false;
    travelSpeed = 0;
    currentWpIndex = 0;
    routeWaypoints = [];
    redLight.intensity = 0;
    blueLight.intensity = 0;
    turretBase.rotation.set(0, 0, 0);
    turretPitchGroup.rotation.set(0, 0, 0);
    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
  };

  scene.add(group);

  return {
    group,
    update,
    dispatchOnRoute,
    isStaged: () => hasStaged,
    getStagingPosition,
    getNozzleWorldPosition,
    aimTurretAt,
    setEmergencyLights,
    reset,
  };
};
