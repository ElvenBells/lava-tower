/* ==========================================================================
   3D-модели 9 уникальных боссов для трёх башен (по референсам мудбордов):

   I. ПЕПЕЛЬНАЯ БАШНЯ ('ash'):
      1. Голем Пепельных Врат ('golem') — исполин из обугленной кладки, закованный в цепи,
         с обломками решёток Врат на плечах, круглым магматическим ядром и капающей с кулаков лавой.
      2. Кристальная Матка ('womb') — парящая королева улья с четырьмя когтистыми руками,
         короной, огненным ядром в груди, веером кристаллических крыльев-лепестков и вихревым хвостом.
      3. Лавовый Колосс ('koloss') — титан живой магмы со звездой-сердцевиной Горна в груди,
         дымящимися вулканическими кратерами на плечах и огненными когтями.

   II. ЛЕДЯНАЯ БАШНЯ ('ice'):
      1. Хранитель Забытых Обрядов ('golem') — готический монах-исполин в заиндевевших латах и капюшоне,
         с ледяной аркой-реликварием за спиной, посохом-фонарём и гигантским Колоколом на цепи.
      2. Изувеченная Снежная Пряха ('womb') — ледяная арахнида-банши на 6 острых паучьих лапах,
         с 4 когтистыми руками в оковах, развевающимися ледяными волосами и коконом морозной паутины.
      3. Первозданный Буран ('koloss') — элементаль из парящих ледяных глыб на снежном торнадо,
         с сияющим Замёрзшим Сердцем в груди, маской-черепом и обломками башен в вихре.

   III. БАШНЯ ПУСТОТЫ ('void'):
      1. Архитектор Искажения ('golem') — парящий лич-геометр в маске-черепе и рунных одеяниях,
         с витым посохом и 4 вращающимися голографическими чертежами-скрижалями.
      2. Пожиратель Фаз ('womb') — многоглазая космическая сороконожка со звёздным панцирем,
         6 серповидными богомольими лапами-косами и 2 призрачными теневыми фантомами за спиной.
      3. Вестник Коллапса ('koloss') — живая Чёрная Дыра с аккреционным диском, скованная кольцом
         разрушенных готических башен и цепей, с двумя исполинскими когтистыми руками из звёздной тьмы.
   ========================================================================== */

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

/* ==========================================================================
   СЛОТ 1 ('golem', Этаж 4):
   - ash: Голем Пепельных Врат
   - ice: Хранитель Забытых Обрядов
   - void: Архитектор Искажения
   ========================================================================== */

function createGolemInstance(towerId = 'ash') {
  if (towerId === 'ice') return createIceKeeperInstance();
  if (towerId === 'void') return createVoidArchitectInstance();
  return createAshGolemInstance();
}

/**
 * 1A. ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ (Пепельная башня, этаж 4)
 * Обугленный каменный исполин с коваными цепями, обломками решёток Врат на спине,
 * круглым пылающим ядром в груди и капающей с кулаков магмой.
 */
function createAshGolemInstance() {
  const rockColors = [0x3b3235, 0x483c40, 0x2e2629, 0x524347].map((h) => new THREE.Color(h));
  const ironColor = new THREE.Color(0x1e1a1d);
  const magmaColor = new THREE.Color(0xff6a10);
  const goldCoreColor = new THREE.Color(0xffe066);

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

  function addRockBlock(listName, w, h, d, x, y, z, rx, ry, rz, color) {
    const geo = jitterGeometry(new THREE.BoxGeometry(w, h, d, 2, 2, 2), Math.min(w, h, d) * 0.12);
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0).clone(),
      color: color || pickRockColor()
    });
  }

  function addCharBlock(listName, w, h, d, x, y, z, rx, ry, rz) {
    const geo = jitterGeometry(new THREE.BoxGeometry(w, h, d, 2, 2, 2), Math.min(w, h, d) * 0.12);
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0).clone()
    });
  }

  function addCorePart(listName, geo, x, y, z, rx, ry, rz, sx, sy, sz) {
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone()
    });
  }

  // Таз и пояс из каменных блоков с цепями
  addRockBlock('hips', 1.35, 0.48, 1.0, 0, 0.22, 0);
  addCharBlock('hipsC', 1.48, 0.24, 1.08, 0, 0.4, 0);

  // Могучий бочкообразный торс из растрескавшейся кладки
  addCorePart('coreTorso', new THREE.SphereGeometry(1.08, 16, 14), 0, 1.05, 0, 0, 0, 0, 1.18, 0.98, 0.86);
  // Яркое круглое ядро Горна в центре груди в каменной оправе
  addCorePart('coreTorso', new THREE.SphereGeometry(0.42, 16, 14), 0, 1.12, 0.62, 0, 0, 0, 1, 1, 0.65);
  parts.torso.push({
    geo: new THREE.TorusGeometry(0.46, 0.11, 8, 20),
    matrix: computeTransformMatrix(0, 1.12, 0.68, 0, 0, 0).clone(),
    color: ironColor
  });

  // Грудные и брюшные плиты кладки вокруг ядра
  for (const s of [-1, 1]) {
    addRockBlock('torso', 0.68, 0.72, 0.46, s * 0.62, 1.28, 0.52, 0.05, -s * 0.15, s * 0.06);
    addRockBlock('torso', 0.56, 0.42, 0.38, s * 0.38, 0.58, 0.58);
    addRockBlock('torso', 0.52, 0.34, 0.34, s * 0.34, 0.24, 0.52);
    // Перекрещенные кованые цепи на груди и плечах (по мудборду 1)
    parts.torso.push({
      geo: new THREE.TorusGeometry(0.98, 0.075, 6, 24),
      matrix: computeTransformMatrix(0, 1.12, 0.06, 0.25, s * 0.45, s * 0.62, 1.15, 1.0, 0.82).clone(),
      color: ironColor
    });
  }
  addRockBlock('torso', 1.48, 1.25, 0.68, 0, 1.18, -0.48);
  addCharBlock('torsoC', 1.12, 0.38, 0.82, 0, 1.62, -0.38);

  // Обломки кованых решёток и крестов Пепельных Врат, торчащие из горба и плеч (по мудборду 1)
  for (const s of [-1, 1]) {
    const gx = s * 0.72;
    const gy = 2.05;
    const gz = -0.35;
    const tiltZ = -s * 0.32;
    // Два вертикальных прута решётки + две поперечины
    addRockBlock('torso', 0.09, 1.35, 0.09, gx - s * 0.16, gy, gz, -0.25, 0, tiltZ, ironColor);
    addRockBlock('torso', 0.09, 1.15, 0.09, gx + s * 0.16, gy - 0.08, gz, -0.25, 0, tiltZ, ironColor);
    addRockBlock('torso', 0.62, 0.09, 0.09, gx, gy + 0.22, gz - 0.05, -0.25, 0, tiltZ, ironColor);
    addRockBlock('torso', 0.54, 0.08, 0.09, gx, gy - 0.15, gz + 0.04, -0.25, 0, tiltZ, ironColor);
  }

  // Голова с нахмуренной каменной бровью и решёткой пасти
  addRockBlock('head', 0.64, 0.56, 0.58, 0, 0.22, 0);
  addCharBlock('headC', 0.6, 0.2, 0.52, 0, 0.48, -0.02);
  addRockBlock('head', 0.72, 0.24, 0.4, 0, 0.36, 0.28, -0.22);
  for (const side of [-1, 1]) {
    parts.eyes.push({
      geo: new THREE.SphereGeometry(0.085, 8, 8),
      matrix: computeTransformMatrix(side * 0.17, 0.2, 0.34).clone()
    });
  }
  // Кованые зубья решётки в пасти
  for (let i = 0; i < 5; i++) {
    addRockBlock('head', 0.045, 0.18, 0.05, (i - 2) * 0.1, -0.02, 0.34, 0, 0, 0, ironColor);
  }
  addCharBlock('jawC', 0.52, 0.22, 0.42, 0, -0.12, 0.24);
  addCorePart('coreJaw', new THREE.SphereGeometry(0.2, 10, 8), 0, -0.02, 0.26);

  // Огромные руки, закованные в цепи, с капающей лавой на кулаках
  for (const side of [1, -1]) {
    const rockKey = side > 0 ? 'armR' : 'armL';
    const charKey = rockKey + 'C';
    const coreKey = side > 0 ? 'coreArmR' : 'coreArmL';

    addCharBlock(charKey, 0.98, 0.78, 1.08, 0, 0.2, 0, 0, 0, side * 0.15);
    addRockBlock(rockKey, 0.82, 0.36, 0.9, side * 0.14, 0.52, 0, 0, 0, side * 0.32);
    // Свисающие звенья цепей с наплечников
    for (let c = 0; c < 3; c++) {
      parts[rockKey].push({
        geo: new THREE.TorusGeometry(0.11, 0.032, 5, 10),
        matrix: computeTransformMatrix(side * 0.52, 0.05 - c * 0.16, 0.25, 0, (c % 2) * 1.5, 0).clone(),
        color: ironColor
      });
    }
    addCorePart(coreKey, new THREE.SphereGeometry(0.34, 12, 10), 0, -0.48, 0);
    addRockBlock(rockKey, 0.62, 0.68, 0.62, 0, -0.58, 0);
    addCorePart(coreKey, new THREE.SphereGeometry(0.36, 12, 10), 0, -1.05, 0.05);
    addRockBlock(rockKey, 0.68, 0.86, 0.68, 0, -1.48, 0.1);
    // Цепи вокруг предплечий
    parts[rockKey].push({
      geo: new THREE.TorusGeometry(0.46, 0.055, 6, 16),
      matrix: computeTransformMatrix(0, -1.35, 0.1, Math.PI / 2, 0.15, 0).clone(),
      color: ironColor
    });
    parts[rockKey].push({
      geo: new THREE.TorusGeometry(0.48, 0.055, 6, 16),
      matrix: computeTransformMatrix(0, -1.72, 0.1, Math.PI / 2, -0.15, 0).clone(),
      color: ironColor
    });

    // Гигантские раскалённые кулаки со стекающими струями лавы
    addCharBlock(charKey, 1.08, 1.18, 1.18, 0, -2.42, 0.18);
    addCorePart(coreKey, new THREE.SphereGeometry(0.42, 12, 10), 0, -2.42, 0.38);
    for (let i = 0; i < 4; i++) {
      const kx = (i - 1.5) * 0.26;
      addRockBlock(rockKey, 0.24, 0.3, 0.38, kx, -2.52, 0.76);
      // Капли жидкой лавы, свисающие с костяшек кулака
      addCorePart(
        coreKey,
        new THREE.ConeGeometry(0.08, 0.48 + (i % 2) * 0.2, 5),
        kx,
        -3.12,
        0.55,
        Math.PI,
        0,
        0
      );
    }
  }

  // Массивные ноги-колонны
  for (const side of [1, -1]) {
    const rockKey = side > 0 ? 'legR' : 'legL';
    const charKey = rockKey + 'C';
    const coreKey = side > 0 ? 'coreLegR' : 'coreLegL';

    addRockBlock(rockKey, 0.66, 0.82, 0.72, 0, -0.42, 0);
    addCharBlock(charKey, 0.58, 0.48, 0.24, 0, -0.4, 0.35, 0.1);
    addCorePart(coreKey, new THREE.SphereGeometry(0.34, 12, 10), 0, -0.98, 0.08);
    addCharBlock(charKey, 0.5, 0.44, 0.38, 0, -0.98, 0.38, -0.15);
    addRockBlock(rockKey, 0.62, 0.9, 0.66, 0, -1.62, 0);
    addCharBlock(charKey, 0.72, 0.2, 0.76, 0, -2.05, 0.05);
    addRockBlock(rockKey, 0.92, 0.5, 1.28, 0, -2.42, 0.22);
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }

  const root = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.18,
    flatShading: true
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0x2c2428,
    roughness: 0.85,
    metalness: 0.12,
    flatShading: true,
    emissive: 0xff5a00,
    emissiveIntensity: 1.15,
    emissiveMap: TEXTURES.golemChar
  });
  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.leaperLava });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa20 });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowWarm,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });

  const addM = (geo, mat, parent) => {
    if (!geo) return null;
    const m = new THREE.Mesh(geo, mat);
    parent.add(m);
    return m;
  };

  const hips = new THREE.Group();
  hips.position.y = 2.75;
  root.add(hips);
  addM(merged.hips, rockMat, hips);
  addM(merged.hipsC, charMat, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addM(merged.torso, rockMat, torso);
  addM(merged.torsoC, charMat, torso);
  addM(merged.coreTorso, coreMat, torso);

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, parent, ry, rx) {
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
    mesh.rotation.set(rx || 0, ry || 0, 0);
    mesh.renderOrder = 5;
    parent.add(mesh);
    crackMats.push(mat);
    return mesh;
  }

  addCrackDecal(1.1, 1.0, 0, 1.02, 0.82, torso);

  const head = new THREE.Group();
  head.position.set(0, 1.9, 0.18);
  torso.add(head);
  addM(merged.head, rockMat, head);
  addM(merged.headC, charMat, head);
  head.add(new THREE.Mesh(merged.eyes, eyeMat));

  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.17, 0.2, 0.45);
    halo.scale.setScalar(0.75);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.06, 0.14);
  head.add(jaw);
  addM(merged.jaw, rockMat, jaw);
  addM(merged.jawC, charMat, jaw);
  addM(merged.coreJaw, coreMat, jaw);

  function makeArm(side) {
    const group = new THREE.Group();
    group.position.set(side * 1.48, 1.35, 0);
    torso.add(group);
    const key = side > 0 ? 'armR' : 'armL';
    addM(merged[key], rockMat, group);
    addM(merged[key + 'C'], charMat, group);
    addM(side > 0 ? merged.coreArmR : merged.coreArmL, coreMat, group);
    addCrackDecal(0.85, 0.85, 0, -2.42, 0.88, group);
    return group;
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);

  function makeLeg(side) {
    const group = new THREE.Group();
    group.position.set(side * 0.65, 0, 0);
    hips.add(group);
    const key = side > 0 ? 'legR' : 'legL';
    addM(merged[key], rockMat, group);
    addM(merged[key + 'C'], charMat, group);
    addM(side > 0 ? merged.coreLegR : merged.coreLegL, coreMat, group);
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
      opacity: 0.65
    })
  );
  chestGlow.position.set(0, 1.12, 0.72);
  chestGlow.scale.setScalar(4.8);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'golem',
    towerId: 'ash',
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

