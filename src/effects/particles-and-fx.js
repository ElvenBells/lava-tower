/* ==========================================================================
   Визуальные эффекты, частицы, пулы молний, детализированные 3D-модели оружия
   (Орбитальные клинки «Осколки Хранителя» с магической нитью и орбитальной защитой,
   Огненные шары «Искусство Лавы» с потрескавшейся коркой, Ударная волна с куполом
   искажения воздуха), эффекты предметов, Томов, 3D-лут, маркеры элит и бомбы
   ========================================================================== */

/* ---------- 1. Пул молний (Three.Line с готовыми буферами) ---------- */

const BOLT_MAX_SEGMENTS = 16;
const boltPool = [];

function acquireBolt(parentObj, fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount, maxLifetime, customColorHex) {
  let bolt = boltPool.pop();
  if (!bolt) {
    const geo = new BABYLON.BufferGeometry();
    geo.setAttribute('position', new BABYLON.BufferAttribute(new Float32Array(BOLT_MAX_SEGMENTS * 3), 3));
    const mat = new BABYLON.LineBasicMaterial({
      color: 0xe8ccff,
      transparent: true,
      opacity: 1,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    });
    const line = new BABYLON.Line(geo, mat);
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
  const tempMat = new BABYLON.Matrix4();
  const torus = new BABYLON.TorusGeometry(1.0, 0.075, 8, 40);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.06, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xffffff)
  });
  const baseRing = new BABYLON.RingGeometry(0.84, 1.16, 40);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xffd890)
  });
  const spikeGeo = new BABYLON.ConeGeometry(0.06, 0.28, 4);
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
    parts.push({ geo: spikeGeo, matrix: tempMat.clone(), color: new BABYLON.Color(0xffffff) });
  }
  return mergeGeometryParts(parts);
})();

