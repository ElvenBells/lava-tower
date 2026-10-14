/* ==========================================================================
   3D-модели обычных мобов:
   Огарёк ('s'), Пустотный Шип ('r'), Каменный Страж ('t'), Обсидиановый Прыгун ('l')
   ========================================================================== */

/* ---------- 1. ОГАРЁК ('s') ---------- */

function buildOgarekPrototype() {
  const coreGeo = new THREE.SphereGeometry(0.94, 24, 24);

  // Корка из 80 осколков сливается в 2 меша (порода и багрянец)
  const rockColors = [0x3d3d44, 0x4a4a52, 0x56565e, 0x333338].map((hex) => new THREE.Color(hex));
  const burgundyColors = [0x6b1622, 0x80202e].map((hex) => new THREE.Color(hex));
  const rockParts = [];
  const burgundyParts = [];

  const chunkCount = 80;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < chunkCount; i++) {
    const y = 1 - (i / (chunkCount - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    const dir = new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.25
        )
      )
      .normalize();

    const chunkSize = 0.17 + Math.random() * 0.19;
    const geo = jitterGeometry(new THREE.DodecahedronGeometry(chunkSize, 0), chunkSize * 0.5);
    const baseRadius = 0.97 + chunkSize * 0.4;

    _tempTransformObj.position.copy(dir).multiplyScalar(baseRadius);
    _tempTransformObj.scale.set(1, 1, 0.55);
    _tempTransformObj.up.set(0, 1, 0);
    _tempTransformObj.lookAt(dir.clone().multiplyScalar(baseRadius * 3));
    _tempTransformObj.rotateZ(Math.random() * Math.PI);
    _tempTransformObj.updateMatrix();

    const mat4 = _tempTransformObj.matrix.clone();
    if (Math.random() < 0.18) {
      burgundyParts.push({
        geo,
        matrix: mat4,
        color: burgundyColors[(Math.random() * burgundyColors.length) | 0]
      });
    } else {
      rockParts.push({
        geo,
        matrix: mat4,
        color: rockColors[(Math.random() * rockColors.length) | 0]
      });
    }
  }

  const chunksRockGeo = mergeGeometryParts(rockParts);
  const chunksBurgGeo = mergeGeometryParts(burgundyParts);

  // Глаза: форма выдавливается один раз, трансформации запекаются
  const eyeShape = new THREE.Shape();
  eyeShape.moveTo(-0.30, 0.15);
  eyeShape.lineTo(0.30, 0.03);
  eyeShape.lineTo(0.15, -0.16);
  eyeShape.lineTo(-0.18, -0.03);
  eyeShape.closePath();

  const outerEyeBase = new THREE.ExtrudeGeometry(eyeShape, { depth: 0.14, bevelEnabled: false });
  const innerEyeBase = new THREE.ExtrudeGeometry(eyeShape, { depth: 0.10, bevelEnabled: false });
  const outerEyeParts = [];
  const innerEyeParts = [];
  const haloPositions = [];

  for (const sign of [-1, 1]) {
    const dir = new THREE.Vector3(sign * 0.45, 0.30, 0.85).normalize();
    const eyeGroup = new THREE.Group();
    eyeGroup.position.copy(dir).multiplyScalar(1.10);
    eyeGroup.lookAt(dir.clone().multiplyScalar(4));
    eyeGroup.rotateZ(-sign * 0.36);
    eyeGroup.scale.setScalar(1.35);

    const innerObj = new THREE.Object3D();
    innerObj.scale.setScalar(0.5);
    innerObj.position.z = 0.12;
    eyeGroup.add(innerObj);
    eyeGroup.updateMatrixWorld(true);

    outerEyeParts.push({ geo: outerEyeBase.clone(), matrix: eyeGroup.matrixWorld.clone() });
    innerEyeParts.push({ geo: innerEyeBase.clone(), matrix: innerObj.matrixWorld.clone() });
    haloPositions.push(new THREE.Vector3().copy(dir).multiplyScalar(1.30));
  }

  const eyeOuterGeo = mergeGeometryParts(outerEyeParts);
  const eyeInnerGeo = mergeGeometryParts(innerEyeParts);
  const debrisGeo = jitterGeometry(new THREE.DodecahedronGeometry(0.13, 0), 0.06);

  return {
    coreGeo,
    chunksRockGeo,
    chunksBurgGeo,
    eyeOuterGeo,
    eyeInnerGeo,
    debrisGeo,
    haloPositions
  };
}

