/* ==========================================================================
   Генерация башни и пространственная сетка блоков (Кооперативное расширение 2–4 игрока):
   - Динамическое масштабирование сетки: 15×15 (R=28 м, 1 игр.), 19×19 (R=36 м, 2 игр.),
     23×23 (R=44 м, 3–4 игр.) + расширение узких перешейков ring и spokes до ≥2 клеток (8 м)
   - Вертикальные полуэтажи (балконы на высоте floorY + 6) по периметру башни с доступом
     через прыжковые площадки (jumpPads) и точками интереса для снайперских билдов
   - Разделение маршрутов на этажах-развилках (FORK_FLOORS: 2, 6, 10 / 14, 18, 22):
     зелёная («тихий путь») и красная («опасный путь») лестницы ведут в два параллельных
     изолированных полукольца (сектора) следующего этажа
   - Расширение структуры забега до 3 актов (18–24 этажа: бесшовное объединение
     Пепельной, Ледяной и Пустотной башен в одно большое приключение)
   - Безопасные «Залы Кузницы» после этажей боссов (между 4–5, 8–9 и далее), где подъём
     лавы (state.lavaY) ставится на паузу, пока все игроки не встанут на стартовую плиту
   ========================================================================== */

/* ---------- 1. Детализированные 3D-модели объектов на карте (Мудборды 6 и 8 + Балконы и Залы Кузницы) ---------- */

// 1A. ПРЫЖКОВАЯ ПЛОЩАДКА (ПАД) — Мудборд 6
const jumpPadGroup = new THREE.Group();
scene.add(jumpPadGroup);

const jumpPadGeo = (function buildJumpPadGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const darkStone = new THREE.Color(0x1f2b34);
  const rimStone = new THREE.Color(0x324654);
  const cyanRune = new THREE.Color(0x45fff0);

  parts.push({
    geo: new THREE.CylinderGeometry(1.44, 1.56, 0.22, 16),
    matrix: computeTransformMatrix(0, -0.05, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkStone
  });
  const segGeo = new THREE.BoxGeometry(0.82, 0.26, 0.24);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TWO_PI;
    computeTransformMatrix(
      Math.cos(a) * 1.28,
      0.03,
      Math.sin(a) * 1.28,
      0,
      -a + Math.PI / 2,
      0,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: segGeo, matrix: tempMat.clone(), color: rimStone });
  }
  const runePlaqueGeo = new THREE.BoxGeometry(0.28, 0.16, 0.06);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + Math.PI / 4;
    computeTransformMatrix(
      Math.cos(a) * 1.46,
      0.01,
      Math.sin(a) * 1.46,
      0,
      -a + Math.PI / 2,
      0,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: runePlaqueGeo, matrix: tempMat.clone(), color: cyanRune });
  }
  return mergeGeometryParts(parts);
})();

const jumpPadMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x0e6b62,
  emissiveIntensity: 0.95,
  roughness: 0.42,
  metalness: 0.45
});

const jumpPadTopDiscGeo = new THREE.CircleGeometry(1.16, 32);
jumpPadTopDiscGeo.rotateX(-Math.PI / 2);
const jumpPadTopDiscMat = new THREE.MeshBasicMaterial({
  map: TEXTURES.runicJumpPad,
  color: 0x70fff4,
  transparent: true,
  opacity: 0.96,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const jumpPadKineticPlumeGeo = new THREE.CylinderGeometry(0.92, 1.12, 1.35, 20, 1, true);
jumpPadKineticPlumeGeo.translate(0, 0.68, 0);
const jumpPadKineticPlumeMat = new THREE.MeshBasicMaterial({
  color: 0x38ffe8,
  transparent: true,
  opacity: 0.24,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const balconyJumpPadPlumeMat = new THREE.MeshBasicMaterial({
  color: 0xffd24c,
  transparent: true,
  opacity: 0.28,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

function createJumpPadVisualInstance(x, floorY, z, isBalconyPad) {
  const g = new THREE.Group();
  g.position.set(x, floorY + 0.14, z);

  const baseMesh = new THREE.Mesh(jumpPadGeo, jumpPadMat);
  g.add(baseMesh);

  const runeDisc = new THREE.Mesh(jumpPadTopDiscGeo, jumpPadTopDiscMat);
  runeDisc.position.y = 0.16;
  g.add(runeDisc);

  const plumeMat = isBalconyPad ? balconyJumpPadPlumeMat : jumpPadKineticPlumeMat;
  const plume = new THREE.Mesh(jumpPadKineticPlumeGeo, plumeMat);
  plume.position.y = 0.15;
  g.add(plume);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.96, 0.024, 6, 28),
    plumeMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.45;
  g.add(ring);

  g.userData = { runeDisc, plume, ring, isBalconyPad: !!isBalconyPad };
  return g;
}

// 1B. СУНДУК — Мудборд 8
const chestGroup = new THREE.Group();
scene.add(chestGroup);

const chestCubeCoreGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);
const chestCubeCoreMat = new THREE.MeshStandardMaterial({
  map: TEXTURES.crackedLavaCrust,
  bumpMap: TEXTURES.crackedLavaCrust,
  bumpScale: 0.12,
  color: 0xffffff,
  emissive: 0xff5a08,
  emissiveMap: TEXTURES.crackedLavaCrust,
  emissiveIntensity: 1.55,
  roughness: 0.68,
  metalness: 0.22
});

const chestGeo = (function buildMagmaCubeChestFrameGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const goldTrim = new THREE.Color(0xffc842);
  const bronzeDark = new THREE.Color(0xb87618);
  const magmaBright = new THREE.Color(0xfff098);
  const keyholeDark = new THREE.Color(0x160708);

  const edgeLen = 1.02;
  const edgeThick = 0.095;
  const edgeGeoY = new THREE.BoxGeometry(edgeThick, edgeLen, edgeThick);
  const edgeGeoX = new THREE.BoxGeometry(edgeLen, edgeThick, edgeThick);
  const edgeGeoZ = new THREE.BoxGeometry(edgeThick, edgeThick, edgeLen);

  for (const sx of [-0.48, 0.48]) {
    for (const sz of [-0.48, 0.48]) {
      computeTransformMatrix(sx, 0, sz, 0, 0, 0, 1, 1, 1, tempMat);
      parts.push({ geo: edgeGeoY, matrix: tempMat.clone(), color: goldTrim });
    }
  }
  for (const sy of [-0.48, 0.48]) {
    for (const sz of [-0.48, 0.48]) {
      computeTransformMatrix(0, sy, sz, 0, 0, 0, 1, 1, 1, tempMat);
      parts.push({ geo: edgeGeoX, matrix: tempMat.clone(), color: goldTrim });
    }
    for (const sx of [-0.48, 0.48]) {
      computeTransformMatrix(sx, sy, 0, 0, 0, 0, 1, 1, 1, tempMat);
      parts.push({ geo: edgeGeoZ, matrix: tempMat.clone(), color: goldTrim });
    }
  }

  const cornerGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  for (const sx of [-0.47, 0.47]) {
    for (const sy of [-0.47, 0.47]) {
      for (const sz of [-0.47, 0.47]) {
        computeTransformMatrix(sx, sy, sz, 0, 0, 0, 1, 1, 1, tempMat);
        parts.push({ geo: cornerGeo, matrix: tempMat.clone(), color: bronzeDark });
      }
    }
  }

  parts.push({
    geo: new THREE.BoxGeometry(1.01, 0.11, 1.01),
    matrix: computeTransformMatrix(0, 0.08, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: goldTrim
  });
  parts.push({
    geo: new THREE.BoxGeometry(0.12, 1.01, 1.01),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: bronzeDark
  });

  for (const zSign of [-1, 1]) {
    computeTransformMatrix(0, 0.02, zSign * 0.5, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new THREE.BoxGeometry(0.32, 0.38, 0.08),
      matrix: tempMat.clone(),
      color: goldTrim
    });
    computeTransformMatrix(0, 0.02, zSign * 0.525, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new THREE.BoxGeometry(0.22, 0.28, 0.05),
      matrix: tempMat.clone(),
      color: magmaBright
    });
    computeTransformMatrix(0, 0.03, zSign * 0.55, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new THREE.BoxGeometry(0.065, 0.14, 0.03),
      matrix: tempMat.clone(),
      color: keyholeDark
    });
  }

  return mergeGeometryParts(parts);
})();

const chestMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x985200,
  emissiveIntensity: 0.85,
  roughness: 0.25,
  metalness: 0.82
});

const chestAuraRingGeo = new THREE.TorusGeometry(0.88, 0.03, 6, 32);
chestAuraRingGeo.rotateX(Math.PI / 2);
const chestAuraRingMat = new THREE.MeshBasicMaterial({
  color: 0xffaa30,
  transparent: true,
  opacity: 0.72,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const chestGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowWarm,
  color: 0xff9820,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.78
});
(function prewarmChestShader() {
  const dummyChest = new THREE.Mesh(chestGeo, chestMat);
  dummyChest.position.y = -80;
  scene.add(dummyChest);
})();

// 1C. АЛТАРЬ ПАКТА — Мудборд 6
const altarGroup = new THREE.Group();
scene.add(altarGroup);

const altarPedestalGeo = (function buildAltarPedestalGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const darkStone = new THREE.Color(0x1b1228);
  const midStone = new THREE.Color(0x2d1d42);
  const runeTrim = new THREE.Color(0xa848ff);

  parts.push({
    geo: new THREE.CylinderGeometry(1.12, 1.28, 0.22, 8),
    matrix: computeTransformMatrix(0, -0.64, 0, 0, Math.PI / 8, 0, 1, 1, 1, tempMat).clone(),
    color: darkStone
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.82, 0.98, 0.26, 8),
    matrix: computeTransformMatrix(0, -0.44, 0, 0, Math.PI / 8, 0, 1, 1, 1, tempMat).clone(),
    color: midStone
  });
  const ring = new THREE.TorusGeometry(0.68, 0.035, 6, 6);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, -0.3, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: runeTrim
  });
  const buttressGeo = new THREE.BoxGeometry(0.24, 0.34, 0.36);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + Math.PI / 4;
    computeTransformMatrix(
      Math.cos(a) * 0.78,
      -0.38,
      Math.sin(a) * 0.78,
      0.28,
      -a,
      0,
      1,
      1,
      1,
      tempMat
    );
    parts.push({ geo: buttressGeo, matrix: tempMat.clone(), color: darkStone });
  }
  return mergeGeometryParts(parts);
})();

const altarGeo = (function buildHexagonalCrystalPillarGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const crystalBody = new THREE.Color(0xc868ff);
  const crystalApex = new THREE.Color(0xf0b8ff);

  parts.push({
    geo: new THREE.CylinderGeometry(0.38, 0.42, 1.72, 6),
    matrix: computeTransformMatrix(0, 0.52, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: crystalBody
  });
  parts.push({
    geo: new THREE.ConeGeometry(0.38, 0.56, 6),
    matrix: computeTransformMatrix(0, 1.66, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: crystalApex
  });
  return mergeGeometryParts(parts);
})();

const altarPedestalMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x3b1268,
  emissiveIntensity: 0.75,
  roughness: 0.65,
  metalness: 0.3
});

const altarMat = new THREE.MeshStandardMaterial({
  map: TOWER_WALL_TEXTURES.void.emissive,
  color: 0xd880ff,
  vertexColors: true,
  emissive: 0xb038ff,
  emissiveMap: TOWER_WALL_TEXTURES.void.emissive,
  emissiveIntensity: 1.95,
  roughness: 0.16,
  metalness: 0.35,
  transparent: true,
  opacity: 0.94,
  flatShading: true
});

const altarHaloGeo = new THREE.TorusGeometry(0.62, 0.038, 8, 32);
altarHaloGeo.rotateX(Math.PI / 2);
const altarHaloMat = new THREE.MeshBasicMaterial({
  color: 0xe898ff,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const altarSwirlGeo = new THREE.TorusGeometry(0.68, 0.018, 6, 28);
const altarGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowPurple,
  color: 0xd878ff,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.88
});
(function prewarmAltarShader() {
  const dummyAltar = new THREE.Mesh(altarGeo, altarMat);
  dummyAltar.position.y = -80;
  scene.add(dummyAltar);
})();

// 1D. ПЕЧАТИ ЛЕСТНИЦ (ВЕЛИКИЕ ВРАТА БОССОВ И МАЛЫЕ ПЕЧАТИ ОБЫЧНЫХ ЭТАЖЕЙ) — Мудборд 6
const bossGateSealGroup = new THREE.Group();
scene.add(bossGateSealGroup);
let bossGateVisualsByFloor = {};