const bossRings = [];
for (let i = 0; i < 6; i++) {
  const mesh = new BABYLON.Mesh(
    bossRingGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xff8c30,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
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

const bossArcGeo = new BABYLON.RingGeometry(0.95, 1.25, 52, 1, 0, Math.PI * 1.5);
const bossArcs = [];
for (let i = 0; i < 4; i++) {
  const mesh = new BABYLON.Mesh(
    bossArcGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xff7a20,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
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
const geyserJetGeo = new BABYLON.CylinderGeometry(0.28, 0.62, 7, 10, 1, true);
geyserJetGeo.translate(0, 3.5, 0);

for (let i = 0; i < 3; i++) {
  const ring = new BABYLON.Mesh(
    new BABYLON.RingGeometry(1.1, 1.5, 32),
    new BABYLON.MeshBasicMaterial({
      color: 0xffd060,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.renderOrder = 4;
  scene.add(ring);

  const jet = new BABYLON.Mesh(
    geyserJetGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xffc050,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false,
      side: BABYLON.DoubleSide
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

const golemDecalMat = new BABYLON.MeshBasicMaterial({
  map: TEXTURES.golemFloor,
  color: 0xff6a18,
  transparent: true,
  opacity: 0,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});
const golemDecal = new BABYLON.Mesh(new BABYLON.CircleGeometry(8.5, 40), golemDecalMat);
golemDecal.rotation.x = -Math.PI / 2;
golemDecal.visible = false;
golemDecal.renderOrder = 3;
golemDecal.position.y = -500;
scene.add(golemDecal);
let golemDecalTargetOpacity = 0;

const runeMat = new BABYLON.MeshBasicMaterial({
  map: TEXTURES.wombRune,
  color: 0xc070ff,
  transparent: true,
  opacity: 0,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});
const wombRune = new BABYLON.Mesh(new BABYLON.CircleGeometry(7.5, 44), runeMat);
wombRune.rotation.x = -Math.PI / 2;
wombRune.visible = false;
wombRune.renderOrder = 3;
wombRune.position.y = -500;
scene.add(wombRune);
let wombRuneTargetOpacity = 0;

const summonRings = [];
for (let i = 0; i < 4; i++) {
  const mesh = new BABYLON.Mesh(
    new BABYLON.RingGeometry(1.0, 1.45, 32),
    new BABYLON.MeshBasicMaterial({
      color: 0xc070ff,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
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
const slagGeo = jitterGeometry(new BABYLON.DodecahedronGeometry(0.16, 0), 0.05);
const slagMat = new BABYLON.MeshStandardMaterial({
  color: 0x3e383c,
  roughness: 0.85,
  flatShading: true,
  emissive: 0xff4400,
  emissiveIntensity: 1.5
});
const slagInstancedMesh = new BABYLON.InstancedMesh(slagGeo, slagMat, SLAG_COUNT);
slagInstancedMesh.frustumCulled = false;
scene.add(slagInstancedMesh);

const slagData = [];
const _bossDummyObj = new BABYLON.Object3D();
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
const dripGeo = new BABYLON.SphereGeometry(0.09, 6, 6);
dripGeo.scale(1, 2.4, 1);
const dripMat = new BABYLON.MeshBasicMaterial({ color: 0xffc040 });
const dripInstancedMesh = new BABYLON.InstancedMesh(dripGeo, dripMat, DRIP_COUNT);
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

/* ---------- 3. Детализированные 3D-модели оружия и снарядов (Мудборд 1) ---------- */

// 3A. ОГНЕННЫЕ ШАРЫ («Искусство Лавы» по мудборду 1):
// Слой 1 — сферическое расплавленное ядро + спиральные огненные вихри вокруг оси + кометный шлейф пламени
const fireballCoreGeometry = (function buildFireballCoreGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const whiteHot = new BABYLON.Color(0xfffbe0);
  const goldHot = new BABYLON.Color(0xffb828);
  const flameOrange = new BABYLON.Color(0xff5208);
  const tailCrimson = new BABYLON.Color(0xd82000);

  // Сферическое расплавленное ядро внутри потрескавшейся корки
  parts.push({
    geo: new BABYLON.IcosahedronGeometry(0.285, 2),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 1.0, 1.0, 1.0, tempMat).clone(),
    color: whiteHot
  });
  // Два тонких огненных вихревых кольца вокруг сферы («вращение по оси» на мудборде)
  const swirlRingGeo = new BABYLON.TorusGeometry(0.33, 0.022, 6, 20);
  parts.push({
    geo: swirlRingGeo,
    matrix: computeTransformMatrix(0, 0, 0, 0.72, 0.45, 0, 1.0, 1.0, 1.0, tempMat).clone(),
    color: goldHot
  });
  parts.push({
    geo: swirlRingGeo,
    matrix: computeTransformMatrix(0, 0, 0, -0.68, 0.52, Math.PI / 3, 0.94, 0.94, 1.0, tempMat).clone(),
    color: flameOrange
  });

  // Кометный огненный хвост строго позади сферы (-Z)
  const tailCone1 = new BABYLON.ConeGeometry(0.22, 0.78, 8);
  tailCone1.rotateX(-Math.PI / 2);
  parts.push({
    geo: tailCone1,
    matrix: computeTransformMatrix(0, 0, -0.38, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: goldHot
  });
  const tailCone2 = new BABYLON.ConeGeometry(0.15, 1.05, 7);
  tailCone2.rotateX(-Math.PI / 2);
  parts.push({
    geo: tailCone2,
    matrix: computeTransformMatrix(0, 0, -0.58, 0, 0, 0.4, 1, 1, 1, tempMat).clone(),
    color: flameOrange
  });
  const tailCone3 = new BABYLON.ConeGeometry(0.08, 1.28, 6);
  tailCone3.rotateX(-Math.PI / 2);
  parts.push({
    geo: tailCone3,
    matrix: computeTransformMatrix(0, 0, -0.74, 0, 0, 0.8, 1, 1, 1, tempMat).clone(),
    color: tailCrimson
  });

  return mergeGeometryParts(parts);
})();

// Слой 2 — плотная сферическая потрескавшаяся лавовая корка из 20 тектонических плит (по мудборду 1)
const fireballCrustGeometry = (function buildFireballCrustGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkObsidian = new BABYLON.Color(0x230e12);
  const charCoal = new BABYLON.Color(0x3a1618);
  const rimGlow = new BABYLON.Color(0x7a2208);

  const plateCount = 20;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const plateGeo = jitterGeometry(new BABYLON.CylinderGeometry(0.115, 0.135, 0.048, 6), 0.012);
  const dummy = new BABYLON.Object3D();

  for (let i = 0; i < plateCount; i++) {
    const t = (i + 0.5) / plateCount;
    const phi = Math.acos(1 - 2 * t);
    const theta = (TWO_PI * i) / goldenRatio;
    const r = 0.295;
    const x = Math.sin(phi) * Math.cos(theta) * r;
    const y = Math.cos(phi) * r;
    const z = Math.sin(phi) * Math.sin(theta) * r;

    dummy.position.set(x, y, z);
    dummy.lookAt(0, 0, 0);
    dummy.rotateX(Math.PI / 2);
    dummy.rotateY(i * 0.7);
    dummy.scale.set(0.92 + (i % 3) * 0.12, 1.0, 0.88 + ((i + 1) % 3) * 0.12);
    dummy.updateMatrix();
    tempMat.copy(dummy.matrix);

    parts.push({
      geo: plateGeo,
      matrix: tempMat.clone(),
      color: i % 3 === 0 ? darkObsidian : i % 3 === 1 ? charCoal : rimGlow
    });
  }
  return mergeGeometryParts(parts);
})();

const playerFireballInstancedMesh = new BABYLON.InstancedMesh(
  fireballCoreGeometry,
  new BABYLON.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xff6200,
    emissiveIntensity: 2.35,
    roughness: 0.14,
    flatShading: true
  }),
  250
);

const playerFireballCrustInstancedMesh = new BABYLON.InstancedMesh(
  fireballCrustGeometry,
  new BABYLON.MeshStandardMaterial({
    map: TEXTURES.crackedLavaCrust,
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xb83200,
    emissiveMap: TEXTURES.crackedLavaCrust,
    emissiveIntensity: 1.25,
    roughness: 0.78,
    metalness: 0.22,
    flatShading: true
  }),
  250
);
playerFireballCrustInstancedMesh.frustumCulled = false;
playerFireballCrustInstancedMesh.count = 0;

// 3B. ВРАЖЕСКИЕ СНАРЯДЫ («Осколок Искажения / Ледяное Веретено»):
const enemyProjectileGeometry = (function buildEnemyProjectileGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const brightTip = new BABYLON.Color(0xffffff);
  const bodyShade = new BABYLON.Color(0xd8b8ff);
  const darkFin = new BABYLON.Color(0x683890);

  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.24, 0),
    matrix: computeTransformMatrix(0, 0, 0.08, 0, 0, 0, 0.78, 0.78, 1.95, tempMat).clone(),
    color: brightTip
  });
  const ringGeo = new BABYLON.TorusGeometry(0.27, 0.032, 6, 14);
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
  const finGeo = new BABYLON.ConeGeometry(0.065, 0.38, 4);
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

const enemyProjectileMat = new BABYLON.MeshStandardMaterial({
  color: 0xff58b0,
  vertexColors: true,
  emissive: 0xff0080,
  emissiveIntensity: 2.0,
  roughness: 0.18,
  metalness: 0.35,
  flatShading: true
});

const enemyProjectileInstancedMesh = new BABYLON.InstancedMesh(
  enemyProjectileGeometry,
  enemyProjectileMat,
  100
);

// 3C. ОРБИТАЛЬНЫЕ КЛИНКИ («Осколки Хранителя» по мудборду 1):
// Узкий, вытянутый, сплюснутый в плоскость парящий клинок-осколок без кожаной рукояти,
// с тёмным долом, парными боковыми крыльями-выступами у основания и кристаллической кромкой
const bladeGeometry = (function buildGuardianShardBladeGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();

  const silverEdge = new BABYLON.Color(0xf2faff);
  const steelBevel = new BABYLON.Color(0xb8d0e8);
  const darkFuller = new BABYLON.Color(0x1e2836);
  const darkBase = new BABYLON.Color(0x2c3848);

  // 1. Вытянутое верхнее ромбовидное лезвие (от y = -0.18 до y = +1.05)
  parts.push({
    geo: new BABYLON.ConeGeometry(0.155, 1.24, 4),
    matrix: computeTransformMatrix(0, 0.44, 0, 0, Math.PI / 4, 0, 0.92, 1.0, 0.22, tempMat).clone(),
    color: steelBevel
  });
  // Бритвенные серебристые режущие кромки по бокам
  for (const s of [-1, 1]) {
    parts.push({
      geo: new BABYLON.ConeGeometry(0.088, 1.18, 4),
      matrix: computeTransformMatrix(
        s * 0.068,
        0.42,
        0,
        0,
        Math.PI / 4,
        s * 0.025,
        0.72,
        1.0,
        0.16,
        tempMat
      ).clone(),
      color: silverEdge
    });
  }

  // 2. Тёмный утопленный центральный дол (Fuller) с гранёным обрамлением
  parts.push({
    geo: new BABYLON.BoxGeometry(0.068, 0.86, 0.048),
    matrix: computeTransformMatrix(0, 0.28, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkFuller
  });

  // 3. Парные фигурные крылья-выступы и боковые выемки у основания (как на чертеже «Осколки Хранителя»)
  for (const s of [-1, 1]) {
    // Верхний скошенный зубец-крыло
    parts.push({
      geo: new BABYLON.ConeGeometry(0.064, 0.36, 4),
      matrix: computeTransformMatrix(
        s * 0.125,
        -0.06,
        0,
        0,
        Math.PI / 4,
        s * 0.38,
        0.85,
        1.0,
        0.24,
        tempMat
      ).clone(),
      color: silverEdge
    });
    // Нижний встречный шип у пяты осколка
    parts.push({
      geo: new BABYLON.ConeGeometry(0.048, 0.26, 4),
      matrix: computeTransformMatrix(
        s * 0.105,
        -0.25,
        0,
        0,
        Math.PI / 4,
        s * 2.68,
        0.8,
        1.0,
        0.22,
        tempMat
      ).clone(),
      color: darkBase
    });
  }

  // 4. Гранёный хвостовой шип осколка (сужается книзу к магической нити, без рукояти)
  parts.push({
    geo: new BABYLON.ConeGeometry(0.11, 0.44, 4),
    matrix: computeTransformMatrix(0, -0.38, 0, Math.PI, Math.PI / 4, 0, 0.85, 1.0, 0.24, tempMat).clone(),
    color: darkBase
  });

  const merged = mergeGeometryParts(parts);
  merged.rotateX(Math.PI / 2);
  return merged;
})();

// Светящееся кристаллическое ядро и магическая жила «Осколка Хранителя»
const bladeEnergyCoreGeometry = (function buildBladeEnergyCoreGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const coreBright = new BABYLON.Color(0xffffff);
  const veinGlow = new BABYLON.Color(0x88f4ff);

  // Центральный ромбовидный кристалл в основании осколка
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.072, 0),
    matrix: computeTransformMatrix(0, -0.14, 0, 0, 0, 0, 0.85, 1.85, 0.55, tempMat).clone(),
    color: coreBright
  });
  // Длинная светящаяся жила вдоль всего дола до острия
  parts.push({
    geo: new BABYLON.BoxGeometry(0.032, 0.88, 0.056),
    matrix: computeTransformMatrix(0, 0.34, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: coreBright
  });
  // Светящееся остриё и хвостовой кристалл привязки к магической нити
  parts.push({
    geo: new BABYLON.ConeGeometry(0.052, 0.38, 4),
    matrix: computeTransformMatrix(0, 0.92, 0, 0, Math.PI / 4, 0, 0.78, 1, 0.36, tempMat).clone(),
    color: veinGlow
  });
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.044, 0),
    matrix: computeTransformMatrix(0, -0.52, 0, 0, 0, 0, 0.7, 1.5, 0.5, tempMat).clone(),
    color: veinGlow
  });

  const merged = mergeGeometryParts(parts);
  merged.rotateX(Math.PI / 2);
  return merged;
})();

// Непрерывный серповидный 3D-шлейф рассечения воздуха («Клинки в движении» на мудборде 1)
const bladeSlashTrailGeometry = (function buildBladeSlashTrailGeometry() {
  // Строим гладкую изогнутую ленту шлейфа с градиентом цвета от бело-голубого у клинка к прозрачно-синему в хвосте
  const segs = 18;
  const positions = new Float32Array(segs * 2 * 3);
  const normals = new Float32Array(segs * 2 * 3);
  const uvs = new Float32Array(segs * 2 * 2);
  const colors = new Float32Array(segs * 2 * 3);
  const indices = [];

  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1);
    const fade = Math.pow(1 - t, 1.35);
    const arc = t * 0.85;
    const halfWidth = 0.28 * (1 - t * 0.82);

    // Дуга уходит назад по траектории вращения клинка
    const cx = -Math.sin(arc) * 1.55;
    const cz = (1 - Math.cos(arc)) * 1.35;

    const v0 = i * 2;
    const v1 = i * 2 + 1;

    positions[v0 * 3] = cx;
    positions[v0 * 3 + 1] = -halfWidth * 0.25;
    positions[v0 * 3 + 2] = cz - halfWidth;

    positions[v1 * 3] = cx;
    positions[v1 * 3 + 1] = halfWidth * 0.25;
    positions[v1 * 3 + 2] = cz + halfWidth;

    normals[v0 * 3 + 1] = 1;
    normals[v1 * 3 + 1] = 1;

    const r = (0.65 * fade + 0.35) * fade;
    const g = (0.92 * fade + 0.08) * fade;
    const b = 1.0 * fade;

    colors[v0 * 3] = r * 0.55;
    colors[v0 * 3 + 1] = g * 0.75;
    colors[v0 * 3 + 2] = b * 0.85;

    colors[v1 * 3] = r;
    colors[v1 * 3 + 1] = g;
    colors[v1 * 3 + 2] = b;

    if (i < segs - 1) {
      const n0 = (i + 1) * 2;
      const n1 = (i + 1) * 2 + 1;
      indices.push(v0, v1, n0, v1, n1, n0);
    }
  }

  const ribbonGeo = new BABYLON.BufferGeometry();
  ribbonGeo.setAttribute('position', new BABYLON.BufferAttribute(positions, 3));
  ribbonGeo.setAttribute('normal', new BABYLON.BufferAttribute(normals, 3));
  ribbonGeo.setAttribute('uv', new BABYLON.BufferAttribute(uvs, 2));
  ribbonGeo.setAttribute('color', new BABYLON.BufferAttribute(colors, 3));
  ribbonGeo.setIndex(indices);
  return ribbonGeo.toNonIndexed();
})();

