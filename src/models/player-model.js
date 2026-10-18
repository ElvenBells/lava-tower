/* ==========================================================================
   Модель главного героя «Угленосец» (Runner · Пепельная гильдия) в плаще,
   мини-модели получаемого оружия (Огненные шары, Орбитальные клинки «Осколки Хранителя»,
   Ударная волна), 3D-модели и эффекты 4 Томов (Жизни, Скорости, Силы, Притяжения),
   3D-модели 6 реликвий (Угольный сапог, Ледяная подошва, Громовой пояс,
   Лавовое сердце, Поясной Компас высоты, Плавильный кристалл) и окружение башни
   ========================================================================== */

const playerMesh = new BABYLON.Group();
scene.add(playerMesh);

/* ---------- 0. Детализированная 3D-модель героя, плаща, мини-оружия, томов и реликвий ---------- */

const heroRig = (function buildCoalbearerHero() {
  const T = BABYLON;
  const PI = Math.PI;
  const L = (color, opts) =>
    new T.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...opts });

  const cu = L(0x4f7a69, { roughness: 0.5, metalness: 0.3 });
  const cuD = L(0x35574b, { roughness: 0.5, metalness: 0.35 });
  const cloakMat = L(0x231f28, { roughness: 0.88, metalness: 0.08, side: T.DoubleSide });
  const cloakTrimMat = L(0x3b3242, { roughness: 0.75, metalness: 0.18, side: T.DoubleSide });
  const lea = L(0x5a371e, { roughness: 0.9, metalness: 0 });
  const leaD = L(0x2f1c11, { roughness: 0.95, metalness: 0 });
  const st = L(0xaab0b8, { roughness: 0.32, metalness: 0.65 });
  const stD = L(0x3a3e47, { roughness: 0.38, metalness: 0.58 });
  const brassMat = L(0xd8a848, {
    emissive: 0x583800,
    emissiveIntensity: 0.45,
    roughness: 0.28,
    metalness: 0.78
  });

  // Материалы лавовой корки и раскалённого ядра (для Угольного сапога, Лавового сердца и мини-Огненного шара)
  const lavaCrustMat = L(0xffffff, {
    map: TEXTURES.crackedLavaCrust,
    bumpMap: TEXTURES.crackedLavaCrust,
    bumpScale: 0.08,
    emissive: 0xff5808,
    emissiveMap: TEXTURES.crackedLavaCrust,
    emissiveIntensity: 1.65,
    roughness: 0.65,
    metalness: 0.18
  });
  const coal = L(0x2a1008, {
    emissive: 0xff4a10,
    emissiveIntensity: 1.35,
    flatShading: true
  });
  const magmaHot = L(0xffe078, {
    emissive: 0xff6a00,
    emissiveIntensity: 2.3,
    roughness: 0.16,
    flatShading: true
  });

  // Материал ледяной пластины с внутренними трещинами (для Ледяной подошвы)
  const iceCrackMat = L(0xd8f6ff, {
    map: TEXTURES.iceSoleCrack,
    emissive: 0x38b8ff,
    emissiveMap: TEXTURES.iceSoleCrack,
    emissiveIntensity: 1.55,
    roughness: 0.1,
    metalness: 0.35,
    transparent: true,
    opacity: 0.92,
    flatShading: true
  });
  const frostMat = L(0xc8f4ff, {
    emissive: 0x38b8ff,
    emissiveIntensity: 1.5,
    roughness: 0.12,
    metalness: 0.4,
    flatShading: true
  });

  // Материалы жил грозового элементаля (для Громового пояса)
  const stormVeinMat = L(0xfff6b8, {
    emissive: 0xffd848,
    emissiveIntensity: 1.4,
    roughness: 0.18,
    metalness: 0.35
  });
  const stormGemMat = L(0xe8f8ff, {
    emissive: 0x70d8ff,
    emissiveIntensity: 2.0,
    roughness: 0.1,
    metalness: 0.5,
    flatShading: true
  });

  // Материалы для Плавильного кристалла и Компаса высоты
  const smeltAmberMat = L(0xffb840, {
    emissive: 0xff6200,
    emissiveIntensity: 1.85,
    roughness: 0.14,
    metalness: 0.25,
    transparent: true,
    opacity: 0.94,
    flatShading: true
  });
  const compassTurquoiseMat = L(0x98fff8, {
    emissive: 0x18f0dc,
    emissiveIntensity: 2.2,
    roughness: 0.12,
    metalness: 0.3,
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
  const ico = (r, d = 0) => new T.IcosahedronGeometry(r, d);
  const oct = (r) => new T.OctahedronGeometry(r, 0);

  // Вспомогательная фабрика мини-модели «Осколка Хранителя» (по мудборду 1: узкий сплюснутый парящий клинок-осколок)
  function createGuardianShardMesh(scaleMul, coreMat) {
    const shardGroup = new T.Group();
    // Внешние скошенные серебристо-стальные грани лезвия
    const bladeBody = makeMesh(
      cn(0.044, 0.56, 4),
      st,
      [0, 0.08, 0],
      shardGroup,
      [0.95, 1.0, 0.24]
    );
    bladeBody.rotation.y = PI / 4;
    // Нижний хвостовик-осколок
    const bladeTail = makeMesh(
      cn(0.036, 0.22, 4),
      stD,
      [0, -0.26, 0],
      shardGroup,
      [0.85, 1.0, 0.26]
    );
    bladeTail.rotation.set(PI, PI / 4, 0);
    // Парные боковые крылья-зубцы у основания лезвия (как на чертеже «Осколки Хранителя»)
    [-1, 1].forEach((s) => {
      const wing = makeMesh(
        cn(0.022, 0.18, 4),
        st,
        [s * 0.042, -0.08, 0],
        shardGroup,
        [0.7, 1.0, 0.25]
      );
      wing.rotation.z = s * 0.42;
      const notch = makeMesh(
        cn(0.016, 0.12, 4),
        coreMat,
        [s * 0.032, -0.15, 0],
        shardGroup,
        [0.6, 1.0, 0.25]
      );
      notch.rotation.z = -s * 2.45;
    });
    // Светящийся кристаллический дол-сердцевина вдоль оси клинка
    makeMesh(oct(0.034), coreMat, [0, 0.02, 0], shardGroup, [0.55, 5.2, 0.36]);
    shardGroup.scale.setScalar(scaleMul);
    return shardGroup;
  }

  // Вспомогательная фабрика 3D-фолианта (Тома) по мудборду 3
  function createTome3DModel(tomeKey) {
    const g = new T.Group();
    const isOpen = tomeKey === 'spd';
    const coverColors = {
      hp: 0x7c151d,
      spd: 0x125e3e,
      dmg: 0xa84212,
      mag: 0x11586e
    };
    const glowColors = {
      hp: 0xff2840,
      spd: 0x45ff88,
      dmg: 0xff8818,
      mag: 0x38f0ff
    };
    const trimMat = tomeKey === 'mag' || tomeKey === 'hp' ? st : brassMat;
    const coverMat = L(coverColors[tomeKey], { roughness: 0.65, metalness: 0.18 });
    const pageMat = L(0xf4ead2, {
      emissive: glowColors[tomeKey],
      emissiveIntensity: 0.45,
      roughness: 0.5
    });
    const emblemGlowMat = L(0xffffff, {
      color: glowColors[tomeKey],
      emissive: glowColors[tomeKey],
      emissiveIntensity: 2.1,
      roughness: 0.15,
      flatShading: true
    });

    if (isOpen) {
      // Раскрытый Том Скорости со светящимися зелёными страницами и пером ветра
      makeMesh(cy(0.016, 0.016, 0.17, 8), coverMat, [0, 0, 0], g);
      [-1, 1].forEach((s) => {
        const wing = makeGroup([0, 0, 0], g);
        wing.rotation.y = s * 0.32;
        makeMesh(bx(0.11, 0.165, 0.012), coverMat, [s * 0.058, 0, 0], wing);
        makeMesh(bx(0.098, 0.152, 0.016), pageMat, [s * 0.054, 0, 0.01], wing);
        // Золотая окантовка углов
        [-1, 1].forEach((cySign) => {
          makeMesh(
            bx(0.026, 0.026, 0.016),
            brassMat,
            [s * 0.102, cySign * 0.072, 0.002],
            wing
          );
        });
      });
      // Светящиеся рунные строки и символ пера/ветра над раскрытыми страницами
      for (let r = -2; r <= 2; r++) {
        makeMesh(
          bx(0.065, 0.006, 0.004),
          emblemGlowMat,
          [0.052, r * 0.022, 0.022],
          g
        );
      }
      const feather = makeMesh(oct(0.028), emblemGlowMat, [-0.052, 0, 0.022], g, [0.55, 1.85, 0.25]);
      feather.rotation.z = 0.35;
    } else {
      // Закрытый массивный фолиант в кожаном переплёте с коваными наугольниками
      makeMesh(bx(0.135, 0.175, 0.044), pageMat, [0.004, 0, 0], g);
      makeMesh(bx(0.142, 0.185, 0.01), coverMat, [0, 0, 0.022], g);
      makeMesh(bx(0.142, 0.185, 0.01), coverMat, [0, 0, -0.022], g);
      makeMesh(cy(0.026, 0.026, 0.186, 8), coverMat, [-0.068, 0, 0], g);
      // Бинты на корешке
      [-0.06, 0, 0.06].forEach((by) => {
        makeMesh(cy(0.029, 0.029, 0.012, 8), trimMat, [-0.068, by, 0], g);
      });
      // 4 кованых наугольника на лицевой обложке
      [-1, 1].forEach((sx) => {
        [-1, 1].forEach((sy) => {
          makeMesh(
            bx(0.036, 0.036, 0.014),
            trimMat,
            [sx * 0.054, sy * 0.075, 0.025],
            g
          );
        });
      });

      if (tomeKey === 'hp') {
        // Том Жизни: рубиновое сердце в стальной оправе на обложке + кровавая закладка
        makeMesh(oct(0.036), emblemGlowMat, [0.005, -0.006, 0.03], g, [1.0, 1.15, 0.45]);
        makeMesh(sp(0.022, 8, 6), emblemGlowMat, [-0.012, 0.014, 0.03], g, [1, 1, 0.5]);
        makeMesh(sp(0.022, 8, 6), emblemGlowMat, [0.022, 0.014, 0.03], g, [1, 1, 0.5]);
        makeMesh(bx(0.016, 0.045, 0.006), emblemGlowMat, [0.02, -0.105, 0], g);
      } else if (tomeKey === 'dmg') {
        // Том Силы: рельефный кованый боевой молот кузнеца на обложке
        makeMesh(cy(0.009, 0.011, 0.095, 6), st, [0.005, -0.012, 0.03], g);
        makeMesh(bx(0.068, 0.036, 0.022), st, [0.005, 0.028, 0.032], g);
        makeMesh(bx(0.074, 0.012, 0.024), emblemGlowMat, [0.005, 0.028, 0.033], g);
      } else if (tomeKey === 'mag') {
        // Том Притяжения: светящаяся бирюзовая спираль-галактика на обложке
        makeMesh(
          new T.TorusGeometry(0.038, 0.006, 6, 18),
          emblemGlowMat,
          [0.005, 0, 0.03],
          g
        );
        makeMesh(
          new T.TorusGeometry(0.022, 0.005, 6, 14),
          emblemGlowMat,
          [0.005, 0, 0.032],
          g
        );
        makeMesh(oct(0.016), emblemGlowMat, [0.005, 0, 0.034], g);
      }
    }

    const halo = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.glowWhite,
        color: glowColors[tomeKey],
        transparent: true,
        opacity: 0.55,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    halo.scale.setScalar(0.34);
    g.add(halo);
    g.userData = { halo, emblemGlowMat };
    return g;
  }

  const hero = makeGroup([0, 0, 0], playerMesh);
  const lean = makeGroup([0, 0.95, 0], hero);
  const up = makeGroup([0, -0.95, 0], lean);

  const coalBootMods = [];
  const iceSoleMods = [];

  // Ноги с тазобедренным ('h') и коленным ('k') суставами, базовыми сапогами и слотами сапог-реликвий
  const legs = [1, -1].map((s) => {
    const h = makeGroup([s * 0.1, 0.95, 0], hero);
    makeMesh(cy(0.088, 0.066, 0.46), cu, [0, -0.23, 0], h);
    makeMesh(cy(0.093, 0.093, 0.035), lea, [0, -0.17, 0], h);
    const k = makeGroup([0, -0.46, 0], h);
    makeMesh(sp(0.07), stD, [0, 0, 0.025], k, [1, 1, 0.8]);
    makeMesh(cy(0.062, 0.048, 0.4), cu, [0, -0.2, 0], k);
    makeMesh(cy(0.068, 0.064, 0.16), lea, [0, -0.31, 0], k);
    makeMesh(cy(0.07, 0.07, 0.025), st, [0, -0.24, 0], k);

    // Базовый кожаный сапог
    makeMesh(bx(0.116, 0.086, 0.22), leaD, [0, -0.442, 0.045], k);
    makeMesh(bx(0.124, 0.022, 0.236), stD, [0, -0.482, 0.046], k);
    makeMesh(sp(0.058), lea, [0, -0.448, 0.152], k, [1.02, 0.82, 1.05]);
    makeMesh(bx(0.088, 0.036, 0.09), stD, [0, -0.402, 0.065], k).rotation.x = 0.32;

    // 1. Экипировка «УГОЛЬНЫЙ САПОГ» (по мудборду 4: массивный ботинок из потрескавшейся лавовой корки,
    // 3 бронзовых ремня с пряжками и заклёпками, вечно раскалённая протекторная подошва)
    const coalBoot = makeGroup([0, 0, 0], k);
    // Голенище и стопа из потрескавшейся лавовой корки
    makeMesh(cy(0.084, 0.076, 0.22, 8), lavaCrustMat, [0, -0.31, 0.015], coalBoot);
    makeMesh(bx(0.136, 0.096, 0.245), lavaCrustMat, [0, -0.435, 0.055], coalBoot);
    makeMesh(sp(0.068, 10, 8), lavaCrustMat, [0, -0.438, 0.168], coalBoot, [1.08, 0.88, 1.12]);
    // 3 кованых бронзовых ремня-перехвата с пряжками (как на мудборде «Угольный сапог»)
    [-0.23, -0.31, -0.385].forEach((strapY, idx) => {
      const strap = makeMesh(
        cy(0.088 - idx * 0.003, 0.088 - idx * 0.003, 0.028, 10),
        brassMat,
        [0, strapY, 0.018 + idx * 0.008],
        coalBoot
      );
      strap.rotation.x = idx === 2 ? 0.28 : 0.05;
      // Пряжка сбоку
      makeMesh(
        bx(0.022, 0.036, 0.032),
        st,
        [s * 0.086, strapY, 0.025 + idx * 0.01],
        coalBoot
      );
    });
    // Кованая бронзовая накладка на подъёме стопы
    const instepPlate = makeMesh(
      bx(0.138, 0.028, 0.11),
      brassMat,
      [0, -0.395, 0.095],
      coalBoot
    );
    instepPlate.rotation.x = 0.38;
    // Вечно горячая массивная подошва с раскалённым шевронным протектором
    makeMesh(bx(0.148, 0.028, 0.272), coal, [0, -0.482, 0.056], coalBoot);
    makeMesh(bx(0.154, 0.016, 0.278), magmaHot, [0, -0.492, 0.056], coalBoot);
    for (let tr = -2; tr <= 2; tr++) {
      makeMesh(
        bx(0.158, 0.012, 0.024),
        magmaHot,
        [0, -0.498, 0.055 + tr * 0.046],
        coalBoot
      );
    }
    const bootGlow = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.coal,
        color: 0xff6a18,
        transparent: true,
        opacity: 0.72,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    bootGlow.position.set(0, -0.44, 0.06);
    bootGlow.scale.setScalar(0.54);
    coalBoot.add(bootGlow);
    coalBoot.visible = false;
    coalBootMods.push({ group: coalBoot, glow: bootGlow });

    // 2. Экипировка «ЛЕДЯНАЯ ПОДОШВА» (по мудборду 2: тонкая пластина бледно-голубого льда под подошвой
    // + массивный ледяной панцирь-мысок с внутренними трещинами и сосульками по ранту)
    const iceSole = makeGroup([0, 0, 0], k);
    // Ледяная пластина-подошва с внутренними трещинами и протектором
    makeMesh(bx(0.146, 0.028, 0.276), iceCrackMat, [0, -0.492, 0.058], iceSole);
    // Гранёный ледяной мысок, закрывающий переднюю часть ботинка (как на крупном плане мудборда)
    const iceToeCap = makeMesh(
      ico(0.078, 1),
      iceCrackMat,
      [0, -0.435, 0.145],
      iceSole,
      [1.06, 0.78, 1.28]
    );
    iceToeCap.rotation.x = 0.18;
    // Кожаный ремень поверх ледяного панциря и мелкие сосульки по нижнему ранту
    const iceStrap = makeMesh(bx(0.138, 0.024, 0.042), leaD, [0, -0.405, 0.085], iceSole);
    iceStrap.rotation.x = 0.35;
    for (let ic = -2; ic <= 2; ic++) {
      const icicle = makeMesh(
        cn(0.01, 0.036, 4),
        frostMat,
        [ic * 0.03, -0.485, 0.215 - Math.abs(ic) * 0.018],
        iceSole
      );
      icicle.rotation.x = PI;
    }
    const iceBootGlow = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.glowIce,
        color: 0x80ecff,
        transparent: true,
        opacity: 0.68,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    iceBootGlow.position.set(0, -0.45, 0.09);
    iceBootGlow.scale.setScalar(0.52);
    iceSole.add(iceBootGlow);
    iceSole.visible = false;
    iceSoleMods.push({ group: iceSole, glow: iceBootGlow });

    return { h, k };
  });

  // Торс, туника, кираса, воротник и перекрещенные кожаные ремни
  makeMesh(cy(0.2, 0.18, 0.16, 14), cu, [0, 0.93, 0], up, [1, 1, 0.74]);
  makeMesh(cy(0.235, 0.19, 0.56, 16), cu, [0, 1.24, 0], up, [1, 1, 0.72]);
  makeMesh(sp(0.235, 16, 8), cu, [0, 1.52, 0], up, [1, 0.35, 0.72]);
  makeMesh(cy(0.238, 0.238, 0.13, 18), lea, [0, 0.99, 0], up, [1, 1, 0.78]);
  makeMesh(cy(0.07, 0.085, 0.14), cuD, [0, 1.57, 0], up);
  makeMesh(new T.TorusGeometry(0.1, 0.02, 6, 16), st, [0, 1.55, 0], up).rotation.x = PI / 2;

  // Развевающийся плащ и оплечье с бронзовой фибулой (вместо ружья за спиной — как на всех мудбордах!)
  const cloakGroup = makeGroup([0, 1.52, -0.12], up);
  // Оплечье-пелерина на плечах
  makeMesh(
    cy(0.24, 0.31, 0.22, 14, 1, true, -PI * 0.75, PI * 1.5),
    cloakMat,
    [0, -0.04, 0.08],
    cloakGroup,
    [1.08, 1, 0.82]
  );
  // Бронзовая застёжка-фибула плаща на груди у ворота
  makeMesh(cy(0.038, 0.038, 0.018, 12), brassMat, [0, -0.03, 0.29], cloakGroup).rotation.x = PI / 2;
  makeMesh(oct(0.022), compassTurquoiseMat, [0, -0.03, 0.30], cloakGroup);

  // Articulated шарнир полотна плаща за спиной (развевается при беге, прыжках и рывке)
  const cloakSwingPivot = makeGroup([0, -0.05, -0.09], cloakGroup);
  // Верхняя и нижняя секции спинного плаща с клиновидными фалдами
  makeMesh(bx(0.46, 0.48, 0.022), cloakMat, [0, -0.24, -0.02], cloakSwingPivot);
  [-1, 1].forEach((s) => {
    const sideFold = makeMesh(
      bx(0.14, 0.52, 0.02),
      cloakTrimMat,
      [s * 0.22, -0.25, 0.02],
      cloakSwingPivot
    );
    sideFold.rotation.y = -s * 0.28;
  });
  const cloakLowerPivot = makeGroup([0, -0.46, -0.02], cloakSwingPivot);
  makeMesh(bx(0.54, 0.56, 0.018), cloakMat, [0, -0.26, -0.01], cloakLowerPivot);
  [-1, 0, 1].forEach((tailIdx) => {
    const tail = makeMesh(
      cn(0.11, 0.24, 4),
      cloakTrimMat,
      [tailIdx * 0.17, -0.58, -0.01],
      cloakLowerPivot,
      [1.1, 1, 0.2]
    );
    tail.rotation.x = PI;
  });

  [1, -1].forEach((s) => {
    const g = makeGroup([0, 1.26, 0], up);
    g.rotation.z = s * 0.5;
    makeMesh(new T.TorusGeometry(0.262, 0.017, 6, 32), lea, [0, 0, 0], g, [1, 0.645, 1]).rotation.x =
      PI / 2;
  });

  // Пряжка базового пояса и кожаные подсумки
  makeMesh(bx(0.095, 0.095, 0.03), stD, [0, 0.99, 0.2], up);
  [
    [0.188, 0.153, 0.7],
    [-0.188, 0.153, -0.7],
    [-0.268, 0, -1.57]
  ].forEach(([x, z, r]) => {
    const p = makeGroup([x, 0.96, z], up);
    p.rotation.y = r;
    makeMesh(bx(0.095, 0.105, 0.055), lea, [0, 0, 0], p);
    makeMesh(bx(0.098, 0.024, 0.058), stD, [0, 0.03, 0], p);
  });

  const beltGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowWarm,
      color: 0xff6a20,
      transparent: true,
      opacity: 0.38,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  beltGlow.position.set(0, 0.96, 0.28);
  beltGlow.scale.setScalar(0.55);
  up.add(beltGlow);

  // 3. Экипировка «ГРОМОВОЙ ПОЯС» (по мудборду 7: тёмный кожаный пояс с рунными пластинами,
  // оплетённый светящимися жёлто-белыми жилами грозового элементаля, с ромбовидным кристаллом в пряжке
  // и 4 стадиями накопления заряда: 1-го, 2-го, 3-го, 5-го удара)
  const thunderBeltGroup = makeGroup([0, 0.99, 0], up);
  // Основа тёмного кожаного пояса с рунными коваными накладками
  const beltBaseTorus = makeMesh(
    new T.TorusGeometry(0.246, 0.032, 8, 28),
    leaD,
    [0, 0, 0],
    thunderBeltGroup,
    [1.02, 0.78, 1]
  );
  beltBaseTorus.rotation.x = PI / 2;
  for (let cl = 0; cl < 8; cl++) {
    const a = (cl / 8) * PI * 2 + PI / 8;
    const clasp = makeMesh(
      bx(0.045, 0.072, 0.028),
      stD,
      [Math.cos(a) * 0.248, 0, Math.sin(a) * 0.194],
      thunderBeltGroup
    );
    clasp.rotation.y = -a + PI / 2;
  }
  // Плетёные светящиеся жёлто-белые жилы грозового элементаля (2 переплетающихся волнистых контура)
  const thunderBeltVeins = [];
  for (let strand = 0; strand < 2; strand++) {
    const strandSign = strand === 0 ? 1 : -1;
    for (let seg = 0; seg < 16; seg++) {
      const a = (seg / 16) * PI * 2;
      const waveY = Math.sin(a * 4 + strand * PI) * 0.028;
      const radOut = 1.03 + Math.cos(a * 4 + strand * PI) * 0.025;
      const veinSeg = makeMesh(
        cy(0.011, 0.011, 0.095, 6),
        stormVeinMat,
        [Math.cos(a) * 0.252 * radOut, waveY, Math.sin(a) * 0.198 * radOut],
        thunderBeltGroup
      );
      veinSeg.rotation.set(strandSign * 0.35, -a, PI / 2 + Math.cos(a * 4) * 0.32);
      thunderBeltVeins.push(veinSeg);
    }
  }
  // Центральный ромбовидный грозовой кристалл в кованой оправе пряжки
  makeMesh(oct(0.052), stD, [0, 0, 0.205], thunderBeltGroup, [0.95, 1.35, 0.55]);
  const thunderBeltCenterGem = makeMesh(
    oct(0.042),
    stormGemMat,
    [0, 0, 0.218],
    thunderBeltGroup,
    [0.82, 1.25, 0.55]
  );
  const thunderBeltGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowWarm,
      color: 0xfff298,
      transparent: true,
      opacity: 0.65,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  thunderBeltGlow.position.set(0, 0, 0.25);
  thunderBeltGlow.scale.setScalar(0.58);
  thunderBeltGroup.add(thunderBeltGlow);
  thunderBeltGroup.visible = false;

  // 4. Экипировка «ЛАВОВОЕ СЕРДЦЕ» (по мудборду 5: тёмно-красное каменное сердце из застывшей лавы
  // с пылающим оранжево-золотым ядром в трещинах и огненными прожилками на груди)
  const lavaHeartGroup = makeGroup([0, 1.28, 0.175], up);
  const lavaHeartCore = makeGroup([0, 0, 0.02], lavaHeartGroup);
  // Внутреннее пылающее магматическое ядро
  makeMesh(ico(0.058, 1), magmaHot, [0, -0.004, 0], lavaHeartCore, [1.02, 1.22, 0.82]);
  // Асимметричные доли каменного сердца из расколотой лавовой корки
  makeMesh(ico(0.048, 0), lavaCrustMat, [-0.026, 0.032, 0.005], lavaHeartCore, [0.95, 1.15, 0.85]);
  makeMesh(ico(0.044, 0), lavaCrustMat, [0.028, 0.028, 0.005], lavaHeartCore, [0.92, 1.12, 0.85]);
  makeMesh(cn(0.046, 0.095, 5), lavaCrustMat, [0, -0.042, 0.004], lavaHeartCore).rotation.x = PI;
  // Огненные сосуды-прожилки, расходящиеся от Лавового сердца по груди
  for (let v = 0; v < 6; v++) {
    const va = (v / 6) * PI * 2 + 0.35;
    const vein = makeMesh(
      cy(0.005, 0.002, 0.09, 4),
      magmaHot,
      [Math.cos(va) * 0.068, Math.sin(va) * 0.068, 0.005],
      lavaHeartGroup
    );
    vein.rotation.z = va - PI / 2;
  }
  const lavaHeartGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.coal,
      color: 0xff5a10,
      transparent: true,
      opacity: 0.78,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  lavaHeartGlow.position.set(0, 0, 0.06);
  lavaHeartGlow.scale.setScalar(0.52);
  lavaHeartGroup.add(lavaHeartGlow);
  lavaHeartGroup.visible = false;

  // 5. Экипировка «КОМПАС ВЫСОТЫ» (по мудборду 5: поясной латунный компас с рунами по ободу,
  // бирюзовая стрелка которого всегда указывает строго вверх и дрожит, разгораясь с высотой)
  const altCompassGroup = makeGroup([0.155, 0.95, 0.175], up);
  altCompassGroup.rotation.y = 0.42;
  // Кожаная петля крепления к поясу и латунное ушко
  makeMesh(bx(0.026, 0.055, 0.022), leaD, [0, 0.078, 0], altCompassGroup);
  makeMesh(new T.TorusGeometry(0.018, 0.005, 6, 12), brassMat, [0, 0.062, 0], altCompassGroup);
  // Массивный латунный корпус-диск с рунным ободом и тёмным циферблатом
  const compassCase = makeGroup([0, 0, 0], altCompassGroup);
  makeMesh(cy(0.062, 0.062, 0.022, 18), brassMat, [0, 0, 0], compassCase).rotation.x = PI / 2;
  const compassOuterRing = makeMesh(
    new T.TorusGeometry(0.062, 0.009, 8, 20),
    brassMat,
    [0, 0, 0.01],
    compassCase
  );
  makeMesh(
    cy(0.052, 0.052, 0.008, 16),
    L(0x0b2228, { roughness: 0.2, metalness: 0.6 }),
    [0, 0, 0.01],
    compassCase
  ).rotation.x = PI / 2;
  const compassInnerRing = makeMesh(
    new T.TorusGeometry(0.042, 0.0035, 6, 16),
    compassTurquoiseMat,
    [0, 0, 0.014],
    compassCase
  );
  // Стрелка компаса (всегда направлена вверх и дрожит)
  const compassNeedle = makeGroup([0, 0, 0.018], compassCase);
  makeMesh(cn(0.016, 0.056, 4), compassTurquoiseMat, [0, 0.018, 0], compassNeedle, [0.9, 1, 0.4]);
  makeMesh(
    cn(0.011, 0.036, 4),
    compassTurquoiseMat,
    [0, -0.014, 0],
    compassNeedle,
    [0.7, 1, 0.35]
  ).rotation.z = PI;
  const compassGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowIce,
      color: 0x25fff0,
      transparent: true,
      opacity: 0.72,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  compassGlow.position.set(0, 0, 0.025);
  compassGlow.scale.setScalar(0.36);
  altCompassGroup.add(compassGlow);
  altCompassGroup.visible = false;

  // 6. Экипировка «ПЛАВИЛЬНЫЙ КРИСТАЛЛ» (по мудборду 5: острый асимметричный янтарно-огненный кристалл
  // в тёмно-стальной кованой готической оправе с зубцами)
  const smeltCrystalGroup = makeGroup([0, 1.42, 0], up);
  const smeltCrystalNodes = [];
  for (let i = 0; i < 3; i++) {
    const node = makeGroup([0, 0, 0], smeltCrystalGroup);
    // Главный острый кристалл с внутренним пламенем
    const mainShard = makeMesh(
      oct(0.056),
      smeltAmberMat,
      [0, 0.025, 0],
      node,
      [0.68, 1.95, 0.58]
    );
    mainShard.rotation.z = -0.08;
    makeMesh(ico(0.028, 0), magmaHot, [0, 0.015, 0], node, [0.55, 1.45, 0.5]);
    // Боковой отросток кристалла
    const sideShard = makeMesh(
      oct(0.032),
      smeltAmberMat,
      [0.024, -0.008, 0],
      node,
      [0.55, 1.4, 0.5]
    );
    sideShard.rotation.z = -0.38;
    // Кованая тёмно-стальная готическая оправа с 4 зубцами снизу
    makeMesh(cy(0.034, 0.022, 0.048, 6), stD, [0, -0.042, 0], node);
    for (let c = 0; c < 4; c++) {
      const ca = (c / 4) * PI * 2 + PI / 4;
      const prong = makeMesh(
        cn(0.012, 0.068, 4),
        stD,
        [Math.cos(ca) * 0.028, -0.012, Math.sin(ca) * 0.028],
        node
      );
      prong.rotation.set(-Math.sin(ca) * 0.22, 0, Math.cos(ca) * 0.22);
    }
    const crysGlow = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.glowWarm,
        color: 0xff9420,
        transparent: true,
        opacity: 0.65,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    crysGlow.scale.setScalar(0.32);
    node.add(crysGlow);
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

  // ==================== 7. МИНИ-МОДЕЛИ ПОЛУЧАЕМОГО ОРУЖИЯ НА ГЕРОЕ ====================

  // 7A. Мини-модель оружия «ОГНЕННЫЕ ШАРЫ — Искусство Лавы» (парящая раскалённая сфера с потрескавшейся
  // лавовой коркой и огненным кольцом над правой ладонью героя + орбитальные искры при прокачке)
  const miniFireWeaponGroup = makeGroup([0.02, -0.38, 0.14], arms[0].e);
  const miniFireCoreMesh = makeMesh(ico(0.062, 1), magmaHot, [0, 0, 0], miniFireWeaponGroup);
  const miniFireCrustGroup = makeGroup([0, 0, 0], miniFireWeaponGroup);
  for (let p = 0; p < 8; p++) {
    const phi = Math.acos(1 - (2 * (p + 0.5)) / 8);
    const theta = PI * (1 + Math.sqrt(5)) * p;
    const px = Math.sin(phi) * Math.cos(theta) * 0.064;
    const py = Math.cos(phi) * 0.064;
    const pz = Math.sin(phi) * Math.sin(theta) * 0.064;
    const plate = makeMesh(
       bx(0.038, 0.038, 0.014),
      lavaCrustMat,
      [px, py, pz],
      miniFireCrustGroup
    );
    plate.lookAt(0, 0, 0);
  }
  const miniFireSwirlRing = makeMesh(
    new T.TorusGeometry(0.095, 0.009, 6, 18),
    magmaHot,
    [0, 0, 0],
    miniFireWeaponGroup
  );
  miniFireSwirlRing.rotation.x = 0.85;
  const miniFireSatellites = [];
  for (let sat = 0; sat < 3; sat++) {
    const sMesh = makeMesh(oct(0.022), magmaHot, [0, 0, 0], miniFireWeaponGroup);
    miniFireSatellites.push(sMesh);
  }
  const miniFireGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.coal,
      color: 0xff7818,
      transparent: true,
      opacity: 0.82,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  miniFireGlow.scale.setScalar(0.38);
  miniFireWeaponGroup.add(miniFireGlow);
  miniFireWeaponGroup.visible = false;

  // 7B. Мини-модели оружия «ОРБИТАЛЬНЫЕ КЛИНКИ — Осколки Хранителя»
  // Веер левитирующих мини-клинков за плечами героя + кинжал-осколок у левой руки/бедра
  const miniBladeCoreMat = L(0xe0fcff, {
    emissive: 0x45e8ff,
    emissiveIntensity: 2.1,
    roughness: 0.15,
    flatShading: true
  });
  const miniBladeWeaponGroup = makeGroup([0, 1.56, -0.27], up);
  const miniBladeFanNodes = [];
  for (let b = 0; b < 5; b++) {
    const shard = createGuardianShardMesh(0.86, miniBladeCoreMat);
    miniBladeWeaponGroup.add(shard);
    miniBladeFanNodes.push(shard);
  }
  // Тонкая светящаяся магическая дуга-нить за спиной, удерживающая мини-клинки
  const miniBladeArcThread = makeMesh(
    new T.TorusGeometry(0.46, 0.006, 6, 28, PI * 0.88),
    miniBladeCoreMat,
    [0, 0.06, 0],
    miniBladeWeaponGroup
  );
  miniBladeArcThread.rotation.z = PI * 0.075;
  // Дополнительный клинок-осколок в левой руке (как на боевом референсе)
  const miniBladeHandMesh = createGuardianShardMesh(0.55, miniBladeCoreMat);
  miniBladeHandMesh.position.set(-0.02, -0.35, 0.12);
  miniBladeHandMesh.rotation.x = PI * 0.42;
  arms[1].e.add(miniBladeHandMesh);
  miniBladeWeaponGroup.visible = false;
  miniBladeHandMesh.visible = false;

  // 7C. Мини-модель оружия «УДАРНАЯ ВОЛНА — Кузнечное дело»
  // Кинетический наруч-резонатор Кузни на левом предплечье с рунными кольцами и боевым молотом-фокусом
  const miniWaveCoreMat = L(0xe8fbff, {
    emissive: 0x48d8ff,
    emissiveIntensity: 2.0,
    roughness: 0.15,
    flatShading: true
  });
  const miniWaveWeaponGroup = makeGroup([-0.03, -0.22, 0.02], arms[1].e);
  // Кованый кинетический щиток на предплечье
  makeMesh(bx(0.082, 0.16, 0.082), stD, [0, 0, 0], miniWaveWeaponGroup);
  makeMesh(bx(0.088, 0.04, 0.088), st, [0, 0.04, 0], miniWaveWeaponGroup);
  // Мини-молот Кузни с кинетическим ядром и двумя полупрозрачными кольцами импульса
  makeMesh(cy(0.012, 0.014, 0.24, 6), st, [0, -0.11, 0.06], miniWaveWeaponGroup).rotation.x = 0.35;
  makeMesh(bx(0.11, 0.048, 0.056), stD, [0, -0.19, 0.11], miniWaveWeaponGroup);
  makeMesh(bx(0.116, 0.018, 0.062), miniWaveCoreMat, [0, -0.19, 0.11], miniWaveWeaponGroup);
  const miniWaveRingOuter = makeMesh(
    new T.TorusGeometry(0.095, 0.007, 6, 18),
    miniWaveCoreMat,
    [0, -0.14, 0.08],
    miniWaveWeaponGroup
  );
  const miniWaveRingInner = makeMesh(
    new T.TorusGeometry(0.065, 0.005, 6, 16),
    miniWaveCoreMat,
    [0, -0.14, 0.08],
    miniWaveWeaponGroup
  );
  const miniWaveGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.glowIce,
      color: 0x68e8ff,
      transparent: true,
      opacity: 0.72,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  miniWaveGlow.position.set(0, -0.15, 0.08);
  miniWaveGlow.scale.setScalar(0.36);
  miniWaveWeaponGroup.add(miniWaveGlow);
  miniWaveWeaponGroup.visible = false;

  // ==================== 8. 3D-МОДЕЛИ И ЭФФЕКТЫ 4 ТОМОВ НА ГЕРОЕ (Мудборд 3) ====================
  const tomesRigGroup = makeGroup([0, 1.05, 0], up);
  const tomeModels = {
    hp: createTome3DModel('hp'),
    spd: createTome3DModel('spd'),
    dmg: createTome3DModel('dmg'),
    mag: createTome3DModel('mag')
  };
  Object.values(tomeModels).forEach((tm) => {
    tm.visible = false;
    tomesRigGroup.add(tm);
  });

  // Эффект 1: «Том Жизни» — Красная вспышка-звезда у груди
  const tomeHpChestFlash = new T.Sprite(
    new T.SpriteMaterial({
      map: TEXTURES.eliteHalo,
      color: 0xff2438,
      transparent: true,
      opacity: 0,
      blending: T.AdditiveBlending,
      depthWrite: false
    })
  );
  tomeHpChestFlash.position.set(0, 1.32, 0.24);
  tomeHpChestFlash.scale.setScalar(0.55);
  up.add(tomeHpChestFlash);

  // Эффект 2: «Том Скорости» — Зеленоватая вспышка у ног + смазанный скоростной след
  const tomeSpdFootFlashes = legs.map((legObj) => {
    const spr = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.eliteHalo,
        color: 0x45ff88,
        transparent: true,
        opacity: 0,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    spr.position.set(0, -0.46, 0.06);
    spr.scale.setScalar(0.45);
    legObj.k.add(spr);
    return spr;
  });

  // Эффект 3: «Том Силы» — Оранжевая вспышка в руках
  const tomeDmgHandFlashes = arms.map((armObj) => {
    const spr = new T.Sprite(
      new T.SpriteMaterial({
        map: TEXTURES.eliteHalo,
        color: 0xff9418,
        transparent: true,
        opacity: 0,
        blending: T.AdditiveBlending,
        depthWrite: false
      })
    );
    spr.position.set(0, -0.33, 0.05);
    spr.scale.setScalar(0.42);
    armObj.e.add(spr);
    return spr;
  });

  // Эффект 4: «Том Притяжения» — Бирюзовая аура и орбитальные частицы притяжения лута
  const tomeMagFieldGroup = makeGroup([0, 0.95, 0], hero);
  const tomeMagRingMat = new T.MeshBasicMaterial({
    color: 0x38f4ff,
    transparent: true,
    opacity: 0.35,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    depthWrite: false
  });
  const tomeMagRing = makeMesh(
    new T.RingGeometry(0.68, 0.78, 32),
    tomeMagRingMat,
    [0, -0.82, 0],
    tomeMagFieldGroup
  );
  tomeMagRing.rotation.x = -PI / 2;
  const tomeMagOrbitNodes = [];
  for (let m = 0; m < 6; m++) {
    const orb = makeMesh(
      oct(0.032),
      m % 2 === 0 ? brassMat : compassTurquoiseMat,
      [0, 0, 0],
      tomeMagFieldGroup
    );
    tomeMagOrbitNodes.push(orb);
  }
  tomeMagFieldGroup.visible = false;

  // Шлем в глубоком капюшоне со светящимся бирюзовым визором
  const hd = makeGroup([0, 1.66, 0], up);
  makeMesh(sp(1, 20, 14), cuD, [0, 0, 0], hd, [0.205, 0.225, 0.225]);
  // Скульптурный тёмный капюшон поверх шлема (в едином стиле с мудбордами)
  makeMesh(
    sp(0.242, 16, 12, 0, PI * 2, 0, PI * 0.68),
    cloakMat,
    [0, 0.02, -0.02],
    hd,
    [0.98, 1.08, 1.08]
  );
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

  return {
    hero,
    lean,
    up,
    legs,
    arms,
    hd,
    cloakSwingPivot,
    cloakLowerPivot,
    coalBootMods,
    iceSoleMods,
    thunderBeltGroup,
    thunderBeltVeins,
    thunderBeltCenterGem,
    thunderBeltGlow,
    stormVeinMat,
    stormGemMat,
    lavaHeartGroup,
    lavaHeartCore,
    lavaHeartGlow,
    altCompassGroup,
    compassOuterRing,
    compassInnerRing,
    compassNeedle,
    compassGlow,
    compassTurquoiseMat,
    smeltCrystalGroup,
    smeltCrystalNodes,
    smeltAmberMat,
    miniFireWeaponGroup,
    miniFireCoreMesh,
    miniFireCrustGroup,
    miniFireSwirlRing,
    miniFireSatellites,
    miniFireGlow,
    miniBladeWeaponGroup,
    miniBladeFanNodes,
    miniBladeHandMesh,
    miniBladeCoreMat,
    miniWaveWeaponGroup,
    miniWaveRingOuter,
    miniWaveRingInner,
    miniWaveGlow,
    miniWaveCoreMat,
    tomesRigGroup,
    tomeModels,
    tomeHpChestFlash,
    tomeSpdFootFlashes,
    tomeDmgHandFlashes,
    tomeMagFieldGroup,
    tomeMagRing,
    tomeMagRingMat,
    tomeMagOrbitNodes,
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
    spdTrailAccum: 0,
    appliedHeroId: ''
  };
})();

/**
 * Обновляет процедурную анимацию героя «Угленосец», его плаща, мини-моделей полученного оружия,
 * 4 Томов и 6 реликвий экипировки.
 * @param {number} dt
 */
function updatePlayerAnimation(dt) {
  if (!state || !state.player) return;
  const p = state.player;
  const owned = state.itemsOwned || {};
  const weapons = state.weaponLevels || {};
  const tomes = state.tomeLevels || { hp: 0, spd: 0, dmg: 0, mag: 0 };
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

  const targetRun = isMovingHoriz && p.isGrounded ? Math.min(1, horizSpeed / 5.5) : 0;
  rig.runWeight += (targetRun - rig.runWeight) * Math.min(1, safeDt * 10);

  const targetAir = p.isGrounded ? 0 : 1;
  rig.airWeight += (targetAir - rig.airWeight) * Math.min(1, safeDt * 14);

  const targetSlide = state.slideTimer > 0 ? 1 : 0;
  rig.slideWeight += (targetSlide - rig.slideWeight) * Math.min(1, safeDt * 16);

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

  // Каст огненного шара правой рукой (как на мудборде 1 «Боевое применение»)
  const fireCast = state.fireMuzzleFlash || 0;
  if (state.fireMuzzleFlash > 0) {
    state.fireMuzzleFlash = Math.max(0, state.fireMuzzleFlash - safeDt * 6.5);
  }
  if (fireCast > 0.01 && wSlide < 0.5) {
    arm0X = lerp(arm0X, -1.25, fireCast * 0.85);
    elb0X = lerp(elb0X, -0.25, fireCast * 0.85);
  }

  // 2. Амортизация приземления
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

  // 3. Поза прыжка и полёта в воздухе
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

    rig.slideSparkAccum += safeDt * 35;
    if (rig.slideSparkAccum >= 1) {
      rig.slideSparkAccum -= 1;
      spawnSparkBurst(p.x, p.y + 0.08, p.z, owned.coal ? 4 : 2, owned.ice ? 'steam' : 'land');
    }
    if (owned.ice && typeof spawnFrostSlideCrystal === 'function') {
      rig.iceSlideAccum += safeDt * 22;
      if (rig.iceSlideAccum >= 1) {
        rig.iceSlideAccum -= 1;
        spawnFrostSlideCrystal(p.x, p.y, p.z, state.facingAngle);
      }
    }
  } else {
    rig.slideSparkAccum = 0;
    rig.iceSlideAccum = 0;
  }

  // Применяем вычисленные углы к скелету героя
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

  // Динамика плаща (развевается назад от скорости бега, подката и падения)
  const fallBillow = wAir * Math.max(0, Math.min(0.65, -p.vy * 0.055));
  const cloakAngleX =
    0.08 +
    wRun * (0.48 + 0.14 * Math.sin(ph * 2)) +
    wSlide * 0.92 +
    fallBillow +
    Math.sin(time * 2.8) * 0.04;
  rig.cloakSwingPivot.rotation.x = cloakAngleX;
  rig.cloakSwingPivot.rotation.z = -rig.turnBank * 0.85 + Math.sin(ph) * 0.08 * wRun;
  rig.cloakLowerPivot.rotation.x = 0.12 + wRun * (0.28 + 0.18 * Math.cos(ph * 2)) + wSlide * 0.35;

  // ==================== 5. АНИМАЦИЯ МИНИ-МОДЕЛЕЙ ПОЛУЧЕННОГО ОРУЖИЯ ====================
  const dmgTomeStacks = tomes.dmg | 0;
  const weaponWhiteBoost = dmgTomeStacks > 0 ? Math.min(0.8, dmgTomeStacks * 0.16) : 0;

  // 5A. Огненные шары (мини-сфера в правой руке)
  const fireLv = weapons.fire | 0;
  rig.miniFireWeaponGroup.visible = fireLv > 0;
  if (fireLv > 0) {
    const breathScale =
      (0.88 + Math.min(0.32, fireLv * 0.04)) *
      (1 + 0.14 * Math.sin(time * 8.5) + fireCast * 0.45);
    rig.miniFireCoreMesh.scale.setScalar(breathScale);
    rig.miniFireCrustGroup.scale.setScalar(breathScale * (1.02 + 0.06 * Math.cos(time * 8.5)));
    rig.miniFireCrustGroup.rotation.set(time * 2.8, -time * 3.6, time * 1.9);
    rig.miniFireSwirlRing.rotation.z = time * 6.5;
    rig.miniFireSwirlRing.rotation.y = Math.sin(time * 3.2) * 0.5;
    rig.miniFireGlow.scale.setScalar(0.34 + fireCast * 0.25 + Math.min(0.18, fireLv * 0.02));

    const satCount = Math.min(3, (fireLv / 3) | 0);
    for (let s = 0; s < 3; s++) {
      const satMesh = rig.miniFireSatellites[s];
      satMesh.visible = s < satCount;
      if (satMesh.visible) {
        const sa = time * 5.2 + (s * TWO_PI) / Math.max(1, satCount);
        satMesh.position.set(Math.cos(sa) * 0.12, Math.sin(sa * 1.3) * 0.05, Math.sin(sa) * 0.12);
        satMesh.rotation.y = sa;
      }
    }
  }

  // 5B. Орбитальные клинки («Осколки Хранителя» — веер мини-клинков за плечами + клинок в руке)
  const bladeLv = weapons.blade | 0;
  rig.miniBladeWeaponGroup.visible = bladeLv > 0;
  rig.miniBladeHandMesh.visible = bladeLv > 0;
  if (bladeLv > 0) {
    const tags = state.tagCounts || {};
    if (tags.fire > 0) {
      rig.miniBladeCoreMat.emissive.setHex(0xff6a15);
    } else if (tags.ice > 0) {
      rig.miniBladeCoreMat.emissive.setHex(0x40d8ff);
    } else if (tags.elec > 0) {
      rig.miniBladeCoreMat.emissive.setHex(0xd878ff);
    } else {
      rig.miniBladeCoreMat.emissive.setHex(0x45e8ff);
    }
    rig.miniBladeCoreMat.emissiveIntensity = 2.0 + weaponWhiteBoost + 0.35 * Math.sin(time * 7);

    const visibleShards = Math.min(5, 1 + Math.ceil(bladeLv * 0.5));
    for (let b = 0; b < 5; b++) {
      const shard = rig.miniBladeFanNodes[b];
      shard.visible = b < visibleShards;
      if (shard.visible) {
        const norm = visibleShards === 1 ? 0 : b / (visibleShards - 1) - 0.5;
        const fanAngle = norm * 1.48;
        const bob = Math.sin(time * 4.5 + b * 1.1) * 0.03;
        shard.position.set(
          Math.sin(fanAngle) * 0.48,
          Math.cos(fanAngle) * 0.24 + bob,
          -Math.abs(norm) * 0.05
        );
        shard.rotation.set(0.12, 0, -fanAngle * 0.88);
      }
    }
  }

  // 5C. Ударная волна (Кинетический наруч и молот-резонатор Кузни на левой руке)
  const waveLv = weapons.wave | 0;
  rig.miniWaveWeaponGroup.visible = waveLv > 0;
  if (waveLv > 0) {
    const waveCooldown = (state.weaponCooldowns && state.weaponCooldowns.wave) || 0;
    const wavePulse = waveCooldown < 0.35 ? 1.0 - waveCooldown / 0.35 : 0;
    rig.miniWaveCoreMat.emissiveIntensity = 1.85 + weaponWhiteBoost + wavePulse * 1.4;
    rig.miniWaveRingOuter.rotation.x = time * 3.4;
    rig.miniWaveRingOuter.rotation.y = time * 2.2;
    rig.miniWaveRingInner.rotation.y = -time * 4.5;
    rig.miniWaveRingInner.rotation.z = time * 2.8;
    const ringScale = 1 + wavePulse * 0.55 + Math.sin(time * 6) * 0.08;
    rig.miniWaveRingOuter.scale.setScalar(ringScale);
    rig.miniWaveGlow.scale.setScalar(0.32 + wavePulse * 0.28);
  }

  // ==================== 6. АНИМАЦИЯ 4 ТОМОВ И ИХ СПЕЦЭФФЕКТОВ (Мудборд 3) ====================
  if (state.tomeFlashTimer > 0) {
    state.tomeFlashTimer = Math.max(0, state.tomeFlashTimer - safeDt);
  }
  const activeTomeKeys = ['hp', 'spd', 'dmg', 'mag'].filter((tk) => (tomes[tk] | 0) > 0);
  for (let ti = 0; ti < 4; ti++) {
    const tk = ['hp', 'spd', 'dmg', 'mag'][ti];
    const lv = tomes[tk] | 0;
    const model = rig.tomeModels[tk];
    model.visible = lv > 0;
    if (lv > 0) {
      const idxInActive = activeTomeKeys.indexOf(tk);
      const countActive = Math.max(1, activeTomeKeys.length);
      const isFlashingThis = state.tomeFlashTimer > 0 && state.tomeFlashType === tk;
      if (isFlashingThis) {
        // При получении/прокачке Тома он всплывает перед героем и ярко светится (как на мудборде 3)
        model.position.set(-0.22, 0.26 + Math.sin(time * 8) * 0.03, 0.34);
        model.rotation.set(-0.35, 0.35 + Math.sin(time * 6) * 0.15, 0.1);
        model.scale.setScalar(1.15);
        model.userData.halo.scale.setScalar(0.58);
      } else {
        // В бою собранные Тома парят на магическом поясе-спутнице вокруг бёдер героя
        const orbitAng = time * 1.35 + (idxInActive * TWO_PI) / countActive;
        model.position.set(
          Math.cos(orbitAng) * 0.44,
          Math.sin(time * 3.2 + idxInActive * 1.7) * 0.035 - 0.02,
          Math.sin(orbitAng) * 0.38
        );
        model.rotation.set(0.22, -orbitAng + Math.PI / 2, Math.sin(time * 2.5 + idxInActive) * 0.12);
        model.scale.setScalar(0.76 + Math.min(0.24, lv * 0.05));
        model.userData.halo.scale.setScalar(0.32 + 0.05 * Math.sin(time * 5 + ti));
      }
    }
  }

  // Эффекты 4 Томов на герое:
  // 1) Том Жизни: красная вспышка у груди
  const hpTomeLv = tomes.hp | 0;
  const hpFlashBoost = state.tomeFlashTimer > 0 && state.tomeFlashType === 'hp' ? state.tomeFlashTimer : 0;
  rig.tomeHpChestFlash.visible = hpTomeLv > 0;
  if (hpTomeLv > 0) {
    const pulse = 0.38 + 0.22 * Math.pow(Math.max(0, Math.sin(time * 4.2)), 2) + hpFlashBoost * 0.45;
    rig.tomeHpChestFlash.material.opacity = Math.min(1, pulse);
    rig.tomeHpChestFlash.scale.setScalar(0.45 + Math.min(0.25, hpTomeLv * 0.05) + hpFlashBoost * 0.38);
    rig.tomeHpChestFlash.material.rotation = time * 0.8;
  }

  // 2) Том Скорости: зеленоватая вспышка у ног + изумрудные частицы смазанного следа при беге
  const spdTomeLv = tomes.spd | 0;
  const spdFlashBoost = state.tomeFlashTimer > 0 && state.tomeFlashType === 'spd' ? state.tomeFlashTimer : 0;
  for (let i = 0; i < rig.tomeSpdFootFlashes.length; i++) {
    const spr = rig.tomeSpdFootFlashes[i];
    spr.visible = spdTomeLv > 0 && (wRun > 0.2 || spdFlashBoost > 0);
    if (spr.visible) {
      spr.material.opacity = Math.min(0.95, 0.35 + wRun * 0.45 + spdFlashBoost * 0.4);
      spr.scale.setScalar(0.38 + 0.14 * Math.sin(time * 12 + i * PI) + spdFlashBoost * 0.25);
      spr.material.rotation = time * 3.5 * (i ? -1 : 1);
    }
  }
  if (spdTomeLv > 0 && (wRun > 0.35 || wSlide > 0.2) && typeof spawnSpeedTomeTrail === 'function') {
    rig.spdTrailAccum += safeDt * (12 + spdTomeLv * 3);
    if (rig.spdTrailAccum >= 1) {
      rig.spdTrailAccum -= 1;
      spawnSpeedTomeTrail(p.x, p.y, p.z, state.facingAngle);
    }
  }

  // 3) Том Силы: оранжевая вспышка в руках
  const dmgFlashBoost = state.tomeFlashTimer > 0 && state.tomeFlashType === 'dmg' ? state.tomeFlashTimer : 0;
  for (let i = 0; i < rig.tomeDmgHandFlashes.length; i++) {
    const spr = rig.tomeDmgHandFlashes[i];
    spr.visible = dmgTomeStacks > 0;
    if (spr.visible) {
      spr.material.opacity = Math.min(0.95, 0.36 + 0.2 * Math.sin(time * 8 + i) + fireCast * 0.35 + dmgFlashBoost * 0.4);
      spr.scale.setScalar(0.36 + Math.min(0.2, dmgTomeStacks * 0.04) + fireCast * 0.2 + dmgFlashBoost * 0.3);
      spr.material.rotation = -time * 2.2 * (i ? -1 : 1);
    }
  }

  // 4) Том Притяжения: бирюзовая сфера/кольцо и вращающиеся частицы притяжения
  const magTomeLv = tomes.mag | 0;
  const magFlashBoost = state.tomeFlashTimer > 0 && state.tomeFlashType === 'mag' ? state.tomeFlashTimer : 0;
  rig.tomeMagFieldGroup.visible = magTomeLv > 0;
  if (magTomeLv > 0) {
    const magScale = 1 + Math.min(0.6, magTomeLv * 0.14) + magFlashBoost * 0.35;
    rig.tomeMagRing.scale.setScalar(magScale);
    rig.tomeMagRing.rotation.z = time * 1.8;
    rig.tomeMagRingMat.opacity = 0.22 + 0.12 * Math.sin(time * 5) + magFlashBoost * 0.35;
    for (let m = 0; m < rig.tomeMagOrbitNodes.length; m++) {
      const orb = rig.tomeMagOrbitNodes[m];
      const ma = -time * (3.2 + (m % 2) * 1.1) + (m * TWO_PI) / 6;
      const rad = (0.52 + 0.18 * Math.sin(time * 4 + m)) * magScale;
      orb.position.set(
        Math.cos(ma) * rad,
        -0.65 + ((time * 0.8 + m * 0.17) % 1.0) * 0.95,
        Math.sin(ma) * rad
      );
      orb.rotation.set(time * 4, ma, 0);
    }
  }

  // ==================== 7. АНИМАЦИЯ 6 РЕЛИКВИЙ ЭКИПИРОВКИ (Мудборды 2, 4, 5, 7) ====================

  // 1) Угольный сапог
  const coalStacks = owned.coal | 0;
  for (let i = 0; i < rig.coalBootMods.length; i++) {
    const mod = rig.coalBootMods[i];
    mod.group.visible = coalStacks > 0;
    if (coalStacks > 0) {
      const bootPulse = 0.58 + 0.22 * Math.sin(time * 9 + i * 1.7) + Math.min(0.25, coalStacks * 0.05);
      mod.glow.material.opacity = bootPulse;
      mod.glow.scale.setScalar(0.5 + Math.min(0.24, coalStacks * 0.04));
    }
  }
  if (coalStacks > 0 && wRun > 0.35 && p.isGrounded) {
    rig.coalStepAccum += safeDt * (12 + coalStacks * 2.5);
    if (rig.coalStepAccum >= 1) {
      rig.coalStepAccum -= 1;
      spawnSparkBurst(p.x, p.y + 0.05, p.z, 3, 'fire');
    }
  }

  // 2) Ледяная подошва (морозный след при беге и подкате)
  const iceStacks = owned.ice | 0;
  for (let i = 0; i < rig.iceSoleMods.length; i++) {
    const mod = rig.iceSoleMods[i];
    mod.group.visible = iceStacks > 0;
    if (iceStacks > 0) {
      mod.glow.material.opacity = 0.54 + 0.2 * Math.sin(time * 6 + i);
    }
  }
  if (iceStacks > 0 && wRun > 0.45 && p.isGrounded && typeof spawnFrostSlideCrystal === 'function') {
    rig.iceSlideAccum += safeDt * (4.5 + iceStacks);
    if (rig.iceSlideAccum >= 1) {
      rig.iceSlideAccum -= 1;
      spawnFrostSlideCrystal(p.x, p.y, p.z, state.facingAngle);
    }
  }

  // 3) Громовой пояс — 4 стадии накопления заряда жил (1-го, 2-го, 3-го, 5-го удара)
  const beltStacks = owned.belt | 0;
  rig.thunderBeltGroup.visible = beltStacks > 0;
  if (beltStacks > 0) {
    const chargeStep = (state.totalHitCount || 0) % 5; // 0..4 (на 4 следующий удар — 5-й разряд!)
    const chargeRatio = (chargeStep + 1) / 5;
    const pulse = Math.sin(time * (6 + chargeStep * 5));
    // Цвет жил меняется от тёплого золотистого (1-й) к ослепительно жёлто-белому и голубому (5-й)
    if (chargeStep >= 4) {
      rig.stormVeinMat.emissive.setHex(0xffffff);
      rig.stormVeinMat.emissiveIntensity = 2.8 + 0.8 * pulse;
      rig.stormGemMat.emissive.setHex(0x88f8ff);
      rig.stormGemMat.emissiveIntensity = 3.2;
      rig.thunderBeltGlow.material.color.setHex(0xb8f8ff);
      rig.thunderBeltGlow.material.opacity = 0.88 + 0.12 * pulse;
      rig.thunderBeltGlow.scale.setScalar(0.76);
      // Микро-молнии вокруг пояса при максимальном заряде
      if (Math.random() < 0.35 && typeof spawnGlobalBolt === 'function') {
        const a0 = Math.random() * TWO_PI;
        const a1 = a0 + 0.8 + Math.random() * 0.9;
        spawnGlobalBolt(
          p.x + Math.cos(a0) * 0.34,
          p.y + 0.98,
          p.z + Math.sin(a0) * 0.34,
          p.x + Math.cos(a1) * 0.34,
          p.y + 1.02,
          p.z + Math.sin(a1) * 0.34,
          0.05,
          6,
          0xfff6a0
        );
      }
    } else {
      rig.stormVeinMat.emissive.setHex(chargeStep >= 2 ? 0xffe878 : 0xd89828);
      rig.stormVeinMat.emissiveIntensity = 0.65 + chargeRatio * 1.65 + 0.2 * pulse;
      rig.stormGemMat.emissive.setHex(0x68dcff);
      rig.stormGemMat.emissiveIntensity = 1.2 + chargeRatio * 1.4;
      rig.thunderBeltGlow.material.color.setHex(0xffe878);
      rig.thunderBeltGlow.material.opacity = 0.32 + chargeRatio * 0.45;
      rig.thunderBeltGlow.scale.setScalar(0.42 + chargeRatio * 0.24);
    }
    rig.thunderBeltCenterGem.rotation.z = time * (1.5 + chargeStep * 1.2);
  }

  // 4) Лавовое сердце (бьётся в такт пульсу лавы; ближе 6 м к лаве — яростное биение и свечение)
  const heartStacks = owned.heart | 0;
  rig.lavaHeartGroup.visible = heartStacks > 0;
  if (heartStacks > 0) {
    const distToLava = p.y - state.lavaY;
    const nearLava = distToLava < 6;
    const beatSpeed = nearLava ? 15 : 6.8;
    const beatWave = Math.pow(Math.max(0, Math.sin(time * beatSpeed)), 3);
    const beatScale = 1 + (nearLava ? 0.32 : 0.14) * beatWave;
    rig.lavaHeartCore.scale.setScalar(beatScale);
    rig.lavaHeartGlow.material.opacity = nearLava ? 0.82 + 0.18 * beatWave : 0.48 + 0.15 * beatWave;
    rig.lavaHeartGlow.scale.setScalar(nearLava ? 0.68 + 0.16 * beatWave : 0.46);
  }

  // 5) Поясной Компас высоты (стрелка всегда указывает вверх и дрожит, светится ярче с высотой)
  const compStacks = owned.comp | 0;
  rig.altCompassGroup.visible = compStacks > 0;
  if (compStacks > 0) {
    const heightAboveLava = Math.max(0, p.y - state.lavaY);
    const heightRatio = Math.min(1, heightAboveLava / 100);
    // Стрелка всегда указывает вверх + характерная дрожь из мудборда 5 («Стрелка дрожит»)
    const jitterAngle =
      Math.sin(time * 42) * (0.04 + heightRatio * 0.08) +
      Math.cos(time * 67) * 0.03 -
      leanZ * 0.9;
    rig.compassNeedle.rotation.z = jitterAngle;
    rig.compassInnerRing.rotation.z = -time * (1.2 + heightRatio * 3.0);
    rig.compassTurquoiseMat.emissiveIntensity = 1.4 + heightRatio * 2.4;
    rig.compassGlow.material.opacity = 0.45 + heightRatio * 0.5 + 0.08 * Math.sin(time * 16);
    rig.compassGlow.scale.setScalar(0.32 + heightRatio * 0.34);
  }

  // 6) Плавильный кристалл (у левого плеча + орбитальные кристаллы при стаках)
  const crysStacks = owned.crys | 0;
  rig.smeltCrystalGroup.visible = crysStacks > 0;
  if (crysStacks > 0) {
    const smeltFlash = state.smeltFlashTimer || 0;
    if (state.smeltFlashTimer > 0) {
      state.smeltFlashTimer = Math.max(0, state.smeltFlashTimer - safeDt * 3.5);
    }
    rig.smeltAmberMat.emissiveIntensity = 1.75 + smeltFlash * 2.2 + 0.3 * Math.sin(time * 6);
    const visibleNodes = Math.min(3, crysStacks);
    for (let i = 0; i < 3; i++) {
      const node = rig.smeltCrystalNodes[i];
      node.visible = i < visibleNodes;
      if (node.visible) {
        if (i === 0) {
          // Главный Плавильный кристалл закреплён над левым наплечником
          node.position.set(-0.28, 0.16 + Math.sin(time * 3.8) * 0.025, 0.08);
          node.rotation.set(0.15, time * 1.4, 0.22);
          node.scale.setScalar(1.0 + smeltFlash * 0.35);
        } else {
          const ang = time * 2.2 + i * 2.1;
          node.position.set(
            Math.cos(ang) * 0.38,
            0.08 + Math.sin(time * 4 + i) * 0.04,
            Math.sin(ang) * 0.26
          );
          node.rotation.set(0.1, -ang, 0.18);
          node.scale.setScalar(0.78 + smeltFlash * 0.25);
        }
      }
    }
  }

  rig.coal.emissiveIntensity = 1.25 + 0.42 * Math.sin(time * 7) * Math.sin(time * 3.1);
  rig.magmaHot.emissiveIntensity = 1.95 + 0.55 * Math.sin(time * 9.5) + fireCast * 0.85;

  const visorPulse = Math.sin(time * 2.5);
  rig.vis.color.setHSL(0.49, 1, 0.64 + 0.08 * visorPulse);
  rig.visorGlow.material.opacity = 0.48 + 0.14 * visorPulse;
  rig.beltGlow.material.opacity = 0.38 + 0.14 * Math.sin(time * 5.2);
}

