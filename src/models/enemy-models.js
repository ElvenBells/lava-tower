/* ==========================================================================
   3D-модели обычных мобов всех трёх башен (12 уникальных моделей по мудбордам):
   I. Пепельная башня ('ash'):
      - 's': Огарёк (угольное ядро в расколотой корке с короной живого пламени и зубастой щелью)
      - 'r': Пустотный Шип (многогранная кристаллическая друза тёмного стекла с молниями)
      - 'l': Обсидиановый Прыгун (гончая из вулканического стекла с гривой шипов и огненной пастью)
      - 't': Каменный Страж (базальтово-кирпичный голем с магматическим ядром и углями в суставах)
   II. Ледяная башня ('ice'):
      - 's': Мерзлявка (ледяной осколок с пульсирующим голубым ядром и 4 крыльями-пластинками)
      - 'r': Инеевый Кристалл (шестиугольный кристалл льда с короной острых ледяных игл)
      - 'l': Ледяной Волк (полупрозрачный ледяной хищник с видимым внутри тёмным скелетом и лапами-коньками)
      - 't': Мерзлотный Голем (многослойный ледяной исполин с ярким ядром и сосульками на плечах)
   III. Башня Пустоты ('void'):
      - 's': Теневой Мотылёк (четырёхкрылый мотылёк из тёмной материи с прожилками и усиками)
      - 'r': Фазовый Шип (асимметричный монолит обсидиана с фиолетовыми венами и кольцами искажения)
      - 'l': Пустотный Прыгун (звёздное четвероногое существо с большими белыми глазами и теневыми лентами)
      - 't': Страж Бездны (титан из тёмного камня с чёрной дырой-воронкой в груди и шипами-криками)
   ========================================================================== */

/* ==========================================================================
   1. РОЙ ('s'): Огарёк ('ash') / Мерзлявка ('ice') / Теневой Мотылёк ('void')
   ========================================================================== */