const orbitalBladeInstancedMesh = new BABYLON.InstancedMesh(
  bladeGeometry,
  new BABYLON.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x243b52,
    emissiveIntensity: 0.65,
    metalness: 0.86,
    roughness: 0.18,
    flatShading: true
  }),
  50
);

const orbitalBladeCoreMat = new BABYLON.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x50ecff,
  emissiveIntensity: 2.35,
  roughness: 0.12,
  flatShading: true
});

const orbitalBladeCoreInstancedMesh = new BABYLON.InstancedMesh(
  bladeEnergyCoreGeometry,
  orbitalBladeCoreMat,
  50
);

const orbitalBladeTrailMat = new BABYLON.MeshBasicMaterial({
  color: 0x70f4ff,
  vertexColors: true,
  transparent: true,
  opacity: 0.68,
  side: BABYLON.DoubleSide,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

const orbitalBladeTrailInstancedMesh = new BABYLON.InstancedMesh(
  bladeSlashTrailGeometry,
  orbitalBladeTrailMat,
  50
);

// 3D-комплекс «Магическая нить» и «Орбитальная защита» (сферические орбитальные вихри на высоких уровнях клинков, мудборд 1)
const orbitalDefenseGroup = new BABYLON.Group();
orbitalDefenseGroup.visible = false;
scene.add(orbitalDefenseGroup);

const orbitalThreadMat = new BABYLON.MeshBasicMaterial({
  color: 0x78f4ff,
  transparent: true,
  opacity: 0.42,
  side: BABYLON.DoubleSide,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

// Основное кольцо «Магической нити» радиуса 2.8 м в плоскости вращения клинков
const primaryOrbitThreadRing = new BABYLON.Mesh(
  new BABYLON.TorusGeometry(2.8, 0.022, 8, 64),
  orbitalThreadMat
);
primaryOrbitThreadRing.rotation.x = Math.PI / 2;
orbitalDefenseGroup.add(primaryOrbitThreadRing);

const secondaryOrbitThreadRing = new BABYLON.Mesh(
  new BABYLON.RingGeometry(2.68, 2.92, 64),
  new BABYLON.MeshBasicMaterial({
    color: 0x58e4ff,
    transparent: true,
    opacity: 0.18,
    side: BABYLON.DoubleSide,
    blending: BABYLON.AdditiveBlending,
    depthWrite: false
  })
);
secondaryOrbitThreadRing.rotation.x = -Math.PI / 2;
orbitalDefenseGroup.add(secondaryOrbitThreadRing);

// Наклонные сферические дуги «Орбитальной защиты» (проявляются с ростом уровня клинков до 8 ур.)
const orbitalCageRings = [];
for (let c = 0; c < 4; c++) {
  const cageRing = new BABYLON.Mesh(
    new BABYLON.TorusGeometry(2.65, 0.018, 6, 56),
    new BABYLON.MeshBasicMaterial({
      color: 0x88f8ff,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  cageRing.rotation.set(0.45 + c * 0.38, (c * Math.PI) / 4, 0.3 * (c % 2 ? 1 : -1));
  orbitalDefenseGroup.add(cageRing);
  orbitalCageRings.push(cageRing);
}

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

const dustGeo = new BABYLON.BufferGeometry();
const DUST_PARTICLE_COUNT = 200;
const dustPositions = new Float32Array(DUST_PARTICLE_COUNT * 3);
for (let i = 0; i < DUST_PARTICLE_COUNT * 3; i += 3) {
  dustPositions[i] = (Math.random() - 0.5) * 60;
  dustPositions[i + 1] = Math.random() * 180;
  dustPositions[i + 2] = (Math.random() - 0.5) * 60;
}
dustGeo.setAttribute('position', new BABYLON.BufferAttribute(dustPositions, 3));
const dustMat = new BABYLON.PointsMaterial({
  color: 0xffaa66,
  size: 0.3,
  transparent: true,
  opacity: 0.4
});
const dustParticles = new BABYLON.Points(dustGeo, dustMat);
scene.add(dustParticles);

const SPARK_PARTICLE_COUNT = 450;
const sparkGeo = new BABYLON.BufferGeometry();
const sparkPositions = new Float32Array(SPARK_PARTICLE_COUNT * 3);
const sparkColors = new Float32Array(SPARK_PARTICLE_COUNT * 3);
const sparkData = [];

for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
  sparkPositions[i * 3] = 0;
  sparkPositions[i * 3 + 1] = -100;
  sparkPositions[i * 3 + 2] = 0;
  sparkData[i] = {
    velocity: new BABYLON.Vector3(),
    life: 0,
    max: 0,
    active: false,
    color: new BABYLON.Color()
  };
}
sparkGeo.setAttribute('position', new BABYLON.BufferAttribute(sparkPositions, 3));
sparkGeo.setAttribute('color', new BABYLON.BufferAttribute(sparkColors, 3));

const sparkPoints = new BABYLON.Points(
  sparkGeo,
  new BABYLON.PointsMaterial({
    size: 0.095,
    vertexColors: true,
    transparent: true,
    blending: BABYLON.AdditiveBlending,
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
    } else if (
      mode === 'elec' ||
      mode === 'fire' ||
      mode === 'steam' ||
      mode === 'xp' ||
      mode === 'gold' ||
      mode === 'speed'
    ) {
      sparkPositions[idx * 3] = x + hx * (0.15 + Math.random() * 0.35);
      sparkPositions[idx * 3 + 1] = y + 0.1 + Math.random() * 0.4;
      sparkPositions[idx * 3 + 2] = z + hz * (0.15 + Math.random() * 0.35);
      item.velocity.set(
        hx * (1.8 + Math.random() * 2.8),
        1.0 + Math.random() * 2.4,
        hz * (1.8 + Math.random() * 2.8)
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
      item.color.setHSL(0.14 + (k % 2) * 0.42, 1.0, 0.72 + Math.random() * 0.25);
    } else if (mode === 'fire') {
      item.color.setHSL(0.04 + Math.random() * 0.09, 1.0, 0.58 + Math.random() * 0.32);
    } else if (mode === 'steam') {
      item.color.setHSL(0.54 + Math.random() * 0.06, 0.75, 0.82 + Math.random() * 0.16);
    } else if (mode === 'xp') {
      item.color.setHSL(0.49 + Math.random() * 0.04, 1.0, 0.68 + Math.random() * 0.25);
    } else if (mode === 'gold') {
      item.color.setHSL(0.11 + Math.random() * 0.04, 1.0, 0.65 + Math.random() * 0.28);
    } else if (mode === 'speed') {
      item.color.setHSL(0.38 + Math.random() * 0.05, 0.95, 0.62 + Math.random() * 0.28);
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
const smokeGeo = new BABYLON.BufferGeometry();
const smokePositions = new Float32Array(SMOKE_PARTICLE_COUNT * 3);
const smokeColors = new Float32Array(SMOKE_PARTICLE_COUNT * 3);
const smokeData = [];
const smokeStartColor = new BABYLON.Color(0x2e2c30);
const smokeEndColor = new BABYLON.Color(0x140a18);

for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
  smokePositions[i * 3] = 0;
  smokePositions[i * 3 + 1] = -100;
  smokePositions[i * 3 + 2] = 0;
  smokeData[i] = { velocity: new BABYLON.Vector3(), life: 0, max: 0, active: false };
}
smokeGeo.setAttribute('position', new BABYLON.BufferAttribute(smokePositions, 3));
smokeGeo.setAttribute('color', new BABYLON.BufferAttribute(smokeColors, 3));

const smokePoints = new BABYLON.Points(
  smokeGeo,
  new BABYLON.PointsMaterial({
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

/* ---------- 5. Объёмные 3D-эффекты ударных волн, приземлений, предметов и Томов ---------- */

const fireLandingRingGeo = (function build3DFireLandingCrownGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const baseRing = new BABYLON.RingGeometry(0.75, 1.04, 28);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xff9830)
  });
  const torus = new BABYLON.TorusGeometry(0.9, 0.045, 6, 28);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.04, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xffe080)
  });
  const toothGeo = new BABYLON.ConeGeometry(0.075, 0.32, 4);
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
      color: i % 2 ? new BABYLON.Color(0xffffff) : new BABYLON.Color(0xffa838)
    });
  }
  return mergeGeometryParts(parts);
})();

const voidLandingRingGeo = (function build3DVoidLandingCrownGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const baseRing = new BABYLON.RingGeometry(0.48, 0.72, 28);
  baseRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: baseRing,
    matrix: computeTransformMatrix(0, 0.01, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xc878ff)
  });
  const torus = new BABYLON.TorusGeometry(0.6, 0.036, 6, 24);
  torus.rotateX(Math.PI / 2);
  parts.push({
    geo: torus,
    matrix: computeTransformMatrix(0, 0.04, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xf0d0ff)
  });
  const shardGeo = new BABYLON.OctahedronGeometry(0.08, 0);
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
    parts.push({ geo: shardGeo, matrix: tempMat.clone(), color: new BABYLON.Color(0xffffff) });
  }
  return mergeGeometryParts(parts);
})();

