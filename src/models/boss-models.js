/* ==========================================================================
   3D-модели трёх боссов:
   Голем Пепельных Врат ('golem'), Кристальная Матка ('womb'), Лавовый Колосс ('koloss')
   ========================================================================== */

/* ---------- 1. ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ ---------- */

function buildGolemPrototype() {
  const rockColors = [0x464144, 0x544e52, 0x3c363a, 0x5f575a, 0x4f423e].map(
    (hex) => new THREE.Color(hex)
  );
  const toothColor = new THREE.Color(0x241f22);
  const parts = {
    hips: [],
    hipsC: [],
    torso: [],
    torsoC: [],
    head: [],
    headC: [],
    jaw: [],
    jawC: [],
    armR: [],
    armRC: [],
    armL: [],
    armLC: [],
    legR: [],
    legRC: [],
    legL: [],
    legLC: [],
    coreTorso: [],
    coreArmR: [],
    coreArmL: [],
    coreLegR: [],
    coreLegL: [],
    coreJaw: [],
    eyes: []
  };

  const pickRockColor = () => rockColors[(Math.random() * rockColors.length) | 0];

  function addRockBlock(listName, w, h, d, x, y, z, rx, ry, rz, jitterAmt, color) {
    const geo = jitterGeometry(
      new THREE.BoxGeometry(w, h, d, 2, 2, 2),
      Math.min(w, h, d) * (jitterAmt === undefined ? 0.12 : jitterAmt)
    );
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0).clone(),
      color: color || pickRockColor()
    });
  }

  function addCharBlock(listName, w, h, d, x, y, z, rx, ry, rz) {
    const geo = jitterGeometry(
      new THREE.BoxGeometry(w, h, d, 2, 2, 2),
      Math.min(w, h, d) * 0.12
    );
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0).clone()
    });
  }

  function addCharShard(listName, r, h, x, y, z, rx, rz, sides) {
    const geo = jitterGeometry(new THREE.ConeGeometry(r, h, sides || 4), r * 0.25);
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, Math.PI / 4, rz || 0).clone()
    });
  }

  function addCoreSphere(listName, r, x, y, z, sx, sy, sz) {
    const geo = new THREE.SphereGeometry(r, 14, 12);
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1).clone()
    });
  }

  // Таз
  addRockBlock('hips', 1.25, 0.45, 0.95, 0, 0.22, 0);
  addCharBlock('hipsC', 1.4, 0.22, 1.05, 0, 0.38, 0);
  addCharShard('hipsC', 0.12, 0.45, -0.65, 0.2, 0.35, 0.4, 0.5);
  addCharShard('hipsC', 0.12, 0.45, 0.65, 0.2, 0.35, 0.4, -0.5);

  // Торс
  addCoreSphere('coreTorso', 1.05, 0, 1.05, 0, 1.15, 0.95, 0.82);
  addRockBlock('torso', 0.68, 0.75, 0.42, -0.55, 1.25, 0.55, 0.05, 0.12, -0.05);
  addRockBlock('torso', 0.68, 0.75, 0.42, 0.55, 1.25, 0.55, 0.05, -0.12, 0.05);
  addCharBlock('torsoC', 0.32, 0.78, 0.2, 0, 1.08, 0.68);
  addRockBlock('torso', 0.52, 0.38, 0.34, -0.32, 0.62, 0.6);
  addRockBlock('torso', 0.52, 0.38, 0.34, 0.32, 0.62, 0.6);
  addRockBlock('torso', 0.48, 0.32, 0.3, -0.3, 0.26, 0.55);
  addRockBlock('torso', 0.48, 0.32, 0.3, 0.3, 0.26, 0.55);
  addCharShard('torsoC', 0.09, 0.35, -0.22, 1.45, 0.72, 0.4, -0.3);
  addCharShard('torsoC', 0.09, 0.35, 0.22, 1.45, 0.72, 0.4, 0.3);
  addRockBlock('torso', 1.35, 1.15, 0.6, 0, 1.15, -0.48);
  addCharBlock('torsoC', 0.95, 0.32, 0.75, 0, 1.55, -0.42);
  for (let i = 0; i < 4; i++) {
    addCharShard(
      'torsoC',
      0.16 - i * 0.02,
      0.7 - i * 0.12,
      0,
      1.7 - i * 0.28,
      -0.5 - i * 0.18,
      -0.85,
      0,
      5
    );
  }
  addRockBlock('torso', 0.5, 0.22, 0.4, -0.52, 1.54, 0.1, 0, 0, 0.25);
  addRockBlock('torso', 0.5, 0.22, 0.4, 0.52, 1.54, 0.1, 0, 0, -0.25);
  addRockBlock('torso', 0.4, 0.4, 0.35, 0, 1.65, -0.05);

  // Голова
  addRockBlock('head', 0.58, 0.52, 0.56, 0, 0.2, 0);
  addCharBlock('headC', 0.55, 0.18, 0.48, 0, 0.46, -0.02);
  addRockBlock('head', 0.68, 0.24, 0.38, 0, 0.34, 0.28, -0.22);
  addRockBlock('head', 0.14, 0.26, 0.3, -0.32, 0.08, 0.2, 0, 0.2, 0.15);
  addRockBlock('head', 0.14, 0.26, 0.3, 0.32, 0.08, 0.2, 0, -0.2, -0.15);
  addCharShard('headC', 0.11, 0.65, -0.3, 0.45, -0.05, -0.45, 0.55);
  addCharShard('headC', 0.11, 0.65, 0.3, 0.45, -0.05, -0.45, -0.55);
  addCharShard('headC', 0.08, 0.4, 0, 0.52, -0.12, -0.6, 0);
  for (const side of [-1, 1]) {
    parts.eyes.push({
      geo: new THREE.BoxGeometry(0.13, 0.06, 0.06),
      matrix: computeTransformMatrix(side * 0.16, 0.18, 0.34, 0, 0, side * 0.35).clone()
    });
  }
  for (let i = 0; i < 4; i++) {
    parts.head.push({
      geo: new THREE.ConeGeometry(0.045, 0.15, 4),
      matrix: computeTransformMatrix((i - 1.5) * 0.11, 0.01, 0.36, Math.PI, 0, 0).clone(),
      color: toothColor
    });
  }

  // Челюсть
  addCharBlock('jawC', 0.48, 0.22, 0.4, 0, -0.12, 0.24);
  addCharShard('jawC', 0.1, 0.35, 0, -0.22, 0.38, 0.6, 0);
  for (let i = 0; i < 4; i++) {
    parts.jaw.push({
      geo: new THREE.ConeGeometry(0.04, 0.14, 4),
      matrix: computeTransformMatrix((i - 1.5) * 0.1, -0.02, 0.36).clone(),
      color: toothColor
    });
  }
  addCoreSphere('coreJaw', 0.18, 0, -0.02, 0.28);

  // Руки
  for (const side of [1, -1]) {
    const rockKey = side > 0 ? 'armR' : 'armL';
    const charKey = rockKey + 'C';
    const coreKey = side > 0 ? 'coreArmR' : 'coreArmL';

    addCharBlock(charKey, 0.92, 0.72, 1.05, 0, 0.18, 0, 0, 0, side * 0.15);
    addRockBlock(rockKey, 0.72, 0.3, 0.85, side * 0.12, 0.48, 0, 0, 0, side * 0.35);
    addCharShard(charKey, 0.2, 0.75, 0, 0.68, 0, 0, side * 0.45);
    addCharShard(charKey, 0.12, 0.45, -side * 0.25, 0.5, 0.25, 0.3, side * 0.4);
    addCoreSphere(coreKey, 0.32, 0, -0.48, 0);
    addRockBlock(rockKey, 0.58, 0.65, 0.58, 0, -0.58, 0);
    addCharShard(charKey, 0.1, 0.45, 0, -0.95, -0.32, 2.3, 0);
    addCoreSphere(coreKey, 0.34, 0, -1.05, 0.05);
    addRockBlock(rockKey, 0.62, 0.82, 0.62, 0, -1.48, 0.1);
    addCharBlock(charKey, 0.72, 0.18, 0.72, 0, -1.25, 0.1);
    addCharBlock(charKey, 0.75, 0.18, 0.75, 0, -1.68, 0.1);
    addCharBlock(charKey, 1.02, 1.15, 1.12, 0, -2.42, 0.18);
    addCoreSphere(coreKey, 0.36, 0, -2.42, 0.38);
    for (let i = 0; i < 4; i++) {
      const knuckleX = (i - 1.5) * 0.26;
      addRockBlock(rockKey, 0.22, 0.26, 0.35, knuckleX, -2.52, 0.74);
      addCharShard(charKey, 0.08, 0.32, knuckleX, -2.52, 0.9, 1.57, 0);
    }
    addRockBlock(rockKey, 0.32, 0.42, 0.36, -side * 0.58, -2.25, 0.45, 0, side * 0.3, 0);
  }

  // Ноги
  for (const side of [1, -1]) {
    const rockKey = side > 0 ? 'legR' : 'legL';
    const charKey = rockKey + 'C';
    const coreKey = side > 0 ? 'coreLegR' : 'coreLegL';

    addRockBlock(rockKey, 0.62, 0.78, 0.68, 0, -0.42, 0);
    addCharBlock(charKey, 0.55, 0.45, 0.22, 0, -0.4, 0.34, 0.1);
    addCharShard(charKey, 0.12, 0.48, side * 0.38, -0.45, 0.1, 0, side * 0.7);
    addCoreSphere(coreKey, 0.32, 0, -0.98, 0.08);
    addCharBlock(charKey, 0.46, 0.42, 0.35, 0, -0.98, 0.36, -0.15);
    addCharShard(charKey, 0.1, 0.38, 0, -0.98, 0.52, 1.45, 0);
    addRockBlock(rockKey, 0.58, 0.88, 0.62, 0, -1.62, 0);
    addCharBlock(charKey, 0.68, 0.16, 0.72, 0, -2.05, 0.05);
    addRockBlock(rockKey, 0.88, 0.48, 1.25, 0, -2.42, 0.22);
    for (let i = -1; i <= 1; i++) {
      addCharBlock(charKey, 0.24, 0.22, 0.35, i * 0.28, -2.5, 0.84);
    }
    addCharShard(charKey, 0.12, 0.45, 0, -2.38, -0.44, -2.2, 0);
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }
  return { merged };
}