function buildOgarekPrototype(towerId = 'ash') {
  if (towerId === 'ice') {
    // МЕРЗЛЯВКА: ромбовидный осколок льда + ледяной хвостик + 4 крыла-пластинки
    const coreGeo = new THREE.OctahedronGeometry(0.62, 1);
    const shellParts = [];
    const accentParts = [];
    const iceColA = new THREE.Color(0x98dcff);
    const iceColB = new THREE.Color(0xd8f6ff);

    // Гранёное ледяное тельце-оправа вокруг ядра
    shellParts.push({
      geo: new THREE.OctahedronGeometry(0.95, 0),
      matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 0.82, 1.28, 0.78).clone(),
      color: iceColA
    });
    // Нижний острый шип-сосулька
    shellParts.push({
      geo: new THREE.ConeGeometry(0.38, 1.15, 5),
      matrix: computeTransformMatrix(0, -1.1, -0.05, Math.PI + 0.15, 0, 0).clone(),
      color: iceColB
    });
    // Верхний кристаллический гребень
    accentParts.push({
      geo: new THREE.ConeGeometry(0.28, 0.75, 4),
      matrix: computeTransformMatrix(0, 1.12, 0.08, -0.2, Math.PI / 4, 0).clone(),
      color: iceColB
    });
    for (const s of [-1, 1]) {
      accentParts.push({
        geo: new THREE.OctahedronGeometry(0.32, 0),
        matrix: computeTransformMatrix(s * 0.55, 0.1, 0.35, 0, 0, s * 0.4, 0.6, 1.2, 0.6).clone(),
        color: iceColB
      });
    }

    // Геометрия крыла-пластинки (верхнее большое перо + среднее + нижнее малое крылышко)
    const wingPartsL = [];
    const wingPartsR = [];
    for (const s of [-1, 1]) {
      const target = s < 0 ? wingPartsL : wingPartsR;
      // Главная верхняя ледяная пластина крыла
      target.push({
        geo: new THREE.ConeGeometry(0.42, 2.25, 4),
        matrix: computeTransformMatrix(s * 1.05, 0.55, -0.05, 0.12, 0, -s * 1.08, 0.85, 1, 0.22).clone(),
        color: iceColB
      });
      // Второе перо-осколок крыла
      target.push({
        geo: new THREE.ConeGeometry(0.32, 1.65, 4),
        matrix: computeTransformMatrix(s * 0.88, 0.05, -0.08, 0.15, 0, -s * 1.32, 0.8, 1, 0.2).clone(),
        color: iceColA
      });
      // Нижнее малое крылышко
      target.push({
        geo: new THREE.ConeGeometry(0.26, 1.2, 4),
        matrix: computeTransformMatrix(s * 0.62, -0.52, -0.08, 0.18, 0, -s * 1.68, 0.75, 1, 0.18).clone(),
        color: iceColA
      });
    }

    // Светящиеся глазки-кристаллы
    const outerEyeParts = [];
    const innerEyeParts = [];
    const haloPositions = [];
    for (const s of [-1, 1]) {
      outerEyeParts.push({
        geo: new THREE.OctahedronGeometry(0.18, 0),
        matrix: computeTransformMatrix(s * 0.32, 0.22, 0.68, 0, 0, s * 0.3, 1.1, 0.7, 0.6).clone()
      });
      innerEyeParts.push({
        geo: new THREE.OctahedronGeometry(0.11, 0),
        matrix: computeTransformMatrix(s * 0.32, 0.22, 0.74, 0, 0, s * 0.3, 1.0, 0.6, 0.6).clone()
      });
      haloPositions.push(new THREE.Vector3(s * 0.34, 0.22, 0.85));
    }

    return {
      towerId: 'ice',
      coreGeo,
      chunksRockGeo: mergeGeometryParts(shellParts),
      chunksBurgGeo: mergeGeometryParts(accentParts),
      wingGeoL: mergeGeometryParts(wingPartsL),
      wingGeoR: mergeGeometryParts(wingPartsR),
      eyeOuterGeo: mergeGeometryParts(outerEyeParts),
      eyeInnerGeo: mergeGeometryParts(innerEyeParts),
      debrisGeo: new THREE.OctahedronGeometry(0.14, 0),
      haloPositions
    };
  }

  if (towerId === 'void') {
    // ТЕНЕВОЙ МОТЫЛЁК: узкое тёмное тельце со светящимся ядром, усиками и 4 резными крыльями
    const coreGeo = new THREE.SphereGeometry(0.48, 16, 14);
    const bodyParts = [];
    const veinParts = [];
    const darkCol = new THREE.Color(0x16082a);
    const veinCol = new THREE.Color(0xd858ff);

    // Вытянутое сегментированное тельце мотылька и усики
    bodyParts.push({
      geo: new THREE.CylinderGeometry(0.32, 0.18, 1.55, 8),
      matrix: computeTransformMatrix(0, -0.1, 0, 0.25, 0, 0).clone(),
      color: darkCol
    });
    bodyParts.push({
      geo: new THREE.SphereGeometry(0.36, 10, 8),
      matrix: computeTransformMatrix(0, 0.68, 0.18).clone(),
      color: darkCol
    });
    for (const s of [-1, 1]) {
      veinParts.push({
        geo: new THREE.ConeGeometry(0.06, 0.95, 5),
        matrix: computeTransformMatrix(s * 0.28, 1.18, 0.32, -0.35, 0, -s * 0.48).clone(),
        color: veinCol
      });
    }

    // Крылья мотылька (большая верхняя лопасть + резная нижняя лопасть + светящиеся прожилки)
    const wingPartsL = [];
    const wingPartsR = [];
    for (const s of [-1, 1]) {
      const target = s < 0 ? wingPartsL : wingPartsR;
      // Верхнее крыло
      target.push({
        geo: new THREE.ConeGeometry(0.68, 2.35, 5),
        matrix: computeTransformMatrix(s * 1.12, 0.55, -0.05, 0.15, 0, -s * 1.12, 1.0, 1.0, 0.12).clone(),
        color: darkCol
      });
      // Светящаяся пурпурная жила верхнего крыла
      target.push({
        geo: new THREE.ConeGeometry(0.28, 2.15, 4),
        matrix: computeTransformMatrix(s * 1.08, 0.58, 0.02, 0.15, 0, -s * 1.12, 0.65, 1.0, 0.16).clone(),
        color: veinCol
      });
      // Нижнее крыло с острым шлейфом
      target.push({
        geo: new THREE.ConeGeometry(0.48, 1.75, 5),
        matrix: computeTransformMatrix(s * 0.82, -0.48, -0.1, 0.22, 0, -s * 1.72, 0.9, 1.0, 0.12).clone(),
        color: darkCol
      });
      target.push({
        geo: new THREE.ConeGeometry(0.18, 1.55, 4),
        matrix: computeTransformMatrix(s * 0.78, -0.46, -0.04, 0.22, 0, -s * 1.72, 0.6, 1.0, 0.16).clone(),
        color: veinCol
      });
    }

    const outerEyeParts = [];
    const innerEyeParts = [];
    const haloPositions = [];
    for (const s of [-1, 1]) {
      outerEyeParts.push({
        geo: new THREE.SphereGeometry(0.15, 8, 8),
        matrix: computeTransformMatrix(s * 0.22, 0.72, 0.46).clone()
      });
      innerEyeParts.push({
        geo: new THREE.SphereGeometry(0.09, 8, 8),
        matrix: computeTransformMatrix(s * 0.22, 0.72, 0.52).clone()
      });
      haloPositions.push(new THREE.Vector3(s * 0.24, 0.72, 0.62));
    }

    return {
      towerId: 'void',
      coreGeo,
      chunksRockGeo: mergeGeometryParts(bodyParts),
      chunksBurgGeo: mergeGeometryParts(veinParts),
      wingGeoL: mergeGeometryParts(wingPartsL),
      wingGeoR: mergeGeometryParts(wingPartsR),
      eyeOuterGeo: mergeGeometryParts(outerEyeParts),
      eyeInnerGeo: mergeGeometryParts(innerEyeParts),
      debrisGeo: new THREE.OctahedronGeometry(0.12, 0),
      haloPositions
    };
  }

  // ПЕПЕЛЬНАЯ БАШНЯ — ОГАРЁК: угольно-пепельный шар с раскалёнными щелями, зубастой ухмылкой и короной пламени
  const coreGeo = new THREE.SphereGeometry(0.94, 24, 24);
  const rockColors = [0x2a2428, 0x382e32, 0x463a3e, 0x1e181b].map((hex) => new THREE.Color(hex));
  const burgundyColors = [0x7a1a22, 0x9c2824, 0xb83818].map((hex) => new THREE.Color(hex));
  const rockParts = [];
  const burgundyParts = [];

  const chunkCount = 84;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < chunkCount; i++) {
    const y = 1 - (i / (chunkCount - 1)) * 2;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;

    const dir = new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY)
      .add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.24,
          (Math.random() - 0.5) * 0.24,
          (Math.random() - 0.5) * 0.24
        )
      )
      .normalize();

    // Оставляем просвет спереди для злых глаз и огненной пасти
    if (dir.z > 0.65 && dir.y > -0.35 && dir.y < 0.45) continue;

    const chunkSize = 0.18 + Math.random() * 0.2;
    const geo = jitterGeometry(new THREE.DodecahedronGeometry(chunkSize, 0), chunkSize * 0.48);
    const baseRadius = 0.96 + chunkSize * 0.38;

    _tempTransformObj.position.copy(dir).multiplyScalar(baseRadius);
    _tempTransformObj.scale.set(1, 1, 0.58);
    _tempTransformObj.up.set(0, 1, 0);
    _tempTransformObj.lookAt(dir.clone().multiplyScalar(baseRadius * 3));
    _tempTransformObj.rotateZ(Math.random() * Math.PI);
    _tempTransformObj.updateMatrix();

    const mat4 = _tempTransformObj.matrix.clone();
    if (Math.random() < 0.24) {
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

  // Огненный хохолок/корона пламени на макушке Огарька (по референсу мудборда 1)
  const flameParts = [];
  const flameColOuter = new THREE.Color(0xff5a10);
  const flameColInner = new THREE.Color(0xffd040);
  for (let f = 0; f < 7; f++) {
    const a = (f / 7) * TWO_PI;
    const r = f === 0 ? 0 : 0.34;
    const h = f === 0 ? 0.95 : 0.65 + (f % 2) * 0.22;
    flameParts.push({
      geo: jitterGeometry(new THREE.ConeGeometry(0.24, h, 5), 0.06),
      matrix: computeTransformMatrix(
        Math.cos(a) * r,
        1.05 + h * 0.35,
        Math.sin(a) * r - 0.1,
        -0.25,
        0,
        -Math.cos(a) * 0.25
      ).clone(),
      color: f % 2 === 0 ? flameColInner : flameColOuter
    });
  }

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
    const dir = new THREE.Vector3(sign * 0.44, 0.28, 0.86).normalize();
    const eyeGroup = new THREE.Group();
    eyeGroup.position.copy(dir).multiplyScalar(1.06);
    eyeGroup.lookAt(dir.clone().multiplyScalar(4));
    eyeGroup.rotateZ(-sign * 0.36);
    eyeGroup.scale.setScalar(1.32);

    const innerObj = new THREE.Object3D();
    innerObj.scale.setScalar(0.55);
    innerObj.position.z = 0.12;
    eyeGroup.add(innerObj);
    eyeGroup.updateMatrixWorld(true);

    outerEyeParts.push({ geo: outerEyeBase.clone(), matrix: eyeGroup.matrixWorld.clone() });
    innerEyeParts.push({ geo: innerEyeBase.clone(), matrix: innerObj.matrixWorld.clone() });
    haloPositions.push(new THREE.Vector3().copy(dir).multiplyScalar(1.28));
  }

  // Зубастая раскалённая пасть-щель под глазами
  for (let m = -2; m <= 2; m++) {
    outerEyeParts.push({
      geo: new THREE.BoxGeometry(0.16, 0.12 + (m % 2 === 0 ? 0.06 : 0), 0.12),
      matrix: computeTransformMatrix(
        m * 0.16,
        -0.18 + Math.abs(m) * 0.04,
        0.96 - Math.abs(m) * 0.06,
        0,
        m * 0.18,
        0
      ).clone()
    });
  }

  return {
    towerId: 'ash',
    coreGeo,
    chunksRockGeo: mergeGeometryParts(rockParts),
    chunksBurgGeo: mergeGeometryParts(burgundyParts),
    flameCrownGeo: mergeGeometryParts(flameParts),
    eyeOuterGeo: mergeGeometryParts(outerEyeParts),
    eyeInnerGeo: mergeGeometryParts(innerEyeParts),
    debrisGeo: jitterGeometry(new THREE.DodecahedronGeometry(0.13, 0), 0.06),
    haloPositions
  };
}