/* ---------- 1. Поверхность и 3D-эффекты угрозы снизу (Лава / Метель / Бездна из 3 референсов) ---------- */

// 1.1 Шейдерный материал моря магмы Пепельной башни (из babylon_js_glsl.html, скорость = 2.25)
const ashLavaSeaShaderMat = new BABYLON.ShaderMaterial(
  'ashLavaSeaShaderMat',
  scene,
  { vertex: 'lavaSea', fragment: 'lavaSea' },
  {
    attributes: ['position', 'uv'],
    uniforms: ['world', 'viewProjection', 'uTime', 'uSpeed', 'uFogColor', 'uFogDensity', 'uCameraPos']
  }
);
ashLavaSeaShaderMat.setFloat('uTime', 0.0);
ashLavaSeaShaderMat.setFloat('uSpeed', 2.25);
ashLavaSeaShaderMat.setColor3('uFogColor', BABYLON.Color3.FromHexString('#220707'));
ashLavaSeaShaderMat.setFloat('uFogDensity', 0.0155);
ashLavaSeaShaderMat.setVector3('uCameraPos', camera.position);
ashLavaSeaShaderMat.backFaceCulling = false;

// 1.2 Шейдерный материал Бездны Башни Пустоты (из babylon_js_environment.html, параллакс и далёкие огни)
const voidAbyssShaderMat = new BABYLON.ShaderMaterial(
  'voidAbyssShaderMat',
  scene,
  { vertex: 'abyss', fragment: 'abyss' },
  {
    attributes: ['position', 'uv'],
    uniforms: ['world', 'worldViewProjection', 'uTime', 'uSurge', 'uCameraPos']
  }
);
voidAbyssShaderMat.setFloat('uTime', 0.0);
voidAbyssShaderMat.setFloat('uSurge', 0.0);
voidAbyssShaderMat.setVector3('uCameraPos', camera.position);
voidAbyssShaderMat.backFaceCulling = false;

