/* ==========================================================================
   Модель главного героя «Угленосец» (Runner · Пепельная гильдия),
   3D-модели экипировки предметов (Угольный сапог, Ледяная подошва, Громовой пояс,
   Лавовое сердце, Компас высоты, Плавильный кристалл), процедурные анимации
   перемещения, прыжков, двойного прыжка и подкатов, а также базовое окружение
   ========================================================================== */

const playerMesh = new THREE.Group();
scene.add(playerMesh);

/* ---------- 0. Детализированная 3D-модель героя «Угленосец» и его экипировки ---------- */

const heroRig = (function buildCoalbearerHero() {
  const T = THREE;
  const PI = Math.PI;
  const L = (color, opts) =>
    new T.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...opts });

  const cu = L(0x4f7a69, { roughness: 0.5, metalness: 0.3 });
  const cuD = L(0x35574b, { roughness: 0.5, metalness: 0.35 });
  const lea = L(0x5a371e, { roughness: 0.9, metalness: 0 });
  const leaD = L(0x2f1c11, { roughness: 0.95, metalness: 0 });
  const st = L(0xaab0b8, { roughness: 0.35, metalness: 0.55 });
  const stD = L(0x42464d, { roughness: 0.4, metalness: 0.5 });
  const coal = L(0x2a1008, {
    emissive: 0xff4a10,
    emissiveIntensity: 1.35,
    flatShading: true
  });
  const magmaHot = L(0xffcf58, {
    emissive: 0xff6200,
    emissiveIntensity: 2.1,
    roughness: 0.2,
    flatShading: true
  });
  const frostMat = L(0xb8f2ff, {
    emissive: 0x28a8ff,
    emissiveIntensity: 1.45,
    roughness: 0.12,
    metalness: 0.35,
    flatShading: true
  });
  const stormMat = L(0xd898ff, {
    emissive: 0x7828ff,
    emissiveIntensity: 1.65,
    roughness: 0.18,
    metalness: 0.4,
    flatShading: true
  });
  const brassMat = L(0xd8a848, {
    emissive: 0x583800,
    emissiveIntensity: 0.45,
    roughness: 0.28,
    metalness: 0.72
  });
  const cr1 = L(0xffb347, {
    emissive: 0xc86a00,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    flatShading: true
  });
  const cr2 = L(0xa77bff, {
    emissive: 0x5a2ab0,
    emissiveIntensity: 0.85,
    roughness: 0.2,
    flatShading: true
  });
  const vis = new T.MeshBasicMaterial({ color: 0x4dfff0 });

  const makeGroup = (pos, parent) => {
    const g = new T.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    parent.add(g);
    return g;
  };
  const makeMesh = (geo, mat, pos, parent, scale) => {
    const m = new T.Mesh(geo, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    if (scale) m.scale.set(scale[0], scale[1], scale[2]);
    parent.add(m);
    return m;
  };
  const cy = (a, b, h, n = 10) => new T.CylinderGeometry(a, b, h, n);
  const sp = (r, w = 12, h = 9) => new T.SphereGeometry(r, w, h);
  const bx = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cn = (r, h, n = 5) => new T.ConeGeometry(r, h, n);
  const ico = (r) => new T.IcosahedronGeometry(r, 0);
  const oct = (r) => new T.OctahedronGeometry(r, 0);

  const hero = makeGroup([0, 0, 0], playerMesh);
  const lean = makeGroup([0, 0.95, 0], hero);
  const up = makeGroup([0, -0.95, 0], lean);

  const coalBootMods = [];
  const iceSoleMods = [];

  // Ноги с тазобедренным ('h') и коленным ('k') суставами, детализированными сапогами и слотами предметов
  const legs = [1, -1].map((s) => {
    const h = makeGroup([s * 0.1, 0.95, 0], hero);
    makeMesh(cy(0.088, 0.066, 0.46), cu, [0, -0.23, 0], h);
    makeMesh(cy(0.093, 0.093, 0.035), lea, [0, -0.17, 0], h);
    const k = makeGroup([0, -0.46, 0], h);
    makeMesh(sp(0.07), stD, [0, 0, 0.025], k, [1, 1, 0.8]);
    makeMesh(cy(0.062, 0.048, 0.4), cu, [0, -0.2, 0], k);
    makeMesh(cy(0.068, 0.064, 0.16), lea, [0, -0.31, 0], k);
    makeMesh(cy(0.07, 0.07, 0.025), st, [0, -0.24, 0], k);

    // Базовый кованый сапог Угленосца (с протектором, накладкой подъёма, стальным мыском и пяткой)
    makeMesh(bx(0.116, 0.086, 0.22), leaD, [0, -0.442, 0.045], k);
    makeMesh(bx(0.124, 0.022, 0.236), stD, [0, -0.482, 0.046], k);
    makeMesh(sp(0.058), stD, [0, -0.448, 0.152], k, [1.02, 0.82, 1.05]);
    makeMesh(bx(0.088, 0.036, 0.09), st, [0, -0.402, 0.065], k).rotation.x = 0.32;
    makeMesh(bx(0.122, 0.042, 0.055), stD, [0, -0.445, -0.045], k);
    // Тлеющий угольный глазок на базовом сапоге
    makeMesh(oct(0.018), coal, [s * 0.062, -0.31, 0.02], k, [0.7, 1.3, 0.9]);

    // 1. Экипировка «УГОЛЬНЫЙ САПОГ» (Огненный сапог Горна: латный наголенник с топкой, сопла, шпора и пламенные рёбра)
    const coalBoot = makeGroup([0, 0, 0], k);
    // Кованый латный щиток голени с огненной щелью-горном
    makeMesh(cy(0.079, 0.073, 0.18, 8), stD, [0, -0.305, 0.012], coalBoot);
    makeMesh(bx(0.058, 0.16, 0.035), cuD, [0, -0.305, 0.065], coalBoot);
    makeMesh(bx(0.024, 0.135, 0.022), magmaHot, [0, -0.305, 0.078], coalBoot);
    // Огненный наколенный шип-гребень
    const kneeHorn = makeMesh(cn(0.034, 0.105, 5), coal, [0, -0.195, 0.078], coalBoot);
    kneeHorn.rotation.x = 0.42;
    // Расширенная магматическая подошва с зубьями-подковами
    makeMesh(bx(0.142, 0.026, 0.262), stD, [0, -0.482, 0.05], coalBoot);
    makeMesh(bx(0.148, 0.013, 0.268), magmaHot, [0, -0.474, 0.05], coalBoot);
    // 3 боковых сопла Горна с раскалёнными углями
    [-0.04, 0.025, 0.09].forEach((zOff, idx) => {
      const vent = makeMesh(
        cy(0.018, 0.022, 0.038, 6),
        stD,
        [s * 0.072, -0.442 + idx * 0.008, zOff],
        coalBoot
      );
      vent.rotation.z = PI / 2;
      const emberCore = makeMesh(
        cy(0.012, 0.012, 0.042, 6),
        magmaHot,
        [s * 0.074, -0.442 + idx * 0.008, zOff],
        coalBoot
      );
      emberCore.rotation.z = PI / 2;
    });
    // Боковые пламенные крылья-пластины на лодыжке
    [-1, 1].forEach((sideSign) => {
      const fin = makeMesh(
        cn(0.032, 0.14, 4),
        sideSign === s ? magmaHot : coal,
        [sideSign * 0.075, -0.34, -0.01],
        coalBoot,
        [0.45, 1, 0.9]
      );
      fin.rotation.set(-0.35, 0, -sideSign * 0.38);
    });
    // Передний таранный коготь-мысок и задняя вулканическая шпора
    const toeClaw = makeMesh(cn(0.038, 0.095, 4), magmaHot, [0, -0.455, 0.21], coalBoot);
    toeClaw.rotation.x = PI * 0.46;
    const heelSpur = makeMesh(cn(0.032, 0.11, 5), coal, [0, -0.425, -0.105], coalBoot);
    heelSpur.rotation.x = -PI * 0.44;
    // Тепловой ореол вокруг сапога
    const bootGlow = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.coal,
        color: 0xff6a18,
        transparent: true,
        opacity: 0.65,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    bootGlow.position.set(0, -0.41, 0.05);
    bootGlow.scale.setScalar(0.52);
    coalBoot.add(bootGlow);
    coalBoot.visible = false;
    coalBootMods.push({ group: coalBoot, glow: bootGlow });

    // 2. Экипировка «ЛЕДЯНАЯ ПОДОШВА» (кристаллические коньки-полозья и шипы инея)
    const iceSole = makeGroup([0, 0, 0], k);
    [-0.038, 0.038].forEach((xOff) => {
      makeMesh(bx(0.015, 0.042, 0.295), frostMat, [xOff, -0.492, 0.058], iceSole);
    });
    const iceProw = makeMesh(cn(0.032, 0.12, 4), frostMat, [0, -0.455, 0.23], iceSole);
    iceProw.rotation.x = PI * 0.36;
    const iceHeel = makeMesh(oct(0.036), frostMat, [0, -0.43, -0.105], iceSole, [0.65, 1.7, 0.85]);
    iceHeel.rotation.x = -0.45;
    makeMesh(
      oct(0.032),
      frostMat,
      [s * 0.078, -0.38, 0.02],
      iceSole,
      [0.6, 1.85, 0.65]
    ).rotation.z = -s * 0.42;
    const iceBootGlow = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.glowIce,
        color: 0x70e4ff,
        transparent: true,
        opacity: 0.6,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    iceBootGlow.position.set(0, -0.46, 0.05);
    iceBootGlow.scale.setScalar(0.46);
    iceSole.add(iceBootGlow);
    iceSole.visible = false;
    iceSoleMods.push({ group: iceSole, glow: iceBootGlow });

    return { h, k };
  });

  // Торс, кираса, воротник и перекрещенные кожаные ремни
  makeMesh(cy(0.2, 0.18, 0.16, 14), cu, [0, 0.93, 0], up, [1, 1, 0.74]);
  makeMesh(cy(0.235, 0.19, 0.56, 16), cu, [0, 1.24, 0], up, [1, 1, 0.72]);
  makeMesh(sp(0.235, 16, 8), cu, [0, 1.52, 0], up, [1, 0.35, 0.72]);
  makeMesh(cy(0.238, 0.238, 0.13, 18), st, [0, 0.99, 0], up, [1, 1, 0.78]);
  makeMesh(cy(0.07, 0.085, 0.14), cuD, [0, 1.57, 0], up);
  makeMesh(new T.TorusGeometry(0.1, 0.02, 6, 16), st, [0, 1.55, 0], up).rotation.x = PI / 2;

  [1, -1].forEach((s) => {
    const g = makeGroup([0, 1.26, 0], up);
    g.rotation.z = s * 0.5;
    makeMesh(new T.TorusGeometry(0.262, 0.017, 6, 32), lea, [0, 0, 0], g, [1, 0.645, 1]).rotation.x =
      PI / 2;
  });

  // Пряжка пояса, подсумки с углями/кристаллами и подвески
  makeMesh(bx(0.1, 0.1, 0.03), stD, [0, 0.99, 0.2], up);
  makeMesh(cy(0.028, 0.028, 0.02, 10), coal, [0, 0.99, 0.22], up).rotation.x = PI / 2;

  [
    [0.188, 0.153, 0.7, cr1],
    [-0.188, 0.153, -0.7, coal],
    [0.268, 0, 1.57, cr2],
    [-0.268, 0, -1.57, coal]
  ].forEach(([x, z, r, m]) => {
    const p = makeGroup([x, 0.96, z], up);
    p.rotation.y = r;
    makeMesh(bx(0.1, 0.11, 0.06), lea, [0, 0, 0], p);
    makeMesh(bx(0.102, 0.025, 0.062), stD, [0, 0.03, 0], p);
    makeMesh(
      m === coal ? ico(0.036) : oct(0.04),
      m,
      [0, 0.075, 0],
      p,
      m === coal ? [1, 0.9, 1] : [0.8, 1.7, 0.8]
    );
  });

  [
    [0.05, cr1],
    [-0.06, coal]
  ].forEach(([x, m], i) => {
    makeMesh(cy(0.004, 0.004, 0.1, 4), stD, [x, 0.87, 0.19], up);
    makeMesh(
      i ? ico(0.032) : oct(0.04),
      m,
      [x, 0.795, 0.19],
      up,
      i ? undefined : [0.8, 1.5, 0.8]
    );
  });

  // Аддитивное свечение углей на поясе (без перекомпиляции шейдеров сцены)
  const beltGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowWarm,
      color: 0xff6a20,
      transparent: true,
      opacity: 0.48,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  beltGlow.position.set(0, 0.96, 0.28);
  beltGlow.scale.setScalar(0.65);
  up.add(beltGlow);

  // 3. Экипировка «ГРОМОВОЙ ПОЯС» (катушки Теслы и грозовые электроды-кристаллы на поясе)
  const thunderBeltGroup = makeGroup([0, 1.0, 0], up);
  const thunderBeltCrystals = [];
  [-1, 1].forEach((s) => {
    const coilPod = makeGroup([s * 0.255, 0.02, 0.08], thunderBeltGroup);
    coilPod.rotation.z = -s * 0.28;
    makeMesh(cy(0.042, 0.048, 0.14, 8), stD, [0, 0, 0], coilPod);
    [-0.038, 0, 0.038].forEach((ry) => {
      makeMesh(new T.TorusGeometry(0.048, 0.009, 6, 14), brassMat, [0, ry, 0], coilPod).rotation.x =
        PI / 2;
    });
    const crys = makeMesh(oct(0.046), stormMat, [0, 0.105, 0], coilPod, [0.75, 1.45, 0.75]);
    thunderBeltCrystals.push(crys);
  });
  [-0.045, 0, 0.045].forEach((xOff, idx) => {
    const prong = makeMesh(
      cn(0.016, 0.085, 4),
      stormMat,
      [xOff, 0.055, 0.215],
      thunderBeltGroup
    );
    prong.rotation.x = 0.35;
    prong.rotation.z = (1 - idx) * 0.25;
  });
  const thunderBeltGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowPurple,
      color: 0xc878ff,
      transparent: true,
      opacity: 0.7,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  thunderBeltGlow.position.set(0, 0.03, 0.25);
  thunderBeltGlow.scale.setScalar(0.58);
  thunderBeltGroup.add(thunderBeltGlow);
  thunderBeltGroup.visible = false;

  // 4. Экипировка «ЛАВОВОЕ СЕРДЦЕ» (кованая клетка на груди с бьющимся магматическим сердцем)
  const lavaHeartGroup = makeGroup([0, 1.29, 0.175], up);
  makeMesh(new T.TorusGeometry(0.072, 0.013, 6, 8), stD, [0, 0, 0], lavaHeartGroup);
  for (let c = 0; c < 4; c++) {
    const ang = (c / 4) * PI * 2 + PI / 4;
    const claw = makeMesh(
      cn(0.016, 0.06, 4),
      st,
      [Math.cos(ang) * 0.065, Math.sin(ang) * 0.065, 0.015],
      lavaHeartGroup
    );
    claw.rotation.z = ang + PI / 2;
  }
  const lavaHeartCore = makeGroup([0, 0, 0.02], lavaHeartGroup);
  makeMesh(ico(0.052), magmaHot, [0, -0.005, 0], lavaHeartCore, [1.0, 1.15, 0.85]);
  makeMesh(oct(0.032), coal, [-0.026, 0.035, 0], lavaHeartCore, [0.9, 1.2, 0.8]);
  makeMesh(oct(0.032), coal, [0.026, 0.035, 0], lavaHeartCore, [0.9, 1.2, 0.8]);
  const lavaHeartGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.coal,
      color: 0xff5a10,
      transparent: true,
      opacity: 0.75,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  lavaHeartGlow.position.set(0, 0, 0.05);
  lavaHeartGlow.scale.setScalar(0.48);
  lavaHeartGroup.add(lavaHeartGlow);
  lavaHeartGroup.visible = false;

  // 5. Экипировка «КОМПАС ВЫСОТЫ» (вращающийся гироскоп-астролябия над левым плечом)
  const altCompassGroup = makeGroup([-0.23, 1.66, -0.14], up);
  makeMesh(cy(0.014, 0.018, 0.16, 6), stD, [0.04, -0.09, 0], altCompassGroup).rotation.z = -0.45;
  const compassOuterRing = makeMesh(
    new T.TorusGeometry(0.088, 0.01, 6, 18),
    brassMat,
    [0, 0, 0],
    altCompassGroup
  );
  const compassInnerRing = makeMesh(
    new T.TorusGeometry(0.064, 0.008, 6, 16),
    st,
    [0, 0, 0],
    altCompassGroup
  );
  const compassNeedle = makeMesh(
    oct(0.038),
    frostMat,
    [0, 0, 0],
    altCompassGroup,
    [0.55, 2.05, 0.55]
  );
  altCompassGroup.visible = false;

  // 6. Экипировка «ПЛАВИЛЬНЫЙ КРИСТАЛЛ» (орбитальное созвездие кристаллов вокруг плеч)
  const smeltCrystalGroup = makeGroup([0, 1.38, -0.06], up);
  const smeltCrystalNodes = [];
  for (let i = 0; i < 3; i++) {
    const node = makeGroup([0, 0, 0], smeltCrystalGroup);
    makeMesh(oct(0.052), cr1, [0, 0, 0], node, [0.7, 1.85, 0.7]);
    makeMesh(new T.TorusGeometry(0.042, 0.007, 5, 10), brassMat, [0, 0, 0], node).rotation.x =
      PI / 2;
    smeltCrystalNodes.push(node);
  }
  smeltCrystalGroup.visible = false;

  // Руки с плечевым ('a') и локтевым ('e') суставами
  const arms = [1, -1].map((s) => {
    const a = makeGroup([s * 0.29, 1.47, 0], up);
    makeMesh(sp(0.105, 12, 8), stD, [0, 0.01, 0], a, [1, 0.72, 1.05]);
    makeMesh(cy(0.062, 0.052, 0.33), cu, [0, -0.17, 0], a);
    const e = makeGroup([0, -0.34, 0], a);
    makeMesh(sp(0.052), cuD, [0, 0, 0], e);
    makeMesh(cy(0.05, 0.044, 0.3), cu, [0, -0.16, 0], e);
    makeMesh(cy(0.062, 0.056, 0.15), lea, [0, -0.19, 0], e);
    makeMesh(cy(0.064, 0.064, 0.025), st, [0, -0.12, 0], e);
    makeMesh(sp(0.052, 10, 8), leaD, [0, -0.33, 0], e, [1, 1.1, 0.9]);
    makeMesh(bx(0.07, 0.03, 0.06), stD, [0, -0.31, 0.03], e);
    return { a, e };
  });

  // Шлем с гребнем, заклёпками и светящимся бирюзовым визором
  const hd = makeGroup([0, 1.66, 0], up);
  makeMesh(sp(1, 20, 14), cuD, [0, 0, 0], hd, [0.205, 0.225, 0.225]);
  makeMesh(cy(0.14, 0.11, 0.1, 14), cuD, [0, -0.2, 0], hd, [1, 1, 1.05]);
  makeMesh(
    new T.CylinderGeometry(0.232, 0.232, 0.1, 20, 1, true, -0.85, 1.7),
    stD,
    [0, 0.025, 0],
    hd,
    [0.915, 1, 1]
  );
  makeMesh(
    new T.CylinderGeometry(0.238, 0.238, 0.05, 20, 1, true, -0.725, 1.45),
    vis,
    [0, 0.025, 0],
    hd,
    [0.915, 1, 1]
  );
  const cg = makeGroup([0, 0, 0], hd);
  cg.rotation.y = PI / 2;
  makeMesh(new T.TorusGeometry(0.232, 0.014, 6, 24, PI * 0.83), st, [0, 0, 0], cg);
  [1, -1].forEach((s) => {
    makeMesh(cy(0.035, 0.035, 0.03, 8), stD, [s * 0.195, -0.07, 0.05], hd).rotation.z = PI / 2;
  });

  const rv = new T.InstancedMesh(sp(0.011, 6, 5), st, 30);
  const dm = new T.Object3D();
  for (let i = 0; i < 30; i++) {
    const t = ((i % 15) / 15) * PI * 2;
    const top = i < 15;
    dm.position.set(
      (top ? 0.183 : 0.19) * Math.sin(t),
      top ? 0.11 : -0.09,
      (top ? 0.2 : 0.207) * Math.cos(t)
    );
    dm.updateMatrix();
    rv.setMatrixAt(i, dm.matrix);
  }
  hd.add(rv);

  const visorGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowIce,
      color: 0x45fff0,
      transparent: true,
      opacity: 0.55,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  visorGlow.position.set(0, 0.025, 0.26);
  visorGlow.scale.set(0.55, 0.28, 1);
  hd.add(visorGlow);

  // Тяжёлое угольное орудие за спиной (с топкой, радиаторными кольцами, трёхзубой короной ствола и дульной вспышкой)
  const gn = makeGroup([0, 1.2, -0.27], up);
  gn.rotation.z = -0.42;
  makeMesh(bx(0.11, 0.42, 0.14), stD, [0, 0, 0], gn);
  makeMesh(bx(0.075, 0.22, 0.04), magmaHot, [0, 0.02, -0.06], gn);
  makeMesh(cy(0.054, 0.054, 0.26, 10), st, [0, 0.3, 0], gn);
  [0.2, 0.26, 0.32, 0.38, 0.44].forEach((y) =>
    makeMesh(cy(0.062, 0.062, 0.016, 10), stD, [0, y, 0], gn)
  );
  makeMesh(cy(0.026, 0.028, 0.3, 8), stD, [0, 0.52, 0], gn);
  makeMesh(cy(0.044, 0.036, 0.075, 8), st, [0, 0.71, 0], gn);
  makeMesh(cy(0.024, 0.024, 0.08, 8), magmaHot, [0, 0.72, 0], gn);
  for (let prongIdx = 0; prongIdx < 3; prongIdx++) {
    const a = (prongIdx / 3) * PI * 2;
    makeMesh(
      cn(0.012, 0.07, 4),
      stD,
      [Math.cos(a) * 0.036, 0.76, Math.sin(a) * 0.036],
      gn
    );
  }
  makeMesh(cy(0.095, 0.095, 0.085, 14), stD, [0, 0.02, -0.1], gn).rotation.x = PI / 2;
  makeMesh(cy(0.05, 0.05, 0.095, 10), magmaHot, [0, 0.02, -0.1], gn).rotation.x = PI / 2;
  makeMesh(bx(0.074, 0.22, 0.1), leaD, [0, -0.3, 0], gn);
  makeMesh(bx(0.03, 0.04, 0.06), st, [0.07, 0.12, -0.02], gn);
  makeMesh(bx(0.17, 0.78, 0.03), stD, [0, 0.12, 0.085], gn);
  [1, -1].forEach((s) => makeMesh(bx(0.02, 0.78, 0.1), stD, [s * 0.085, 0.12, 0.03], gn));

  // Дульная вспышка на стволе угольного орудия
  const muzzleFlashGroup = makeGroup([0, 0.8, 0], gn);
  makeMesh(cn(0.065, 0.24, 6), magmaHot, [0, 0.08, 0], muzzleFlashGroup);
  const muzzleGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.coal,
      color: 0xffaa30,
      transparent: true,
      opacity: 0.9,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  muzzleGlow.scale.setScalar(0.45);
  muzzleFlashGroup.add(muzzleGlow);
  muzzleFlashGroup.visible = false;

  return {
    hero,
    lean,
    up,
    legs,
    arms,
    hd,
    gn,
    muzzleFlashGroup,
    coalBootMods,
    iceSoleMods,
    thunderBeltGroup,
    thunderBeltCrystals,
    thunderBeltGlow,
    lavaHeartGroup,
    lavaHeartCore,
    lavaHeartGlow,
    altCompassGroup,
    compassOuterRing,
    compassInnerRing,
    compassNeedle,
    smeltCrystalGroup,
    smeltCrystalNodes,
    cu,
    cuD,
    coal,
    magmaHot,
    vis,
    visorGlow,
    beltGlow,
    runWeight: 0,
    runPhase: 0,
    airWeight: 0,
    slideWeight: 0,
    landSquash: 0,
    doubleJumpSpin: 0,
    wasGrounded: 1,
    prevDoubleJumps: 0,
    prevX: 0,
    prevZ: 0,
    prevFacing: 0,
    turnBank: 0,
    slideSparkAccum: 0,
    coalStepAccum: 0,
    iceSlideAccum: 0,
    appliedHeroId: ''
  };
})();