function createGolemInstance() {
  const prototype = buildGolemPrototype();
  const root = new THREE.Group();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.08,
    flatShading: true
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0x322d30,
    roughness: 0.88,
    metalness: 0.08,
    flatShading: true,
    emissive: 0xff5500,
    emissiveIntensity: 1.0,
    emissiveMap: TEXTURES.golemChar
  });
  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.leaperLava });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6a10 });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowWarm,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });

  const addRockMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, rockMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };
  const addCharMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, charMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };
  const addCoreMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, coreMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };

  const hips = new THREE.Group();
  hips.position.y = 2.75;
  root.add(hips);
  addRockMesh(prototype.merged.hips, hips);
  addCharMesh(prototype.merged.hipsC, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addRockMesh(prototype.merged.torso, torso);
  addCharMesh(prototype.merged.torsoC, torso);
  addCoreMesh(prototype.merged.coreTorso, torso);

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, parent, ry, rx) {
    const mat = new THREE.MeshBasicMaterial({
      map: TEXTURES.guardCrack,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.5
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx || 0, ry || 0, 0);
    mesh.renderOrder = 5;
    parent.add(mesh);
    crackMats.push(mat);
    return mesh;
  }

  addCrackDecal(1.0, 0.9, 0, 0.98, 0.78, torso);

  const head = new THREE.Group();
  head.position.set(0, 1.9, 0.18);
  torso.add(head);
  addRockMesh(prototype.merged.head, head);
  addCharMesh(prototype.merged.headC, head);
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.16, 0.18, 0.44);
    halo.scale.setScalar(0.7);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.06, 0.14);
  head.add(jaw);
  addRockMesh(prototype.merged.jaw, jaw);
  addCharMesh(prototype.merged.jawC, jaw);
  addCoreMesh(prototype.merged.coreJaw, jaw);

  function makeArm(side) {
    const group = new THREE.Group();
    group.position.set(side * 1.45, 1.35, 0);
    torso.add(group);
    const key = side > 0 ? 'armR' : 'armL';
    addRockMesh(prototype.merged[key], group);
    addCharMesh(prototype.merged[key + 'C'], group);
    addCoreMesh(side > 0 ? prototype.merged.coreArmR : prototype.merged.coreArmL, group);
    if (side > 0) addCrackDecal(0.85, 0.85, 0, -2.42, 0.86, group);
    return group;
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);
  addCrackDecal(0.75, 0.65, 1.38, 1.78, 0.3, torso, 0.4);

  function makeLeg(side) {
    const group = new THREE.Group();
    group.position.set(side * 0.65, 0, 0);
    hips.add(group);
    const key = side > 0 ? 'legR' : 'legL';
    addRockMesh(prototype.merged[key], group);
    addCharMesh(prototype.merged[key + 'C'], group);
    addCoreMesh(side > 0 ? prototype.merged.coreLegR : prototype.merged.coreLegL, group);
    if (side < 0) addCrackDecal(0.55, 0.6, -0.42, -0.52, 0.24, group, -1.3);
    return group;
  }

  const legR = makeLeg(1);
  const legL = makeLeg(-1);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.5
    })
  );
  chestGlow.position.set(0, 1.05, 0.5);
  chestGlow.scale.setScalar(4.6);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'golem',
    hips,
    torso,
    head,
    jaw,
    armR,
    armL,
    legR,
    legL,
    charMat,
    eyeMat,
    eyeBase: eyeMat.color.clone(),
    haloMat,
    eyeHalos,
    crackMats,
    chestGlow,
    tintMats: [createTintEntry(rockMat), createTintEntry(charMat)],
    rootScale: 1,
    lodObjs: eyeHalos.concat([chestGlow])
  };
  return root;
}