const LAVA_MATERIALS = {
  ash: ashLavaSeaShaderMat,
  ice: new BABYLON.MeshStandardMaterial({
    map: iceLavaTexture,
    bumpMap: iceLavaTexture,
    bumpScale: 0.25,
    color: 0x06101e,
    emissive: 0x163854,
    emissiveMap: iceLavaTexture,
    emissiveIntensity: 0.85,
    roughness: 0.35
  }),
  void: voidAbyssShaderMat
};

const lavaMesh = new BABYLON.Mesh(new BABYLON.PlaneGeometry(140, 140, 64, 64), LAVA_MATERIALS.ash);
lavaMesh.rotation.x = -Math.PI / 2;
scene.add(lavaMesh);

const hazardEffectsGroup = new BABYLON.Group();
scene.add(hazardEffectsGroup);

const hazardAshGroup = new BABYLON.Group();
const hazardIceGroup = new BABYLON.Group();
const hazardVoidGroup = new BABYLON.Group();
hazardEffectsGroup.add(hazardAshGroup, hazardIceGroup, hazardVoidGroup);

// 1A. Детали моря магмы (Пепельная башня — обугленные базальтовые глыбы из babylon_js_glsl.html)
(function buildAshHazardDetails() {
  const crustMat = new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.ash.map,
    bumpMap: TOWER_FLOOR_TEXTURES.ash.bump,
    bumpScale: 1.8,
    color: 0x18181b,
    emissive: 0x581200,
    emissiveIntensity: 0.45,
    roughness: 0.94
  });
  const crustRocks = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * TWO_PI + (i % 3) * 0.22;
    const radius = 5.5 + (i % 4) * 5.8;
    const rockGeo = jitterGeometry(new BABYLON.IcosahedronGeometry(1.1 + (i % 3) * 0.55, 1), 0.22);
    const rock = new BABYLON.Mesh(rockGeo, crustMat);
    rock.position.set(Math.cos(angle) * radius, 0.15, Math.sin(angle) * radius);
    rock.scale.set(1.3, 0.55, 1.15);
    rock.rotation.y = i * 1.1;
    rock.userData = { baseAngle: angle, radius, phase: i * 0.7 };
    hazardAshGroup.add(rock);
    crustRocks.push(rock);
  }
  hazardAshGroup.userData.crustRocks = crustRocks;
})();