/**
 * 1B. ХРАНИТЕЛЬ ЗАБЫТЫХ ОБРЯДОВ (Ледяная башня, этаж 4)
 * Паладин-монах Ордена Инея в заиндевевших доспехах и капюшоне, с готической аркой-реликварием
 * и кадилами за спиной, посохом-трезубцем в правой руке и гигантским Колоколом на цепи в левой руке.
 */
function createIceKeeperInstance() {
  const root = new THREE.Group();

  const armorCol = new THREE.Color(0x88acc8);
  const silverCol = new THREE.Color(0xc8e4f8);
  const clothCol = new THREE.Color(0x162942);
  const darkVoidCol = new THREE.Color(0x040912);
  const iceCol = new THREE.Color(0x98e4ff);

  const armorParts = {
    hips: [],
    torso: [],
    head: [],
    jaw: [],
    armR: [],
    armL: [],
    legR: [],
    legL: [],
    bell: []
  };
  const glowParts = {
    torso: [],
    armR: [],
    bell: []
  };

  const addPart = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    list.push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || armorCol
    });
  };

  // Многослойная рваная монашеская ряса/подол и пояс с цепями
  addPart(armorParts.hips, new THREE.CylinderGeometry(0.95, 1.48, 2.55, 10), 0, -1.05, 0, 0, 0, 0, 1, 1, 0.82, clothCol);
  for (let s = -1; s <= 1; s += 2) {
    // Передние свисающие ленты-столы с ледяной каймой
    addPart(armorParts.hips, new THREE.BoxGeometry(0.32, 2.2, 0.08), s * 0.28, -1.05, 0.82, -0.08, 0, s * 0.04, 1, 1, 1, silverCol);
  }
  addPart(armorParts.hips, new THREE.CylinderGeometry(1.02, 1.05, 0.28, 12), 0, 0.22, 0, 0, 0, 0, 1, 1, 0.85, silverCol);

  // Кираса Ордена Инея с рельефным крестом и наплечниками
  addPart(armorParts.torso, new THREE.CylinderGeometry(1.18, 0.96, 1.55, 10), 0, 0.98, 0, 0, 0, 0, 1.12, 1, 0.82, armorCol);
  addPart(armorParts.torso, new THREE.BoxGeometry(0.22, 1.05, 0.14), 0, 1.02, 0.78, 0, 0, 0, 1, 1, 1, silverCol);
  addPart(armorParts.torso, new THREE.BoxGeometry(0.78, 0.22, 0.14), 0, 1.18, 0.78, 0, 0, 0, 1, 1, 1, silverCol);
  addPart(glowParts.torso, new THREE.OctahedronGeometry(0.26, 0), 0, 1.18, 0.84, 0, 0, 0, 1, 1.3, 0.6, iceCol);

  // Высокая резная готическая арка-реликварий за спиной Хранителя (по мудборду 2!)
  for (const s of [-1, 1]) {
    // Боковые колонны реликвария
    addPart(armorParts.torso, new THREE.CylinderGeometry(0.11, 0.14, 2.55, 6), s * 0.98, 2.15, -0.45, -0.08, 0, 0, 1, 1, 1, silverCol);
    // Остроконечные пинакли сверху колонн
    addPart(armorParts.torso, new THREE.ConeGeometry(0.18, 0.72, 6), s * 0.98, 3.65, -0.52, -0.08, 0, 0, 1, 1, 1, iceCol);
    // Стрельчатый свод арки
    addPart(armorParts.torso, new THREE.BoxGeometry(1.18, 0.2, 0.2), s * 0.46, 3.35, -0.5, 0, 0, -s * 0.48, 1, 1, 1, silverCol);
    // Подвесные кадила на цепях внутри проёмов арки
    addPart(armorParts.torso, new THREE.CylinderGeometry(0.03, 0.03, 0.85, 5), s * 0.56, 2.65, -0.48, 0, 0, 0, 1, 1, 1, armorCol);
    addPart(glowParts.torso, new THREE.OctahedronGeometry(0.22, 0), s * 0.56, 2.15, -0.48, 0, 0, 0, 0.85, 1.4, 0.85, iceCol);
  }
  // Центральный шпиль готической арки
  addPart(armorParts.torso, new THREE.ConeGeometry(0.24, 0.95, 6), 0, 3.95, -0.52, -0.08, 0, 0, 1, 1, 1, iceCol);

  // Глубокий монашеский капюшон с тьмой внутри
  addPart(armorParts.head, new THREE.ConeGeometry(0.58, 1.05, 8), 0, 0.42, -0.04, -0.15, 0, 0, 1.05, 1, 1.12, clothCol);
  addPart(armorParts.head, new THREE.CylinderGeometry(0.46, 0.54, 0.58, 8), 0, 0.16, 0.02, 0, 0, 0, 1, 1, 1, clothCol);
  addPart(armorParts.head, new THREE.SphereGeometry(0.36, 10, 10), 0, 0.18, 0.14, 0, 0, 0, 0.95, 1.05, 0.8, darkVoidCol);
  addPart(armorParts.jaw, new THREE.BoxGeometry(0.36, 0.14, 0.28), 0, -0.08, 0.14, 0, 0, 0, 1, 1, 1, silverCol);

  // Правая рука + высокий ритуальный посох-трезубец с ледяным фонарём
  addPart(armorParts.armR, new THREE.SphereGeometry(0.58, 10, 8), 0.1, 0.18, 0, 0, 0, -0.2, 1.15, 0.85, 1.1, silverCol);
  addPart(armorParts.armR, new THREE.ConeGeometry(0.18, 0.65, 5), 0.45, 0.55, 0, 0, 0, -0.45, 1, 1, 1, iceCol);
  addPart(armorParts.armR, new THREE.CylinderGeometry(0.28, 0.24, 1.15, 8), 0, -0.55, 0, 0, 0, 0, 1, 1, 1, armorCol);
  addPart(armorParts.armR, new THREE.CylinderGeometry(0.32, 0.28, 1.1, 8), 0, -1.55, 0.12, 0.15, 0, 0, 1, 1, 1, silverCol);
  // Древко посоха (проходит сквозь сжатый кулак)
  addPart(armorParts.armR, new THREE.CylinderGeometry(0.075, 0.065, 5.4, 8), 0, -1.1, 0.58, 0.22, 0, 0, 1, 1, 1, silverCol);
  // Навершие посоха — готический фонарь-трезубец со светящимся кристаллом
  addPart(armorParts.armR, new THREE.TorusGeometry(0.42, 0.055, 6, 16), 0, 1.45, 1.15, 0.22, 0, 0, 1, 1.3, 1, silverCol);
  addPart(glowParts.armR, new THREE.OctahedronGeometry(0.32, 0), 0, 1.45, 1.15, 0.22, 0, 0, 0.8, 1.45, 0.8, iceCol);
  for (const s of [-1, 0, 1]) {
    addPart(armorParts.armR, new THREE.ConeGeometry(0.08, 0.65, 5), s * 0.26, 2.08, 1.28, 0.22, 0, -s * 0.2, 1, 1, 1, iceCol);
  }

  // Левая рука (держит цепь гигантского Ритуального Колокола)
  addPart(armorParts.armL, new THREE.SphereGeometry(0.58, 10, 8), -0.1, 0.18, 0, 0, 0, 0.2, 1.15, 0.85, 1.1, silverCol);
  addPart(armorParts.armL, new THREE.ConeGeometry(0.18, 0.65, 5), -0.45, 0.55, 0, 0, 0, 0.45, 1, 1, 1, iceCol);
  addPart(armorParts.armL, new THREE.CylinderGeometry(0.28, 0.24, 1.15, 8), 0, -0.55, 0, 0, 0, 0, 1, 1, 1, armorCol);
  addPart(armorParts.armL, new THREE.CylinderGeometry(0.32, 0.28, 1.1, 8), 0, -1.55, 0.18, 0.25, 0, 0, 1, 1, 1, silverCol);

  // Геометрия гигантского Ритуального Колокола на цепи (в отдельном узле bellPivot для раскачивания!)
  for (let c = 0; c < 4; c++) {
    addPart(armorParts.bell, new THREE.TorusGeometry(0.12, 0.038, 6, 12), 0, -0.18 - c * 0.22, 0, 0, (c % 2) * 1.57, 0, 1, 1.3, 1, armorCol);
  }
  // Корона и купол колокола
  addPart(armorParts.bell, new THREE.CylinderGeometry(0.32, 0.58, 0.45, 12), 0, -1.12, 0, 0, 0, 0, 1, 1, 1, silverCol);
  addPart(armorParts.bell, new THREE.CylinderGeometry(0.58, 0.88, 0.85, 14), 0, -1.72, 0, 0, 0, 0, 1, 1, 1, armorCol);
  // Широкая юбка колокола с рельефными поясами и сосульками
  addPart(armorParts.bell, new THREE.CylinderGeometry(0.88, 1.28, 0.48, 16), 0, -2.32, 0, 0, 0, 0, 1, 1, 1, silverCol);
  addPart(glowParts.bell, new THREE.TorusGeometry(1.12, 0.05, 6, 24), 0, -2.38, 0, Math.PI / 2, 0, 0, 1, 1, 1, iceCol);
  // Язык колокола со светящимся ледяным ядром
  addPart(glowParts.bell, new THREE.SphereGeometry(0.32, 12, 10), 0, -2.58, 0, 0, 0, 0, 1, 1.25, 1, iceCol);
  for (let ic = 0; ic < 6; ic++) {
    const ia = (ic / 6) * TWO_PI;
    addPart(
      glowParts.bell,
      new THREE.ConeGeometry(0.08, 0.45, 4),
      Math.cos(ia) * 1.15,
      -2.68,
      Math.sin(ia) * 1.15,
      Math.PI,
      0,
      0,
      1,
      1,
      1,
      iceCol
    );
  }

  // Латные сапоги под рясой
  for (const side of [1, -1]) {
    const legKey = side > 0 ? 'legR' : 'legL';
    addPart(armorParts[legKey], new THREE.CylinderGeometry(0.34, 0.3, 1.4, 8), 0, -1.4, 0, 0, 0, 0, 1, 1, 1, armorCol);
    addPart(armorParts[legKey], new THREE.BoxGeometry(0.56, 0.36, 0.95), 0, -2.42, 0.18, 0, 0, 0, 1, 1, 1, silverCol);
  }

  const eyeParts = [];
  for (const s of [-1, 1]) {
    eyeParts.push({
      geo: new THREE.SphereGeometry(0.075, 8, 8),
      matrix: computeTransformMatrix(s * 0.14, 0.22, 0.38).clone()
    });
  }
  const eyesGeo = mergeGeometryParts(eyeParts);

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.35,
    metalness: 0.55,
    flatShading: true
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0xd8f6ff,
    vertexColors: true,
    roughness: 0.15,
    metalness: 0.3,
    flatShading: true,
    emissive: 0x38b8ff,
    emissiveIntensity: 1.25
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x90f4ff });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowIce,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.92
  });

  const addM = (list, mat, parent) => {
    if (!list || !list.length) return null;
    const m = new THREE.Mesh(mergeGeometryParts(list), mat);
    parent.add(m);
    return m;
  };

  const hips = new THREE.Group();
  hips.position.y = 2.75;
  root.add(hips);
  addM(armorParts.hips, armorMat, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addM(armorParts.torso, armorMat, torso);
  addM(glowParts.torso, charMat, torso);

  const head = new THREE.Group();
  head.position.set(0, 1.78, 0.14);
  torso.add(head);
  addM(armorParts.head, armorMat, head);
  head.add(new THREE.Mesh(eyesGeo, eyeMat));

  const eyeHalos = [];
  for (const s of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(s * 0.14, 0.22, 0.46);
    halo.scale.setScalar(0.65);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.05, 0.1);
  head.add(jaw);
  addM(armorParts.jaw, armorMat, jaw);

  const armR = new THREE.Group();
  armR.position.set(1.38, 1.38, 0);
  torso.add(armR);
  addM(armorParts.armR, armorMat, armR);
  addM(glowParts.armR, charMat, armR);

  const armL = new THREE.Group();
  armL.position.set(-1.38, 1.38, 0);
  torso.add(armL);
  addM(armorParts.armL, armorMat, armL);

  // Подвес колокола на конце левой руки
  const bellPivot = new THREE.Group();
  bellPivot.position.set(-0.2, -1.95, 0.35);
  armL.add(bellPivot);
  addM(armorParts.bell, armorMat, bellPivot);
  addM(glowParts.bell, charMat, bellPivot);

  const bellGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.7
    })
  );
  bellGlow.position.set(0, -2.2, 0);
  bellGlow.scale.setScalar(3.4);
  bellPivot.add(bellGlow);

  const legR = new THREE.Group();
  legR.position.set(0.55, 0, 0);
  hips.add(legR);
  addM(armorParts.legR, armorMat, legR);

  const legL = new THREE.Group();
  legL.position.set(-0.55, 0, 0);
  hips.add(legL);
  addM(armorParts.legL, armorMat, legL);

  const crackMats = [];
  const crackDecalMat = new THREE.MeshBasicMaterial({
    map: TEXTURES.iceCrack,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    opacity: 0.65
  });
  const crackMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), crackDecalMat);
  crackMesh.position.set(0, 1.15, 0.86);
  torso.add(crackMesh);
  crackMats.push(crackDecalMat);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55
    })
  );
  chestGlow.position.set(0, 1.2, 0.85);
  chestGlow.scale.setScalar(4.2);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'golem',
    towerId: 'ice',
    hips,
    torso,
    head,
    jaw,
    armR,
    armL,
    bellPivot,
    bellGlow,
    legR,
    legL,
    charMat,
    eyeMat,
    eyeBase: eyeMat.color.clone(),
    haloMat,
    eyeHalos,
    crackMats,
    chestGlow,
    tintMats: [createTintEntry(armorMat), createTintEntry(charMat)],
    rootScale: 1,
    lodObjs: eyeHalos.concat([chestGlow, bellGlow])
  };
  return root;
}