const fireLandingRings = [];
for (let i = 0; i < 15; i++) {
  const ring = new BABYLON.Mesh(
    fireLandingRingGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xff7a20,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
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
  const ring = new BABYLON.Mesh(
    voidLandingRingGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xa060ff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
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

// 5B. 3D УДАРНАЯ ВОЛНА («Кузнечное дело» по мудборду 1):
// Полупрозрачный купол искажения воздуха + концентрические рунные кольца на полу + вихревые потоки воздуха по фронту
const wave3DGeometry = (function build3DWaveShockGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const brightCol = new BABYLON.Color(0xffffff);
  const cyanCol = new BABYLON.Color(0x90ecff);
  const softDomeCol = new BABYLON.Color(0x48b8e8);

  // Полупрозрачный купол искажения воздуха («Полупрозрачное кольцо / Искажение воздуха» на мудборде 1)
  const domeGeo = new BABYLON.SphereGeometry(0.95, 24, 10, 0, TWO_PI, 0, Math.PI * 0.44);
  parts.push({
    geo: domeGeo,
    matrix: computeTransformMatrix(0, 0.02, 0, 0, 0, 0, 1.0, 0.62, 1.0, tempMat).clone(),
    color: softDomeCol
  });

  // Концентрические тороидальные кольца на полу («Периметр защиты»)
  for (const [rad, tube, yOff, col] of [
    [0.98, 0.048, 0.05, brightCol],
    [0.72, 0.032, 0.09, cyanCol],
    [0.44, 0.024, 0.04, cyanCol]
  ]) {
    const torus = new BABYLON.TorusGeometry(rad, tube, 8, 36);
    torus.rotateX(Math.PI / 2);
    parts.push({
      geo: torus,
      matrix: computeTransformMatrix(0, yOff, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
      color: col
    });
  }

  // 16 закрученных вихревых гребней воздуха вдоль периметра волны
  const swirlBladeGeo = new BABYLON.ConeGeometry(0.058, 0.44, 4);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.96,
      0.16,
      Math.sin(a) * 0.96,
      Math.sin(a + 0.45) * 0.68,
      a,
      -Math.cos(a + 0.45) * 0.68,
      0.75,
      0.95 + (i % 2) * 0.35,
      1.35,
      tempMat
    );
    parts.push({
      geo: swirlBladeGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? brightCol : cyanCol
    });
  }
  return mergeGeometryParts(parts);
})();

const waveFloorRuneGeo = new BABYLON.CircleGeometry(1.02, 36);
waveFloorRuneGeo.rotateX(-Math.PI / 2);

const waveEffectRings = [...Array(10)].map(() => {
  const mesh = new BABYLON.Mesh(
    wave3DGeometry,
    new BABYLON.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  // Напольный рунный круг с радиальными линиями (как на нижних кадрах мудборда 1)
  const floorDisc = new BABYLON.Mesh(
    waveFloorRuneGeo,
    new BABYLON.MeshBasicMaterial({
      map: TEXTURES.shockwaveRunes,
      color: 0x98f2ff,
      transparent: true,
      opacity: 0.85,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  floorDisc.position.y = 0.01;
  mesh.add(floorDisc);
  mesh.userData = { floorDisc };
  mesh.visible = false;
  mesh.lifeLeft = 0;
  mesh.maxLife = 0.44;
  mesh.targetRadius = 3;
  scene.add(mesh);
  return mesh;
});
let waveEffectRingCursor = 0;

function spawnWaveRingEffect(x, y, z, radius, colorHex) {
  const mesh = waveEffectRings[waveEffectRingCursor++ % waveEffectRings.length];
  mesh.position.set(x, y + 0.03, z);
  mesh.targetRadius = radius;
  mesh.scale.set(radius * 0.38, Math.max(0.75, radius * 0.34), radius * 0.38);
  mesh.material.color.setHex(colorHex);
  if (mesh.userData && mesh.userData.floorDisc) {
    mesh.userData.floorDisc.material.color.setHex(colorHex);
  }
  mesh.maxLife = 0.44;
  mesh.lifeLeft = 0.44;
  mesh.visible = true;
}

// 5C. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «УГОЛЬНОГО САПОГА» (`spawnCoalBootEruption`, мудборд 4):
// Растрескавшаяся каменная кладка с лавой в швах + бушующее огненное кольцо пламени + разлетающиеся камни
const coalSpikesRingGeo = (function buildCoalBootFlameRingGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkBasalt = new BABYLON.Color(0x281012);
  const redMagma = new BABYLON.Color(0xff4a00);
  const brightGold = new BABYLON.Color(0xffe068);

  // Густое внешнее огненное кольцо из 24 языков пламени (как на правом нижнем кадре мудборда 4)
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TWO_PI;
    const h = 0.85 + (i % 3) * 0.32;
    const flameGeo = new BABYLON.ConeGeometry(0.18, h, 5);
    computeTransformMatrix(
      Math.cos(a) * 2.15,
      h * 0.42,
      Math.sin(a) * 2.15,
      Math.sin(a + 0.25) * 0.36,
      a,
      -Math.cos(a + 0.25) * 0.36,
      1.15,
      1.0,
      0.85,
      tempMat
    );
    parts.push({
      geo: flameGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? brightGold : redMagma
    });
  }
  // Внутренний венец вздыбленных плит и пламени в точке удара сапога (r = 0.95 м)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TWO_PI + 0.15;
    const h = 0.68 + (i % 2) * 0.25;
    const spikeGeo = jitterGeometry(new BABYLON.ConeGeometry(0.16, h, 5), 0.025);
    computeTransformMatrix(
      Math.cos(a) * 0.95,
      h * 0.38,
      Math.sin(a) * 0.95,
      Math.sin(a) * 0.45,
      a,
      -Math.cos(a) * 0.45,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: spikeGeo, matrix: tempMat.clone(), color: i % 2 ? brightGold : redMagma });
  }
  // Подброшенные каменные булыжники по внешнему кольцу удара
  const boulderGeo = jitterGeometry(new BABYLON.DodecahedronGeometry(0.2, 0), 0.05);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI + 0.2;
    computeTransformMatrix(
      Math.cos(a) * 2.35,
      0.18 + (i % 3) * 0.14,
      Math.sin(a) * 2.35,
      i * 0.7,
      a,
      i * 0.4,
      1.25,
      0.85,
      1.1,
      tempMat
    );
    parts.push({ geo: boulderGeo, matrix: tempMat.clone(), color: darkBasalt });
  }
  return mergeGeometryParts(parts);
})();

const coalPlumeGeo = new BABYLON.CylinderGeometry(2.25, 1.85, 1.15, 24, 1, true);
coalPlumeGeo.translate(0, 0.58, 0);

const coalTorusGeo = new BABYLON.TorusGeometry(2.15, 0.12, 8, 36);
coalTorusGeo.rotateX(Math.PI / 2);