// 1B. 3-слойная воронка Бездонной Метели (Ледяная башня — GLSL шейдер blizzardVortex из babylon_js.html)
const iceBlizzardVortexMats = [];
(function buildIceHazardDetails() {
  const layers = [
    { y: 0.25, size: 62, opacity: 0.95, layerIdx: 0.0, add: false },
    { y: 1.15, size: 58, opacity: 0.68, layerIdx: 1.0, add: false },
    { y: 2.05, size: 54, opacity: 0.45, layerIdx: 2.0, add: true }
  ];

  layers.forEach((cfg, idx) => {
    const vGeo = new BABYLON.PlaneGeometry(cfg.size, cfg.size, 48, 48);
    const vMat = new BABYLON.ShaderMaterial(
      'iceBlizzardVortexMat_' + idx,
      scene,
      { vertex: 'blizzardVortex', fragment: 'blizzardVortex' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldView', 'projection', 'uTime', 'uLayerIndex', 'uOpacity'],
        needAlphaBlending: true
      }
    );
    vMat.setFloat('uTime', 0.0);
    vMat.setFloat('uLayerIndex', cfg.layerIdx);
    vMat.setFloat('uOpacity', cfg.opacity);
    vMat.backFaceCulling = false;
    vMat.disableDepthWrite = idx > 0;
    if (cfg.add) {
      vMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
    }

    const vMesh = new BABYLON.Mesh(vGeo, vMat);
    vMesh.rotation.x = -Math.PI / 2;
    vMesh.position.y = cfg.y;
    hazardIceGroup.add(vMesh);
    iceBlizzardVortexMats.push(vMat);
  });

  hazardIceGroup.visible = false;
})();