/**
 * 1C. АРХИТЕКТОР ИСКАЖЕНИЯ (Башня Пустоты, этаж 4)
 * Парящий лич-геометр в маске-черепе и рунных одеяниях с витым посохом,
 * окружённый вихрем ступеней и 4 вращающимися голографическими чертежами-скрижалями.
 */
function createVoidArchitectInstance() {
  const root = new THREE.Group();

  const robeDark = new THREE.Color(0x160a28);
  const robeTrim = new THREE.Color(0x3a1868);
  const boneCol = new THREE.Color(0xdcd4e6);
  const runeGlow = new THREE.Color(0xd868ff);

  const robeParts = {
    hips: [],
    torso: [],
    head: [],
    jaw: [],
    armR: [],
    armL: [],
    legR: [],
    legL: [],
    stairs: []
  };
  const runeParts = {
    hips: [],
    torso: [],
    armR: [],
    armL: []
  };

  const addPart = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    list.push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || robeDark
    });
  };

  // Спираль парящих разрушенных каменных ступеней у ног Архитектора (по мудборду 3!)
  for (let s = 0; s < 10; s++) {
    const a = (s / 10) * TWO_PI * 1.15;
    const r = 1.35 + (s % 3) * 0.25;
    const y = 0.25 + s * 0.34;
    addPart(
      robeParts.stairs,
      jitterGeometry(new THREE.BoxGeometry(0.95, 0.18, 0.52), 0.04),
      Math.cos(a) * r,
      y,
      Math.sin(a) * r,
      0.08,
      -a,
      0.12,
      1,
      1,
      1,
      robeTrim
    );
  }

  // Парящий рваный подол мантии и длинные рунные ленты-столы
  addPart(robeParts.hips, new THREE.ConeGeometry(1.22, 2.8, 9), 0, -1.1, 0, Math.PI, 0, 0, 1, 1, 0.78, robeDark);
  for (const s of [-1, 1]) {
    addPart(robeParts.hips, new THREE.BoxGeometry(0.32, 2.35, 0.08), s * 0.34, -1.0, 0.68, -0.1, 0, s * 0.06, 1, 1, 1, robeTrim);
    addPart(runeParts.hips, new THREE.BoxGeometry(0.18, 2.15, 0.1), s * 0.34, -1.0, 0.7, -0.1, 0, s * 0.06, 1, 1, 1, runeGlow);
  }
  // Пояс с круглой пряжкой-порталом
  addPart(robeParts.hips, new THREE.CylinderGeometry(0.78, 0.82, 0.26, 12), 0, 0.22, 0, 0, 0, 0, 1, 1, 0.76, robeTrim);
  addPart(runeParts.hips, new THREE.TorusGeometry(0.24, 0.05, 6, 16), 0, 0.22, 0.64, 0, 0, 0, 1, 1, 1, runeGlow);

  // Торс с высоким зубчатым воротником мантии и рунными оплечьями
  addPart(robeParts.torso, new THREE.CylinderGeometry(0.96, 0.74, 1.48, 10), 0, 0.96, 0, 0, 0, 0, 1.08, 1, 0.74, robeDark);
  for (const s of [-1, 1]) {
    addPart(robeParts.torso, new THREE.BoxGeometry(0.26, 1.38, 0.12), s * 0.36, 0.98, 0.56, 0, 0, -s * 0.16, 1, 1, 1, robeTrim);
    addPart(runeParts.torso, new THREE.BoxGeometry(0.14, 1.25, 0.14), s * 0.36, 0.98, 0.57, 0, 0, -s * 0.16, 1, 1, 1, runeGlow);
    // Высокий воротник-крылья вокруг головы
    addPart(robeParts.torso, new THREE.ConeGeometry(0.38, 0.95, 5), s * 0.48, 1.92, -0.18, -0.35, 0, -s * 0.45, 1, 1, 0.5, robeTrim);
  }

  // Бледная костяная маска-череп с геометрическими трещинами и тёмными рогами-дымом
  addPart(robeParts.head, new THREE.SphereGeometry(0.42, 14, 12), 0, 0.26, 0.04, 0, 0, 0, 0.88, 1.12, 0.95, boneCol);
  addPart(robeParts.head, new THREE.CylinderGeometry(0.26, 0.2, 0.34, 8), 0, -0.02, 0.12, 0, 0, 0, 0.9, 1, 0.85, boneCol);
  for (const s of [-1, 1]) {
    // Вихри тёмной материи из висков черепа
    addPart(robeParts.head, new THREE.ConeGeometry(0.12, 0.78, 5), s * 0.44, 0.46, -0.05, -0.4, 0, -s * 0.75, 1, 1, 1, robeDark);
  }
  addPart(robeParts.jaw, new THREE.BoxGeometry(0.28, 0.12, 0.24), 0, -0.12, 0.14, 0, 0, 0, 1, 1, 1, boneCol);

  // Правая рука с витым Посохом Архитектора
  addPart(robeParts.armR, new THREE.ConeGeometry(0.48, 0.75, 6), 0.1, 0.25, 0, 0, 0, -0.45, 1, 1, 0.8, robeTrim);
  addPart(robeParts.armR, new THREE.CylinderGeometry(0.22, 0.34, 1.45, 8), 0, -0.68, 0.08, 0.2, 0, 0, 1, 1, 1, robeDark);
  // Витой посох с полумесяцем и парящим кристаллом
  addPart(robeParts.armR, new THREE.CylinderGeometry(0.06, 0.045, 5.2, 7), 0.08, -0.8, 0.55, 0.22, 0, 0, 1, 1, 1, robeTrim);
  addPart(runeParts.armR, new THREE.TorusGeometry(0.44, 0.055, 6, 18, Math.PI * 1.45), 0.08, 1.75, 1.12, 0.22, 0, 0.8, 1, 1, 1, runeGlow);
  addPart(runeParts.armR, new THREE.OctahedronGeometry(0.28, 0), 0.08, 1.75, 1.12, 0.22, 0.4, 0, 0.8, 1.45, 0.8, runeGlow);

  // Левая рука, колдующая над голографическими чертежами
  addPart(robeParts.armL, new THREE.ConeGeometry(0.48, 0.75, 6), -0.1, 0.25, 0, 0, 0, 0.45, 1, 1, 0.8, robeTrim);
  addPart(robeParts.armL, new THREE.CylinderGeometry(0.22, 0.34, 1.45, 8), 0, -0.68, 0.22, 0.45, 0, 0, 1, 1, 1, robeDark);
  addPart(runeParts.armL, new THREE.OctahedronGeometry(0.26, 1), 0, -1.45, 0.68, 0, 0, 0, 1, 1.25, 1, runeGlow);

  // Скрытые под мантией ноги для совместимости с анимацией
  for (const side of [1, -1]) {
    const legKey = side > 0 ? 'legR' : 'legL';
    addPart(robeParts[legKey], new THREE.CylinderGeometry(0.18, 0.12, 1.6, 6), 0, -1.2, 0, 0, 0, 0, 1, 1, 1, robeDark);
  }

  const eyeParts = [];
  for (const s of [-1, 1]) {
    eyeParts.push({
      geo: new THREE.SphereGeometry(0.085, 8, 8),
      matrix: computeTransformMatrix(s * 0.15, 0.26, 0.38).clone()
    });
  }
  const eyesGeo = mergeGeometryParts(eyeParts);

  const robeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.65,
    metalness: 0.2,
    flatShading: true
  });
  const charMat = new THREE.MeshStandardMaterial({
    color: 0xe8b8ff,
    vertexColors: true,
    roughness: 0.2,
    metalness: 0.3,
    flatShading: true,
    emissive: 0xb838ff,
    emissiveIntensity: 1.45
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe088ff });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowPurple,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.92
  });

  const addM = (list, mat, parent) => {
    if (!list || !list.length) return null;
    const m = new THREE.Mesh(mergeGeometryParts(list), mat);
    parent.add(m);
    return m;
  };

  const stairVortex = new THREE.Group();
  root.add(stairVortex);
  addM(robeParts.stairs, robeMat, stairVortex);

  const hips = new THREE.Group();
  hips.position.y = 2.85;
  root.add(hips);
  addM(robeParts.hips, robeMat, hips);
  addM(runeParts.hips, charMat, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  addM(robeParts.torso, robeMat, torso);
  addM(runeParts.torso, charMat, torso);

  // 4 парящие голографические скрижали-чертежа вокруг Архитектора (по мудборду 3!)
  const hologramGroup = new THREE.Group();
  hologramGroup.position.set(0, 1.05, 0.25);
  torso.add(hologramGroup);

  const blueprintMat = new THREE.MeshBasicMaterial({
    map: TEXTURES.architectBlueprint,
    color: 0xe8a8ff,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const blueprintGeo = new THREE.PlaneGeometry(1.15, 1.45);
  const blueprints = [];
  const bpCoords = [
    [-1.65, 0.55, 0.65, 0.15, 0.42, -0.12],
    [-1.45, -0.65, 0.85, -0.18, 0.52, 0.15],
    [1.65, 0.48, 0.65, 0.12, -0.42, 0.12],
    [1.45, -0.68, 0.85, -0.15, -0.52, -0.15]
  ];
  for (let i = 0; i < 4; i++) {
    const [bx, by, bz, brx, bry, brz] = bpCoords[i];
    const bp = new THREE.Mesh(blueprintGeo, blueprintMat);
    bp.position.set(bx, by, bz);
    bp.rotation.set(brx, bry, brz);
    bp.renderOrder = 6;
    bp.userData = { baseX: bx, baseY: by, baseZ: bz, brx, bry, brz, phase: i * 1.57 };
    hologramGroup.add(bp);
    blueprints.push(bp);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.75, 0.1);
  torso.add(head);
  addM(robeParts.head, robeMat, head);
  head.add(new THREE.Mesh(eyesGeo, eyeMat));

  const eyeHalos = [];
  for (const s of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(s * 0.15, 0.26, 0.45);
    halo.scale.setScalar(0.75);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.04, 0.08);
  head.add(jaw);
  addM(robeParts.jaw, robeMat, jaw);

  const armR = new THREE.Group();
  armR.position.set(1.18, 1.35, 0);
  torso.add(armR);
  addM(robeParts.armR, robeMat, armR);
  addM(runeParts.armR, charMat, armR);

  const armL = new THREE.Group();
  armL.position.set(-1.18, 1.35, 0);
  torso.add(armL);
  addM(robeParts.armL, robeMat, armL);
  addM(runeParts.armL, charMat, armL);

  const legR = new THREE.Group();
  legR.position.set(0.38, 0, 0);
  hips.add(legR);
  addM(robeParts.legR, robeMat, legR);

  const legL = new THREE.Group();
  legL.position.set(-0.38, 0, 0);
  hips.add(legL);
  addM(robeParts.legL, robeMat, legL);

  const crackMats = [blueprintMat];

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowPurple,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.65
    })
  );
  chestGlow.position.set(0, 1.05, 0.65);
  chestGlow.scale.setScalar(4.8);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'golem',
    towerId: 'void',
    hips,
    torso,
    head,
    jaw,
    armR,
    armL,
    legR,
    legL,
    stairVortex,
    hologramGroup,
    blueprints,
    blueprintMat,
    charMat,
    eyeMat,
    eyeBase: eyeMat.color.clone(),
    haloMat,
    eyeHalos,
    crackMats,
    chestGlow,
    tintMats: [createTintEntry(robeMat), createTintEntry(charMat)],
    rootScale: 1,
    lodObjs: eyeHalos.concat([chestGlow], blueprints)
  };
  return root;
}

/* ==========================================================================
   СЛОТ 2 ('womb', Этаж 8):
   - ash: Кристальная Матка
   - ice: Изувеченная Снежная Пряха
   - void: Пожиратель Фаз
   ========================================================================== */

function createWombInstance(towerId = 'ash') {
  if (towerId === 'ice') return createIceWeaverInstance();
  if (towerId === 'void') return createVoidDevourerInstance();
  return createAshWombInstance();
}

