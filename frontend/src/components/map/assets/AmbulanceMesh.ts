import * as THREE from 'three';

// Create Procedural Decal Texture for Ambulance Side Graphics (Red pulse line + Blue Star of Life)
const createAmbulanceDecalTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // White base background
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 512, 256);

  // Red Emergency Stripe
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(0, 110, 512, 36);

  // Red Heartbeat Pulse Wave Graphics
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(20, 128);
  ctx.lineTo(120, 128);
  ctx.lineTo(140, 80);
  ctx.lineTo(160, 170);
  ctx.lineTo(180, 50);
  ctx.lineTo(200, 190);
  ctx.lineTo(220, 128);
  ctx.lineTo(340, 128);
  ctx.lineTo(360, 90);
  ctx.lineTo(380, 160);
  ctx.lineTo(400, 128);
  ctx.lineTo(490, 128);
  ctx.stroke();

  // Blue Star of Life Emblem
  const cx = 430;
  const cy = 60;
  ctx.fillStyle = '#2563eb';
  for (let angle = 0; angle < 360; angle += 60) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.fillRect(-6, -28, 12, 56);
    ctx.restore();
  }
  // White Rod of Asclepius center circle
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  // "AMBULANCE" Text
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('AMBULANCE', 40, 50);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

export const createRealisticAmbulanceMesh = (): {
  group: THREE.Group;
  sirenRedLight: THREE.PointLight;
  sirenBlueLight: THREE.PointLight;
} => {
  const group = new THREE.Group();

  // PBR Materials
  const decalTexture = createAmbulanceDecalTexture();
  const bodyMat = new THREE.MeshStandardMaterial({
    map: decalTexture,
    roughness: 0.25,
    metalness: 0.1,
  });

  const darkBumperMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.2,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.1,
    metalness: 0.9,
    transparent: true,
    opacity: 0.85,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.1,
    metalness: 0.95,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.9,
  });

  // 1. MAIN CARGO VAN BODY (Reference Image 1)
  const vanW = 8;
  const vanH = 6;
  const vanL = 16;

  // Main Rear Cargo Block
  const rearBodyGeo = new THREE.BoxGeometry(vanW, vanH, 10);
  const rearBody = new THREE.Mesh(rearBodyGeo, bodyMat);
  rearBody.position.set(0, vanH / 2 + 1, -1);
  rearBody.castShadow = true;
  rearBody.receiveShadow = true;
  group.add(rearBody);

  // Front Sloped Cab
  const cabGeo = new THREE.BoxGeometry(vanW - 0.2, vanH - 0.8, 6);
  const cab = new THREE.Mesh(cabGeo, bodyMat);
  cab.position.set(0, (vanH - 0.8) / 2 + 1, 6.5);
  cab.castShadow = true;
  group.add(cab);

  // Sloped Hood
  const hoodGeo = new THREE.BoxGeometry(vanW - 0.4, 2, 3.5);
  const hood = new THREE.Mesh(hoodGeo, bodyMat);
  hood.position.set(0, 2.2, 8.5);
  hood.rotation.x = -0.15;
  hood.castShadow = true;
  group.add(hood);

  // Front Bumper & Radiator Grille
  const bumperGeo = new THREE.BoxGeometry(vanW + 0.2, 1.8, 2);
  const bumper = new THREE.Mesh(bumperGeo, darkBumperMat);
  bumper.position.set(0, 1.8, 10);
  group.add(bumper);

  const grilleGeo = new THREE.BoxGeometry(vanW - 2, 1.2, 0.4);
  const grille = new THREE.Mesh(grilleGeo, darkBumperMat);
  grille.position.set(0, 2.6, 10.1);
  group.add(grille);

  // Front Mercedes-Style Chrome Logo / Emblem
  const logoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.2, 16), chromeMat);
  logoMesh.rotation.x = Math.PI / 2;
  logoMesh.position.set(0, 2.7, 10.3);
  group.add(logoMesh);

  // 2. WINDSHIELD & SIDE WINDOW GLASS
  const windshieldGeo = new THREE.BufferGeometry();
  // Sloped Windshield glass pane
  const wsMesh = new THREE.Mesh(new THREE.PlaneGeometry(vanW - 1, 3.2), glassMat);
  wsMesh.position.set(0, 4.2, 7.8);
  wsMesh.rotation.x = -0.45;
  group.add(wsMesh);

  // Side Windows (Left & Right)
  const sideWinGeo = new THREE.PlaneGeometry(3.5, 2);
  const sideWinLeft = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinLeft.position.set(-vanW / 2 - 0.05, 4.2, 6.2);
  sideWinLeft.rotation.y = -Math.PI / 2;
  group.add(sideWinLeft);

  const sideWinRight = new THREE.Mesh(sideWinGeo, glassMat);
  sideWinRight.position.set(vanW / 2 + 0.05, 4.2, 6.2);
  sideWinRight.rotation.y = Math.PI / 2;
  group.add(sideWinRight);

  // Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.3, 1, 1.5);
  const mirrorLeft = new THREE.Mesh(mirrorGeo, darkBumperMat);
  mirrorLeft.position.set(-vanW / 2 - 0.6, 4.2, 7);
  group.add(mirrorLeft);

  const mirrorRight = new THREE.Mesh(mirrorGeo, darkBumperMat);
  mirrorRight.position.set(vanW / 2 + 0.6, 4.2, 7);
  group.add(mirrorRight);

  // Headlights (Glowing Xenon Glass Lenses)
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const hlGeo = new THREE.BoxGeometry(1.4, 0.8, 0.3);
  const hlLeft = new THREE.Mesh(hlGeo, headlightMat);
  hlLeft.position.set(-2.8, 2.6, 10.2);
  group.add(hlLeft);

  const hlRight = new THREE.Mesh(hlGeo, headlightMat);
  hlRight.position.set(2.8, 2.6, 10.2);
  group.add(hlRight);

  // 3. WHEELS & TIRES & HUBCAPS (4 Wheels)
  const wheelRadius = 1.4;
  const wheelThickness = 1.0;
  const wheelPositions = [
    [-vanW / 2 - 0.2, wheelRadius, 5], // Front Left
    [vanW / 2 + 0.2, wheelRadius, 5], // Front Right
    [-vanW / 2 - 0.2, wheelRadius, -4], // Rear Left
    [vanW / 2 + 0.2, wheelRadius, -4], // Rear Right
  ];

  wheelPositions.forEach(([x, y, z]) => {
    const wheelGroup = new THREE.Group();
    // Tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    wheelGroup.add(tire);

    // Chrome Hubcap Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.6, wheelRadius * 0.6, wheelThickness + 0.1, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    wheelGroup.position.set(x, y, z);
    group.add(wheelGroup);
  });

  // 4. ROOFTOP DUAL EMERGENCY LED LIGHT BAR & LIGHTS
  const lightBarGeo = new THREE.BoxGeometry(6, 0.8, 1.8);
  const lightBarMat = new THREE.MeshBasicMaterial({ color: 0x2563eb });
  const lightBar = new THREE.Mesh(lightBarGeo, lightBarMat);
  lightBar.position.set(0, vanH + 1.4, 5.5);
  group.add(lightBar);

  // Red & Blue Emergency Siren Point Lights
  const sirenRedLight = new THREE.PointLight(0xef4444, 5, 45);
  sirenRedLight.position.set(-2, vanH + 2.5, 5.5);
  group.add(sirenRedLight);

  const sirenBlueLight = new THREE.PointLight(0x3b82f6, 5, 45);
  sirenBlueLight.position.set(2, vanH + 2.5, 5.5);
  group.add(sirenBlueLight);

  return { group, sirenRedLight, sirenBlueLight };
};