function createOgarekInstance(prototype) {
  const towerId = prototype.towerId || 'ash';
  const group = new THREE.Group();

  const coreTex =
    towerId === 'ice'
      ? TEXTURES.iceCore
      : towerId === 'void'
        ? TEXTURES.voidCore
        : TEXTURES.ogarekCore;
  const coreMat = new THREE.MeshBasicMaterial({ map: coreTex });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  group.add(core);

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: towerId === 'ice' ? 0.15 : 0.88,
    metalness: towerId === 'ice' ? 0.35 : 0.1,
    transparent: towerId === 'ice',
    opacity: towerId === 'ice' ? 0.82 : 1.0,
    flatShading: true
  });
  const chunks = new THREE.Mesh(prototype.chunksRockGeo, rockMat);
  group.add(chunks);

  const burgMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: towerId === 'ice' ? 0.12 : 0.65,
    metalness: 0.2,
    flatShading: true,
    emissive: towerId === 'ice' ? 0x38a8ff : towerId === 'void' ? 0xb838ff : 0xff4810,
    emissiveIntensity: towerId === 'ash' ? 0.65 : 1.15
  });
  const burg = new THREE.Mesh(prototype.chunksBurgGeo, burgMat);
  group.add(burg);

  // Крылья (для Мерзлявки и Теневого Мотылька) или огненный хохолок (для Огарька)
  let wingL = null;
  let wingR = null;
  let flameCrown = null;
  if (prototype.wingGeoL && prototype.wingGeoR) {
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.25,
      flatShading: true,
      transparent: true,
      opacity: towerId === 'ice' ? 0.78 : 0.88,
      emissive: towerId === 'ice' ? 0x48b8ff : 0x9828e8,
      emissiveIntensity: 0.85,
      side: THREE.DoubleSide
    });
    wingL = new THREE.Mesh(prototype.wingGeoL, wingMat);
    wingR = new THREE.Mesh(prototype.wingGeoR, wingMat);
    group.add(wingL, wingR);
  } else if (prototype.flameCrownGeo) {
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true
    });
    flameCrown = new THREE.Mesh(prototype.flameCrownGeo, flameMat);
    group.add(flameCrown);
  }

  const eyeOuterHex = towerId === 'ice' ? 0x70e4ff : towerId === 'void' ? 0xd868ff : 0xffb820;
  const eyeInnerHex = towerId === 'ice' ? 0xffffff : towerId === 'void' ? 0xf8e0ff : 0xfff8d0;
  const eyeMatO = new THREE.MeshBasicMaterial({ color: eyeOuterHex });
  const eyeMatI = new THREE.MeshBasicMaterial({ color: eyeInnerHex });
  group.add(new THREE.Mesh(prototype.eyeOuterGeo, eyeMatO));
  group.add(new THREE.Mesh(prototype.eyeInnerGeo, eyeMatI));

  const haloTex =
    towerId === 'ice'
      ? TEXTURES.glowIce
      : towerId === 'void'
        ? TEXTURES.glowPurple
        : TEXTURES.glowWarm;
  const haloMat = new THREE.SpriteMaterial({
    map: haloTex,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  });
  const halos = [];
  for (const haloPos of prototype.haloPositions) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(haloPos);
    halo.scale.setScalar(1.65);
    group.add(halo);
    halos.push(halo);
  }

  const debrisMatA = new THREE.MeshStandardMaterial({
    color: towerId === 'ice' ? 0xa8e8ff : towerId === 'void' ? 0x8a38d8 : 0x3d3d44,
    emissive: towerId === 'ice' ? 0x2088cc : towerId === 'void' ? 0x581898 : 0x3a1005,
    emissiveIntensity: 0.6,
    roughness: 0.5,
    flatShading: true
  });
  const debris = [];
  for (let i = 0; i < 5; i++) {
    const piece = new THREE.Mesh(prototype.debrisGeo, debrisMatA);
    piece.userData = {
      angle: Math.random() * Math.PI * 2,
      radius: 1.7 + Math.random() * 0.7,
      height: 0.6 + Math.random() * 1.1,
      speed: 0.4 + Math.random() * 0.5
    };
    piece.scale.setScalar(0.7 + Math.random() * 0.6);
    group.add(piece);
    debris.push(piece);
  }

  group.scale.setScalar(0.45);

  const tintMats = [
    createTintEntry(rockMat),
    createTintEntry(burgMat),
    createTintEntry(debrisMatA)
  ];

  group.userData = {
    kind: 's',
    towerId,
    core,
    chunks,
    burg,
    wingL,
    wingR,
    flameCrown,
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

/* ==========================================================================
   2. СТРЕЛОК ('r'): Пустотный Шип ('ash') / Инеевый Кристалл ('ice') / Фазовый Шип ('void')
   ========================================================================== */

function buildShypPrototype(towerId = 'ash') {
  if (towerId === 'ice') {
    // ИНЕЕВЫЙ КРИСТАЛЛ: шестиугольная ледяная призма с пирамидальными вершинами и короной ледяных игл
    const crystalParts = [];
    const colMain = new THREE.Color(0xb8ecff);
    const colTip = new THREE.Color(0xffffff);

    // Центральный шестиугольный столб льда + верхняя и нижняя шестигранные пирамиды
    crystalParts.push({
      geo: new THREE.CylinderGeometry(0.68, 0.68, 1.35, 6),
      matrix: computeTransformMatrix(0, 0, 0).clone(),
      color: colMain
    });
    crystalParts.push({
      geo: new THREE.ConeGeometry(0.68, 0.95, 6),
      matrix: computeTransformMatrix(0, 1.15, 0).clone(),
      color: colTip
    });
    crystalParts.push({
      geo: new THREE.ConeGeometry(0.68, 1.15, 6),
      matrix: computeTransformMatrix(0, -1.25, 0, Math.PI, 0, 0).clone(),
      color: colTip
    });

    // 6 длинных острых ледяных игл, торчащих из граней кристалла
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TWO_PI;
      const tilt = i % 2 === 0 ? 1.15 : 1.75;
      crystalParts.push({
        geo: new THREE.ConeGeometry(0.16, 1.25, 5),
        matrix: computeTransformMatrix(
          Math.cos(a) * 0.72,
          i % 2 === 0 ? 0.25 : -0.28,
          Math.sin(a) * 0.72,
          0,
          -a,
          -tilt
        ).clone(),
        color: colTip
      });
    }

    const shellGeo = mergeGeometryParts(crystalParts);
    const edgesGeo = new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.7, 0.7, 1.4, 6));
    const coreGeo = new THREE.OctahedronGeometry(0.38, 1);
    const shardGeo = new THREE.ConeGeometry(0.12, 0.55, 5);
    return { towerId: 'ice', shellGeo, edgesGeo, coreGeo, shardGeo };
  }

  if (towerId === 'void') {
    // ФАЗОВЫЙ ШИП: асимметричный осколок чёрно-фиолетового обсидиана в кольцах искажения
    const parts = [];
    const darkObs = new THREE.Color(0x280a48);
    const brightVein = new THREE.Color(0xd868ff);

    parts.push({
      geo: jitterGeometry(new THREE.OctahedronGeometry(0.95, 0), 0.14),
      matrix: computeTransformMatrix(0, 0, 0, 0.12, 0.3, -0.08, 0.72, 1.65, 0.68).clone(),
      color: darkObs
    });
    // Сросшиеся боковые фазовые лезвия
    for (const s of [-1, 1]) {
      parts.push({
        geo: new THREE.OctahedronGeometry(0.55, 0),
        matrix: computeTransformMatrix(
          s * 0.42,
          s * 0.22,
          0.12,
          0.2,
          0,
          s * 0.45,
          0.45,
          1.45,
          0.45
        ).clone(),
        color: brightVein
      });
    }
    const shellGeo = mergeGeometryParts(parts);
    const edgesGeo = new THREE.EdgesGeometry(shellGeo);
    const coreGeo = new THREE.SphereGeometry(0.34, 20, 16);
    const shardGeo = new THREE.OctahedronGeometry(0.18, 0);
    const ringGeo = new THREE.TorusGeometry(1.18, 0.032, 6, 36);
    return { towerId: 'void', shellGeo, edgesGeo, coreGeo, shardGeo, ringGeo };
  }

  // ПЕПЕЛЬНАЯ БАШНЯ — ПУСТОТНЫЙ ШИП: гранёная друза тёмного стекла с боковыми зубцами
  const parts = [];
  const mainCol = new THREE.Color(0x8838e8);
  const subCol = new THREE.Color(0xc478ff);
  parts.push({
    geo: new THREE.OctahedronGeometry(1, 0),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 0.76, 1.58, 0.76).clone(),
    color: mainCol
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + 0.4;
    parts.push({
      geo: new THREE.OctahedronGeometry(0.42, 0),
      matrix: computeTransformMatrix(
        Math.cos(a) * 0.48,
        (i % 2 ? 0.25 : -0.25),
        Math.sin(a) * 0.48,
        0,
        -a,
        -0.45,
        0.55,
        1.35,
        0.55
      ).clone(),
      color: subCol
    });
  }
  const shellGeo = mergeGeometryParts(parts);
  const edgesGeo = new THREE.EdgesGeometry(shellGeo);
  const coreGeo = new THREE.SphereGeometry(0.32, 20, 20);
  const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
  return { towerId: 'ash', shellGeo, edgesGeo, coreGeo, shardGeo };
}

