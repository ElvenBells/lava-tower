/* ==========================================================================
   Визуальные эффекты, частицы, пулы молний, детализированные 3D-модели оружия,
   снарядов, лута, эффектов предметов (Угольный сапог, Ледяная подошва, Громовой пояс,
   Пар, Плавильный кристалл), бомб и опасных зон боссов
   ========================================================================== */

/* ---------- 1. Пул молний (Three.Line с готовыми буферами) ---------- */

const BOLT_MAX_SEGMENTS = 16;
const boltPool = [];

function acquireBolt(parentObj, fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount, maxLifetime, customColorHex) {
  let bolt = boltPool.pop();
  if (!bolt) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BOLT_MAX_SEGMENTS * 3), 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xe8ccff,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    line.renderOrder = 7;
    bolt = {
      line,
      geo,
      mat,
      from: { x: 0, y: 0, z: 0 },
      to: { x: 0, y: 0, z: 0 },
      u: { x: 0, y: 0, z: 0 },
      v: { x: 0, y: 0, z: 0 },
      amp: 0,
      n: 0,
      life: 0,
      max: 0,
      parent: null
    };
  }

  const towerId = (typeof state !== 'undefined' && state && state.towerId) || 'ash';
  if (customColorHex !== undefined) {
    bolt.mat.color.setHex(customColorHex);
  } else {
    bolt.mat.color.setHex(towerId === 'ice' ? 0xb8f4ff : 0xe8ccff);
  }

  bolt.n = segmentCount;
  bolt.amp = amplitude;
  bolt.life = 0;
  bolt.max = maxLifetime;
  bolt.mat.opacity = 1;
  bolt.geo.setDrawRange(0, segmentCount);
  bolt.from.x = fromX;
  bolt.from.y = fromY;
  bolt.from.z = fromZ;
  bolt.to.x = toX;
  bolt.to.y = toY;
  bolt.to.z = toZ;

  const dx = toX - fromX;
  const dy = toY - fromY;
  const dz = toZ - fromZ;
  let ax = 0;
  let ay = 0;
  const az = 0;
  if (Math.random() < 0.5) {
    ay = 1;
  } else {
    ax = 1;
  }

  let ux = dy * az - dz * ay;
  let uy = dz * ax - dx * az;
  let uz = dx * ay - dy * ax;
  let len = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
  ux /= len;
  uy /= len;
  uz /= len;

  let vx = dy * uz - dz * uy;
  let vy = dz * ux - dx * uz;
  let vz = dx * uy - dy * ux;
  len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
  vx /= len;
  vy /= len;
  vz /= len;

  bolt.u.x = ux;
  bolt.u.y = uy;
  bolt.u.z = uz;
  bolt.v.x = vx;
  bolt.v.y = vy;
  bolt.v.z = vz;

  bolt.line.visible = true;
  bolt.parent = parentObj;
  parentObj.add(bolt.line);
  jitterBoltVertices(bolt);
  return bolt;
}

function releaseBolt(bolt) {
  if (bolt.line.parent) {
    bolt.line.parent.remove(bolt.line);
  }
  bolt.line.visible = false;
  bolt.parent = null;
  boltPool.push(bolt);
}

function jitterBoltVertices(bolt) {
  const arr = bolt.geo.attributes.position.array;
  const count = bolt.n;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const falloff = Math.sin(Math.PI * t);
    const offset1 = (Math.random() - 0.5) * 2 * bolt.amp * falloff;
    const offset2 = (Math.random() - 0.5) * 2 * bolt.amp * falloff;
    arr[i * 3] = bolt.from.x + (bolt.to.x - bolt.from.x) * t + bolt.u.x * offset1 + bolt.v.x * offset2;
    arr[i * 3 + 1] = bolt.from.y + (bolt.to.y - bolt.from.y) * t + bolt.u.y * offset1 + bolt.v.y * offset2;
    arr[i * 3 + 2] = bolt.from.z + (bolt.to.z - bolt.from.z) * t + bolt.u.z * offset1 + bolt.v.z * offset2;
  }
  bolt.geo.attributes.position.needsUpdate = true;
}

function updateBoltList(boltList, dt) {
  for (let i = boltList.length - 1; i >= 0; i--) {
    const bolt = boltList[i];
    bolt.life += dt;
    if (bolt.life >= bolt.max) {
      releaseBolt(bolt);
      boltList.splice(i, 1);
    } else {
      bolt.mat.opacity = 1 - bolt.life / bolt.max;
      if (Math.random() < 0.6) {
        jitterBoltVertices(bolt);
      }
    }
  }
}

const _boltPointA = { x: 0, y: 0, z: 0 };
const _boltPointB = { x: 0, y: 0, z: 0 };

function spawnShypInnerBolt(enemy) {
  for (const pt of [_boltPointA, _boltPointB]) {
    const rx = Math.random() - 0.5;
    const ry = Math.random() - 0.5;
    const rz = Math.random() - 0.5;
    const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
    const radius = 0.15 + Math.random() * 0.3;
    pt.x = (rx / len) * radius;
    pt.y = (ry / len) * radius * 1.4;
    pt.z = (rz / len) * radius;
  }
  enemy.bolts.push(
    acquireBolt(
      enemy.mesh,
      _boltPointA.x,
      _boltPointA.y,
      _boltPointA.z,
      _boltPointB.x,
      _boltPointB.y,
      _boltPointB.z,
      0.1,
      9,
      0.1 + Math.random() * 0.2
    )
  );
}

function spawnShypOuterBolt(enemy) {
  const rx = Math.random() - 0.5;
  const ry = Math.random() - 0.5;
  const rz = Math.random() - 0.5;
  const len = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
  const dirX = rx / len;
  const dirY = ry / len;
  const dirZ = rz / len;
  const distToShell = 1 / ((Math.abs(dirX) + Math.abs(dirZ)) / 0.78 + Math.abs(dirY) / 1.5);
  const t0 = distToShell * 0.95;
  const t1 = distToShell + 0.35 + Math.random() * 0.55;
  enemy.bolts.push(
    acquireBolt(
      enemy.mesh,
      dirX * t0,
      dirY * t0,
      dirZ * t0,
      dirX * t1,
      dirY * t1,
      dirZ * t1,
      0.07,
      9,
      0.1 + Math.random() * 0.2
    )
  );
}

const globalBolts = [];

function spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount, customColorHex) {
  globalBolts.push(
    acquireBolt(
      scene,
      fromX,
      fromY,
      fromZ,
      toX,
      toY,
      toZ,
      amplitude,
      segmentCount,
      0.16 + Math.random() * 0.22,
      customColorHex
    )
  );
}

function updateGlobalBolts(dt) {
  updateBoltList(globalBolts, dt);
}

function releaseAllGlobalBolts() {
  for (const bolt of globalBolts) {
    releaseBolt(bolt);
  }
  globalBolts.length = 0;
}

/* ---------- 2. Пулы опасностей и спецэффектов боссов ---------- */

const bossRingGeo = (function buildBossRing3DGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  // Объёмный тороидальный гребень + плоское кольцо свечения + 16 наклонных зубцов
  const torus = new THREE.TorusGeometry(1.0, 0.075, 8, 40);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.06, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xffffff)
  });
  const baseRing = new THREE.RingGeometry(0.84, 1.16, 40);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xffd890)
  });
  const spikeGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 1.0,
      0.09,
      Math.sin(a) * 1.0,
      Math.sin(a) * 0.45,
      0,
      -Math.cos(a) * 0.45,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: spikeGeo, matrix: tempMat.clone(), color: new THREE.Color(0xffffff) });
  }
  return mergeGeometryParts(parts);
})();