const bossGateBeamMat = new THREE.MeshBasicMaterial({
  color: 0xff2a60,
  transparent: true,
  opacity: 0.92,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const bossGateCoreMat = new THREE.MeshBasicMaterial({
  color: 0xffc8d8,
  transparent: true,
  opacity: 0.96,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const bossGateGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowWhite,
  color: 0xff2a60,
  transparent: true,
  opacity: 0.9,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

// Материалы малых печатей для всех обычных этажей (открываются за 15–25 с командным мини-квестом)
const minorGateBeamMat = new THREE.MeshBasicMaterial({
  color: 0xffa828,
  transparent: true,
  opacity: 0.88,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const minorGateCoreMat = new THREE.MeshBasicMaterial({
  color: 0x68fff2,
  transparent: true,
  opacity: 0.94,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});
const minorGateGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowWhite,
  color: 0xffb830,
  transparent: true,
  opacity: 0.86,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

function createBossGateSealVisual(stairSteps, floorY, isMinorSeal = false) {
  const sealGroup = new THREE.Group();
  sealGroup.userData = { isMinorSeal: !!isMinorSeal, floorY };
  if (!stairSteps || !stairSteps.length) return sealGroup;

  // На этажах с двумя ветвями лестниц (развилки и разделённые сектора) запечатываем обе лестницы
  const anchorIndices =
    stairSteps.length >= 12
      ? isMinorSeal
        ? [0, 1, 6, 7]
        : [0, 1, 2, 6, 7, 8]
      : isMinorSeal
        ? [0, 1]
        : [0, 1, 2];

  const beamMat = isMinorSeal ? minorGateBeamMat : bossGateBeamMat;
  const coreMat = isMinorSeal ? minorGateCoreMat : bossGateCoreMat;
  const glowMat = isMinorSeal ? minorGateGlowMat : bossGateGlowMat;

  for (const idx of anchorIndices) {
    if (idx >= stairSteps.length) continue;
    const [sx, sz, stepTopY] = stairSteps[idx];
    const gateFrame = new THREE.Group();
    gateFrame.position.set(sx, stepTopY + (isMinorSeal ? 1.85 : 2.2), sz);
    gateFrame.rotation.y = Math.atan2(sx, sz) + Math.PI / 2;

    const beamOffsets = isMinorSeal
      ? [
          [-1.65, -1.55, 1.65, 1.55],
          [-1.65, 1.55, 1.65, -1.55],
          [-1.7, 0.0, 1.7, 0.0],
          [0.0, -1.65, 0.0, 1.65],
          [-1.2, -1.65, 1.2, 1.65],
          [1.2, -1.65, -1.2, 1.65]
        ]
      : [
          [-1.8, -1.9, 1.8, 1.9],
          [-1.8, 1.9, 1.8, -1.9],
          [-1.9, -0.7, 1.9, 1.1],
          [-1.9, 0.9, 1.9, -0.8],
          [-0.9, -2.1, 1.1, 2.1],
          [0.8, -2.1, -1.0, 2.1],
          [-1.8, 0.1, 1.8, 0.2],
          [-0.1, -2.0, 0.1, 2.0]
        ];

    for (const [x0, y0, x1, y1] of beamOffsets) {
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.sqrt(dx * dx + dy * dy);
      const ang = Math.atan2(dy, dx) - Math.PI / 2;
      const cx = (x0 + x1) * 0.5;
      const cy = (y0 + y1) * 0.5;

      const outerBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(isMinorSeal ? 0.055 : 0.065, isMinorSeal ? 0.055 : 0.065, len, 6),
        beamMat
      );
      outerBeam.position.set(cx, cy, 0);
      outerBeam.rotation.z = ang;
      gateFrame.add(outerBeam);

      const innerCore = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.022, len, 5),
        coreMat
      );
      innerCore.position.set(cx, cy, 0);
      innerCore.rotation.z = ang;
      gateFrame.add(innerCore);
    }

    if (isMinorSeal) {
      const runeRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.04, 6, 24),
        coreMat
      );
      gateFrame.add(runeRing);
    }

    const nexusGlow = new THREE.Sprite(glowMat);
    nexusGlow.scale.setScalar(isMinorSeal ? 2.85 : 3.4);
    gateFrame.add(nexusGlow);

    sealGroup.add(gateFrame);
  }

  bossGateSealGroup.add(sealGroup);
  return sealGroup;
}

// 1E. ГРУППЫ ОБЪЕКТОВ РАЗВИЛОК, БАЛКОНОВ И ЗАЛОВ КУЗНИЦЫ
const forkSpriteGroup = new THREE.Group();
scene.add(forkSpriteGroup);
const FORK_ROUTE_MATERIALS = {
  1: new THREE.SpriteMaterial({
    map: TEXTURES.glowWhite,
    color: 0x40ff90,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  }),
  2: new THREE.SpriteMaterial({
    map: TEXTURES.glowWhite,
    color: 0xff3a2a,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  })
};

const forgeHallGroup = new THREE.Group();
scene.add(forgeHallGroup);

const balconyVantageGroup = new THREE.Group();
scene.add(balconyVantageGroup);

const towerDecorGroup = new THREE.Group();
scene.add(towerDecorGroup);

// 3D-модель Наковальни Кузницы и Целебного Горна для безопасных «Залов Кузницы»
const forgeAnvilGeo = (function buildForgeAnvilGeometry() {
  const parts = [];
  const tempMat = new THREE.Matrix4();
  const darkIron = new THREE.Color(0x22252a);
  const bronzeTrim = new THREE.Color(0xd88c28);
  const emberCore = new THREE.Color(0xff6818);

  // Каменный восьмигранный постамент
  parts.push({
    geo: new THREE.CylinderGeometry(1.35, 1.55, 0.36, 8),
    matrix: computeTransformMatrix(0, 0.18, 0, 0, Math.PI / 8, 0, 1, 1, 1, tempMat).clone(),
    color: darkIron
  });
  // Станина наковальни с раскалённым горном внутри
  parts.push({
    geo: new THREE.BoxGeometry(1.1, 0.62, 0.72),
    matrix: computeTransformMatrix(0, 0.65, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkIron
  });
  parts.push({
    geo: new THREE.BoxGeometry(1.16, 0.22, 0.78),
    matrix: computeTransformMatrix(0, 0.65, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: emberCore
  });
  // Рабочая плита и рог наковальни
  parts.push({
    geo: new THREE.BoxGeometry(1.56, 0.34, 0.84),
    matrix: computeTransformMatrix(0, 1.12, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: bronzeTrim
  });
  const hornGeo = new THREE.ConeGeometry(0.28, 0.85, 6);
  hornGeo.rotateZ(-Math.PI / 2);
  parts.push({
    geo: hornGeo,
    matrix: computeTransformMatrix(1.1, 1.12, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: bronzeTrim
  });
  return mergeGeometryParts(parts);
})();

const forgeAnvilMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0xff5208,
  emissiveIntensity: 0.9,
  roughness: 0.32,
  metalness: 0.78
});

const readyPlateRingMat = new THREE.MeshBasicMaterial({
  color: 0x38ffe8,
  transparent: true,
  opacity: 0.88,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const readyPlateBeamMat = new THREE.MeshBasicMaterial({
  color: 0x58fff0,
  transparent: true,
  opacity: 0.22,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const balconyVantageRingMat = new THREE.MeshBasicMaterial({
  map: TEXTURES.shockwaveRunes,
  color: 0xffd858,
  transparent: true,
  opacity: 0.78,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

// Скульптурная геометрия каменной/ледяной/пустотной плиты (вписана в 1×1×1)
const sculptedSlabGeometry = (function buildSculptedSlabGeometry() {
  const parts = [];
  const topColor = new THREE.Color(0xffffff);
  const bevelColor = new THREE.Color(0xebe6f0);
  const midColor = new THREE.Color(0xd0cad8);
  const bottomColor = new THREE.Color(0x8e8898);

  parts.push({
    geo: new THREE.BoxGeometry(1.0, 0.34, 1.0),
    matrix: computeTransformMatrix(0, 0.33, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: topColor
  });
  parts.push({
    geo: new THREE.BoxGeometry(0.96, 0.14, 0.96),
    matrix: computeTransformMatrix(0, 0.1, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: bevelColor
  });
  parts.push({
    geo: new THREE.BoxGeometry(0.88, 0.24, 0.88),
    matrix: computeTransformMatrix(0, -0.08, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: midColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.64, 0.44, 0.3, 4),
    matrix: computeTransformMatrix(0, -0.35, 0, 0, Math.PI / 4, 0, 1, 1, 1, new THREE.Matrix4()),
    color: bottomColor
  });

  return mergeGeometryParts(parts);
})();

const TOWER_SLAB_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7c7e84'),
    map: TOWER_FLOOR_TEXTURES.ash.map,
    normalMap: TOWER_FLOOR_TEXTURES.ash.normalMap,
    normalScale: new THREE.Vector2(2.8, 2.8),
    roughnessMap: TOWER_FLOOR_TEXTURES.ash.roughnessMap,
    roughness: 0.9,
    metalness: 0.1,
    emissive: new THREE.Color('#ff3b00'),
    emissiveMap: TOWER_FLOOR_TEXTURES.ash.emissive,
    emissiveIntensity: 1.1,
    vertexColors: true
  }),
  ice: new THREE.MeshPhysicalMaterial({
    color: 0x8bc9eb,
    map: TOWER_FLOOR_TEXTURES.ice.map,
    emissive: new THREE.Color(0x88ddff),
    emissiveMap: TOWER_FLOOR_TEXTURES.ice.emissive,
    emissiveIntensity: 1.95,
    roughness: 0.05,
    roughnessMap: TOWER_FLOOR_TEXTURES.ice.roughnessMap,
    metalness: 0.1,
    ior: 1.31,
    reflectivity: 0.95,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMap: ICE_ENV_CUBEMAP,
    envMapIntensity: 2.1,
    bumpMap: TOWER_FLOOR_TEXTURES.ice.bump,
    bumpScale: 0.06,
    vertexColors: true
  }),
  void: new THREE.MeshStandardMaterial({
    color: 0x06040a,
    map: TOWER_FLOOR_TEXTURES.void.map,
    bumpMap: TOWER_FLOOR_TEXTURES.void.bump,
    bumpScale: 0.25,
    roughness: 0.42,
    metalness: 0.35,
    vertexColors: true
  })
};

applyWorldStoneShader(TOWER_SLAB_MATERIALS.ash, { crackRarity: 0.48, charStrength: 0.92 });
applyVoidFloorStardustShader(TOWER_SLAB_MATERIALS.void);

let blocks = [];
let jumpPads = [];
let chests = [];
let altars = [];
let floorLayouts = [];
let forkMarkers = [];
let splitFloorConfigs = {};
let balconiesByFloor = {};
let balconyVantageZones = [];
let forgeHallsByFloor = {};
let bossGateBlockIndices = {};
let stairPositionsByFloor = [];
let floorEdgeCellsByFloor = [];
let floorValidCellsByFloor = [];
let towerInstancedMesh = null;
let towerInstancedGroup = new THREE.Group();
scene.add(towerInstancedGroup);
let blockInstanceRef = [];

let activeVoidFloatingMesh = null;
let activeVoidFloatingData = [];
let activeAshLavaStreamMat = null;
let activeVoidRunePillarMat = null;

/* ---------- 2. Динамическая пространственная сетка блоков и масштаб башни (1–4 игрока, 12–24 этажа) ---------- */

let GRID_FLOORS = 24;
let GRID_DIM = 19;
let GRID_OFFSET = 9;
let TOWER_FLOOR_RADIUS = 36;
let TOWER_WALL_RADIUS = 38.18;
let TOWER_PLAYER_CLAMP_RADIUS = 37.4;
let activeCoopPlayerCount = 2;
let activeCampaignModeId = 'acts3_24';

let blockGrid = new Array(GRID_FLOORS * GRID_DIM * GRID_DIM).fill(null);
const _candidateBlockIndices = [];

/**
 * Возвращает идентификатор биома ('ash' | 'ice' | 'void') для заданного этажа
 * с поддержкой бесшовного 3-актного приключения и одиночных башен.
 */
function getFloorBiomeId(floorIndex) {
  const modeCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[activeCampaignModeId]) ||
    null;
  if (modeCfg && modeCfg.isThreeAct) {
    const fpa = modeCfg.floorsPerAct || 8;
    const actIdx = Math.min(2, Math.floor(floorIndex / fpa));
    return TOWER_IDS[actIdx] || 'ash';
  }
  if (typeof state !== 'undefined' && state && state.towerId && !state.isThreeActRun) {
    return state.towerId;
  }
  if (typeof selectedTowerId !== 'undefined' && selectedTowerId) {
    return selectedTowerId;
  }
  return currentTowerTheme ? currentTowerTheme.id : 'ash';
}

/**
 * Возвращает номер акта (1, 2 или 3) для этажа.
 */
function getFloorActNumber(floorIndex) {
  const modeCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[activeCampaignModeId]) ||
    null;
  if (modeCfg && modeCfg.isThreeAct) {
    const fpa = modeCfg.floorsPerAct || 8;
    return Math.min(3, Math.floor(floorIndex / fpa) + 1);
  }
  return 1;
}

/**
 * Проверяет, является ли этаж этажом босса в текущем режиме забега.
 */
function isBossFloorIndex(floorIndex) {
  const modeCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[activeCampaignModeId]) ||
    null;
  if (modeCfg && Array.isArray(modeCfg.bossFloors)) {
    return modeCfg.bossFloors.includes(floorIndex);
  }
  return floorIndex % 4 === 3;
}

/**
 * Проверяет, создаётся ли после данного этажа безопасный «Зал Кузницы».
 */
function hasForgeHallAfterFloor(floorIndex) {
  if (floorIndex >= GRID_FLOORS - 1) return false;
  const modeCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[activeCampaignModeId]) ||
    null;
  if (modeCfg && Array.isArray(modeCfg.forgeHallAfterFloors)) {
    return modeCfg.forgeHallAfterFloors.includes(floorIndex);
  }
  return floorIndex % 4 === 3 && floorIndex < GRID_FLOORS - 1;
}

/**
 * Настраивает глобальный размер сетки этажа (15×15 / 19×19 / 23×23) и число этажей (12 / 18 / 24),
 * а также масштабирует внешние стены башни, купол и плоскость лавы.
 */
function configureTowerSpatialScale(playerCount = 2, campaignModeId = 'acts3_24') {
  activeCoopPlayerCount = Math.max(1, Math.min(4, playerCount | 0));
  activeCampaignModeId =
    campaignModeId && typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[campaignModeId]
      ? campaignModeId
      : 'acts3_24';

  const preset =
    (typeof COOP_SCALE_PRESETS !== 'undefined' && COOP_SCALE_PRESETS[activeCoopPlayerCount]) || {
      gridDim: activeCoopPlayerCount <= 1 ? 15 : activeCoopPlayerCount === 2 ? 19 : 23,
      gridOffset: activeCoopPlayerCount <= 1 ? 7 : activeCoopPlayerCount === 2 ? 9 : 11,
      radiusMeters: activeCoopPlayerCount <= 1 ? 28 : activeCoopPlayerCount === 2 ? 36 : 44
    };

  const modeCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[activeCampaignModeId]) || {
      totalFloors: 24
    };

  GRID_DIM = preset.gridDim;
  GRID_OFFSET = preset.gridOffset;
  GRID_FLOORS = modeCfg.totalFloors || 24;
  TOWER_FLOOR_RADIUS = preset.radiusMeters;
  TOWER_WALL_RADIUS = TOWER_FLOOR_RADIUS + 2.18;
  TOWER_PLAYER_CLAMP_RADIUS = TOWER_FLOOR_RADIUS + 1.4;

  // Масштабируем внешний цилиндр стен башни, ледяную глазурь, купол Пустоты и море лавы
  const wallScaleXZ = (TOWER_FLOOR_RADIUS + 2.8) / 30.8;
  const totalTowerHeight = GRID_FLOORS * 14 + 75;
  const wallScaleY = totalTowerHeight / 225;
  const wallCenterY = (GRID_FLOORS * 14) * 0.5 - 10;

  if (typeof towerWallMesh !== 'undefined' && towerWallMesh) {
    towerWallMesh.position.set(0, wallCenterY, 0);
    towerWallMesh.scale.set(wallScaleXZ, wallScaleY, wallScaleXZ);
    towerWallMesh.updateMatrix();
  }
  if (typeof iceInnerGlazeMesh !== 'undefined' && iceInnerGlazeMesh) {
    iceInnerGlazeMesh.position.set(0, wallCenterY, 0);
    iceInnerGlazeMesh.scale.set(wallScaleXZ, wallScaleY, wallScaleXZ);
    iceInnerGlazeMesh.updateMatrix();
  }
  if (typeof voidSkyDomeGroup !== 'undefined' && voidSkyDomeGroup) {
    voidSkyDomeGroup.position.y = GRID_FLOORS * 14 + 18;
    voidSkyDomeGroup.scale.setScalar(wallScaleXZ);
  }
  if (typeof lavaMesh !== 'undefined' && lavaMesh) {
    const lavaScale = Math.max(1, wallScaleXZ * 1.15);
    lavaMesh.scale.set(lavaScale, lavaScale, 1);
  }
  if (typeof hazardIceGroup !== 'undefined' && hazardIceGroup) {
    hazardIceGroup.scale.set(wallScaleXZ, 1, wallScaleXZ);
  }
}

function getBlockGridKey(floorIndex, ix, iz) {
  return (
    floorIndex * (GRID_DIM * GRID_DIM) +
    (ix + GRID_OFFSET) * GRID_DIM +
    (iz + GRID_OFFSET)
  );
}

function insertBlockIntoGrid(blockIndex) {
  const block = blocks[blockIndex];
  const ix = Math.round((block[0] + block[1]) / 8);
  const iz = Math.round((block[2] + block[3]) / 8);
  const floorIndex = block[6];
  if (
    ix < -GRID_OFFSET ||
    ix > GRID_OFFSET ||
    iz < -GRID_OFFSET ||
    iz > GRID_OFFSET ||
    floorIndex < 0 ||
    floorIndex >= GRID_FLOORS
  ) {
    return;
  }
  const key = getBlockGridKey(floorIndex, ix, iz);
  if (!blockGrid[key]) blockGrid[key] = [];
  blockGrid[key].push(blockIndex);
}

function collectNearbyBlocks(x, z, centerFloor, outIndices) {
  outIndices.length = 0;
  const ix0 = Math.round(x / 4);
  const iz0 = Math.round(z / 4);

  for (let f = centerFloor - 1; f <= centerFloor + 1; f++) {
    if (f < 0 || f >= GRID_FLOORS) continue;
    for (let a = ix0 - 1; a <= ix0 + 1; a++) {
      if (a < -GRID_OFFSET || a > GRID_OFFSET) continue;
      for (let c = iz0 - 1; c <= iz0 + 1; c++) {
        if (c < -GRID_OFFSET || c > GRID_OFFSET) continue;
        const cell = blockGrid[getBlockGridKey(f, a, c)];
        if (cell) {
          for (let k = 0; k < cell.length; k++) {
            outIndices.push(cell[k]);
          }
        }
      }
    }
  }
}

function isCollidingWithBlock(block, x, y, z) {
  return (
    x + 0.4 > block[0] &&
    x - 0.4 < block[1] &&
    z + 0.4 > block[2] &&
    z - 0.4 < block[3] &&
    y < block[5] - 0.05 &&
    y + 1.6 > block[4]
  );
}

function getGroundHeightAt(x, y, z) {
  let groundY = state ? state.lavaY : -10;
  const centerFloor = Math.floor(y / 14);
  collectNearbyBlocks(x, z, centerFloor, _candidateBlockIndices);

  for (let k = 0; k < _candidateBlockIndices.length; k++) {
    const block = blocks[_candidateBlockIndices[k]];
    if (
      x > block[0] - 0.4 &&
      x < block[1] + 0.4 &&
      z > block[2] - 0.4 &&
      z < block[3] + 0.4 &&
      block[5] <= y + 1.5
    ) {
      if (block[5] > groundY) {
        groundY = block[5];
      }
    }
  }
  return groundY;
}

/**
 * Проверяет, стоит ли игрок/союзник на вертикальном полуэтаже-балконе (floorY + 6).
 * Возвращает объект балкона (с бонусами для снайперских билдов) или null.
 */
function getActiveBalconyUnderPlayer(px, py, pz) {
  const floorIdx = Math.floor(py / 14);
  const localY = py - floorIdx * 14;
  if (Math.abs(localY - 6.0) > 1.1) return null;
  const list = balconiesByFloor[floorIdx];
  if (!list || !list.length) return null;
  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    if (hypot2D(px - b.centerX, pz - b.centerZ) <= b.extentRadius + 3.2) {
      return b;
    }
  }
  return null;
}

/**
 * Определяет, в каком изолированном секторе (1 — зелёный «тихий путь», 2 — красный «опасный путь»)
 * находится координата (x, z) на этаже после развилки.
 */
function getSectorRouteAtPosition(floorIndex, x, z) {
  const cfg = splitFloorConfigs[floorIndex];
  if (!cfg) return 0;
  const proj = x * cfg.axisCos + z * cfg.axisSin;
  return proj >= 0 ? cfg.positiveRoute : cfg.negativeRoute;
}

function isFloorGateSealed(floorIndex) {
  const gateIndices = bossGateBlockIndices[floorIndex];
  return !!(gateIndices && gateIndices.length > 0);
}

function openBossGate(floorIndex) {
  const gateIndices = bossGateBlockIndices[floorIndex] || [];
  for (const blockIdx of gateIndices) {
    const block = blocks[blockIdx];
    if (!block) continue;
    block[4] = -999;
    block[5] = -998;
    const ref = blockInstanceRef[blockIdx];
    if (ref && ref.mesh) {
      _pickupDummyObj.position.set(0, -999, 0);
      _pickupDummyObj.rotation.set(0, 0, 0);
      _pickupDummyObj.scale.set(0, 0, 0);
      _pickupDummyObj.updateMatrix();
      ref.mesh.setMatrixAt(ref.instanceId, _pickupDummyObj.matrix);
      ref.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  const sealVisual = bossGateVisualsByFloor[floorIndex];
  if (sealVisual) {
    sealVisual.traverse((child) => {
      if (child.isSprite && typeof spawnSparkBurst === 'function') {
        const wp = new THREE.Vector3();
        child.getWorldPosition(wp);
        spawnSparkBurst(wp.x, wp.y, wp.z, 24, sealVisual.userData && sealVisual.userData.isMinorSeal ? 'xp' : 'fire');
      }
    });
    sealVisual.visible = false;
  }
  bossGateBlockIndices[floorIndex] = [];
}

/**
 * Находит ближайшую безопасную плиту выше текущего уровня лавы (для появления «Угасающего угля» павшего игрока).
 */
function findNearestSafeSlabAboveLava(x, y, z, minClearance = 0.8) {
  const minSafeY = (typeof state !== 'undefined' && state ? state.lavaY : -10) + minClearance;
  let bestSlab = null;
  let bestScore = 1e12;

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    // Пропускаем барьеры печатей (tag === 3) и удалённые блоки
    if (!b || b[7] === 3 || b[5] < minSafeY) continue;
    // Предпочитаем обычные плиты пола, балконов или Зала Кузницы (толщина <= 1.5 м)
    const rawH = b[5] - b[4];
    const isStair = rawH > 1.5 && b[7] !== 4 && b[7] !== 7;
    const cx = (b[0] + b[1]) * 0.5;
    const cz = (b[2] + b[3]) * 0.5;
    const topY = b[5];
    const dx = cx - x;
    const dz = cz - z;
    const dy = topY - y;
    const score = dx * dx + dz * dz + Math.abs(dy) * 18 + (isStair ? 65 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestSlab = { x: cx, y: topY, z: cz, floor: b[6] };
    }
  }

  if (!bestSlab) {
    const fallbackFloor = Math.min(GRID_FLOORS - 1, Math.max(0, Math.ceil(minSafeY / 14)));
    return { x: 0, y: fallbackFloor * 14, z: 0, floor: fallbackFloor };
  }
  return bestSlab;
}

/* ---------- 3. Генерация архитектурного окружения и деталей по темам башен ---------- */

function buildFrozenSilhouetteBaseGeometry() {
  const parts = [];
  const darkIceColor = new THREE.Color(0x0c2240);
  const cloakColor = new THREE.Color(0x14365e);
  const frostCoreColor = new THREE.Color(0x88dcff);

  parts.push({
    geo: new THREE.ConeGeometry(0.42, 0.85, 6),
    matrix: computeTransformMatrix(0, 1.72, 0, 0.12, 0, 0, 0.95, 1.0, 0.85, new THREE.Matrix4()),
    color: darkIceColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.68, 0.82, 0.55, 6),
    matrix: computeTransformMatrix(0, 1.12, 0, 0, 0, 0, 1.15, 1.0, 0.65, new THREE.Matrix4()),
    color: cloakColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.52, 0.85, 2.2, 7),
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1.0, 1.0, 0.62, new THREE.Matrix4()),
    color: darkIceColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.15, 0.18, 1.05, 6),
    matrix: computeTransformMatrix(-0.42, 0.72, 0.18, 0.35, 0, -0.45, 1, 1, 1, new THREE.Matrix4()),
    color: cloakColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.15, 0.18, 1.05, 6),
    matrix: computeTransformMatrix(0.42, 0.72, 0.18, 0.35, 0, 0.45, 1, 1, 1, new THREE.Matrix4()),
    color: cloakColor
  });
  parts.push({
    geo: new THREE.CylinderGeometry(0.06, 0.06, 2.7, 5),
    matrix: computeTransformMatrix(0, 0.55, 0.28, 0.05, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: darkIceColor
  });
  parts.push({
    geo: new THREE.OctahedronGeometry(0.32, 0),
    matrix: computeTransformMatrix(0, 0.88, 0.22, 0.2, 0.3, 0, 0.9, 1.4, 0.8, new THREE.Matrix4()),
    color: frostCoreColor
  });
  parts.push({
    geo: new THREE.ConeGeometry(0.35, 1.8, 5),
    matrix: computeTransformMatrix(0.55, 0.4, 0.15, -0.2, 0, -0.65, 1, 1, 1, new THREE.Matrix4()),
    color: frostCoreColor
  });

  return mergeGeometryParts(parts);
}