/**
 * 2A. КРИСТАЛЬНАЯ МАТКА (Пепельная башня, этаж 8)
 * Величественная парящая королева из тёмного хрусталя с 4 когтистыми руками,
 * кристаллической короной, пылающим золотым ядром в груди, веером из 28 лепестков-крыльев
 * и закрученным вихревым хвостом-коконом снизу (по мудборду 1).
 */
function createAshWombInstance() {
  const root = new THREE.Group();

  const darkObsCol = new THREE.Color(0x281238);
  const violetCrysCol = new THREE.Color(0x8832e0);
  const goldFireCol = new THREE.Color(0xffb830);

  // Скульптурное тело Королевы улья (торс, коронованная голова, 4 руки и спиральный хвост-кокон)
  const queenParts = [];
  const fireVeinParts = [];
  const addQ = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    list.push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || darkObsCol
    });
  };

  // Женский/королевский торс и плечи
  addQ(queenParts, new THREE.CylinderGeometry(0.68, 0.36, 1.15, 8), 0, 0.42, 0.22, 0, 0, 0, 1.15, 1, 0.72, darkObsCol);
  addQ(queenParts, new THREE.CylinderGeometry(0.36, 0.58, 0.65, 8), 0, -0.35, 0.18, 0, 0, 0, 1.05, 1, 0.75, darkObsCol);
  // Огненные золотые прожилки на груди и бёдрах
  for (const s of [-1, 1]) {
    addQ(fireVeinParts, new THREE.ConeGeometry(0.18, 0.95, 4), s * 0.45, 0.55, 0.42, 0.2, 0, -s * 0.48, 1, 1, 0.5, goldFireCol);
    addQ(queenParts, new THREE.ConeGeometry(0.28, 1.15, 4), s * 0.68, 0.95, 0.12, -0.15, 0, -s * 0.65, 1, 1, 0.5, violetCrysCol);
  }

  // Голова с кристаллической короной-цветком и огненным лицом
  addQ(queenParts, new THREE.OctahedronGeometry(0.38, 0), 0, 1.38, 0.26, 0, 0, 0, 0.85, 1.25, 0.85, darkObsCol);
  addQ(fireVeinParts, new THREE.OctahedronGeometry(0.22, 0), 0, 1.36, 0.52, 0, 0, 0, 0.55, 1.15, 0.4, goldFireCol);
  for (let c = -2; c <= 2; c++) {
    const ca = c * 0.38;
    const ch = 0.75 - Math.abs(c) * 0.12;
    addQ(
      queenParts,
      new THREE.ConeGeometry(0.14, ch, 4),
      Math.sin(ca) * 0.42,
      1.82 + Math.cos(ca) * 0.15,
      0.18,
      -0.15,
      0,
      -ca,
      1,
      1,
      0.6,
      c === 0 ? goldFireCol : violetCrysCol
    );
  }

  // 4 изящные когтистые руки (верхняя и нижняя пара)
  for (const s of [-1, 1]) {
    // Верхняя рука
    addQ(queenParts, new THREE.CylinderGeometry(0.12, 0.08, 1.15, 6), s * 1.05, 0.55, 0.35, 0.25, 0, s * 1.15, 1, 1, 1, darkObsCol);
    addQ(queenParts, new THREE.ConeGeometry(0.12, 0.85, 4), s * 1.72, 0.75, 0.62, 0.45, 0, -s * 0.85, 1, 1, 0.6, violetCrysCol);
    // Нижняя рука
    addQ(queenParts, new THREE.CylinderGeometry(0.1, 0.07, 1.05, 6), s * 0.92, 0.02, 0.38, 0.35, 0, s * 1.35, 1, 1, 1, darkObsCol);
    addQ(queenParts, new THREE.ConeGeometry(0.1, 0.75, 4), s * 1.52, -0.18, 0.68, 0.5, 0, -s * 1.65, 1, 1, 0.6, goldFireCol);
  }

  // Закрученный вихревой кокон-хвост в нижней части тела (по мудборду 1!)
  for (let t = 0; t < 10; t++) {
    const ratio = t / 9;
    const ty = -0.65 - ratio * 2.45;
    const tr = (1 - ratio * 0.78) * 0.58;
    const ta = t * 0.75;
    addQ(
      queenParts,
      new THREE.CylinderGeometry(tr * 1.1, tr * 0.82, 0.38, 7),
      Math.sin(ta) * 0.14 * ratio,
      ty,
      0.1 + Math.cos(ta) * 0.12 * ratio,
      0.1 * Math.cos(ta),
      ta,
      0.12 * Math.sin(ta),
      1.1,
      1,
      0.85,
      t % 2 === 0 ? darkObsCol : violetCrysCol
    );
  }

  const queenBodyGeo = mergeGeometryParts(queenParts);
  const queenVeinGeo = mergeGeometryParts(fireVeinParts);

  // 28 симметричных лепестков-крыльев (раскрываются веером как цветок за спиной Матки)
  const shardGeo = new THREE.OctahedronGeometry(1, 0);
  const shards = [];
  const upVec = new THREE.Vector3(0, 1, 0);

  for (let ring = 0; ring < 2; ring++) {
    const count = ring === 0 ? 14 : 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TWO_PI + ring * (Math.PI / count);
      const zTilt = ring === 0 ? -0.18 : -0.42;
      const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), zTilt).normalize();
      const len = ring === 0 ? 1.55 + (i % 2) * 0.35 : 2.15 + (i % 2) * 0.45;
      const baseR = ring === 0 ? 0.95 : 1.25;
      const openR = ring === 0 ? 2.15 : 2.95;
      shards.push({
        dir,
        quat: new THREE.Quaternion().setFromUnitVectors(upVec, dir),
        sx: ring === 0 ? 0.34 : 0.44,
        sy: len,
        sz: 0.18,
        baseR,
        openR,
        ph: i * 0.6 + ring
      });
    }
  }

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x8830e8,
    roughness: 0.16,
    metalness: 0.3,
    flatShading: true,
    emissive: 0x581298,
    emissiveIntensity: 0.65
  });
  const queenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.25,
    metalness: 0.35,
    flatShading: true,
    emissive: 0x380c58,
    emissiveIntensity: 0.55
  });
  const veinMat = new THREE.MeshBasicMaterial({ color: 0xffc845 });
  const swarmMat = new THREE.MeshStandardMaterial({
    color: 0x9842f0,
    roughness: 0.25,
    metalness: 0.2,
    flatShading: true,
    emissive: 0xff5a10,
    emissiveIntensity: 0.65
  });
  const coreMat = new THREE.MeshBasicMaterial({ map: TEXTURES.ogarekCore });
  const coreGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffaa38,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowWarm,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.78
  });
  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0xb068ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: 0xe0a8ff,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true
  });

  const queenMesh = new THREE.Mesh(queenBodyGeo, queenMat);
  const queenVeins = new THREE.Mesh(queenVeinGeo, veinMat);
  root.add(queenMesh, queenVeins);

  // Ромбовидное золотисто-огненное сердце улья в груди
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), coreMat);
  core.position.set(0, 0.48, 0.35);
  core.scale.set(0.85, 1.35, 0.75);
  root.add(core);

  const coreGlow = new THREE.Mesh(new THREE.OctahedronGeometry(0.82, 1), coreGlowMat);
  coreGlow.position.copy(core.position);
  coreGlow.scale.copy(core.scale);
  root.add(coreGlow);

  const halo = new THREE.Sprite(haloMat);
  halo.position.set(0, 0.48, 0.55);
  halo.scale.setScalar(4.8);
  root.add(halo);

  const shell = new THREE.Group();
  root.add(shell);

  const shardIM = new THREE.InstancedMesh(shardGeo, crystalMat, shards.length);
  shardIM.frustumCulled = false;
  shell.add(shardIM);

  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 18), shieldMat);
  shield.renderOrder = 5;
  root.add(shield);

  const shieldWire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), shieldWireMat);
  shieldWire.renderOrder = 6;
  root.add(shieldWire);

  const vulnRings = [];
  const vrMat = new THREE.MeshBasicMaterial({
    color: 0xffc850,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 2; i++) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(i ? 2.15 : 1.78, 0.04, 8, 44),
      vrMat
    );
    ringMesh.rotation.set(Math.PI / 2 + i * 0.6, i * 0.8, 0);
    root.add(ringMesh);
    vulnRings.push(ringMesh);
  }

  const swarmCount = 56;
  const swarm = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.14, 0), swarmMat, swarmCount);
  swarm.frustumCulled = false;
  root.add(swarm);

  const swData = [];
  for (let i = 0; i < swarmCount; i++) {
    swData.push({
      a: Math.random() * TWO_PI,
      r: 3.2 + Math.random() * 2.2,
      sp: (0.35 + Math.random() * 0.6) * (Math.random() < 0.2 ? -1 : 1),
      h: 0.6 + Math.random() * 1.8,
      w: 0.6 + Math.random() * 1.4,
      ph: Math.random() * 7,
      s: 0.55 + Math.random() * 0.85
    });
  }

  root.userData = {
    kind: 'b',
    bkind: 'womb',
    towerId: 'ash',
    queenMesh,
    core,
    coreGlow,
    coreGlowMat,
    halo,
    haloMat,
    shell,
    shardIM,
    shardData: shards,
    shield,
    shieldMat,
    shieldWire,
    shieldWireMat,
    vulnRings,
    vrMat,
    swarm,
    swData,
    crystalMat,
    tintMats: [createTintEntry(crystalMat), createTintEntry(queenMat), createTintEntry(swarmMat)],
    rootScale: 1,
    lodObjs: [swarm, halo]
  };
  return root;
}

/**
 * 2B. ИЗУВЕЧЕННАЯ СНЕЖНАЯ ПРЯХА (Ледяная башня, этаж 8)
 * Жуткая ледяная арахнида-банши: 6 длинных зазубренных паучьих лап, паучье брюшко в цепях,
 * женский торс с 4 когтистыми руками в оковах, развевающиеся ледяные волосы и кокон морозной паутины.
 */