const bossRings = [];
for (let i = 0; i < 6; i++) {
  const mesh = new THREE.Mesh(
    bossRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff8c30,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  mesh.renderOrder = 4;
  scene.add(mesh);
  bossRings.push({ mesh, active: 0, x: 0, y: 0, z: 0, radius: 0, speed: 9, damage: 0, hasHit: 0, maxRadius: 15 });
}
let bossRingCursor = 0;

function spawnBossRing(x, y, z, damage, speed, maxRadius) {
  const ring = bossRings[bossRingCursor++ % bossRings.length];
  ring.active = 1;
  ring.x = x;
  ring.y = y;
  ring.z = z;
  ring.radius = 1;
  ring.speed = speed || 9;
  ring.damage = damage || 0;
  ring.hasHit = 0;
  ring.maxRadius = maxRadius || 15;
  ring.mesh.visible = true;
  ring.mesh.position.set(x, y + 0.05, z);
  ring.mesh.scale.set(1, 1, 1);
  return ring;
}

const bossArcGeo = new THREE.RingGeometry(0.95, 1.25, 52, 1, 0, Math.PI * 1.5);
const bossArcs = [];
for (let i = 0; i < 4; i++) {
  const mesh = new THREE.Mesh(
    bossArcGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff7a20,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.renderOrder = 4;
  scene.add(mesh);
  bossArcs.push({ mesh, active: 0, x: 0, y: 0, z: 0, radius: 0, gapAngle: 0, damage: 0, hasHit: 0 });
}
let bossArcCursor = 0;

function spawnBossArc(x, y, z, gapAngle, damage) {
  const arc = bossArcs[bossArcCursor++ % bossArcs.length];
  arc.active = 1;
  arc.x = x;
  arc.y = y;
  arc.z = z;
  arc.radius = 1.5;
  arc.gapAngle = gapAngle;
  arc.damage = damage;
  arc.hasHit = 0;
  arc.mesh.visible = true;
  arc.mesh.position.set(x, y + 0.08, z);
  arc.mesh.rotation.z = -Math.PI * 1.75 - gapAngle;
  arc.mesh.scale.setScalar(1.5);
  return arc;
}

const bossGeysers = [];
const geyserJetGeo = new THREE.CylinderGeometry(0.28, 0.62, 7, 10, 1, true);
geyserJetGeo.translate(0, 3.5, 0);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.1, 1.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffd060,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.renderOrder = 4;
  scene.add(ring);

  const jet = new THREE.Mesh(
    geyserJetGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffc050,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  jet.visible = false;
  jet.renderOrder = 4;
  jet.scale.y = 0.01;
  scene.add(jet);

  bossGeysers.push({ stage: 0, timer: 0, x: 0, y: 0, z: 0, ring, jet, hasHit: 0 });
}

function placeGeysersNear(playerX, playerY, playerZ) {
  let placed = 0;
  let attempts = 0;
  const chosenPoints = [];
  while (placed < 3 && attempts++ < 40) {
    const angle = Math.random() * TWO_PI;
    const radius = 3.5 + Math.random() * 6.5;
    const x = playerX + Math.cos(angle) * radius;
    const z = playerZ + Math.sin(angle) * radius;
    if (x * x + z * z > 700) continue;

    let isValid = hypot2D(x - playerX, z - playerZ) > 3.2;
    for (const pt of chosenPoints) {
      if (hypot2D(pt[0] - x, pt[1] - z) < 3.6) isValid = false;
    }
    if (!isValid) continue;

    chosenPoints.push([x, z]);
    const geyser = bossGeysers[placed++];
    geyser.stage = 1;
    geyser.timer = 0;
    geyser.x = x;
    geyser.y = playerY;
    geyser.z = z;
    geyser.hasHit = 0;
    geyser.ring.position.set(x, playerY + 0.06, z);
    geyser.ring.visible = true;
    geyser.ring.material.opacity = 0.3;
    geyser.jet.position.set(x, playerY + 0.05, z);
    geyser.jet.visible = false;
    geyser.jet.scale.y = 0.01;
  }
}

const golemDecalMat = new THREE.MeshBasicMaterial({
  map: TEXTURES.golemFloor,
  color: 0xff6a18,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const golemDecal = new THREE.Mesh(new THREE.CircleGeometry(8.5, 40), golemDecalMat);
golemDecal.rotation.x = -Math.PI / 2;
golemDecal.visible = false;
golemDecal.renderOrder = 3;
golemDecal.position.y = -500;
scene.add(golemDecal);
let golemDecalTargetOpacity = 0;

const runeMat = new THREE.MeshBasicMaterial({
  map: TEXTURES.wombRune,
  color: 0xc070ff,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const wombRune = new THREE.Mesh(new THREE.CircleGeometry(7.5, 44), runeMat);
wombRune.rotation.x = -Math.PI / 2;
wombRune.visible = false;
wombRune.renderOrder = 3;
wombRune.position.y = -500;
scene.add(wombRune);
let wombRuneTargetOpacity = 0;

const summonRings = [];
for (let i = 0; i < 4; i++) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.45, 32),
    new THREE.MeshBasicMaterial({
      color: 0xc070ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.renderOrder = 3;
  scene.add(mesh);
  summonRings.push({ mesh, x: 0, y: 0, z: 0, arcT: Math.random() });
}
let summonRingsTargetOpacity = 0;

function placeSummonRings(bossEntity) {
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * TWO_PI + 0.6;
    let x = bossEntity.x + Math.cos(angle) * 6.5;
    let z = bossEntity.z + Math.sin(angle) * 6.5;
    const radialDist = hypot2D(x, z);
    if (radialDist > 26) {
      x *= 26 / radialDist;
      z *= 26 / radialDist;
    }
    const ring = summonRings[i];
    ring.x = x;
    ring.z = z;
    ring.y = bossEntity.wombFloorY !== undefined ? bossEntity.wombFloorY : bossEntity.y - 2.3;
    ring.mesh.position.set(x, ring.y + 0.06, z);
  }
}

const SLAG_COUNT = 28;
const slagGeo = jitterGeometry(new THREE.DodecahedronGeometry(0.16, 0), 0.05);
const slagMat = new THREE.MeshStandardMaterial({
  color: 0x3e383c,
  roughness: 0.85,
  flatShading: true,
  emissive: 0xff4400,
  emissiveIntensity: 1.5
});
const slagInstancedMesh = new THREE.InstancedMesh(slagGeo, slagMat, SLAG_COUNT);
slagInstancedMesh.frustumCulled = false;
scene.add(slagInstancedMesh);

const slagData = [];
const _bossDummyObj = new THREE.Object3D();
for (let i = 0; i < SLAG_COUNT; i++) {
  slagData.push({
    active: 0,
    x: 0,
    y: -500,
    z: 0,
    floorY: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    rvx: 0,
    rvy: 0,
    rvz: 0,
    life: 0,
    max: 1
  });
  _bossDummyObj.position.set(0, -500, 0);
  _bossDummyObj.rotation.set(0, 0, 0);
  _bossDummyObj.scale.setScalar(1);
  _bossDummyObj.updateMatrix();
  slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
}
let slagCursor = 0;

function spawnSlagBurst(x, y, z, count, power) {
  for (let k = 0; k < count; k++) {
    const piece = slagData[slagCursor++ % SLAG_COUNT];
    const angle = Math.random() * TWO_PI;
    piece.active = 1;
    piece.x = x;
    piece.y = y + 0.15;
    piece.z = z;
    piece.floorY = y + 0.08;
    piece.life = 0;
    piece.max = 1.0 + Math.random() * 0.6;
    piece.vx = Math.cos(angle) * (2 + Math.random() * 4) * power;
    piece.vy = 3 + Math.random() * 4.5;
    piece.vz = Math.sin(angle) * (2 + Math.random() * 4) * power;
    piece.rx = Math.random() * 3;
    piece.ry = Math.random() * 3;
    piece.rz = Math.random() * 3;
    piece.rvx = (Math.random() - 0.5) * 10;
    piece.rvy = (Math.random() - 0.5) * 10;
    piece.rvz = (Math.random() - 0.5) * 10;
  }
}

const DRIP_COUNT = 18;
const dripGeo = new THREE.SphereGeometry(0.09, 6, 6);
dripGeo.scale(1, 2.4, 1);
const dripMat = new THREE.MeshBasicMaterial({ color: 0xffc040 });
const dripInstancedMesh = new THREE.InstancedMesh(dripGeo, dripMat, DRIP_COUNT);
dripInstancedMesh.frustumCulled = false;
scene.add(dripInstancedMesh);

const dripData = [];
for (let i = 0; i < DRIP_COUNT; i++) {
  dripData.push({ active: 0, x: 0, y: -500, z: 0, floorY: 0, velocityY: 0 });
  _bossDummyObj.position.set(0, -500, 0);
  _bossDummyObj.rotation.set(0, 0, 0);
  _bossDummyObj.scale.setScalar(1);
  _bossDummyObj.updateMatrix();
  dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
}
let dripCursor = 0;

function spawnMagmaDripAt(x, y, z, floorY) {
  const drip = dripData[dripCursor++ % DRIP_COUNT];
  drip.active = 1;
  drip.x = x + (Math.random() - 0.5) * 0.3;
  drip.y = y;
  drip.z = z + (Math.random() - 0.5) * 0.3;
  drip.floorY = floorY;
  drip.velocityY = -0.4 - Math.random() * 0.6;
}

/* ---------- 3. Детализированные 3D-модели оружия и снарядов ---------- */

// 3A. ОГНЕННЫЕ ШАРЫ («Пылающий Метеор Горна»):
// Слой 1 — раскалённое солнечное ядро, корона из 8 спиральных языков пламени и вытянутый кометный хвост
const fireballCoreGeometry = (function buildFireballCoreGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const whiteHot = new THREE.Color(0xfff8d0);
  const goldHot = new THREE.Color(0xffb830);
  const flameOrange = new THREE.Color(0xff5208);
  const tailCrimson = new THREE.Color(0xd82200);

  // Внутреннее бело-золотое звёздное ядро
  parts.push({
    geo: new THREE.IcosahedronGeometry(0.24, 1),
    matrix: computeTransformMatrix(0, 0, 0.06, 0, 0, 0, 1.0, 1.0, 1.15, tempMat).clone(),
    color: whiteHot
  });
  // Магматическая оболочка вокруг ядра
  parts.push({
    geo: jitterGeometry(new THREE.DodecahedronGeometry(0.32, 0), 0.04),
    matrix: computeTransformMatrix(0, 0, 0, 0.3, 0.5, 0, 0.96, 0.96, 1.12, tempMat).clone(),
    color: goldHot
  });
  // Передний рассекающий огненный гребень
  parts.push({
    geo: new THREE.ConeGeometry(0.18, 0.36, 5),
    matrix: computeTransformMatrix(0, 0, 0.25, Math.PI / 2, 0, 0, 1, 1, 1, tempMat).clone(),
    color: whiteHot
  });
  // Корона из 8 загнутых назад языков пламени
  const tongueGeo = new THREE.ConeGeometry(0.11, 0.58, 4);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    const rad = 0.21;
    const tx = Math.cos(a) * rad;
    const ty = Math.sin(a) * rad;
    computeTransformMatrix(
      tx,
      ty,
      -0.22,
      -Math.PI / 2 + ty * 0.65,
      -tx * 0.65,
      a + 0.4,
      0.85,
      1.0 + (i % 2) * 0.28,
      0.65,
      tempMat
    );
    parts.push({
      geo: tongueGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? goldHot : flameOrange
    });
  }
  // Центральный вихревой кометный хвост (вытянут вдоль -Z)
  parts.push({
    geo: new THREE.ConeGeometry(0.18, 0.88, 6),
    matrix: computeTransformMatrix(0, 0, -0.46, -Math.PI / 2, 0, 0, 0.92, 1, 0.92, tempMat).clone(),
    color: flameOrange
  });
  parts.push({
    geo: new THREE.ConeGeometry(0.1, 1.12, 5),
    matrix: computeTransformMatrix(0, 0, -0.62, -Math.PI / 2, 0.3, 0, 0.85, 1, 0.85, tempMat).clone(),
    color: tailCrimson
  });

  return mergeGeometryParts(parts);
})();

// Слой 2 — расколотая обсидианово-угольная корка вокруг огненного шара
const fireballCrustGeometry = (function buildFireballCrustGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const darkObsidian = new THREE.Color(0x221014);
  const charCoal = new THREE.Color(0x3b1818);
  const slagPieceGeo = jitterGeometry(new THREE.DodecahedronGeometry(0.125, 0), 0.03);

  const plateOffsets = [
    [0.24, 0.12, 0.14, 0.2, 0.5, 0.1],
    [-0.24, -0.1, 0.15, -0.4, 0.2, 0.8],
    [0.1, -0.25, 0.1, 0.6, -0.3, 0.4],
    [-0.12, 0.24, 0.08, -0.5, 0.7, -0.2],
    [0.2, -0.16, -0.12, 0.3, -0.6, 0.5],
    [-0.21, 0.15, -0.14, -0.2, 0.4, -0.7]
  ];
  for (let i = 0; i < plateOffsets.length; i++) {
    const [x, y, z, rx, ry, rz] = plateOffsets[i];
    computeTransformMatrix(x, y, z, rx, ry, rz, 1.15, 0.72, 1.25, tempMat);
    parts.push({
      geo: slagPieceGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? darkObsidian : charCoal
    });
  }
  return mergeGeometryParts(parts);
})();

const playerFireballInstancedMesh = new THREE.InstancedMesh(
  fireballCoreGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xff5a00,
    emissiveIntensity: 2.1,
    roughness: 0.15,
    flatShading: true
  }),
  250
);