function createOgarekInstance(prototype) {
  const group = new THREE.Group();

  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.ogarekCore });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  group.add(core);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true
  });
  const chunks = new THREE.Mesh(prototype.chunksRockGeo, rockMat);
  group.add(chunks);

  const burgMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: true,
    emissive: 0x1c0409,
    emissiveIntensity: 0.55
  });
  const burg = new THREE.Mesh(prototype.chunksBurgGeo, burgMat);
  group.add(burg);

  const eyeMatO = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
  const eyeMatI = new THREE.MeshBasicMaterial({ color: 0xfff8d0 });
  group.add(new THREE.Mesh(prototype.eyeOuterGeo, eyeMatO));
  group.add(new THREE.Mesh(prototype.eyeInnerGeo, eyeMatI));

  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowWarm,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });
  const halos = [];
  for (const haloPos of prototype.haloPositions) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(haloPos);
    halo.scale.setScalar(1.6);
    group.add(halo);
    halos.push(halo);
  }

  const debrisMatA = new THREE.MeshStandardMaterial({
    color: 0x3d3d44,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true
  });
  const debrisMatB = new THREE.MeshStandardMaterial({
    color: 0x56565e,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true
  });
  const debris = [];
  for (let i = 0; i < 5; i++) {
    const piece = new THREE.Mesh(prototype.debrisGeo, i % 2 ? debrisMatB : debrisMatA);
    piece.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 1.8 + Math.random() * 0.7,
      height: 0.9 + Math.random() * 1.1,
      speed: 0.25 + Math.random() * 0.4
    };
    piece.scale.setScalar(0.7 + Math.random() * 0.7);
    group.add(piece);
    debris.push(piece);
  }

  group.scale.setScalar(0.45);

  const tintMats = [
    createTintEntry(rockMat),
    createTintEntry(burgMat),
    createTintEntry(debrisMatA),
    createTintEntry(debrisMatB)
  ];

  group.userData = {
    kind: 's',
    core,
    chunks,
    burg,
    eyeMatO,
    eyeMatI,
    eyeBaseO: eyeMatO.color.clone(),
    eyeBaseI: eyeMatI.color.clone(),
    halos,
    haloMat,
    debris,
    tintMats,
    chunksPhase: 0,
    rootScale: 0.45,
    lodObjs: debris.concat(halos)
  };
  return group;
}

/* ---------- 2. ПУСТОТНЫЙ ШИП ('r') ---------- */

function buildShypPrototype() {
  const shellGeo = new THREE.OctahedronGeometry(1, 0);
  shellGeo.scale(0.78, 1.5, 0.78);
  const edgesGeo = new THREE.EdgesGeometry(shellGeo);
  const coreGeo = new THREE.SphereGeometry(0.3, 24, 24);
  const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
  return { shellGeo, edgesGeo, coreGeo, shardGeo };
}

