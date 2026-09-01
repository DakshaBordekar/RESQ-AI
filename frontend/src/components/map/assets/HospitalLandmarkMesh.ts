import * as THREE from 'three';

export const createRealisticHospitalLandmarkMesh = (): THREE.Group => {
  const group = new THREE.Group();

  // PBR Materials
  const glassFacadeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.1,
    metalness: 0.85,
  });

  const whiteWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
    metalness: 0.1,
  });

  const accentPillarMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.25,
    metalness: 0.6,
  });

  const crossRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // 1. TOWER BASE PLAZA (Reference Image 2)
  const plazaH = 6;
  const plazaGeo = new THREE.BoxGeometry(42, plazaH, 36);
  const plaza = new THREE.Mesh(plazaGeo, whiteWallMat);
  plaza.position.set(0, plazaH / 2, 0);
  plaza.castShadow = true;
  plaza.receiveShadow = true;
  group.add(plaza);

  // Entrance Canopy
  const canopyGeo = new THREE.BoxGeometry(26, 1.5, 14);
  const canopy = new THREE.Mesh(canopyGeo, whiteWallMat);
  canopy.position.set(0, 4.5, 20);
  canopy.castShadow = true;
  group.add(canopy);

  // Entrance Support Columns
  for (let x = -10; x <= 10; x += 20) {
    const colGeo = new THREE.CylinderGeometry(0.8, 0.8, 4.5, 12);
    const col = new THREE.Mesh(colGeo, accentPillarMat);
    col.position.set(x, 2.25, 25);
    group.add(col);
  }

  // 2. TALL MULTI-STORY GLASS TOWER (Reference Image 2)
  const towerW = 28;
  const towerH = 75;
  const towerD = 24;

  const towerGeo = new THREE.BoxGeometry(towerW, towerH, towerD);
  const tower = new THREE.Mesh(towerGeo, glassFacadeMat);
  tower.position.set(0, plazaH + towerH / 2, 0);
  tower.castShadow = true;
  tower.receiveShadow = true;
  group.add(tower);

  // White Horizontal Floor Slab Bands
  const numFloors = 18;
  for (let f = 0; f <= numFloors; f++) {
    const floorY = plazaH + (f * towerH) / numFloors;
    const bandGeo = new THREE.BoxGeometry(towerW + 0.6, 0.9, towerD + 0.6);
    const band = new THREE.Mesh(bandGeo, whiteWallMat);
    band.position.set(0, floorY, 0);
    group.add(band);
  }

  // 3. CURVED ARCHITECTURAL ACCENT PILLAR (Reference Image 2)
  // Curves up the front of the skyscraper facade
  const curvePoints: THREE.Vector3[] = [];
  for (let y = plazaH; y <= plazaH + towerH + 6; y += 4) {
    const progress = (y - plazaH) / towerH;
    const x = Math.sin(progress * Math.PI * 1.5) * 8;
    curvePoints.push(new THREE.Vector3(x, y, towerD / 2 + 1));
  }
  const curvePath = new THREE.CatmullRomCurve3(curvePoints);
  const curveGeo = new THREE.TubeGeometry(curvePath, 32, 1.4, 12, false);
  const curvePillar = new THREE.Mesh(curveGeo, accentPillarMat);
  group.add(curvePillar);

  // 4. ROOFTOP HELIPAD & RED MEDICAL CROSS (Reference Image 2)
  const roofY = plazaH + towerH;

  // Helipad Platform
  const helipadGeo = new THREE.CylinderGeometry(11, 11, 1.2, 32);
  const helipad = new THREE.Mesh(helipadGeo, whiteWallMat);
  helipad.position.set(0, roofY + 0.6, 0);
  group.add(helipad);

  // Helipad Yellow 'H' Ring
  const ringGeo = new THREE.RingGeometry(8, 9.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, roofY + 1.25, 0);
  group.add(ring);

  // Red Medical Cross Emblem on Facade Top
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(10, 2.5, 0.8), crossRedMat);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(2.5, 10, 0.8), crossRedMat);
  crossH.position.set(0, roofY - 6, towerD / 2 + 0.8);
  crossV.position.set(0, roofY - 6, towerD / 2 + 0.8);
  group.add(crossH);
  group.add(crossV);

  return group;
};