const coalBootEruptions = [];
for (let i = 0; i < 6; i++) {
  const group = new BABYLON.Group();
  group.visible = false;

  const crater = new BABYLON.Mesh(
    new BABYLON.CircleGeometry(3.0, 36),
    new BABYLON.MeshBasicMaterial({
      map: TEXTURES.coalCraterDecal,
      color: 0xff9830,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = 0.03;
  group.add(crater);

  const spikes = new BABYLON.Mesh(
    coalSpikesRingGeo,
    new BABYLON.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0xff5800,
      emissiveIntensity: 2.1,
      roughness: 0.35,
      metalness: 0.15,
      flatShading: true
    })
  );
  group.add(spikes);

  const plume = new BABYLON.Mesh(
    coalPlumeGeo,
    new BABYLON.MeshBasicMaterial({
      map: lavaTexture,
      color: 0xffb838,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(plume);

  const torus = new BABYLON.Mesh(
    coalTorusGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xffe070,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  torus.position.y = 0.14;
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
    maxLife: 0.72,
    scaleMul: 1
  });
}
let coalBootEruptionCursor = 0;

function spawnCoalBootEruption(x, y, z, stacks = 1) {
  const item = coalBootEruptions[coalBootEruptionCursor++ % coalBootEruptions.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.72;
  item.scaleMul = 1 + Math.min(0.45, (stacks - 1) * 0.1);
  item.group.position.set(x, y + 0.01, z);
  item.group.rotation.y = Math.random() * TWO_PI;
  item.group.visible = true;

  item.crater.scale.setScalar(item.scaleMul);
  item.crater.material.opacity = 0.96;
  item.spikes.scale.set(item.scaleMul, 0.1, item.scaleMul);
  item.spikes.material.emissiveIntensity = 2.6;
  item.plume.scale.set(0.75 * item.scaleMul, 0.25, 0.75 * item.scaleMul);
  item.plume.material.opacity = 0.88;
  item.torus.scale.setScalar(0.65 * item.scaleMul);
  item.torus.material.opacity = 0.96;

  spawnSlagBurst(x, y, z, Math.min(20, 9 + stacks * 2), 1.05);
  spawnSparkBurst(x, y, z, Math.min(40, 22 + stacks * 4), 'fire');
  spawnSmokePuff(x, y, z, 8);
  spawnFireLandingRing(x, y, z);
}

// 5D. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ЛЕДЯНОЙ ПОДОШВЫ» (`spawnFrostSlideCrystal`, мудборд 2):
// Напольная ледяная пластина с внутренними трещинами + гребень острых осколков льда
const frostClusterGeo = (function buildFrostSlideClusterGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const iceBright = new BABYLON.Color(0xf0fcff);
  const iceCyan = new BABYLON.Color(0x80e2ff);
  const iceDeep = new BABYLON.Color(0x3898e0);

  // Плоская напольная пластина льда с трещинами («Морозный след» на мудборде 2)
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.56, 0.62, 0.035, 7),
    matrix: computeTransformMatrix(0, 0.02, 0, 0, 0, 0, 1.0, 1.0, 1.35, tempMat).clone(),
    color: iceDeep
  });
  // Центральный и боковые острые осколки льда, наклоненные назад по ходу скольжения
  parts.push({
    geo: new BABYLON.ConeGeometry(0.14, 0.78, 5),
    matrix: computeTransformMatrix(0, 0.34, 0, -0.35, 0, 0, 0.85, 1, 1.1, tempMat).clone(),
    color: iceBright
  });
  for (const s of [-1, 1]) {
    parts.push({
      geo: new BABYLON.ConeGeometry(0.11, 0.58, 4),
      matrix: computeTransformMatrix(
        s * 0.26,
        0.24,
        -0.08,
        -0.42,
        0,
        -s * 0.48,
        0.8,
        1,
        1,
        tempMat
      ).clone(),
      color: iceCyan
    });
    parts.push({
      geo: new BABYLON.OctahedronGeometry(0.12, 0),
      matrix: computeTransformMatrix(
        s * 0.38,
        0.1,
        0.14,
        0.2,
        s * 0.5,
        -s * 0.65,
        0.65,
        1.5,
        0.65,
        tempMat
      ).clone(),
      color: iceBright
    });
  }
  return mergeGeometryParts(parts);
})();

const frostSlideCrystals = [];
for (let i = 0; i < 20; i++) {
  const mesh = new BABYLON.Mesh(
    frostClusterGeo,
    new BABYLON.MeshStandardMaterial({
      map: TEXTURES.iceSoleCrack,
      color: 0xffffff,
      vertexColors: true,
      emissive: 0x45c4ff,
      emissiveMap: TEXTURES.iceSoleCrack,
      emissiveIntensity: 1.65,
      roughness: 0.1,
      metalness: 0.35,
      transparent: true,
      opacity: 0.92,
      flatShading: true
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  frostSlideCrystals.push({ mesh, active: 0, life: 0, maxLife: 0.9 });
}
let frostSlideCursor = 0;

function spawnFrostSlideCrystal(x, y, z, facingAngle) {
  const item = frostSlideCrystals[frostSlideCursor++ % frostSlideCrystals.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.88;
  const jitterX = (Math.random() - 0.5) * 0.35;
  const jitterZ = (Math.random() - 0.5) * 0.35;
  item.mesh.position.set(x + jitterX, y + 0.01, z + jitterZ);
  item.mesh.rotation.y = (facingAngle || 0) + (Math.random() - 0.5) * 0.4;
  item.mesh.scale.set(0.9, 0.12, 0.9);
  item.mesh.material.opacity = 0.94;
  item.mesh.visible = true;
}

// 5E. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ СИНЕРГИИ «ЛЁД + ОГОНЬ = ПАРОВОЙ ВЗРЫВ (×2)» (`spawnSteamBurstEffect`, мудборд 2):
// Клубящиеся облака белого пара + огненное ядро + разлетающиеся во все стороны голубые осколки льда
const steamCloudGeo = (function buildSteamCloudClusterGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const cWhite = new BABYLON.Color(0xffffff);
  const cFire = new BABYLON.Color(0xff9838);
  const cIce = new BABYLON.Color(0x88e8ff);

  // Огненное ядро в эпицентре парового взрыва
  parts.push({
    geo: new BABYLON.IcosahedronGeometry(0.38, 1),
    matrix: computeTransformMatrix(0, 0.48, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: cFire
  });

  // Густые клубы пара вокруг эпицентра
  const puffOffsets = [
    [0, 0.52, 0, 0.56, cWhite],
    [0.44, 0.36, 0.26, 0.42, cWhite],
    [-0.42, 0.38, -0.24, 0.44, cWhite],
    [0.28, 0.78, -0.32, 0.38, cWhite],
    [-0.32, 0.72, 0.34, 0.38, cWhite],
    [0, 1.05, 0, 0.46, cWhite]
  ];
  for (const [px, py, pz, r, col] of puffOffsets) {
    parts.push({
      geo: new BABYLON.IcosahedronGeometry(r, 1),
      matrix: computeTransformMatrix(px, py, pz, px, py, pz, 1.18, 0.92, 1.18, tempMat).clone(),
      color: col
    });
  }

  // 10 разлетающихся острых осколков расколотого льда (как на правом нижнем кадре мудборда 2)
  const shardGeo = new BABYLON.ConeGeometry(0.11, 0.52, 4);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TWO_PI;
    const h = 0.25 + (i % 3) * 0.28;
    computeTransformMatrix(
      Math.cos(a) * 0.78,
      h,
      Math.sin(a) * 0.78,
      Math.sin(a) * 0.85,
      a,
      -Math.cos(a) * 0.85,
      0.75,
      1.1,
      0.45,
      tempMat
    );
    parts.push({ geo: shardGeo, matrix: tempMat.clone(), color: cIce });
  }
  return mergeGeometryParts(parts);
})();

const steamBurstEffects = [];
for (let i = 0; i < 6; i++) {
  const mesh = new BABYLON.Mesh(
    steamCloudGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  steamBurstEffects.push({ mesh, active: 0, life: 0, maxLife: 0.62 });
}
let steamBurstCursor = 0;

function spawnSteamBurstEffect(x, y, z) {
  const item = steamBurstEffects[steamBurstCursor++ % steamBurstEffects.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.62;
  item.mesh.position.set(x, y + 0.05, z);
  item.mesh.rotation.y = Math.random() * TWO_PI;
  item.mesh.scale.setScalar(0.55);
  item.mesh.material.opacity = 0.94;
  item.mesh.visible = true;

  spawnSparkBurst(x, y + 0.4, z, 18, 'steam');
  spawnSparkBurst(x, y + 0.4, z, 12, 'fire');
  spawnSmokePuff(x, y + 0.2, z, 10);
}

// 5F. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ГРОМОВОГО ПОЯСА» (`spawnThunderChainEffect`, мудборд 7):
// Жёлто-белые и лазурно-синие ветвящиеся молнии + наземные электрические разряды
const thunderCageGeo = (function buildThunderCageGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const cYellowWhite = new BABYLON.Color(0xfff8b0);
  const cElectricBlue = new BABYLON.Color(0x60dcff);

  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.54, 0),
    matrix: computeTransformMatrix(0, 0.65, 0, 0, 0, 0, 0.85, 1.45, 0.85, tempMat).clone(),
    color: cYellowWhite
  });
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.46, 0),
    matrix: computeTransformMatrix(0, 0.65, 0, 0.6, Math.PI / 4, 0.6, 1.15, 0.95, 1.15, tempMat).clone(),
    color: cElectricBlue
  });
  parts.push({
    geo: new BABYLON.ConeGeometry(0.14, 2.2, 4),
    matrix: computeTransformMatrix(0, 1.1, 0, 0, Math.PI / 4, 0, 1, 1, 1, tempMat).clone(),
    color: cYellowWhite
  });
  const ring = new BABYLON.TorusGeometry(0.82, 0.042, 6, 20);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, 0.08, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: cElectricBlue
  });
  return mergeGeometryParts(parts);
})();