/**
 * Обновляет процедурную анимацию главного героя «Угленосец» и 3D-эффекты экипированных предметов:
 * - плавный переход Покой ↔ Бег с учётом реальной скорости и наклоном в виражах;
 * - фазы прыжка (отталкивание, полёт вверх, падение, сальто/крутка двойного прыжка и амортизация приземления);
 * - низкий боевой подкат (Shift) с вытянутой вперёд ногой, разворотом корпуса и снопом искр/кристаллов льда;
 * - визуализация собранных предметов (Угольный сапог, Ледяная подошва, Громовой пояс, Лавовое сердце, Компас высоты, Плавильный кристалл).
 * @param {number} dt
 */
function updatePlayerAnimation(dt) {
  if (!state || !state.player) return;
  const p = state.player;
  const owned = state.itemsOwned || {};
  const time = state.elapsedTime;
  const rig = heroRig;

  // Цветовой акцент брони под выбранного героя гильдии
  if (rig.appliedHeroId !== state.heroId) {
    rig.appliedHeroId = state.heroId;
    if (state.heroId === 'pil') {
      rig.cu.color.setHex(0x467285);
      rig.cuD.color.setHex(0x2d4d5c);
    } else if (state.heroId === 'smi') {
      rig.cu.color.setHex(0x6e5842);
      rig.cuD.color.setHex(0x4a3928);
    } else if (state.heroId === 'ash') {
      rig.cu.color.setHex(0x6e3b38);
      rig.cuD.color.setHex(0x472321);
    } else if (state.heroId === 'hun') {
      rig.cu.color.setHex(0x426652);
      rig.cuD.color.setHex(0x294234);
    } else {
      rig.cu.color.setHex(0x4f7a69);
      rig.cuD.color.setHex(0x35574b);
    }
  }

  // Оценка горизонтальной скорости и угловой скорости поворота
  const safeDt = Math.max(0.001, dt);
  const dx = p.x - rig.prevX;
  const dz = p.z - rig.prevZ;
  rig.prevX = p.x;
  rig.prevZ = p.z;

  const horizDist = Math.min(0.6, hypot2D(dx, dz));
  const horizSpeed = horizDist / safeDt;
  const isMovingHoriz = horizSpeed > 0.45 && state.slideTimer <= 0;

  const facingDelta = angleDiff(state.facingAngle, rig.prevFacing);
  rig.prevFacing = state.facingAngle;
  const targetBank = Math.max(-0.26, Math.min(0.26, (-facingDelta / safeDt) * 0.032));
  rig.turnBank += (targetBank - rig.turnBank) * Math.min(1, safeDt * 10);

  // Отслеживание приземления и двойного прыжка
  if (p.isGrounded && !rig.wasGrounded) {
    rig.landSquash = 1.0;
  }
  if (!p.isGrounded && p.doubleJumpsUsed > rig.prevDoubleJumps) {
    rig.doubleJumpSpin = 1.0;
    spawnSparkBurst(p.x, p.y + 0.3, p.z, 14, 'takeoff');
  }
  rig.wasGrounded = p.isGrounded;
  rig.prevDoubleJumps = p.doubleJumpsUsed;

  rig.landSquash = Math.max(0, rig.landSquash - safeDt * 4.2);
  rig.doubleJumpSpin = Math.max(0, rig.doubleJumpSpin - safeDt * 2.8);

  // Веса состояний: бег, воздух, подкат
  const targetRun = isMovingHoriz && p.isGrounded ? Math.min(1, horizSpeed / 5.5) : 0;
  rig.runWeight += (targetRun - rig.runWeight) * Math.min(1, safeDt * 10);

  const targetAir = p.isGrounded ? 0 : 1;
  rig.airWeight += (targetAir - rig.airWeight) * Math.min(1, safeDt * 14);

  const targetSlide = state.slideTimer > 0 ? 1 : 0;
  rig.slideWeight += (targetSlide - rig.slideWeight) * Math.min(1, safeDt * 16);

  // Фаза шага пропорциональна скорости бега
  const stepRate = 8.5 + Math.min(6, horizSpeed * 0.55);
  rig.runPhase += safeDt * stepRate * (0.25 + 0.75 * rig.runWeight);

  const wRun = rig.runWeight * (1 - rig.airWeight) * (1 - rig.slideWeight);
  const wAir = rig.airWeight * (1 - rig.slideWeight);
  const wSlide = rig.slideWeight;
  const ph = rig.runPhase;
  const br = Math.sin(time * 2.1);

  // 1. Базовая поза покоя + бега
  let heroY = Math.abs(Math.sin(ph)) * 0.085 * wRun;
  let leanX = 0.03 * br * (1 - wRun) + 0.24 * wRun;
  let leanY = Math.sin(ph) * 0.16 * wRun;
  let leanZ = rig.turnBank * (0.4 + 0.6 * wRun);

  let headX = -0.14 * wRun + 0.03 * Math.cos(time * 1.6) * (1 - wRun);
  let headY = Math.sin(time * 0.65) * 0.18 * (1 - wRun) - Math.sin(ph) * 0.15 * wRun;
  let headZ = -leanZ * 0.5;

  let leg0HipX = -0.92 * Math.sin(ph) * wRun;
  let leg1HipX = -0.92 * Math.sin(ph + Math.PI) * wRun;
  let leg0HipZ = 0;
  let leg1HipZ = 0;
  let leg0KneeX = 0.04 + (0.12 + 1.48 * Math.max(0, Math.cos(ph))) * wRun;
  let leg1KneeX = 0.04 + (0.12 + 1.48 * Math.max(0, Math.cos(ph + Math.PI))) * wRun;

  let arm0X = Math.sin(time * 1.8) * 0.04 * (1 - wRun) + 0.95 * Math.sin(ph) * wRun;
  let arm1X = Math.sin(time * 1.8 + 1) * 0.04 * (1 - wRun) + 0.95 * Math.sin(ph + Math.PI) * wRun;
  let arm0Z = 0.1 * (1 - wRun) + 0.07 * wRun;
  let arm1Z = -0.1 * (1 - wRun) - 0.07 * wRun;
  let elb0X = -0.22 * (1 - wRun) + (-1.18 + 0.36 * Math.sin(ph)) * wRun;
  let elb1X = -0.22 * (1 - wRun) + (-1.18 + 0.36 * Math.sin(ph + Math.PI)) * wRun;

  // 2. Амортизация приземления (Squash & Rebound)
  if (rig.landSquash > 0 && wAir < 0.5) {
    const sq = Math.sin(rig.landSquash * Math.PI);
    heroY -= 0.18 * sq;
    leanX += 0.28 * sq;
    headX += 0.18 * sq;
    leg0HipX -= 0.45 * sq;
    leg1HipX -= 0.45 * sq;
    leg0KneeX += 0.95 * sq;
    leg1KneeX += 0.95 * sq;
    arm0X += 0.45 * sq;
    arm1X += 0.45 * sq;
    arm0Z += 0.18 * sq;
    arm1Z -= 0.18 * sq;
  }

  // 3. Поза прыжка и полёта в воздухе (взлёт, вершина, падение и крутка двойного прыжка)
  if (wAir > 0.001) {
    const vyFactor = Math.max(-1, Math.min(1, p.vy / 8.5));
    const riseBlend = (vyFactor + 1) * 0.5;

    const airLeanX = lerp(0.28, -0.14, riseBlend) + Math.sin(rig.doubleJumpSpin * Math.PI) * 0.55;
    const airLeanY = Math.sin(rig.doubleJumpSpin * TWO_PI) * 0.65;
    const airHeadX = lerp(0.26, -0.18, riseBlend);

    const airLeg0HipX = lerp(-0.55, -0.95, riseBlend);
    const airLeg0KneeX = lerp(0.85, 1.55, riseBlend);
    const airLeg1HipX = lerp(-0.35, 0.38, riseBlend);
    const airLeg1KneeX = lerp(0.65, 0.35, riseBlend);

    const airArm0X = lerp(-0.35, -1.25, riseBlend);
    const airArm1X = lerp(-0.2, -1.05, riseBlend);
    const airArm0Z = lerp(0.42, 0.22, riseBlend);
    const airArm1Z = lerp(-0.42, -0.22, riseBlend);
    const airElb0X = lerp(-0.55, -0.95, riseBlend);
    const airElb1X = lerp(-0.55, -0.85, riseBlend);

    heroY = lerp(heroY, 0.04, wAir);
    leanX = lerp(leanX, airLeanX, wAir);
    leanY = lerp(leanY, airLeanY, wAir);
    headX = lerp(headX, airHeadX, wAir);
    headY = lerp(headY, 0, wAir);
    leg0HipX = lerp(leg0HipX, airLeg0HipX, wAir);
    leg0KneeX = lerp(leg0KneeX, airLeg0KneeX, wAir);
    leg1HipX = lerp(leg1HipX, airLeg1HipX, wAir);
    leg1KneeX = lerp(leg1KneeX, airLeg1KneeX, wAir);
    arm0X = lerp(arm0X, airArm0X, wAir);
    arm1X = lerp(arm1X, airArm1X, wAir);
    arm0Z = lerp(arm0Z, airArm0Z, wAir);
    arm1Z = lerp(arm1Z, airArm1Z, wAir);
    elb0X = lerp(elb0X, airElb0X, wAir);
    elb1X = lerp(elb1X, airElb1X, wAir);
  }

  // 4. Поза низкого подката (Slide — Shift)
  if (wSlide > 0.001) {
    heroY = lerp(heroY, -0.52, wSlide);
    leanX = lerp(leanX, -0.68, wSlide);
    leanY = lerp(leanY, 0.36, wSlide);
    leanZ = lerp(leanZ, -0.2, wSlide);
    headX = lerp(headX, 0.56, wSlide);
    headY = lerp(headY, -0.34, wSlide);
    headZ = lerp(headZ, 0.14, wSlide);

    leg0HipX = lerp(leg0HipX, -1.22, wSlide);
    leg0HipZ = lerp(leg0HipZ, 0.14, wSlide);
    leg0KneeX = lerp(leg0KneeX, 0.18, wSlide);

    leg1HipX = lerp(leg1HipX, -0.32, wSlide);
    leg1HipZ = lerp(leg1HipZ, -0.34, wSlide);
    leg1KneeX = lerp(leg1KneeX, 2.08, wSlide);

    arm0X = lerp(arm0X, 0.72, wSlide);
    arm0Z = lerp(arm0Z, 0.46, wSlide);
    elb0X = lerp(elb0X, -0.32, wSlide);

    arm1X = lerp(arm1X, -0.88, wSlide);
    arm1Z = lerp(arm1Z, -0.32, wSlide);
    elb1X = lerp(elb1X, -1.25, wSlide);

    // Искры из-под подкованных сапог и 3D-кристаллы льда во время подката
    rig.slideSparkAccum += safeDt * 35;
    if (rig.slideSparkAccum >= 1) {
      rig.slideSparkAccum -= 1;
      spawnSparkBurst(p.x, p.y + 0.08, p.z, owned.coal ? 4 : 2, 'land');
    }
    if (owned.ice && typeof spawnFrostSlideCrystal === 'function') {
      rig.iceSlideAccum += safeDt * 18;
      if (rig.iceSlideAccum >= 1) {
        rig.iceSlideAccum -= 1;
        spawnFrostSlideCrystal(p.x, p.y, p.z, state.facingAngle);
      }
    }
  } else {
    rig.slideSparkAccum = 0;
    rig.iceSlideAccum = 0;
  }

  // Применяем вычисленные углы и смещения к скелету Угленосца
  rig.hero.position.y = heroY;
  rig.lean.rotation.set(leanX, leanY, leanZ);
  rig.lean.scale.y = 1 + 0.008 * br * (1 - wRun) * (1 - wSlide);
  rig.hd.rotation.set(headX, headY, headZ);

  rig.legs[0].h.rotation.set(leg0HipX, 0, leg0HipZ);
  rig.legs[0].k.rotation.x = leg0KneeX;
  rig.legs[1].h.rotation.set(leg1HipX, 0, leg1HipZ);
  rig.legs[1].k.rotation.x = leg1KneeX;

  rig.arms[0].a.rotation.set(arm0X, 0, arm0Z);
  rig.arms[0].e.rotation.x = elb0X;
  rig.arms[1].a.rotation.set(arm1X, 0, arm1Z);
  rig.arms[1].e.rotation.x = elb1X;

  // 5. Анимация 3D-экипировки предметов на Угленосце
  const coalStacks = owned.coal | 0;
  for (let i = 0; i < rig.coalBootMods.length; i++) {
    const mod = rig.coalBootMods[i];
    mod.group.visible = coalStacks > 0;
    if (coalStacks > 0) {
      const bootPulse = 0.55 + 0.22 * Math.sin(time * 9 + i * 1.7) + Math.min(0.25, coalStacks * 0.05);
      mod.glow.material.opacity = bootPulse;
      mod.glow.scale.setScalar(0.48 + Math.min(0.24, coalStacks * 0.04));
    }
  }
  if (coalStacks > 0 && wRun > 0.35 && p.isGrounded) {
    rig.coalStepAccum += safeDt * (10 + coalStacks * 2);
    if (rig.coalStepAccum >= 1) {
      rig.coalStepAccum -= 1;
      spawnSparkBurst(p.x, p.y + 0.05, p.z, 2, 'land');
    }
  }

  const iceStacks = owned.ice | 0;
  for (let i = 0; i < rig.iceSoleMods.length; i++) {
    const mod = rig.iceSoleMods[i];
    mod.group.visible = iceStacks > 0;
    if (iceStacks > 0) {
      mod.glow.material.opacity = 0.48 + 0.18 * Math.sin(time * 6 + i);
    }
  }

  const beltStacks = owned.belt | 0;
  rig.thunderBeltGroup.visible = beltStacks > 0;
  if (beltStacks > 0) {
    const isCharged = (state.totalHitCount || 0) % 5 === 4;
    for (let i = 0; i < rig.thunderBeltCrystals.length; i++) {
      const c = rig.thunderBeltCrystals[i];
      c.rotation.y = time * (isCharged ? 8 : 3) * (i % 2 ? -1 : 1);
      c.position.y = 0.105 + Math.sin(time * 5 + i * 2) * 0.015;
    }
    rig.thunderBeltGlow.material.opacity = isCharged
      ? 0.85 + 0.15 * Math.sin(time * 24)
      : 0.45 + 0.15 * Math.sin(time * 6);
  }

  const heartStacks = owned.heart | 0;
  rig.lavaHeartGroup.visible = heartStacks > 0;
  if (heartStacks > 0) {
    const nearLava = p.y - state.lavaY < 6;
    const beatSpeed = nearLava ? 14 : 6.5;
    const beatScale = 1 + (nearLava ? 0.26 : 0.12) * Math.pow(Math.max(0, Math.sin(time * beatSpeed)), 2);
    rig.lavaHeartCore.scale.setScalar(beatScale);
    rig.lavaHeartGlow.material.opacity = nearLava ? 0.88 : 0.52;
    rig.lavaHeartGlow.scale.setScalar(nearLava ? 0.68 : 0.45);
  }

  const compStacks = owned.comp | 0;
  rig.altCompassGroup.visible = compStacks > 0;
  if (compStacks > 0) {
    const altFactor = 1 + Math.min(3, Math.max(0, (p.y - state.lavaY) / 15));
    rig.compassOuterRing.rotation.y = time * 1.8 * altFactor;
    rig.compassOuterRing.rotation.x = Math.sin(time * 1.2) * 0.35;
    rig.compassInnerRing.rotation.x = time * 2.6 * altFactor;
    rig.compassInnerRing.rotation.z = time * 1.4;
    rig.compassNeedle.rotation.y = -time * 3.2;
  }

  const crysStacks = owned.crys | 0;
  rig.smeltCrystalGroup.visible = crysStacks > 0;
  if (crysStacks > 0) {
    for (let i = 0; i < rig.smeltCrystalNodes.length; i++) {
      const node = rig.smeltCrystalNodes[i];
      const ang = time * 2.2 + (i * TWO_PI) / 3;
      node.position.set(
        Math.cos(ang) * 0.36,
        Math.sin(time * 3.5 + i * 2) * 0.06,
        Math.sin(ang) * 0.22 - 0.08
      );
      node.rotation.y = -ang;
      node.rotation.z = 0.25 * Math.sin(time * 2.5 + i);
    }
  }

  // Вторичное покачивание наспинного орудия, отдача при выстреле и мерцание углей/визора
  const recoil = state.fireMuzzleFlash || 0;
  if (state.fireMuzzleFlash > 0) {
    state.fireMuzzleFlash = Math.max(0, state.fireMuzzleFlash - safeDt * 7.5);
  }
  rig.muzzleFlashGroup.visible = recoil > 0.15;
  if (rig.muzzleFlashGroup.visible) {
    rig.muzzleFlashGroup.scale.setScalar(0.6 + recoil * 0.75);
    rig.muzzleFlashGroup.rotation.y = time * 25;
  }

  rig.gn.position.y = 1.2 - recoil * 0.06;
  rig.gn.rotation.z = -0.42 + Math.sin(ph * 2) * 0.025 * wRun + wSlide * 0.18;
  rig.gn.rotation.x = wSlide * 0.15 - recoil * 0.12;
  rig.coal.emissiveIntensity = 1.25 + 0.42 * Math.sin(time * 7) * Math.sin(time * 3.1);
  rig.magmaHot.emissiveIntensity = 1.85 + 0.55 * Math.sin(time * 9.5) + recoil * 0.8;

  const visorPulse = Math.sin(time * 2.5);
  rig.vis.color.setHSL(0.49, 1, 0.64 + 0.08 * visorPulse);
  rig.visorGlow.material.opacity = 0.48 + 0.14 * visorPulse;
  rig.beltGlow.material.opacity = 0.42 + 0.14 * Math.sin(time * 5.2);
}