/* ---------- 2. КРИСТАЛЬНАЯ МАТКА ---------- */

function buildWombPrototype() {
  const shardGeo = new THREE.OctahedronGeometry(1, 0);
  const shards = [];
  const baseShardCount = 26;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < baseShardCount; i++) {
    const y = 1 - (i / (baseShardCount - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const dir = new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      )
      .normalize();
    const len = 0.9 + Math.random() * 0.8;
    shards.push({
      dir,
      sx: 0.26 + Math.random() * 0.1,
      sy: len,
      sz: 0.26 + Math.random() * 0.1,
      baseR: 0.85 + len * 0.35,
      openR: 0.85 + len * 0.35 + 1.3 + Math.random() * 0.5,
      ph: Math.random() * 7
    });
  }

  for (let i = 0; i < 7; i++) {
    const dir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    const len = 1.9 + Math.random() * 0.7;
    shards.push({
      dir,
      sx: 0.34,
      sy: len,
      sz: 0.34,
      baseR: 0.8 + len * 0.4,
      openR: 0.8 + len * 0.4 + 1.8,
      ph: Math.random() * 7
    });
  }

  const upVec = new THREE.Vector3(0, 1, 0);
  for (const shard of shards) {
    shard.quat = new THREE.Quaternion().setFromUnitVectors(upVec, shard.dir);
  }

  return {
    shardGeo,
    shards,
    coreGeo: new THREE.SphereGeometry(0.95, 26, 20),
    glowGeo: new THREE.SphereGeometry(1.05, 22, 16),
    shieldGeo: new THREE.SphereGeometry(2.5, 26, 18),
    wireGeo: new THREE.IcosahedronGeometry(2.5, 1),
    ringGeoA: new THREE.TorusGeometry(1.7, 0.035, 8, 44),
    ringGeoB: new THREE.TorusGeometry(2.05, 0.035, 8, 44),
    swarmGeo: new THREE.OctahedronGeometry(0.13, 0)
  };
}