function createShypInstance(prototype) {
  const towerId = prototype.towerId || 'ash';
  const group = new THREE.Group();

  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: towerId === 'ice' ? 0.08 : 0.15,
    metalness: towerId === 'ice' ? 0.35 : 0.25,
    flatShading: true,
    transparent: true,
    opacity: towerId === 'ice' ? 0.68 : 0.56,
    emissive: towerId === 'ice' ? 0x2898e8 : towerId === 'void' ? 0x581498 : 0x3a0a6a,
    emissiveIntensity: 0.65,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const shell = new THREE.Mesh(prototype.shellGeo, shellMat);
  shell.renderOrder = 5;
  group.add(shell);

  const edgesMat = new THREE.LineBasicMaterial({
    color: towerId === 'ice' ? 0xe0f8ff : 0xd098ff,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const edges = new THREE.LineSegments(prototype.edgesGeo, edgesMat);
  edges.renderOrder = 6;
  group.add(edges);

  const coreMat = new THREE.MeshBasicMaterial({
    map: towerId === 'ice' ? TEXTURES.iceCore : TEXTURES.voidCore
  });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  core.renderOrder = 3;
  group.add(core);

  const glow = createGlowSprite(
    towerId === 'ice' ? TEXTURES.glowIce : TEXTURES.glowPurple,
    3.1
  );
  glow.renderOrder = 2;
  group.add(glow);

  // Кольца фазового искажения для Фазового Шипа
  const phaseRings = [];
  if (prototype.ringGeo) {
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc868ff,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    for (let r = 0; r < 2; r++) {
      const rm = new THREE.Mesh(prototype.ringGeo, ringMat);
      rm.rotation.set(0.8 + r * 0.9, r * 1.1, 0);
      group.add(rm);
      phaseRings.push(rm);
    }
  }

  const stormParticleCount = 120;
  const stGeo = new THREE.BufferGeometry();
  const stPos = new Float32Array(stormParticleCount * 3);
  const stCol = new Float32Array(stormParticleCount * 3);
  const stData = [];

  for (let i = 0; i < stormParticleCount; i++) {
    const hueBase = towerId === 'ice' ? 0.54 : 0.76;
    stData.push({
      radius: 0.12 + Math.random() * 0.48,
      theta: Math.random() * Math.PI * 2,
      y: (Math.random() - 0.5) * 1.6,
      swirlSpeed: (1.6 + Math.random() * 2.6) * (Math.random() < 0.18 ? -1 : 1),
      freqY: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      color:
        Math.random() < 0.18
          ? new THREE.Color(1, 1, 1)
          : new THREE.Color().setHSL(hueBase + Math.random() * 0.08, 1, 0.6 + Math.random() * 0.3)
    });
  }

  stGeo.setAttribute('position', new THREE.BufferAttribute(stPos, 3));
  stGeo.setAttribute('color', new THREE.BufferAttribute(stCol, 3));
  const storm = new THREE.Points(
    stGeo,
    new THREE.PointsMaterial({
      size: 0.065,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  storm.renderOrder = 4;
  group.add(storm);

  const shardMat = new THREE.MeshStandardMaterial({
    color: towerId === 'ice' ? 0x90dcff : 0x6a24b8,
    roughness: 0.2,
    metalness: 0.25,
    flatShading: true,
    emissive: towerId === 'ice' ? 0x2078c0 : 0x280858,
    emissiveIntensity: 0.65
  });
  const shards = [];
  for (let i = 0; i < 5; i++) {
    const shard = new THREE.Mesh(prototype.shardGeo, shardMat);
    shard.scale.setScalar(0.75 + Math.random() * 0.6);
    shard.userData = {
      angle: (i / 5) * TWO_PI,
      radius: 1.65 + Math.random() * 0.55,
      speed: 0.45 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2
    };
    group.add(shard);
    shards.push(shard);
  }

  const tintMats = [createTintEntry(shellMat), createTintEntry(shardMat)];
  group.scale.setScalar(0.55);

  group.userData = {
    kind: 'r',
    towerId,
    shell,
    edges,
    shellMat,
    edgesMat,
    core,
    coreMat,
    glow,
    phaseRings,
    storm,
    stGeo,
    stData,
    shards,
    tintMats,
    rootScale: 0.55,
    lodObjs: [storm, glow].concat(shards, phaseRings)
  };
  return group;
}

/* ==========================================================================
   3. ТАНК ('t'): Каменный Страж ('ash') / Мерзлотный Голем ('ice') / Страж Бездны ('void')
   ========================================================================== */

function buildGuardPrototype(towerId = 'ash') {
  const partsByLimb = {
    torso: [],
    torsoBrick: [],
    head: [],
    armR: [],
    armL: [],
    legR: [],
    legL: []
  };

  let stoneColors;
  let accentColor;
  if (towerId === 'ice') {
    stoneColors = [0x88c8f0, 0x9cd8ff, 0x68a8d8, 0xb8e8ff].map((h) => new THREE.Color(h));
    accentColor = new THREE.Color(0xe8fbff);
  } else if (towerId === 'void') {
    stoneColors = [0x241438, 0x2e1a48, 0x1a0c2a, 0x382058].map((h) => new THREE.Color(h));
    accentColor = new THREE.Color(0xb848ff);
  } else {
    stoneColors = [0x4a383c, 0x5c4246, 0x3c2c30, 0x68484c].map((h) => new THREE.Color(h));
    accentColor = new THREE.Color(0xff6818);
  }

  const pickStoneStyle = () => {
    const roll = Math.random();
    if (roll < 0.16) return { tag: 'vc', color: accentColor };
    if (towerId === 'ash' && roll < 0.36) return { tag: 'brick' };
    return { tag: 'vc', color: stoneColors[(Math.random() * stoneColors.length) | 0] };
  };

  function addBlock(limbName, w, h, d, x, y, z, rx, ry, rz, customStyle) {
    const style = customStyle || pickStoneStyle();
    const targetList =
      style.tag === 'brick'
        ? partsByLimb[limbName + 'Brick'] || partsByLimb[limbName]
        : partsByLimb[limbName];
    const geo = jitterGeometry(new THREE.BoxGeometry(w, h, d), Math.min(w, h, d) * 0.18);
    targetList.push({
      geo,
      matrix: computeTransformMatrix(
        x,
        y,
        z,
        rx === undefined ? (Math.random() - 0.5) * 0.06 : rx,
        ry === undefined ? (Math.random() - 0.5) * 0.08 : ry,
        rz === undefined ? (Math.random() - 0.5) * 0.06 : rz
      ).clone(),
      color: style.color
    });
  }

  function addShard(limbName, r, h, x, y, z, rx, ry, rz, col) {
    partsByLimb[limbName].push({
      geo: jitterGeometry(new THREE.ConeGeometry(r, h, 5), r * 0.2),
      matrix: computeTransformMatrix(x, y, z, rx || 0, ry || 0, rz || 0).clone(),
      color: col || accentColor
    });
  }

  // Мощный торс с широкой грудной клеткой и защитными плитами
  addBlock('torso', 1.05, 0.42, 0.72, 0, 0.2, 0);
  addBlock('torso', 1.25, 0.48, 0.85, 0, 0.62, 0);
  addBlock('torso', 1.65, 0.58, 1.02, 0, 1.1, 0);
  addBlock('torso', 1.85, 0.32, 0.95, 0, 1.42, 0);
  addBlock('torso', 0.95, 0.58, 0.55, 0, 1.32, -0.48);

  for (const s of [-1, 1]) {
    addBlock('torso', 0.56, 0.52, 0.24, s * 0.48, 1.12, 0.48, 0, -s * 0.18, 0, {
      tag: towerId === 'ash' ? 'brick' : 'vc',
      color: stoneColors[0]
    });
  }

  // Характерные детали торса/плеч по мудбордам
  if (towerId === 'ice') {
    // МЕРЗЛОТНЫЙ ГОЛЕМ: огромные ледяные пики-сосульки на спине и загривке
    for (const s of [-1, 1]) {
      addShard('torso', 0.24, 1.25, s * 0.65, 1.85, -0.25, -0.35, 0, -s * 0.38, accentColor);
      addShard('torso', 0.18, 0.95, s * 0.32, 1.92, -0.38, -0.45, 0, -s * 0.18, accentColor);
    }
  } else if (towerId === 'void') {
    // СТРАЖ БЕЗДНЫ: изогнутые шипы «застывших криков» на плечах и хребте
    for (const s of [-1, 1]) {
      addShard('torso', 0.22, 1.15, s * 0.75, 1.78, -0.15, -0.2, 0, -s * 0.48, stoneColors[3]);
      addShard('torso', 0.14, 0.75, s * 0.45, 1.72, 0.35, 0.35, 0, -s * 0.25, accentColor);
    }
  } else {
    // КАМЕННЫЙ СТРАЖ: зубцы башенной кладки на горбу
    for (const s of [-1, 1]) {
      addShard('torso', 0.2, 0.8, s * 0.55, 1.72, -0.28, -0.3, 0, -s * 0.25, stoneColors[1]);
    }
  }

  // Голова
  addBlock('head', 0.58, 0.48, 0.52, 0, 0.22, 0);
  addBlock('head', 0.66, 0.15, 0.26, 0, 0.38, 0.24, -0.25, 0, 0);
  addBlock('head', 0.44, 0.2, 0.32, 0, 0.02, 0.18);
  if (towerId === 'ice') {
    // Ледяная корона-гребень на голове Мерзлотного Голема
    addShard('head', 0.16, 0.62, 0, 0.62, -0.05, -0.2, 0, 0, accentColor);
    for (const s of [-1, 1]) {
      addShard('head', 0.12, 0.48, s * 0.24, 0.54, -0.05, -0.2, 0, -s * 0.45, accentColor);
    }
  } else if (towerId === 'void') {
    // Рога Стража Бездны
    for (const s of [-1, 1]) {
      addShard('head', 0.13, 0.68, s * 0.32, 0.48, 0.05, 0.25, 0, -s * 0.65, accentColor);
    }
  }

  // Руки с массивными наплечниками и кулаками
  for (const side of [1, -1]) {
    const limb = side > 0 ? 'armR' : 'armL';
    addBlock(limb, 0.72, 0.62, 0.82, 0, 0.08, 0, 0, 0, side * 0.12);
    addShard(
      limb,
      0.22,
      towerId === 'ice' ? 1.1 : 0.78,
      side * 0.25,
      0.55,
      0,
      0,
      0,
      -side * 0.55,
      towerId === 'ash' ? stoneColors[0] : accentColor
    );
    addBlock(limb, 0.48, 0.72, 0.52, 0, -0.48, 0);
    addBlock(limb, 0.44, 0.32, 0.44, 0, -0.88, 0);
    addBlock(limb, 0.64, 1.05, 0.82, 0, -1.48, 0.06);
    addBlock(limb, 0.62, 0.38, 0.72, 0, -2.02, 0.12);
    if (towerId === 'ice') {
      addShard(limb, 0.16, 0.75, side * 0.28, -1.45, 0.28, 0.3, 0, -side * 0.45, accentColor);
    }
  }

  // Ноги
  for (const side of [1, -1]) {
    const limb = side > 0 ? 'legR' : 'legL';
    addBlock(limb, 0.58, 0.72, 0.62, 0, -0.35, 0);
    addBlock(limb, 0.48, 0.28, 0.52, 0, -0.75, 0.05);
    addBlock(limb, 0.54, 0.62, 0.58, 0, -1.1, 0);
    addBlock(limb, 0.68, 0.25, 0.92, 0, -1.42, 0.12);
  }

  const merged = {};
  for (const key in partsByLimb) {
    merged[key] = mergeGeometryParts(partsByLimb[key]);
  }

  const eyeParts = [];
  for (const side of [-1, 1]) {
    eyeParts.push({
      geo: new THREE.BoxGeometry(0.13, 0.08, 0.06),
      matrix: computeTransformMatrix(side * 0.15, 0.24, 0.28, 0, 0, side * 0.2).clone()
    });
  }
  merged.eyes = mergeGeometryParts(eyeParts);

  return { towerId, merged };
}

function createGuardInstance(prototype) {
  const towerId = prototype.towerId || 'ash';
  const root = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: towerId === 'ice' ? 0.18 : 0.88,
    metalness: towerId === 'ice' ? 0.38 : 0.12,
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

  // Светящееся ядро / воронка в груди танка (по мудбордам всех 3 башен!)
  if (towerId === 'void') {
    // Страж Бездны: чёрная дыра-воронка с фиолетовым кольцом в груди
    const bhCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x020005 })
    );
    bhCore.position.set(0, 1.05, 0.42);
    torsoGroup.add(bhCore);

    const bhRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.06, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xe078ff })
    );
    bhRing.position.set(0, 1.05, 0.48);
    torsoGroup.add(bhRing);
  } else {
    // Каменный Страж (огненное ядро) и Мерзлотный Голем (ледяное ядро)
    const coreMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36, 1),
      new THREE.MeshBasicMaterial({
        map: towerId === 'ice' ? TEXTURES.iceCore : TEXTURES.ogarekCore
      })
    );
    coreMesh.position.set(0, 1.08, 0.44);
    torsoGroup.add(coreMesh);
  }

  const chestSprite = createGlowSprite(
    towerId === 'ice'
      ? TEXTURES.glowIce
      : towerId === 'void'
        ? TEXTURES.glowPurple
        : TEXTURES.glowWarm,
    2.4
  );
  chestSprite.position.set(0, 1.08, 0.58);
  torsoGroup.add(chestSprite);

  const crackMats = [];
  const crackTex = towerId === 'ice' ? TEXTURES.iceCrack : TEXTURES.guardCrack;
  function addCrackDecal(w, h, x, y, z, ry, rx, parent) {
    const mat = new THREE.MeshBasicMaterial({
      map: crackTex,
      color: towerId === 'void' ? 0xc858ff : 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      opacity: 0.65
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, 0);
    mesh.renderOrder = 5;
    parent.add(mesh);
    crackMats.push(mat);
    return mesh;
  }

  addCrackDecal(0.95, 0.85, 0, 0.85, 0.54, 0, 0, torsoGroup);
  addCrackDecal(0.5, 0.45, 1.05, 1.4, 0.42, 0.5, 0, torsoGroup);

  const head = new THREE.Group();
  head.position.set(0, 1.6, 0.05);
  torsoGroup.add(head);
  attachVertexColorMesh(prototype.merged.head, head);

  const eyeColorHex = towerId === 'ice' ? 0x80f0ff : towerId === 'void' ? 0xd858ff : 0xff4422;
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColorHex });
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const haloMat = new THREE.SpriteMaterial({
    map:
      towerId === 'ice'
        ? TEXTURES.glowIce
        : towerId === 'void'
          ? TEXTURES.glowPurple
          : TEXTURES.coal,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85
  });
  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.15, 0.24, 0.35);
    halo.scale.setScalar(0.7);
    head.add(halo);
    eyeHalos.push(halo);
  }

  function makeArm(side) {
    const group = new THREE.Group();
    group.position.set(side * 1.12, 1.32, 0);
    torsoGroup.add(group);
    attachVertexColorMesh(side > 0 ? prototype.merged.armR : prototype.merged.armL, group);
    if (side < 0) {
      addCrackDecal(0.45, 0.8, 0, -1.45, 0.48, 0, 0, group);
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
    towerId,
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
    lodObjs: eyeHalos.concat([chestSprite])
  };
  return root;
}

