/* ==========================================================================
   Генерация башни и пространственная сетка блоков:
   12 этажей, планировки (Арена, Кольцо, Мосты, Острова), лестницы, развилки,
   печати боссов, прыжковые площадки, сундуки, алтари пактов и художественное
   3D-оформление окружения для Пепельной, Ледяной и Пустотной башен
   ========================================================================== */

/* ---------- 1. Детализированные 3D-модели объектов на карте (Мудборды 6 и 8) ---------- */

// 1A. ПРЫЖКОВАЯ ПЛОЩАДКА (ПАД) — Мудборд 6:
// Низкий восьмигранно-цилиндрический каменный постамент с рунными клеймами по бокам,
// светящимся бирюзовым магическим кругом сверху и восходящими потоками кинетической энергии
const jumpPadGroup = new BABYLON.Group();
scene.add(jumpPadGroup);

const jumpPadGeo = (function buildJumpPadGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkStone = new BABYLON.Color(0x1f2b34);
  const rimStone = new BABYLON.Color(0x324654);
  const cyanRune = new BABYLON.Color(0x45fff0);

  // Нижнее каменное основание
  parts.push({
    geo: new BABYLON.CylinderGeometry(1.44, 1.56, 0.22, 16),
    matrix: computeTransformMatrix(0, -0.05, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkStone
  });
  // 8 массивных скошенных каменных сегментов бортика вокруг диска
  const segGeo = new BABYLON.BoxGeometry(0.82, 0.26, 0.24);
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
  // 4 светящихся бирюзовых рунных клейма на боковых гранях цилиндра (как на мудборде 6)
  const runePlaqueGeo = new BABYLON.BoxGeometry(0.28, 0.16, 0.06);
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

const jumpPadMat = new BABYLON.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x0e6b62,
  emissiveIntensity: 0.95,
  roughness: 0.42,
  metalness: 0.45
});

const jumpPadTopDiscGeo = new BABYLON.CircleGeometry(1.16, 32);
jumpPadTopDiscGeo.rotateX(-Math.PI / 2);
const jumpPadTopDiscMat = new BABYLON.MeshBasicMaterial({
  map: TEXTURES.runicJumpPad,
  color: 0x70fff4,
  transparent: true,
  opacity: 0.96,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

const jumpPadKineticPlumeGeo = new BABYLON.CylinderGeometry(0.92, 1.12, 1.35, 20, 1, true);
jumpPadKineticPlumeGeo.translate(0, 0.68, 0);
const jumpPadKineticPlumeMat = new BABYLON.MeshBasicMaterial({
  color: 0x38ffe8,
  transparent: true,
  opacity: 0.24,
  side: BABYLON.DoubleSide,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

function createJumpPadVisualInstance(x, floorY, z) {
  const g = new BABYLON.Group();
  g.position.set(x, floorY + 0.14, z);

  const baseMesh = new BABYLON.Mesh(jumpPadGeo, jumpPadMat);
  g.add(baseMesh);

  const runeDisc = new BABYLON.Mesh(jumpPadTopDiscGeo, jumpPadTopDiscMat);
  runeDisc.position.y = 0.16;
  g.add(runeDisc);

  const plume = new BABYLON.Mesh(jumpPadKineticPlumeGeo, jumpPadKineticPlumeMat);
  plume.position.y = 0.15;
  g.add(plume);

  // Восходящее кинетическое кольцо энергии над площадкой
  const ring = new BABYLON.Mesh(
    new BABYLON.TorusGeometry(0.96, 0.024, 6, 28),
    jumpPadKineticPlumeMat
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.45;
  g.add(ring);

  g.userData = { runeDisc, plume, ring };
  return g;
}

// 1B. СУНДУК — Мудборд 8:
// «Золотистый кубический ящик» из тёмного вулканического камня с раскалёнными трещинами лавы,
// массивной золочёной оковкой граней и «Замком из магмы» спереди, окружённый золотым кольцом ауры
const chestGroup = new BABYLON.Group();
scene.add(chestGroup);

const chestCubeCoreGeo = new BABYLON.BoxGeometry(0.96, 0.96, 0.96);
const chestCubeCoreMat = new BABYLON.MeshStandardMaterial({
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
  const tempMat = new BABYLON.Matrix4();
  const goldTrim = new BABYLON.Color(0xffc842);
  const bronzeDark = new BABYLON.Color(0xb87618);
  const magmaBright = new BABYLON.Color(0xfff098);
  const keyholeDark = new BABYLON.Color(0x160708);

  // 12 золотистых рёбер куба
  const edgeLen = 1.02;
  const edgeThick = 0.095;
  const edgeGeoY = new BABYLON.BoxGeometry(edgeThick, edgeLen, edgeThick);
  const edgeGeoX = new BABYLON.BoxGeometry(edgeLen, edgeThick, edgeThick);
  const edgeGeoZ = new BABYLON.BoxGeometry(edgeThick, edgeThick, edgeLen);

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

  // 8 массивных кованых золотых наугольников на вершинах куба
  const cornerGeo = new BABYLON.BoxGeometry(0.16, 0.16, 0.16);
  for (const sx of [-0.47, 0.47]) {
    for (const sy of [-0.47, 0.47]) {
      for (const sz of [-0.47, 0.47]) {
        computeTransformMatrix(sx, sy, sz, 0, 0, 0, 1, 1, 1, tempMat);
        parts.push({ geo: cornerGeo, matrix: tempMat.clone(), color: bronzeDark });
      }
    }
  }

  // Перекрестные золотые полосы-оковки по граням и крышке (с V-образным замковым профилем, как на мудборде 8)
  parts.push({
    geo: new BABYLON.BoxGeometry(1.01, 0.11, 1.01),
    matrix: computeTransformMatrix(0, 0.08, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: goldTrim
  });
  parts.push({
    geo: new BABYLON.BoxGeometry(0.12, 1.01, 1.01),
    matrix: computeTransformMatrix(0, 0, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: bronzeDark
  });

  // «Замок из магмы» на передней грани (+Z) и задней грани (-Z)
  for (const zSign of [-1, 1]) {
    computeTransformMatrix(0, 0.02, zSign * 0.5, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new BABYLON.BoxGeometry(0.32, 0.38, 0.08),
      matrix: tempMat.clone(),
      color: goldTrim
    });
    computeTransformMatrix(0, 0.02, zSign * 0.525, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new BABYLON.BoxGeometry(0.22, 0.28, 0.05),
      matrix: tempMat.clone(),
      color: magmaBright
    });
    // Тёмная замочная скважина по центру замка из магмы
    computeTransformMatrix(0, 0.03, zSign * 0.55, 0, 0, 0, 1, 1, 1, tempMat);
    parts.push({
      geo: new BABYLON.BoxGeometry(0.065, 0.14, 0.03),
      matrix: tempMat.clone(),
      color: keyholeDark
    });
  }

  return mergeGeometryParts(parts);
})();

const chestMat = new BABYLON.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x985200,
  emissiveIntensity: 0.85,
  roughness: 0.25,
  metalness: 0.82
});

const chestAuraRingGeo = new BABYLON.TorusGeometry(0.88, 0.03, 6, 32);
chestAuraRingGeo.rotateX(Math.PI / 2);
const chestAuraRingMat = new BABYLON.MeshBasicMaterial({
  color: 0xffaa30,
  transparent: true,
  opacity: 0.72,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

const chestGlowMat = new BABYLON.SpriteMaterial({
  map: TEXTURES.glowWarm,
  color: 0xff9820,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.78
});
(function prewarmChestShader() {
  const dummyChest = new BABYLON.Mesh(chestGeo, chestMat);
  dummyChest.position.y = -80;
  scene.add(dummyChest);
})();

// 1C. АЛТАРЬ ПАКТА — Мудборд 6:
// «Шестигранный столб» фиолетового кристалла со светящимися вертикальными рунами на ступенчатом
// каменном постаменте + парящий сверху «Лиловый ореол» и спиральные вихри энергии
const altarGroup = new BABYLON.Group();
scene.add(altarGroup);

const altarPedestalGeo = (function buildAltarPedestalGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkStone = new BABYLON.Color(0x1b1228);
  const midStone = new BABYLON.Color(0x2d1d42);
  const runeTrim = new BABYLON.Color(0xa848ff);

  // Двухступенчатый восьмигранный каменный пьедестал с рунным желобом
  parts.push({
    geo: new BABYLON.CylinderGeometry(1.12, 1.28, 0.22, 8),
    matrix: computeTransformMatrix(0, -0.64, 0, 0, Math.PI / 8, 0, 1, 1, 1, tempMat).clone(),
    color: darkStone
  });
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.82, 0.98, 0.26, 8),
    matrix: computeTransformMatrix(0, -0.44, 0, 0, Math.PI / 8, 0, 1, 1, 1, tempMat).clone(),
    color: midStone
  });
  // Светящееся рунное кольцо в основании столба
  const ring = new BABYLON.TorusGeometry(0.68, 0.035, 6, 6);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, -0.3, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: runeTrim
  });
  // 4 каменных упора-контрфорса по углам пьедестала (как на мудборде 6)
  const buttressGeo = new BABYLON.BoxGeometry(0.24, 0.34, 0.36);
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
  const tempMat = new BABYLON.Matrix4();
  const crystalBody = new BABYLON.Color(0xc868ff);
  const crystalApex = new BABYLON.Color(0xf0b8ff);

  // Высокий шестигранный кристаллический столб («Шестигранный столб»)
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.38, 0.42, 1.72, 6),
    matrix: computeTransformMatrix(0, 0.52, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: crystalBody
  });
  // Шестигранная пирамидальная вершина столба
  parts.push({
    geo: new BABYLON.ConeGeometry(0.38, 0.56, 6),
    matrix: computeTransformMatrix(0, 1.66, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: crystalApex
  });
  return mergeGeometryParts(parts);
})();