function createWombInstance() {
  const prototype = buildWombPrototype();
  const root = new THREE.Group();

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x7a2bd8,
    roughness: 0.18,
    metalness: 0.25,
    flatShading: true,
    emissive: 0x3a0a6a,
    emissiveIntensity: 0.5
  });
  const swarmMat = new THREE.MeshStandardMaterial({
    color: 0x8a3ae0,
    roughness: 0.25,
    metalness: 0.2,
    flatShading: true,
    emissive: 0x4a1a7a,
    emissiveIntensity: 0.55
  });
  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.voidCore });
  const coreGlowMat = new THREE.MeshBasicMaterial({
    color: 0xd090ff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowPurple,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.7
  });
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0xb070ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: 0xd0a0ff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true
  });

  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  root.add(core);
  const coreGlow = new THREE.Mesh(prototype.glowGeo, coreGlowMat);
  root.add(coreGlow);

  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(4.5);
  root.add(halo);

  const shell = new THREE.Group();
  root.add(shell);

  const shardIM = new THREE.InstancedMesh(prototype.shardGeo, crystalMat, prototype.shards.length);
  shardIM.frustumCulled = false;
  shell.add(shardIM);

  const shield = new THREE.Mesh(prototype.shieldGeo, shieldMat);
  shield.renderOrder = 5;
  root.add(shield);

  const shieldWire = new THREE.Mesh(prototype.wireGeo, shieldWireMat);
  shieldWire.renderOrder = 6;
  root.add(shieldWire);

  const vulnRings = [];
  const vrMat = new THREE.MeshBasicMaterial({
    color: 0xe0b0ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 2; i++) {
    const ringMesh = new THREE.Mesh(i ? prototype.ringGeoB : prototype.ringGeoA, vrMat);
    ringMesh.rotation.set(Math.PI / 2 + i * 0.6, i * 0.8, 0);
    root.add(ringMesh);
    vulnRings.push(ringMesh);
  }

  const swarmCount = 64;
  const swarm = new THREE.InstancedMesh(prototype.swarmGeo, swarmMat, swarmCount);
  swarm.frustumCulled = false;
  root.add(swarm);

  const swData = [];
  for (let i = 0; i < swarmCount; i++) {
    swData.push({
      a: Math.random() * TWO_PI,
      r: 3.4 + Math.random() * 2.2,
      sp: (0.3 + Math.random() * 0.6) * (Math.random() < 0.2 ? -1 : 1),
      h: 0.6 + Math.random() * 1.6,
      w: 0.6 + Math.random() * 1.4,
      ph: Math.random() * 7,
      s: 0.5 + Math.random() * 0.9
    });
  }

  root.userData = {
    kind: 'b',
    bkind: 'womb',
    core,
    coreGlow,
    coreGlowMat,
    halo,
    haloMat,
    shell,
    shardIM,
    shardData: prototype.shards,
    shield,
    shieldMat,
    shieldWire,
    shieldWireMat,
    vulnRings,
    vrMat,
    swarm,
    swData,
    crystalMat,
    tintMats: [createTintEntry(crystalMat), createTintEntry(swarmMat)],
    rootScale: 1,
    lodObjs: [swarm, halo]
  };
  return root;
}