/* ---------- 1. Поверхность и 3D-эффекты угрозы снизу (Лава / Метель / Бездна) ---------- */

const LAVA_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
    map: lavaTexture,
    bumpMap: lavaTexture,
    bumpScale: 0.25,
    emissive: 0xff6a15,
    emissiveMap: lavaTexture,
    emissiveIntensity: 2.1,
    roughness: 0.55
  }),
  ice: new THREE.MeshStandardMaterial({
    map: iceLavaTexture,
    bumpMap: iceLavaTexture,
    bumpScale: 0.2,
    emissive: 0x68c4ff,
    emissiveMap: iceLavaTexture,
    emissiveIntensity: 1.35,
    roughness: 0.35
  }),
  void: new THREE.MeshStandardMaterial({
    map: voidLavaTexture,
    emissive: 0x9835ff,
    emissiveMap: voidLavaTexture,
    emissiveIntensity: 1.75,
    roughness: 0.75
  })
};

const lavaMesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), LAVA_MATERIALS.ash);
lavaMesh.rotation.x = -Math.PI / 2;
scene.add(lavaMesh);

const hazardEffectsGroup = new THREE.Group();
scene.add(hazardEffectsGroup);

const hazardAshGroup = new THREE.Group();
const hazardIceGroup = new THREE.Group();
const hazardVoidGroup = new THREE.Group();
hazardEffectsGroup.add(hazardAshGroup, hazardIceGroup, hazardVoidGroup);