const playerFireballCrustInstancedMesh = new THREE.InstancedMesh(
  fireballCrustGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x7a1800,
    emissiveIntensity: 0.85,
    roughness: 0.82,
    metalness: 0.25,
    flatShading: true
  }),
  250
);
playerFireballCrustInstancedMesh.frustumCulled = false;
playerFireballCrustInstancedMesh.count = 0;

// 3B. ВРАЖЕСКИЕ СНАРЯДЫ («Осколок Искажения / Ледяное Веретено»):
const enemyProjectileGeometry = (function buildEnemyProjectileGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const brightTip = new THREE.Color(0xffffff);
  const bodyShade = new THREE.Color(0xd8b8ff);
  const darkFin = new THREE.Color(0x683890);

  // Гранёное веретено-остриё (вдоль оси Z)
  parts.push({
    geo: new THREE.OctahedronGeometry(0.24, 0),
    matrix: computeTransformMatrix(0, 0, 0.08, 0, 0, 0, 0.78, 0.78, 1.95, tempMat).clone(),
    color: brightTip
  });
  // Два скрещенных энергетических кольца вокруг ядра
  const ringGeo = new THREE.TorusGeometry(0.27, 0.032, 6, 14);
  parts.push({
    geo: ringGeo,
    matrix: computeTransformMatrix(0, 0, 0, 0.65, 0.35, 0, 1, 1, 1, tempMat).clone(),
    color: bodyShade
  });
  parts.push({
    geo: ringGeo,
    matrix: computeTransformMatrix(0, 0, 0, -0.65, -0.35, Math.PI / 2, 0.88, 0.88, 0.88, tempMat).clone(),
    color: bodyShade
  });
  // 4 стабилизирующих хвостовых шипа
  const finGeo = new THREE.ConeGeometry(0.065, 0.38, 4);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + Math.PI / 4;
    computeTransformMatrix(
      Math.cos(a) * 0.16,
      Math.sin(a) * 0.16,
      -0.24,
      -Math.PI / 2,
      0,
      a,
      0.8,
      1,
      0.8,
      tempMat
    );
    parts.push({ geo: finGeo, matrix: tempMat.clone(), color: darkFin });
  }
  return mergeGeometryParts(parts);
})();

const enemyProjectileMat = new THREE.MeshStandardMaterial({
  color: 0xff58b0,
  vertexColors: true,
  emissive: 0xff0080,
  emissiveIntensity: 2.0,
  roughness: 0.18,
  metalness: 0.35,
  flatShading: true
});

const enemyProjectileInstancedMesh = new THREE.InstancedMesh(
  enemyProjectileGeometry,
  enemyProjectileMat,
  100
);

// 3C. ОРБИТАЛЬНЫЕ КЛИНКИ («Кованый Клинок Пепельной Гильдии» + рунное ядро + серповидный шлейф рассечения):
// Основное кованое тело клинка (в локальных координатах: ось Y — вдоль клинка от навершия к острию,
// затем поворачивается rotateX(Math.PI / 2) для совместимости с матрицей рендера)
const bladeGeometry = (function buildDetailedOrbitalBladeGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();

  const silverEdge = new THREE.Color(0xeef6ff);
  const steelBevel = new THREE.Color(0xb8c6d8);
  const darkFuller = new THREE.Color(0x2b303a);
  const bronzeGuard = new THREE.Color(0x4f7a69);
  const darkGuard = new THREE.Color(0x343942);
  const leatherGrip = new THREE.Color(0x4e2d18);

  // 1. Гранёное навершие (Pommel) с когтями
  parts.push({
    geo: new THREE.OctahedronGeometry(0.095, 0),
    matrix: computeTransformMatrix(0, -0.62, 0, 0, Math.PI / 4, 0, 1.15, 1.25, 0.72, tempMat).clone(),
    color: darkGuard
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.058, 0.072, 0.06, 6),
    matrix: computeTransformMatrix(0, -0.53, 0, 0, 0, 0, 1, 1, 0.75, tempMat).clone(),
    color: bronzeGuard
  });

  // 2. Рукоять в кожаной перевязи с тремя стальными кольцами
  parts.push({
    geo: new THREE.CylinderGeometry(0.042, 0.048, 0.30, 8),
    matrix: computeTransformMatrix(0, -0.36, 0, 0, 0, 0, 1, 1, 0.78, tempMat).clone(),
    color: leatherGrip
  });
  for (const ry of [-0.45, -0.36, -0.27]) {
    parts.push({
      geo: new THREE.CylinderGeometry(0.052, 0.052, 0.022, 8),
      matrix: computeTransformMatrix(0, ry, 0, 0, 0, 0, 1, 1, 0.82, tempMat).clone(),
      color: steelBevel
    });
  }

  // 3. Массивная фигурная гарда (перекрестье) с крыльями-клыками
  parts.push({
    geo: new THREE.BoxGeometry(0.26, 0.095, 0.115),
    matrix: computeTransformMatrix(0, -0.19, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: bronzeGuard
  });
  for (const s of [-1, 1]) {
    // Крылья гарды, загнутые вперёд к клинку
    parts.push({
      geo: new THREE.ConeGeometry(0.058, 0.30, 4),
      matrix: computeTransformMatrix(
        s * 0.22,
        -0.15,
        0,
        0,
        0,
        -s * 1.18,
        0.95,
        1,
        0.65,
        tempMat
      ).clone(),
      color: darkGuard
    });
    // Боковые клыки-парирователи на пяте клинка (рикассо)
    parts.push({
      geo: new THREE.ConeGeometry(0.042, 0.16, 4),
      matrix: computeTransformMatrix(
        s * 0.145,
        0.02,
        0,
        0,
        0,
        -s * 0.92,
        0.85,
        1,
        0.52,
        tempMat
      ).clone(),
      color: steelBevel
    });
  }

  // 4. Усиленная пята клинка (Ricasso) и тёмный центральный дол (Fuller)
  parts.push({
    geo: new THREE.BoxGeometry(0.21, 0.22, 0.072),
    matrix: computeTransformMatrix(0, -0.04, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkGuard
  });
  parts.push({
    geo: new THREE.BoxGeometry(0.082, 0.78, 0.056),
    matrix: computeTransformMatrix(0, 0.36, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkFuller
  });

  // 5. Двойные скошенные режущие кромки (Bevels) из светлой стали
  for (const s of [-1, 1]) {
    parts.push({
      geo: new THREE.ConeGeometry(0.145, 0.96, 4),
      matrix: computeTransformMatrix(
        s * 0.058,
        0.38,
        0,
        0,
        Math.PI / 4,
        s * 0.025,
        0.88,
        1,
        0.26,
        tempMat
      ).clone(),
      color: steelBevel
    });
    parts.push({
      geo: new THREE.ConeGeometry(0.095, 0.92, 4),
      matrix: computeTransformMatrix(
        s * 0.098,
        0.38,
        0,
        0,
        Math.PI / 4,
        s * 0.03,
        0.65,
        1,
        0.18,
        tempMat
      ).clone(),
      color: silverEdge
    });
  }

  // 6. Алмазное остриё клинка и пилообразные зубья на режущей кромке
  parts.push({
    geo: new THREE.ConeGeometry(0.165, 0.52, 4),
    matrix: computeTransformMatrix(0, 0.96, 0, 0, Math.PI / 4, 0, 0.95, 1, 0.25, tempMat).clone(),
    color: silverEdge
  });
  for (let t = 0; t < 3; t++) {
    const ty = 0.14 + t * 0.22;
    parts.push({
      geo: new THREE.ConeGeometry(0.045, 0.13, 4),
      matrix: computeTransformMatrix(0.14, ty, 0, 0, 0, -0.78, 0.85, 1, 0.32, tempMat).clone(),
      color: silverEdge
    });
  }

  const merged = mergeGeometryParts(parts);
  merged.rotateX(Math.PI / 2);
  return merged;
})();

// Энергетическое ядро и раскалённая/рунная жила клинка
const bladeEnergyCoreGeometry = (function buildBladeEnergyCoreGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const coreBright = new THREE.Color(0xffffff);
  const veinGlow = new THREE.Color(0x90f8ff);

  // Рунный кристалл в перекрестье гарды
  parts.push({
    geo: new THREE.OctahedronGeometry(0.078, 0),
    matrix: computeTransformMatrix(0, -0.19, 0, 0, 0, 0, 1.0, 1.35, 0.95, tempMat).clone(),
    color: coreBright
  });
  // Кристалл в навершии рукояти
  parts.push({
    geo: new THREE.OctahedronGeometry(0.052, 0),
    matrix: computeTransformMatrix(0, -0.62, 0, 0, 0, 0, 0.85, 1.1, 0.95, tempMat).clone(),
    color: veinGlow
  });
  // Светящаяся рунная жила вдоль дола клинка
  parts.push({
    geo: new THREE.BoxGeometry(0.036, 0.76, 0.066),
    matrix: computeTransformMatrix(0, 0.38, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: coreBright
  });
  // Светящееся остриё
  parts.push({
    geo: new THREE.ConeGeometry(0.055, 0.34, 4),
    matrix: computeTransformMatrix(0, 0.92, 0, 0, Math.PI / 4, 0, 0.8, 1, 0.42, tempMat).clone(),
    color: veinGlow
  });

  const merged = mergeGeometryParts(parts);
  merged.rotateX(Math.PI / 2);
  return merged;
})();

// Серповидный 3D-шлейф рассечения воздуха за каждым орбитальным клинком
const bladeSlashTrailGeometry = (function buildBladeSlashTrailGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const segCount = 6;

  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const fade = 1 - t * 0.72;
    const segColor = new THREE.Color(0.55 * fade + 0.45, 0.88 * fade + 0.12, 1.0 * fade);
    // Дуга уходит назад от ведущей кромки клинка
    const xOff = -0.14 - i * 0.16;
    const zOff = 0.15 + i * 0.08 - t * t * 0.12;
    const len = 0.75 * (1 - t * 0.45);
    const width = 0.09 * (1 - t * 0.55);
    computeTransformMatrix(
      xOff,
      0,
      zOff,
      Math.PI / 2,
      -0.18 * i,
      0,
      width / 0.1,
      len / 0.8,
      0.22,
      tempMat
    );
    parts.push({
      geo: new THREE.ConeGeometry(0.1, 0.8, 4),
      matrix: tempMat.clone(),
      color: segColor
    });
  }
  return mergeGeometryParts(parts);
})();