/* ---------- 3. ЛАВОВЫЙ КОЛОСС ---------- */

const KOLOSS_COLUMN_HEIGHT = 3.05;

const KOLOSS_INCLUSION_HOSTS = [
  { x: 0, y: 1.12, z: 0, r: 1.02 },
  { x: 0.7, y: 1.5, z: 0.5, r: 0.7 },
  { x: -0.7, y: 1.5, z: 0.5, r: 0.7 },
  { x: 0, y: 0.28, z: 0.06, r: 0.82 },
  { x: 0, y: 1.02, z: -0.9, r: 0.8 },
  { x: 0.5, y: 0.6, z: 0.72, r: 0.55 },
  { x: -0.5, y: 0.6, z: 0.72, r: 0.55 }
];

function buildKolossPrototype() {
  const parts = {
    torso: [],
    head: [],
    jaw: [],
    upR: [],
    foreR: [],
    handR: [],
    upL: [],
    foreL: [],
    handL: [],
    eyes: [],
    mouth: [],
    skirt: []
  };

  const addBlob = (listName, r, x, y, z, sx, sy, sz, jitterAmt) => {
    const geo = jitterGeometry(
      new THREE.IcosahedronGeometry(r, 1),
      r * (jitterAmt === undefined ? 0.16 : jitterAmt)
    );
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1).clone()
    });
  };

  // Торс и юбка
  addBlob('torso', 1.05, 0, 1.12, 0, 1.5, 1.15, 1.05);
  addBlob('torso', 0.85, 0, 0.28, 0.06, 1.15, 1.0, 0.9);
  addBlob('torso', 0.95, 0, 1.02, -0.5, 1.25, 1.15, 0.75);
  addBlob('torso', 0.4, 0, 1.78, 0.06, 1, 0.9, 1);
  addBlob('skirt', 1.3, 0, -0.45, 0, 1.5, 0.85, 1.4);

  // Голова
  addBlob('head', 0.6, 0, 0, 0, 1.05, 1.1, 1.0);
  addBlob('head', 0.42, 0, 0.3, 0.26, 1.25, 0.42, 0.8);
  addBlob('head', 0.3, 0, 0.5, -0.05, 0.8, 0.7, 0.9);
  addBlob('head', 0.2, -0.34, 0.02, 0.3, 1, 1.2, 1);
  addBlob('head', 0.2, 0.34, 0.02, 0.3, 1, 1.2, 1);
  for (const side of [-1, 1]) {
    parts.eyes.push({
      geo: new THREE.SphereGeometry(0.17, 12, 10),
      matrix: computeTransformMatrix(side * 0.24, 0.14, 0.44, 0, 0, 0, 1.15, 0.85, 0.6).clone()
    });
  }

  // Челюсть и пасть
  addBlob('jaw', 0.4, 0, -0.1, 0.16, 1.05, 0.75, 1.0);
  parts.mouth.push({
    geo: new THREE.SphereGeometry(0.26, 10, 8),
    matrix: computeTransformMatrix(0, -0.02, 0.3, 0, 0, 0, 1.2, 0.7, 0.8).clone()
  });

  // Руки
  for (const side of [1, -1]) {
    const upperKey = side > 0 ? 'upR' : 'upL';
    const foreKey = side > 0 ? 'foreR' : 'foreL';
    const handKey = side > 0 ? 'handR' : 'handL';

    addBlob(upperKey, 0.62, 0, 0.12, 0, 1.1, 1, 1.1);
    addBlob(upperKey, 0.42, 0, -0.62, 0, 1, 1.8, 1.1);
    addBlob(foreKey, 0.36, 0, 0, 0);
    addBlob(foreKey, 0.4, 0, -0.5, 0.06, 1.15, 2.2, 1.15);
    addBlob(foreKey, 0.32, 0, -1.02, 0.1);
    addBlob(handKey, 0.5, 0, -0.18, 0, 1.1, 0.9, 1.15);

    for (let i = 0; i < 3; i++) {
      const fingerGeo = jitterGeometry(new THREE.IcosahedronGeometry(0.13, 1), 0.13 * 0.16);
      parts[handKey].push({
        geo: fingerGeo,
        matrix: computeTransformMatrix((i - 1) * 0.2, -0.52, 0.12, 0.45, 0, 0, 1, 2.6, 1).clone()
      });
    }
    const thumbGeo = jitterGeometry(new THREE.IcosahedronGeometry(0.14, 1), 0.14 * 0.16);
    parts[handKey].push({
      geo: thumbGeo,
      matrix: computeTransformMatrix(-side * 0.42, -0.3, 0.14, 0, 0, side * 0.6, 1, 2.2, 1).clone()
    });
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }

  const colGeo = new THREE.CylinderGeometry(1.02, 2.5, KOLOSS_COLUMN_HEIGHT, 14, 5, true);
  colGeo.translate(0, KOLOSS_COLUMN_HEIGHT / 2, 0);
  jitterGeometry(colGeo, 0.2);
  merged.column = colGeo;
  merged.inclusion = jitterGeometry(new THREE.DodecahedronGeometry(1, 0), 0.3);

  return { merged };
}