// 1C. Детали Бездны (Башня Пустоты — сингулярные кольца и звёздная пыль из babylon_js_environment.html)
(function buildVoidHazardDetails() {
  const vortexRings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new BABYLON.Mesh(
      new BABYLON.RingGeometry(7.5 + r * 4.8, 12.0 + r * 6.2, 44),
      new BABYLON.MeshBasicMaterial({
        map: voidLavaTexture,
        color: r === 0 ? 0xe098ff : r === 1 ? 0xa840ff : 0x6818c8,
        transparent: true,
        opacity: 0.45 - r * 0.1,
        side: BABYLON.DoubleSide,
        blending: BABYLON.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.14 + r * 0.18;
    hazardVoidGroup.add(ring);
    vortexRings.push(ring);
  }

  hazardVoidGroup.userData.vortexRings = vortexRings;
  hazardVoidGroup.visible = false;
})();

/* ---------- 2. Цилиндрические внешние стены башни (с GLSL-шейдером рун для Пустоты) ---------- */

const voidWallRunesShaderMat = new BABYLON.ShaderMaterial(
  'voidWallRunesShaderMat',
  scene,
  { vertex: 'wallRunes', fragment: 'wallRunes' },
  {
    attributes: ['position', 'normal', 'uv'],
    uniforms: ['world', 'worldViewProjection', 'uTime', 'uSurge', 'uFogDensity', 'uCameraPos'],
    samplers: ['uRuneMap', 'uBumpMap']
  }
);
voidWallRunesShaderMat.setTexture('uRuneMap', TEXTURES.voidRuneRGB);
voidWallRunesShaderMat.setTexture('uBumpMap', TEXTURES.voidBump);
voidWallRunesShaderMat.setFloat('uTime', 0.0);
voidWallRunesShaderMat.setFloat('uSurge', 0.0);
voidWallRunesShaderMat.setFloat('uFogDensity', 0.0092);
voidWallRunesShaderMat.setVector3('uCameraPos', camera.position);
voidWallRunesShaderMat.backFaceCulling = false;

const TOWER_WALL_MATERIALS = {
  ash: new BABYLON.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ash.map,
    bumpMap: TOWER_WALL_TEXTURES.ash.bump,
    bumpScale: 2.6,
    color: 0x7c7e84,
    emissive: 0xff4500,
    emissiveMap: TOWER_WALL_TEXTURES.ash.emissive,
    emissiveIntensity: 1.15,
    roughness: 0.92,
    metalness: 0.08,
    side: BABYLON.BackSide
  }),
  ice: new BABYLON.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    bumpMap: TOWER_WALL_TEXTURES.ice.bump,
    bumpScale: 2.4,
    color: 0x8bc9eb,
    emissive: 0x58c4ff,
    emissiveMap: TOWER_WALL_TEXTURES.ice.emissive,
    emissiveIntensity: 1.25,
    roughness: 0.14,
    metalness: 0.25,
    side: BABYLON.BackSide
  }),
  void: voidWallRunesShaderMat
};