const orbitalBladeInstancedMesh = new THREE.InstancedMesh(
  bladeGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x283848,
    emissiveIntensity: 0.55,
    metalness: 0.82,
    roughness: 0.22,
    flatShading: true
  }),
  50
);

const orbitalBladeCoreMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x45e8ff,
  emissiveIntensity: 2.2,
  roughness: 0.15,
  flatShading: true
});

const orbitalBladeCoreInstancedMesh = new THREE.InstancedMesh(
  bladeEnergyCoreGeometry,
  orbitalBladeCoreMat,
  50
);

const orbitalBladeTrailMat = new THREE.MeshBasicMaterial({
  color: 0x60f0ff,
  vertexColors: true,
  transparent: true,
  opacity: 0.58,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const orbitalBladeTrailInstancedMesh = new THREE.InstancedMesh(
  bladeSlashTrailGeometry,
  orbitalBladeTrailMat,
  50
);

playerFireballInstancedMesh.frustumCulled = false;
playerFireballCrustInstancedMesh.frustumCulled = false;
enemyProjectileInstancedMesh.frustumCulled = false;
orbitalBladeInstancedMesh.frustumCulled = false;
orbitalBladeCoreInstancedMesh.frustumCulled = false;
orbitalBladeTrailInstancedMesh.frustumCulled = false;
orbitalBladeCoreInstancedMesh.count = 0;
orbitalBladeTrailInstancedMesh.count = 0;

scene.add(
  playerFireballInstancedMesh,
  playerFireballCrustInstancedMesh,
  enemyProjectileInstancedMesh,
  orbitalBladeInstancedMesh,
  orbitalBladeCoreInstancedMesh,
  orbitalBladeTrailInstancedMesh
);

/* ---------- 4. Частицы: пыль, искры и дым ---------- */

const dustGeo = new THREE.BufferGeometry();
const DUST_PARTICLE_COUNT = 200;
const dustPositions = new Float32Array(DUST_PARTICLE_COUNT * 3);
for (let i = 0; i < DUST_PARTICLE_COUNT * 3; i += 3) {
  dustPositions[i] = (Math.random() - 0.5) * 60;
  dustPositions[i + 1] = Math.random() * 180;
  dustPositions[i + 2] = (Math.random() - 0.5) * 60;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dustMat = new THREE.PointsMaterial({
  color: 0xffaa66,
  size: 0.3,
  transparent: true,
  opacity: 0.4
});
const dustParticles = new THREE.Points(dustGeo, dustMat);
scene.add(dustParticles);

const SPARK_PARTICLE_COUNT = 450;
const sparkGeo = new THREE.BufferGeometry();
const sparkPositions = new Float32Array(SPARK_PARTICLE_COUNT * 3);
const sparkColors = new Float32Array(SPARK_PARTICLE_COUNT * 3);
const sparkData = [];

for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
  sparkPositions[i * 3] = 0;
  sparkPositions[i * 3 + 1] = -100;
  sparkPositions[i * 3 + 2] = 0;
  sparkData[i] = {
    velocity: new THREE.Vector3(),
    life: 0,
    max: 0,
    active: false,
    color: new THREE.Color()
  };
}
sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkColors, 3));

const sparkPoints = new THREE.Points(
  sparkGeo,
  new THREE.PointsMaterial({
    size: 0.095,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
);
sparkPoints.frustumCulled = false;
scene.add(sparkPoints);

let sparkCursor = 0;
function spawnSparkBurst(x, y, z, count, mode) {
  const towerId = (typeof state !== 'undefined' && state && state.towerId) || 'ash';
  for (let k = 0; k < count; k++) {
    const idx = sparkCursor++ % SPARK_PARTICLE_COUNT;
    const angle = Math.random() * Math.PI * 2;
    const hx = Math.cos(angle);
    const hz = Math.sin(angle);
    const item = sparkData[idx];

    if (mode === 'takeoff') {
      sparkPositions[idx * 3] = x + hx * 0.7;
      sparkPositions[idx * 3 + 1] = y - 0.75 + Math.random() * 0.3;
      sparkPositions[idx * 3 + 2] = z + hz * 0.7;
      item.velocity.set(
        hx * (1.5 + Math.random() * 2.0),
        -(0.5 + Math.random() * 1.5),
        hz * (1.5 + Math.random() * 2.0)
      );
    } else if (mode === 'elec' || mode === 'fire' || mode === 'steam') {
      sparkPositions[idx * 3] = x + hx * (0.25 + Math.random() * 0.45);
      sparkPositions[idx * 3 + 1] = y + 0.2 + Math.random() * 0.5;
      sparkPositions[idx * 3 + 2] = z + hz * (0.25 + Math.random() * 0.45);
      item.velocity.set(
        hx * (2.2 + Math.random() * 3.2),
        1.2 + Math.random() * 2.8,
        hz * (2.2 + Math.random() * 3.2)
      );
    } else {
      sparkPositions[idx * 3] = x + hx * 0.95;
      sparkPositions[idx * 3 + 1] = y + 0.12 + Math.random() * 0.15;
      sparkPositions[idx * 3 + 2] = z + hz * 0.95;
      item.velocity.set(
        hx * (2.0 + Math.random() * 2.5),
        0.6 + Math.random() * 1.6,
        hz * (2.0 + Math.random() * 2.5)
      );
    }
    item.life = 0;
    item.max = 0.5 + Math.random() * 0.7;
    if (mode === 'elec') {
      item.color.setHSL(0.74 + Math.random() * 0.12, 1.0, 0.68 + Math.random() * 0.28);
    } else if (mode === 'fire') {
      item.color.setHSL(0.04 + Math.random() * 0.09, 1.0, 0.58 + Math.random() * 0.32);
    } else if (mode === 'steam') {
      item.color.setHSL(0.54 + Math.random() * 0.06, 0.65, 0.82 + Math.random() * 0.16);
    } else if (towerId === 'ice') {
      item.color.setHSL(0.53 + Math.random() * 0.06, 0.95, 0.68 + Math.random() * 0.25);
    } else if (towerId === 'void') {
      item.color.setHSL(0.76 + Math.random() * 0.08, 1.0, 0.62 + Math.random() * 0.28);
    } else {
      item.color.setHSL(0.06 + Math.random() * 0.07, 1, 0.55 + Math.random() * 0.3);
    }
    item.active = true;
  }
}

const SMOKE_PARTICLE_COUNT = 200;
const smokeGeo = new THREE.BufferGeometry();
const smokePositions = new Float32Array(SMOKE_PARTICLE_COUNT * 3);
const smokeColors = new Float32Array(SMOKE_PARTICLE_COUNT * 3);
const smokeData = [];
const smokeStartColor = new THREE.Color(0x2e2c30);
const smokeEndColor = new THREE.Color(0x140a18);

for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
  smokePositions[i * 3] = 0;
  smokePositions[i * 3 + 1] = -100;
  smokePositions[i * 3 + 2] = 0;
  smokeData[i] = { velocity: new THREE.Vector3(), life: 0, max: 0, active: false };
}
smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
smokeGeo.setAttribute('color', new THREE.BufferAttribute(smokeColors, 3));

const smokePoints = new THREE.Points(
  smokeGeo,
  new THREE.PointsMaterial({
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  })
);
smokePoints.frustumCulled = false;
scene.add(smokePoints);

let smokeCursor = 0;
function spawnSmokePuff(x, y, z, count) {
  for (let k = 0; k < count; k++) {
    const idx = smokeCursor++ % SMOKE_PARTICLE_COUNT;
    const angle = Math.random() * Math.PI * 2;
    const hx = Math.cos(angle);
    const hz = Math.sin(angle);
    smokePositions[idx * 3] = x + hx * (0.8 + Math.random() * 0.4);
    smokePositions[idx * 3 + 1] = y + 0.15 + Math.random() * 0.25;
    smokePositions[idx * 3 + 2] = z + hz * (0.8 + Math.random() * 0.4);
    const item = smokeData[idx];
    item.velocity.set(
      hx * (0.6 + Math.random() * 0.9),
      0.3 + Math.random() * 0.6,
      hz * (0.6 + Math.random() * 0.9)
    );
    item.life = 0;
    item.max = 0.8 + Math.random() * 0.8;
    item.active = true;
  }
}

/* ---------- 5. Объёмные 3D-эффекты ударных волн, приземлений и предметов ---------- */

// 5A. 3D-короны приземления врагов/боссов (вместо плоских 2D-колец)
const fireLandingRingGeo = (function build3DFireLandingCrownGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const baseRing = new THREE.RingGeometry(0.75, 1.04, 28);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xff9830)
  });
  const torus = new THREE.TorusGeometry(0.9, 0.045, 6, 28);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.04, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xffe080)
  });
  const toothGeo = new THREE.ConeGeometry(0.075, 0.32, 4);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.9,
      0.11,
      Math.sin(a) * 0.9,
      Math.sin(a) * 0.52,
      0,
      -Math.cos(a) * 0.52,
      1,
      0.85 + (i % 2) * 0.35,
      1,
      tempMat
    );
    parts.push({
      geo: toothGeo,
      matrix: tempMat.clone(),
      color: i % 2 ? new THREE.Color(0xffffff) : new THREE.Color(0xffa838)
    });
  }
  return mergeGeometryParts(parts);
})();