const frozenSilhouetteBaseGeo = buildFrozenSilhouetteBaseGeometry();

let ashFloorLavaPuddles = [];
let ashWallStreamGlobs = [];
let ashFallingDrops = [];
let voidFloatingDebrisMeshes = [];
let voidMistBillboards = [];
let voidDissolvedStairStepSet = new Set();

function clearTowerDecorGroup() {
  for (let i = towerDecorGroup.children.length - 1; i >= 0; i--) {
    const child = towerDecorGroup.children[i];
    towerDecorGroup.remove(child);
    if (child.geometry && child.geometry !== frozenSilhouetteBaseGeo) {
      child.geometry.dispose();
    }
    if (child.material && child.userData && child.userData.disposeMaterial) {
      child.material.dispose();
    }
  }
  activeVoidFloatingMesh = null;
  activeVoidFloatingData = [];
  activeAshLavaStreamMat = null;
  activeVoidRunePillarMat = null;

  ashFloorLavaPuddles = [];
  ashWallStreamGlobs = [];
  ashFallingDrops = [];
  voidFloatingDebrisMeshes = [];
  voidMistBillboards = [];

  TOWER_SHADER_UNIFORMS.ashFlows.length = 0;
  TOWER_SHADER_UNIFORMS.ashPuddles.length = 0;
  TOWER_SHADER_UNIFORMS.iceCreepingFog.length = 0;
}

function getActiveLavaPuddleUnderPlayer(px, py, pz) {
  if (!ashFloorLavaPuddles.length) return null;
  for (let i = 0; i < ashFloorLavaPuddles.length; i++) {
    const p = ashFloorLavaPuddles[i];
    if (Math.abs(py - p.y) < 0.68) {
      const dx = px - p.x;
      const dz = pz - p.z;
      if (dx * dx + dz * dz < p.hitRadiusSq) {
        return p;
      }
    }
  }
  return null;
}

/**
 * Строит детализированное 3D-окружение башни по всем этажам (12 / 18 / 24 этажа),
 * включая кронштейны балконов (floorY + 6), барьеры разделённых секторов и декор 3 актов.
 */
function buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor, floorValidCellsByFloor) {
  clearTowerDecorGroup();

  const structurePartsByBiome = { ash: [], ice: [], void: [] };
  const accentPartsByBiome = { ash: [], ice: [], void: [] };
  const tempMat = new THREE.Matrix4();

  const pillarCount = GRID_OFFSET >= 11 ? 12 : GRID_OFFSET >= 9 ? 10 : 8;
  const wallRadius = TOWER_WALL_RADIUS;

  const biomePalette = {
    ash: {
      primary: new THREE.Color(0x6e7076),
      secondary: new THREE.Color(0x28282c),
      glow: new THREE.Color(0xff6a15)
    },
    ice: {
      primary: new THREE.Color(0x88c8ec),
      secondary: new THREE.Color(0xb8e6ff),
      glow: new THREE.Color(0x88e4ff)
    },
    void: {
      primary: new THREE.Color(0x180b2c),
      secondary: new THREE.Color(0x28124a),
      glow: new THREE.Color(0xc458ff)
    }
  };

  const pillarSectionGeo = new THREE.CylinderGeometry(0.95, 1.15, 14, 6);
  const capitalGeo = new THREE.CylinderGeometry(1.5, 1.08, 1.35, 6);
  const archSegmentGeo = new THREE.BoxGeometry(5.6, 0.95, 0.95);
  const balconyStrutGeo = new THREE.BoxGeometry(0.65, 3.8, 0.65);

  // 1. Периметральные контрфорсы, капители и стрельчатые арки по всем этажам
  for (let floor = 0; floor < GRID_FLOORS; floor++) {
    const floorY = floor * 14;
    const biomeId = getFloorBiomeId(floor);
    const pal = biomePalette[biomeId] || biomePalette.ash;
    const structureParts = structurePartsByBiome[biomeId];
    const accentParts = accentPartsByFloorBiome(accentPartsByBiome, biomeId);

    for (let p = 0; p < pillarCount; p++) {
      const angle = (p / pillarCount) * TWO_PI;
      const px = Math.cos(angle) * wallRadius;
      const pz = Math.sin(angle) * wallRadius;
      const rotY = -angle + Math.PI / 2;

      computeTransformMatrix(px, floorY + 7, pz, 0, rotY, 0, 1, 1, 0.78, tempMat);
      structureParts.push({
        geo: pillarSectionGeo,
        matrix: tempMat.clone(),
        color: pal.primary
      });

      computeTransformMatrix(px, floorY + 0.2, pz, 0, rotY, 0, 1.15, 1, 0.88, tempMat);
      structureParts.push({
        geo: capitalGeo,
        matrix: tempMat.clone(),
        color: pal.secondary
      });

      if (floor % 2 === 1) {
        for (const side of [-0.22, 0.22]) {
          const aAngle = ((p + 0.5 + side) / pillarCount) * TWO_PI;
          const ax = Math.cos(aAngle) * (wallRadius + 0.12);
          const az = Math.sin(aAngle) * (wallRadius + 0.12);
          const aRotY = -aAngle + Math.PI / 2;
          computeTransformMatrix(ax, floorY + 0.4, az, 0, aRotY, side > 0 ? -0.28 : 0.28, 0.95, 1, 0.75, tempMat);
          structureParts.push({
            geo: archSegmentGeo,
            matrix: tempMat.clone(),
            color: pal.secondary
          });
        }
      }
    }

    // Опорные наклонные консоли под полуэтажами-балконами (floorY + 6)
    const floorBalconies = balconiesByFloor[floor] || [];
    for (let bIdx = 0; bIdx < floorBalconies.length; bIdx++) {
      const bal = floorBalconies[bIdx];
      for (let cIdx = 0; cIdx < bal.cells.length; cIdx += 2) {
        const [bx, bz] = bal.cells[cIdx];
        const bAngle = Math.atan2(bz, bx);
        const wallX = Math.cos(bAngle) * (wallRadius - 1.2);
        const wallZ = Math.sin(bAngle) * (wallRadius - 1.2);
        computeTransformMatrix(
          (bx + wallX) * 0.5,
          floorY + 4.1,
          (bz + wallZ) * 0.5,
          0.45,
          -bAngle + Math.PI / 2,
          0,
          1,
          1,
          1,
          tempMat
        );
        structureParts.push({
          geo: balconyStrutGeo,
          matrix: tempMat.clone(),
          color: pal.secondary
        });
        accentParts.push({
          geo: new THREE.OctahedronGeometry(0.28, 0),
          matrix: computeTransformMatrix(bx, floorY + 6.45, bz, 0, 0, 0, 1, 1.35, 1, new THREE.Matrix4()),
          color: pal.glow
        });
      }
    }
  }

  function accentPartsByFloorBiome(map, bId) {
    return map[bId] || map.ash;
  }

  // 2. Карнизы и опорные элементы лестниц
  const stairStepTrimGeo = new THREE.BoxGeometry(4.18, 0.34, 4.18);
  const stairPostGeo = new THREE.CylinderGeometry(0.25, 0.34, 1.4, 6);

  for (let floor = 0; floor < GRID_FLOORS - 1; floor++) {
    const biomeId = getFloorBiomeId(floor);
    const pal = biomePalette[biomeId] || biomePalette.ash;
    const structureParts = structurePartsByBiome[biomeId];
    const accentParts = accentPartsByBiome[biomeId];

    const stairs = stairPositionsByFloor[floor] || [];
    for (let s = 0; s < stairs.length; s++) {
      const [sx, sz, topY, stepBlockIdx] = stairs[s];
      const isDissolvedVoidStep = biomeId === 'void' && voidDissolvedStairStepSet.has(stepBlockIdx);

      if (!isDissolvedVoidStep) {
        computeTransformMatrix(sx, topY - 0.14, sz, 0, 0, 0, 1, 1, 1, tempMat);
        structureParts.push({
          geo: stairStepTrimGeo,
          matrix: tempMat.clone(),
          color: pal.secondary
        });
      }

      const colH = Math.max(0.5, topY - floor * 14 - 1.1);
      if (colH > 0.8 && !isDissolvedVoidStep && biomeId !== 'void') {
        computeTransformMatrix(
          sx,
          floor * 14 + colH * 0.5,
          sz,
          0,
          s * 0.5,
          0,
          1.05,
          colH / 14,
          1.05,
          tempMat
        );
        structureParts.push({
          geo: pillarSectionGeo,
          matrix: tempMat.clone(),
          color: pal.primary
        });
      }

      if (s % 6 === 0 || s % 6 === 5) {
        for (const sign of [-1, 1]) {
          computeTransformMatrix(sx + sign * 1.65, topY + 0.65, sz + sign * 1.65, 0, 0, 0, 1, 1, 1, tempMat);
          structureParts.push({
            geo: stairPostGeo,
            matrix: tempMat.clone(),
            color: pal.primary
          });
          accentParts.push({
            geo: new THREE.OctahedronGeometry(0.3, 0),
            matrix: computeTransformMatrix(
              sx + sign * 1.65,
              topY + 1.52,
              sz + sign * 1.65,
              0,
              0,
              0,
              1,
              1.35,
              1,
              new THREE.Matrix4()
            ),
            color: pal.glow
          });
        }
      }
    }
  }

  // 3. Детали окружения каждого этажа по его биому (Пепельная / Ледяная / Пустотная башни)
  let sharedStreamMat = null;
  let sharedStairLavaMat = null;
  const charredRockParts = [];
  const dodoGeo = new THREE.DodecahedronGeometry(0.42, 0);

  const icicleGeo = new THREE.ConeGeometry(0.24, 2.2, 5);
  const crystalSpikeGeo = new THREE.ConeGeometry(0.38, 2.8, 6);
  const frostCrustParts = [];
  const silhouetteParts = [];
  const crustBoxGeo = jitterGeometry(new THREE.BoxGeometry(4.12, 0.18, 4.12, 3, 1, 3), 0.06);

  let fogPatchGeo = null;
  const CREEPING_FOG_VERTEX = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  const CREEPING_FOG_FRAGMENT = `
    uniform float uTime;
    uniform float uSeed;
    varying vec2 vUv;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float valueNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
      );
    }
    void main() {
      vec2 centered = (vUv - 0.5) * 2.0;
      float r = length(centered);
      if (r > 1.0) discard;
      vec2 flowUv = vUv * 3.2 + vec2(uTime * 0.14 + uSeed, -uTime * 0.09 + uSeed * 1.7);
      float n1 = valueNoise(flowUv);
      float n2 = valueNoise(flowUv * 2.1 - vec2(uTime * 0.18, uTime * 0.11));
      float vapor = n1 * 0.6 + n2 * 0.4;
      float mask = pow(1.0 - r, 1.6) * smoothstep(0.28, 0.78, vapor);
      vec3 mistColor = mix(vec3(0.53, 0.87, 1.0), vec3(0.90, 0.97, 1.0), vapor);
      gl_FragColor = vec4(mistColor, mask * 0.34);
    }
  `;

  let voidMaterialsInitialized = false;
  let ribbonMat = null;
  let mistMat = null;
  let dissolvedStairMat = null;
  let partialDissolveStairMat = null;
  let phantomStepOutlineMat = null;
  const runeTabletGeo = new THREE.BoxGeometry(0.95, 5.4, 0.34);
  const stepBoxGeo = new THREE.BoxGeometry(3.92, 0.85, 3.92, 4, 2, 4);
  const stepTopFrameGeo = new THREE.BoxGeometry(3.96, 0.08, 3.96, 2, 1, 2);
  const shardGeo = new THREE.DodecahedronGeometry(0.36, 0);
  const voidFloorsList = [];

  for (let floor = 0; floor < GRID_FLOORS; floor++) {
    const floorY = floor * 14;
    const biomeId = getFloorBiomeId(floor);
    const accentParts = accentPartsByBiome[biomeId];

    // --- 3A. ПЕПЕЛЬНАЯ БАШНЯ (ASH) ---
    if (biomeId === 'ash') {
      if (!sharedStreamMat) {
        sharedStreamMat = createFlowingLavaMaterial(11.3);
        sharedStairLavaMat = createFlowingLavaMaterial(105.5);
      }

      const streamCountOnFloor = 2;
      for (let sIdx = 0; sIdx < streamCountOnFloor; sIdx++) {
        const streamSeed = floor * 31.7 + sIdx * 17.3 + 11.3;
        const baseAngle =
          ((floor * 3 + sIdx * 4 + 0.5) / pillarCount) * TWO_PI +
          (seededRandom(seed, 'ashWA', floor * 10 + sIdx) - 0.5) * 0.28;
        const topY = floorY + 12.8;
        const botY = floorY + 0.04;
        const startR = wallRadius - 0.03;
        const endR = TOWER_FLOOR_RADIUS + 0.1;
        const baseRadius = 0.38 + seededRandom(seed, 'ashWR', floor * 10 + sIdx) * 0.16;

        for (let c = 0; c < 4; c++) {
          const ca = baseAngle + (c - 1.5) * 0.025;
          computeTransformMatrix(
            Math.cos(ca) * (startR - 0.15),
            topY + (texSeededRandom(streamSeed + c) - 0.5) * 1.1,
            Math.sin(ca) * (startR - 0.15),
            c * 0.4,
            -ca,
            0.2,
            1.4,
            1.8,
            1.0,
            tempMat
          );
          charredRockParts.push({ geo: dodoGeo, matrix: tempMat.clone() });
        }

        const ptsCount = 10;
        const mainPoints = [];
        for (let p = 0; p <= ptsCount; p++) {
          const t = p / ptsCount;
          const curY = topY + (botY - topY) * t;
          const meanderAngle =
            baseAngle +
            Math.sin(t * Math.PI * 3.0 + streamSeed) * 0.032 +
            Math.cos(t * 7.0 + streamSeed) * 0.014;
          const easeOut = Math.pow(t, 2.3);
          const curR = startR + (endR - startR) * easeOut + Math.sin(t * 14.0 + streamSeed) * 0.22;
          mainPoints.push(new THREE.Vector3(Math.cos(meanderAngle) * curR, curY, Math.sin(meanderAngle) * curR));
        }

        const mainCurve = new THREE.CatmullRomCurve3(mainPoints);
        const streamGeo = createVariableTubeGeometry(mainCurve, 28, baseRadius, streamSeed);
        const streamMesh = new THREE.Mesh(streamGeo, sharedStreamMat);
        towerDecorGroup.add(streamMesh);

        for (let cl = 1; cl < ptsCount; cl += 2) {
          const pt = mainPoints[cl];
          computeTransformMatrix(pt.x * 1.008, pt.y, pt.z * 1.008, cl * 0.3, cl * 0.5, 0, 1.1, 1.5, 1.1, tempMat);
          charredRockParts.push({ geo: dodoGeo, matrix: tempMat.clone() });
        }

        const branchPts = [];
        const splitT = 0.32;
        const sideSign = sIdx % 2 === 0 ? 1 : -1;
        for (let bp = 0; bp <= 6; bp++) {
          const bt = splitT + (bp / 6) * 0.52;
          const basePt = mainCurve.getPointAt(bt);
          const spread = (bp / 6) * 0.045 * sideSign;
          const ba = Math.atan2(basePt.z, basePt.x) + spread;
          const br = Math.sqrt(basePt.x * basePt.x + basePt.z * basePt.z);
          branchPts.push(new THREE.Vector3(Math.cos(ba) * br, basePt.y, Math.sin(ba) * br));
        }
        const branchCurve = new THREE.CatmullRomCurve3(branchPts);
        const branchGeo = createVariableTubeGeometry(branchCurve, 16, baseRadius * 0.58, streamSeed + 7.1);
        const branchMesh = new THREE.Mesh(branchGeo, sharedStreamMat);
        towerDecorGroup.add(branchMesh);

        for (let g = 0; g < 2; g++) {
          const globGeo = new THREE.SphereGeometry(baseRadius * 0.72, 8, 8);
          globGeo.scale(0.85, 1.65, 0.85);
          const globMesh = new THREE.Mesh(globGeo, sharedStreamMat);
          towerDecorGroup.add(globMesh);
          ashWallStreamGlobs.push({
            mesh: globMesh,
            curve: mainCurve,
            phase: g * 0.5 + texSeededRandom(streamSeed + g) * 0.25,
            speed: 0.18 + texSeededRandom(streamSeed * 2 + g) * 0.08
          });
        }
      }

      const validFloorCells = floorValidCellsByFloor[floor] || [];
      if (validFloorCells.length > 0) {
        const puddleTargetCount = isBossFloorIndex(floor) ? 2 : 3;
        let placedPuddles = 0;
        for (let attempt = 0; attempt < 18 && placedPuddles < puddleTargetCount; attempt++) {
          const pickIdx = Math.floor(
            seededRandom(seed, 'ashPud' + floor, attempt * 7) * validFloorCells.length
          );
          const [cellX, cellZ] = validFloorCells[pickIdx];
          if (floor === 0 && cellX * cellX + cellZ * cellZ < 48) continue;
          if (jumpPads.some((jp) => Math.abs(jp.y - floorY) < 1 && hypot2D(jp.x - cellX, jp.z - cellZ) < 3.8)) continue;
          if (chests.some((ch) => Math.abs(ch.y - floorY) < 1 && hypot2D(ch.x - cellX, ch.z - cellZ) < 3.8)) continue;
          if (altars.some((al) => Math.abs(al.y - floorY) < 1 && hypot2D(al.x - cellX, al.z - cellZ) < 3.8)) continue;
          if (
            ashFloorLavaPuddles.some(
              (p) => Math.abs(p.y - floorY) < 1 && hypot2D(p.x - cellX, p.z - cellZ) < 5.2
            )
          ) {
            continue;
          }

          const jitterX = (seededRandom(seed, 'ashPx' + floor, attempt) - 0.5) * 1.1;
          const jitterZ = (seededRandom(seed, 'ashPz' + floor, attempt) - 0.5) * 1.1;
          const px = cellX + jitterX;
          const pz = cellZ + jitterZ;
          const puddleRadius = 1.45 + seededRandom(seed, 'ashPr' + floor, attempt) * 0.65;
          const puddleSeed = floor * 19.3 + placedPuddles * 5.7 + 1.1;

          const puddleMeshGroup = createOrganicPuddleMesh(
            puddleRadius,
            puddleSeed,
            placedPuddles % 2 === 0
          );
          puddleMeshGroup.position.set(px, floorY + 0.015, pz);
          towerDecorGroup.add(puddleMeshGroup);

          const slagCount = 5;
          for (let k = 0; k < slagCount; k++) {
            const sa = (k / slagCount) * TWO_PI + texSeededRandom(puddleSeed + k) * 0.4;
            const sr = puddleRadius * (0.88 + texSeededRandom(puddleSeed * 2 + k) * 0.2);
            computeTransformMatrix(
              px + Math.cos(sa) * sr,
              floorY + 0.04,
              pz + Math.sin(sa) * sr,
              0,
              sa,
              0,
              0.7,
              0.22,
              0.6,
              tempMat
            );
            charredRockParts.push({ geo: dodoGeo, matrix: tempMat.clone() });
          }

          ashFloorLavaPuddles.push({
            x: px,
            y: floorY,
            z: pz,
            radius: puddleRadius,
            hitRadiusSq: (puddleRadius * 0.88) * (puddleRadius * 0.88)
          });
          placedPuddles++;
        }
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        if (s % 3 !== 1) continue;
        const [sx, sz, topY] = stairs[s];
        const dripSeed = 200 + floor * 41.3 + s * 7.3;
        const sideSign = s % 2 === 0 ? 1 : -1;
        const stepAngle = Math.atan2(sz, sx);
        const cosA = Math.cos(-stepAngle);
        const sinA = Math.sin(-stepAngle);

        const localOffsetX = sideSign * 1.15;
        const localOffsetZ = 1.65;

        const toWorld = (lx, ly, lz) =>
          new THREE.Vector3(
            sx + lx * cosA + lz * sinA,
            topY + ly,
            sz - lx * sinA + lz * cosA
          );

        const topMiniPuddle = createOrganicPuddleMesh(0.55, dripSeed + 1.1, false);
        topMiniPuddle.position.set(sx + localOffsetX * 0.35, topY + 0.015, sz + localOffsetZ * 0.25);
        towerDecorGroup.add(topMiniPuddle);

        const overhangLen = 0.95 + texSeededRandom(dripSeed * 5.3) * 0.85;
        const tongueCurve = new THREE.CatmullRomCurve3([
          toWorld(localOffsetX * 0.35, 0.02, localOffsetZ * 0.35),
          toWorld(localOffsetX * 0.72, -0.02, localOffsetZ * 0.82),
          toWorld(localOffsetX * 0.92, -0.22, localOffsetZ * 1.04),
          toWorld(localOffsetX * 0.96, -0.58 - overhangLen * 0.45, localOffsetZ * 1.08),
          toWorld(localOffsetX * 0.98, -0.58 - overhangLen, localOffsetZ * 1.10)
        ]);

        const tongueGeo = createVariableTubeGeometry(tongueCurve, 16, 0.16, dripSeed);
        const tongueMesh = new THREE.Mesh(tongueGeo, sharedStairLavaMat);
        towerDecorGroup.add(tongueMesh);

        const lipPos = toWorld(localOffsetX * 0.82, -0.05, localOffsetZ * 0.92);
        computeTransformMatrix(lipPos.x, lipPos.y, lipPos.z, 0, stepAngle, 0, 0.85, 0.32, 0.85, tempMat);
        charredRockParts.push({ geo: dodoGeo, matrix: tempMat.clone() });

        const dripTipPos = tongueCurve.getPointAt(1.0);
        const impactY = s > 0 ? stairs[s - 1][2] : floorY;

        const smallPuddleRadius = 0.68 + texSeededRandom(dripSeed * 19.3) * 0.35;
        const smallPuddle = createOrganicPuddleMesh(smallPuddleRadius, dripSeed + 4.7, true);
        smallPuddle.position.set(dripTipPos.x, impactY + 0.015, dripTipPos.z);
        towerDecorGroup.add(smallPuddle);

        ashFloorLavaPuddles.push({
          x: dripTipPos.x,
          y: impactY,
          z: dripTipPos.z,
          radius: smallPuddleRadius,
          hitRadiusSq: (smallPuddleRadius * 0.85) * (smallPuddleRadius * 0.85)
        });

        const dropGeo = new THREE.SphereGeometry(0.14, 8, 8);
        dropGeo.scale(0.8, 1.7, 0.8);
        const dropMesh = new THREE.Mesh(dropGeo, sharedStairLavaMat);
        dropMesh.position.copy(dripTipPos);
        towerDecorGroup.add(dropMesh);

        ashFallingDrops.push({
          mesh: dropMesh,
          startX: dripTipPos.x,
          startY: dripTipPos.y,
          startZ: dripTipPos.z,
          endY: impactY + 0.03,
          phase: texSeededRandom(dripSeed * 29.1),
          speed: 0.52 + texSeededRandom(dripSeed * 31.7) * 0.25
        });
      }
    }

    // --- 3B. ЛЕДЯНАЯ БАШНЯ (ICE) ---
    else if (biomeId === 'ice') {
      if (!fogPatchGeo) {
        fogPatchGeo = new THREE.PlaneGeometry(8.5, 8.5);
        fogPatchGeo.rotateX(-Math.PI / 2);
      }

      for (let s = 0; s < 4; s++) {
        const angle = ((s + 0.5) / 4) * TWO_PI + (floor % 2) * 0.38;
        const silRadius = wallRadius + 0.95;
        const sx = Math.cos(angle) * silRadius;
        const sz = Math.sin(angle) * silRadius;
        const rotY = -angle - Math.PI / 2;
        const tiltZ = ((floor + s) % 3 - 1) * 0.08;
        const scale = 1.45 + ((floor + s) % 2) * 0.25;

        computeTransformMatrix(
          sx,
          floorY + 5.2 + (s % 2) * 2.4,
          sz,
          0.06,
          rotY,
          tiltZ,
          scale,
          scale,
          scale,
          tempMat
        );
        silhouetteParts.push({
          geo: frozenSilhouetteBaseGeo.clone(),
          matrix: tempMat.clone()
        });

        if ((floor + s) % 2 === 0 && ICE_SILHOUETTE_TEXTURES.length) {
          const silPlaneAngle = angle + 0.32;
          const silPlaneGeo = new THREE.PlaneGeometry(4.2, 8.4);
          const silPlaneMat = new THREE.MeshBasicMaterial({
            map: ICE_SILHOUETTE_TEXTURES[(floor + s) % ICE_SILHOUETTE_TEXTURES.length],
            transparent: true,
            opacity: 0.84,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const silPlaneMesh = new THREE.Mesh(silPlaneGeo, silPlaneMat);
          const py = floorY + 6.5;
          silPlaneMesh.position.set(
            Math.cos(silPlaneAngle) * (wallRadius + 1.1),
            py,
            Math.sin(silPlaneAngle) * (wallRadius + 1.1)
          );
          silPlaneMesh.lookAt(0, py, 0);
          silPlaneMesh.rotation.z += (s % 2 ? 1 : -1) * 0.1;
          silPlaneMesh.userData.disposeMaterial = true;
          towerDecorGroup.add(silPlaneMesh);
        }

        for (const ribOffset of [-0.12, 0.12]) {
          const rAng = angle + ribOffset;
          computeTransformMatrix(
            Math.cos(rAng) * (wallRadius - 0.1),
            floorY + 6.8,
            Math.sin(rAng) * (wallRadius - 0.1),
            0,
            -rAng + Math.PI / 2,
            ribOffset > 0 ? -0.14 : 0.14,
            1.1,
            2.3,
            0.8,
            tempMat
          );
          accentParts.push({
            geo: crystalSpikeGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0x98dcff)
          });
        }
      }

      for (let p = 0; p < pillarCount; p++) {
        if ((floor + p) % 2 !== 0) continue;
        const angle = (p / pillarCount) * TWO_PI + 0.18;
        const cx = Math.cos(angle) * (wallRadius - 0.55);
        const cz = Math.sin(angle) * (wallRadius - 0.55);
        computeTransformMatrix(cx, floorY + 1.4, cz, -0.25, -angle, 0.15, 1.15, 1.25, 1.15, tempMat);
        accentParts.push({
          geo: crystalSpikeGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0xb8eeff)
        });
      }

      const edgeCells = floorEdgeCellsByFloor[floor] || [];
      for (let e = 0; e < edgeCells.length; e += 2) {
        const [ex, ez] = edgeCells[e];
        const len = 1.4 + (e % 4) * 0.65;
        computeTransformMatrix(
          ex + ((e % 3) - 1) * 0.7,
          floorY - 1.0 - len * 0.48,
          ez + (((e + 1) % 3) - 1) * 0.7,
          Math.PI,
          e * 0.5,
          ((e % 3) - 1) * 0.08,
          0.85,
          len / 2.2,
          0.85,
          tempMat
        );
        accentParts.push({
          geo: icicleGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0xcff2ff)
        });
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        const [sx, sz, topY] = stairs[s];
        computeTransformMatrix(sx, topY + 0.04, sz, 0, s * 0.3, 0, 1, 1, 1, tempMat);
        frostCrustParts.push({
          geo: crustBoxGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0xe6f7ff)
        });

        const iciclesPerStep = 5;
        for (let k = 0; k < iciclesPerStep; k++) {
          const icicleLen = 1.35 + ((s + k) % 4) * 0.65;
          const offX = ((k % 3) - 1) * 1.45 + (k % 2 ? 0.25 : -0.25);
          const offZ = (k < 2 ? -1 : 1) * 1.55;
          computeTransformMatrix(
            sx + offX,
            topY - 1.05 - icicleLen * 0.42,
            sz + offZ,
            Math.PI + (k - 2) * 0.05,
            s * 0.4 + k,
            (k % 2 ? 1 : -1) * 0.08,
            0.78,
            icicleLen / 2.2,
            0.78,
            tempMat
          );
          accentParts.push({
            geo: icicleGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xdcf6ff)
          });
        }
      }

      if (edgeCells.length > 0) {
        for (let m = 0; m < 2; m++) {
          const [mx, mz] = edgeCells[(m * 7 + floor * 3) % edgeCells.length];
          const fogUniforms = {
            uTime: { value: 0 },
            uSeed: { value: floor * 3.1 + m * 1.7 }
          };
          TOWER_SHADER_UNIFORMS.iceCreepingFog.push(fogUniforms);

          const fogMat = new THREE.ShaderMaterial({
            vertexShader: CREEPING_FOG_VERTEX,
            fragmentShader: CREEPING_FOG_FRAGMENT,
            uniforms: fogUniforms,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide
          });
          const fogQuad = new THREE.Mesh(fogPatchGeo, fogMat);
          fogQuad.position.set(mx * 0.72, floorY + 0.08 + m * 0.04, mz * 0.72);
          fogQuad.rotation.y = floor + m * 1.5;
          fogQuad.userData.disposeMaterial = true;
          towerDecorGroup.add(fogQuad);
        }
      }
    }

    // --- 3C. БАШНЯ ПУСТОТЫ (VOID) ---
    else if (biomeId === 'void') {
      voidFloorsList.push(floor);
      if (!voidMaterialsInitialized) {
        voidMaterialsInitialized = true;
        const VOID_MIST_VERTEX = `
          uniform float uTime;
          attribute float aPhase;
          varying vec2 vUv;
          varying float vPhase;
          void main() {
            vUv = uv;
            vPhase = aPhase;
            vec3 pos = position;
            pos.x += sin(uTime * 1.2 + pos.y * 0.5 + aPhase) * 0.22;
            pos.z += cos(uTime * 1.0 + pos.y * 0.5 + aPhase) * 0.22;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `;
        const VOID_MIST_FRAGMENT = `
          uniform float uTime;
          uniform float uIsDarkRibbon;
          varying vec2 vUv;
          varying float vPhase;
          ${GLSL_SIMPLEX_NOISE}
          void main() {
            vec2 centered = vUv - 0.5;
            float dist = length(centered);
            float n = snoise(vec3(vUv * 3.5, uTime * 0.45 + vPhase)) * 0.5 + 0.5;
            float mask = smoothstep(0.5, 0.08, dist) * n;
            vec3 darkRibbonCol = mix(vec3(0.01, 0.0, 0.02), vec3(0.45, 0.12, 0.78), pow(n, 2.2) * 0.75);
            vec3 mistCol = mix(vec3(0.04, 0.01, 0.08), vec3(0.66, 0.33, 0.97), n * 1.35);
            vec3 finalCol = mix(mistCol, darkRibbonCol, uIsDarkRibbon);
            float alpha = mask * mix(0.68, 0.85, uIsDarkRibbon);
            if (alpha < 0.02) discard;
            gl_FragColor = vec4(finalCol, alpha);
          }
        `;

        const ribbonUniforms = { uTime: { value: 0 }, uIsDarkRibbon: { value: 1.0 } };
        const mistUniforms = { uTime: { value: 0 }, uIsDarkRibbon: { value: 0.0 } };
        const stairDissolveUniforms = {
          uTime: { value: 0 },
          uDissolveLevel: { value: 0.39 },
          uEdgeIntensity: { value: 1.45 },
          uBrokenEnd: { value: 1.0 }
        };
        const stairPartialDissolveUniforms = {
          uTime: { value: 0 },
          uDissolveLevel: { value: 0.39 },
          uEdgeIntensity: { value: 1.2 },
          uBrokenEnd: { value: 0.55 }
        };
        TOWER_SHADER_UNIFORMS.voidList.push(
          ribbonUniforms,
          mistUniforms,
          stairDissolveUniforms,
          stairPartialDissolveUniforms
        );

        ribbonMat = new THREE.ShaderMaterial({
          uniforms: ribbonUniforms,
          vertexShader: VOID_MIST_VERTEX,
          fragmentShader: VOID_MIST_FRAGMENT,
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        mistMat = new THREE.ShaderMaterial({
          uniforms: mistUniforms,
          vertexShader: VOID_MIST_VERTEX,
          fragmentShader: VOID_MIST_FRAGMENT,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide
        });

        const STAIR_DISSOLVE_VERTEX = `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormal;
          void main() {
            vUv = uv;
            vNormal = normalize(normalMatrix * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `;
        const STAIR_DISSOLVE_FRAGMENT = `
          uniform float uTime;
          uniform float uDissolveLevel;
          uniform float uEdgeIntensity;
          uniform float uBrokenEnd;
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vNormal;
          ${GLSL_SIMPLEX_NOISE}
          void main() {
            float grain = snoise(vWorldPos * 2.4) * 0.5 + 0.5;
            vec3 stoneBase = mix(vec3(0.035, 0.018, 0.062), vec3(0.095, 0.045, 0.15), grain);
            vec3 lightDir = normalize(vec3(0.3, 1.0, 0.4));
            float diff = max(dot(vNormal, lightDir), 0.15);
            vec3 color = stoneBase * (0.45 + 0.75 * diff);
            float noiseVal = snoise(vWorldPos * 0.85 + vec3(0.0, uTime * 0.35, 0.0)) * 0.5 + 0.5;
            float fineNoise = snoise(vWorldPos * 2.8 - vec3(uTime * 0.5)) * 0.22;
            float combinedNoise = noiseVal + fineNoise;
            float edgeFactor = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
            float threshold = uBrokenEnd * (uDissolveLevel + edgeFactor * 0.34);
            if (combinedNoise < threshold) discard;
            float burnWidth = 0.15 * uBrokenEnd;
            float edgeGlow = 1.0 - smoothstep(threshold, threshold + burnWidth, combinedNoise);
            vec3 voidEdgeColor = vec3(0.659, 0.333, 0.969) * 2.6;
            color = mix(color, voidEdgeColor, edgeGlow * uBrokenEnd * uEdgeIntensity);
            gl_FragColor = vec4(color, 1.0);
          }
        `;

        dissolvedStairMat = new THREE.ShaderMaterial({
          uniforms: stairDissolveUniforms,
          vertexShader: STAIR_DISSOLVE_VERTEX,
          fragmentShader: STAIR_DISSOLVE_FRAGMENT,
          side: THREE.DoubleSide
        });
        partialDissolveStairMat = new THREE.ShaderMaterial({
          uniforms: stairPartialDissolveUniforms,
          vertexShader: STAIR_DISSOLVE_VERTEX,
          fragmentShader: STAIR_DISSOLVE_FRAGMENT,
          side: THREE.DoubleSide
        });
        phantomStepOutlineMat = new THREE.MeshBasicMaterial({
          color: 0xa855f7,
          wireframe: true,
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
      }

      for (let p = 0; p < pillarCount; p++) {
        const angle = (p / pillarCount) * TWO_PI;
        const rx = Math.cos(angle) * (wallRadius - 0.73);
        const rz = Math.sin(angle) * (wallRadius - 0.73);
        const rotY = -angle + Math.PI / 2;

        if ((floor + p) % 2 === 0) {
          computeTransformMatrix(rx, floorY + 7.0, rz, 0, rotY, 0, 1, 1, 1, tempMat);
          accentParts.push({
            geo: runeTabletGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xd478ff)
          });
        }
      }

      for (let rIdx = 0; rIdx < 2; rIdx++) {
        const baseAngle = ((floor * 3 + rIdx * 4) / 8) * TWO_PI + 0.25;
        const startY = floorY + 2.0 + rIdx * 5.0;
        const points = [];
        for (let pt = 0; pt <= 7; pt++) {
          const t = pt / 7;
          const r = wallRadius - t * 8.5;
          const ang = baseAngle + Math.sin(t * Math.PI * 1.5 + floor + rIdx) * 0.18;
          const y = startY + t * 8.5 + Math.cos(t * Math.PI * 2.0) * 1.2;
          points.push(new THREE.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
        }
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.44 - rIdx * 0.08, 6, false);
        const vCount = tubeGeo.attributes.position.count;
        const phases = new Float32Array(vCount);
        for (let k = 0; k < vCount; k++) phases[k] = floor * 1.7 + rIdx;
        tubeGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
        const ribbonMesh = new THREE.Mesh(tubeGeo, ribbonMat);
        towerDecorGroup.add(ribbonMesh);
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        const [sx, sz, topY, stepBlockIdx] = stairs[s];
        const isFullyDissolvedStep = voidDissolvedStairStepSet.has(stepBlockIdx);

        if (isFullyDissolvedStep) {
          const dissolvedMesh = new THREE.Mesh(stepBoxGeo, dissolvedStairMat);
          dissolvedMesh.position.set(sx, topY - 0.45, sz);
          towerDecorGroup.add(dissolvedMesh);

          const phantomFrame = new THREE.Mesh(stepTopFrameGeo, phantomStepOutlineMat);
          phantomFrame.position.set(sx, topY - 0.04, sz);
          towerDecorGroup.add(phantomFrame);

          for (let sh = 0; sh < 4; sh++) {
            const shard = new THREE.Mesh(shardGeo, dissolvedStairMat);
            const ang = (sh / 4) * TWO_PI + s;
            shard.position.set(
              sx + Math.cos(ang) * 1.55,
              topY - 0.35 + (sh - 1.5) * 0.32,
              sz + Math.sin(ang) * 1.55
            );
            shard.scale.set(0.75, 0.45, 0.65);
            shard.rotation.set(sh * 0.7, sh * 1.2, sh * 0.5);
            shard.userData = {
              basePos: shard.position.clone(),
              phase: floor * 2.1 + s * 0.9 + sh * 0.6,
              amp: 0.48,
              rotSpeed: 0.55
            };
            voidFloatingDebrisMeshes.push(shard);
            towerDecorGroup.add(shard);
          }

          const mistPlaneGeo = new THREE.PlaneGeometry(3.4, 3.4, 3, 3);
          const mCount = mistPlaneGeo.attributes.position.count;
          const mPhases = new Float32Array(mCount);
          for (let k = 0; k < mCount; k++) mPhases[k] = floor + s + k * 0.2;
          mistPlaneGeo.setAttribute('aPhase', new THREE.BufferAttribute(mPhases, 1));
          const mistBill = new THREE.Mesh(mistPlaneGeo, mistMat);
          mistBill.position.set(sx, topY - 0.2, sz);
          mistBill.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          towerDecorGroup.add(mistBill);
          voidMistBillboards.push(mistBill);
        } else {
          const edgeStepMesh = new THREE.Mesh(stepBoxGeo, partialDissolveStairMat);
          edgeStepMesh.position.set(sx, topY - 0.48, sz);
          towerDecorGroup.add(edgeStepMesh);
        }
      }
    }
  }

  // Сборка мешей обугленной породы (Ash)
  if (charredRockParts.length) {
    const charredRockMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#18181b'),
      map: TOWER_FLOOR_TEXTURES.ash.map,
      normalMap: TOWER_FLOOR_TEXTURES.ash.normalMap,
      normalScale: new THREE.Vector2(2.8, 2.8),
      roughness: 0.96,
      metalness: 0.05
    });
    const mergedCharredGeo = mergeGeometryParts(charredRockParts);
    const charredMesh = new THREE.Mesh(mergedCharredGeo, charredRockMaterial);
    charredMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(charredMesh);
  }

  // Сборка мешей морозной корки и вмёрзших силуэтов (Ice)
  if (frostCrustParts.length) {
    const frostCrustMat = new THREE.MeshPhysicalMaterial({
      color: 0xe6f7ff,
      emissive: 0x3b8ab8,
      emissiveIntensity: 0.25,
      roughness: 0.22,
      metalness: 0.05,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
      envMap: ICE_ENV_CUBEMAP
    });
    const mergedCrustGeo = mergeGeometryParts(frostCrustParts);
    const crustMesh = new THREE.Mesh(mergedCrustGeo, frostCrustMat);
    crustMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(crustMesh);
  }

  if (silhouetteParts.length) {
    const mergedSilGeo = mergeGeometryParts(silhouetteParts);
    const silMat = new THREE.MeshStandardMaterial({
      color: 0x0b1e36,
      emissive: 0x1d588f,
      emissiveIntensity: 0.82,
      roughness: 0.35,
      metalness: 0.25
    });
    const silMesh = new THREE.Mesh(mergedSilGeo, silMat);
    silMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(silMesh);
  }

  // Парящие в невесомости обломки ступеней и рунные монолиты (Void)
  if (voidFloorsList.length && dissolvedStairMat) {
    const floatingCount = 96;
    const floatingGeo = jitterGeometry(new THREE.BoxGeometry(1.25, 0.85, 1.25), 0.14);
    activeVoidFloatingMesh = new THREE.InstancedMesh(floatingGeo, dissolvedStairMat, floatingCount);
    activeVoidFloatingData = [];

    const dummy = new THREE.Object3D();
    for (let i = 0; i < floatingCount; i++) {
      const floor = voidFloorsList[i % voidFloorsList.length];
      const angle = seededRandom(seed, 'vfltA', i) * TWO_PI;
      const radius =
        i % 3 === 0
          ? 6 + seededRandom(seed, 'vfltR', i) * (TOWER_FLOOR_RADIUS - 12)
          : TOWER_FLOOR_RADIUS - 2.2 + seededRandom(seed, 'vfltR', i) * 3.0;
      const baseY =
        i % 3 === 0
          ? floor * 14 - 4.2 - seededRandom(seed, 'vfltY', i) * 4.5
          : floor * 14 + 2.5 + seededRandom(seed, 'vfltY', i) * 9.5;
      const scale = 0.55 + seededRandom(seed, 'vfltS', i) * 1.3;
      const item = {
        x: Math.cos(angle) * radius,
        baseY,
        z: Math.sin(angle) * radius,
        rx: seededRandom(seed, 'vfltRX', i) * TWO_PI,
        ry: seededRandom(seed, 'vfltRY', i) * TWO_PI,
        rz: seededRandom(seed, 'vfltRZ', i) * TWO_PI,
        scale,
        phase: i * 0.43,
        speed: 0.65 + (i % 5) * 0.18
      };
      activeVoidFloatingData.push(item);
      dummy.position.set(item.x, item.baseY, item.z);
      dummy.rotation.set(item.rx, item.ry, item.rz);
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      activeVoidFloatingMesh.setMatrixAt(i, dummy.matrix);
    }
    activeVoidFloatingMesh.instanceMatrix.needsUpdate = true;
    towerDecorGroup.add(activeVoidFloatingMesh);
  }

  // Сборка архитектурных колонн и акцентов по каждому биому
  for (const bId of TOWER_IDS) {
    const sParts = structurePartsByBiome[bId];
    if (sParts && sParts.length) {
      const mergedStructGeo = mergeGeometryParts(sParts);
      const structMat = new THREE.MeshStandardMaterial({
        map: TOWER_WALL_TEXTURES[bId].map,
        bumpMap: TOWER_WALL_TEXTURES[bId].bump,
        bumpScale: 0.3,
        color: 0xffffff,
        vertexColors: true,
        roughness: bId === 'ice' ? 0.16 : 0.86,
        metalness: bId === 'ice' ? 0.25 : 0.14
      });
      if (bId === 'ash') {
        structMat.normalMap = TOWER_WALL_TEXTURES.ash.normalMap;
        structMat.normalScale = new THREE.Vector2(2.4, 2.4);
        applyWorldStoneShader(structMat, { crackRarity: 0.5, charStrength: 0.88 });
      }
      const structMesh = new THREE.Mesh(mergedStructGeo, structMat);
      structMesh.userData.disposeMaterial = true;
      towerDecorGroup.add(structMesh);
    }

    const aParts = accentPartsByBiome[bId];
    if (aParts && aParts.length) {
      const mergedAccentGeo = mergeGeometryParts(aParts);
      let accentMat;
      if (bId === 'ash') {
        accentMat = new THREE.MeshStandardMaterial({
          map: lavaTexture,
          color: 0xffffff,
          vertexColors: true,
          emissive: 0xff6210,
          emissiveMap: lavaTexture,
          emissiveIntensity: 1.9,
          roughness: 0.4
        });
        activeAshLavaStreamMat = accentMat;
      } else if (bId === 'ice') {
        accentMat = new THREE.MeshPhysicalMaterial({
          color: 0xb5ecff,
          vertexColors: true,
          emissive: 0x2d7aa8,
          emissiveIntensity: 0.38,
          roughness: 0.08,
          metalness: 0.05,
          transmission: 0.65,
          ior: 1.31,
          clearcoat: 1.0,
          envMap: ICE_ENV_CUBEMAP,
          transparent: true,
          opacity: 0.9
        });
      } else {
        accentMat = new THREE.MeshStandardMaterial({
          map: TOWER_WALL_TEXTURES.void.emissive,
          color: 0xffffff,
          vertexColors: true,
          emissive: 0xb848ff,
          emissiveIntensity: 1.65,
          roughness: 0.35,
          metalness: 0.3
        });
        activeVoidRunePillarMat = accentMat;
      }
      const accentMesh = new THREE.Mesh(mergedAccentGeo, accentMat);
      accentMesh.userData.disposeMaterial = true;
      towerDecorGroup.add(accentMesh);
    }
  }
}