function createIceWeaverInstance() {
  const root = new THREE.Group();

  const paleIce = new THREE.Color(0xc8f0ff);
  const deepIce = new THREE.Color(0x3a78a8);
  const darkChain = new THREE.Color(0x1b2c40);
  const whiteFrost = new THREE.Color(0xffffff);

  const bodyParts = [];
  const hairParts = [];
  const addP = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    list.push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || paleIce
    });
  };

  // Членистоногое паучье брюшко из тёмного льда, закованное в цепи
  addP(bodyParts, new THREE.SphereGeometry(0.95, 14, 12), 0, -0.58, -0.42, -0.35, 0, 0, 0.92, 1.35, 1.15, deepIce);
  for (let c = 0; c < 3; c++) {
    addP(
      bodyParts,
      new THREE.TorusGeometry(0.88 - c * 0.12, 0.055, 6, 18),
      0,
      -0.35 - c * 0.36,
      -0.42,
      Math.PI / 2 - 0.35,
      (c % 2) * 0.25,
      0,
      1,
      1,
      1,
      darkChain
    );
  }
  // Свисающие снизу брюшка сосульки и цепи
  for (let i = -2; i <= 2; i++) {
    addP(bodyParts, new THREE.ConeGeometry(0.1, 0.95, 5), i * 0.24, -1.75, -0.25, Math.PI, 0, 0, 1, 1, 1, whiteFrost);
  }

  // Женский торс банши в ледяном корсете с острыми шипами на плечах
  addP(bodyParts, new THREE.CylinderGeometry(0.58, 0.42, 1.18, 8), 0, 0.55, 0.18, 0.12, 0, 0, 1.05, 1, 0.72, paleIce);
  for (const s of [-1, 1]) {
    addP(bodyParts, new THREE.ConeGeometry(0.18, 0.85, 5), s * 0.65, 1.12, 0.12, 0, 0, -s * 0.68, 1, 1, 1, whiteFrost);
    addP(bodyParts, new THREE.ConeGeometry(0.12, 0.62, 5), s * 0.52, 0.88, 0.22, 0.2, 0, -s * 0.95, 1, 1, 1, whiteFrost);
  }

  // Голова банши и буйная грива взметнувшихся ледяных волос (как на мудборде 2!)
  addP(bodyParts, new THREE.SphereGeometry(0.34, 12, 10), 0, 1.48, 0.26, 0, 0, 0, 0.86, 1.12, 0.9, paleIce);
  for (let h = 0; h < 9; h++) {
    const ha = ((h - 4) / 4) * 0.85;
    const hLen = 1.35 + (h % 2) * 0.45;
    addP(
      hairParts,
      new THREE.ConeGeometry(0.14, hLen, 5),
      Math.sin(ha) * 0.45 + 0.22,
      1.95 + Math.cos(ha) * 0.25,
      -0.12 - (h % 3) * 0.1,
      -0.65,
      0.25,
      -0.55 - ha * 0.45,
      0.85,
      1.15,
      0.45,
      whiteFrost
    );
  }

  // 4 когтистые руки Пряхи с оковами и цепями на запястьях
  for (const s of [-1, 1]) {
    // Верхняя пара рук
    addP(bodyParts, new THREE.CylinderGeometry(0.11, 0.08, 1.15, 6), s * 0.98, 0.82, 0.32, 0.25, 0, s * 1.05, 1, 1, 1, paleIce);
    addP(bodyParts, new THREE.TorusGeometry(0.13, 0.035, 5, 12), s * 1.42, 0.98, 0.48, 0, 0.5, 0, 1, 1, 1, darkChain);
    for (let cl = -1; cl <= 1; cl++) {
      addP(
        hairParts,
        new THREE.ConeGeometry(0.045, 0.65, 4),
        s * 1.72,
        1.08 + cl * 0.14,
        0.65,
        0.35,
        0,
        -s * (1.2 + cl * 0.25),
        1,
        1,
        1,
        whiteFrost
      );
    }
    // Нижняя пара рук
    addP(bodyParts, new THREE.CylinderGeometry(0.09, 0.07, 1.05, 6), s * 0.86, 0.28, 0.35, 0.35, 0, s * 1.38, 1, 1, 1, paleIce);
    addP(bodyParts, new THREE.TorusGeometry(0.12, 0.03, 5, 12), s * 1.28, 0.12, 0.52, 0, 0.5, 0, 1, 1, 1, darkChain);
    for (let cl = -1; cl <= 1; cl++) {
      addP(
        hairParts,
        new THREE.ConeGeometry(0.04, 0.58, 4),
        s * 1.56,
        -0.02 + cl * 0.12,
        0.68,
        0.4,
        0,
        -s * (1.55 + cl * 0.22),
        1,
        1,
        1,
        whiteFrost
      );
    }
  }

  // Геометрия одной длинной трёхсуставчатой паучьей лапы из зазубренного льда
  const legParts = [];
  addP(legParts, new THREE.CylinderGeometry(0.14, 0.1, 1.45, 6), 0.62, 0.38, 0, 0, 0, -1.05, 1, 1, 1, deepIce);
  addP(legParts, new THREE.ConeGeometry(0.12, 0.55, 4), 1.18, 0.85, 0, 0, 0, -0.35, 1, 1, 1, whiteFrost);
  addP(legParts, new THREE.CylinderGeometry(0.11, 0.07, 1.65, 6), 1.58, -0.15, 0, 0, 0, -2.35, 1, 1, 1, paleIce);
  addP(legParts, new THREE.ConeGeometry(0.09, 1.55, 5), 2.02, -1.48, 0, 0, 0, -2.95, 1, 1, 1, whiteFrost);
  const singleSpiderLegGeo = mergeGeometryParts(legParts);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.35,
    flatShading: true,
    emissive: 0x2478b8,
    emissiveIntensity: 0.6
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0xe8fbff,
    vertexColors: true,
    roughness: 0.12,
    metalness: 0.25,
    flatShading: true,
    emissive: 0x60d8ff,
    emissiveIntensity: 0.95
  });

  const weaverBodyMesh = new THREE.Mesh(mergeGeometryParts(bodyParts), crystalMat);
  const weaverHairMesh = new THREE.Mesh(mergeGeometryParts(hairParts), hairMat);
  root.add(weaverBodyMesh, weaverHairMesh);

  // 6 анимируемых паучьих лап (по 3 с каждой стороны)
  const spiderLegs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? 1 : -1;
    const idx = i % 3;
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.55, -0.25 - idx * 0.12, 0.18 - idx * 0.38);
    const legMesh = new THREE.Mesh(singleSpiderLegGeo, crystalMat);
    if (side < 0) legMesh.scale.x = -1;
    legGroup.add(legMesh);
    legGroup.rotation.y = side * (0.45 - idx * 0.45);
    legGroup.userData = { side, idx, baseYaw: legGroup.rotation.y };
    root.add(legGroup);
    spiderLegs.push(legGroup);
  }

  // Ядро стужи в груди/брюшке
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65, 1),
    new THREE.MeshBasicMaterial({ map: TEXTURES.iceCore })
  );
  core.position.set(0, 0.32, 0.28);
  root.add(core);

  const coreGlowMat = new THREE.MeshBasicMaterial({
    color: 0x90ecff,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), coreGlowMat);
  coreGlow.position.copy(core.position);
  root.add(coreGlow);

  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowIce,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.78
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.set(0, 0.4, 0.4);
  halo.scale.setScalar(4.8);
  root.add(halo);

  // Веретёна и нити ледяной паутины вокруг Пряхи
  const shell = new THREE.Group();
  root.add(shell);

  const shardGeo = new THREE.ConeGeometry(0.14, 1.85, 4);
  const shards = [];
  const upVec = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * TWO_PI;
    const y = ((i % 5) - 2) * 0.42;
    const dir = new THREE.Vector3(Math.cos(a), y, Math.sin(a)).normalize();
    shards.push({
      dir,
      quat: new THREE.Quaternion().setFromUnitVectors(upVec, dir),
      sx: 0.65,
      sy: 1.15 + (i % 2) * 0.4,
      sz: 0.65,
      baseR: 1.45,
      openR: 2.95,
      ph: i * 0.5
    });
  }
  const shardIM = new THREE.InstancedMesh(shardGeo, hairMat, shards.length);
  shardIM.frustumCulled = false;
  shell.add(shardIM);

  // Плоскости сверкающей ледяной паутины за спиной Пряхи
  const webPlaneMat = new THREE.MeshBasicMaterial({
    map: TEXTURES.frostWeb,
    color: 0xd8f8ff,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const webBackdrop = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), webPlaneMat);
  webBackdrop.position.set(0, 0.2, -0.55);
  shell.add(webBackdrop);

  const shieldMat = new THREE.MeshBasicMaterial({
    map: TEXTURES.frostWeb,
    color: 0x90e4ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.65, 20, 16), shieldMat);
  shield.renderOrder = 5;
  root.add(shield);

  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: 0xd8f8ff,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true
  });
  const shieldWire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.65, 1), shieldWireMat);
  shieldWire.renderOrder = 6;
  root.add(shieldWire);

  const vulnRings = [];
  const vrMat = new THREE.MeshBasicMaterial({
    color: 0xa8f0ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 2; i++) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(i ? 2.15 : 1.75, 0.035, 8, 44),
      vrMat
    );
    ringMesh.rotation.set(Math.PI / 2 + i * 0.6, i * 0.8, 0);
    root.add(ringMesh);
    vulnRings.push(ringMesh);
  }

  const swarmMat = new THREE.MeshStandardMaterial({
    color: 0xb8ecff,
    roughness: 0.15,
    metalness: 0.3,
    flatShading: true,
    emissive: 0x38a8ff,
    emissiveIntensity: 0.75
  });
  const swarmCount = 52;
  const swarm = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.14, 0), swarmMat, swarmCount);
  swarm.frustumCulled = false;
  root.add(swarm);

  const swData = [];
  for (let i = 0; i < swarmCount; i++) {
    swData.push({
      a: Math.random() * TWO_PI,
      r: 3.3 + Math.random() * 2.1,
      sp: (0.4 + Math.random() * 0.65) * (Math.random() < 0.2 ? -1 : 1),
      h: 0.6 + Math.random() * 1.6,
      w: 0.6 + Math.random() * 1.4,
      ph: Math.random() * 7,
      s: 0.5 + Math.random() * 0.85
    });
  }

  root.userData = {
    kind: 'b',
    bkind: 'womb',
    towerId: 'ice',
    spiderLegs,
    webBackdrop,
    core,
    coreGlow,
    coreGlowMat,
    halo,
    haloMat,
    shell,
    shardIM,
    shardData: shards,
    shield,
    shieldMat,
    shieldWire,
    shieldWireMat,
    vulnRings,
    vrMat,
    swarm,
    swData,
    crystalMat,
    tintMats: [createTintEntry(crystalMat), createTintEntry(hairMat), createTintEntry(swarmMat)],
    rootScale: 1,
    lodObjs: [swarm, halo]
  };
  return root;
}

/**
 * 2C. ПОЖИРАТЕЛЬ ФАЗ (Башня Пустоты, этаж 8)
 * Многоглазая космическая сороконожка-богомол со звёздным панцирем,
 * 6 огромными серповидными лапами-косами и 2 призрачными теневыми фантомами за спиной.
 */
function createVoidDevourerInstance() {
  const root = new THREE.Group();

  const carapaceCol = new THREE.Color(0xffffff);
  const bladeCol = new THREE.Color(0xd868ff);
  const eyeCol = new THREE.Color(0xf5d0ff);

  const bodyParts = [];
  const bladeParts = [];
  const addD = (list, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    list.push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || carapaceCol
    });
  };

  // S-образное сегментированное змеевидное тело Пожирателя (9 сегментов от груди до хвоста)
  for (let seg = 0; seg < 9; seg++) {
    const t = seg / 8;
    const sy = 1.05 - t * 3.15;
    const sx = Math.sin(t * Math.PI * 1.5) * 0.32;
    const sz = Math.cos(t * Math.PI) * 0.28;
    const rad = (1 - t * 0.62) * 0.82;
    addD(
      bodyParts,
      jitterGeometry(new THREE.CylinderGeometry(rad * 0.95, rad * 0.82, 0.48, 8), 0.04),
      sx,
      sy,
      sz,
      0.15 * Math.cos(t * 4),
      0,
      -0.18 * Math.sin(t * 4),
      1.15,
      1,
      0.88,
      carapaceCol
    );
    // Острые спинные и боковые хитиновые шипы на каждом сегменте
    for (const s of [-1, 0, 1]) {
      addD(
        bladeParts,
        new THREE.ConeGeometry(0.11 * (1 - t * 0.5), 0.68 * (1 - t * 0.4), 4),
        sx + s * rad * 0.85,
        sy + 0.1,
        sz - 0.25,
        -0.55,
        0,
        -s * 0.85,
        1,
        1,
        1,
        bladeCol
      );
    }
  }

  // Массивная хищная голова с короной рогов, 7 глазами и жвалами-мандибулами
  addD(bodyParts, new THREE.SphereGeometry(0.68, 12, 10), 0, 1.55, 0.35, 0.2, 0, 0, 1.08, 0.95, 1.15, carapaceCol);
  for (let h = -3; h <= 3; h++) {
    const ha = h * 0.26;
    addD(
      bladeParts,
      new THREE.ConeGeometry(0.1, 0.95 - Math.abs(h) * 0.08, 4),
      Math.sin(ha) * 0.52,
      2.18,
      0.15 - Math.abs(h) * 0.06,
      -0.25,
      0,
      -ha * 0.8,
      1,
      1,
      1,
      bladeCol
    );
  }
  // Зазубренные жвалы и 7 светящихся глаз
  for (const s of [-1, 1]) {
    addD(bladeParts, new THREE.ConeGeometry(0.14, 0.82, 4), s * 0.38, 1.05, 0.72, 2.45, 0, s * 0.38, 0.7, 1, 1.2, bladeCol);
  }
  for (const [ex, ey, ez, er] of [
    [0, 1.68, 0.95, 0.11],
    [-0.22, 1.58, 0.92, 0.09],
    [0.22, 1.58, 0.92, 0.09],
    [-0.38, 1.48, 0.82, 0.075],
    [0.38, 1.48, 0.82, 0.075],
    [-0.16, 1.38, 0.88, 0.07],
    [0.16, 1.38, 0.88, 0.07]
  ]) {
    addD(bladeParts, new THREE.SphereGeometry(er, 8, 8), ex, ey, ez, 0, 0, 0, 1, 1, 1, eyeCol);
  }

  // Геометрия гигантской серповидной лапы-косы богомола
  const scytheGeoParts = [];
  addD(scytheGeoParts, new THREE.CylinderGeometry(0.16, 0.12, 1.25, 6), 0.55, 0.25, 0.15, 0, 0, -1.1, 1, 1, 1, carapaceCol);
  addD(scytheGeoParts, new THREE.CylinderGeometry(0.14, 0.1, 1.35, 6), 1.35, 0.05, 0.32, 0.2, 0, -2.1, 1, 1, 1, carapaceCol);
  // Длинное изогнутое фиолетовое лезвие косы
  addD(scytheGeoParts, new THREE.ConeGeometry(0.24, 2.25, 4), 1.68, -1.18, 0.45, 0.15, 0, 2.85, 0.85, 1, 0.28, bladeCol);
  const singleScytheGeo = mergeGeometryParts(scytheGeoParts);

  // Геометрия призрачного Теневого Фантома за плечом Пожирателя (по мудборду 3!)
  const phantomGeoParts = [];
  addD(phantomGeoParts, new THREE.SphereGeometry(0.48, 10, 8), 0, 0, 0, 0, 0, 0, 0.95, 1.15, 0.85, carapaceCol);
  for (let ph = -2; ph <= 2; ph++) {
    addD(phantomGeoParts, new THREE.ConeGeometry(0.08, 0.65, 4), ph * 0.16, 0.62, 0, -0.2, 0, -ph * 0.25, 1, 1, 1, bladeCol);
  }
  for (const s of [-1, 1]) {
    addD(phantomGeoParts, new THREE.SphereGeometry(0.08, 6, 6), s * 0.18, 0.08, 0.38, 0, 0, 0, 1, 1, 1, eyeCol);
  }
  const phantomGeo = mergeGeometryParts(phantomGeoParts);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: TEXTURES.voidStarSkin,
    roughness: 0.32,
    metalness: 0.35,
    flatShading: true,
    emissive: 0x381068,
    emissiveIntensity: 0.75
  });
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.3,
    flatShading: true,
    emissive: 0xb838ff,
    emissiveIntensity: 1.15
  });
  const phantomMat = new THREE.MeshBasicMaterial({
    color: 0x9838e8,
    vertexColors: true,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const bodyMesh = new THREE.Mesh(mergeGeometryParts(bodyParts), crystalMat);
  const bladesMesh = new THREE.Mesh(mergeGeometryParts(bladeParts), bladeMat);
  root.add(bodyMesh, bladesMesh);

  // 6 серповидных лап-кос (3 пары)
  const scytheArms = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? 1 : -1;
    const row = i % 3;
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.55, 0.95 - row * 0.72, 0.15);
    const armMesh = new THREE.Mesh(singleScytheGeo, bladeMat);
    if (side < 0) armMesh.scale.x = -1;
    armMesh.scale.multiplyScalar(1 - row * 0.12);
    armGroup.add(armMesh);
    armGroup.userData = { side, row };
    root.add(armGroup);
    scytheArms.push(armGroup);
  }

  // 2 призрачных Теневых Фантома за левым и правым плечом (по мудборду 3!)
  const phantoms = [];
  for (const s of [-1, 1]) {
    const phMesh = new THREE.Mesh(phantomGeo, phantomMat);
    phMesh.position.set(s * 1.65, 1.85, -0.55);
    phMesh.rotation.y = -s * 0.35;
    phMesh.userData = { side: s, baseX: s * 1.65, baseY: 1.85, baseZ: -0.55 };
    root.add(phMesh);
    phantoms.push(phMesh);
  }

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.68, 20, 16),
    new THREE.MeshBasicMaterial({ map: TEXTURES.voidCore })
  );
  core.position.set(0, 0.35, 0.32);
  root.add(core);

  const coreGlowMat = new THREE.MeshBasicMaterial({
    color: 0xe088ff,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreGlow = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), coreGlowMat);
  coreGlow.position.copy(core.position);
  root.add(coreGlow);

  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowPurple,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.8
  });
  const halo = new THREE.Sprite(haloMat);
  halo.position.set(0, 0.45, 0.45);
  halo.scale.setScalar(5.0);
  root.add(halo);

  const shell = new THREE.Group();
  root.add(shell);

  const shardGeo = new THREE.OctahedronGeometry(0.85, 0);
  const shards = [];
  const upVec = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * TWO_PI;
    const dir = new THREE.Vector3(Math.cos(a), ((i % 3) - 1) * 0.45, Math.sin(a)).normalize();
    shards.push({
      dir,
      quat: new THREE.Quaternion().setFromUnitVectors(upVec, dir),
      sx: 0.25,
      sy: 1.35,
      sz: 0.25,
      baseR: 1.45,
      openR: 2.85,
      ph: i * 0.6
    });
  }
  const shardIM = new THREE.InstancedMesh(shardGeo, bladeMat, shards.length);
  shardIM.frustumCulled = false;
  shell.add(shardIM);

  const shieldMat = new THREE.MeshBasicMaterial({
    color: 0xb058ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 16), shieldMat);
  shield.renderOrder = 5;
  root.add(shield);

  const shieldWireMat = new THREE.MeshBasicMaterial({
    color: 0xe098ff,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    wireframe: true
  });
  const shieldWire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 1), shieldWireMat);
  shieldWire.renderOrder = 6;
  root.add(shieldWire);

  const vulnRings = [];
  const vrMat = new THREE.MeshBasicMaterial({
    color: 0xe8a8ff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  for (let i = 0; i < 2; i++) {
    const ringMesh = new THREE.Mesh(
      new THREE.TorusGeometry(i ? 2.15 : 1.75, 0.04, 8, 44),
      vrMat
    );
    ringMesh.rotation.set(Math.PI / 2 + i * 0.6, i * 0.8, 0);
    root.add(ringMesh);
    vulnRings.push(ringMesh);
  }

  const swarmMat = new THREE.MeshStandardMaterial({
    color: 0xa848ff,
    roughness: 0.2,
    metalness: 0.2,
    flatShading: true,
    emissive: 0x6818b8,
    emissiveIntensity: 0.75
  });
  const swarmCount = 56;
  const swarm = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.14, 0), swarmMat, swarmCount);
  swarm.frustumCulled = false;
  root.add(swarm);

  const swData = [];
  for (let i = 0; i < swarmCount; i++) {
    swData.push({
      a: Math.random() * TWO_PI,
      r: 3.4 + Math.random() * 2.2,
      sp: (0.4 + Math.random() * 0.65) * (Math.random() < 0.2 ? -1 : 1),
      h: 0.6 + Math.random() * 1.6,
      w: 0.6 + Math.random() * 1.4,
      ph: Math.random() * 7,
      s: 0.5 + Math.random() * 0.9
    });
  }

  root.userData = {
    kind: 'b',
    bkind: 'womb',
    towerId: 'void',
    scytheArms,
    phantoms,
    core,
    coreGlow,
    coreGlowMat,
    halo,
    haloMat,
    shell,
    shardIM,
    shardData: shards,
    shield,
    shieldMat,
    shieldWire,
    shieldWireMat,
    vulnRings,
    vrMat,
    swarm,
    swData,
    crystalMat,
    tintMats: [createTintEntry(crystalMat), createTintEntry(bladeMat), createTintEntry(swarmMat)],
    rootScale: 1,
    lodObjs: [swarm, halo].concat(phantoms)
  };
  return root;
}