const thunderStrikeEffects = [];
for (let i = 0; i < 10; i++) {
  const mesh = new BABYLON.Mesh(
    thunderCageGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  thunderStrikeEffects.push({ mesh, active: 0, life: 0, maxLife: 0.36 });
}
let thunderStrikeCursor = 0;

function spawnThunderChainEffect(fromX, fromY, fromZ, toX, toY, toZ) {
  // Двойная дуга: ярко-жёлто-белая жила элементаля + электрическая сине-голубая дуга (по мудборду 7)
  spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, 0.24, 14, 0xfff6a0);
  spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, 0.16, 12, 0x58d8ff);

  const strike = thunderStrikeEffects[thunderStrikeCursor++ % thunderStrikeEffects.length];
  strike.active = 1;
  strike.life = 0;
  strike.maxLife = 0.36;
  strike.mesh.position.set(toX, toY - 0.5, toZ);
  strike.mesh.rotation.y = Math.random() * TWO_PI;
  strike.mesh.scale.setScalar(0.85);
  strike.mesh.material.opacity = 0.96;
  strike.mesh.visible = true;

  spawnSparkBurst(toX, toY, toZ, 10, 'elec');
}

// 5G. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ПЛАВИЛЬНОГО КРИСТАЛЛА» (`spawnSmeltCrystalBurst`, мудборд 5):
// Вспышка кристалла и золотисто-янтарные «Искры опыта», летящие от убитого горящего врага к герою
const smeltBurstGeo = (function buildSmeltCrystalBurstGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const cGold = new BABYLON.Color(0xffe880);
  const cAmber = new BABYLON.Color(0xff8418);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.44,
      0.45 + (i % 2) * 0.24,
      Math.sin(a) * 0.44,
      Math.sin(a) * 0.52,
      a,
      -Math.cos(a) * 0.52,
      0.52,
      1.95,
      0.52,
      tempMat
    );
    parts.push({
      geo: new BABYLON.OctahedronGeometry(0.18, 0),
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? cGold : cAmber
    });
  }
  return mergeGeometryParts(parts);
})();

const smeltCrystalBursts = [];
for (let i = 0; i < 8; i++) {
  const mesh = new BABYLON.Mesh(
    smeltBurstGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  smeltCrystalBursts.push({ mesh, active: 0, life: 0, maxLife: 0.5 });
}
let smeltBurstCursor = 0;

function spawnSmeltCrystalBurst(x, y, z) {
  if (typeof state !== 'undefined' && state) {
    state.smeltFlashTimer = 1.0;
    // Золотисто-огненные лучи «Искр опыта» от горящего врага к кристаллу героя (как на мудборде 5)
    if (state.player) {
      spawnGlobalBolt(
        x,
        y + 0.8,
        z,
        state.player.x,
        state.player.y + 1.35,
        state.player.z,
        0.18,
        10,
        0xffd858
      );
      spawnGlobalBolt(
        x,
        y + 0.6,
        z,
        state.player.x,
        state.player.y + 1.25,
        state.player.z,
        0.12,
        8,
        0xff7a18
      );
    }
  }
  const item = smeltCrystalBursts[smeltBurstCursor++ % smeltCrystalBursts.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.5;
  item.mesh.position.set(x, y + 0.1, z);
  item.mesh.rotation.y = Math.random() * TWO_PI;
  item.mesh.scale.setScalar(0.7);
  item.mesh.material.opacity = 0.96;
  item.mesh.visible = true;
  spawnSparkBurst(x, y + 0.5, z, 14, 'gold');
}

// 5H. СПЕЦИАЛЬНЫЙ 3D-ЭФФЕКТ «ТОМА СКОРОСТИ» (`spawnSpeedTomeTrail`, мудборд 3):
// Изумрудный смазанный след и зеленоватая вспышка у ног бегущего героя
const speedTomeTrailGeo = (function buildSpeedTomeTrailGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const cEmerald = new BABYLON.Color(0x45ff88);
  const cMint = new BABYLON.Color(0xb8ffd8);

  // Две горизонтальные скоростные ленты-стрелы + напольная вспышка
  for (const s of [-1, 1]) {
    parts.push({
      geo: new BABYLON.ConeGeometry(0.08, 0.85, 4),
      matrix: computeTransformMatrix(
        s * 0.18,
        0.38,
        -0.32,
        -Math.PI / 2,
        0,
        0,
        0.65,
        1.0,
        0.25,
        tempMat
      ).clone(),
      color: cEmerald
    });
  }
  parts.push({
    geo: new BABYLON.RingGeometry(0.18, 0.44, 16),
    matrix: computeTransformMatrix(0, 0.03, 0, -Math.PI / 2, 0, 0, 1, 1, 1, tempMat).clone(),
    color: cMint
  });
  return mergeGeometryParts(parts);
})();

const speedTomeTrails = [];
for (let i = 0; i < 14; i++) {
  const mesh = new BABYLON.Mesh(
    speedTomeTrailGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0x50ff90,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  mesh.visible = false;
  scene.add(mesh);
  speedTomeTrails.push({ mesh, active: 0, life: 0, maxLife: 0.42 });
}
let speedTomeTrailCursor = 0;

function spawnSpeedTomeTrail(x, y, z, facingAngle) {
  const item = speedTomeTrails[speedTomeTrailCursor++ % speedTomeTrails.length];
  item.active = 1;
  item.life = 0;
  item.maxLife = 0.42;
  item.mesh.position.set(x, y + 0.01, z);
  item.mesh.rotation.y = facingAngle || 0;
  item.mesh.scale.setScalar(0.95);
  item.mesh.material.opacity = 0.78;
  item.mesh.visible = true;
}

// 5I. 3D-МОДЕЛИ АКТИВНЫХ БОМБ (`bombVisualPool` для Лавового шторма, Взрывных элит и бомб боссов, мудборд 6):
// Нестабильный багрово-малиновый сгусток энергии с изогнутыми рогами-разрядами + пульсирующее красное кольцо на земле
const bombModelGeo = (function build3DBombModelGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkTendrilCol = new BABYLON.Color(0x280614);
  const crimsonCol = new BABYLON.Color(0xff1848);
  const hotCoreCol = new BABYLON.Color(0xffe8f0);

  // Внутреннее бело-розовое нестабильное ядро
  parts.push({
    geo: new BABYLON.IcosahedronGeometry(0.34, 1),
    matrix: computeTransformMatrix(0, 0.65, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: hotCoreCol
  });
  // Багровая энергетическая оболочка
  parts.push({
    geo: jitterGeometry(new BABYLON.DodecahedronGeometry(0.44, 0), 0.04),
    matrix: computeTransformMatrix(0, 0.65, 0, 0.4, 0.4, 0, 1, 1, 1, tempMat).clone(),
    color: crimsonCol
  });
  // 12 рваных тёмно-багровых энергетических протуберанцев/молний вокруг сгустка (как на мудборде 6)
  const hornGeo = new BABYLON.ConeGeometry(0.075, 0.46, 4);
  for (let i = 0; i < 12; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / 12);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const dx = Math.sin(phi) * Math.cos(theta);
    const dy = Math.cos(phi);
    const dz = Math.sin(phi) * Math.sin(theta);
    computeTransformMatrix(
      dx * 0.44,
      0.65 + dy * 0.44,
      dz * 0.44,
      theta,
      phi,
      i * 0.5,
      0.75,
      1.1,
      0.55,
      tempMat
    );
    parts.push({
      geo: hornGeo,
      matrix: tempMat.clone(),
      color: i % 2 === 0 ? darkTendrilCol : crimsonCol
    });
  }
  return mergeGeometryParts(parts);
})();

const bombGroundRingGeo = (function buildBombWarningGroundGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const outerRing = new BABYLON.RingGeometry(0.86, 1.0, 36);
  outerRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: outerRing,
    matrix: computeTransformMatrix(0, 0.02, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xff2040)
  });
  const innerRing = new BABYLON.RingGeometry(0.45, 0.54, 32);
  innerRing.rotateX(-Math.PI / 2);
  parts.push({
    geo: innerRing,
    matrix: computeTransformMatrix(0, 0.02, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: new BABYLON.Color(0xff6888)
  });
  return mergeGeometryParts(parts);
})();