function createShypInstance(prototype) {
  const group = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x7a2bd8,
    roughness: 0.15,
    metalness: 0.25,
    flatShading: true,
    transparent: true,
    opacity: 0.5,
    emissive: 0x3a0a6a,
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const shell = new THREE.Mesh(prototype.shellGeo, shellMat);
  shell.renderOrder = 5;
  group.add(shell);

  const edgesMat = new THREE.LineBasicMaterial({
    color: 0xc090ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const edges = new THREE.LineSegments(prototype.edgesGeo, edgesMat);
  edges.renderOrder = 6;
  group.add(edges);

  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.voidCore });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  core.renderOrder = 3;
  group.add(core);

  const glow = createGlowSprite(TEXTURES.glowPurple, 3.0);
  glow.renderOrder = 2;
  group.add(glow);

  // Внутренний вихрь частиц
  const stormParticleCount = 150;
  const stGeo = new THREE.BufferGeometry();
  const stPos = new Float32Array(stormParticleCount * 3);
  const stCol = new Float32Array(stormParticleCount * 3);
  const stData = [];

  for (let i = 0; i < stormParticleCount; i++) {
    stData.push({
      radius: 0.1 + Math.random() * 0.45,
      theta: Math.random() * Math.PI * 2,
      y: (Math.random() - 0.5) * 1.6,
      swirlSpeed: (1.6 + Math.random() * 2.6) * (Math.random() < 0.18 ? -1 : 1),
      freqY: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      color:
        Math.random() < 0.12
          ? new THREE.Color(1, 1, 1)
          : new THREE.Color().setHSL(0.75 + Math.random() * 0.1, 1, 0.55 + Math.random() * 0.3)
    });
  }

  stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  stGeo.setAttribute('color', new THREE.BufferAttribute(stCol, 3));
  const storm = new THREE.Points(
    stGeo,
    new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  storm.renderOrder = 4;
  group.add(storm);

  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x5a1fa8,
    roughness: 0.3,
    metalness: 0.2,
    flatShading: true,
    emissive: 0x20084a,
    emissiveIntensity: 0.5
  });
  const shards = [];
  for (let i = 0; i < 4; i++) {
    const shard = new THREE.Mesh(prototype.shardGeo, shardMat);
    shard.scale.setScalar(0.75 + Math.random() * 0.6);
    shard.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 1.7 + Math.random() * 0.6,
      speed: 0.35 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    };
    group.add(shard);
    shards.push(shard);
  }

  const tintMats = [createTintEntry(shellMat), createTintEntry(shardMat)];
  group.scale.setScalar(0.55);

  group.userData = {
    kind: 'r',
    shell,
    edges,
    shellMat,
    edgesMat,
    core,
    coreMat,
    glow,
    storm,
    stGeo,
    stData,
    shards,
    tintMats,
    rootScale: 0.55,
    lodObjs: [storm, glow].concat(shards)
  };
  return group;
}

/* ---------- 3. КАМЕННЫЙ СТРАЖ ('t') ---------- */