/* ==========================================================================
   СЛОТ 3 ('koloss', Этаж 12 — Финальные боссы):
   - ash: Лавовый Колосс
   - ice: Первозданный Буран
   - void: Вестник Коллапса
   ========================================================================== */

function createKolossInstance(towerId = 'ash') {
  if (towerId === 'ice') return createIceBlizzardInstance();
  if (towerId === 'void') return createVoidHeraldInstance();
  return createAshKolossInstance();
}

/**
 * 3A. ЛАВОВЫЙ КОЛОСС (Пепельная башня, этаж 12)
 * Титан живой магмы с яркой четырёхлучевой звездой в груди, дымящимися вулканическими
 * пиками-кратерами на плечах и спине, рогатой головой и огромными огненными когтями.
 */
function createAshKolossInstance() {
  const parts = {
    torso: [],
    crust: [],
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

  const crustCol = new THREE.Color(0x261214);
  const starCol = new THREE.Color(0xfff4b0);

  const addBlob = (listName, r, x, y, z, sx, sy, sz, jitterAmt) => {
    const geo = jitterGeometry(
      new THREE.IcosahedronGeometry(r, 1),
      r * (jitterAmt === undefined ? 0.14 : jitterAmt)
    );
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, 0, 0, 0, sx || 1, sy || 1, sz || 1).clone()
    });
  };
  const addCrust = (listName, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || crustCol
    });
  };

  // Атлетичный рельефный торс и юбка пламени
  addBlob('torso', 1.12, 0, 1.18, 0, 1.55, 1.18, 1.05);
  addBlob('torso', 0.88, 0, 0.3, 0.06, 1.18, 1.0, 0.92);
  addBlob('torso', 0.98, 0, 1.05, -0.5, 1.28, 1.15, 0.78);
  addBlob('skirt', 1.38, 0, -0.45, 0, 1.58, 0.88, 1.45);
  // Языки вздымающегося пламени и базальтовые зубцы у основания
  for (let f = 0; f < 8; f++) {
    const fa = (f / 8) * TWO_PI;
    addBlob('skirt', 0.45, Math.cos(fa) * 1.65, -0.25, Math.sin(fa) * 1.65, 0.7, 2.2, 0.7);
  }

  // 4 огромных вулканических пика-кратера на плечах и спине (по мудборду 1!)
  for (const s of [-1, 1]) {
    addCrust('crust', jitterGeometry(new THREE.ConeGeometry(0.46, 1.85, 6), 0.08), s * 1.08, 2.28, -0.22, -0.25, 0, -s * 0.35, 1, 1, 1, crustCol);
    addCrust('crust', jitterGeometry(new THREE.ConeGeometry(0.36, 1.45, 6), 0.06), s * 0.55, 2.45, -0.52, -0.38, 0, -s * 0.18, 1, 1, 1, crustCol);
    // Нагрудные базальтовые пластины
    addCrust('crust', jitterGeometry(new THREE.BoxGeometry(0.68, 0.48, 0.25), 0.05), s * 0.62, 1.38, 0.85, 0.1, -s * 0.22, s * 0.12, 1, 1, 1, crustCol);
  }

  // Четырёхлучевая ослепительная звезда в центре груди Колосса
  addCrust('mouth', new THREE.OctahedronGeometry(0.45, 0), 0, 1.18, 0.98, 0, 0, 0, 0.45, 1.95, 0.35, starCol);
  addCrust('mouth', new THREE.OctahedronGeometry(0.45, 0), 0, 1.18, 0.98, 0, 0, 0, 1.95, 0.45, 0.35, starCol);

  // Рогатая голова с пылающим зубчатым оскалом
  addBlob('head', 0.62, 0, 0.04, 0, 1.08, 1.12, 1.02);
  for (const side of [-1, 1]) {
    addCrust('head', new THREE.ConeGeometry(0.18, 0.95, 5), side * 0.45, 0.55, -0.08, -0.35, 0, -side * 0.48, 1, 1, 1, crustCol);
    parts.eyes.push({
      geo: new THREE.SphereGeometry(0.17, 12, 10),
      matrix: computeTransformMatrix(side * 0.24, 0.14, 0.46, 0, 0, side * 0.25, 1.2, 0.75, 0.6).clone()
    });
  }
  addBlob('jaw', 0.42, 0, -0.1, 0.16, 1.08, 0.75, 1.0);
  parts.mouth.push({
    geo: new THREE.SphereGeometry(0.28, 10, 8),
    matrix: computeTransformMatrix(0, -0.02, 0.32, 0, 0, 0, 1.25, 0.75, 0.8).clone()
  });

  // Могучие руки с базальтовыми наростами и длинными огненными когтями
  for (const side of [1, -1]) {
    const upperKey = side > 0 ? 'upR' : 'upL';
    const foreKey = side > 0 ? 'foreR' : 'foreL';
    const handKey = side > 0 ? 'handR' : 'handL';

    addBlob(upperKey, 0.65, 0, 0.12, 0, 1.15, 1, 1.12);
    addBlob(upperKey, 0.44, 0, -0.62, 0, 1.05, 1.8, 1.1);
    addBlob(foreKey, 0.38, 0, 0, 0);
    addBlob(foreKey, 0.44, 0, -0.5, 0.06, 1.18, 2.2, 1.18);
    addBlob(foreKey, 0.34, 0, -1.02, 0.1);
    addBlob(handKey, 0.54, 0, -0.18, 0, 1.15, 0.92, 1.18);

    // 4 длинных изогнутых огненных когтя на каждой руке
    for (let i = 0; i < 4; i++) {
      const clawGeo = new THREE.ConeGeometry(0.12, 0.92, 5);
      parts[handKey].push({
        geo: clawGeo,
        matrix: computeTransformMatrix((i - 1.5) * 0.2, -0.68, 0.18, 2.75, 0, 0).clone()
      });
    }
    const thumbClaw = new THREE.ConeGeometry(0.13, 0.78, 5);
    parts[handKey].push({
      geo: thumbClaw,
      matrix: computeTransformMatrix(-side * 0.45, -0.42, 0.2, 2.5, 0, side * 0.5).clone()
    });
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }

  const colGeo = new THREE.CylinderGeometry(1.05, 2.6, KOLOSS_COLUMN_HEIGHT, 14, 5, true);
  colGeo.translate(0, KOLOSS_COLUMN_HEIGHT / 2, 0);
  jitterGeometry(colGeo, 0.2);
  merged.column = colGeo;
  merged.inclusion = jitterGeometry(new THREE.DodecahedronGeometry(1, 0), 0.3);

  const root = new THREE.Group();
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff9a2a,
    roughness: 0.35,
    metalness: 0.08,
    flatShading: true,
    map: TEXTURES.kolBody,
    emissive: 0xff6a00,
    emissiveIntensity: 1.2,
    emissiveMap: TEXTURES.kolBody
  });
  const crustMat = new THREE.MeshStandardMaterial({
    color: 0x261214,
    roughness: 0.88,
    metalness: 0.15,
    flatShading: true,
    emissive: 0x6a1800,
    emissiveIntensity: 0.55
  });
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xff8c20,
    roughness: 0.4,
    metalness: 0.05,
    flatShading: true,
    map: TEXTURES.kolCol,
    emissive: 0xff5500,
    emissiveIntensity: 1.3,
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
    opacity: 0.92
  });
  const incMat = new THREE.MeshStandardMaterial({
    color: 0x2b1b18,
    roughness: 0.9,
    flatShading: true,
    emissive: 0xff2a00,
    emissiveIntensity: 0.4
  });

  const attachLavaMesh = (geo, parent) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, lavaMat);
    parent.add(mesh);
    return mesh;
  };

  const column = new THREE.Mesh(merged.column, columnMat);
  root.add(column);

  const hips = new THREE.Group();
  hips.position.y = KOLOSS_COLUMN_HEIGHT;
  root.add(hips);
  attachLavaMesh(merged.skirt, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  attachLavaMesh(merged.torso, torso);
  if (merged.crust) torso.add(new THREE.Mesh(merged.crust, crustMat));

  const incIM = new THREE.InstancedMesh(merged.inclusion, incMat, 16);
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
  attachLavaMesh(merged.head, head);
  head.add(new THREE.Mesh(merged.eyes, eyeMat));

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
  attachLavaMesh(merged.jaw, jaw);

  const mouth = new THREE.Mesh(merged.mouth, hotMat);
  jaw.add(mouth);

  function makeArm(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 1.58, 1.45, 0);
    torso.add(upperGroup);
    attachLavaMesh(side > 0 ? merged.upR : merged.upL, upperGroup);

    const elbow = new THREE.Group();
    elbow.position.set(0, -1.28, 0);
    upperGroup.add(elbow);
    attachLavaMesh(side > 0 ? merged.foreR : merged.foreL, elbow);

    const hand = new THREE.Group();
    hand.position.set(0, -1.22, 0.14);
    elbow.add(hand);
    attachLavaMesh(side > 0 ? merged.handR : merged.handL, hand);
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

  addCrackDecal(1.7, 1.5, 0, 1.1, 1.04, torso);
  addCrackDecal(1.2, 1.0, 0, 0.3, 0.94, torso);
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
  weakSprite.scale.setScalar(2.6);
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
    flare.scale.setScalar(1.8);
    parentObj.add(flare);
    vents.push({ lx: x, ly: y, lz: z, flare });
  }

  addVent(torso, 1.08, 3.1, -0.22);
  addVent(torso, -1.08, 3.1, -0.22);
  addVent(torso, 0, 2.8, -0.65);
  addVent(armR.g, 0, 0.55, 0);
  addVent(armL.g, 0, 0.55, 0);

  const baseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.45
    })
  );
  baseGlow.position.set(0, 0.6, 0);
  baseGlow.scale.setScalar(7.8);
  root.add(baseGlow);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.65
    })
  );
  chestGlow.position.set(0, 1.18, 0.85);
  chestGlow.scale.setScalar(4.8);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'koloss',
    towerId: 'ash',
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
    tintMats: [createTintEntry(lavaMat), createTintEntry(columnMat), createTintEntry(crustMat)],
    rootScale: 1,
    lodObjs: eyeHalos.concat(
      vents.map((v) => v.flare),
      [weakSprite, baseGlow, chestGlow]
    )
  };
  return root;
}