// 1A. Детали моря магмы (Пепельная башня)
(function buildAshHazardDetails() {
  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(30.2, 36),
    new THREE.MeshBasicMaterial({
      map: lavaTexture,
      color: 0xffaa30,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.y = 0.08;
  hazardAshGroup.add(glowDisc);
  hazardAshGroup.userData.glowDisc = glowDisc;

  const crustMat = new THREE.MeshStandardMaterial({
    color: 0x240b0d,
    emissive: 0x6a1400,
    emissiveIntensity: 0.65,
    roughness: 0.92,
    flatShading: true
  });
  const crustRocks = [];
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * TWO_PI + (i % 3) * 0.2;
    const radius = 3.8 + (i % 4) * 6.0;
    const rockGeo = new THREE.CylinderGeometry(
      1.1 + (i % 3) * 0.6,
      1.6 + (i % 3) * 0.7,
      0.5,
      7
    );
    const rock = new THREE.Mesh(rockGeo, crustMat);
    rock.position.set(Math.cos(angle) * radius, 0.14, Math.sin(angle) * radius);
    rock.rotation.y = i * 1.1;
    rock.userData = { baseAngle: angle, radius, phase: i * 0.7 };
    hazardAshGroup.add(rock);
    crustRocks.push(rock);
  }
  hazardAshGroup.userData.crustRocks = crustRocks;
})();

// 1B. Детали вихря метели (Ледяная башня)
(function buildIceHazardDetails() {
  const funnelRings = [];
  for (let layer = 0; layer < 4; layer++) {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(2.2 + layer * 4.8, 9.2 + layer * 6.2, 44, 1),
      new THREE.MeshBasicMaterial({
        map: iceLavaTexture,
        color: layer === 0 ? 0xffffff : 0x9cdfff,
        transparent: true,
        opacity: 0.46 - layer * 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.15 + layer * 0.35;
    hazardIceGroup.add(ringMesh);
    funnelRings.push(ringMesh);
  }

  const eyeGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      color: 0xdff8ff,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  eyeGlow.scale.set(28, 8, 1);
  eyeGlow.position.y = 1.2;
  hazardIceGroup.add(eyeGlow);

  hazardIceGroup.userData.funnelRings = funnelRings;
  hazardIceGroup.visible = false;
})();

// 1C. Детали Бездны (Башня Пустоты)
(function buildVoidHazardDetails() {
  const blackHoleCore = new THREE.Mesh(
    new THREE.CircleGeometry(9.8, 44),
    new THREE.MeshBasicMaterial({ color: 0x010003 })
  );
  blackHoleCore.rotation.x = -Math.PI / 2;
  blackHoleCore.position.y = 0.06;
  hazardVoidGroup.add(blackHoleCore);

  const vortexRings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.5 + r * 4.8, 12.0 + r * 6.2, 44),
      new THREE.MeshBasicMaterial({
        map: voidLavaTexture,
        color: r === 0 ? 0xe098ff : r === 1 ? 0xa840ff : 0x6818c8,
        transparent: true,
        opacity: 0.65 - r * 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12 + r * 0.18;
    hazardVoidGroup.add(ring);
    vortexRings.push(ring);
  }

  const abyssStarGeo = new THREE.BufferGeometry();
  const starCount = 56;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const ang = Math.random() * TWO_PI;
    const rad = 3 + Math.random() * 26;
    starPos[i * 3] = Math.cos(ang) * rad;
    starPos[i * 3 + 1] = 0.2 + Math.random() * 1.8;
    starPos[i * 3 + 2] = Math.sin(ang) * rad;
    starCol[i * 3] = 0.85;
    starCol[i * 3 + 1] = 0.65;
    starCol[i * 3 + 2] = 1.0;
  }
  abyssStarGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  abyssStarGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const abyssStars = new THREE.Points(
    abyssStarGeo,
    new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  hazardVoidGroup.add(abyssStars);

  hazardVoidGroup.userData.vortexRings = vortexRings;
  hazardVoidGroup.userData.abyssStars = abyssStars;
  hazardVoidGroup.visible = false;
})();

/* ---------- 2. Цилиндрические внешние стены башни ---------- */

const TOWER_WALL_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ash.map,
    bumpMap: TOWER_WALL_TEXTURES.ash.bump,
    bumpScale: 0.45,
    emissive: 0xff5a14,
    emissiveMap: TOWER_WALL_TEXTURES.ash.emissive,
    emissiveIntensity: 1.45,
    roughness: 0.86,
    metalness: 0.12,
    side: THREE.BackSide
  }),
  ice: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    bumpMap: TOWER_WALL_TEXTURES.ice.bump,
    bumpScale: 0.35,
    emissive: 0x58c4ff,
    emissiveMap: TOWER_WALL_TEXTURES.ice.emissive,
    emissiveIntensity: 1.15,
    roughness: 0.18,
    metalness: 0.28,
    side: THREE.BackSide
  }),
  void: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.void.map,
    bumpMap: TOWER_WALL_TEXTURES.void.bump,
    bumpScale: 0.38,
    emissive: 0xc055ff,
    emissiveMap: TOWER_WALL_TEXTURES.void.emissive,
    emissiveIntensity: 1.65,
    roughness: 0.62,
    metalness: 0.25,
    side: THREE.BackSide
  })
};

const towerWallMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(30.8, 30.8, 220, 36, 1, true),
  TOWER_WALL_MATERIALS.ash
);
towerWallMesh.position.y = 80;
scene.add(towerWallMesh);
towerWallMesh.matrixAutoUpdate = false;
towerWallMesh.updateMatrix();

const iceInnerGlazeMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(29.85, 29.85, 220, 36, 1, true),
  new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    color: 0x90d8ff,
    emissive: 0x2878b8,
    emissiveIntensity: 0.45,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.26,
    side: THREE.BackSide,
    depthWrite: false
  })
);
iceInnerGlazeMesh.position.y = 80;
iceInnerGlazeMesh.visible = false;
scene.add(iceInnerGlazeMesh);
iceInnerGlazeMesh.matrixAutoUpdate = false;
iceInnerGlazeMesh.updateMatrix();

let currentTowerTheme = TOWERS.ash;

/**
 * Анимирует угрозу снизу, пульсацию трещин/рун на стенах и парящие элементы башни.
 */
function updateEnvironmentVisuals(time, dt) {
  hazardEffectsGroup.position.y = lavaMesh.position.y;
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  if (towerId === 'ash') {
    const wallMat = TOWER_WALL_MATERIALS.ash;
    wallMat.emissiveIntensity = 1.35 + Math.sin(time * 2.2) * 0.28;
    const glowDisc = hazardAshGroup.userData.glowDisc;
    if (glowDisc) {
      glowDisc.rotation.z = time * 0.06;
      glowDisc.material.opacity = 0.32 + Math.sin(time * 3.1) * 0.1;
    }
    const crustRocks = hazardAshGroup.userData.crustRocks;
    if (crustRocks) {
      for (let i = 0; i < crustRocks.length; i++) {
        const rock = crustRocks[i];
        const ud = rock.userData;
        const a = ud.baseAngle + time * 0.03 * (i % 2 ? 1 : -1);
        rock.position.x = Math.cos(a) * ud.radius;
        rock.position.z = Math.sin(a) * ud.radius;
        rock.position.y = 0.1 + Math.sin(time * 1.8 + ud.phase) * 0.08;
      }
    }
  } else if (towerId === 'ice') {
    const wallMat = TOWER_WALL_MATERIALS.ice;
    wallMat.emissiveIntensity = 1.05 + Math.sin(time * 1.6) * 0.18;
    const rings = hazardIceGroup.userData.funnelRings;
    if (rings) {
      for (let i = 0; i < rings.length; i++) {
        rings[i].rotation.z = time * (0.55 - i * 0.12) * (i % 2 ? -1 : 1);
      }
    }
  } else if (towerId === 'void') {
    const wallMat = TOWER_WALL_MATERIALS.void;
    wallMat.emissiveIntensity =
      1.45 + Math.sin(time * 2.4) * 0.45 + Math.cos(time * 5.7) * 0.18;
    const vRings = hazardVoidGroup.userData.vortexRings;
    if (vRings) {
      vRings[0].rotation.z = time * 0.7;
      vRings[1].rotation.z = -time * 0.45;
      vRings[2].rotation.z = time * 0.28;
    }
    const abyssStars = hazardVoidGroup.userData.abyssStars;
    if (abyssStars) {
      abyssStars.rotation.y = time * 0.08;
      abyssStars.material.opacity = 0.6 + Math.sin(time * 4.2) * 0.3;
    }
  }

  if (typeof updateTowerDecorAnimations === 'function') {
    updateTowerDecorAnimations(time, dt, towerId);
  }
}