const bombVisualPool = [...Array(12)].map(() => {
  const group = new BABYLON.Group();
  group.visible = false;

  const orbMesh = new BABYLON.Mesh(
    bombModelGeo,
    new BABYLON.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      emissive: 0xff1844,
      emissiveIntensity: 2.1,
      roughness: 0.22,
      metalness: 0.35,
      flatShading: true
    })
  );
  group.add(orbMesh);

  const groundRing = new BABYLON.Mesh(
    bombGroundRingGeo,
    new BABYLON.MeshBasicMaterial({
      color: 0xff2448,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      side: BABYLON.DoubleSide,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  group.add(groundRing);

  const glowSprite = new BABYLON.Sprite(
    new BABYLON.SpriteMaterial({
      map: TEXTURES.glowWhite,
      color: 0xff2858,
      transparent: true,
      opacity: 0.85,
      blending: BABYLON.AdditiveBlending,
      depthWrite: false
    })
  );
  glowSprite.position.y = 0.65;
  glowSprite.scale.setScalar(1.65);
  group.add(glowSprite);

  group.userData = { orbMesh, groundRing, glowSprite };
  scene.add(group);
  return group;
});

/* ---------- 6. Переключение палитры эффектов под тему башни ---------- */

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

/* ---------- 7. Детализированные 3D-модели лута (Мудборд 8) и маркеры элит (Мудборд 6) ---------- */

const MAX_PICKUPS = 400;

// 7A. КРИСТАЛЛЫ ОПЫТА (по мудборду 8: чистый гранёный бирюзовый октаэдр с ярким внутренним кристаллом и сияющими гранями)
const xpPickupGeo = (function buildDetailedXpCrystalGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const brightCore = new BABYLON.Color(0xe8ffff);
  const turquoiseFacet = new BABYLON.Color(0x38f2dc);
  const edgeHighlight = new BABYLON.Color(0x98fff4);

  // Внешний гранёный бирюзовый октаэдр
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.32, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 0.88, 1.32, 0.88, tempMat).clone(),
    color: turquoiseFacet
  });
  // Внутренняя яркая призма, создающая эффект глубины и свечения рёбер
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.21, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, Math.PI / 4, 0, 0.92, 1.38, 0.92, tempMat).clone(),
    color: brightCore
  });
  // Экваториальная гранёная фаска
  parts.push({
    geo: new BABYLON.TorusGeometry(0.24, 0.015, 4, 4),
    matrix: computeTransformMatrix(0, 0, 0, Math.PI / 2, 0, Math.PI / 4, 1, 1, 1, tempMat).clone(),
    color: edgeHighlight
  });
  return mergeGeometryParts(parts);
})();

// 7B. КРИСТАЛЛ ЗДОРОВЬЯ (по мудборду 8: рубиновый октаэдр «капля крови башни» + пульсирующие красные кольца ауры внизу)
const healPickupGeo = (function buildDetailedHealCrystalGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const rubyFacet = new BABYLON.Color(0xe81838);
  const rubyHotCore = new BABYLON.Color(0xff98a8);
  const auraRingCol = new BABYLON.Color(0xff3858);

  // Главный рубиновый октаэдр
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.34, 0),
    matrix: computeTransformMatrix(0, 0.06, 0, 0, 0, 0, 0.88, 1.34, 0.88, tempMat).clone(),
    color: rubyFacet
  });
  // Внутреннее алое сердце кристалла
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.22, 0),
    matrix: computeTransformMatrix(0, 0.06, 0, 0, Math.PI / 4, 0, 0.9, 1.38, 0.9, tempMat).clone(),
    color: rubyHotCore
  });
  // Двойное пульсирующее кольцо рубиновой ауры внизу (как на кадре 4 мудборда 8)
  const ring1 = new BABYLON.RingGeometry(0.28, 0.36, 24);
  ring1.rotateX(-Math.PI / 2);
  parts.push({
    geo: ring1,
    matrix: computeTransformMatrix(0, -0.34, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: auraRingCol
  });
  const ring2 = new BABYLON.RingGeometry(0.44, 0.50, 24);
  ring2.rotateX(-Math.PI / 2);
  parts.push({
    geo: ring2,
    matrix: computeTransformMatrix(0, -0.35, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: rubyHotCore
  });
  return mergeGeometryParts(parts);
})();

// 7C. ЗОЛОТАЯ МОНЕТА — ОКТАЭДР (по мудборду 8: золотистый октаэдр с металлическим блеском + вихревой шлейф и чешуйки латуни)
const goldPickupGeo = (function buildDetailedGoldOctahedronGeo() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const goldBright = new BABYLON.Color(0xffe878);
  const goldOrange = new BABYLON.Color(0xf89818);
  const brassScale = new BABYLON.Color(0xfff6c0);

  // Центральный золотой октаэдр, ловящий оранжевые блики лавы
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.3, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 0.9, 1.28, 0.9, tempMat).clone(),
    color: goldBright
  });
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.2, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, Math.PI / 4, 0, 0.94, 1.32, 0.94, tempMat).clone(),
    color: goldOrange
  });
  // Золотистое вихревое кольцо быстрого вращения и чешуйки латуни (кадр 6 мудборда 8)
  const swirl = new BABYLON.TorusGeometry(0.38, 0.022, 6, 20);
  swirl.rotateX(Math.PI / 2);
  parts.push({
    geo: swirl,
    matrix: computeTransformMatrix(0, -0.04, 0, 0.28, 0, -0.22, 1, 1, 1, tempMat).clone(),
    color: brassScale
  });
  for (let s = 0; s < 3; s++) {
    const a = (s / 3) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 0.38,
      (s - 1) * 0.06,
      Math.sin(a) * 0.38,
      0.3,
      a,
      0.4,
      0.65,
      1.1,
      0.35,
      tempMat
    );
    parts.push({
      geo: new BABYLON.OctahedronGeometry(0.085, 0),
      matrix: tempMat.clone(),
      color: goldBright
    });
  }
  return mergeGeometryParts(parts);
})();

const pickupInstancedMesh = new BABYLON.InstancedMesh(
  xpPickupGeo,
  new BABYLON.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0x18b8a8,
    emissiveIntensity: 1.35,
    roughness: 0.12,
    metalness: 0.45,
    flatShading: true
  }),
  MAX_PICKUPS
);
pickupInstancedMesh.frustumCulled = false;
pickupInstancedMesh.count = 0;

const healPickupInstancedMesh = new BABYLON.InstancedMesh(
  healPickupGeo,
  new BABYLON.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xe81438,
    emissiveIntensity: 1.45,
    roughness: 0.14,
    metalness: 0.42,
    flatShading: true
  }),
  120
);
healPickupInstancedMesh.frustumCulled = false;
healPickupInstancedMesh.count = 0;

const goldPickupInstancedMesh = new BABYLON.InstancedMesh(
  goldPickupGeo,
  new BABYLON.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    emissive: 0xc87800,
    emissiveIntensity: 1.25,
    roughness: 0.14,
    metalness: 0.88,
    flatShading: true
  }),
  200
);
goldPickupInstancedMesh.frustumCulled = false;
goldPickupInstancedMesh.count = 0;

scene.add(pickupInstancedMesh, healPickupInstancedMesh, goldPickupInstancedMesh);

const PICKUP_COLORS = [
  new BABYLON.Color(0x68f8e8),
  new BABYLON.Color(0xff4d4d),
  new BABYLON.Color(0xffc83d),
  new BABYLON.Color(0xc8ffff)
];
pickupInstancedMesh.setColorAt(0, PICKUP_COLORS[0]);
const _pickupDummyObj = new BABYLON.Object3D();

// 7D. МАРКЕРЫ ЭЛИТНЫХ МОБОВ (по мудборду 6: светящийся зубчатый ореол над головой моба,
// Бронированный — синий, Стремительный — жёлтый, Взрывной — красный, пульсирует меняя размер)
const ELITE_MARKER_MATERIALS = {};
for (const [eliteKey, colorHex] of [
  ['armor', 0x38a8ff],
  ['swift', 0xffe038],
  ['volt', 0xff2838]
]) {
  ELITE_MARKER_MATERIALS[eliteKey] = new BABYLON.SpriteMaterial({
    map: TEXTURES.eliteHalo,
    color: colorHex,
    blending: BABYLON.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.96
  });
}