function updateTowerDecorAnimations(time, dt, towerId) {
  // Анимация Прыжковых площадок
  for (let i = 0; i < jumpPadGroup.children.length; i++) {
    const padObj = jumpPadGroup.children[i];
    const ud = padObj.userData;
    if (ud && ud.runeDisc) {
      ud.runeDisc.rotation.z = time * (ud.isBalconyPad ? 1.25 : 0.85);
      const lift = (time * 1.6 + i * 0.35) % 1.0;
      ud.ring.position.y = 0.2 + lift * 1.15;
      ud.ring.scale.setScalar(1.0 - lift * 0.25);
      ud.plume.scale.y = 0.85 + Math.sin(time * 5 + i) * 0.18;
    }
  }

  // Анимация рунных маяков на балконах (floorY + 6)
  for (let i = 0; i < balconyVantageGroup.children.length; i++) {
    const vObj = balconyVantageGroup.children[i];
    if (vObj.userData && vObj.userData.ring) {
      vObj.userData.ring.rotation.z = time * 0.7 + i;
      if (vObj.userData.crystal) {
        vObj.userData.crystal.position.y = 1.45 + Math.sin(time * 2.8 + i) * 0.16;
        vObj.userData.crystal.rotation.y = time * 1.5;
      }
    }
  }

  // Анимация Залов Кузницы и Стартовых плит готовности (Ready Plates)
  for (const floorKey in forgeHallsByFloor) {
    const fh = forgeHallsByFloor[floorKey];
    if (!fh) continue;
    if (fh.brazierFlame) {
      fh.brazierFlame.scale.y = 0.9 + Math.sin(time * 9 + Number(floorKey)) * 0.22;
      fh.brazierFlame.rotation.y = time * 2.4;
    }
    if (fh.readyPlateGroup && fh.readyPlateGroup.userData) {
      const rud = fh.readyPlateGroup.userData;
      if (rud.outerRing) rud.outerRing.rotation.z = time * (fh.isActivated ? 0.4 : 1.6);
      if (rud.innerRing) {
        const pulse = fh.isActivated ? 1.0 : 0.85 + Math.sin(time * 5) * 0.15;
        rud.innerRing.scale.setScalar(pulse);
      }
      if (rud.beam) {
        rud.beam.visible = !fh.isActivated;
        rud.beam.scale.y = 0.9 + Math.sin(time * 4) * 0.15;
      }
    }
  }

  // Анимация Алтарей пакта
  for (let i = 0; i < altars.length; i++) {
    const alt = altars[i];
    if (!alt.isOpen && alt.group.visible && alt.group.userData) {
      const ud = alt.group.userData;
      if (ud.pillar) {
        ud.pillar.rotation.y = time * 0.55;
        ud.pillar.position.y = Math.sin(time * 2.2 + i) * 0.08;
      }
      if (ud.halo) {
        ud.halo.position.y = 2.18 + Math.sin(time * 3.1 + i) * 0.06;
        ud.halo.scale.setScalar(1 + Math.sin(time * 4.5) * 0.06);
      }
      if (ud.swirl1 && ud.swirl2) {
        ud.swirl1.rotation.y = time * 1.8;
        ud.swirl2.rotation.y = -time * 1.4;
      }
    }
  }

  bossGateBeamMat.opacity = 0.78 + Math.sin(time * 6.5) * 0.18;
  minorGateBeamMat.opacity = 0.74 + Math.sin(time * 7.5 + 1.2) * 0.2;

  // Анимация потоков и капель лавы (Пепельный акт)
  if (ashWallStreamGlobs.length || ashFallingDrops.length) {
    const speedScale = (activeVFXState.lavaSpeed || 2.25) / 2.1;
    for (let i = 0; i < ashWallStreamGlobs.length; i++) {
      const g = ashWallStreamGlobs[i];
      const t = (time * g.speed * speedScale + g.phase) % 1.0;
      const pt = g.curve.getPointAt(t);
      g.mesh.position.copy(pt);
      const s = Math.sin(t * Math.PI);
      g.mesh.scale.set(0.85 * s, 1.65 * s, 0.85 * s);
    }

    for (let i = 0; i < ashFallingDrops.length; i++) {
      const d = ashFallingDrops[i];
      const cycle = (time * d.speed * speedScale + d.phase) % 1.0;
      if (cycle < 0.32) {
        const grow = cycle / 0.32;
        d.mesh.position.set(d.startX, d.startY - grow * 0.08, d.startZ);
        d.mesh.scale.set(0.35 + grow * 0.65, 0.45 + grow * 0.95, 0.35 + grow * 0.65);
      } else if (cycle < 0.86) {
        const fallT = (cycle - 0.32) / 0.54;
        const quadFall = fallT * fallT;
        d.mesh.position.set(
          d.startX,
          d.startY - 0.08 + (d.endY - (d.startY - 0.08)) * quadFall,
          d.startZ
        );
        d.mesh.scale.set(0.75 - fallT * 0.2, 1.35 + fallT * 0.9, 0.75 - fallT * 0.2);
      } else {
        const splashT = (cycle - 0.86) / 0.14;
        d.mesh.position.set(d.startX, d.endY + 0.02, d.startZ);
        const spread = 1.0 + splashT * 1.8;
        const fade = Math.max(0.01, 1.0 - splashT);
        d.mesh.scale.set(spread * fade, 0.25 * fade, spread * fade);
      }
    }

    if (activeAshLavaStreamMat) {
      activeAshLavaStreamMat.emissiveIntensity = 1.75 + Math.sin(time * 3.4) * 0.3;
    }
  }

  // Анимация левитирующих обломков (Акт Пустоты)
  if (activeVoidFloatingMesh || voidFloatingDebrisMeshes.length) {
    const gravAnom = activeVFXState.gravityAnomaly || 1.4;
    const gravTime = time * gravAnom;

    if (activeVoidFloatingMesh && activeVoidFloatingData.length) {
      const dummy = _pickupDummyObj;
      for (let i = 0; i < activeVoidFloatingData.length; i++) {
        const item = activeVoidFloatingData[i];
        dummy.position.set(
          item.x + Math.cos(gravTime * 0.5 + item.phase) * 0.18,
          item.baseY + Math.sin(gravTime * 0.8 * item.speed + item.phase) * 0.65,
          item.z
        );
        dummy.rotation.set(
          item.rx + gravTime * 0.18 * item.speed,
          item.ry + gravTime * 0.24 * item.speed,
          item.rz
        );
        dummy.scale.setScalar(item.scale);
        dummy.updateMatrix();
        activeVoidFloatingMesh.setMatrixAt(i, dummy.matrix);
      }
      activeVoidFloatingMesh.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < voidFloatingDebrisMeshes.length; i++) {
      const obj = voidFloatingDebrisMeshes[i];
      const ud = obj.userData;
      if (!ud || !ud.basePos) continue;
      const wave = Math.sin(gravTime * 0.8 + ud.phase);
      obj.position.y = ud.basePos.y + wave * ud.amp;
      obj.position.x = ud.basePos.x + Math.cos(gravTime * 0.5 + ud.phase) * (ud.amp * 0.22);
      obj.rotation.x += 0.004 * ud.rotSpeed * gravAnom;
      obj.rotation.y += 0.005 * ud.rotSpeed * gravAnom;
    }

    for (let i = 0; i < voidMistBillboards.length; i++) {
      voidMistBillboards[i].rotation.z = time * 0.22 + i;
    }

    if (activeVoidRunePillarMat) {
      activeVoidRunePillarMat.emissiveIntensity = 1.35 + Math.sin(time * 2.8) * 0.45;
    }
  }
}

