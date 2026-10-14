/* ==========================================================================
   Визуальные эффекты, частицы, пулы молний, снарядов, колец и опасностей боссов
   ========================================================================== */

/* ---------- 1. Пул молний (Three.Line с готовыми буферами) ---------- */

const BOLT_MAX_SEGMENTS = 16;
const boltPool = [];

function acquireBolt(parentObj, fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount, maxLifetime) {
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
  bolt.mat.color.setHex(towerId === 'ice' ? 0xb8f4ff : 0xe8ccff);

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
  let az = 0;
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

function spawnGlobalBolt(fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount) {
  globalBolts.push(
    acquireBolt(scene, fromX, fromY, fromZ, toX, toY, toZ, amplitude, segmentCount, 0.15 + Math.random() * 0.25)
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

const bossRingGeo = new THREE.RingGeometry(0.85, 1.15, 44);
const bossRings = [];
for (let i = 0; i < 6; i++) {
  const mesh = new THREE.Mesh(
    bossRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff8c30,
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
  ring.mesh.position.set(x, y + 0.07, z);
  ring.mesh.scale.setScalar(1);
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

const SLAG_COUNT = 22;
const slagGeo = jitterGeometry(new THREE.BoxGeometry(0.16, 0.16, 0.16), 0.05);
const slagMat = new THREE.MeshStandardMaterial({
  color: 0x3e383c,
  roughness: 0.9,
  flatShading: true,
  emissive: 0xff4400,
  emissiveIntensity: 1.4
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

/* ---------- 3. Снаряды, клинки, пыль, искры, дым и кольца ---------- */

const playerFireballInstancedMesh = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.35, 12, 12),
  new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: 0xff4400,
    emissiveIntensity: 2.5,
    roughness: 0.1
  }),
  250
);

const enemyProjectileMat = new THREE.MeshStandardMaterial({
  color: 0xff40a0,
  emissive: 0xff0080,
  emissiveIntensity: 2,
  roughness: 0.2
});

const enemyProjectileInstancedMesh = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.3, 10, 10),
  enemyProjectileMat,
  100
);

const bladeGeometry = new THREE.ConeGeometry(0.3, 1.8, 4);
bladeGeometry.scale(1, 1, 0.15);
bladeGeometry.rotateX(Math.PI / 2);

const orbitalBladeInstancedMesh = new THREE.InstancedMesh(
  bladeGeometry,
  new THREE.MeshStandardMaterial({
    color: 0xe0e8f0,
    emissive: 0x6080a0,
    emissiveIntensity: 1.2,
    metalness: 0.9,
    roughness: 0.1,
    flatShading: true
  }),
  50
);

playerFireballInstancedMesh.frustumCulled = false;
enemyProjectileInstancedMesh.frustumCulled = false;
orbitalBladeInstancedMesh.frustumCulled = false;
scene.add(playerFireballInstancedMesh, enemyProjectileInstancedMesh, orbitalBladeInstancedMesh);

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

const SPARK_PARTICLE_COUNT = 400;
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
    size: 0.08,
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
    if (towerId === 'ice') {
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

const fireLandingRingGeo = new THREE.RingGeometry(0.8, 1.0, 28);
const voidLandingRingGeo = new THREE.RingGeometry(0.5, 0.68, 28);

const fireLandingRings = [];
for (let i = 0; i < 15; i++) {
  const ring = new THREE.Mesh(
    fireLandingRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xff7a20,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.userData = { life: 1 };
  scene.add(ring);
  fireLandingRings.push(ring);
}
let fireLandingRingCursor = 0;

function spawnFireLandingRing(x, y, z) {
  const ring = fireLandingRings[fireLandingRingCursor++ % fireLandingRings.length];
  ring.position.set(x, y + 0.03, z);
  ring.visible = true;
  ring.userData.life = 0;
  ring.scale.setScalar(1);
}

const voidLandingRings = [];
for (let i = 0; i < 12; i++) {
  const ring = new THREE.Mesh(
    voidLandingRingGeo,
    new THREE.MeshBasicMaterial({
      color: 0xa060ff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  ring.userData = { life: 1 };
  scene.add(ring);
  voidLandingRings.push(ring);
}
let voidLandingRingCursor = 0;

function spawnVoidLandingRing(x, y, z) {
  const ring = voidLandingRings[voidLandingRingCursor++ % voidLandingRings.length];
  ring.position.set(x, y + 0.03, z);
  ring.visible = true;
  ring.userData.life = 0;
  ring.scale.setScalar(1);
}

const waveEffectRings = [...Array(6)].map(() => {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 28),
    new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.lifeLeft = 0;
  scene.add(mesh);
  return mesh;
});
let waveEffectRingCursor = 0;

function spawnWaveRingEffect(x, y, z, radius, colorHex) {
  const mesh = waveEffectRings[waveEffectRingCursor++ % waveEffectRings.length];
  mesh.position.set(x, y + 0.2, z);
  mesh.scale.setScalar(radius);
  mesh.material.color.setHex(colorHex);
  mesh.lifeLeft = 0.3;
  mesh.visible = true;
}

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

/* ---------- 4. Лут и маркеры элит ---------- */

const MAX_PICKUPS = 400;
const pickupInstancedMesh = new THREE.InstancedMesh(
  new THREE.OctahedronGeometry(0.4, 0),
  new THREE.MeshBasicMaterial({ color: 0xffffff }),
  MAX_PICKUPS
);
pickupInstancedMesh.frustumCulled = false;
pickupInstancedMesh.count = 0;
scene.add(pickupInstancedMesh);

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

/* ---------- 5. Синхронизация и сброс спецэффектов боссов ---------- */

function syncBossVisualEffects(dt) {
  for (const ring of bossRings) {
    if (!ring.active) continue;
    ring.mesh.scale.setScalar(ring.radius);
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