const altarPedestalMat = new BABYLON.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x3b1268,
  emissiveIntensity: 0.75,
  roughness: 0.65,
  metalness: 0.3
});

const altarMat = new BABYLON.MeshStandardMaterial({
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

const altarHaloGeo = new BABYLON.TorusGeometry(0.62, 0.038, 8, 32);
altarHaloGeo.rotateX(Math.PI / 2);
const altarHaloMat = new BABYLON.MeshBasicMaterial({
  color: 0xe898ff,
  transparent: true,
  opacity: 0.88,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

const altarSwirlGeo = new BABYLON.TorusGeometry(0.68, 0.018, 6, 28);
const altarGlowMat = new BABYLON.SpriteMaterial({
  map: TEXTURES.glowPurple,
  color: 0xd878ff,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.88
});
(function prewarmAltarShader() {
  const dummyAltar = new BABYLON.Mesh(altarGeo, altarMat);
  dummyAltar.position.y = -80;
  scene.add(dummyAltar);
})();

// 1D. ПЕЧАТЬ (ВРАТА БОССА) — Мудборд 6:
// Перекрещивающаяся паутина розово-красных энергетических лучей-цепей (0xff2a60) поперёк лестницы босса
const bossGateSealGroup = new BABYLON.Group();
scene.add(bossGateSealGroup);
var bossGateVisualsByFloor = {};

const bossGateBeamMat = new BABYLON.MeshBasicMaterial({
  color: 0xff2a60,
  transparent: true,
  opacity: 0.92,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});
const bossGateCoreMat = new BABYLON.MeshBasicMaterial({
  color: 0xffc8d8,
  transparent: true,
  opacity: 0.96,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});
const bossGateGlowMat = new BABYLON.SpriteMaterial({
  map: TEXTURES.glowWhite,
  color: 0xff2a60,
  transparent: true,
  opacity: 0.9,
  blending: BABYLON.AdditiveBlending,
  depthWrite: false
});

function createBossGateSealVisual(stairSteps, floorY) {
  const sealGroup = new BABYLON.Group();
  if (!stairSteps || !stairSteps.length) return sealGroup;

  // Размещаем энергетическую паутину Печати на входе и середине лестницы босса
  const anchorIndices = [0, 2, 4];
  for (const idx of anchorIndices) {
    if (idx >= stairSteps.length) continue;
    const [sx, sz, stepTopY] = stairSteps[idx];
    const gateFrame = new BABYLON.Group();
    gateFrame.position.set(sx, stepTopY + 2.2, sz);
    // Поворачиваем плоскость печати поперёк марша лестницы (перпендикулярно радиусу башни)
    gateFrame.rotation.y = Math.atan2(sx, sz) + Math.PI / 2;

    // 8 перекрещивающихся багрово-розовых энергетических лучей (0xff2a60, как на мудборде 6)
    const beamOffsets = [
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

      const outerBeam = new BABYLON.Mesh(
        new BABYLON.CylinderGeometry(0.065, 0.065, len, 6),
        bossGateBeamMat
      );
      outerBeam.position.set(cx, cy, 0);
      outerBeam.rotation.z = ang;
      gateFrame.add(outerBeam);

      const innerCore = new BABYLON.Mesh(
        new BABYLON.CylinderGeometry(0.025, 0.025, len, 5),
        bossGateCoreMat
      );
      innerCore.position.set(cx, cy, 0);
      innerCore.rotation.z = ang;
      gateFrame.add(innerCore);
    }

    // Центральный пылающий узел Печати
    const nexusGlow = new BABYLON.Sprite(bossGateGlowMat);
    nexusGlow.scale.setScalar(3.4);
    gateFrame.add(nexusGlow);

    sealGroup.add(gateFrame);
  }

  bossGateSealGroup.add(sealGroup);
  return sealGroup;
}

const forkSpriteGroup = new BABYLON.Group();
scene.add(forkSpriteGroup);
const FORK_ROUTE_MATERIALS = {
  1: new BABYLON.SpriteMaterial({
    map: TEXTURES.glowWhite,
    color: 0x40ff90,
    blending: BABYLON.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  }),
  2: new BABYLON.SpriteMaterial({
    map: TEXTURES.glowWhite,
    color: 0xff3a2a,
    blending: BABYLON.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0.9
  })
};

const towerDecorGroup = new BABYLON.Group();
scene.add(towerDecorGroup);

// Скульптурная геометрия каменной/ледяной/пустотной плиты (вписана в 1×1×1)
const sculptedSlabGeometry = (function buildSculptedSlabGeometry() {
  const parts = [];
  const topColor = new BABYLON.Color(0xffffff);
  const bevelColor = new BABYLON.Color(0xebe6f0);
  const midColor = new BABYLON.Color(0xd0cad8);
  const bottomColor = new BABYLON.Color(0x8e8898);

  // Верхняя основная плита (y ∈ [0.16, 0.50])
  parts.push({
    geo: new BABYLON.BoxGeometry(1.0, 0.34, 1.0),
    matrix: computeTransformMatrix(0, 0.33, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: topColor
  });
  // Ступенчатый карниз под верхней плитой
  parts.push({
    geo: new BABYLON.BoxGeometry(0.96, 0.14, 0.96),
    matrix: computeTransformMatrix(0, 0.1, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: bevelColor
  });
  // Утопленный фриз-поясок посередине блока
  parts.push({
    geo: new BABYLON.BoxGeometry(0.88, 0.24, 0.88),
    matrix: computeTransformMatrix(0, -0.08, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: midColor
  });
  // Нижний сужающийся замковый свод/консоль под плитой
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.64, 0.44, 0.3, 4),
    matrix: computeTransformMatrix(0, -0.35, 0, 0, Math.PI / 4, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: bottomColor
  });

  return mergeGeometryParts(parts);
})();

const TOWER_SLAB_MATERIALS = {
  ash: new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.ash.map,
    bumpMap: TOWER_FLOOR_TEXTURES.ash.bump,
    bumpScale: 0.32,
    emissive: 0xff5210,
    emissiveMap: TOWER_FLOOR_TEXTURES.ash.emissive,
    emissiveIntensity: 0.9,
    vertexColors: true,
    roughness: 0.8,
    metalness: 0.15
  }),
  ice: new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.ice.map,
    bumpMap: TOWER_FLOOR_TEXTURES.ice.bump,
    bumpScale: 0.22,
    emissive: 0x4cb8ff,
    emissiveMap: TOWER_FLOOR_TEXTURES.ice.emissive,
    emissiveIntensity: 0.85,
    vertexColors: true,
    roughness: 0.14,
    metalness: 0.38
  }),
  void: new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.void.map,
    bumpMap: TOWER_FLOOR_TEXTURES.void.bump,
    bumpScale: 0.28,
    emissive: 0xa845ff,
    emissiveMap: TOWER_FLOOR_TEXTURES.void.emissive,
    emissiveIntensity: 1.15,
    vertexColors: true,
    roughness: 0.45,
    metalness: 0.3
  })
};