/* ---------- 4. Вспомогательная морфология: гарантия ширины перешейков ≥ 2 клеток (8 м) ---------- */

/**
 * Гарантирует, что на планировках ring и spokes нет узких перешейков в 1 клетку (4 м):
 * каждая активная клетка входит хотя бы в один квадрат 2×2 клетки (8×8 м) в пределах круга этажа.
 */
function enforceMinTwoCellWidthOnLayout(activeCells, maxRadiusSq) {
  const snapshot = new Set(activeCells);
  const toKey = (i, j) => (i + GRID_OFFSET) * GRID_DIM + (j + GRID_OFFSET);
  const inBounds = (i, j) =>
    i >= -GRID_OFFSET &&
    i <= GRID_OFFSET &&
    j >= -GRID_OFFSET &&
    j <= GRID_OFFSET &&
    i * i + j * j <= maxRadiusSq;

  for (const key of snapshot) {
    const ci = ((key / GRID_DIM) | 0) - GRID_OFFSET;
    const cj = (key % GRID_DIM) - GRID_OFFSET;

    const has2x2Block =
      (activeCells.has(toKey(ci + 1, cj)) &&
        activeCells.has(toKey(ci, cj + 1)) &&
        activeCells.has(toKey(ci + 1, cj + 1))) ||
      (activeCells.has(toKey(ci - 1, cj)) &&
        activeCells.has(toKey(ci, cj + 1)) &&
        activeCells.has(toKey(ci - 1, cj + 1))) ||
      (activeCells.has(toKey(ci + 1, cj)) &&
        activeCells.has(toKey(ci, cj - 1)) &&
        activeCells.has(toKey(ci + 1, cj - 1))) ||
      (activeCells.has(toKey(ci - 1, cj)) &&
        activeCells.has(toKey(ci, cj - 1)) &&
        activeCells.has(toKey(ci - 1, cj - 1)));

    if (!has2x2Block) {
      // Расширяем перешеек в сторону центра башни или по касательной до 2 клеток (8 м)
      const di = ci > 0 ? -1 : 1;
      const dj = cj > 0 ? -1 : 1;
      if (inBounds(ci + di, cj)) activeCells.add(toKey(ci + di, cj));
      if (inBounds(ci, cj + dj)) activeCells.add(toKey(ci, cj + dj));
      if (inBounds(ci + di, cj + dj)) activeCells.add(toKey(ci + di, cj + dj));
    }
  }
}

/* ---------- 5. Главная функция процедурной генерации башни buildTower ---------- */