const towerWallGeo = new BABYLON.CylinderGeometry(30.8, 30.8, 220, 48, 28, true);
// Применяем мировые пятна обугливания/вариации камня к вершинам внешней стены
(function applyWallVertexVariation() {
  const posAttr = towerWallGeo.attributes.position;
  if (!posAttr) return;
  const count = posAttr.count;
  const cols = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const vx = posAttr.getX(i);
    const vy = posAttr.getY(i) + 80;
    const vz = posAttr.getZ(i);
    const wChar1 = stoneNoise3D(vx * 0.085 + 2.3, vy * 0.085 + 7.1, vz * 0.085 + 4.9);
    const wChar2 = stoneNoise3D(vx * 0.22 + 11.7, vy * 0.22 + 3.3, vz * 0.22 + 8.2);
    const raw = (wChar1 * 0.68 + wChar2 * 0.32 - 0.50) / 0.22;
    const t = Math.max(0, Math.min(1, raw));
    const charMask = t * t * (3 - 2 * t) * 0.88;
    const micro = 0.86 + stoneNoise3D(vx * 1.65, vy * 1.65, vz * 1.65) * 0.28;
    const c = ((1.0 - charMask) + 0.05 * charMask) * micro;
    cols[i * 3] = c;
    cols[i * 3 + 1] = c;
    cols[i * 3 + 2] = c * 1.02;
  }
  towerWallGeo.setAttribute('color', new BABYLON.BufferAttribute(cols, 3));
})();