const voidLandingRingGeo = (function build3DVoidLandingCrownGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const baseRing = new THREE.RingGeometry(0.48, 0.72, 28);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xc878ff)
  });
  const torus = new THREE.TorusGeometry(0.6, 0.036, 6, 24);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.04, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new THREE.Color(0xf0d0ff)
  });
  const shardGeo = new THREE.OctahedronGeometry(0.08, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.6,
      0.1,
      Math.sin(a) * 0.6,
      Math.sin(a) * 0.4,
      a,
      -Math.cos(a) * 0.4,
      0.7,
      1.8,
      0.7,
      tempMat
    );
    parts.push({ geo: shardGeo, matrix: tempMat.clone(), color: new THREE.Color(0xffffff) });
  }
  return mergeGeometryParts(parts);
})();

const fireLandingRings = [];
for (let i = 0; i < 15; i++) {
  const ring = new THREE.Mesh(
    fireLandingRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff7a20,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.visible = false;
  ring.userData = { life: 1 };
  scene.add(ring);
  fireLandingRings.push(ring);
}
let fireLandingRingCursor = 0;

function spawnFireLandingRing(x, y, z) {
  const ring = fireLandingRings[fireLandingRingCursor++ % fireLandingRings.length];
  ring.position.set(x, y + 0.02, z);
  ring.visible = true;
  ring.userData.life = 0;
  ring.scale.set(1, 1, 1);
}

const voidLandingRings = [];
for (let i = 0; i < 12; i++) {
  const ring = new THREE.Mesh(
    voidLandingRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xa060ff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.visible = false;
  ring.userData = { life: 1 };
  scene.add(ring);
  voidLandingRings.push(ring);
}
let voidLandingRingCursor = 0;

function spawnVoidLandingRing(x, y, z) {
  const ring = voidLandingRings[voidLandingRingCursor++ % voidLandingRings.length];
  ring.position.set(x, y + 0.02, z);
  ring.visible = true;
  ring.userData.life = 0;
  ring.scale.set(1, 1, 1);
}

// 5B. 3D УДАРНАЯ ВОЛНА (`wave` и общие импульсы `waveEffectRings`):
// Вместо плоского кружка — объёмный двойной тор + корона из 12 наклонных 3D-зубцов + трещиноватый диск
const wave3DGeometry = (function build3DWaveShockGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const brightCol = new THREE.Color(0xffffff);
  const midCol = new THREE.Color(0xb8e8ff);

  // Внешний объёмный тороидальный гребень волны
  const outerTorus = new THREE.TorusGeometry(0.94, 0.052, 8, 36);
  outerTorus.rotateX(Math.PI / 2);
  parts.push({
    geo: outerTorus,
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: brightCol
  });
  // Внутренний приподнятый гармонический тор
  const innerTorus = new THREE.TorusGeometry(0.68, 0.032, 6, 28);
  innerTorus.rotateX(Math.PI / 2);
  parts.push({
    geo: innerTorus,
    matrix: computeTransformMatrix(0, 0.14, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: midCol
  });
  // Плоское опорное свечение у земли
  const baseRing = new THREE.RingGeometry(0.72, 1.02, 32);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: midCol
  });
  // Корона из 12 наклонных наружу 3D-шипов/зубцов вдоль фронта ударной волны
  const spikeGeo = new THREE.ConeGeometry(0.062, 0.36, 4);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.91,
      0.12,
      Math.sin(a) * 0.91,
      Math.sin(a) * 0.62,
      0,
      -Math.cos(a) * 0.62,
      0.9,
      0.85 + (i % 2) * 0.35,
      0.9,
      tempMat
    );
    parts.push({
      geo: spikeGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? brightCol : midCol
    });
  }
  return mergeGeometryParts(parts);
})();

const waveEffectRings = [...Array(10)].map(() => {
  const mesh = new THREE.Mesh(
    wave3DGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  mesh.lifeLeft = 0;
  mesh.maxLife = 0.36;
  mesh.targetRadius = 3;
  scene.add(mesh);
  return mesh;
});
let waveEffectRingCursor = 0;

function spawnWaveRingEffect(x, y, z, radius, colorHex) {
  const mesh = waveEffectRings[waveEffectRingCursor++ % waveEffectRings.length];
  mesh.position.set(x, y + 0.04, z);
  mesh.targetRadius = radius;
  mesh.scale.set(radius * 0.42, Math.max(0.8, radius * 0.35), radius * 0.42);
  mesh.material.color.setHex(colorHex);
  mesh.maxLife = 0.36;
  mesh.lifeLeft = 0.36;
  mesh.visible = true;
}

// 5C. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «УГОЛЬНОГО САПОГА» (`spawnCoalBootEruption`):
// При приземлении с Угольным сапогом из пола пробивается корона 3D базальтово-лавовых клыков,
// раскалённый кратер с трещинами, огненный тор и восходящий вихрь пламени Горна!
const coalSpikesRingGeo = (function buildCoalBootSpikesGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const darkBasalt = new THREE.Color(0x2b1214);
  const redMagma = new THREE.Color(0xff4800);
  const brightGold = new THREE.Color(0xffd250);

  // Внутренний круг из 8 высоких базальтово-магматических пиков (r = 1.05 м)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI + 0.15;
    const h = 1.05 + (i % 2) * 0.32;
    const spikeGeo = jitterGeometry(new THREE.ConeGeometry(0.18, h, 5), 0.03);
    computeTransformMatrix(
      Math.cos(a) * 1.05,
      h * 0.42,
      Math.sin(a) * 1.05,
      Math.sin(a) * 0.32,
      a,
      -Math.cos(a) * 0.32,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: spikeGeo, matrix: tempMat.clone(), color: i % 2 ? redMagma : darkBasalt });
  }
  // Внешняя корона из 12 наклонных огненных клыков (r = 2.05 м)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI;
    const h = 0.78 + (i % 3) * 0.22;
    const fangGeo = new THREE.ConeGeometry(0.14, h, 5);
    computeTransformMatrix(
      Math.cos(a) * 2.05,
      h * 0.38,
      Math.sin(a) * 2.05,
      Math.sin(a) * 0.52,
      a,
      -Math.cos(a) * 0.52,
      1,
      1,
      1,
      tempMat
    );
    parts.push({
      geo: fangGeo,
      matrix: tempMat.clone(),
      color: i % 3 === 0 ? brightGold : redMagma
    });
  }
  // Кольцо расколотых глыб шлака у основания кратера
  const boulderGeo = jitterGeometry(new THREE.DodecahedronGeometry(0.22, 0), 0.05);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TWO_PI + 0.3;
    computeTransformMatrix(
      Math.cos(a) * 1.52,
      0.12,
      Math.sin(a) * 1.52,
      i * 0.7,
      a,
      i * 0.4,
      1.3,
      0.75,
      1.1,
      tempMat
    );
    parts.push({ geo: boulderGeo, matrix: tempMat.clone(), color: darkBasalt });
  }
  return mergeGeometryParts(parts);
})();

const coalPlumeGeo = new THREE.CylinderGeometry(1.15, 0.48, 1.65, 14, 1, true);
coalPlumeGeo.translate(0, 0.82, 0);

const coalTorusGeo = new THREE.TorusGeometry(1.0, 0.09, 8, 32);
coalTorusGeo.rotateX(Math.PI / 2);