function buildTower(seed, customPlayerCount, customCampaignModeId) {
  const targetPlayers =
    customPlayerCount ||
    (typeof state !== 'undefined' && state && state.playerCount) ||
    (typeof selectedPlayerCount !== 'undefined' && selectedPlayerCount) ||
    activeCoopPlayerCount ||
    2;
  const targetCampaign =
    customCampaignModeId ||
    (typeof state !== 'undefined' && state && state.campaignModeId) ||
    (typeof selectedCampaignModeId !== 'undefined' && selectedCampaignModeId) ||
    activeCampaignModeId ||
    'acts3_24';

  configureTowerSpatialScale(targetPlayers, targetCampaign);

  for (let i = towerInstancedGroup.children.length - 1; i >= 0; i--) {
    const child = towerInstancedGroup.children[i];
    towerInstancedGroup.remove(child);
    if (child.dispose) child.dispose();
  }
  towerInstancedMesh = null;
  blockInstanceRef = [];

  jumpPadGroup.clear();
  chestGroup.clear();
  altarGroup.clear();
  forkSpriteGroup.clear();
  bossGateSealGroup.clear();
  forgeHallGroup.clear();
  balconyVantageGroup.clear();

  chests = [];
  altars = [];
  floorLayouts = [];
  forkMarkers = [];
  splitFloorConfigs = {};
  balconiesByFloor = {};
  balconyVantageZones = [];
  forgeHallsByFloor = {};
  bossGateBlockIndices = {};
  bossGateVisualsByFloor = {};
  jumpPads = [];
  blocks = [];
  blockGrid = new Array(GRID_FLOORS * GRID_DIM * GRID_DIM).fill(null);
  voidDissolvedStairStepSet.clear();

  let prevStairPositions = [];
  let prevFloorWasFork = false;
  let prevForkAngle = 0;
  let prevForkSwapRoutes = false;

  stairPositionsByFloor = [];
  floorEdgeCellsByFloor = [];
  floorValidCellsByFloor = [];

  const maxRadiusSq = GRID_OFFSET * GRID_OFFSET;
  // Радиус размещения маршей лестниц масштабируется под размер этажа (15×15 / 19×19 / 23×23),
  // а угловой шаг ступеней нормируется, чтобы длина прыжка между ступенями всегда была ~6.2 м
  const stairGridRadius = GRID_OFFSET - 1.5;
  const stepAngleDelta = 1.62 / stairGridRadius;

  const cellKeyOf = (i, j) => (i + GRID_OFFSET) * GRID_DIM + (j + GRID_OFFSET);
  const cellCoordsOf = (cellKey) => [
    ((cellKey / GRID_DIM) | 0) - GRID_OFFSET,
    (cellKey % GRID_DIM) - GRID_OFFSET
  ];

  for (let floor = 0; floor < GRID_FLOORS; floor++) {
    const floorY = floor * 14;
    const floorBiomeId = getFloorBiomeId(floor);
    const floorTheme = TOWERS[floorBiomeId] || TOWERS.ash;
    const isBossFloor = isBossFloorIndex(floor);
    const hasForgeHall = hasForgeHallAfterFloor(floor);
    const isForkFloor = FORK_FLOORS.includes(floor) && !isBossFloor && floor < GRID_FLOORS - 1;
    const isSplitSectorFloor = prevFloorWasFork && !isBossFloor;

    const stairStartAngle = isSplitSectorFloor
      ? prevForkAngle + 6 * stepAngleDelta + 0.38
      : seededRandom(seed, 'tower', 0) * TWO_PI +
        floor * Math.PI +
        (seededRandom(seed, 'tower', floor + 1) - 0.5) * 0.9;

    const currentStairCells = [];
    if (floor < GRID_FLOORS - 1) {
      const stairBranchCount = isForkFloor || isSplitSectorFloor ? 2 : 1;
      for (let branch = 0; branch < stairBranchCount; branch++) {
        for (let stepIdx = 1; stepIdx <= 6; stepIdx++) {
          const angle = stairStartAngle + branch * Math.PI + stepIdx * stepAngleDelta;
          currentStairCells.push([
            Math.round(Math.cos(angle) * stairGridRadius) * 4,
            Math.round(Math.sin(angle) * stairGridRadius) * 4,
            branch
          ]);
        }
      }
    }

    const layoutRoll = seededRandom(seed, 'lay', floor);
    const weights = floorTheme.layoutWeights;
    const initialLayout =
      floor === 0 || isBossFloor
        ? 'disc'
        : isSplitSectorFloor
          ? 'split_ring'
          : layoutRoll < weights[0]
            ? 'disc'
            : layoutRoll < weights[1]
              ? 'ring'
              : layoutRoll < weights[2]
                ? 'spokes'
                : 'islands';

    const activeCells = new Set();
    const isNearAnyPoint = (pointList, gridI, gridJ, radiusCells) =>
      pointList.some(
        (pt) => Math.abs(pt[0] / 4 - gridI) <= radiusCells && Math.abs(pt[1] / 4 - gridJ) <= radiusCells
      );

    for (let i = -GRID_OFFSET; i <= GRID_OFFSET; i++) {
      for (let j = -GRID_OFFSET; j <= GRID_OFFSET; j++) {
        if (i * i + j * j > maxRadiusSq) continue;
        const x = i * 4;
        const z = j * 4;
        if (prevStairPositions.some((st) => Math.pow(st[0] - x, 2) + Math.pow(st[1] - z, 2) < 25)) {
          continue;
        }
        activeCells.add(cellKeyOf(i, j));
      }
    }

    let finalLayout = initialLayout;

    // --- СПЕЦИАЛЬНАЯ ПЛАНИРОВКА РАЗДЕЛЁННЫХ СЕКТОРОВ (ПОСЛЕ РАЗВИЛКИ FORK_FLOORS) ---
    if (initialLayout === 'split_ring') {
      // Ось разделения проходит между точками выхода двух лестниц предыдущего этажа
      const axisAngle = prevForkAngle + 6 * stepAngleDelta;
      const axisCos = Math.cos(axisAngle);
      const axisSin = Math.sin(axisAngle);
      const positiveRoute = !prevForkSwapRoutes ? 1 : 2;
      const negativeRoute = !prevForkSwapRoutes ? 2 : 1;

      splitFloorConfigs[floor] = {
        axisAngle,
        axisCos,
        axisSin,
        positiveRoute,
        negativeRoute
      };

      const innerHoleR = Math.max(2.2, GRID_OFFSET - 4.2);
      for (const cellKey of [...activeCells]) {
        const [i, j] = cellCoordsOf(cellKey);
        const x = i * 4;
        const z = j * 4;
        const sideProj = x * axisCos + z * axisSin;

        // 1) Широкий (8 м = 2 клетки) диаметральный разлом посередине, изолирующий 2 полукольца
        if (Math.abs(sideProj) < 4.2) {
          activeCells.delete(cellKey);
          continue;
        }
        // 2) Центральное отверстие полуколец (при сохранении ширины каждого полукольца ≥ 3 клеток = 12 м)
        if (
          i * i + j * j < innerHoleR * innerHoleR &&
          !isNearAnyPoint(currentStairCells, i, j, 2) &&
          !isNearAnyPoint(prevStairPositions, i, j, 2)
        ) {
          activeCells.delete(cellKey);
        }
      }

      // Визуальные энергетические маяки вдоль линии разделения двух полуколец
      for (let rStep = -GRID_OFFSET + 2; rStep <= GRID_OFFSET - 2; rStep += 3) {
        const perpX = -axisSin * (rStep * 4);
        const perpZ = axisCos * (rStep * 4);
        for (const side of [-1, 1]) {
          const routeId = side > 0 ? positiveRoute : negativeRoute;
          const spr = new THREE.Sprite(FORK_ROUTE_MATERIALS[routeId]);
          spr.scale.setScalar(3.2);
          spr.position.set(
            perpX + axisCos * side * 5.2,
            floorY + 1.8,
            perpZ + axisSin * side * 5.2
          );
          forkSpriteGroup.add(spr);
        }
      }
    }
    // --- СТАНДАРТНЫЕ ПЛАНИРОВКИ С РАСШИРЕННЫМИ ДО 2 КЛЕТОК (8 М) ПЕРЕШЕЙКАМИ ---
    else if (initialLayout !== 'disc') {
      const fullCellsBackup = new Set(activeCells);
      // Внутренний радиус кольца масштабируется так, чтобы обод кольца всегда был ≥ 3 клеток (12 м)
      const ringInnerRadiusSq = Math.pow(Math.max(3.0, GRID_OFFSET - 3.5), 2);
      // В планировке «Мосты» (spokes) мосты имеют ширину ≥ 2–3 клеток (8–12 м), а обод — ≥ 2.5 клеток (10 м)
      const spokeOuterRingRadiusSq = Math.pow(Math.max(4.5, GRID_OFFSET - 2.5), 2);
      const spokeHubRadiusSq = Math.pow(Math.max(2.2, GRID_OFFSET * 0.3), 2);

      for (const cellKey of fullCellsBackup) {
        const [i, j] = cellCoordsOf(cellKey);
        // Расширенная зона безопасности (2 клетки = 8 м) вокруг входов и выходов лестниц
        if (
          isNearAnyPoint(currentStairCells, i, j, 2) ||
          isNearAnyPoint(prevStairPositions, i, j, 2)
        ) {
          continue;
        }
        if (initialLayout === 'ring' && i * i + j * j <= ringInnerRadiusSq) {
          activeCells.delete(cellKey);
        } else if (
          initialLayout === 'spokes' &&
          Math.abs(i) > 1 &&
          Math.abs(j) > 1 &&
          i * i + j * j > spokeHubRadiusSq &&
          i * i + j * j < spokeOuterRingRadiusSq
        ) {
          activeCells.delete(cellKey);
        } else if (
          initialLayout === 'islands' &&
          seededRandom(seed, 'isl' + floor, cellKey) < floorTheme.islandRemoveProb
        ) {
          activeCells.delete(cellKey);
        }
      }

      if (initialLayout === 'ring' || initialLayout === 'spokes') {
        enforceMinTwoCellWidthOnLayout(activeCells, maxRadiusSq);
      }

      const startCellKey = currentStairCells.length
        ? cellKeyOf(currentStairCells[0][0] / 4, currentStairCells[0][1] / 4)
        : -1;
      const visitedCells = new Set();
      const queue = [startCellKey];

      if (activeCells.has(startCellKey)) {
        visitedCells.add(startCellKey);
        while (queue.length) {
          const cur = queue.pop();
          const ci = (cur / GRID_DIM) | 0;
          const cj = cur % GRID_DIM;
          for (let di = -2; di <= 2; di++) {
            for (let dj = -2; dj <= 2; dj++) {
              const ni = ci + di;
              const nj = cj + dj;
              if (ni < 0 || nj < 0 || ni >= GRID_DIM || nj >= GRID_DIM) continue;
              const neighborKey = ni * GRID_DIM + nj;
              if (activeCells.has(neighborKey) && !visitedCells.has(neighborKey)) {
                visitedCells.add(neighborKey);
                queue.push(neighborKey);
              }
            }
          }
        }
      }

      let isDisconnected = !activeCells.has(startCellKey);
      for (const stairPt of currentStairCells) {
        const stairKey = cellKeyOf(stairPt[0] / 4, stairPt[1] / 4);
        if (activeCells.has(stairKey) && !visitedCells.has(stairKey)) {
          isDisconnected = true;
        }
      }
      for (const cellKey of activeCells) {
        const [ci, cj] = cellCoordsOf(cellKey);
        if (!visitedCells.has(cellKey) && isNearAnyPoint(prevStairPositions, ci, cj, 2)) {
          isDisconnected = true;
        }
      }

      if (isDisconnected) {
        activeCells.clear();
        for (const cellKey of fullCellsBackup) activeCells.add(cellKey);
        finalLayout = 'disc';
      } else {
        for (const cellKey of [...activeCells]) {
          if (!visitedCells.has(cellKey)) activeCells.delete(cellKey);
        }
      }
    }

    floorLayouts[floor] = finalLayout;
    const edgeCells = [];
    const validFloorCells = [];
    for (const cellKey of activeCells) {
      const ci = (cellKey / GRID_DIM) | 0;
      const cj = cellKey % GRID_DIM;
      const x = (ci - GRID_OFFSET) * 4;
      const z = (cj - GRID_OFFSET) * 4;

      // На этажах с разделёнными секторами окрашиваем плиты в тон своего маршрута (1 — зелёный, 2 — красный)
      let floorTileTag = 0;
      if (finalLayout === 'split_ring') {
        const secRoute = getSectorRouteAtPosition(floor, x, z);
        floorTileTag = secRoute === 1 ? 5 : secRoute === 2 ? 6 : 0;
      }

      blocks.push([x - 2, x + 2, z - 2, z + 2, floorY - 1, floorY, floor, floorTileTag]);

      const isEdge =
        !activeCells.has((ci - 1) * GRID_DIM + cj) ||
        !activeCells.has((ci + 1) * GRID_DIM + cj) ||
        !activeCells.has(ci * GRID_DIM + (cj - 1)) ||
        !activeCells.has(ci * GRID_DIM + (cj + 1));

      if (isEdge) {
        edgeCells.push([x, z]);
      } else if (!isNearAnyPoint(currentStairCells, ci - GRID_OFFSET, cj - GRID_OFFSET, 1)) {
        validFloorCells.push([x, z]);
      }
    }
    floorEdgeCellsByFloor[floor] = edgeCells;
    floorValidCellsByFloor[floor] = validFloorCells;

    // --- ПОСТРОЕНИЕ ЛЕСТНИЦ, РАЗВИЛОК И БЕЗОПАСНЫХ «ЗАЛОВ КУЗНИЦЫ» ПОСЛЕ БОССОВ ---
    prevStairPositions = [];
    const floorStairs = [];
    const swapRoutes = seededRandom(seed, 'forkr', floor) < 0.5;

    if (floor < GRID_FLOORS - 1) {
      const branchCount = isForkFloor || isSplitSectorFloor ? 2 : 1;
      for (let branch = 0; branch < branchCount; branch++) {
        for (let stepIdx = 1; stepIdx <= 6; stepIdx++) {
          const angle = stairStartAngle + branch * Math.PI + stepIdx * stepAngleDelta;
          const x = Math.round(Math.cos(angle) * stairGridRadius) * 4;
          const z = Math.round(Math.sin(angle) * stairGridRadius) * 4;

          let routeTag = 0;
          if (isForkFloor) {
            routeTag = (branch === 0) !== swapRoutes ? 1 : 2;
          } else if (isSplitSectorFloor) {
            routeTag = getSectorRouteAtPosition(floor, x, z);
          }

          // На этажах с Залом Кузницы ступени 1..3 ведут в Зал Кузницы (floorY + 6.5),
          // а ступени 4..6 ведут из Зала Кузницы к Стартовой плите следующего яруса
          const stepTopY = hasForgeHall
            ? stepIdx <= 3
              ? floorY + stepIdx * 1.85
              : floorY + 6.5 + (stepIdx - 3) * 1.9
            : floorY + 2 * stepIdx;

          const stepBlockIndex = blocks.length;
          blocks.push([x - 2, x + 2, z - 2, z + 2, floorY, stepTopY, floor, routeTag]);
          prevStairPositions.push([x, z, routeTag]);
          floorStairs.push([x, z, stepTopY, stepBlockIndex]);

          if (floorBiomeId === 'void' && (stepIdx === 3 || stepIdx === 5) && !hasForgeHall) {
            voidDissolvedStairStepSet.add(stepBlockIndex);
          }

          // Блокируем лестницы как на этажах боссов (великая печать), так и на всех обычных этажах (малая печать на 15–25 с)
          if (isBossFloor || stepIdx <= 3) {
            blocks.push([x - 2.05, x + 2.05, z - 2.05, z + 2.05, floorY, floorY + 16, floor, 3]);
            (bossGateBlockIndices[floor] = bossGateBlockIndices[floor] || []).push(blocks.length - 1);
          }

          if (isForkFloor && (stepIdx === 1 || stepIdx === 6)) {
            const markerSprite = new THREE.Sprite(FORK_ROUTE_MATERIALS[routeTag]);
            markerSprite.scale.setScalar(stepIdx === 1 ? 5 : 6);
            markerSprite.position.set(x, stepTopY + 3, z);
            forkSpriteGroup.add(markerSprite);
            if (stepIdx === 6) {
              forkMarkers.push({ floor, x, z, route: routeTag });
            }
          }
        }
      }

      // --- СОЗДАНИЕ БЕЗОПАСНОГО «ЗАЛА КУЗНИЦЫ» (БУФЕРНОЙ ПЛОЩАДКИ ПОСЛЕ БОССА) ---
      if (hasForgeHall && floorStairs.length >= 6) {
        const hallY = floorY + 6.5;
        const midStep = floorStairs[2]; // Ступень 3
        const nextStep = floorStairs[3]; // Ступень 4
        const hallCenterX = Math.round(((midStep[0] + nextStep[0]) * 0.5) / 4) * 4;
        const hallCenterZ = Math.round(((midStep[1] + nextStep[1]) * 0.5) / 4) * 4;

        // Буферная площадка 3×3 клетки (12×12 м) между этажом босса и следующим ярусом
        const hallCells = [];
        for (let hi = -1; hi <= 1; hi++) {
          for (let hj = -1; hj <= 1; hj++) {
            const hx = hallCenterX + hi * 4;
            const hz = hallCenterZ + hj * 4;
            if (hx * hx + hz * hz > maxRadiusSq * 16) continue;
            blocks.push([hx - 2, hx + 2, hz - 2, hz + 2, hallY - 0.85, hallY, floor, 7]);
            hallCells.push([hx, hz]);
          }
        }

        // Наковальня Кузницы и Целебный Горн в центре буферной площадки
        const anvilMesh = new THREE.Mesh(forgeAnvilGeo, forgeAnvilMat);
        anvilMesh.position.set(hallCenterX, hallY, hallCenterZ);
        forgeHallGroup.add(anvilMesh);

        const brazierGlow = new THREE.Sprite(chestGlowMat);
        brazierGlow.scale.setScalar(4.8);
        brazierGlow.position.set(hallCenterX, hallY + 1.8, hallCenterZ);
        forgeHallGroup.add(brazierGlow);

        const brazierFlame = new THREE.Mesh(
          new THREE.ConeGeometry(0.42, 1.3, 7),
          new THREE.MeshBasicMaterial({
            color: 0xff9828,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        brazierFlame.position.set(hallCenterX, hallY + 1.55, hallCenterZ);
        forgeHallGroup.add(brazierFlame);

        // Стартовая плита следующего яруса (Ready Plate) на выходе из Зала Кузницы (на высоте (floor + 1) * 14)
        const topStep = floorStairs[5];
        const readyAngle = stairStartAngle + 6.8 * stepAngleDelta;
        const readyX = Math.round((Math.cos(readyAngle) * (stairGridRadius - 1.2)) / 4) * 4 || topStep[0];
        const readyZ = Math.round((Math.sin(readyAngle) * (stairGridRadius - 1.2)) / 4) * 4 || topStep[1];
        const nextFloorY = (floor + 1) * 14;

        // Гарантируем твёрдую стартовую плиту (Ready Plate) на входе следующего яруса (floor + 1)
        blocks.push([readyX - 2, readyX + 2, readyZ - 2, readyZ + 2, nextFloorY - 1, nextFloorY, floor + 1, 7]);

        const readyPlateGroup = new THREE.Group();
        readyPlateGroup.position.set(readyX, nextFloorY + 0.06, readyZ);

        const outerRing = new THREE.Mesh(
          new THREE.RingGeometry(2.8, 3.35, 36),
          readyPlateRingMat
        );
        outerRing.rotation.x = -Math.PI / 2;
        readyPlateGroup.add(outerRing);

        const innerRing = new THREE.Mesh(
          new THREE.CircleGeometry(2.65, 32),
          new THREE.MeshBasicMaterial({
            map: TEXTURES.runicJumpPad,
            color: 0x48ffe8,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = 0.02;
        readyPlateGroup.add(innerRing);

        const beamGeo = new THREE.CylinderGeometry(2.6, 2.9, 5.5, 24, 1, true);
        beamGeo.translate(0, 2.75, 0);
        const beam = new THREE.Mesh(beamGeo, readyPlateBeamMat);
        readyPlateGroup.add(beam);

        readyPlateGroup.userData = { outerRing, innerRing, beam };
        forgeHallGroup.add(readyPlateGroup);

        forgeHallsByFloor[floor] = {
          bossFloor: floor,
          nextFloor: floor + 1,
          hallX: hallCenterX,
          hallY,
          hallZ: hallCenterZ,
          readyX,
          readyY: nextFloorY,
          readyZ,
          readyRadius: 3.6,
          healedPlayers: {},
          forgedUsed: 0,
          isActivated: 0,
          readyHoldTimer: 0,
          brazierFlame,
          readyPlateGroup
        };
      }
    }

    stairPositionsByFloor[floor] = floorStairs;
    if (floor < GRID_FLOORS - 1 && floorStairs.length > 0) {
      bossGateVisualsByFloor[floor] = createBossGateSealVisual(floorStairs, floorY, !isBossFloor);
    }

    prevFloorWasFork = isForkFloor;
    prevForkAngle = stairStartAngle;
    prevForkSwapRoutes = swapRoutes;

    // --- ПОСТРОЕНИЕ ВЕРТИКАЛЬНЫХ ПОЛУЭТАЖЕЙ (БАЛКОНОВ НА ВЫСОТЕ floorY + 6) И ПРЫЖКОВЫХ ПЛОЩАДОК ---
    const balconyY = floorY + 6;
    const balconyCount = GRID_OFFSET >= 11 ? 3 : 2;
    const floorBalconyList = [];
    const balconyRadiusCells = GRID_OFFSET - 1.2;

    for (let bIdx = 0; bIdx < balconyCount; bIdx++) {
      // Выбираем угол балкона по периметру вдали от лестничных маршей
      let balAngle =
        stairStartAngle +
        Math.PI * 0.55 +
        (bIdx * TWO_PI) / balconyCount +
        (seededRandom(seed, 'balA' + floor, bIdx) - 0.5) * 0.35;

      const balCells = [];
      const arcSteps = GRID_OFFSET >= 9 ? 5 : 4;
      for (let s = -Math.floor(arcSteps / 2); s <= Math.floor(arcSteps / 2); s++) {
        const a = balAngle + s * (0.95 / balconyRadiusCells);
        const bx = Math.round(Math.cos(a) * balconyRadiusCells) * 4;
        const bz = Math.round(Math.sin(a) * balconyRadiusCells) * 4;
        const bi = bx / 4;
        const bj = bz / 4;
        if (bi * bi + bj * bj > maxRadiusSq) continue;
        if (isNearAnyPoint(currentStairCells, bi, bj, 2)) continue;
        if (balCells.some((c) => c[0] === bx && c[1] === bz)) continue;
        balCells.push([bx, bz]);
      }

      if (balCells.length < 2) continue;

      for (const [bx, bz] of balCells) {
        // routeTag = 4 обозначает плиту вертикального полуэтажа-балкона (на высоте floorY + 6)
        blocks.push([bx - 2, bx + 2, bz - 2, bz + 2, balconyY - 0.85, balconyY, floor, 4]);
      }
      const midBalCell = balCells[Math.floor(balCells.length / 2)];
      const centerX = midBalCell[0];
      const centerZ = midBalCell[1];

      // Снайперский рунный маяк в центре балкона (точка интереса для дальнобойных билдов)
      const vantageObj = new THREE.Group();
      vantageObj.position.set(centerX, balconyY + 0.04, centerZ);
      const vRing = new THREE.Mesh(new THREE.CircleGeometry(1.85, 28), balconyVantageRingMat);
      vRing.rotation.x = -Math.PI / 2;
      vantageObj.add(vRing);
      const vCrystal = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshBasicMaterial({ color: 0xffe066 })
      );
      vCrystal.position.y = 1.45;
      vantageObj.add(vCrystal);
      vantageObj.userData = { ring: vRing, crystal: vCrystal };
      balconyVantageGroup.add(vantageObj);

      const balRecord = {
        floor,
        y: balconyY,
        centerX,
        centerZ,
        extentRadius: balCells.length * 2.2,
        cells: balCells
      };
      floorBalconyList.push(balRecord);
      balconyVantageZones.push(balRecord);

      // Размещаем на основном полу (floorY) прыжковую площадку (jumpPad), ведущую ровно на этот балкон!
      const padAngle = Math.atan2(centerZ, centerX);
      let padPlaced = false;
      for (const rOffset of [1.8, 2.6, 1.0, 3.4]) {
        const padGridR = Math.max(2, balconyRadiusCells - rOffset);
        const px = Math.round(Math.cos(padAngle) * padGridR) * 4;
        const pz = Math.round(Math.sin(padAngle) * padGridR) * 4;
        if (
          blocks.some(
            (b) => b[5] === floorY && b[0] <= px && px < b[1] && b[2] <= pz && pz < b[3]
          ) &&
          !jumpPads.some((jp) => jp.y === floorY && hypot2D(jp.x - px, jp.z - pz) < 4.5)
        ) {
          jumpPads.push({
            x: px,
            z: pz,
            y: floorY,
            isBalconyPad: 1,
            targetHeight: 7.5,
            targetX: centerX,
            targetZ: centerZ
          });
          jumpPadGroup.add(createJumpPadVisualInstance(px, floorY, pz, true));
          padPlaced = true;
          break;
        }
      }
      if (!padPlaced && validFloorCells.length > 0) {
        // Резервная привязка к ближайшей валидной клетке пола
        let bestCell = null;
        let bestDist = 1e9;
        for (const [vx, vz] of validFloorCells) {
          const d = hypot2D(vx - centerX, vz - centerZ);
          if (d < bestDist && d > 3.5) {
            bestDist = d;
            bestCell = [vx, vz];
          }
        }
        if (bestCell) {
          jumpPads.push({
            x: bestCell[0],
            z: bestCell[1],
            y: floorY,
            isBalconyPad: 1,
            targetHeight: 7.5,
            targetX: centerX,
            targetZ: centerZ
          });
          jumpPadGroup.add(createJumpPadVisualInstance(bestCell[0], floorY, bestCell[1], true));
        }
      }
    }
    balconiesByFloor[floor] = floorBalconyList;

    // Дополнительные прыжковые площадки на этаже
    for (let i = 0; i < 2; i++) {
      const angle = seededRandom(seed, 'pad' + floor, i) * TWO_PI;
      const radius = 6 + seededRandom(seed, 'pad' + floor, i + 9) * (TOWER_FLOOR_RADIUS - 12);
      const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
      const z = Math.round((Math.sin(angle) * radius) / 4) * 4;
      if (
        floor > 0 &&
        blocks.some((b) => b[5] === floorY && b[0] <= x && x < b[1] && b[2] <= z && z < b[3]) &&
        !jumpPads.some((jp) => jp.y === floorY && hypot2D(jp.x - x, jp.z - z) < 5)
      ) {
        jumpPads.push({ x, z, y: floorY, targetHeight: 9.8 });
        jumpPadGroup.add(createJumpPadVisualInstance(x, floorY, z, false));
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    insertBlockIntoGrid(i);
  }

  // --- РАЗМЕЩЕНИЕ ОБЫЧНЫХ СУНДУКОВ (1 + N ИГРОКОВ) И БОЛЬШИХ «СУНДУКОВ ГИЛЬДИИ» (БЛОК 4) ---
  function spawnChestAt(x, y, z, floor, costMultiplier = 1, isGuildChest = 0) {
    const group = new THREE.Group();
    const coreCube = new THREE.Mesh(chestCubeCoreGeo, chestCubeCoreMat);
    const frameMesh = new THREE.Mesh(chestGeo, chestMat);
    const auraRing = new THREE.Mesh(chestAuraRingGeo, chestAuraRingMat);
    auraRing.position.y = -0.18;
    const glow = new THREE.Sprite(chestGlowMat);
    glow.scale.setScalar(isGuildChest ? 5.2 : 3.4);
    glow.position.y = 0.25;
    group.add(coreCube, frameMesh, auraRing, glow);

    if (isGuildChest) {
      // Редкий большой «Сундук гильдии»: увеличенный масштаб ×1.52, корона-октаэдр и рунное кольцо складчины
      group.scale.setScalar(1.52);
      const guildRing = new THREE.Mesh(
        new THREE.RingGeometry(1.05, 1.32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x38ffe8,
          transparent: true,
          opacity: 0.88,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      guildRing.rotation.x = -Math.PI / 2;
      guildRing.position.y = -0.42;
      group.add(guildRing);

      const guildCrest = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.34, 0),
        new THREE.MeshBasicMaterial({ color: 0x45fff0 })
      );
      guildCrest.position.y = 1.05;
      group.add(guildCrest);
      group.userData = { isGuildChest: 1, guildRing, guildCrest };
    }

    group.position.set(x, y + (isGuildChest ? 0.96 : 0.68), z);
    chestGroup.add(group);

    const pCount = Math.max(1, activeCoopPlayerCount || 2);
    const baseCost = Math.round((4 + 2.5 * floor) * costMultiplier);
    const guildTotalCost = Math.round((7 + 3.5 * floor) * (1 + 0.55 * (pCount - 1)));

    chests.push({
      x,
      y,
      z,
      floor,
      group,
      isOpen: 0,
      isGuildChest: isGuildChest ? 1 : 0,
      cost: isGuildChest ? guildTotalCost : baseCost,
      contributedGold: 0,
      allyContribTimer: 0
    });
  }

  for (let floor = 0; floor < GRID_FLOORS; floor++) {
    const floorY = floor * 14;
    // Формула Блока 4: число обычных сундуков на этаже = 1 + N игроков (от 2 до 5 сундуков)
    const chestsPerFloor = 1 + Math.max(1, activeCoopPlayerCount || 2);
    for (let i = 0; i < chestsPerFloor; i++) {
      // Первый сундук на каждом втором этаже ставим на балкон (floorY + 6) как точку интереса!
      const floorBals = balconiesByFloor[floor] || [];
      if (i === 0 && floorBals.length > 0 && floor % 2 === 1) {
        const chosenBal = floorBals[floor % floorBals.length];
        const bCell = chosenBal.cells[0];
        if (bCell) {
          spawnChestAt(bCell[0], chosenBal.y, bCell[1], floor, 0.85, 0);
          continue;
        }
      }

      for (let attempt = 0; attempt < 18; attempt++) {
        const angle = seededRandom(seed, 'chest' + floor, i * 20 + attempt) * TWO_PI;
        const radius = 5 + seededRandom(seed, 'chestr' + floor, i * 20 + attempt) * (TOWER_FLOOR_RADIUS - 10);
        const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
        const z = Math.round((Math.sin(angle) * radius) / 4) * 4;

        if (!blocks.some((b) => b[5] === floorY && b[0] <= x && x < b[1] && b[2] <= z && z < b[3])) {
          continue;
        }
        if (
          blocks.some(
            (b) => b[4] < floorY + 0.5 && b[5] > floorY + 0.5 && b[0] <= x && x < b[1] && b[2] <= z && z < b[3]
          )
        ) {
          continue;
        }
        if (jumpPads.some((p) => p.y === floorY && Math.abs(p.x - x) < 3 && Math.abs(p.z - z) < 3)) {
          continue;
        }
        if (chests.some((c) => Math.abs(c.y - floorY) < 1 && Math.abs(c.x - x) < 4.5 && Math.abs(c.z - z) < 4.5)) {
          continue;
        }

        spawnChestAt(x, floorY, z, floor, 1.0, 0);
        break;
      }
    }

    // Редкий большой «Сундук гильдии» (складчина золотом для выдачи карточки каждому игроку)
    if (floor === 0 || (!isBossFloorIndex(floor) && seededRandom(seed, 'gchest_p', floor) < 0.68)) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = seededRandom(seed, 'gchest' + floor, attempt + 50) * TWO_PI;
        const radius = 6 + seededRandom(seed, 'gchestr' + floor, attempt + 50) * (TOWER_FLOOR_RADIUS - 11);
        const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
        const z = Math.round((Math.sin(angle) * radius) / 4) * 4;

        if (!blocks.some((b) => b[5] === floorY && b[0] <= x && x < b[1] && b[2] <= z && z < b[3])) {
          continue;
        }
        if (
          blocks.some(
            (b) => b[4] < floorY + 0.5 && b[5] > floorY + 0.5 && b[0] <= x && x < b[1] && b[2] <= z && z < b[3]
          )
        ) {
          continue;
        }
        if (jumpPads.some((p) => p.y === floorY && Math.abs(p.x - x) < 3.5 && Math.abs(p.z - z) < 3.5)) {
          continue;
        }
        if (chests.some((c) => Math.abs(c.y - floorY) < 1 && Math.abs(c.x - x) < 5 && Math.abs(c.z - z) < 5)) {
          continue;
        }

        spawnChestAt(x, floorY, z, floor, 1.0, 1);
        break;
      }
    }
  }

  // --- РАЗМЕЩЕНИЕ АЛТАРЕЙ ПАКТА (ЛИЧНЫЕ СДЕЛКИ VS ГЛОБАЛЬНЫЕ МИРОВЫЕ ПАКТЫ С ГОЛОСОВАНИЕМ F1/F2) ---
  for (let floor = 0; floor < GRID_FLOORS - 1; floor++) {
    if (isBossFloorIndex(floor) || (floor > 0 && seededRandom(seed, 'altp', floor) >= 0.65)) continue;
    const floorY = floor * 14;
    for (let attempt = 0; attempt < 18; attempt++) {
      const angle = seededRandom(seed, 'alt' + floor, attempt + 100) * TWO_PI;
      const radius = 5 + seededRandom(seed, 'altr' + floor, attempt) * (TOWER_FLOOR_RADIUS - 10);
      const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
      const z = Math.round((Math.sin(angle) * radius) / 4) * 4;

      if (!blocks.some((b) => b[5] === floorY && b[0] <= x && x < b[1] && b[2] <= z && z < b[3])) {
        continue;
      }
      if (
        blocks.some(
          (b) => b[4] < floorY + 0.5 && b[5] > floorY + 0.5 && b[0] <= x && x < b[1] && b[2] <= z && z < b[3]
        )
      ) {
        continue;
      }
      if (jumpPads.some((p) => p.y === floorY && Math.abs(p.x - x) < 3 && Math.abs(p.z - z) < 3)) {
        continue;
      }
      if (chests.some((c) => Math.abs(c.y - floorY) < 1 && Math.abs(c.x - x) < 5 && Math.abs(c.z - z) < 5)) {
        continue;
      }

      // Детерминированно чередуем личные (blood, frail) и глобальные (rage, greed, swift) алтари пакта
      const isPersonalAltar = floor % 2 === 1;
      const personalPool = typeof PERSONAL_PACT_KEYS !== 'undefined' ? PERSONAL_PACT_KEYS : ['blood', 'frail'];
      const globalPool = typeof GLOBAL_PACT_KEYS !== 'undefined' ? GLOBAL_PACT_KEYS : ['rage', 'greed', 'swift'];
      const pool = isPersonalAltar ? personalPool : globalPool;
      const pactKey = pool[Math.floor(seededRandom(seed, 'alt_key' + floor, attempt) * pool.length)] || pool[0];
      const pactScope = isPersonalAltar ? 'personal' : 'global';

      const haloMatInstance = new THREE.MeshBasicMaterial({
        color: isPersonalAltar ? 0xff4868 : 0x58f0ff,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const group = new THREE.Group();
      const pedestal = new THREE.Mesh(altarPedestalGeo, altarPedestalMat);
      const pillar = new THREE.Mesh(altarGeo, altarMat);
      const halo = new THREE.Mesh(altarHaloGeo, haloMatInstance);
      halo.position.y = 2.18;
      const swirl1 = new THREE.Mesh(altarSwirlGeo, haloMatInstance);
      swirl1.position.y = 0.65;
      swirl1.rotation.set(1.15, 0, 0.35);
      const swirl2 = new THREE.Mesh(altarSwirlGeo, haloMatInstance);
      swirl2.position.y = 1.05;
      swirl2.rotation.set(-1.15, 0, -0.35);
      const glow = new THREE.Sprite(altarGlowMat);
      glow.scale.setScalar(3.8);
      glow.position.y = 0.85;
      group.add(pedestal, pillar, halo, swirl1, swirl2, glow);
      group.userData = { pillar, halo, swirl1, swirl2, pactKey, pactScope };
      group.position.set(x, floorY + 0.75, z);
      altarGroup.add(group);
      altars.push({
        x,
        y: floorY,
        z,
        group,
        isOpen: 0,
        floor,
        cooldownUntil: 0,
        pactKey,
        pactScope
      });
      break;
    }
  }

  // --- СБОРКА INSTANCED MESH ПЛИТ БАШНИ С ПОДДЕРЖКОЙ 3 АКТОВ (ASH / ICE / VOID) ---
  const dummyObj = new THREE.Object3D();
  const blockColor = new THREE.Color();

  const blockIndicesByBiome = { ash: [], ice: [], void: [] };
  blocks.forEach((b, idx) => {
    const bId = getFloorBiomeId(b[6]);
    (blockIndicesByBiome[bId] || blockIndicesByBiome.ash).push(idx);
  });

  for (const bId of TOWER_IDS) {
    const indices = blockIndicesByBiome[bId];
    if (!indices || !indices.length) continue;

    const instMesh = new THREE.InstancedMesh(
      sculptedSlabGeometry,
      TOWER_SLAB_MATERIALS[bId] || TOWER_SLAB_MATERIALS.ash,
      indices.length
    );
    instMesh.frustumCulled = false;

    const themeColors = (TOWERS[bId] && TOWERS[bId].blockColors) || TOWERS.ash.blockColors;
    const gateColorHex = bId === 'ash' ? 0xff4518 : bId === 'ice' ? 0x45d8ff : 0xc845ff;

    for (let localIdx = 0; localIdx < indices.length; localIdx++) {
      const idx = indices[localIdx];
      const b = blocks[idx];
      blockInstanceRef[idx] = { mesh: instMesh, instanceId: localIdx };

      const rawH = b[5] - b[4];
      const tag = b[7] || 0;
      const isStairBlock = rawH > 1.5 && tag !== 3 && tag !== 4 && tag !== 7;

      if (tag === 3 || (bId === 'void' && isStairBlock)) {
        dummyObj.position.set(0, -999, 0);
        dummyObj.scale.set(0, 0, 0);
        dummyObj.updateMatrix();
        instMesh.setMatrixAt(localIdx, dummyObj.matrix);
        continue;
      }

      const visualH = isStairBlock ? 1.15 : rawH;
      const visualCenterY = isStairBlock ? b[5] - visualH * 0.5 : (b[4] + b[5]) / 2;
      dummyObj.position.set((b[0] + b[1]) / 2, visualCenterY, (b[2] + b[3]) / 2);
      dummyObj.scale.set(b[1] - b[0] - 0.08, visualH, b[3] - b[2] - 0.08);
      dummyObj.updateMatrix();
      instMesh.setMatrixAt(localIdx, dummyObj.matrix);

      const localTier = Math.floor((b[6] % 12) / 4);
      const baseColorHex =
        tag === 1
          ? 0x48cc82 // Зелёная лестница («Тихий путь»)
          : tag === 2
            ? 0xd84432 // Красная лестница («Опасный путь»)
            : tag === 3
              ? gateColorHex // Печать босса
              : tag === 4
                ? 0xc8a858 // Полуэтаж-балкон (floorY + 6)
                : tag === 5
                  ? 0x529e78 // Плита зелёного сектора («Тихий путь»)
                  : tag === 6
                    ? 0x9e5248 // Плита красного сектора («Опасный путь»)
                    : tag === 7
                      ? 0xd49b38 // Плита безопасного «Зала Кузницы»
                      : themeColors[localTier] || themeColors[0];

      instMesh.setColorAt(
        localIdx,
        blockColor.setHex(baseColorHex).offsetHSL(0, 0, ((b[0] / 4 + b[2] / 4) & 1) * 0.04)
      );
    }

    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) {
      instMesh.instanceColor.needsUpdate = true;
    }
    towerInstancedGroup.add(instMesh);
    if (!towerInstancedMesh) {
      towerInstancedMesh = instMesh;
    }
  }

  buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor, floorValidCellsByFloor);
}