function createKolossInstance() {
  const prototype = buildKolossPrototype();
  const root = new THREE.Group();

  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff9a2a,
    roughness: 0.38,
    metalness: 0.05,
    flatShading: true,
    map: TEXTURES.kolBody,
    emissive: 0xff6a00,
    emissiveIntensity: 1.15,
    emissiveMap: TEXTURES.kolBody
  });
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xff8c20,
    roughness: 0.42,
    metalness: 0.05,
    flatShading: true,
    map: TEXTURES.kolCol,
    emissive: 0xff5500,
    emissiveIntensity: 1.25,
    emissiveMap: TEXTURES.kolCol,
    side: THREE.DoubleSide
  });
  const hotMat = new THREE.MeshBasicMaterial({ map: TEXTURES.leaperLava });
  const eyeMat = new THREE.MeshBasicMaterial({ map: TEXTURES.kolEye });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowWarm,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });
  const incMat = new THREE.MeshStandardMaterial({
    color: 0x2b1b18,
    roughness: 0.9,
    flatShading: true,
    emissive: 0xff2a00,
    emissiveIntensity: 0.35
  });

  const attachLavaMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, lavaMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };

  const column = new THREE.Mesh(prototype.merged.column, columnMat);
  root.add(column);

  const hips = new THREE.Group();
  hips.position.y = KOLOSS_COLUMN_HEIGHT;
  root.add(hips);
  attachLavaMesh(prototype.merged.skirt, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  attachLavaMesh(prototype.merged.torso, torso);

  const incIM = new THREE.InstancedMesh(prototype.merged.inclusion, incMat, 16);
  incIM.frustumCulled = false;
  torso.add(incIM);

  const incData = [];
  for (let i = 0; i < 16; i++) {
    const host = KOLOSS_INCLUSION_HOSTS[i % KOLOSS_INCLUSION_HOSTS.length];
    const item = {
      hx: host.x,
      hy: host.y,
      hz: host.z,
      hr: host.r,
      dx: Math.random() - 0.5,
      dy: Math.random() - 0.5,
      dz: Math.random() - 0.5,
      rx: Math.random() * 3,
      ry: Math.random() * 3,
      rz: Math.random() * 3,
      base: 0.16 + Math.random() * 0.14,
      life: Math.random() * 7,
      max: 6 + Math.random() * 6
    };
    const len = Math.sqrt(item.dx * item.dx + item.dy * item.dy + item.dz * item.dz) || 1;
    item.dx /= len;
    item.dy /= len;
    item.dz /= len;
    incData.push(item);
  }

  const head = new THREE.Group();
  head.position.set(0, 2.12, 0.14);
  torso.add(head);
  attachLavaMesh(prototype.merged.head, head);
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.24, 0.14, 0.55);
    halo.scale.setScalar(1.0);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.2, 0.12);
  head.add(jaw);
  attachLavaMesh(prototype.merged.jaw, jaw);

  const mouth = new THREE.Mesh(prototype.merged.mouth, hotMat);
  jaw.add(mouth);

  function makeArm(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 1.55, 1.45, 0);
    torso.add(upperGroup);
    attachLavaMesh(side > 0 ? prototype.merged.upR : prototype.merged.upL, upperGroup);

    const elbow = new THREE.Group();
    elbow.position.set(0, -1.28, 0);
    upperGroup.add(elbow);
    attachLavaMesh(side > 0 ? prototype.merged.foreR : prototype.merged.foreL, elbow);

    const hand = new THREE.Group();
    hand.position.set(0, -1.22, 0.14);
    elbow.add(hand);
    attachLavaMesh(side > 0 ? prototype.merged.handR : prototype.merged.handL, hand);
    return { g: upperGroup, elbow, hand };
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, parent) {
    const mat = new THREE.MeshBasicMaterial({
      map: TEXTURES.kolCrack,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.renderOrder = 5;
    parent.add(mesh);
    crackMats.push(mat);
    return mesh;
  }

  addCrackDecal(1.7, 1.5, 0, 1.1, 1.02, torso);
  addCrackDecal(1.2, 1.0, 0, 0.3, 0.92, torso);
  addCrackDecal(0.9, 1.1, 0, -0.5, 0.55, armR.elbow);
  addCrackDecal(0.8, 1.0, 0, -0.6, 0.5, armL.g);
  addCrackDecal(1.6, 1.8, 0, 1.7, 1.35, column);

  const weakSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0
    })
  );
  weakSprite.position.set(0, 1.15, 1.25);
  weakSprite.scale.setScalar(2.4);
  torso.add(weakSprite);

  const vents = [];
  function addVent(parentObj, x, y, z) {
    const flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TEXTURES.glowWarm,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0
      })
    );
    flare.position.set(x, y, z);
    flare.scale.setScalar(1.7);
    parentObj.add(flare);
    vents.push({ lx: x, ly: y, lz: z, flare });
  }

  addVent(torso, 1.15, 1.0, 0.25);
  addVent(torso, -1.15, 1.0, 0.25);
  addVent(torso, 0, 1.3, -0.85);
  addVent(armR.g, 0, 0.55, 0);
  addVent(armL.g, 0, 0.55, 0);

  const baseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.4
    })
  );
  baseGlow.position.set(0, 0.6, 0);
  baseGlow.scale.setScalar(7.5);
  root.add(baseGlow);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.5
    })
  );
  chestGlow.position.set(0, 1.1, 0.6);
  chestGlow.scale.setScalar(4.2);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'koloss',
    column,
    hips,
    torso,
    head,
    jaw,
    armR,
    armL,
    lavaMat,
    columnMat,
    eyeMat,
    haloMat,
    eyeHalos,
    crackMats,
    weakSprite,
    vents,
    incIM,
    incData,
    incMat,
    baseGlow,
    chestGlow,
    mouth,
    tintMats: [createTintEntry(lavaMat), createTintEntry(columnMat)],
    rootScale: 1,
    lodObjs: eyeHalos.concat(
      vents.map((v) => v.flare),
      [weakSprite, baseGlow, chestGlow]
    )
  };
  return root;
}