const towerWallMesh = new BABYLON.Mesh(towerWallGeo, TOWER_WALL_MATERIALS.ash);
towerWallMesh.position.y = 80;
scene.add(towerWallMesh);
towerWallMesh.matrixAutoUpdate = false;
towerWallMesh.updateMatrix();

const iceInnerGlazeMesh = new BABYLON.Mesh(
  new BABYLON.CylinderGeometry(29.85, 29.85, 220, 48, 1, true),
  new BABYLON.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    bumpMap: TOWER_WALL_TEXTURES.ice.bump,
    bumpScale: 1.8,
    color: 0xb8e6ff,
    emissive: 0x102e4a,
    emissiveIntensity: 0.42,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.42,
    side: BABYLON.BackSide,
    depthWrite: false
  })
);
iceInnerGlazeMesh.position.y = 80;
iceInnerGlazeMesh.visible = false;
scene.add(iceInnerGlazeMesh);
iceInnerGlazeMesh.matrixAutoUpdate = false;
iceInnerGlazeMesh.updateMatrix();

var currentTowerTheme = TOWERS.ash;
let _blizzardAccumTime = 0;

function updateEnvironmentVisuals(time, dt) {
  const safeDt = dt || 0.016;
  if (typeof syncScenePostProcessParams === 'function') {
    syncScenePostProcessParams(time, safeDt);
  }

  hazardEffectsGroup.position.y = lavaMesh.position.y;
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';
  const vfx = activeTowerVfxState;

  if (towerId === 'ash') {
    ashLavaSeaShaderMat.setFloat('uTime', time);
    ashLavaSeaShaderMat.setFloat('uSpeed', vfx.lavaSpeed || 2.25);
    ashLavaSeaShaderMat.setFloat('uFogDensity', vfx.renderFogDensity || 0.0155);
    ashLavaSeaShaderMat.setVector3('uCameraPos', camera.position);

    const wallMat = TOWER_WALL_MATERIALS.ash;
    wallMat.emissiveIntensity = 1.05 + Math.sin(time * 2.4) * 0.22 + (vfx.stormFactor || 0) * 0.85;

    const crustRocks = hazardAshGroup.userData.crustRocks;
    if (crustRocks) {
      for (let i = 0; i < crustRocks.length; i++) {
        const rock = crustRocks[i];
        const ud = rock.userData;
        const a = ud.baseAngle + time * 0.025 * (i % 2 ? 1 : -1);
        rock.position.x = Math.cos(a) * ud.radius;
        rock.position.z = Math.sin(a) * ud.radius;
        rock.position.y = 0.12 + Math.sin(time * 1.8 + ud.phase) * 0.09;
      }
    }
  } else if (towerId === 'ice') {
    // Бездонная метель со зафиксированной скоростью = 0.5 (повышается до 0.9 в бурю)
    _blizzardAccumTime += safeDt * (vfx.blizzardSpeed || 0.5);
    for (let i = 0; i < iceBlizzardVortexMats.length; i++) {
      iceBlizzardVortexMats[i].setFloat('uTime', _blizzardAccumTime);
    }

    const wallMat = TOWER_WALL_MATERIALS.ice;
    wallMat.emissiveIntensity = 1.15 + Math.sin(time * 1.6) * 0.18 + (vfx.stormFactor || 0) * 0.45;

    if (typeof TOWER_SLAB_MATERIALS !== 'undefined' && TOWER_SLAB_MATERIALS.ice) {
      // Зафиксированная эмиссия трещин льда = 1.95 (и до 2.45 в бурю)
      TOWER_SLAB_MATERIALS.ice.emissiveIntensity = vfx.cracksEmissive || 1.95;
    }
  } else if (towerId === 'void') {
    const surge = (vfx.stormFactor || 0) * 1.65;
    voidAbyssShaderMat.setFloat('uTime', time);
    voidAbyssShaderMat.setFloat('uSurge', surge);
    voidAbyssShaderMat.setVector3('uCameraPos', camera.position);

    voidWallRunesShaderMat.setFloat('uTime', time);
    voidWallRunesShaderMat.setFloat('uSurge', surge);
    voidWallRunesShaderMat.setFloat('uFogDensity', vfx.renderFogDensity || 0.0092);
    voidWallRunesShaderMat.setVector3('uCameraPos', camera.position);

    const vRings = hazardVoidGroup.userData.vortexRings;
    if (vRings) {
      vRings[0].rotation.z = time * 0.7;
      vRings[1].rotation.z = -time * 0.45;
      vRings[2].rotation.z = time * 0.28;
    }
  }

  if (typeof updateTowerDecorAnimations === 'function') {
    updateTowerDecorAnimations(time, safeDt, towerId);
  }
}