function buildGuardPrototype() {
  const stoneColors = [0x8d8781, 0x7a746e, 0x9b958d, 0x6b6560].map((hex) => new THREE.Color(hex));
  const mossColor = new THREE.Color(0x6f7d5c);

  const pickStoneStyle = () => {
    const roll = Math.random();
    if (roll < 0.12) return { tag: 'vc', color: mossColor };
    if (roll < 0.30) return { tag: 'brick' };
    return { tag: 'vc', color: stoneColors[(Math.random() * stoneColors.length) | 0] };
  };

  const partsByLimb = {
    torso: [],
    torsoBrick: [],
    head: [],
    armR: [],
    armL: [],
    legR: [],
    legL: []
  };

  function addBlock(limbName, w, h, d, x, y, z, rx, ry, rz, customStyle) {
    const style = customStyle || pickStoneStyle();
    const targetList =
      style.tag === 'brick'
        ? partsByLimb[limbName + 'Brick'] || partsByLimb[limbName]
        : partsByLimb[limbName];
    const geo = jitterGeometry(new THREE.BoxGeometry(w, h, d), Math.min(w, h, d) * 0.2);
    targetList.push({
      geo,
      matrix: computeTransformMatrix(
        x,
        y,
        z,
        rx === undefined ? (Math.random() - 0.5) * 0.07 : rx,
        ry === undefined ? (Math.random() - 0.5) * 0.1 : ry,
        rz === undefined ? (Math.random() - 0.5) * 0.07 : rz
      ).clone(),
      color: style.color
    });
  }

  // Торс
  addBlock('torso', 1.0, 0.4, 0.7, 0, 0.2, 0);
  addBlock('torso', 1.15, 0.45, 0.8, 0, 0.6, 0);
  addBlock('torso', 1.5, 0.5, 0.95, 0, 1.05, 0);
  addBlock('torso', 1.7, 0.25, 0.9, 0, 1.35, 0);
  addBlock('torso', 0.8, 0.5, 0.5, 0, 1.3, -0.45);
  addBlock('torso', 0.5, 0.4, 0.12, 0.4, 0.8, 0.42, undefined, undefined, undefined, { tag: 'brick' });
  addBlock('torso', 0.42, 0.35, 0.12, -0.45, 1.15, 0.44, undefined, undefined, undefined, { tag: 'brick' });

  // Голова
  addBlock('head', 0.55, 0.45, 0.5, 0, 0.2, 0);
  addBlock('head', 0.62, 0.13, 0.22, 0, 0.34, 0.24, -0.25, undefined, undefined);
  addBlock('head', 0.4, 0.18, 0.3, 0, 0.02, 0.16);

  // Руки
  for (const side of [1, -1]) {
    const limb = side > 0 ? 'armR' : 'armL';
    addBlock(limb, 0.6, 0.55, 0.75, 0, 0.05, 0);
    addBlock(limb, 0.45, 0.7, 0.5, 0, -0.45, 0);
    addBlock(limb, 0.4, 0.3, 0.4, 0, -0.85, 0);
    addBlock(limb, 0.55, 1.0, 0.75, 0, -1.45, 0.05);
    addBlock(limb, 0.5, 0.3, 0.6, 0, -2.0, 0.1);
  }

  // Ноги
  for (const side of [1, -1]) {
    const limb = side > 0 ? 'legR' : 'legL';
    addBlock(limb, 0.55, 0.7, 0.6, 0, -0.35, 0);
    addBlock(limb, 0.45, 0.25, 0.5, 0, -0.75, 0.05);
    addBlock(limb, 0.5, 0.6, 0.55, 0, -1.1, 0);
    addBlock(limb, 0.65, 0.22, 0.9, 0, -1.42, 0.12);
  }

  const merged = {};
  for (const key in partsByLimb) {
    merged[key] = mergeGeometryParts(partsByLimb[key]);
  }

  const eyeParts = [];
  for (const side of [-1, 1]) {
    eyeParts.push({
      geo: new THREE.BoxGeometry(0.11, 0.075, 0.06),
      matrix: computeTransformMatrix(side * 0.14, 0.23, 0.27).clone()
    });
  }
  merged.eyes = mergeGeometryParts(eyeParts);

  return { merged };
}

function createGuardInstance(prototype) {
  const root = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.04,
    flatShading: true
  });
  const brickMat = new THREE.MeshStandardMaterial({
    map: TEXTURES.guardBrick,
    roughness: 0.9,
    flatShading: true
  });

  const attachVertexColorMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };

  const hips = new THREE.Group();
  hips.position.y = 1.5;
  root.add(hips);

  const torsoGroup = new THREE.Group();
  hips.add(torsoGroup);
  attachVertexColorMesh(prototype.merged.torso, torsoGroup);
  if (prototype.merged.torsoBrick) {
    torsoGroup.add(new THREE.Mesh(prototype.merged.torsoBrick, brickMat));
  }

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, ry, rx, parent) {
    const mat = new THREE.MeshBasicMaterial({
      map: TEXTURES.guardCrack,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.6
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.renderOrder = 5;
    parent.add(mesh);
    crackMats.push(mat);
    return mesh;
  }

  addCrackDecal(0.95, 0.85, 0, 0.85, 0.52, 0, 0, torsoGroup);
  addCrackDecal(0.5, 0.45, 1.05, 1.4, 0.4, 0.5, 0, torsoGroup);

  const head = new THREE.Group();
  head.position.set(0, 1.6, 0.05);
  torsoGroup.add(head);
  attachVertexColorMesh(prototype.merged.head, head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.coal,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85
  });
  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.14, 0.23, 0.34);
    halo.scale.setScalar(0.7);
    head.add(halo);
    eyeHalos.push(halo);
  }

  function makeArm(side) {
    const group = new THREE.Group();
    group.position.set(side * 1.05, 1.3, 0);
    torsoGroup.add(group);
    attachVertexColorMesh(side > 0 ? prototype.merged.armR : prototype.merged.armL, group);
    if (side < 0) {
      addCrackDecal(0.45, 0.8, 0, -1.45, 0.45, 0, 0, group);
    }
    return { g: group };
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);

  function makeLeg(side) {
    const group = new THREE.Group();
    group.position.set(side * 0.5, 0, 0);
    hips.add(group);
    attachVertexColorMesh(side > 0 ? prototype.merged.legR : prototype.merged.legL, group);
    return group;
  }

  const legR = makeLeg(1);
  const legL = makeLeg(-1);

  root.position.y = 0.14;
  root.scale.setScalar(0.6);

  const tintMats = [createTintEntry(stoneMat), createTintEntry(brickMat)];
  root.userData = {
    kind: 't',
    hips,
    torso: torsoGroup,
    head,
    armR,
    armL,
    legR,
    legL,
    eyeMat,
    eyeBase: eyeMat.color.clone(),
    eyeHalos,
    haloMat,
    crackMats,
    atkState: 'idle',
    atkT: 0,
    atkTimer: 3 + Math.random() * 2,
    impacted: false,
    flare: 0,
    shake: 0,
    coal: 1,
    coalT: 0,
    tintMats,
    rootScale: 0.6,
    lodObjs: eyeHalos
  };
  return root;
}