var blocks = [];
var jumpPads = [];
var chests = [];
var altars = [];
var floorLayouts = [];
var forkMarkers = [];
var bossGateBlockIndices = {};
var towerInstancedMesh = null;

let activeVoidFloatingMesh = null;
let activeVoidFloatingData = [];
let activeAshLavaStreamMat = null;
let activeVoidRunePillarMat = null;

/* ---------- Пространственная сетка блоков (ячейки 4×4×этаж) ---------- */

const GRID_FLOORS = 12;
const GRID_DIM = 15;
const GRID_OFFSET = 7;

let blockGrid = new Array(GRID_FLOORS * GRID_DIM * GRID_DIM).fill(null);
const _candidateBlockIndices = [];

function getBlockGridKey(floorIndex, ix, iz) {
  return floorIndex * 225 + (ix + GRID_OFFSET) * GRID_DIM + (iz + GRID_OFFSET);
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

function openBossGate(floorIndex) {
  const gateIndices = bossGateBlockIndices[floorIndex] || [];
  for (const blockIdx of gateIndices) {
    const block = blocks[blockIdx];
    block[4] = -999;
    block[5] = -998;
    if (towerInstancedMesh) {
      _pickupDummyObj.position.set(0, -999, 0);
      _pickupDummyObj.rotation.set(0, 0, 0);
      _pickupDummyObj.scale.set(0, 0, 0);
      _pickupDummyObj.updateMatrix();
      towerInstancedMesh.setMatrixAt(blockIdx, _pickupDummyObj.matrix);
    }
  }
  if (towerInstancedMesh) {
    towerInstancedMesh.instanceMatrix.needsUpdate = true;
  }
  const sealVisual = bossGateVisualsByFloor[floorIndex];
  if (sealVisual) {
    sealVisual.traverse((child) => {
      if (child.isSprite && typeof spawnSparkBurst === 'function') {
        const wp = new BABYLON.Vector3();
        child.getWorldPosition(wp);
        spawnSparkBurst(wp.x, wp.y, wp.z, 24, 'fire');
      }
    });
    sealVisual.visible = false;
  }
  bossGateBlockIndices[floorIndex] = [];
}

/* ---------- Генерация архитектурного окружения и деталей по темам башен ---------- */

function buildFrozenSilhouetteBaseGeometry() {
  const parts = [];
  const darkIceColor = new BABYLON.Color(0x0c2240);
  const cloakColor = new BABYLON.Color(0x14365e);
  const frostCoreColor = new BABYLON.Color(0x88dcff);

  // Остроконечный монашеский капюшон Ордена Инея
  parts.push({
    geo: new BABYLON.ConeGeometry(0.42, 0.85, 6),
    matrix: computeTransformMatrix(0, 1.72, 0, 0.12, 0, 0, 0.95, 1.0, 0.85, new BABYLON.Matrix4()),
    color: darkIceColor
  });
  // Массивные наплечники
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.68, 0.82, 0.55, 6),
    matrix: computeTransformMatrix(0, 1.12, 0, 0, 0, 0, 1.15, 1.0, 0.65, new BABYLON.Matrix4()),
    color: cloakColor
  });
  // Торс и длинная мантия, вмёрзшая в лёд
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.52, 0.85, 2.2, 7),
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1.0, 1.0, 0.62, new BABYLON.Matrix4()),
    color: darkIceColor
  });
  // Сложенные перед грудью руки, сжимающие меч/посох
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.15, 0.18, 1.05, 6),
    matrix: computeTransformMatrix(-0.42, 0.72, 0.18, 0.35, 0, -0.45, 1, 1, 1, new BABYLON.Matrix4()),
    color: cloakColor
  });
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.15, 0.18, 1.05, 6),
    matrix: computeTransformMatrix(0.42, 0.72, 0.18, 0.35, 0, 0.45, 1, 1, 1, new BABYLON.Matrix4()),
    color: cloakColor
  });
  // Посох/клинок в руках замёрзшего стража
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.06, 0.06, 2.7, 5),
    matrix: computeTransformMatrix(0, 0.55, 0.28, 0.05, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: darkIceColor
  });
  // Застывшее ледяное ядро и кристаллы льда, пронзающие фигуру
  parts.push({
    geo: new BABYLON.OctahedronGeometry(0.32, 0),
    matrix: computeTransformMatrix(0, 0.88, 0.22, 0.2, 0.3, 0, 0.9, 1.4, 0.8, new BABYLON.Matrix4()),
    color: frostCoreColor
  });
  parts.push({
    geo: new BABYLON.ConeGeometry(0.35, 1.8, 5),
    matrix: computeTransformMatrix(0.55, 0.4, 0.15, -0.2, 0, -0.65, 1, 1, 1, new BABYLON.Matrix4()),
    color: frostCoreColor
  });

  return mergeGeometryParts(parts);
}