function applyTowerTheme(towerConfig) {
  currentTowerTheme = towerConfig;
  const id = towerConfig.id;

  lavaMesh.material = LAVA_MATERIALS[id];
  towerWallMesh.material = TOWER_WALL_MATERIALS[id];
  towerWallMesh.useVertexColors = id === 'ash';
  iceInnerGlazeMesh.visible = id === 'ice';

  hazardAshGroup.visible = id === 'ash';
  hazardIceGroup.visible = id === 'ice';
  hazardVoidGroup.visible = id === 'void';

  scene.background = BACKGROUND_TEXTURES[id];
  scene.fog.color.setHex(towerConfig.fogColor);

  const baseVfx = towerConfig.vfxParams || TOWERS.ash.vfxParams;
  activeTowerVfxState.towerId = id;
  activeTowerVfxState.stormFactor = 0.0;
  activeTowerVfxState.bloomStrength = baseVfx.bloomStrength !== undefined ? baseVfx.bloomStrength : 0.3;
  activeTowerVfxState.bloomThreshold = baseVfx.bloomThreshold !== undefined ? baseVfx.bloomThreshold : 0.14;
  activeTowerVfxState.heatDistortion = baseVfx.heatDistortion || 0.0;
  activeTowerVfxState.lavaSpeed = baseVfx.lavaSpeed || 2.25;
  activeTowerVfxState.fogDensity = baseVfx.fogDensity || towerConfig.fogDensity;
  activeTowerVfxState.renderFogDensity = baseVfx.renderFogDensity !== undefined ? baseVfx.renderFogDensity : towerConfig.fogDensity;
  activeTowerVfxState.cracksEmissive = baseVfx.cracksEmissive || 1.95;
  activeTowerVfxState.blizzardSpeed = baseVfx.blizzardSpeed || 0.5;
  activeTowerVfxState.rgbShift = baseVfx.rgbShift || 0.0;
  activeTowerVfxState.gravityAnomaly = baseVfx.gravityAnomaly || 1.4;
  activeTowerVfxState.dissolveThreshold = baseVfx.dissolveThreshold || 0.39;
  activeTowerVfxState.coldGrade = baseVfx.coldGrade || 0.0;

  scene.fog.density = activeTowerVfxState.renderFogDensity;
  if (typeof syncScenePostProcessParams === 'function') {
    syncScenePostProcessParams(0, 1.0);
  }

  if (typeof TOWER_SLAB_MATERIALS !== 'undefined' && TOWER_SLAB_MATERIALS.ice) {
    TOWER_SLAB_MATERIALS.ice.emissiveIntensity = activeTowerVfxState.cracksEmissive;
  }

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
    dustMat.size = towerConfig.dustSize || 0.36;
    dustMat.opacity = towerConfig.dustOpacity || 0.78;
  }

  if (typeof applyTowerHazardPalette === 'function') {
    applyTowerHazardPalette(id);
  }
  if (typeof setTowerAmbientTheme === 'function') {
    setTowerAmbientTheme(id);
  }
}