const coalBootEruptions = [];
for (let i = 0; i < 6; i++) {
  const group = new THREE.Group();
  group.visible = false;

  const crater = new THREE.Mesh(
    new THREE.CircleGeometry(2.9, 32),
    new THREE.MeshBasicMaterial({
      map: TEXTURES.golemFloor,
      color: 0xff7820,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = 0.03;
  group.add(crater);

  const spikes = new THREE.Mesh(
    coalSpikesRingGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0xff4800,
      emissiveIntensity: 1.85,
      roughness: 0.45,
      metalness: 0.2,
      flatShading: true
    })
  );
  group.add(spikes);

  const plume = new THREE.Mesh(
    coalPlumeGeo,
    new THREE.MeshBasicMaterial({
      map: lavaTexture,
      color: 0xffaa30,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(plume);

  const torus = new THREE.Mesh(
    coalTorusGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffc040,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  torus.position.y = 0.12;
  group.add(torus);

  scene.add(group);
  coalBootEruptions.push({
    group,
    crater,
    spikes,
    plume,
    torus,
    active: 0,
    life: 0,
    maxLife: 0.68,
    scaleMul: 1
  });
}
let coalBootEruptionCursor = 0;

function spawnCoalBootEruption(x, y, z, stacks = 1) {
  const item = coalBootEruptions[coalBootEruptionCursor++ % coalBootEruptions.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.68;
  item.scaleMul = 1 + Math.min(0.45, (stacks - 1) * 0.1);
  item.group.position.set(x, y + 0.01, z);
  item.group.rotation.y = Math.random() * TWO_PI;
  item.group.visible = true;

  item.crater.scale.setScalar(item.scaleMul);
  item.crater.material.opacity = 0.92;
  item.spikes.scale.set(item.scaleMul, 0.08, item.scaleMul);
  item.spikes.material.emissiveIntensity = 2.4;
  item.plume.scale.set(0.5 * item.scaleMul, 0.2, 0.5 * item.scaleMul);
  item.plume.material.opacity = 0.85;
  item.torus.scale.setScalar(0.55);
  item.torus.material.opacity = 0.95;

  spawnSlagBurst(x, y, z, Math.min(18, 7 + stacks * 2), 0.95);
  spawnSparkBurst(x, y, z, Math.min(36, 18 + stacks * 4), 'fire');
  spawnSmokePuff(x, y, z, 7);
  spawnFireLandingRing(x, y, z);
}

// 5D. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ЛЕДЯНОЙ ПОДОШВЫ» (`spawnFrostSlideCrystal`):
// Во время скольжения (Shift) за героем вырастает дорожка из 3D ледяных друз и морозных игл
const frostClusterGeo = (function buildFrostSlideClusterGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const iceBright = new THREE.Color(0xe8fbff);
  const iceCyan = new THREE.Color(0x78dcff);
  const iceDeep = new THREE.Color(0x2890d8);

  // Центральный высокий шестигранный кристалл льда
  parts.push({
    geo: new THREE.ConeGeometry(0.16, 0.92, 6),
    matrix: computeTransformMatrix(0, 0.42, 0, -0.18, 0, 0, 1, 1, 1, tempMat).clone(),
    color: iceBright
  });
  // Боковые наклонные кристаллы-иглы
  for (const s of [-1, 1]) {
    parts.push({
      geo: new THREE.ConeGeometry(0.12, 0.68, 5),
      matrix: computeTransformMatrix(
        s * 0.22,
        0.28,
        -0.06,
        -0.25,
        0,
        -s * 0.48,
        1,
        1,
        1,
        tempMat
      ).clone(),
      color: iceCyan
    });
  }
  // Нижняя кристаллическая розетка у основания
  parts.push({
    geo: new THREE.OctahedronGeometry(0.24, 0),
    matrix: computeTransformMatrix(0, 0.08, 0, 0, Math.PI / 4, 0, 1.35, 0.45, 1.35, tempMat).clone(),
    color: iceDeep
  });
  return mergeGeometryParts(parts);
})();

const frostSlideCrystals = [];
for (let i = 0; i < 16; i++) {
  const mesh = new THREE.Mesh(
    frostClusterGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0x38b8ff,
      emissiveIntensity: 1.5,
      roughness: 0.12,
      metalness: 0.35,
      transparent: true,
      opacity: 0.9,
      flatShading: true
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  frostSlideCrystals.push({ mesh, active: 0, life: 0, maxLife: 0.85 });
}
let frostSlideCursor = 0;

function spawnFrostSlideCrystal(x, y, z, facingAngle) {
  const item = frostSlideCrystals[frostSlideCursor++ % frostSlideCrystals.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.82;
  const jitterX = (Math.random() - 0.5) * 0.45;
  const jitterZ = (Math.random() - 0.5) * 0.45;
  item.mesh.position.set(x + jitterX, y + 0.01, z + jitterZ);
  item.mesh.rotation.y = (facingAngle || 0) + (Math.random() - 0.5) * 0.6;
  item.mesh.scale.set(0.85, 0.1, 0.85);
  item.mesh.material.opacity = 0.92;
  item.mesh.visible = true;
}

// 5E. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ СИНЕРГИИ «ЛЁД + ОГОНЬ = ПАР (×2)» (`spawnSteamBurstEffect`):
const steamCloudGeo = (function buildSteamCloudClusterGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const cWhite = new THREE.Color(0xffffff);
  const cWarm = new THREE.Color(0xffe6cc);
  const cCool = new THREE.Color(0xcff4ff);

  const puffOffsets = [
    [0, 0.45, 0, 0.52, cWhite],
    [0.38, 0.32, 0.22, 0.38, cCool],
    [-0.36, 0.35, -0.2, 0.4, cWarm],
    [0.24, 0.68, -0.28, 0.36, cWhite],
    [-0.28, 0.62, 0.3, 0.35, cCool],
    [0, 0.92, 0, 0.42, cWhite]
  ];
  for (const [px, py, pz, r, col] of puffOffsets) {
    parts.push({
      geo: new THREE.IcosahedronGeometry(r, 1),
      matrix: computeTransformMatrix(px, py, pz, px, py, pz, 1.15, 0.9, 1.15, tempMat).clone(),
      color: col
    });
  }
  const ring = new THREE.TorusGeometry(0.85, 0.06, 6, 24);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, 0.25, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: cCool
  });
  return mergeGeometryParts(parts);
})();

const steamBurstEffects = [];
for (let i = 0; i < 6; i++) {
  const mesh = new THREE.Mesh(
    steamCloudGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  steamBurstEffects.push({ mesh, active: 0, life: 0, maxLife: 0.55 });
}
let steamBurstCursor = 0;

function spawnSteamBurstEffect(x, y, z) {
  const item = steamBurstEffects[steamBurstCursor++ % steamBurstEffects.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.55;
  item.mesh.position.set(x, y + 0.05, z);
  item.mesh.rotation.y = Math.random() * TWO_PI;
  item.mesh.scale.setScalar(0.55);
  item.mesh.material.opacity = 0.9;
  item.mesh.visible = true;

  spawnSparkBurst(x, y + 0.4, z, 14, 'steam');
  spawnSparkBurst(x, y + 0.4, z, 8, 'fire');
  spawnSmokePuff(x, y + 0.2, z, 8);
}

// 5F. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ГРОМОВОГО ПОЯСА» (`spawnThunderChainEffect`):
// Электрическая плазменная клетка-вспышка на поражённой цели + двойная дуга молнии
const thunderCageGeo = (function buildThunderCageGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const cWhite = new THREE.Color(0xffffff);
  const cViolet = new THREE.Color(0xd880ff);
  const cCyan = new THREE.Color(0x70f4ff);

  // Два скрещенных октаэдра плазменного разряда
  parts.push({
    geo: new THREE.OctahedronGeometry(0.58, 0),
    matrix: computeTransformMatrix(0, 0.65, 0, 0, 0, 0, 0.85, 1.45, 0.85, tempMat).clone(),
    color: cViolet
  });
  parts.push({
    geo: new THREE.OctahedronGeometry(0.46, 0),
    matrix: computeTransformMatrix(0, 0.65, 0, 0.6, Math.PI / 4, 0.6, 1.15, 0.95, 1.15, tempMat).clone(),
    color: cCyan
  });
  // Вертикальное копьё молнии
  parts.push({
    geo: new THREE.ConeGeometry(0.14, 2.2, 4),
    matrix: computeTransformMatrix(0, 1.1, 0, 0, Math.PI / 4, 0, 1, 1, 1, tempMat).clone(),
    color: cWhite
  });
  // Наземное кольцо разряда
  const ring = new THREE.TorusGeometry(0.75, 0.04, 6, 20);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, 0.08, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: cCyan
  });
  return mergeGeometryParts(parts);
})();

const thunderStrikeEffects = [];
for (let i = 0; i < 10; i++) {
  const mesh = new THREE.Mesh(
    thunderCageGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  thunderStrikeEffects.push({ mesh, active: 0, life: 0, maxLife: 0.34 });
}
let thunderStrikeCursor = 0;

function spawnThunderChainEffect(fromX, fromY, fromZ, toX, toY, toZ) {
  spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, 0.22, 12, 0x88f4ff);
  spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, 0.14, 10, 0xe298ff);

  const strike = thunderStrikeEffects[thunderStrikeCursor++ % thunderStrikeEffects.length];
  strike.active = 1;
  strike.life = 0;
  strike.maxLife = 0.34;
  strike.mesh.position.set(toX, toY - 0.5, toZ);
  strike.mesh.rotation.y = Math.random() * TWO_PI;
  strike.mesh.scale.setScalar(0.8);
  strike.mesh.material.opacity = 0.95;
  strike.mesh.visible = true;

  spawnSparkBurst(toX, toY, toZ, 8, 'elec');
}

// 5G. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ПЛАВИЛЬНОГО КРИСТАЛЛА» (`spawnSmeltCrystalBurst`):
const smeltBurstGeo = (function buildSmeltCrystalBurstGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const cGold = new THREE.Color(0xffe070);
  const cAmber = new THREE.Color(0xff8418);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.42,
      0.45 + (i % 2) * 0.22,
      Math.sin(a) * 0.42,
      Math.sin(a) * 0.45,
      a,
      -Math.cos(a) * 0.45,
      0.55,
      1.85,
      0.55,
      tempMat
    );
    parts.push({
      geo: new THREE.OctahedronGeometry(0.18, 0),
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? cGold : cAmber
    });
  }
  return mergeGeometryParts(parts);
})();

const smeltCrystalBursts = [];
for (let i = 0; i < 8; i++) {
  const mesh = new THREE.Mesh(
    smeltBurstGeo,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  smeltCrystalBursts.push({ mesh, active: 0, life: 0, maxLife: 0.48 });
}
let smeltBurstCursor = 0;

function spawnSmeltCrystalBurst(x, y, z) {
  const item = smeltCrystalBursts[smeltBurstCursor++ % smeltCrystalBursts.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.48;
  item.mesh.position.set(x, y + 0.1, z);
  item.mesh.rotation.y = Math.random() * TWO_PI;
  item.mesh.scale.setScalar(0.65);
  item.mesh.material.opacity = 0.95;
  item.mesh.visible = true;
  spawnSparkBurst(x, y + 0.5, z, 10, 'fire');
}

// 5H. 3D-МОДЕЛИ АКТИВНЫХ БОМБ (`bombVisualPool` для Лавового шторма, Взрывных элит и бомб боссов):
const bombModelGeo = (function build3DBombModelGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const shellCol = new THREE.Color(0x2e1a22);
  const coreCol = new THREE.Color(0xffaa30);
  const hotCol = new THREE.Color(0xfff0a0);

  // Внутреннее пульсирующее ядро бомбы
  parts.push({
    geo: new THREE.IcosahedronGeometry(0.38, 1),
    matrix: computeTransformMatrix(0, 0.55, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: hotCol
  });
  // Внешняя гранёная клетка-оправа с шипами
  parts.push({
    geo: new THREE.DodecahedronGeometry(0.44, 0),
    matrix: computeTransformMatrix(0, 0.55, 0, 0.4, 0.4, 0, 1, 1, 1, tempMat).clone(),
    color: shellCol
  });
  const spikeGeo = new THREE.ConeGeometry(0.085, 0.34, 4);
  const dirs = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1]
  ];
  for (const [dx, dy, dz] of dirs) {
    computeTransformMatrix(
      dx * 0.46,
      0.55 + dy * 0.46,
      dz * 0.46,
      dz * (Math.PI / 2) + (dy < 0 ? Math.PI : 0),
      0,
      -dx * (Math.PI / 2),
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: spikeGeo, matrix: tempMat.clone(), color: coreCol });
  }
  // Вращающееся экваториальное кольцо
  const ring = new THREE.TorusGeometry(0.62, 0.038, 6, 20);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, 0.55, 0, 0.25, 0, 0.25, 1, 1, 1, tempMat).clone(),
    color: coreCol
  });
  return mergeGeometryParts(parts);
})();