const frozenSilhouetteBaseGeo = buildFrozenSilhouetteBaseGeometry();

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
}

/**
 * Строит уникальное 3D-окружение башни по референсам мудбордов:
 * - Пепельная: контрфорсы, стрельчатые арки, жаровни Горна, цепи, водопады магмы и базальтовые пики
 * - Ледяная: готические ледяные своды, 3D вмёрзшие в лёд силуэты монахов Ордена Инея, каскады сосулек и друзы льда
 * - Пустота: изгибающиеся щупальца/ленты тёмной материи, рунные обелиски, парящие обломки лестниц и руин в невесомости
 */
function buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor) {
  clearTowerDecorGroup();
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  const structureParts = [];
  const accentParts = [];
  const tempMat = new BABYLON.Matrix4();

  const pillarCount = 8;
  const wallRadius = 30.18;

  const pillarPrimaryColor =
    towerId === 'ash'
      ? new BABYLON.Color(0x361318)
      : towerId === 'ice'
        ? new BABYLON.Color(0x5da8dc)
        : new BABYLON.Color(0x1f0f38);
  const pillarSecondaryColor =
    towerId === 'ash'
      ? new BABYLON.Color(0x220a0d)
      : towerId === 'ice'
        ? new BABYLON.Color(0x98dcff)
        : new BABYLON.Color(0x34195e);
  const accentGlowColor =
    towerId === 'ash'
      ? new BABYLON.Color(0xff6a15)
      : towerId === 'ice'
        ? new BABYLON.Color(0x88e4ff)
        : new BABYLON.Color(0xc458ff);

  const pillarSectionGeo = new BABYLON.CylinderGeometry(0.95, 1.15, 14, 6);
  const capitalGeo = new BABYLON.CylinderGeometry(1.5, 1.08, 1.35, 6);
  const archSegmentGeo = new BABYLON.BoxGeometry(5.6, 0.95, 0.95);

  // 1. Периметральные контрфорсы, капители и стрельчатые арки
  for (let p = 0; p < pillarCount; p++) {
    const angle = (p / pillarCount) * TWO_PI;
    const px = Math.cos(angle) * wallRadius;
    const pz = Math.sin(angle) * wallRadius;
    const rotY = -angle + Math.PI / 2;

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      computeTransformMatrix(px, floorY + 7, pz, 0, rotY, 0, 1, 1, 0.78, tempMat);
      structureParts.push({
        geo: pillarSectionGeo,
        matrix: tempMat.clone(),
        color: pillarPrimaryColor
      });

      computeTransformMatrix(px, floorY + 0.2, pz, 0, rotY, 0, 1.15, 1, 0.88, tempMat);
      structureParts.push({
        geo: capitalGeo,
        matrix: tempMat.clone(),
        color: pillarSecondaryColor
      });

      // Двойные стрельчатые арки между колоннами
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
            color: pillarSecondaryColor
          });
        }
      }
    }
  }

  // 2. Детализация винтовых лестниц (карнизы ступеней, опорные колонны, балюстрады с огнями)
  const stairStepTrimGeo = new BABYLON.BoxGeometry(4.18, 0.34, 4.18);
  const stairPostGeo = new BABYLON.CylinderGeometry(0.25, 0.34, 1.4, 6);

  for (let floor = 0; floor < 11; floor++) {
    const stairs = stairPositionsByFloor[floor] || [];
    for (let s = 0; s < stairs.length; s++) {
      const [sx, sz, topY] = stairs[s];
      computeTransformMatrix(sx, topY - 0.14, sz, 0, 0, 0, 1, 1, 1, tempMat);
      structureParts.push({
        geo: stairStepTrimGeo,
        matrix: tempMat.clone(),
        color: pillarSecondaryColor
      });

      const colH = Math.max(0.5, topY - floor * 14 - 1.1);
      if (colH > 0.8) {
        computeTransformMatrix(
          sx,
          floor * 14 + colH * 0.5,
          sz,
          0,
          s * 0.5,
          0,
          1.12,
          colH / 14,
          1.12,
          tempMat
        );
        structureParts.push({
          geo: pillarSectionGeo,
          matrix: tempMat.clone(),
          color: pillarPrimaryColor
        });
      }

      if (s % 6 === 0 || s % 6 === 5) {
        for (const sign of [-1, 1]) {
          computeTransformMatrix(sx + sign * 1.65, topY + 0.65, sz + sign * 1.65, 0, 0, 0, 1, 1, 1, tempMat);
          structureParts.push({
            geo: stairPostGeo,
            matrix: tempMat.clone(),
            color: pillarPrimaryColor
          });
          accentParts.push({
            geo: new BABYLON.OctahedronGeometry(0.3, 0),
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
              new BABYLON.Matrix4()
            ),
            color: accentGlowColor
          });
        }
      }
    }
  }

  // 3. Специфические для каждой башни 3D-детали (по мудбордам)
  if (towerId === 'ash') {
    const slitGeo = new BABYLON.BoxGeometry(0.9, 5.2, 0.38);
    const lavaFallGeo = new BABYLON.CylinderGeometry(0.22, 0.48, 7.0, 6);
    const stalactiteGeo = new BABYLON.ConeGeometry(0.45, 2.4, 5);
    const chainLinkGeo = new BABYLON.CylinderGeometry(0.14, 0.14, 6.2, 5);
    const cragGeo = jitterGeometry(new BABYLON.ConeGeometry(1.1, 3.4, 5), 0.18);

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;
      for (let p = 0; p < pillarCount; p++) {
        const midAngle = ((p + 0.5) / pillarCount) * TWO_PI;
        const wx = Math.cos(midAngle) * 30.35;
        const wz = Math.sin(midAngle) * 30.35;
        const rotY = -midAngle + Math.PI / 2;

        if ((floor + p) % 2 === 0) {
          computeTransformMatrix(wx, floorY + 7.5, wz, 0, rotY, 0, 1, 1, 1, tempMat);
          accentParts.push({
            geo: slitGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xff7818)
          });

          computeTransformMatrix(wx * 0.99, floorY + 3.4, wz * 0.99, 0, rotY, 0, 1, 1, 0.55, tempMat);
          accentParts.push({
            geo: lavaFallGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xffaa30)
          });
        } else {
          computeTransformMatrix(wx * 0.98, floorY + 9.2, wz * 0.98, 0.1, rotY, 0.14, 1, 1, 1, tempMat);
          structureParts.push({
            geo: chainLinkGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0x1c080a)
          });
        }
      }

      const edgeCells = floorEdgeCellsByFloor[floor] || [];
      for (let e = 0; e < edgeCells.length; e += 3) {
        const [ex, ez] = edgeCells[e];
        const dropH = 1.7 + (e % 3) * 0.65;
        computeTransformMatrix(ex, floorY - 1.0 - dropH * 0.45, ez, Math.PI, e * 0.7, 0, 1, dropH / 2.4, 1, tempMat);
        structureParts.push({
          geo: stalactiteGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0x2d0f12)
        });
        if (e % 6 === 0) {
          computeTransformMatrix(ex, floorY - 1.0 - dropH * 0.92, ez, Math.PI, 0, 0, 0.58, 0.55, 0.58, tempMat);
          accentParts.push({
            geo: stalactiteGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xff6a10)
          });
        }
      }

      // Зубчатые обсидиановые скалы у стен на этажах боссов
      if (floor % 4 === 3) {
        for (let c = 0; c < 6; c++) {
          const ca = (c / 6) * TWO_PI + 0.3;
          computeTransformMatrix(
            Math.cos(ca) * 28.4,
            floorY + 1.4,
            Math.sin(ca) * 28.4,
            -0.18,
            -ca,
            0,
            1,
            1 + (c % 2) * 0.35,
            1,
            tempMat
          );
          structureParts.push({
            geo: cragGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0x280c10)
          });
        }
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 1; s < stairs.length; s += 2) {
        const [sx, sz, topY] = stairs[s];
        computeTransformMatrix(sx + 1.85, topY - 1.2, sz, 0, 0, 0.08, 0.68, 0.48, 0.68, tempMat);
        accentParts.push({
          geo: lavaFallGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xff8420)
        });
      }
    }
  } else if (towerId === 'ice') {
    const icicleGeo = new BABYLON.ConeGeometry(0.32, 2.4, 5);
    const crystalSpikeGeo = new BABYLON.CylinderGeometry(0.06, 0.44, 2.9, 6);
    const silhouetteParts = [];

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      // 3D-силуэты замёрзших монахов и воинов Ордена Инея в толще ледяных стен (между r=30.8 и внутренним слоем r=29.85)
      for (let s = 0; s < 4; s++) {
        const angle = ((s + 0.5) / 4) * TWO_PI + (floor % 2) * 0.38;
        const silRadius = 30.25;
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

        // Кристаллические ледяные рёбра по бокам вмёрзшего силуэта
        for (const ribOffset of [-0.12, 0.12]) {
          const rAng = angle + ribOffset;
          computeTransformMatrix(
            Math.cos(rAng) * 30.08,
            floorY + 6.8,
            Math.sin(rAng) * 30.08,
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
            color: new BABYLON.Color(0x98dcff)
          });
        }
      }

      for (let p = 0; p < pillarCount; p++) {
        if ((floor + p) % 2 !== 0) continue;
        const angle = (p / pillarCount) * TWO_PI + 0.18;
        const cx = Math.cos(angle) * 29.75;
        const cz = Math.sin(angle) * 29.75;
        computeTransformMatrix(cx, floorY + 1.4, cz, -0.25, -angle, 0.15, 1.1, 1.15, 1.1, tempMat);
        accentParts.push({
          geo: crystalSpikeGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xb8eeff)
        });
      }

      const edgeCells = floorEdgeCellsByFloor[floor] || [];
      for (let e = 0; e < edgeCells.length; e += 2) {
        const [ex, ez] = edgeCells[e];
        const len = 1.4 + (e % 4) * 0.55;
        computeTransformMatrix(
          ex + ((e % 3) - 1) * 0.7,
          floorY - 1.0 - len * 0.48,
          ez + (((e + 1) % 3) - 1) * 0.7,
          Math.PI,
          e * 0.5,
          0,
          0.85,
          len / 2.4,
          0.85,
          tempMat
        );
        accentParts.push({
          geo: icicleGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xcff2ff)
        });
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        const [sx, sz, topY] = stairs[s];
        for (const side of [-1.4, 1.4]) {
          const icicleLen = 1.8 + ((s + (side > 0 ? 1 : 0)) % 3) * 0.7;
          computeTransformMatrix(
            sx + side,
            topY - 1.2,
            sz - side * 0.5,
            Math.PI,
            s * 0.4,
            0,
            0.75,
            icicleLen / 2.4,
            0.75,
            tempMat
          );
          accentParts.push({
            geo: icicleGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xdcf6ff)
          });
        }
      }

      if (edgeCells.length > 0) {
        for (let m = 0; m < 2; m++) {
          const [mx, mz] = edgeCells[(m * 7 + floor * 3) % edgeCells.length];
          const mistSprite = new BABYLON.Sprite(
            new BABYLON.SpriteMaterial({
              map: TEXTURES.glowIce,
              color: 0xb8ecff,
              transparent: true,
              opacity: 0.32,
              blending: BABYLON.AdditiveBlending,
              depthWrite: false
            })
          );
          mistSprite.scale.set(6.5, 2.2, 1);
          mistSprite.position.set(mx * 0.75, floorY + 0.35, mz * 0.75);
          towerDecorGroup.add(mistSprite);
        }
      }
    }

    if (silhouetteParts.length) {
      const mergedSilGeo = mergeGeometryParts(silhouetteParts);
      const silMat = new BABYLON.MeshStandardMaterial({
        color: 0x16385e,
        emissive: 0x2468a8,
        emissiveIntensity: 0.75,
        roughness: 0.35,
        metalness: 0.25
      });
      const silMesh = new BABYLON.Mesh(mergedSilGeo, silMat);
      silMesh.userData.disposeMaterial = true;
      towerDecorGroup.add(silMesh);
    }
  } else if (towerId === 'void') {
    const runeTabletGeo = new BABYLON.BoxGeometry(0.95, 5.4, 0.34);
    const tendrilSegGeo = new BABYLON.CylinderGeometry(0.18, 0.38, 4.6, 6);

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;
      for (let p = 0; p < pillarCount; p++) {
        const angle = (p / pillarCount) * TWO_PI;
        const rx = Math.cos(angle) * 29.45;
        const rz = Math.sin(angle) * 29.45;
        const rotY = -angle + Math.PI / 2;

        if ((floor + p) % 2 === 0) {
          computeTransformMatrix(rx, floorY + 7.0, rz, 0, rotY, 0, 1, 1, 1, tempMat);
          accentParts.push({
            geo: runeTabletGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xd478ff)
          });
        }

        // Изгибающиеся ленты/щупальца тёмной материи («пространство складывается, как бумага»)
        if ((floor + p) % 2 === 1) {
          for (let seg = 0; seg < 2; seg++) {
            const tAngle = angle + 0.18 + seg * 0.08;
            const tx = Math.cos(tAngle) * (29.5 - seg * 0.4);
            const tz = Math.sin(tAngle) * (29.5 - seg * 0.4);
            computeTransformMatrix(
              tx,
              floorY + 4.2 + seg * 3.6,
              tz,
              0.38 * (seg ? -1 : 1),
              -tAngle,
              0.45,
              1,
              1,
              1,
              tempMat
            );
            structureParts.push({
              geo: tendrilSegGeo,
              matrix: tempMat.clone(),
              color: new BABYLON.Color(0x120624)
            });
          }
        }
      }

      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s += 2) {
        const [sx, sz, topY] = stairs[s];
        computeTransformMatrix(
          sx * 1.06,
          topY + 0.9,
          sz * 1.06,
          0.3 * s,
          0.5 * s,
          0.2,
          0.65,
          1.3,
          0.65,
          tempMat
        );
        accentParts.push({
          geo: new BABYLON.OctahedronGeometry(0.45, 0),
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xc868ff)
        });
      }
    }

    // Парящие в невесомости обломки ступеней и рунные монолиты
    const floatingCount = 84;
    const floatingGeo = jitterGeometry(new BABYLON.BoxGeometry(1.25, 0.85, 1.25), 0.12);
    const floatingMat = new BABYLON.MeshStandardMaterial({
      map: TOWER_FLOOR_TEXTURES.void.map,
      emissive: 0x9030ff,
      emissiveMap: TOWER_FLOOR_TEXTURES.void.emissive,
      emissiveIntensity: 1.4,
      roughness: 0.5,
      metalness: 0.3
    });
    activeVoidFloatingMesh = new BABYLON.InstancedMesh(floatingGeo, floatingMat, floatingCount);
    activeVoidFloatingMesh.userData.disposeMaterial = true;
    activeVoidFloatingData = [];

    const dummy = new BABYLON.Object3D();
    for (let i = 0; i < floatingCount; i++) {
      const floor = i % 12;
      const angle = seededRandom(seed, 'vfltA', i) * TWO_PI;
      const radius =
        i % 3 === 0
          ? 6 + seededRandom(seed, 'vfltR', i) * 14
          : 26.6 + seededRandom(seed, 'vfltR', i) * 2.5;
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
        speed: 0.5 + (i % 5) * 0.18
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

  if (structureParts.length) {
    const mergedStructGeo = mergeGeometryParts(structureParts);
    const structMat = new BABYLON.MeshStandardMaterial({
      map: TOWER_WALL_TEXTURES[towerId].map,
      bumpMap: TOWER_WALL_TEXTURES[towerId].bump,
      bumpScale: 0.3,
      color: 0xffffff,
      vertexColors: true,
      roughness: towerId === 'ice' ? 0.2 : 0.82,
      metalness: towerId === 'ice' ? 0.35 : 0.2
    });
    const structMesh = new BABYLON.Mesh(mergedStructGeo, structMat);
    structMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(structMesh);
  }

  if (accentParts.length) {
    const mergedAccentGeo = mergeGeometryParts(accentParts);
    let accentMat;
    if (towerId === 'ash') {
      accentMat = new BABYLON.MeshStandardMaterial({
        map: lavaTexture,
        color: 0xffffff,
        vertexColors: true,
        emissive: 0xff6210,
        emissiveMap: lavaTexture,
        emissiveIntensity: 1.9,
        roughness: 0.4
      });
      activeAshLavaStreamMat = accentMat;
    } else if (towerId === 'ice') {
      accentMat = new BABYLON.MeshStandardMaterial({
        color: 0xd8f4ff,
        vertexColors: true,
        emissive: 0x3898e0,
        emissiveIntensity: 0.58,
        roughness: 0.08,
        metalness: 0.35,
        transparent: true,
        opacity: 0.84
      });
    } else {
      accentMat = new BABYLON.MeshStandardMaterial({
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
    const accentMesh = new BABYLON.Mesh(mergedAccentGeo, accentMat);
    accentMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(accentMesh);
  }
}

function updateTowerDecorAnimations(time, dt, towerId) {
  // Анимация Прыжковых площадок (вращение рунного круга и пульсация кинетического потока)
  for (let i = 0; i < jumpPadGroup.children.length; i++) {
    const padObj = jumpPadGroup.children[i];
    const ud = padObj.userData;
    if (ud && ud.runeDisc) {
      ud.runeDisc.rotation.z = time * 0.85;
      const lift = (time * 1.6 + i * 0.35) % 1.0;
      ud.ring.position.y = 0.2 + lift * 1.15;
      ud.ring.scale.setScalar(1.0 - lift * 0.25);
      ud.plume.scale.y = 0.85 + Math.sin(time * 5 + i) * 0.18;
    }
  }

  // Анимация Алтарей пакта («Вращается медленно, гипнотически» + парящий лиловый ореол)
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

  // Пульсация багрово-розовой Печати (Врат босса, 0xff2a60)
  bossGateBeamMat.opacity = 0.78 + Math.sin(time * 6.5) * 0.18;

  if (towerId === 'void' && activeVoidFloatingMesh && activeVoidFloatingData.length) {
    const dummy = _pickupDummyObj;
    for (let i = 0; i < activeVoidFloatingData.length; i++) {
      const item = activeVoidFloatingData[i];
      dummy.position.set(
        item.x,
        item.baseY + Math.sin(time * item.speed + item.phase) * 0.55,
        item.z
      );
      dummy.rotation.set(
        item.rx + time * 0.18 * item.speed,
        item.ry + time * 0.24 * item.speed,
        item.rz
      );
      dummy.scale.setScalar(item.scale);
      dummy.updateMatrix();
      activeVoidFloatingMesh.setMatrixAt(i, dummy.matrix);
    }
    activeVoidFloatingMesh.instanceMatrix.needsUpdate = true;
    if (activeVoidRunePillarMat) {
      activeVoidRunePillarMat.emissiveIntensity = 1.35 + Math.sin(time * 2.8) * 0.45;
    }
  } else if (towerId === 'ash' && activeAshLavaStreamMat) {
    activeAshLavaStreamMat.emissiveIntensity = 1.75 + Math.sin(time * 3.4) * 0.3;
  }
}

function buildTower(seed) {
  if (towerInstancedMesh) {
    scene.remove(towerInstancedMesh);
    towerInstancedMesh = null;
  }

  jumpPadGroup.clear();
  chestGroup.clear();
  altarGroup.clear();
  forkSpriteGroup.clear();
  bossGateSealGroup.clear();

  chests = [];
  altars = [];
  floorLayouts = [];
  forkMarkers = [];
  bossGateBlockIndices = {};
  bossGateVisualsByFloor = {};
  jumpPads = [];
  blocks = [];
  blockGrid = new Array(GRID_FLOORS * GRID_DIM * GRID_DIM).fill(null);

  let prevStairPositions = [];
  const stairPositionsByFloor = [];
  const floorEdgeCellsByFloor = [];

  for (let floor = 0; floor < 12; floor++) {
    const floorY = floor * 14;
    const stairStartAngle =
      seededRandom(seed, 'tower', 0) * TWO_PI +
      floor * Math.PI +
      (seededRandom(seed, 'tower', floor + 1) - 0.5) * 0.9;

    const currentStairCells = [];
    if (floor < 11) {
      const stairBranchCount = FORK_FLOORS.includes(floor) ? 2 : 1;
      for (let branch = 0; branch < stairBranchCount; branch++) {
        for (let stepIdx = 1; stepIdx <= 6; stepIdx++) {
          const angle = stairStartAngle + branch * Math.PI + stepIdx * 0.3;
          currentStairCells.push([
            Math.round(Math.cos(angle) * 5.5) * 4,
            Math.round(Math.sin(angle) * 5.5) * 4
          ]);
        }
      }
    }

    const layoutRoll = seededRandom(seed, 'lay', floor);
    const weights = currentTowerTheme.layoutWeights;
    const initialLayout =
      floor === 0 || floor % 4 === 3
        ? 'disc'
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

    for (let i = -7; i <= 7; i++) {
      for (let j = -7; j <= 7; j++) {
        if (i * i + j * j > 49) continue;
        const x = i * 4;
        const z = j * 4;
        if (prevStairPositions.some((st) => Math.pow(st[0] - x, 2) + Math.pow(st[1] - z, 2) < 25)) {
          continue;
        }
        activeCells.add((i + 7) * 15 + j + 7);
      }
    }

    let finalLayout = initialLayout;
    if (initialLayout !== 'disc') {
      const fullCellsBackup = new Set(activeCells);
      for (const cellKey of fullCellsBackup) {
        const i = ((cellKey / 15) | 0) - 7;
        const j = (cellKey % 15) - 7;
        if (isNearAnyPoint(currentStairCells, i, j, 1) || isNearAnyPoint(prevStairPositions, i, j, 2)) {
          continue;
        }
        if (initialLayout === 'ring' && i * i + j * j <= 10) {
          activeCells.delete(cellKey);
        } else if (
          initialLayout === 'spokes' &&
          Math.abs(i) > 1 &&
          Math.abs(j) > 1 &&
          i * i + j * j < 25
        ) {
          activeCells.delete(cellKey);
        } else if (
          initialLayout === 'islands' &&
          seededRandom(seed, 'isl' + floor, cellKey) < currentTowerTheme.islandRemoveProb
        ) {
          activeCells.delete(cellKey);
        }
      }

      const startCellKey = currentStairCells.length
        ? (currentStairCells[0][0] / 4 + 7) * 15 + currentStairCells[0][1] / 4 + 7
        : -1;
      const visitedCells = new Set();
      const queue = [startCellKey];

      if (activeCells.has(startCellKey)) {
        visitedCells.add(startCellKey);
        while (queue.length) {
          const cur = queue.pop();
          const ci = (cur / 15) | 0;
          const cj = cur % 15;
          for (let di = -2; di <= 2; di++) {
            for (let dj = -2; dj <= 2; dj++) {
              const ni = ci + di;
              const nj = cj + dj;
              if (ni < 0 || nj < 0 || ni > 14 || nj > 14) continue;
              const neighborKey = ni * 15 + nj;
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
        const stairKey = (stairPt[0] / 4 + 7) * 15 + stairPt[1] / 4 + 7;
        if (activeCells.has(stairKey) && !visitedCells.has(stairKey)) {
          isDisconnected = true;
        }
      }
      for (const cellKey of activeCells) {
        if (
          !visitedCells.has(cellKey) &&
          isNearAnyPoint(prevStairPositions, ((cellKey / 15) | 0) - 7, (cellKey % 15) - 7, 2)
        ) {
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
    for (const cellKey of activeCells) {
      const ci = (cellKey / 15) | 0;
      const cj = cellKey % 15;
      const x = (ci - 7) * 4;
      const z = (cj - 7) * 4;
      blocks.push([x - 2, x + 2, z - 2, z + 2, floorY - 1, floorY, floor]);

      if (
        !activeCells.has((ci - 1) * 15 + cj) ||
        !activeCells.has((ci + 1) * 15 + cj) ||
        !activeCells.has(ci * 15 + (cj - 1)) ||
        !activeCells.has(ci * 15 + (cj + 1))
      ) {
        edgeCells.push([x, z]);
      }
    }
    floorEdgeCellsByFloor[floor] = edgeCells;

    prevStairPositions = [];
    const floorStairs = [];
    const isForkFloor = FORK_FLOORS.includes(floor);
    const swapRoutes = seededRandom(seed, 'forkr', floor) < 0.5;

    if (floor < 11) {
      for (let branch = 0; branch < (isForkFloor ? 2 : 1); branch++) {
        for (let stepIdx = 1; stepIdx <= 6; stepIdx++) {
          const angle = stairStartAngle + branch * Math.PI + stepIdx * 0.3;
          const x = Math.round(Math.cos(angle) * 5.5) * 4;
          const z = Math.round(Math.sin(angle) * 5.5) * 4;
          const routeTag = isForkFloor ? ((branch === 0) !== swapRoutes ? 1 : 2) : 0;

          blocks.push([x - 2, x + 2, z - 2, z + 2, floorY, floorY + 2 * stepIdx, floor, routeTag]);
          prevStairPositions.push([x, z]);
          floorStairs.push([x, z, floorY + 2 * stepIdx]);

          if (floor % 4 === 3 && floor < 11) {
            blocks.push([x - 2.05, x + 2.05, z - 2.05, z + 2.05, floorY, floorY + 16, floor, 3]);
            (bossGateBlockIndices[floor] = bossGateBlockIndices[floor] || []).push(blocks.length - 1);
          }

          if (isForkFloor && (stepIdx === 1 || stepIdx === 6)) {
            const markerSprite = new BABYLON.Sprite(FORK_ROUTE_MATERIALS[routeTag]);
            markerSprite.scale.setScalar(stepIdx === 1 ? 5 : 6);
            markerSprite.position.set(x, floorY + 2 * stepIdx + 3, z);
            forkSpriteGroup.add(markerSprite);
            if (stepIdx === 6) {
              forkMarkers.push({ floor, x, z, route: routeTag });
            }
          }
        }
      }
    }
    stairPositionsByFloor[floor] = floorStairs;
    if (floor % 4 === 3 && floor < 11) {
      bossGateVisualsByFloor[floor] = createBossGateSealVisual(floorStairs, floorY);
    }

    for (let i = 0; i < 2; i++) {
      const angle = seededRandom(seed, 'pad' + floor, i) * TWO_PI;
      const radius = 6 + seededRandom(seed, 'pad' + floor, i + 9) * 14;
      const x = Math.round((Math.cos(angle) * radius) / 4) * 4;
      const z = Math.round((Math.sin(angle) * radius) / 4) * 4;
      if (
        floor > 0 &&
        blocks.some((b) => b[5] === floorY && b[0] <= x && x < b[1] && b[2] <= z && z < b[3])
      ) {
        jumpPads.push({ x, z, y: floorY });
        jumpPadGroup.add(createJumpPadVisualInstance(x, floorY, z));
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    insertBlockIntoGrid(i);
  }

  for (let floor = 0; floor < 12; floor++) {
    const floorY = floor * 14;
    for (let i = 0; i < 2; i++) {
      for (let attempt = 0; attempt < 14; attempt++) {
        const angle = seededRandom(seed, 'chest' + floor, i * 20 + attempt) * TWO_PI;
        const radius = 5 + seededRandom(seed, 'chestr' + floor, i * 20 + attempt) * 17;
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
        if (chests.some((c) => c.y === floorY && Math.abs(c.x - x) < 5 && Math.abs(c.z - z) < 5)) {
          continue;
        }

        const group = new BABYLON.Group();
        const coreCube = new BABYLON.Mesh(chestCubeCoreGeo, chestCubeCoreMat);
        const frameMesh = new BABYLON.Mesh(chestGeo, chestMat);
        const auraRing = new BABYLON.Mesh(chestAuraRingGeo, chestAuraRingMat);
        auraRing.position.y = -0.18;
        const glow = new BABYLON.Sprite(chestGlowMat);
        glow.scale.setScalar(3.4);
        glow.position.y = 0.2;
        group.add(coreCube, frameMesh, auraRing, glow);
        group.position.set(x, floorY + 0.68, z);
        chestGroup.add(group);
        chests.push({ x, y: floorY, z, group, isOpen: 0, cost: Math.round(4 + 2.5 * floor) });
        break;
      }
    }
  }

  for (let floor = 1; floor < 11; floor++) {
    if (floor % 4 === 3 || seededRandom(seed, 'altp', floor) >= 0.5) continue;
    const floorY = floor * 14;
    for (let attempt = 0; attempt < 14; attempt++) {
      const angle = seededRandom(seed, 'alt' + floor, attempt + 100) * TWO_PI;
      const radius = 5 + seededRandom(seed, 'altr' + floor, attempt) * 17;
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
      if (chests.some((c) => c.y === floorY && Math.abs(c.x - x) < 5 && Math.abs(c.z - z) < 5)) {
        continue;
      }

      const group = new BABYLON.Group();
      const pedestal = new BABYLON.Mesh(altarPedestalGeo, altarPedestalMat);
      const pillar = new BABYLON.Mesh(altarGeo, altarMat);
      const halo = new BABYLON.Mesh(altarHaloGeo, altarHaloMat);
      halo.position.y = 2.18;
      const swirl1 = new BABYLON.Mesh(altarSwirlGeo, altarHaloMat);
      swirl1.position.y = 0.65;
      swirl1.rotation.set(1.15, 0, 0.35);
      const swirl2 = new BABYLON.Mesh(altarSwirlGeo, altarHaloMat);
      swirl2.position.y = 1.05;
      swirl2.rotation.set(-1.15, 0, -0.35);
      const glow = new BABYLON.Sprite(altarGlowMat);
      glow.scale.setScalar(3.8);
      glow.position.y = 0.85;
      group.add(pedestal, pillar, halo, swirl1, swirl2, glow);
      group.userData = { pillar, halo, swirl1, swirl2 };
      group.position.set(x, floorY + 0.75, z);
      altarGroup.add(group);
      altars.push({ x, y: floorY, z, group, isOpen: 0, floor, cooldownUntil: 0 });
      break;
    }
  }

  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';
  const dummyObj = new BABYLON.Object3D();
  const blockColor = new BABYLON.Color();
  towerInstancedMesh = new BABYLON.InstancedMesh(
    sculptedSlabGeometry,
    TOWER_SLAB_MATERIALS[towerId] || TOWER_SLAB_MATERIALS.ash,
    blocks.length
  );

  const gateColorHex =
    towerId === 'ash' ? 0xff4518 : towerId === 'ice' ? 0x45d8ff : 0xc845ff;

  blocks.forEach((b, idx) => {
    const rawH = b[5] - b[4];
    if (b[7] === 3) {
      // Физический барьер Печати босса остаётся, а визуально рендерится паутина 0xff2a60 (bossGateSealGroup)
      dummyObj.position.set(0, -999, 0);
      dummyObj.scale.set(0, 0, 0);
      dummyObj.updateMatrix();
      towerInstancedMesh.setMatrixAt(idx, dummyObj.matrix);
      return;
    }
    const isStairBlock = rawH > 1.5 && b[7] !== 3;
    const visualH = isStairBlock ? 1.15 : rawH;
    const visualCenterY = isStairBlock ? b[5] - visualH * 0.5 : (b[4] + b[5]) / 2;
    dummyObj.position.set((b[0] + b[1]) / 2, visualCenterY, (b[2] + b[3]) / 2);
    dummyObj.scale.set(b[1] - b[0] - 0.08, visualH, b[3] - b[2] - 0.08);
    dummyObj.updateMatrix();
    towerInstancedMesh.setMatrixAt(idx, dummyObj.matrix);

    const baseColorHex =
      b[7] === 1
        ? 0x48cc82
        : b[7] === 2
          ? 0xd84432
          : b[7] === 3
            ? gateColorHex
            : currentTowerTheme.blockColors[Math.floor(b[6] / 4)];

    towerInstancedMesh.setColorAt(
      idx,
      blockColor.setHex(baseColorHex).offsetHSL(0, 0, ((b[0] / 4 + b[2] / 4) & 1) * 0.05)
    );
  });

  towerInstancedMesh.instanceMatrix.needsUpdate = true;
  if (towerInstancedMesh.instanceColor) {
    towerInstancedMesh.instanceColor.needsUpdate = true;
  }
  scene.add(towerInstancedMesh);

  buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor);
}