/* ---------- 4. ОБСИДИАНОВЫЙ ПРЫГУН ('l') ---------- */

function buildLeaperPrototype() {
  const obsidianColor = new THREE.Color(0x0b0b0e);
  const toothColor = new THREE.Color(0x17171b);
  const partsByLimb = {
    hips: [],
    head: [],
    jaw: [],
    fUpper: [],
    fFore: [],
    bThigh: [],
    bShin: [],
    bFoot: [],
    tail: []
  };

  const makeObsidianBox = (w, h, d) =>
    jitterGeometry(new THREE.BoxGeometry(w, h, d), Math.min(w, h, d) * 0.22);
  const makeSpike = (r, h) => new THREE.ConeGeometry(r, h, 4);
  const addPart = (limbName, geo, x, y, z, rx, ry, rz, sx, sy, sz, color) => {
    partsByLimb[limbName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx, ry, rz, sx, sy, sz).clone(),
      color: color || obsidianColor
    });
  };

  // Пластины панциря
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2;
    const isTop = i % 2 === 0;
    const z = -1.05 + (i / 22) * 1.9 + (Math.random() - 0.5) * 0.15;
    const widthProfile = Math.sqrt(Math.max(0.05, 1 - Math.pow((z + 0.1) / 1.25, 2)));
    const px = Math.cos(angle * 3.1) * 0.5 * widthProfile + (Math.random() - 0.5) * 0.12;
    const py = isTop ? 0.42 * widthProfile + 0.06 : 0.18 * widthProfile;
    const size = 0.16 + Math.random() * 0.14;
    addPart(
      'hips',
      jitterGeometry(new THREE.DodecahedronGeometry(size, 0), size * 0.45),
      px,
      py,
      z,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.4,
      1.15,
      0.5,
      1.5
    );
  }

  // Шипы вдоль хребта
  for (let i = 0; i < 6; i++) {
    const z = -0.95 + i * 0.32;
    const widthProfile = Math.sqrt(Math.max(0.1, 1 - Math.pow((z + 0.1) / 1.25, 2)));
    addPart(
      'hips',
      makeSpike(
        0.07 + 0.03 * Math.sin((i / 5) * Math.PI),
        0.4 + 0.2 * Math.sin((i / 5) * Math.PI)
      ),
      0,
      0.42 * widthProfile + 0.18,
      z,
      -0.5,
      Math.PI / 4,
      0
    );
  }

  // Голова и зубы
  addPart('head', makeObsidianBox(0.42, 0.3, 0.55), 0, 0, 0.25);
  addPart('head', makeObsidianBox(0.3, 0.2, 0.42), 0, -0.07, 0.62);
  for (const side of [-1, 1]) {
    addPart('head', makeSpike(0.05, 0.3), side * 0.17, 0.16, 0.12, -1.1, 0, side * 0.3);
  }
  addPart('head', makeSpike(0.06, 0.34), 0, 0.2, -0.05, -0.9);
  for (let i = 0; i < 4; i++) {
    addPart(
      'head',
      makeSpike(0.025, 0.11),
      (i - 1.5) * 0.07,
      -0.16,
      0.32 + (i % 2) * 0.1,
      Math.PI,
      0,
      0,
      1,
      1,
      1,
      toothColor
    );
    addPart(
      'jaw',
      makeSpike(0.025, 0.11),
      (i - 1.5) * 0.07,
      -0.02,
      0.3 + (i % 2) * 0.1,
      Math.PI,
      0,
      0,
      1,
      1,
      1,
      toothColor
    );
  }

  // Челюсть
  addPart('jaw', makeObsidianBox(0.26, 0.1, 0.44), 0, -0.05, 0.22);

  // Передние лапы
  addPart('fUpper', makeObsidianBox(0.13, 0.34, 0.13), 0, -0.17, 0);
  addPart('fFore', makeObsidianBox(0.11, 0.3, 0.11), 0, -0.15, 0.04);
  for (let i = -1; i <= 1; i++) {
    addPart('fFore', makeSpike(0.028, 0.17), i * 0.05, -0.3, 0.12, 2.4, 0, i * 0.25);
  }

  // Задние лапы
  addPart('bThigh', makeObsidianBox(0.22, 0.8, 0.34), 0, -0.38, 0);
  for (let i = 0; i < 2; i++) {
    addPart('bThigh', makeSpike(0.04, 0.24), 0, -0.2 - i * 0.3, -0.18, 2.6);
  }
  addPart('bShin', makeObsidianBox(0.13, 0.68, 0.15), 0, -0.34, 0);
  addPart('bFoot', makeObsidianBox(0.15, 0.1, 0.42), 0, -0.04, 0.14);
  for (let i = -1; i <= 1; i++) {
    addPart('bFoot', makeSpike(0.03, 0.2), i * 0.06, -0.05, 0.36, 1.9, 0, i * 0.2);
  }
  addPart('bFoot', makeSpike(0.03, 0.18), 0, -0.02, -0.14, -2.2);

  // Сегменты хвоста
  const tailGeos = [];
  let tailScale = 1;
  for (let i = 0; i < 4; i++) {
    const segParts = [];
    const pushSegPart = (geo, x, y, z, rx, ry, rz) =>
      segParts.push({
        geo,
        matrix: computeTransformMatrix(x, y, z, rx, ry, rz).clone(),
        color: obsidianColor
      });
    pushSegPart(
      makeObsidianBox(0.26 * tailScale, 0.22 * tailScale, 0.42 * tailScale),
      0,
      0,
      -0.2 * tailScale
    );
    if (i < 2) {
      for (const side of [-1, 1]) {
        pushSegPart(makeSpike(0.04, 0.22), side * 0.14 * tailScale, 0.08, -0.15 * tailScale, 0, 0, side * 0.9);
      }
    }
    if (i === 3) {
      pushSegPart(makeSpike(0.05, 0.34), 0, 0, -0.5 * tailScale, -Math.PI / 2 + 0.3);
    }
    tailGeos.push(mergeGeometryParts(segParts));
    tailScale *= 0.78;
  }

  const merged = {};
  for (const key in partsByLimb) {
    merged[key] = mergeGeometryParts(partsByLimb[key]);
  }
  merged.tail = tailGeos;

  const eyeParts = [];
  for (const side of [-1, 1]) {
    eyeParts.push({
      geo: new THREE.SphereGeometry(0.055, 10, 10),
      matrix: computeTransformMatrix(side * 0.15, 0.05, 0.44).clone()
    });
  }
  merged.eyes = mergeGeometryParts(eyeParts);

  const coreGeo = new THREE.SphereGeometry(1, 24, 18);
  const mawGeo = new THREE.BoxGeometry(0.2, 0.05, 0.3);
  return { merged, coreGeo, mawGeo };
}