/**
 * 3B. ПЕРВОЗДАННЫЙ БУРАН (Ледяная башня, этаж 12)
 * Элементаль из парящих ледяных глыб на снежном смерче, с открытым Замёрзшим Сердцем в груди,
 * ледяным черепом-маской, огромными когтистыми руками и обломками каменных башен в вихре.
 */
function createIceBlizzardInstance() {
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

  const glacierBlue = new THREE.Color(0x68b8e8);
  const brightIce = new THREE.Color(0xd8f6ff);
  const darkIce = new THREE.Color(0x245888);

  const addIceBlock = (listName, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    parts[listName].push({
      geo: jitterGeometry(geo, 0.08),
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || glacierBlue
    });
  };

  // Грудная клетка из парящих на расстоянии друг от друга ледяных глыб (с просветом для Замёрзшего Сердца в центре!)
  for (const s of [-1, 1]) {
    addIceBlock('torso', new THREE.DodecahedronGeometry(0.75, 0), s * 0.85, 1.48, 0.42, 0.15, -s * 0.25, s * 0.2, 1.15, 0.92, 0.78, brightIce);
    addIceBlock('torso', new THREE.DodecahedronGeometry(0.55, 0), s * 0.65, 0.68, 0.35, -0.1, 0, -s * 0.15, 1.05, 0.85, 0.75, glacierBlue);
    addIceBlock('torso', new THREE.DodecahedronGeometry(0.45, 0), s * 0.48, 0.05, 0.25, 0, 0, 0, 1, 0.8, 0.7, darkIce);
    // Огромные диагональные ледниковые пики-наросты за плечами (по мудборду 2!)
    addIceBlock('torso', new THREE.ConeGeometry(0.55, 2.35, 5), s * 1.12, 2.35, -0.35, -0.35, 0, -s * 0.48, 1, 1, 0.85, brightIce);
    addIceBlock('torso', new THREE.ConeGeometry(0.42, 1.85, 5), s * 0.55, 2.55, -0.62, -0.45, 0, -s * 0.22, 1, 1, 0.85, glacierBlue);
  }
  addIceBlock('torso', new THREE.DodecahedronGeometry(0.95, 0), 0, 1.25, -0.55, 0, 0, 0, 1.35, 1.25, 0.75, darkIce);

  // Парящие осколки льда у основания торса над смерчем
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    addIceBlock(
      'skirt',
      new THREE.OctahedronGeometry(0.42, 0),
      Math.cos(a) * 1.45,
      -0.35 + (i % 2) * 0.22,
      Math.sin(a) * 1.45,
      0.3,
      a,
      0.4,
      0.9,
      1.3,
      0.9,
      i % 2 ? brightIce : glacierBlue
    );
  }

  // Ледяная маска-череп со светящимися глазницами
  addIceBlock('head', new THREE.DodecahedronGeometry(0.62, 1), 0, 0.12, 0.05, 0, 0, 0, 0.92, 1.18, 0.98, brightIce);
  for (let c = -1; c <= 1; c++) {
    addIceBlock('head', new THREE.ConeGeometry(0.14, 0.68, 5), c * 0.25, 0.72, -0.05, -0.25, 0, -c * 0.3, 1, 1, 1, brightIce);
  }
  for (const side of [-1, 1]) {
    parts.eyes.push({
      geo: new THREE.SphereGeometry(0.15, 10, 8),
      matrix: computeTransformMatrix(side * 0.22, 0.16, 0.48, 0, 0, side * 0.2, 1.15, 0.8, 0.6).clone()
    });
  }
  addIceBlock('jaw', new THREE.BoxGeometry(0.46, 0.26, 0.42), 0, -0.1, 0.16, 0, 0, 0, 1, 1, 1, glacierBlue);
  parts.mouth.push({
    geo: new THREE.SphereGeometry(0.22, 8, 8),
    matrix: computeTransformMatrix(0, -0.02, 0.3, 0, 0, 0, 1.15, 0.7, 0.8).clone()
  });

  // Руки из парящих ледяных глыб с длинными ледяными когтями
  for (const side of [1, -1]) {
    const upperKey = side > 0 ? 'upR' : 'upL';
    const foreKey = side > 0 ? 'foreR' : 'foreL';
    const handKey = side > 0 ? 'handR' : 'handL';

    addIceBlock(upperKey, new THREE.DodecahedronGeometry(0.64, 0), 0, 0.15, 0, 0.2, 0, 0, 1.15, 1.05, 1.1, brightIce);
    addIceBlock(upperKey, new THREE.ConeGeometry(0.24, 0.95, 5), side * 0.38, 0.58, 0, 0, 0, -side * 0.55, 1, 1, 1, brightIce);
    addIceBlock(upperKey, new THREE.DodecahedronGeometry(0.46, 0), 0, -0.62, 0, 0, 0.4, 0, 1.0, 1.65, 1.0, glacierBlue);

    addIceBlock(foreKey, new THREE.DodecahedronGeometry(0.48, 0), 0, -0.52, 0.08, 0.15, 0, 0, 1.18, 2.05, 1.15, brightIce);
    addIceBlock(foreKey, new THREE.ConeGeometry(0.2, 0.85, 5), side * 0.35, -0.45, 0.2, 0.2, 0, -side * 0.45, 1, 1, 1, brightIce);

    addIceBlock(handKey, new THREE.DodecahedronGeometry(0.54, 0), 0, -0.18, 0, 0, 0, 0, 1.15, 0.92, 1.15, glacierBlue);
    for (let i = 0; i < 4; i++) {
      addIceBlock(handKey, new THREE.ConeGeometry(0.11, 0.88, 5), (i - 1.5) * 0.2, -0.68, 0.18, 2.75, 0, 0, 1, 1, 1, brightIce);
    }
    addIceBlock(handKey, new THREE.ConeGeometry(0.12, 0.75, 5), -side * 0.44, -0.4, 0.2, 2.5, 0, side * 0.5, 1, 1, 1, brightIce);
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }

  // Воронкообразный снежный смерч-торнадо вместо ног (узкий снизу, расширяющийся к торсу!)
  const colGeo = new THREE.CylinderGeometry(1.75, 0.55, KOLOSS_COLUMN_HEIGHT, 16, 6, true);
  colGeo.translate(0, KOLOSS_COLUMN_HEIGHT / 2, 0);
  jitterGeometry(colGeo, 0.16);
  merged.column = colGeo;

  // Геометрия обломка каменной башни с зубцами для вращения в вихре Бурана (по мудборду 2!)
  const ruinParts = [];
  const stoneRuinCol = new THREE.Color(0x5a7088);
  ruinParts.push({
    geo: new THREE.CylinderGeometry(0.75, 0.85, 1.6, 8),
    matrix: computeTransformMatrix(0, 0, 0).clone(),
    color: stoneRuinCol
  });
  for (let m = 0; m < 6; m++) {
    const ma = (m / 6) * TWO_PI;
    ruinParts.push({
      geo: new THREE.BoxGeometry(0.28, 0.35, 0.28),
      matrix: computeTransformMatrix(Math.cos(ma) * 0.65, 0.95, Math.sin(ma) * 0.65, 0, -ma, 0).clone(),
      color: brightIce
    });
  }
  merged.inclusion = mergeGeometryParts(ruinParts);

  const root = new THREE.Group();
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.16,
    metalness: 0.35,
    flatShading: true,
    emissive: 0x2488d8,
    emissiveIntensity: 0.85
  });
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xd8f6ff,
    roughness: 0.25,
    metalness: 0.15,
    flatShading: true,
    map: iceLavaTexture,
    emissive: 0x60c8ff,
    emissiveIntensity: 1.35,
    emissiveMap: iceLavaTexture,
    transparent: true,
    opacity: 0.82,
    side: THREE.DoubleSide
  });
  const hotMat = new THREE.MeshBasicMaterial({ map: TEXTURES.iceCore });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe8fbff });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowIce,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.92
  });
  const incMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.45,
    flatShading: true,
    emissive: 0x2878b8,
    emissiveIntensity: 0.45
  });

  const attachIceMesh = (geo, parent) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, lavaMat);
    parent.add(mesh);
    return mesh;
  };

  const column = new THREE.Mesh(merged.column, columnMat);
  root.add(column);

  const hips = new THREE.Group();
  hips.position.y = KOLOSS_COLUMN_HEIGHT;
  root.add(hips);
  attachIceMesh(merged.skirt, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  attachIceMesh(merged.torso, torso);

  // Пульсирующее Замёрзшее Сердце Горна в открытой грудной клетке Бурана (по мудборду 2!)
  const frozenHeartMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 1), hotMat);
  frozenHeartMesh.position.set(0, 1.15, 0.35);
  frozenHeartMesh.scale.set(0.9, 1.25, 0.85);
  torso.add(frozenHeartMesh);

  // Обломки башен и ледяные глыбы, кружащиеся вокруг Бурана
  const incIM = new THREE.InstancedMesh(merged.inclusion, incMat, 16);
  incIM.frustumCulled = false;
  torso.add(incIM);

  const incData = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * TWO_PI;
    const rad = 2.2 + (i % 3) * 0.85;
    incData.push({
      hx: Math.cos(angle) * rad,
      hy: 0.4 + (i % 4) * 0.75,
      hz: Math.sin(angle) * rad,
      hr: 0.55,
      dx: Math.cos(angle),
      dy: 0.2,
      dz: Math.sin(angle),
      rx: Math.random() * 3,
      ry: Math.random() * 3,
      rz: Math.random() * 3,
      base: i % 4 === 0 ? 0.42 : 0.22,
      life: Math.random() * 7,
      max: 6 + Math.random() * 6
    });
  }

  const head = new THREE.Group();
  head.position.set(0, 2.15, 0.14);
  torso.add(head);
  attachIceMesh(merged.head, head);
  head.add(new THREE.Mesh(merged.eyes, eyeMat));

  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.22, 0.16, 0.56);
    halo.scale.setScalar(0.95);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.18, 0.12);
  head.add(jaw);
  attachIceMesh(merged.jaw, jaw);

  const mouth = new THREE.Mesh(merged.mouth, hotMat);
  jaw.add(mouth);

  function makeArm(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 1.62, 1.48, 0);
    torso.add(upperGroup);
    attachIceMesh(side > 0 ? merged.upR : merged.upL, upperGroup);

    const elbow = new THREE.Group();
    elbow.position.set(0, -1.28, 0);
    upperGroup.add(elbow);
    attachIceMesh(side > 0 ? merged.foreR : merged.foreL, elbow);

    const hand = new THREE.Group();
    hand.position.set(0, -1.22, 0.14);
    elbow.add(hand);
    attachIceMesh(side > 0 ? merged.handR : merged.handL, hand);
    return { g: upperGroup, elbow, hand };
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, parent) {
    const mat = new THREE.MeshBasicMaterial({
      map: TEXTURES.iceCrack,
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

  addCrackDecal(1.6, 1.5, 0, 1.15, 0.95, torso);
  addCrackDecal(0.9, 1.1, 0, -0.5, 0.55, armR.elbow);
  addCrackDecal(0.9, 1.1, 0, -0.5, 0.55, armL.elbow);

  const weakSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0
    })
  );
  weakSprite.position.set(0, 1.15, 1.15);
  weakSprite.scale.setScalar(2.8);
  torso.add(weakSprite);

  const vents = [];
  function addVent(parentObj, x, y, z) {
    const flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TEXTURES.glowIce,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0
      })
    );
    flare.position.set(x, y, z);
    flare.scale.setScalar(1.8);
    parentObj.add(flare);
    vents.push({ lx: x, ly: y, lz: z, flare });
  }

  addVent(torso, 1.12, 2.5, -0.35);
  addVent(torso, -1.12, 2.5, -0.35);
  addVent(torso, 0, 2.6, -0.62);
  addVent(armR.g, 0, 0.55, 0);
  addVent(armL.g, 0, 0.55, 0);

  const baseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55
    })
  );
  baseGlow.position.set(0, 0.6, 0);
  baseGlow.scale.setScalar(8.0);
  root.add(baseGlow);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.78
    })
  );
  chestGlow.position.set(0, 1.15, 0.65);
  chestGlow.scale.setScalar(4.8);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'koloss',
    towerId: 'ice',
    column,
    hips,
    torso,
    frozenHeartMesh,
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