/* ==========================================================================
   4. ПРЫГУН ('l'): Обсидиановый Прыгун ('ash') / Ледяной Волк ('ice') / Пустотный Прыгун ('void')
   ========================================================================== */

function buildLeaperPrototype(towerId = 'ash') {
  const bodyColor =
    towerId === 'ice'
      ? new THREE.Color(0x98dcff)
      : towerId === 'void'
        ? new THREE.Color(0xffffff)
        : new THREE.Color(0x120f16);
  const spineColor =
    towerId === 'ice'
      ? new THREE.Color(0xe8fbff)
      : towerId === 'void'
        ? new THREE.Color(0xb858ff)
        : new THREE.Color(0x28181e);
  const toothColor =
    towerId === 'ice'
      ? new THREE.Color(0xffffff)
      : towerId === 'void'
        ? new THREE.Color(0xd088ff)
        : new THREE.Color(0xff9840);

  const partsByLimb = {
    hips: [],
    skeleton: [],
    head: [],
    jaw: [],
    fUpper: [],
    fFore: [],
    bThigh: [],
    bShin: [],
    bFoot: [],
    tail: []
  };

  const makeBox = (w, h, d) =>
    jitterGeometry(new THREE.BoxGeometry(w, h, d), Math.min(w, h, d) * 0.18);
  const makeSpike = (r, h, segs = 4) => new THREE.ConeGeometry(r, h, segs);
  const addPart = (limbName, geo, x, y, z, rx, ry, rz, sx, sy, sz, color) => {
    partsByLimb[limbName].push({
      geo,
      matrix: computeTransformMatrix(x, y, z, rx, ry, rz, sx, sy, sz).clone(),
      color: color || bodyColor
    });
  };

  // Хищный звериный корпус (мощная грудная клетка спереди + подтянутый круп сзади)
  addPart('hips', makeBox(0.72, 0.56, 0.95), 0, 0.12, 0.35, 0.08, 0, 0);
  addPart('hips', makeBox(0.56, 0.44, 0.95), 0, 0.06, -0.45, -0.08, 0, 0);

  // Рельефные пластины / шерсть / теневые отростки
  for (let i = 0; i < 18; i++) {
    const z = -0.95 + (i / 18) * 1.85;
    const widthProfile = Math.sqrt(Math.max(0.1, 1 - Math.pow((z - 0.05) / 1.2, 2)));
    const side = i % 2 ? 1 : -1;
    addPart(
      'hips',
      jitterGeometry(new THREE.DodecahedronGeometry(0.16, 0), 0.05),
      side * 0.34 * widthProfile,
      0.24 * widthProfile,
      z,
      0.2,
      side * 0.3,
      0,
      1.1,
      0.6,
      1.6,
      bodyColor
    );
  }

  if (towerId === 'ice') {
    // ЛЕДЯНОЙ ВОЛК: тёмно-синий внутренний скелет (позвоночник и рёбра), просвечивающий сквозь полупрозрачный лёд!
    const boneCol = new THREE.Color(0x091e3a);
    addPart('skeleton', new THREE.CylinderGeometry(0.06, 0.05, 1.75, 6), 0, 0.22, -0.05, Math.PI / 2, 0, 0, 1, 1, 1, boneCol);
    for (let r = 0; r < 6; r++) {
      const rz = 0.62 - r * 0.22;
      const ribScale = 1 - r * 0.08;
      for (const s of [-1, 1]) {
        addPart(
          'skeleton',
          new THREE.CylinderGeometry(0.032, 0.025, 0.48 * ribScale, 5),
          s * 0.22 * ribScale,
          0.06,
          rz,
          0.15,
          0,
          s * 0.55,
          1,
          1,
          1,
          boneCol
        );
      }
    }
    // Острые ледяные наросты-сосульки на холке и вдоль спины
    for (let i = 0; i < 8; i++) {
      const z = -0.88 + i * 0.25;
      const h = i >= 4 ? 0.68 : 0.44;
      addPart('hips', makeSpike(0.08, h, 5), 0, 0.46, z, -0.58, 0, 0, 1, 1, 1, spineColor);
      for (const s of [-1, 1]) {
        if (i >= 3) {
          addPart('hips', makeSpike(0.06, h * 0.8, 5), s * 0.22, 0.38, z, -0.5, 0, -s * 0.38, 1, 1, 1, spineColor);
        }
      }
    }
  } else if (towerId === 'void') {
    // ПУСТОТНЫЙ ПРЫГУН: длинные развевающиеся теневые ленты/щупальца на холке и спине
    for (let i = 0; i < 6; i++) {
      const s = i % 2 ? 1 : -1;
      const z = 0.55 - i * 0.24;
      addPart(
        'hips',
        makeSpike(0.06, 0.95, 5),
        s * 0.2,
        0.48,
        z,
        -1.05,
        s * 0.2,
        -s * 0.35,
        0.7,
        1.2,
        1,
        spineColor
      );
    }
  } else {
    // ОБСИДИАНОВЫЙ ПРЫГУН: густая грива длинных обсидиановых шипов на загривке и хребте
    for (let i = 0; i < 8; i++) {
      const z = -0.92 + i * 0.26;
      const isMane = i >= 4;
      const h = isMane ? 0.65 + (i % 2) * 0.15 : 0.42;
      addPart('hips', makeSpike(0.085, h, 4), 0, 0.48, z, -0.55, Math.PI / 4, 0, 1, 1, 1, spineColor);
      if (isMane) {
        for (const s of [-1, 1]) {
          addPart(
            'hips',
            makeSpike(0.065, h * 0.82, 4),
            s * 0.24,
            0.38,
            z - 0.05,
            -0.52,
            Math.PI / 4,
            -s * 0.42,
            1,
            1,
            1,
            spineColor
          );
        }
      }
    }
  }

  // Голова
  if (towerId === 'void') {
    // Вытянутая гладкая голова без пасти с большими глазами-провалами (как на мудборде 3)
    addPart('head', new THREE.SphereGeometry(0.28, 12, 10), 0, 0.04, 0.34, 0.15, 0, 0, 0.88, 0.82, 1.65);
    for (const s of [-1, 1]) {
      addPart('head', makeSpike(0.045, 0.55, 5), s * 0.16, 0.18, -0.08, -1.2, 0, -s * 0.35, 1, 1, 1, spineColor);
    }
    addPart('jaw', makeBox(0.16, 0.06, 0.26), 0, -0.04, 0.18);
  } else {
    // Волчья хищная голова с острой мордой, ушами-шипами и клыками
    addPart('head', makeBox(0.42, 0.3, 0.52), 0, 0.02, 0.24);
    addPart('head', makeBox(0.28, 0.18, 0.46), 0, -0.05, 0.62);
    for (const side of [-1, 1]) {
      addPart('head', makeSpike(0.06, 0.38), side * 0.17, 0.2, 0.08, -0.85, 0, side * 0.25, 1, 1, 1, spineColor);
    }
    for (let i = 0; i < 4; i++) {
      addPart(
        'head',
        makeSpike(0.028, 0.13),
        (i - 1.5) * 0.07,
        -0.15,
        0.36 + (i % 2) * 0.12,
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
        makeSpike(0.028, 0.12),
        (i - 1.5) * 0.07,
        -0.01,
        0.32 + (i % 2) * 0.12,
        0,
        0,
        0,
        1,
        1,
        1,
        toothColor
      );
    }
    addPart('jaw', makeBox(0.24, 0.1, 0.46), 0, -0.05, 0.24);
  }

  // Передние и задние лапы (у Ледяного Волка — с лезвиями-коньками, у Пустотного — тонкие и длинные)
  const limbThin = towerId === 'void' ? 0.72 : 1.0;
  addPart('fUpper', makeBox(0.14 * limbThin, 0.36, 0.15 * limbThin), 0, -0.17, 0);
  addPart('fFore', makeBox(0.11 * limbThin, 0.34, 0.12 * limbThin), 0, -0.16, 0.04);
  if (towerId === 'ice') {
    // Лезвие-конёк на передней лапе
    addPart('fFore', new THREE.BoxGeometry(0.04, 0.12, 0.42), 0, -0.32, 0.12, 0, 0, 0, 1, 1, 1, spineColor);
  } else {
    for (let i = -1; i <= 1; i++) {
      addPart('fFore', makeSpike(0.028, 0.18), i * 0.05, -0.3, 0.12, 2.4, 0, i * 0.25, 1, 1, 1, spineColor);
    }
  }

  addPart('bThigh', makeBox(0.22 * limbThin, 0.8, 0.34 * limbThin), 0, -0.38, 0);
  for (let i = 0; i < 2; i++) {
    addPart('bThigh', makeSpike(0.04, 0.26), 0, -0.2 - i * 0.3, -0.18, 2.6, 0, 0, 1, 1, 1, spineColor);
  }
  addPart('bShin', makeBox(0.13 * limbThin, 0.68, 0.15 * limbThin), 0, -0.34, 0);
  addPart('bFoot', makeBox(0.15 * limbThin, 0.1, 0.42), 0, -0.04, 0.14);
  if (towerId === 'ice') {
    addPart('bFoot', new THREE.BoxGeometry(0.04, 0.12, 0.54), 0, -0.08, 0.18, 0, 0, 0, 1, 1, 1, spineColor);
  } else {
    for (let i = -1; i <= 1; i++) {
      addPart('bFoot', makeSpike(0.03, 0.2), i * 0.06, -0.05, 0.36, 1.9, 0, i * 0.2, 1, 1, 1, spineColor);
    }
  }

  // Сегменты хвоста
  const tailGeos = [];
  let tailScale = 1;
  for (let i = 0; i < 4; i++) {
    const segParts = [];
    const pushSegPart = (geo, x, y, z, rx, ry, rz, col) =>
      segParts.push({
        geo,
        matrix: computeTransformMatrix(x, y, z, rx, ry, rz).clone(),
        color: col || bodyColor
      });
    pushSegPart(
      makeBox(0.24 * tailScale, 0.2 * tailScale, 0.42 * tailScale),
      0,
      0,
      -0.2 * tailScale
    );
    if (i < 2) {
      for (const side of [-1, 1]) {
        pushSegPart(
          makeSpike(0.04, 0.24),
          side * 0.14 * tailScale,
          0.08,
          -0.15 * tailScale,
          0,
          0,
          side * 0.9,
          spineColor
        );
      }
    }
    if (i === 3) {
      pushSegPart(makeSpike(0.06, 0.4), 0, 0, -0.5 * tailScale, -Math.PI / 2 + 0.3, 0, 0, spineColor);
    }
    tailGeos.push(mergeGeometryParts(segParts));
    tailScale *= 0.78;
  }

  const merged = {};
  for (const key in partsByLimb) {
    if (key === 'tail') continue;
    merged[key] = partsByLimb[key].length ? mergeGeometryParts(partsByLimb[key]) : null;
  }
  merged.tail = tailGeos;

  // Глаза (у Пустотного Прыгуна — 4 непропорционально больших круглых глаза-провала)
  const eyeParts = [];
  for (const side of [-1, 1]) {
    const eyeR = towerId === 'void' ? 0.085 : 0.058;
    eyeParts.push({
      geo: new THREE.SphereGeometry(eyeR, 10, 10),
      matrix: computeTransformMatrix(side * 0.16, 0.06, 0.46).clone()
    });
    if (towerId === 'void') {
      eyeParts.push({
        geo: new THREE.SphereGeometry(0.055, 8, 8),
        matrix: computeTransformMatrix(side * 0.19, 0.14, 0.28).clone()
      });
    }
  }
  merged.eyes = mergeGeometryParts(eyeParts);

  const coreGeo = new THREE.SphereGeometry(1, 20, 16);
  const mawGeo = new THREE.BoxGeometry(0.2, 0.05, 0.32);
  return { towerId, merged, coreGeo, mawGeo };
}