const eliteMarkerSprites = [...Array(10)].map(() => {
  const sprite = new BABYLON.Sprite(ELITE_MARKER_MATERIALS.armor);
  sprite.visible = false;
  scene.add(sprite);
  return sprite;
});

/* ---------- 8. Синхронизация всех спецэффектов боссов, оружия, Томов и предметов ---------- */

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
      t < 0.2
        ? easeOutCubic(t / 0.2)
        : Math.max(0, 1 - Math.pow((t - 0.2) / 0.8, 1.5));
    er.spikes.scale.set(
      er.scaleMul * (0.72 + t * 0.42),
      Math.max(0.02, spikeRise * 1.25),
      er.scaleMul * (0.72 + t * 0.42)
    );
    er.spikes.material.emissiveIntensity = (1 - t) * 2.8;

    er.torus.scale.setScalar((0.55 + t * 0.72) * er.scaleMul);
    er.torus.material.opacity = Math.max(0, (1 - t) * 0.95);

    er.plume.scale.set(
      (0.68 + t * 0.55) * er.scaleMul,
      0.35 + Math.sin(Math.min(1, t * 1.4) * Math.PI) * 1.15,
      (0.68 + t * 0.55) * er.scaleMul
    );
    er.plume.rotation.y += dt * 3.2;
    er.plume.material.opacity = Math.max(0, (1 - t) * 0.82);

    er.crater.material.opacity = Math.max(0, (1 - t * t) * 0.92);
  }

  // Анимация 3D ледяного следа «Ледяной подошвы»
  for (const fc of frostSlideCrystals) {
    if (!fc.active) continue;
    fc.life += dt;
    const t = fc.life / fc.maxLife;
    if (t >= 1) {
      fc.active = 0;
      fc.mesh.visible = false;
      continue;
    }
    const hScale = t < 0.16 ? easeOutCubic(t / 0.16) : 1 - (t - 0.16) / 0.84;
    fc.mesh.scale.set(0.95, Math.max(0.05, hScale * 1.15), 0.95);
    fc.mesh.material.opacity = Math.max(0, (1 - t) * 0.92);
  }

  // Анимация 3D гейзеров «Парового взрыва (×2)»
  for (const sb of steamBurstEffects) {
    if (!sb.active) continue;
    sb.life += dt;
    const t = sb.life / sb.maxLife;
    if (t >= 1) {
      sb.active = 0;
      sb.mesh.visible = false;
      continue;
    }
    sb.mesh.scale.set(0.65 + t * 2.45, 0.55 + easeOutCubic(t) * 2.2, 0.65 + t * 2.45);
    sb.mesh.rotation.y += dt * 2.5;
    sb.mesh.material.opacity = Math.max(0, (1 - t) * 0.88);
  }

  // Анимация 3D грозовых разрядов «Громового пояса»
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

  // Анимация изумрудного следа «Тома Скорости»
  for (const st of speedTomeTrails) {
    if (!st.active) continue;
    st.life += dt;
    const t = st.life / st.maxLife;
    if (t >= 1) {
      st.active = 0;
      st.mesh.visible = false;
      continue;
    }
    st.mesh.scale.set(0.9 + t * 0.5, 1.0 - t * 0.5, 0.9 + t * 0.8);
    st.mesh.material.opacity = Math.max(0, (1 - t) * 0.75);
  }

  // Синхронизация 3D-моделей активных бомб (Бомба элиты / Лавовый шторм + расширяющееся красное кольцо на земле)
  const activeBombs = (typeof state !== 'undefined' && state && state.activeBombs) || [];
  const elapsed = (typeof state !== 'undefined' && state && state.elapsedTime) || 0;
  for (let i = 0; i < bombVisualPool.length; i++) {
    const bGroup = bombVisualPool[i];
    if (i < activeBombs.length) {
      const bomb = activeBombs[i];
      bGroup.visible = true;
      const urgency = Math.max(0, 1 - (bomb.timer || 0));
      const pulse = 1 + Math.sin(elapsed * (14 + urgency * 24)) * (0.14 + urgency * 0.18);
      bGroup.position.set(bomb.x, bomb.y, bomb.z);

      const { orbMesh, groundRing, glowSprite } = bGroup.userData;
      orbMesh.position.y = Math.sin(elapsed * 8 + i) * 0.08;
      orbMesh.rotation.set(elapsed * 2.5, elapsed * (3.5 + urgency * 8), 0);
      orbMesh.scale.setScalar(pulse);

      const bRadius = bomb.radius || 3.2;
      const ringScale = bRadius * (0.45 + 0.55 * ((elapsed * 2.2 + i * 0.3) % 1.0));
      groundRing.scale.set(ringScale, 1, ringScale);
      groundRing.rotation.y = -elapsed * 2.0;

      const colHex = bomb.applyChill
        ? 0x28b8ff
        : state && state.towerId === 'void'
          ? 0xc038ff
          : 0xff1844;
      orbMesh.material.emissive.setHex(colHex);
      orbMesh.material.emissiveIntensity = 1.8 + urgency * 2.0;
      groundRing.material.color.setHex(colHex);
      glowSprite.material.color.setHex(colHex);
      glowSprite.scale.setScalar(1.4 + urgency * 0.9);
    } else {
      bGroup.visible = false;
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
      _bossDummyObj.updateMatrix();
      slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
      continue;
    }
    piece.vy -= 18 * dt;
    piece.x += piece.vx * dt;
    piece.y += piece.vy * dt;
    piece.z += piece.vz * dt;
    if (piece.y < piece.floorY) {
      piece.y = piece.floorY;
      piece.vy *= -0.35;
      piece.vx *= 0.65;
      piece.vz *= 0.65;
    }
    piece.rx += piece.rvx * dt;
    piece.ry += piece.rvy * dt;
    piece.rz += piece.rvz * dt;
    const scale = 1 - Math.max(0, (piece.life - piece.max * 0.6) / (piece.max * 0.4));
    _bossDummyObj.position.set(piece.x, piece.y, piece.z);
    _bossDummyObj.rotation.set(piece.rx, piece.ry, piece.rz);
    _bossDummyObj.scale.setScalar(scale);
    _bossDummyObj.updateMatrix();
    slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }
  if (instanceUpdated) {
    slagInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  let dripUpdated = false;
  for (let i = 0; i < DRIP_COUNT; i++) {
    const drip = dripData[i];
    if (!drip.active) continue;
    dripUpdated = true;
    drip.velocityY -= 16 * dt;
    drip.y += drip.velocityY * dt;
    if (drip.y <= drip.floorY) {
      drip.active = 0;
      spawnSparkBurst(drip.x, drip.floorY, drip.z, 3, 'land');
      _bossDummyObj.position.set(0, -500, 0);
      _bossDummyObj.updateMatrix();
      dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
      continue;
    }
    _bossDummyObj.position.set(drip.x, drip.y, drip.z);
    _bossDummyObj.rotation.set(0, 0, 0);
    _bossDummyObj.scale.setScalar(1);
    _bossDummyObj.updateMatrix();
    dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }
  if (dripUpdated) {
    dripInstancedMesh.instanceMatrix.needsUpdate = true;
  }
}

function resetBossEffects() {
  for (const r of bossRings) {
    r.active = 0;
    r.mesh.visible = false;
  }
  for (const a of bossArcs) {
    a.active = 0;
    a.mesh.visible = false;
  }
  for (const g of bossGeysers) {
    g.stage = 0;
    g.ring.visible = false;
    g.jet.visible = false;
  }
  for (const er of coalBootEruptions) {
    er.active = 0;
    er.group.visible = false;
  }
  for (const fc of frostSlideCrystals) {
    fc.active = 0;
    fc.mesh.visible = false;
  }
  for (const sb of steamBurstEffects) {
    sb.active = 0;
    sb.mesh.visible = false;
  }
  for (const ts of thunderStrikeEffects) {
    ts.active = 0;
    ts.mesh.visible = false;
  }
  for (const sc of smeltCrystalBursts) {
    sc.active = 0;
    sc.mesh.visible = false;
  }
  for (const st of speedTomeTrails) {
    st.active = 0;
    st.mesh.visible = false;
  }
  for (const bGroup of bombVisualPool) {
    bGroup.visible = false;
  }
  orbitalDefenseGroup.visible = false;
  golemDecalTargetOpacity = 0;
  golemDecalMat.opacity = 0;
  golemDecal.visible = false;
  wombRuneTargetOpacity = 0;
  runeMat.opacity = 0;
  wombRune.visible = false;
  summonRingsTargetOpacity = 0;
  for (const sr of summonRings) {
    sr.mesh.material.opacity = 0;
    sr.mesh.visible = false;
  }
  bossLight.intensity = 0;
}