/**
 * Применяет цветовую и визуальную тему выбранной башни к сцене и всем пулам спецэффектов.
 */
function applyTowerTheme(towerConfig) {
  currentTowerTheme = towerConfig;
  const id = towerConfig.id;

  lavaMesh.material = LAVA_MATERIALS[id];
  towerWallMesh.material = TOWER_WALL_MATERIALS[id];
  iceInnerGlazeMesh.visible = id === 'ice';

  hazardAshGroup.visible = id === 'ash';
  hazardIceGroup.visible = id === 'ice';
  hazardVoidGroup.visible = id === 'void';

  scene.background = BACKGROUND_TEXTURES[id];
  scene.fog.color.setHex(towerConfig.fogColor);
  scene.fog.density = towerConfig.fogDensity;

  hemiLight.color.setHex(towerConfig.hemiSkyColor);
  hemiLight.groundColor.setHex(towerConfig.hemiGroundColor);
  if (towerConfig.dirLightColor) {
    dirLight.color.setHex(towerConfig.dirLightColor);
  }
  if (towerConfig.dirLightIntensity !== undefined) {
    dirLight.intensity = towerConfig.dirLightIntensity;
  }
  lavaLight.color.setHex(towerConfig.lavaLightColor);
  if (towerConfig.lavaLightIntensity !== undefined) {
    lavaLight.intensity = towerConfig.lavaLightIntensity;
  }
  if (towerConfig.rimLightColor) {
    rimLight.color.setHex(towerConfig.rimLightColor);
  }

  if (typeof dustMat !== 'undefined' && towerConfig.dustColor) {
    dustMat.color.setHex(towerConfig.dustColor);
    dustMat.size = towerConfig.dustSize || 0.32;
    dustMat.opacity = towerConfig.dustOpacity || 0.6;
  }

  // Перекраска спецэффектов боссов и вражеских снарядов под стихию башни
  if (typeof applyTowerHazardPalette === 'function') {
    applyTowerHazardPalette(id);
  }
}