function createLeaperInstance(prototype) {
  const root = new THREE.Group();
  const obsidianMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.85,
    flatShading: true,
    emissive: 0x1a0a05,
    emissiveIntensity: 0.15
  });

  const attachObsidianMesh = (geo, parent, x, y, z) => {
    const mesh = new THREE.Mesh(geo, obsidianMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };

  const hips = new THREE.Group();
  hips.position.y = 0.98;
  root.add(hips);
  attachObsidianMesh(prototype.merged.hips, hips);

  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.leaperLava });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  core.position.set(0, 0, -0.1);
  core.scale.set(0.6, 0.46, 1.12);
  hips.add(core);

  const glow = createGlowSprite(TEXTURES.coal, 2.6);
  glow.position.set(0, -0.1, 0);
  hips.add(glow);

  const head = new THREE.Group();
  head.position.set(0, 0.14, 1.02);
  hips.add(head);
  attachObsidianMesh(prototype.merged.head, head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4422 });
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.coal,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85
  });
  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.15, 0.05, 0.5);
    halo.scale.setScalar(0.42);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.13, 0.42);
  head.add(jaw);
  attachObsidianMesh(prototype.merged.jaw, jaw);

  const mawMat = new THREE.MeshBasicMaterial({ color: 0xff5511 });
  const maw = new THREE.Mesh(prototype.mawGeo, mawMat);
  maw.position.set(0, 0.0, 0.28);
  jaw.add(maw);

  const tailSegs = [];
  let tailParent = hips;
  let tailZ = -1.15;
  let tailY = 0.02;
  for (let i = 0; i < 4; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, tailY, tailZ);
    tailParent.add(segGroup);
    attachObsidianMesh(prototype.merged.tail[i], segGroup);
    tailSegs.push(segGroup);
    tailParent = segGroup;
    tailY = 0;
    tailZ = -0.4 * (i === 0 ? 1 : Math.pow(0.78, i));
  }

  function makeFrontLeg(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 0.42, -0.22, 0.55);
    hips.add(upperGroup);
    attachObsidianMesh(prototype.merged.fUpper, upperGroup);

    const foreGroup = new THREE.Group();
    foreGroup.position.set(0, -0.34, 0);
    upperGroup.add(foreGroup);
    attachObsidianMesh(prototype.merged.fFore, foreGroup);
    return { g: upperGroup, fore: foreGroup };
  }

  const legFL = makeFrontLeg(-1);
  const legFR = makeFrontLeg(1);

  function makeBackLeg(side) {
    const thighGroup = new THREE.Group();
    thighGroup.position.set(side * 0.48, -0.12, -0.72);
    hips.add(thighGroup);
    attachObsidianMesh(prototype.merged.bThigh, thighGroup);

    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -0.75, 0);
    thighGroup.add(shinGroup);
    attachObsidianMesh(prototype.merged.bShin, shinGroup);

    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.66, 0);
    shinGroup.add(footGroup);
    attachObsidianMesh(prototype.merged.bFoot, footGroup);
    return { g: thighGroup, shin: shinGroup, foot: footGroup };
  }

  const legBL = makeBackLeg(-1);
  const legBR = makeBackLeg(1);

  root.position.y = 0.14;
  root.scale.setScalar(0.7);

  const tintMats = [createTintEntry(obsidianMat)];
  root.userData = {
    kind: 'l',
    hips,
    head,
    jaw,
    core,
    glow,
    eyeMat,
    eyeBase: eyeMat.color.clone(),
    eyeHalos,
    haloMat,
    mawMat,
    legFL,
    legFR,
    legBL,
    legBR,
    tailSegs,
    flare: 0,
    shake: 0,
    headYaw: 0,
    tintMats,
    rootScale: 0.7,
    lodObjs: [glow].concat(eyeHalos)
  };
  return root;
}