const bombVisualPool = [...Array(12)].map(() => {
  const mesh = new THREE.Mesh(
    bombModelGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0xff4400,
      emissiveIntensity: 1.8,
      roughness: 0.3,
      metalness: 0.45,
      flatShading: true
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
});

/* ---------- 6. Переключение палитры эффектов под тему башни ---------- */

/**
 * Переключает цветовую палитру всех опасных зон боссов, колец, осколков, капель и снарядов
 * в соответствии с темой выбранной башни ('ash' / 'ice' / 'void').
 */
function applyTowerHazardPalette(towerId) {
  const ringHex = towerId === 'ice' ? 0x70dcff : towerId === 'void' ? 0xc055ff : 0xff8c30;
  const arcHex = towerId === 'ice' ? 0x90ecff : towerId === 'void' ? 0xb442ff : 0xff7a20;
  const geyserRingHex = towerId === 'ice' ? 0xb8f6ff : towerId === 'void' ? 0xe088ff : 0xffd060;
  const geyserJetHex = towerId === 'ice' ? 0x78dcff : towerId === 'void' ? 0xa838ff : 0xffc050;
  const runeHex = towerId === 'ice' ? 0x88ecff : towerId === 'void' ? 0xd878ff : 0xc070ff;

  for (const r of bossRings) r.mesh.material.color.setHex(ringHex);
  for (const a of bossArcs) a.mesh.material.color.setHex(arcHex);
  for (const g of bossGeysers) {
    g.ring.material.color.setHex(geyserRingHex);
    g.jet.material.color.setHex(geyserJetHex);
  }
  for (const fr of fireLandingRings) fr.material.color.setHex(ringHex);
  for (const vr of voidLandingRings) vr.material.color.setHex(runeHex);
  for (const sr of summonRings) sr.mesh.material.color.setHex(runeHex);

  golemDecalMat.color.setHex(ringHex);
  runeMat.color.setHex(runeHex);
  runeMat.map = towerId === 'ice' ? TEXTURES.frostWeb : TEXTURES.wombRune;
  runeMat.needsUpdate = true;

  if (towerId === 'ice') {
    slagMat.color.setHex(0x88c8f0);
    slagMat.emissive.setHex(0x38a8ff);
    dripMat.color.setHex(0xd8f8ff);
    enemyProjectileMat.color.setHex(0x90f0ff);
    enemyProjectileMat.emissive.setHex(0x20a8ff);
    smokeStartColor.setHex(0x88b8d8);
    smokeEndColor.setHex(0x183858);
  } else if (towerId === 'void') {
    slagMat.color.setHex(0x1c0b2e);
    slagMat.emissive.setHex(0xb038ff);
    dripMat.color.setHex(0xe8b8ff);
    enemyProjectileMat.color.setHex(0xd868ff);
    enemyProjectileMat.emissive.setHex(0x9020ff);
    smokeStartColor.setHex(0x28123e);
    smokeEndColor.setHex(0x080212);
  } else {
    slagMat.color.setHex(0x3e383c);
    slagMat.emissive.setHex(0xff4400);
    dripMat.color.setHex(0xffc040);
    enemyProjectileMat.color.setHex(0xff40a0);
    enemyProjectileMat.emissive.setHex(0xff0080);
    smokeStartColor.setHex(0x2e2c30);
    smokeEndColor.setHex(0x140a18);
  }
}

/* ---------- 7. Детализированные 3D-модели лута (Кристаллы опыта, Сердца жизни, Золотые медальоны) и маркеры элит ---------- */

const MAX_PICKUPS = 400;

// 7A. Друза кристаллов опыта (центральный высокий кристалл + 3 боковых отростка + каменная оправа)
const xpPickupGeo = (function buildDetailedXpCrystalGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const topFacet = new THREE.Color(0xffffff);
  const midFacet = new THREE.Color(0xb8fff0);
  const baseCol = new THREE.Color(0x386862);

  parts.push({
    geo: new THREE.OctahedronGeometry(0.28, 0),
    matrix: computeTransformMatrix(0, 0.08, 0, 0, 0, 0, 0.72, 1.65, 0.72, tempMat).clone(),
    color: topFacet
  });
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TWO_PI + 0.3;
    computeTransformMatrix(
      Math.cos(a) * 0.14,
      -0.04,
      Math.sin(a) * 0.14,
      Math.sin(a) * 0.42,
      a,
      -Math.cos(a) * 0.42,
      0.48,
      1.12,
      0.48,
      tempMat
    );
    parts.push({
      geo: new THREE.OctahedronGeometry(0.22, 0),
      matrix: tempMat.clone(),
      color: midFacet
    });
  }
  parts.push({
    geo: new THREE.CylinderGeometry(0.18, 0.12, 0.1, 6),
    matrix: computeTransformMatrix(0, -0.22, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: baseCol
  });
  return mergeGeometryParts(parts);
})();

// 7B. Сфера жизни / Сердце Горна (рубиновое сердце с двумя верхними долями в золотом кольце-меридиане)
const healPickupGeo = (function buildDetailedHealHeartGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const rubyCore = new THREE.Color(0xff3858);
  const rubyHot = new THREE.Color(0xff98b0);
  const goldRing = new THREE.Color(0xffd258);

  parts.push({
    geo: new THREE.OctahedronGeometry(0.26, 0),
    matrix: computeTransformMatrix(0, -0.04, 0, 0, Math.PI / 4, 0, 0.95, 1.25, 0.72, tempMat).clone(),
    color: rubyCore
  });
  for (const s of [-1, 1]) {
    parts.push({
      geo: new THREE.IcosahedronGeometry(0.15, 0),
      matrix: computeTransformMatrix(s * 0.11, 0.12, 0, 0, 0, -s * 0.3, 1.0, 1.05, 0.8, tempMat).clone(),
      color: rubyHot
    });
  }
  parts.push({
    geo: new THREE.TorusGeometry(0.34, 0.032, 6, 16),
    matrix: computeTransformMatrix(0, 0.02, 0, 0.25, 0, 0, 1, 1, 1, tempMat).clone(),
    color: goldRing
  });
  return mergeGeometryParts(parts);
})();

// 7C. Золотой медальон / печатка Гильдии (восьмигранная монета с чеканным бортиком и центральным кристаллом)
const goldPickupGeo = (function buildDetailedGoldCoinGeo() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const goldBright = new THREE.Color(0xffe478);
  const goldDeep = new THREE.Color(0xd89618);
  const gemCenter = new THREE.Color(0xfff8d0);

  // Диск монеты (повёрнут вертикально, чтобы вращаться вокруг оси Y и бликовать)
  const disc = new THREE.CylinderGeometry(0.32, 0.32, 0.09, 8);
  disc.rotateX(Math.PI / 2);
  parts.push({
    geo: disc,
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: goldDeep
  });
  // Чеканный обод
  parts.push({
    geo: new THREE.TorusGeometry(0.32, 0.048, 6, 8),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, Math.PI / 8, 1, 1, 1, tempMat).clone(),
    color: goldBright
  });
  // Центральная эмблема-ромб с обеих сторон
  parts.push({
    geo: new THREE.OctahedronGeometry(0.16, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 0.9, 1.25, 0.65, tempMat).clone(),
    color: gemCenter
  });
  return mergeGeometryParts(parts);
})();

const pickupInstancedMesh = new THREE.InstancedMesh(
  xpPickupGeo,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x247868,
    emissiveIntensity: 0.95,
    roughness: 0.18,
    metalness: 0.45,
    flatShading: true
  }),
  MAX_PICKUPS
);
pickupInstancedMesh.frustumCulled = false;
pickupInstancedMesh.count = 0;

const healPickupInstancedMesh = new THREE.InstancedMesh(
  healPickupGeo,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xd81838,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    metalness: 0.4,
    flatShading: true
  }),
  120
);
healPickupInstancedMesh.frustumCulled = false;
healPickupInstancedMesh.count = 0;

const goldPickupInstancedMesh = new THREE.InstancedMesh(
  goldPickupGeo,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x986200,
    emissiveIntensity: 0.9,
    roughness: 0.18,
    metalness: 0.85,
    flatShading: true
  }),
  200
);
goldPickupInstancedMesh.frustumCulled = false;
goldPickupInstancedMesh.count = 0;

scene.add(pickupInstancedMesh, healPickupInstancedMesh, goldPickupInstancedMesh);

const PICKUP_COLORS = [
  new THREE.Color(0x7fe8d8),
  new THREE.Color(0xff4d4d),
  new THREE.Color(0xffc83d),
  new THREE.Color(0xffe9a0)
];
pickupInstancedMesh.setColorAt(0, PICKUP_COLORS[0]);
const _pickupDummyObj = new THREE.Object3D();

const ELITE_MARKER_MATERIALS = {};
for (const [eliteKey, colorHex] of [
  ['armor', 0x66aaff],
  ['swift', 0xffee44],
  ['volt', 0xff3030]
]) {
  ELITE_MARKER_MATERIALS[eliteKey] = new THREE.SpriteMaterial({
    map: TEXTURES.glowWhite,
    color: colorHex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.95
  });
}