function createLeaperInstance(prototype) {
  const towerId = prototype.towerId || 'ash';
  const root = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    map: towerId === 'void' ? TEXTURES.voidStarSkin : null,
    roughness: towerId === 'ice' ? 0.12 : towerId === 'void' ? 0.45 : 0.18,
    metalness: towerId === 'ice' ? 0.35 : towerId === 'void' ? 0.2 : 0.82,
    transparent: towerId === 'ice',
    opacity: towerId === 'ice' ? 0.68 : 1.0,
    flatShading: towerId !== 'void',
    emissive: towerId === 'ice' ? 0x2078c8 : towerId === 'void' ? 0x381268 : 0x2a0c05,
    emissiveIntensity: towerId === 'void' ? 0.85 : 0.35
  });

  const attachBodyMesh = (geo, parent, x, y, z) => {
    if (!geo) return null;
    const mesh = new THREE.Mesh(geo, bodyMat);
    mesh.position.set(x || 0, y || 0, z || 0);
    parent.add(mesh);
    return mesh;
  };

  const hips = new THREE.Group();
  hips.position.y = 0.98;
  root.add(hips);
  attachBodyMesh(prototype.merged.hips, hips);

  // Для Ледяного Волка добавляем внутренний тёмно-синий скелет!
  if (prototype.merged.skeleton) {
    const skelMat = new THREE.MeshStandardMaterial({
      color: 0x071a34,
      emissive: 0x0b3260,
      emissiveIntensity: 0.5,
      roughness: 0.6,
      flatShading: true
    });
    hips.add(new THREE.Mesh(prototype.merged.skeleton, skelMat));
  }

  const coreTex =
    towerId === 'ice'
      ? TEXTURES.iceCore
      : towerId === 'void'
        ? TEXTURES.voidCore
        : TEXTURES.leaperLava;
  const coreMat = new THREE.MeshBasicMaterial({ map: coreTex });
  const core = new THREE.Mesh(prototype.coreGeo, coreMat);
  core.position.set(0, 0.04, 0.05);
  core.scale.set(
    towerId === 'ice' ? 0.38 : 0.56,
    towerId === 'ice' ? 0.32 : 0.44,
    towerId === 'ice' ? 0.75 : 1.08
  );
  hips.add(core);

  const glow = createGlowSprite(
    towerId === 'ice'
      ? TEXTURES.glowIce
      : towerId === 'void'
        ? TEXTURES.glowPurple
        : TEXTURES.coal,
    2.6
  );
  glow.position.set(0, -0.08, 0);
  hips.add(glow);

  const head = new THREE.Group();
  head.position.set(0, 0.14, 1.02);
  hips.add(head);
  attachBodyMesh(prototype.merged.head, head);

  const eyeColorHex = towerId === 'ice' ? 0xe8fbff : towerId === 'void' ? 0xffffff : 0xff5522;
  const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColorHex });
  head.add(new THREE.Mesh(prototype.merged.eyes, eyeMat));

  const haloMat = new THREE.SpriteMaterial({
    map:
      towerId === 'ice'
        ? TEXTURES.glowIce
        : towerId === 'void'
          ? TEXTURES.glowPurple
          : TEXTURES.coal,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.85
  });
  const eyeHalos = [];
  for (const side of [-1, 1]) {
    const halo = new THREE.Sprite(haloMat);
    halo.position.set(side * 0.16, 0.06, 0.52);
    halo.scale.setScalar(0.45);
    head.add(halo);
    eyeHalos.push(halo);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.13, 0.42);
  head.add(jaw);
  attachBodyMesh(prototype.merged.jaw, jaw);

  const mawMat = new THREE.MeshBasicMaterial({
    color: towerId === 'ice' ? 0x70e8ff : towerId === 'void' ? 0xb848ff : 0xff5511
  });
  const maw = new THREE.Mesh(prototype.mawGeo, mawMat);
  maw.position.set(0, 0.0, 0.28);
  jaw.add(maw);

  const tailSegs = [];
  let tailParent = hips;
  let tailZ = -1.12;
  let tailY = 0.04;
  for (let i = 0; i < 4; i++) {
    const segGroup = new THREE.Group();
    segGroup.position.set(0, tailY, tailZ);
    tailParent.add(segGroup);
    attachBodyMesh(prototype.merged.tail[i], segGroup);
    tailSegs.push(segGroup);
    tailParent = segGroup;
    tailY = 0;
    tailZ = -0.4 * (i === 0 ? 1 : Math.pow(0.78, i));
  }

  function makeFrontLeg(side) {
    const upperGroup = new THREE.Group();
    upperGroup.position.set(side * 0.42, -0.22, 0.55);
    hips.add(upperGroup);
    attachBodyMesh(prototype.merged.fUpper, upperGroup);

    const foreGroup = new THREE.Group();
    foreGroup.position.set(0, -0.34, 0);
    upperGroup.add(foreGroup);
    attachBodyMesh(prototype.merged.fFore, foreGroup);
    return { g: upperGroup, fore: foreGroup };
  }

  const legFL = makeFrontLeg(-1);
  const legFR = makeFrontLeg(1);

  function makeBackLeg(side) {
    const thighGroup = new THREE.Group();
    thighGroup.position.set(side * 0.48, -0.12, -0.72);
    hips.add(thighGroup);
    attachBodyMesh(prototype.merged.bThigh, thighGroup);

    const shinGroup = new THREE.Group();
    shinGroup.position.set(0, -0.75, 0);
    thighGroup.add(shinGroup);
    attachBodyMesh(prototype.merged.bShin, shinGroup);

    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.66, 0);
    shinGroup.add(footGroup);
    attachBodyMesh(prototype.merged.bFoot, footGroup);
    return { g: thighGroup, shin: shinGroup, foot: footGroup };
  }

  const legBL = makeBackLeg(-1);
  const legBR = makeBackLeg(1);

  root.position.y = 0.14;
  root.scale.setScalar(0.7);

  const tintMats = [createTintEntry(bodyMat)];
  root.userData = {
    kind: 'l',
    towerId,
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