/**
 * 3C. ВЕСТНИК КОЛЛАПСА (Башня Пустоты, этаж 12)
 * Живая Чёрная Дыра с фиолетовым аккреционным диском, скованная кольцом каменных глыб,
 * цепей и целых обломков готических башен, с двумя исполинскими руками из звёздной тьмы!
 */
function createVoidHeraldInstance() {
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

  const stoneCol = new THREE.Color(0x28183e);
  const darkTowerCol = new THREE.Color(0x160a26);
  const violetGlow = new THREE.Color(0xd868ff);
  const starHandCol = new THREE.Color(0xffffff);

  const addPart = (listName, geo, x, y, z, rx, ry, rz, sx, sy, sz, col) => {
    parts[listName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0, sx || 1, sy || 1, sz || 1).clone(),
      color: col || stoneCol
    });
  };

  // Разрушенное кольцо каменных глыб, цепей и 2 боковых обломков готических башен вокруг Сингулярности (по мудборду 3!)
  const ringBlockCount = 16;
  for (let i = 0; i < ringBlockCount; i++) {
    const a = (i / ringBlockCount) * TWO_PI;
    const r = 1.68 + (i % 2) * 0.22;
    const bx = Math.cos(a) * r;
    const by = 1.15 + Math.sin(a) * r;
    const bz = ((i % 3) - 1) * 0.25;
    addPart(
      'torso',
      jitterGeometry(new THREE.DodecahedronGeometry(0.46 + (i % 2) * 0.14, 0), 0.08),
      bx,
      by,
      bz,
      a,
      i * 0.5,
      a,
      1.1,
      0.85,
      0.9,
      i % 3 === 0 ? violetGlow : stoneCol
    );
  }
  // 2 огромных наклонных обломка готических башен, торчащих из кольца (слева сверху и справа снизу, как на арте!)
  for (const [tx, ty, tz, rz] of [
    [-1.45, 2.35, -0.25, 0.58],
    [1.35, -0.25, -0.3, -2.45]
  ]) {
    addPart('torso', new THREE.CylinderGeometry(0.58, 0.72, 2.2, 8), tx, ty, tz, -0.2, 0, rz, 1, 1, 1, darkTowerCol);
    // Стрельчатые окна и зубцы башни
    for (let m = 0; m < 6; m++) {
      const ma = (m / 6) * TWO_PI;
      addPart(
        'torso',
        new THREE.BoxGeometry(0.22, 0.35, 0.22),
        tx - Math.sin(rz) * 1.15 + Math.cos(ma) * 0.52,
        ty + Math.cos(rz) * 1.15,
        tz + Math.sin(ma) * 0.52,
        0,
        -ma,
        rz,
        1,
        1,
        1,
        violetGlow
      );
    }
  }
  // Натянутые цепи вокруг кольца обломков
  addPart('torso', new THREE.TorusGeometry(2.05, 0.055, 6, 32), 0, 1.15, 0.15, 0.25, 0.35, 0, 1, 1, 1, darkTowerCol);
  addPart('torso', new THREE.TorusGeometry(2.15, 0.05, 6, 32), 0, 1.15, -0.15, -0.3, -0.35, 0, 1, 1, 1, violetGlow);

  // Нижний вихрь обломков у основания
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    addPart('skirt', jitterGeometry(new THREE.OctahedronGeometry(0.44, 0), 0.06), Math.cos(a) * 1.5, -0.35, Math.sin(a) * 1.5, 0, a, 0.4, 1, 1.4, 1, stoneCol);
  }

  // Верхняя корона-шпиль разрушенной башни (узел head)
  addPart('head', new THREE.CylinderGeometry(0.45, 0.62, 1.25, 8), 0, 0.45, -0.15, -0.15, 0, 0, 1, 1, 1, darkTowerCol);
  addPart('head', new THREE.ConeGeometry(0.55, 1.1, 8), 0, 1.45, -0.25, -0.15, 0, 0, 1, 1, 1, violetGlow);
  for (const side of [-1, 1]) {
    parts.eyes.push({
      geo: new THREE.SphereGeometry(0.14, 10, 8),
      matrix: computeTransformMatrix(side * 0.24, 0.35, 0.38).clone()
    });
  }
  addPart('jaw', new THREE.BoxGeometry(0.38, 0.18, 0.32), 0, -0.05, 0.12, 0, 0, 0, 1, 1, 1, stoneCol);
  parts.mouth.push({
    geo: new THREE.SphereGeometry(0.2, 8, 8),
    matrix: computeTransformMatrix(0, 0, 0.25).clone()
  });

  // Две исполинские когтистые Длани из чистой звёздной тьмы (armR и armL — по мудборду 3!)
  for (const side of [1, -1]) {
    const upperKey = side > 0 ? 'upR' : 'upL';
    const foreKey = side > 0 ? 'foreR' : 'foreL';
    const handKey = side > 0 ? 'handR' : 'handL';

    // Плечевой вихрь и предплечье из звёздной тьмы
    addPart(upperKey, new THREE.CylinderGeometry(0.42, 0.36, 1.25, 8), 0, -0.45, 0, 0, 0, 0, 1, 1, 1, starHandCol);
    addPart(foreKey, new THREE.CylinderGeometry(0.38, 0.48, 1.25, 8), 0, -0.55, 0.08, 0.15, 0, 0, 1.1, 1, 1.1, starHandCol);
    // Огромная ладонь и 5 растопыренных когтистых пальцев со звёздами внутри!
    addPart(handKey, new THREE.BoxGeometry(1.12, 0.85, 0.48), 0, -0.25, 0.12, 0.1, 0, 0, 1, 1, 1, starHandCol);
    for (let f = 0; f < 4; f++) {
      const fx = (f - 1.5) * 0.26;
      const spreadZ = (f - 1.5) * 0.14;
      addPart(handKey, new THREE.CylinderGeometry(0.11, 0.08, 0.65, 6), fx, -0.82, 0.22, 0.35, 0, spreadZ, 1, 1, 1, starHandCol);
      addPart(handKey, new THREE.ConeGeometry(0.11, 0.72, 5), fx + spreadZ * 0.2, -1.32, 0.45, 2.55, 0, -spreadZ, 1, 1, 1, violetGlow);
    }
    // Большой палец с когтем
    addPart(handKey, new THREE.ConeGeometry(0.13, 0.85, 5), -side * 0.68, -0.48, 0.32, 2.35, 0, side * 0.68, 1, 1, 1, violetGlow);
  }

  const merged = {};
  for (const key in parts) {
    merged[key] = parts[key].length ? mergeGeometryParts(parts[key]) : null;
  }

  // Гравитационный столб-воронка под Чёрной Дырой
  const colGeo = new THREE.CylinderGeometry(1.65, 0.48, KOLOSS_COLUMN_HEIGHT, 16, 5, true);
  colGeo.translate(0, KOLOSS_COLUMN_HEIGHT / 2, 0);
  jitterGeometry(colGeo, 0.16);
  merged.column = colGeo;
  merged.inclusion = jitterGeometry(new THREE.OctahedronGeometry(0.85, 0), 0.18);

  const root = new THREE.Group();
  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: TEXTURES.voidStarSkin,
    roughness: 0.35,
    metalness: 0.3,
    flatShading: true,
    emissive: 0x5818a8,
    emissiveIntensity: 0.95
  });
  const columnMat = new THREE.MeshStandardMaterial({
    color: 0xb858ff,
    roughness: 0.35,
    metalness: 0.2,
    flatShading: true,
    map: voidLavaTexture,
    emissive: 0x8824e8,
    emissiveIntensity: 1.4,
    emissiveMap: voidLavaTexture,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide
  });
  const hotMat = new THREE.MeshBasicMaterial({ map: TEXTURES.voidCore });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf5d0ff });
  const haloMat = new THREE.SpriteMaterial({
    map: TEXTURES.glowPurple,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.92
  });
  const incMat = new THREE.MeshStandardMaterial({
    color: 0x261242,
    roughness: 0.6,
    flatShading: true,
    emissive: 0xa838ff,
    emissiveIntensity: 0.75
  });

  const attachVoidMesh = (geo, parent) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, lavaMat);
    parent.add(mesh);
    return mesh;
  };

  const column = new THREE.Mesh(merged.column, columnMat);
  root.add(column);

  const hips = new THREE.Group();
  hips.position.y = KOLOSS_COLUMN_HEIGHT;
  root.add(hips);
  attachVoidMesh(merged.skirt, hips);

  const torso = new THREE.Group();
  hips.add(torso);
  attachVoidMesh(merged.torso, torso);

  // Абсолютно чёрный Горизонт Событий (Чёрная Дыра) и спиральный Аккреционный Диск в центре Вестника!
  const blackHoleSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.92, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0x010004 })
  );
  blackHoleSphere.position.set(0, 1.15, 0.12);
  torso.add(blackHoleSphere);

  const accretionDiscGroup = new THREE.Group();
  accretionDiscGroup.position.set(0, 1.15, 0.15);
  torso.add(accretionDiscGroup);
  for (let r = 0; r < 3; r++) {
    const discRing = new THREE.Mesh(
      new THREE.RingGeometry(0.92 + r * 0.28, 1.28 + r * 0.35, 36),
      new THREE.MeshBasicMaterial({
        color: r === 0 ? 0xffffff : r === 1 ? 0xe088ff : 0x9828ff,
        transparent: true,
        opacity: 0.85 - r * 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    discRing.rotation.z = r * 0.8;
    accretionDiscGroup.add(discRing);
  }

  const incIM = new THREE.InstancedMesh(merged.inclusion, incMat, 16);
  incIM.frustumCulled = false;
  torso.add(incIM);

  const incData = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * TWO_PI;
    const rad = 2.35 + (i % 3) * 0.7;
    incData.push({
      hx: Math.cos(angle) * rad,
      hy: 1.15 + Math.sin(angle) * rad,
      hz: ((i % 3) - 1) * 0.45,
      hr: 0.45,
      dx: Math.cos(angle),
      dy: Math.sin(angle),
      dz: 0.2,
      rx: Math.random() * 3,
      ry: Math.random() * 3,
      rz: Math.random() * 3,
      base: 0.24 + (i % 3) * 0.1,
      life: Math.random() * 7,
      max: 6 + Math.random() * 6
    });
  }

  const head = new THREE.Group();
  head.position.set(0, 2.45, -0.1);
  torso.add(head);
  attachVoidMesh(merged.head, head);
  head.add(new THREE.Mesh(merged.eyes, eyeMat));

  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.24, 0.35, 0.48);
    halo.scale.setScalar(0.95);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.1);
  head.add(jaw);
  attachVoidMesh(merged.jaw, jaw);

  const mouth = new THREE.Mesh(merged.mouth, hotMat);
  jaw.add(mouth);

  function makeArm(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 2.15, 1.55, 0.25);
    torso.add(upperGroup);
    attachVoidMesh(side > 0 ? merged.upR : merged.upL, upperGroup);

    const elbow = new THREE.Group();
    elbow.position.set(0, -1.15, 0);
    upperGroup.add(elbow);
    attachVoidMesh(side > 0 ? merged.foreR : merged.foreL, elbow);

    const hand = new THREE.Group();
    hand.position.set(0, -1.15, 0.14);
    elbow.add(hand);
    attachVoidMesh(side > 0 ? merged.handR : merged.handL, hand);
    return { g: upperGroup, elbow, hand };
  }

  const armR = makeArm(1);
  const armL = makeArm(-1);

  const crackMats = [];
  function addCrackDecal(w, h, x, y, z, parent) {
    const mat = new THREE.MeshBasicMaterial({
      map: TEXTURES.guardCrack,
      color: 0xd868ff,
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

  addCrackDecal(1.8, 1.8, 0, 1.15, 0.85, torso);
  addCrackDecal(0.9, 1.1, 0, -0.5, 0.55, armR.elbow);
  addCrackDecal(0.9, 1.1, 0, -0.5, 0.55, armL.elbow);

  const weakSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowPurple,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0
    })
  );
  weakSprite.position.set(0, 1.15, 1.05);
  weakSprite.scale.setScalar(3.2);
  torso.add(weakSprite);

  const vents = [];
  function addVent(parentObj, x, y, z) {
    const flare = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TEXTURES.glowPurple,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0
      })
    );
    flare.position.set(x, y, z);
    flare.scale.setScalar(1.9);
    parentObj.add(flare);
    vents.push({ lx: x, ly: y, lz: z, flare });
  }

  addVent(torso, -1.45, 2.35, -0.25);
  addVent(torso, 1.35, -0.25, -0.3);
  addVent(torso, 0, 2.4, -0.5);
  addVent(armR.g, 0, 0.25, 0);
  addVent(armL.g, 0, 0.25, 0);

  const baseGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowPurple,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.55
    })
  );
  baseGlow.position.set(0, 0.6, 0);
  baseGlow.scale.setScalar(8.2);
  root.add(baseGlow);

  const chestGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowPurple,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.85
    })
  );
  chestGlow.position.set(0, 1.15, 0.45);
  chestGlow.scale.setScalar(5.5);
  torso.add(chestGlow);

  root.userData = {
    kind: 'b',
    bkind: 'koloss',
    towerId: 'void',
    column,
    hips,
    torso,
    blackHoleSphere,
    accretionDiscGroup,
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