const eliteMarkerSprites = [...Array(10)].map(() => {
  const sprite = new THREE.Sprite(ELITE_MARKER_MATERIALS.armor);
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
});

/* ---------- 8. Синхронизация всех спецэффектов боссов, оружия и предметов ---------- */

function syncBossVisualEffects(dt) {
  for (const ring of bossRings) {
    if (!ring.active) continue;
    ring.mesh.scale.set(ring.radius, 1 + ring.radius * 0.08, ring.radius);
    ring.mesh.material.opacity = Math.max(0, 1 - ring.radius / ring.maxRadius) * 0.85;
  }
  for (const arc of bossArcs) {
    if (!arc.active) continue;
    arc.mesh.scale.setScalar(arc.radius);
    arc.mesh.material.opacity = Math.max(0, 1 - arc.radius / 17) * 0.7;
  }
  for (const geyser of bossGeysers) {
    if (geyser.stage === 1) {
      geyser.ring.material.opacity = 0.25 + Math.abs(Math.sin(geyser.timer * 14)) * 0.45;
      geyser.ring.scale.setScalar(1 + Math.sin(geyser.timer * 10) * 0.07);
    } else if (geyser.stage === 2) {
      geyser.jet.scale.y = easeOutCubic(Math.min(1, geyser.timer / 0.16));
      geyser.jet.material.opacity =
        geyser.timer < 0.35 ? 0.8 : Math.max(0, 0.8 * (1 - (geyser.timer - 0.35) / 0.25));
    }
  }

  golemDecalMat.opacity += (golemDecalTargetOpacity - golemDecalMat.opacity) * Math.min(1, dt * 3);
  golemDecal.visible = golemDecalMat.opacity > 0.02;

  runeMat.opacity += (wombRuneTargetOpacity - runeMat.opacity) * Math.min(1, dt * 3);
  wombRune.visible = runeMat.opacity > 0.02;
  if (wombRune.visible) {
    wombRune.rotation.z += dt * 0.1;
  }

  for (const ring of summonRings) {
    ring.mesh.material.opacity +=
      (summonRingsTargetOpacity - ring.mesh.material.opacity) * Math.min(1, dt * 4);
    ring.mesh.visible = ring.mesh.material.opacity > 0.02;
    if (ring.mesh.visible) {
      ring.mesh.rotation.z += dt * 0.8;
    }
  }

  // Анимация 3D-взрывов «Угольного сапога»
  for (const er of coalBootEruptions) {
    if (!er.active) continue;
    er.life += dt;
    const t = er.life / er.maxLife;
    if (t >= 1) {
      er.active = 0;
      er.group.visible = false;
      continue;
    }
    const spikeRise =
      t < 0.22
        ? easeOutCubic(t / 0.22)
        : Math.max(0, 1 - Math.pow((t - 0.22) / 0.78, 1.6));
    er.spikes.scale.set(er.scaleMul * (0.85 + t * 0.28), Math.max(0.02, spikeRise * 1.15), er.scaleMul * (0.85 + t * 0.28));
    er.spikes.material.emissiveIntensity = (1 - t) * 2.5;

    er.torus.scale.setScalar((0.55 + t * 2.65) * er.scaleMul);
    er.torus.material.opacity = Math.max(0, (1 - t) * 0.9);

    er.plume.scale.set(
      (0.55 + t * 1.45) * er.scaleMul,
      0.35 + Math.sin(Math.min(1, t * 1.4) * Math.PI) * 1.25,
      (0.55 + t * 1.45) * er.scaleMul
    );
    er.plume.rotation.y += dt * 3.5;
    er.plume.material.opacity = Math.max(0, (1 - t) * 0.78);

    er.crater.material.opacity = Math.max(0, (1 - t * t) * 0.88);
  }

  // Анимация 3D ледяных кристаллов «Ледяной подошвы»
  for (const fc of frostSlideCrystals) {
    if (!fc.active) continue;
    fc.life += dt;
    const t = fc.life / fc.maxLife;
    if (t >= 1) {
      fc.active = 0;
      fc.mesh.visible = false;
      continue;
    }
    const hScale = t < 0.18 ? easeOutCubic(t / 0.18) : 1 - (t - 0.18) / 0.82;
    fc.mesh.scale.set(0.9, Math.max(0.05, hScale * 1.1), 0.9);
    fc.mesh.material.opacity = Math.max(0, (1 - t) * 0.9);
  }

  // Анимация 3D гейзеров пара («Лёд + Огонь = Пар ×2»)
  for (const sb of steamBurstEffects) {
    if (!sb.active) continue;
    sb.life += dt;
    const t = sb.life / sb.maxLife;
    if (t >= 1) {
      sb.active = 0;
      sb.mesh.visible = false;
      continue;
    }
    sb.mesh.scale.set(0.65 + t * 2.35, 0.55 + easeOutCubic(t) * 2.1, 0.65 + t * 2.35);
    sb.mesh.rotation.y += dt * 2.4;
    sb.mesh.material.opacity = Math.max(0, (1 - t) * 0.85);
  }

  // Анимация 3D плазменных клеток «Громового пояса»
  for (const ts of thunderStrikeEffects) {
    if (!ts.active) continue;
    ts.life += dt;
    const t = ts.life / ts.maxLife;
    if (t >= 1) {
      ts.active = 0;
      ts.mesh.visible = false;
      continue;
    }
    ts.mesh.scale.set(0.75 + t * 1.35, 1.0 + Math.sin(t * Math.PI) * 0.5, 0.75 + t * 1.35);
    ts.mesh.rotation.y += dt * 9;
    ts.mesh.material.opacity = Math.max(0, (1 - t) * 0.95);
  }

  // Анимация 3D вспышек «Плавильного кристалла»
  for (const sc of smeltCrystalBursts) {
    if (!sc.active) continue;
    sc.life += dt;
    const t = sc.life / sc.maxLife;
    if (t >= 1) {
      sc.active = 0;
      sc.mesh.visible = false;
      continue;
    }
    sc.mesh.scale.set(0.65 + t * 1.5, 0.6 + easeOutCubic(t) * 1.6, 0.65 + t * 1.5);
    sc.mesh.rotation.y += dt * 4.5;
    sc.mesh.material.opacity = Math.max(0, (1 - t) * 0.92);
  }

  // Синхронизация 3D-моделей активных бомб (Лавовый шторм / Взрывной элит / бомбы боссов)
  const activeBombs = (typeof state !== 'undefined' && state && state.activeBombs) || [];
  const elapsed = (typeof state !== 'undefined' && state && state.elapsedTime) || 0;
  for (let i = 0; i < bombVisualPool.length; i++) {
    const bMesh = bombVisualPool[i];
    if (i < activeBombs.length) {
      const bomb = activeBombs[i];
      bMesh.visible = true;
      const urgency = Math.max(0, 1 - (bomb.timer || 0));
      const pulse = 1 + Math.sin(elapsed * (12 + urgency * 22)) * (0.12 + urgency * 0.16);
      bMesh.position.set(bomb.x, bomb.y + Math.sin(elapsed * 8 + i) * 0.08, bomb.z);
      bMesh.rotation.y = elapsed * (3 + urgency * 8);
      bMesh.scale.setScalar(pulse);
      bMesh.material.emissive.setHex(
        bomb.applyChill
          ? 0x28b8ff
          : state && state.towerId === 'void'
            ? 0xa838ff
            : 0xff4400
      );
      bMesh.material.emissiveIntensity = 1.6 + urgency * 1.8;
    } else {
      bMesh.visible = false;
    }
  }

  let instanceUpdated = false;
  for (let i = 0; i < SLAG_COUNT; i++) {
    const piece = slagData[i];
    if (!piece.active) continue;
    instanceUpdated = true;
    piece.life += dt;
    if (piece.life >= piece.max) {
      piece.active = 0;
      _bossDummyObj.position.set(0, -500, 0);
      _bossDummyObj.rotation.set(0, 0, 0);
      _bossDummyObj.scale.setScalar(1);
      _bossDummyObj.updateMatrix();
      slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
      continue;
    }
    piece.vy -= 13 * dt;
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.z += piece.vz * dt;
    if (piece.vy < 0 && piece.y < piece.floorY) {
      piece.y = piece.floorY;
      piece.vy *= -0.35;
      piece.vx *= 0.7;
      piece.vz *= 0.7;
    }
    piece.rx += piece.rvx * dt;
    piece.ry += piece.rvy * dt;
    piece.rz += piece.rvz * dt;
    const lifeRatio = 1 - piece.life / piece.max;
    _bossDummyObj.position.set(piece.x, piece.y, piece.z);
    _bossDummyObj.rotation.set(piece.rx, piece.ry, piece.rz);
    _bossDummyObj.scale.setScalar(0.5 + lifeRatio * 0.9);
    _bossDummyObj.updateMatrix();
    slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }

  for (let i = 0; i < DRIP_COUNT; i++) {
    const drip = dripData[i];
    if (!drip.active) continue;
    instanceUpdated = true;
    drip.velocityY -= 11 * dt;
    drip.y += drip.velocityY * dt;
    if (drip.y < drip.floorY) {
      drip.active = 0;
      if (drip.floorY > -100) {
        spawnSparkBurst(drip.x, drip.floorY + 0.1, drip.z, 3, 'land');
      }
      _bossDummyObj.position.set(0, -500, 0);
      _bossDummyObj.rotation.set(0, 0, 0);
      _bossDummyObj.scale.setScalar(1);
      _bossDummyObj.updateMatrix();
      dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
      continue;
    }
    _bossDummyObj.position.set(drip.x, drip.y, drip.z);
    _bossDummyObj.rotation.set(0, 0, 0);
    _bossDummyObj.scale.set(1, Math.min(1.7, 1.1 - drip.velocityY * 0.09), 1);
    _bossDummyObj.updateMatrix();
    dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }

  if (instanceUpdated) {
    slagInstancedMesh.instanceMatrix.needsUpdate = true;
    dripInstancedMesh.instanceMatrix.needsUpdate = true;
  }
}
