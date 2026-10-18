/* ==========================================================================
   Генерация башни и пространственная сетка блоков:
   12 этажей, планировки (Арена, Кольцо, Мосты, Острова), лестницы, развилки,
   печати боссов, прыжковые площадки, сундуки, алтари пактов и детальное
   3D-окружение (GLSL-шейдеры, 3D-потоки и лужи лавы, капли со ступеней,
   вмёрзшие во льды силуэты, сосульки, растворяющиеся ступени Пустоты и планктон)
   ========================================================================== */

/* ---------- 1. Детализированные 3D-модели объектов на карте (Мудборды 6 и 8) ---------- */

// 1A. ПРЫЖКОВАЯ ПЛОЩАДКА (ПАД)
const jumpPadGroup = new BABYLON.Group();
scene.add(jumpPadGroup);

const jumpPadGeo = (function buildJumpPadGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkStone = new BABYLON.Color(0x1f2b34);
  const rimStone = new BABYLON.Color(0x324654);
  const cyanRune = new BABYLON.Color(0x45fff0);

  parts.push({
    geo: new BABYLON.CylinderGeometry(1.44, 1.56, 0.22, 16),
    matrix: computeTransformMatrix(0, -0.05, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: darkStone
  });
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

// 1B. СУНДУК
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

  const cornerGeo = new BABYLON.BoxGeometry(0.16, 0.16, 0.16);
  for (const sx of [-0.47, 0.47]) {
    for (const sy of [-0.47, 0.47]) {
      for (const sz of [-0.47, 0.47]) {
        computeTransformMatrix(sx, sy, sz, 0, 0, 0, 1, 1, 1, tempMat);
        parts.push({ geo: cornerGeo, matrix: tempMat.clone(), color: bronzeDark });
      }
    }
  }

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

// 1C. АЛТАРЬ ПАКТА
const altarGroup = new BABYLON.Group();
scene.add(altarGroup);

const altarPedestalGeo = (function buildAltarPedestalGeometry() {
  const parts = [];
  const tempMat = new BABYLON.Matrix4();
  const darkStone = new BABYLON.Color(0x1b1228);
  const midStone = new BABYLON.Color(0x2d1d42);
  const runeTrim = new BABYLON.Color(0xa848ff);

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
  const ring = new BABYLON.TorusGeometry(0.68, 0.035, 6, 6);
  ring.rotateX(Math.PI / 2);
  parts.push({
    geo: ring,
    matrix: computeTransformMatrix(0, -0.3, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: runeTrim
  });
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

  parts.push({
    geo: new BABYLON.CylinderGeometry(0.38, 0.42, 1.72, 6),
    matrix: computeTransformMatrix(0, 0.52, 0, 0, 0, 0, 1, 1, 1, tempMat).clone(),
    color: crystalBody
  });
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

// 1D. ПЕЧАТЬ (ВРАТА БОССА)
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

  const anchorIndices = [0, 2, 4];
  for (const idx of anchorIndices) {
    if (idx >= stairSteps.length) continue;
    const [sx, sz, stepTopY] = stairSteps[idx];
    const gateFrame = new BABYLON.Group();
    gateFrame.position.set(sx, stepTopY + 2.2, sz);
    gateFrame.rotation.y = Math.atan2(sx, sz) + Math.PI / 2;

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

  parts.push({
    geo: new BABYLON.BoxGeometry(1.0, 0.34, 1.0),
    matrix: computeTransformMatrix(0, 0.33, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: topColor
  });
  parts.push({
    geo: new BABYLON.BoxGeometry(0.96, 0.14, 0.96),
    matrix: computeTransformMatrix(0, 0.1, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: bevelColor
  });
  parts.push({
    geo: new BABYLON.BoxGeometry(0.88, 0.24, 0.88),
    matrix: computeTransformMatrix(0, -0.08, 0, 0, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: midColor
  });
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
    bumpScale: 0.44,
    emissive: 0xff4500,
    emissiveMap: TOWER_FLOOR_TEXTURES.ash.emissive,
    emissiveIntensity: 1.05,
    vertexColors: true,
    roughness: 0.88,
    metalness: 0.12
  }),
  ice: new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.ice.map,
    bumpMap: TOWER_FLOOR_TEXTURES.ice.bump,
    bumpScale: 0.26,
    emissive: 0x88ddff,
    emissiveMap: TOWER_FLOOR_TEXTURES.ice.emissive,
    emissiveIntensity: 1.95, // Зафиксированный параметр: Эмиссия трещин льда = 1.95
    vertexColors: true,
    roughness: 0.06,
    metalness: 0.18
  }),
  void: new BABYLON.MeshStandardMaterial({
    map: TOWER_FLOOR_TEXTURES.void.map,
    bumpMap: TOWER_FLOOR_TEXTURES.void.bump,
    bumpScale: 0.25,
    emissive: 0xc478ff,
    emissiveMap: TOWER_FLOOR_TEXTURES.void.emissive,
    emissiveIntensity: 1.35,
    vertexColors: true,
    roughness: 0.16,
    metalness: 0.26
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

// Динамические коллекции шейдеров и 3D-анимаций для трёх башен
let activeVoidFloatingMesh = null;
let activeVoidFloatingData = [];
let activeAshFlowShaderMats = [];
let activeAshPuddleShaderMats = [];
let activeAshWallStreamGlobs = [];
let activeAshFallingDrops = [];
let activeIceCreepingFogMeshes = [];
let activeVoidShaderMaterials = [];
let activeVoidMistBillboards = [];

/* ---------- Вспомогательные функции создания 3D-ручьёв лавы, луж и шейдеров (из референсов) ---------- */

function createFlowingLavaShaderMaterial(seedOffset = 0.0) {
  const mat = new BABYLON.ShaderMaterial(
    'flowLavaMat_' + seedOffset,
    scene,
    { vertex: 'flowingLava', fragment: 'flowingLava' },
    {
      attributes: ['position', 'normal', 'uv'],
      uniforms: [
        'world',
        'viewProjection',
        'uTime',
        'uSpeed',
        'uSeed',
        'uFogColor',
        'uFogDensity',
        'uCameraPos'
      ]
    }
  );
  mat.setFloat('uTime', 0.0);
  mat.setFloat('uSpeed', activeTowerVfxState.lavaSpeed || 2.25);
  mat.setFloat('uSeed', seedOffset);
  mat.setColor3('uFogColor', new BABYLON.Color(0x220707));
  mat.setFloat('uFogDensity', 0.015);
  mat.setVector3('uCameraPos', camera.position);
  mat.backFaceCulling = false;

  activeAshFlowShaderMats.push(mat);
  return mat;
}

function createLavaPuddleShaderMaterial(seedOffset = 0.0, hasDripRipple = false) {
  const mat = new BABYLON.ShaderMaterial(
    'puddleLavaMat_' + seedOffset,
    scene,
    { vertex: 'lavaPuddle', fragment: 'lavaPuddle' },
    {
      attributes: ['position', 'uv'],
      uniforms: [
        'world',
        'viewProjection',
        'uTime',
        'uSpeed',
        'uSeed',
        'uDripRipple',
        'uFogColor',
        'uFogDensity',
        'uCameraPos'
      ]
    }
  );
  mat.setFloat('uTime', 0.0);
  mat.setFloat('uSpeed', activeTowerVfxState.lavaSpeed || 2.25);
  mat.setFloat('uSeed', seedOffset);
  mat.setFloat('uDripRipple', hasDripRipple ? 1.0 : 0.0);
  mat.setColor3('uFogColor', new BABYLON.Color(0x220707));
  mat.setFloat('uFogDensity', 0.015);
  mat.setVector3('uCameraPos', camera.position);
  mat.backFaceCulling = false;

  activeAshPuddleShaderMats.push(mat);
  return mat;
}

/**
 * Создаёт органическую 3D-геометрию лавовой лужи с приподнятым бортиком и кастомным GLSL-шейдером
 * (точное портирование createOrganicPuddleMesh из babylon_js_glsl.html).
 */
function createOrganicPuddleMesh(radius, seedVal, hasDripRipple = false) {
  const puddleNode = new BABYLON.Group();
  const rings = 10;
  const segments = 28;

  const positions = [];
  const uvs = [];
  const indices = [];

  const getR = (angle) => {
    const n1 = Math.sin(angle * 3.0 + seedVal * 1.7) * 0.15;
    const n2 = Math.cos(angle * 5.0 - seedVal * 2.3) * 0.09;
    const n3 = Math.sin(angle * 8.0 + seedVal * 4.1) * 0.05;
    return radius * (1.0 + n1 + n2 + n3);
  };

  positions.push(0, 0.055, 0);
  uvs.push(0, 0.5);

  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * TWO_PI;
      const maxR = getR(angle);
      const curR = maxR * t;

      let y = 0.055;
      if (t > 0.72 && t < 0.94) {
        y += Math.sin(((t - 0.72) / 0.22) * Math.PI) * 0.09;
      } else if (t >= 0.94) {
        y = 0.01;
      }

      positions.push(Math.cos(angle) * curR, y, Math.sin(angle) * curR);
      uvs.push(t, s / segments);
    }
  }

  for (let s = 0; s < segments; s++) {
    const nextS = (s + 1) % segments;
    indices.push(0, 1 + nextS, 1 + s);
  }

  for (let r = 0; r < rings - 1; r++) {
    const rowStart = 1 + r * segments;
    const nextRowStart = 1 + (r + 1) * segments;
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;
      const a = rowStart + s;
      const b = rowStart + nextS;
      const c = nextRowStart + s;
      const d = nextRowStart + nextS;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  const geo = new BABYLON.BufferGeometry();
  geo.setAttribute('position', new BABYLON.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('uv', new BABYLON.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = createLavaPuddleShaderMaterial(seedVal, hasDripRipple);
  const mesh = new BABYLON.Mesh(geo, mat);
  puddleNode.add(mesh);
  return puddleNode;
}

/**
 * Создаёт 3D-геометрию ручья стекающей лавы с переменным сечением вдоль сплайна CatmullRomCurve3
 * (точное портирование createVariableTubeMesh из babylon_js_glsl.html).
 */
function createVariableTubeMesh(curve, tubularSegments, baseRadius, seedVal, material, parentGroup) {
  const radialSegments = 8;
  const frames = curve.computeFrenetFrames(tubularSegments);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const P = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const organicWave =
      1.0 + 0.34 * Math.sin(u * 19.0 + seedVal * 3.1) + 0.22 * Math.cos(u * 33.0 - seedVal * 1.7);
    const tipTaper =
      u < 0.08
        ? 0.45 + (u / 0.08) * 0.55
        : u > 0.85
          ? Math.max(0.14, 1.0 - ((u - 0.85) / 0.15) * 0.84)
          : 1.0;
    const r = baseRadius * organicWave * tipTaper;

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const theta = v * TWO_PI;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);

      let nx = cos * N.x + sin * B.x;
      let ny = cos * N.y + sin * B.y;
      let nz = cos * N.z + sin * B.z;
      const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1.0;
      nx /= nLen;
      ny /= nLen;
      nz /= nLen;

      const squash = 0.76 + 0.24 * Math.sin(theta);
      const vx = P.x + r * squash * nx;
      const vy = P.y + r * squash * ny;
      const vz = P.z + r * squash * nz;

      positions.push(vx, vy, vz);
      normals.push(nx, ny, nz);
      uvs.push(u, v);
    }
  }

  for (let j = 1; j <= tubularSegments; j++) {
    for (let i = 1; i <= radialSegments; i++) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new BABYLON.BufferGeometry();
  geo.setAttribute('position', new BABYLON.BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute('normal', new BABYLON.BufferAttribute(new Float32Array(normals), 3));
  geo.setAttribute('uv', new BABYLON.BufferAttribute(new Float32Array(uvs), 2));
  geo.setIndex(indices);

  const mesh = new BABYLON.Mesh(geo, material);
  if (parentGroup) parentGroup.add(mesh);
  return mesh;
}

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

  parts.push({
    geo: new BABYLON.ConeGeometry(0.42, 0.85, 6),
    matrix: computeTransformMatrix(0, 1.72, 0, 0.12, 0, 0, 0.95, 1.0, 0.85, new BABYLON.Matrix4()),
    color: darkIceColor
  });
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.68, 0.82, 0.55, 6),
    matrix: computeTransformMatrix(0, 1.12, 0, 0, 0, 0, 1.15, 1.0, 0.65, new BABYLON.Matrix4()),
    color: cloakColor
  });
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.52, 0.85, 2.2, 7),
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1.0, 1.0, 0.62, new BABYLON.Matrix4()),
    color: darkIceColor
  });
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
  parts.push({
    geo: new BABYLON.CylinderGeometry(0.06, 0.06, 2.7, 5),
    matrix: computeTransformMatrix(0, 0.55, 0.28, 0.05, 0, 0, 1, 1, 1, new BABYLON.Matrix4()),
    color: darkIceColor
  });
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
  activeAshFlowShaderMats = [];
  activeAshPuddleShaderMats = [];
  activeAshWallStreamGlobs = [];
  activeAshFallingDrops = [];
  activeIceCreepingFogMeshes = [];
  activeVoidShaderMaterials = [];
  activeVoidMistBillboards = [];
}

/**
 * Создаёт стекающий язык лавы со ступени, капающую 3D-каплю и небольшую лужицу под ступенью
 * (портировано из addStepLavaFlowAndDrip в babylon_js_glsl.html).
 */
function addAshStepLavaFlowAndDrip(
  stepX,
  stepTopY,
  stepZ,
  stepAngle,
  width,
  height,
  depth,
  lowerSurfaceY,
  floorIndex,
  seedVal,
  stairLavaMat,
  charredStepMat
) {
  const sideSign = ((seedVal * 7.3) % 1) > 0.5 ? 1 : -1;
  const localOffsetX = sideSign * (width * (0.28 + ((seedVal * 3.1) % 1) * 0.16));
  const localOffsetZ = (((seedVal * 11.7) % 1) - 0.2) * (depth * 0.34);

  const cosA = Math.cos(-stepAngle);
  const sinA = Math.sin(-stepAngle);
  const toWorld = (lx, ly, lz) =>
    new BABYLON.Vector3(
      stepX + lx * cosA + lz * sinA,
      stepTopY - height * 0.5 + ly,
      stepZ - lx * sinA + lz * cosA
    );

  // 1. Небольшая лужица лавы на верхней грани самой ступени
  const topPuddlePos = toWorld(localOffsetX * 0.5, height * 0.46, localOffsetZ * 0.45);
  const topMiniPuddle = createOrganicPuddleMesh(
    0.58 + ((seedVal * 1.9) % 1) * 0.28,
    seedVal + 1.1,
    false
  );
  topMiniPuddle.position.copy(topPuddlePos);
  towerDecorGroup.add(topMiniPuddle);

  // 2. 3D-ручеёк лавы, перетекающий через край ступени и свисающий вниз
  const overhangLen = 1.05 + ((seedVal * 5.3) % 1) * 1.15;
  const tongueCurve = new CatmullRomCurve3([
    toWorld(localOffsetX * 0.42, height * 0.48, localOffsetZ * 0.38),
    toWorld(localOffsetX * 0.82, height * 0.40, localOffsetZ * 0.76),
    toWorld(localOffsetX * 1.02, height * 0.08, localOffsetZ * 0.94),
    toWorld(localOffsetX * 1.06, -height * 0.45 - overhangLen * 0.45, localOffsetZ * 0.98),
    toWorld(localOffsetX * 1.07, -height * 0.45 - overhangLen, localOffsetZ * 0.98)
  ]);

  createVariableTubeMesh(tongueCurve, 18, 0.22, seedVal, stairLavaMat, towerDecorGroup);

  // Обугленная каменная корка вокруг места перелива на ступени
  const rimMesh = new BABYLON.Mesh(new BABYLON.OctahedronGeometry(0.32, 0), charredStepMat);
  rimMesh.position.copy(toWorld(localOffsetX * 0.92, height * 0.34, localOffsetZ * 0.85));
  rimMesh.scale.set(1.4, 0.48, 1.4);
  towerDecorGroup.add(rimMesh);

  // 3. Точка отрыва капли и точка падения в небольшую лужицу внизу
  const dripTipPos = tongueCurve.getPointAt(1.0);
  const impactY = lowerSurfaceY + 0.03;

  // 4. Небольшая лавовая лужица под ступенью (с расходящимися кругами от капель и уроном при наступании)
  const smallPuddleRadius = 0.85 + ((seedVal * 19.3) % 1) * 0.55;
  const smallPuddle = createOrganicPuddleMesh(smallPuddleRadius, seedVal + 4.7, true);
  smallPuddle.position.set(dripTipPos.x, impactY, dripTipPos.z);
  towerDecorGroup.add(smallPuddle);

  lavaPuddles.push({
    x: dripTipPos.x,
    y: lowerSurfaceY,
    z: dripTipPos.z,
    radius: smallPuddleRadius,
    floor: floorIndex
  });

  // 5. Анимированная 3D-капля лавы
  const dropMesh = new BABYLON.Mesh(new BABYLON.SphereGeometry(0.17, 8, 6), stairLavaMat);
  dropMesh.position.copy(dripTipPos);
  towerDecorGroup.add(dropMesh);

  activeAshFallingDrops.push({
    mesh: dropMesh,
    startX: dripTipPos.x,
    startY: dripTipPos.y,
    startZ: dripTipPos.z,
    endY: impactY,
    phase: (seedVal * 29.1) % 1,
    speed: 0.52 + ((seedVal * 31.7) % 1) * 0.28
  });
}

/**
 * Создаёт билборды эфирного тумана Пустоты у растворившихся ступеней (из babylon_js_environment.html).
 */
function createVoidMistAtEdge(originPos, mistMat) {
  for (let i = 0; i < 4; i++) {
    const geo = new BABYLON.PlaneGeometry(3.4, 3.4, 3, 3);
    const vertexCount = geo.attributes.position.count;
    const phases = new Float32Array(vertexCount);
    for (let k = 0; k < vertexCount; k++) phases[k] = i * 1.3;
    geo.setAttribute('aPhase', new BABYLON.BufferAttribute(phases, 1));

    const bill = new BABYLON.Mesh(geo, mistMat);
    bill.position.set(
      originPos.x + Math.sin(i * 2.3) * 1.4,
      originPos.y + (i - 1.5) * 0.3,
      originPos.z + Math.cos(i * 2.9) * 1.4
    );
    bill.rotation.set(i * 0.7, i * 1.1, 0);
    towerDecorGroup.add(bill);
    activeVoidMistBillboards.push(bill);
  }
}

/**
 * Строит уникальное 3D-окружение башни, перенося макеты и GLSL-шейдеры из всех трёх референсов
 * в 12-этажную архитектуру игры.
 */
function buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor, floorValidCellsByFloor, dissolvedStairEntries) {
  clearTowerDecorGroup();
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  const structureParts = [];
  const accentParts = [];
  const tempMat = new BABYLON.Matrix4();

  const pillarCount = 8;
  const wallRadius = 30.18;

  const pillarPrimaryColor =
    towerId === 'ash'
      ? new BABYLON.Color(0x46484e)
      : towerId === 'ice'
        ? new BABYLON.Color(0x6cb8e6)
        : new BABYLON.Color(0x1f0f38);
  const pillarSecondaryColor =
    towerId === 'ash'
      ? new BABYLON.Color(0x18181b)
      : towerId === 'ice'
        ? new BABYLON.Color(0xa6e4ff)
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

  // 1. Периметральные контрфорсы, капители и стрельчатые арки по всем 12 этажам
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

      if (floor % 2 === 1) {
        for (const side of [-0.22, 0.22]) {
          const aAngle = ((p + 0.5 + side) / pillarCount) * TWO_PI;
          const ax = Math.cos(aAngle) * (wallRadius + 0.12);
          const az = Math.sin(aAngle) * (wallRadius + 0.12);
          const aRotY = -aAngle + Math.PI / 2;
          computeTransformMatrix(
            ax,
            floorY + 0.4,
            az,
            0,
            aRotY,
            side > 0 ? -0.28 : 0.28,
            0.95,
            1,
            0.75,
            tempMat
          );
          structureParts.push({
            geo: archSegmentGeo,
            matrix: tempMat.clone(),
            color: pillarSecondaryColor
          });
        }
      }
    }
  }

  // 2. Опорные конструкции винтовых лестниц
  const stairStepTrimGeo = new BABYLON.BoxGeometry(4.18, 0.34, 4.18);
  const stairPostGeo = new BABYLON.CylinderGeometry(0.25, 0.34, 1.4, 6);

  for (let floor = 0; floor < 11; floor++) {
    const stairs = stairPositionsByFloor[floor] || [];
    for (let s = 0; s < stairs.length; s++) {
      const [sx, sz, topY, isDissolved] = stairs[s];
      if (!isDissolved) {
        computeTransformMatrix(sx, topY - 0.14, sz, 0, 0, 0, 1, 1, 1, tempMat);
        structureParts.push({
          geo: stairStepTrimGeo,
          matrix: tempMat.clone(),
          color: pillarSecondaryColor
        });
      }

      const colH = Math.max(0.5, topY - floor * 14 - 1.1);
      if (colH > 0.8 && !isDissolved) {
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
          computeTransformMatrix(
            sx + sign * 1.65,
            topY + 0.65,
            sz + sign * 1.65,
            0,
            0,
            0,
            1,
            1,
            1,
            tempMat
          );
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

  // ==========================================================================
  // 3A. ПЕПЕЛЬНАЯ БАШНЯ (из референса babylon_js_glsl.html):
  // - 3D-потоки стекающей по стенам лавы (сплайны с переменным сечением, коркой и сгустками)
  // - Органические 3D-лужи лавы на полу этажей (наносят небольшой постоянный урон игроку)
  // - Лава, стекающая и капающая со ступеней в небольшие лужицы с расходящимися кругами
  // ==========================================================================
  if (towerId === 'ash') {
    const charredRockMat = new BABYLON.MeshStandardMaterial({
      map: TOWER_FLOOR_TEXTURES.ash.map,
      bumpMap: TOWER_FLOOR_TEXTURES.ash.bump,
      bumpScale: 0.45,
      color: 0x18181b,
      roughness: 0.95,
      metalness: 0.06
    });
    const sharedStairLavaMat = createFlowingLavaShaderMaterial(105.5);

    // 1. 3D-ручьи лавы, стекающие по стенам башни на разных ярусах
    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;
      const streamCountOnFloor = floor % 2 === 0 ? 2 : 1;

      for (let sIdx = 0; sIdx < streamCountOnFloor; sIdx++) {
        const seedVal = 11.3 + floor * 17.7 + sIdx * 31.1;
        const baseAngle =
          seededRandom(seed, 'ashWallStr', floor * 10 + sIdx) * TWO_PI;
        const topY = floorY + 11.5 + (sIdx % 2) * 3.0;
        const botY = floorY + 0.04;
        const startR = 30.15;
        const endR = 25.8 + (sIdx % 2) * 1.8;
        const baseRadius = 0.44 + (floor % 3) * 0.06;

        // Каменный разлом-жерло в стене, откуда вырывается поток лавы
        for (let c = 0; c < 4; c++) {
          const ca = baseAngle + (c - 1.5) * 0.032;
          computeTransformMatrix(
            Math.cos(ca) * (startR - 0.15),
            topY + (((seedVal * 3 + c) % 1) - 0.5) * 1.1,
            Math.sin(ca) * (startR - 0.15),
            0.2 * c,
            -ca,
            0.15 * c,
            0.95,
            1.35,
            0.85,
            tempMat
          );
          structureParts.push({
            geo: new BABYLON.OctahedronGeometry(0.78, 1),
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0x141417)
          });
        }

        // Главный извилистый 3D-ручей лавы (10 контрольных точек CatmullRomCurve3)
        const ptsCount = 10;
        const mainPoints = [];
        for (let p = 0; p <= ptsCount; p++) {
          const t = p / ptsCount;
          const curY = topY + (botY - topY) * t;
          const meanderAngle =
            baseAngle +
            Math.sin(t * Math.PI * 3.0 + seedVal) * 0.035 +
            Math.cos(t * 7.0 + seedVal) * 0.016;
          const easeOut = Math.pow(t, 2.3);
          const curR =
            startR + (endR - startR) * easeOut + Math.sin(t * 14.0 + seedVal) * 0.25;
          mainPoints.push(
            new BABYLON.Vector3(
              Math.cos(meanderAngle) * curR,
              curY,
              Math.sin(meanderAngle) * curR
            )
          );
        }

        const mainCurve = new CatmullRomCurve3(mainPoints);
        const streamMat = createFlowingLavaShaderMaterial(seedVal);
        createVariableTubeMesh(mainCurve, 32, baseRadius, seedVal, streamMat, towerDecorGroup);

        // Остывшие чёрные каменные берега/валики вдоль ручья на стене
        for (let cl = 1; cl < ptsCount; cl += 2) {
          const pt = mainPoints[cl];
          computeTransformMatrix(
            pt.x * 1.01,
            pt.y,
            pt.z * 1.01,
            cl * 0.4,
            cl * 0.7,
            0,
            1.2,
            1.6,
            1.2,
            tempMat
          );
          structureParts.push({
            geo: new BABYLON.OctahedronGeometry(baseRadius * 0.95, 0),
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0x141416)
          });
        }

        // Боковое ответвление-ручеёк на стене
        const splitT = 0.32;
        const branchPts = [];
        const sideSign = sIdx % 2 === 0 ? 1 : -1;
        for (let bp = 0; bp <= 6; bp++) {
          const bt = splitT + (bp / 6) * 0.52;
          if (bt > 0.96) break;
          const basePt = mainCurve.getPointAt(bt);
          const spread = (bp / 6) * 0.05 * sideSign;
          const ba = Math.atan2(basePt.z, basePt.x) + spread;
          const br = Math.sqrt(basePt.x * basePt.x + basePt.z * basePt.z);
          branchPts.push(new BABYLON.Vector3(Math.cos(ba) * br, basePt.y, Math.sin(ba) * br));
        }
        if (branchPts.length >= 3) {
          const branchCurve = new CatmullRomCurve3(branchPts);
          createVariableTubeMesh(
            branchCurve,
            18,
            baseRadius * 0.56,
            seedVal + 7.1,
            streamMat,
            towerDecorGroup
          );
        }

        // Анимированные 3D сгустки/капли лавы, скользящие вдоль ручья
        for (let g = 0; g < 3; g++) {
          const globMesh = new BABYLON.Mesh(
            new BABYLON.SphereGeometry(baseRadius * 0.72, 8, 6),
            streamMat
          );
          towerDecorGroup.add(globMesh);
          activeAshWallStreamGlobs.push({
            mesh: globMesh,
            curve: mainCurve,
            phase: g / 3 + ((seedVal + g) % 1) * 0.2,
            speed: 0.16 + ((seedVal * 2 + g) % 1) * 0.08
          });
        }

        // Если подножие струи попадает на пол этажа — создаём там кипящую лужу лавы
        const endPt = mainPoints[mainPoints.length - 1];
        const hasFloorUnderStream = blocks.some(
          (b) =>
            b[6] === floor &&
            b[5] === floorY &&
            endPt.x >= b[0] - 1.5 &&
            endPt.x <= b[1] + 1.5 &&
            endPt.z >= b[2] - 1.5 &&
            endPt.z <= b[3] + 1.5
        );
        if (hasFloorUnderStream) {
          const wallPuddleRadius = 1.85;
          const wallPuddle = createOrganicPuddleMesh(wallPuddleRadius, seedVal + 3.3, true);
          wallPuddle.position.set(endPt.x, floorY + 0.02, endPt.z);
          towerDecorGroup.add(wallPuddle);
          lavaPuddles.push({
            x: endPt.x,
            y: floorY,
            z: endPt.z,
            radius: wallPuddleRadius,
            floor
          });
        }
      }

      // 2. Лавовые лужи на полу этажа (с уроном игроку пока он стоит в них)
      const validFloorCells = floorValidCellsByFloor[floor] || [];
      const puddleCount = floor === 0 ? 3 : 2 + (floor % 2);
      let placedPuddles = 0;

      for (let attempt = 0; attempt < 18 && placedPuddles < puddleCount; attempt++) {
        if (!validFloorCells.length) break;
        const cellIdx = Math.floor(
          seededRandom(seed, 'ashPud' + floor, attempt * 7 + placedPuddles) *
            validFloorCells.length
        );
        const [cx, cz] = validFloorCells[cellIdx];

        // Не спавним лужу прямо в точке старта игрока (0,0) на 0 этаже
        if (floor === 0 && cx * cx + cz * cz < 32) continue;
        // Не перекрываем прыжковые площадки, сундуки, алтари и другие лужи
        if (
          jumpPads.some(
            (jp) => jp.y === floorY && Math.abs(jp.x - cx) < 3.5 && Math.abs(jp.z - cz) < 3.5
          )
        ) {
          continue;
        }
        if (
          chests.some(
            (ch) => ch.y === floorY && Math.abs(ch.x - cx) < 3.8 && Math.abs(ch.z - cz) < 3.8
          )
        ) {
          continue;
        }
        if (
          altars.some(
            (al) => al.y === floorY && Math.abs(al.x - cx) < 3.8 && Math.abs(al.z - cz) < 3.8
          )
        ) {
          continue;
        }
        if (
          lavaPuddles.some(
            (lp) => lp.floor === floor && hypot2D(lp.x - cx, lp.z - cz) < 5.5
          )
        ) {
          continue;
        }

        const puddleRadius =
          1.45 + seededRandom(seed, 'ashPudR' + floor, attempt) * 0.75;
        const pSeed = floor * 13.7 + placedPuddles * 4.3 + 1.1;
        const puddleNode = createOrganicPuddleMesh(
          puddleRadius,
          pSeed,
          placedPuddles % 2 === 1
        );
        puddleNode.position.set(cx, floorY + 0.02, cz);
        towerDecorGroup.add(puddleNode);

        // Обугленные чёрные камни шлака по краям лужи
        const slagCount = 6;
        for (let k = 0; k < slagCount; k++) {
          const sa = (k / slagCount) * TWO_PI + ((pSeed * 10 + k) % 1) * 0.4;
          const sr = puddleRadius * (0.9 + ((pSeed * 20 + k) % 1) * 0.2);
          computeTransformMatrix(
            cx + Math.cos(sa) * sr,
            floorY + 0.04,
            cz + Math.sin(sa) * sr,
            0,
            sa,
            0,
            1.35,
            0.36,
            1.15,
            tempMat
          );
          structureParts.push({
            geo: new BABYLON.OctahedronGeometry(0.28, 0),
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0x121215)
          });
        }

        lavaPuddles.push({
          x: cx,
          y: floorY,
          z: cz,
          radius: puddleRadius,
          floor
        });
        placedPuddles++;
      }

      // 3. Стекающая и капающая со ступеней лава + небольшие лужицы под ними
      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        // На каждом лестничном марше делаем 2 ступени со стекающей и капающей лавой
        if (s % 3 !== 1) continue;
        const [sx, sz, topY] = stairs[s];
        const stepAngle = Math.atan2(sz, sx);
        const lowerY = s > 0 ? stairs[s - 1][2] : floorY;
        addAshStepLavaFlowAndDrip(
          sx,
          topY,
          sz,
          stepAngle,
          3.92,
          1.15,
          3.92,
          lowerY,
          floor,
          200 + floor * 37.3 + s * 7.3,
          sharedStairLavaMat,
          charredRockMat
        );
      }
    }
  }

  // ==========================================================================
  // 3B. ЛЕДЯНАЯ БАШНЯ (из референса babylon_js.html):
  // - Вмёрзшие в лёд силуэты странников и воинов за прозрачными линзами льда
  // - Сплошной глубокий лёд пола с яркими трещинами (1.95) и стелющимся паром (creepingFog)
  // - Морозная корка и свисающие со ступеней и обрывов каскады сосулек
  // ==========================================================================
  else if (towerId === 'ice') {
    const icicleGeo = new BABYLON.ConeGeometry(0.26, 2.3, 5);
    const crystalSpikeGeo = new BABYLON.CylinderGeometry(0.05, 0.42, 2.8, 6);
    const frostCrustGeo = jitterGeometry(new BABYLON.BoxGeometry(4.06, 0.18, 4.06), 0.04);
    const silhouetteParts = [];

    // Материалы для альфа-силуэтов погибших странников («тех, кто не дошёл»), как в babylon_js.html
    const silPlaneMaterials = (TEXTURES.frozenSilhouettes || []).map(
      (tex) =>
        new BABYLON.MeshBasicMaterial({
          map: tex,
          color: 0xc8eeff,
          transparent: true,
          opacity: 0.86,
          side: BABYLON.DoubleSide,
          depthWrite: false
        })
    );
    const iceTombLensMat = new BABYLON.MeshStandardMaterial({
      color: 0xb8e6ff,
      emissive: 0x164468,
      emissiveIntensity: 0.45,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.56
    });

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      // 1. Вмёрзшие в лёд силуэты в толще стен (3D фигуры + размытые силуэты за ледяной линзой)
      for (let s = 0; s < 4; s++) {
        const angle = ((s + 0.5) / 4) * TWO_PI + (floor % 2) * 0.38;
        const silRadius = 30.22;
        const sx = Math.cos(angle) * silRadius;
        const sz = Math.sin(angle) * silRadius;
        const rotY = -angle - Math.PI / 2;
        const tiltZ = (((floor + s) % 3) - 1) * 0.08;
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

        // Дополнительный силуэт-декаль из babylon_js.html с гранёной ледяной линзой перед ним
        if (silPlaneMaterials.length > 0 && s % 2 === 0) {
          const pAngle = angle + 0.36;
          const py = floorY + 6.4;
          const silPlane = new BABYLON.Mesh(
            new BABYLON.PlaneGeometry(3.8, 7.6),
            silPlaneMaterials[(floor + s) % silPlaneMaterials.length]
          );
          silPlane.position.set(Math.cos(pAngle) * 30.35, py, Math.sin(pAngle) * 30.35);
          silPlane.rotation.y = -pAngle - Math.PI / 2;
          towerDecorGroup.add(silPlane);

          const tombLens = new BABYLON.Mesh(
            new BABYLON.CylinderGeometry(1.9, 2.2, 8.0, 7),
            iceTombLensMat
          );
          tombLens.position.set(Math.cos(pAngle) * 29.85, py, Math.sin(pAngle) * 29.85);
          tombLens.rotation.y = -pAngle;
          towerDecorGroup.add(tombLens);
        }

        // Кристаллические ледяные рёбра по бокам вмёрзшего силуэта
        for (const ribOffset of [-0.12, 0.12]) {
          const rAng = angle + ribOffset;
          computeTransformMatrix(
            Math.cos(rAng) * 30.05,
            floorY + 6.8,
            Math.sin(rAng) * 30.05,
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

      // 2. Кристаллические наросты и друзы льда по периметру стен
      for (let p = 0; p < pillarCount; p++) {
        if ((floor + p) % 2 !== 0) continue;
        const angle = (p / pillarCount) * TWO_PI + 0.18;
        const cx = Math.cos(angle) * 29.65;
        const cz = Math.sin(angle) * 29.65;
        computeTransformMatrix(cx, floorY + 1.4, cz, -0.25, -angle, 0.15, 1.1, 1.25, 1.1, tempMat);
        accentParts.push({
          geo: crystalSpikeGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xb8eeff)
        });
      }

      // 3. Густые каскады сосулек, свисающих с обрывов этажа
      const edgeCells = floorEdgeCellsByFloor[floor] || [];
      for (let e = 0; e < edgeCells.length; e++) {
        const [ex, ez] = edgeCells[e];
        const clusterCount = e % 2 === 0 ? 2 : 1;
        for (let c = 0; c < clusterCount; c++) {
          const len = 1.3 + ((e + c) % 4) * 0.65;
          computeTransformMatrix(
            ex + (c - 0.5) * 0.85,
            floorY - 1.0 - len * 0.48,
            ez + (((e + c) % 3) - 1) * 0.65,
            Math.PI,
            (e + c) * 0.5,
            ((e + c) % 2 === 0 ? 1 : -1) * 0.06,
            0.82,
            len / 2.3,
            0.82,
            tempMat
          );
          accentParts.push({
            geo: icicleGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xcff2ff)
          });
        }
      }

      // 4. Морозная корка сверху ступеней и кластеры свисающих со ступеней сосулек (из babylon_js.html)
      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 0; s < stairs.length; s++) {
        const [sx, sz, topY] = stairs[s];
        // Морозная корка на верхней грани ступени
        computeTransformMatrix(sx, topY + 0.04, sz, 0, s * 0.15, 0, 1, 1, 1, tempMat);
        accentParts.push({
          geo: frostCrustGeo,
          matrix: tempMat.clone(),
          color: new BABYLON.Color(0xe6f7ff)
        });

        // 6 заострённых сосулек разной длины, свисающих по краям каждой ступени
        for (let k = 0; k < 6; k++) {
          const icicleLen = 1.1 + ((s * 3 + k) % 4) * 0.62;
          const angleAroundStep = (k / 6) * TWO_PI + s * 0.35;
          const ox = Math.cos(angleAroundStep) * 1.72;
          const oz = Math.sin(angleAroundStep) * 1.72;
          computeTransformMatrix(
            sx + ox,
            topY - 1.15 - icicleLen * 0.45,
            sz + oz,
            Math.PI + Math.sin(k) * 0.08,
            angleAroundStep,
            Math.cos(k) * 0.08,
            0.68,
            icicleLen / 2.3,
            0.68,
            tempMat
          );
          accentParts.push({
            geo: icicleGeo,
            matrix: tempMat.clone(),
            color: new BABYLON.Color(0xdcf6ff)
          });
        }
      }

      // 5. Стелющийся морозный пар над трещинами ледяного пола (GLSL шейдер creepingFog из babylon_js.html)
      const validCells = floorValidCellsByFloor[floor] || [];
      if (validCells.length > 0) {
        for (let m = 0; m < 2; m++) {
          const [mx, mz] = validCells[(m * 11 + floor * 5) % validCells.length];
          const fogMat = new BABYLON.ShaderMaterial(
            `creepingFogMat_${floor}_${m}`,
            scene,
            { vertex: 'creepingFog', fragment: 'creepingFog' },
            {
              attributes: ['position', 'uv'],
              uniforms: ['worldViewProjection', 'uTime', 'uSeed'],
              needAlphaBlending: true
            }
          );
          fogMat.setFloat('uTime', 0);
          fogMat.setFloat('uSeed', floor * 2.1 + m * 1.37);
          fogMat.disableDepthWrite = true;
          fogMat.backFaceCulling = false;

          const fogQuadGeo = new BABYLON.PlaneGeometry(8.5, 8.5);
          fogQuadGeo.rotateX(-Math.PI / 2);
          const fogQuad = new BABYLON.Mesh(fogQuadGeo, fogMat);
          fogQuad.position.set(mx, floorY + 0.1, mz);
          fogQuad.rotation.y = m * 1.2 + floor * 0.5;
          fogQuad.userData.disposeMaterial = true;
          towerDecorGroup.add(fogQuad);

          activeIceCreepingFogMeshes.push({
            mesh: fogQuad,
            material: fogMat,
            baseY: floorY + 0.1,
            phase: floor * 0.9 + m * 1.4
          });
        }
      }
    }

    if (silhouetteParts.length) {
      const mergedSilGeo = mergeGeometryParts(silhouetteParts);
      const silMat = new BABYLON.MeshStandardMaterial({
        color: 0x0a1c36,
        emissive: 0x1c5488,
        emissiveIntensity: 0.72,
        roughness: 0.28,
        metalness: 0.22
      });
      const silMesh = new BABYLON.Mesh(mergedSilGeo, silMat);
      silMesh.userData.disposeMaterial = true;
      towerDecorGroup.add(silMesh);
    }
  }

  // ==========================================================================
  // 3C. БАШНЯ ПУСТОТЫ (из референса babylon_js_environment.html):
  // - Чёрный обсидиановый пол со сверкающими вкраплениями звёздной пыли (obsidianFloor GLSL)
  // - Растворившиеся ступени (stairDissolve GLSL, порог 0.39 -> 0.65 в бурю), по которым можно идти
  // - Полупрозрачные ленты абсолютной тьмы (voidMist GLSL), сложенное небо (skyRift GLSL)
  // - Летающие осколки (Аномалия гравитации = 1.4) и биолюминесцентный планктон (plankton GLSL)
  // ==========================================================================
  else if (towerId === 'void') {
    const runeTabletGeo = new BABYLON.BoxGeometry(0.95, 5.4, 0.34);

    // 1. Шейдер растворяющихся ступеней и осколков (stairDissolve из babylon_js_environment.html)
    const dissolvingStairMat = new BABYLON.ShaderMaterial(
      'dissolvingStairMat',
      scene,
      { vertex: 'stairDissolve', fragment: 'stairDissolve' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'world',
          'worldViewProjection',
          'uTime',
          'uDissolveLevel',
          'uEdgeIntensity',
          'uBrokenEnd',
          'uCameraPos'
        ]
      }
    );
    dissolvingStairMat.setFloat('uTime', 0);
    dissolvingStairMat.setFloat(
      'uDissolveLevel',
      activeTowerVfxState.dissolveThreshold || 0.39
    );
    dissolvingStairMat.setFloat('uEdgeIntensity', 1.45);
    dissolvingStairMat.setFloat('uBrokenEnd', 1.0);
    dissolvingStairMat.setVector3('uCameraPos', camera.position);
    dissolvingStairMat.backFaceCulling = false;
    dissolvingStairMat.metadata = { isDissolvingStair: true };
    activeVoidShaderMaterials.push(dissolvingStairMat);

    // Шейдер клубов эфирного тумана у растворившихся ступеней
    const edgeMistMat = new BABYLON.ShaderMaterial(
      'voidMistEdgeMat',
      scene,
      { vertex: 'voidMist', fragment: 'voidMist' },
      {
        attributes: ['position', 'uv', 'aPhase'],
        uniforms: ['worldViewProjection', 'uTime', 'uIsDarkRibbon'],
        needAlphaBlending: true
      }
    );
    edgeMistMat.setFloat('uTime', 0);
    edgeMistMat.setFloat('uIsDarkRibbon', 0.0);
    edgeMistMat.backFaceCulling = false;
    edgeMistMat.disableDepthWrite = true;
    edgeMistMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
    activeVoidShaderMaterials.push(edgeMistMat);

    // Размещаем 3D-меши растворившихся ступеней (коллайдеры в blocks уже созданы, поэтому на них можно встать!)
    if (dissolvedStairEntries && dissolvedStairEntries.length) {
      const dissolvedStepGeo = new BABYLON.BoxGeometry(3.92, 1.12, 3.92);
      for (let d = 0; d < dissolvedStairEntries.length; d++) {
        const entry = dissolvedStairEntries[d];
        const stepMesh = new BABYLON.Mesh(dissolvedStepGeo, dissolvingStairMat);
        stepMesh.position.set(entry.x, entry.centerY, entry.z);
        towerDecorGroup.add(stepMesh);

        if (d % 2 === 0) {
          createVoidMistAtEdge(
            new BABYLON.Vector3(entry.x, entry.topY + 0.35, entry.z),
            edgeMistMat
          );
        }
      }
    }

    // 2. Шейдер обсидианового пола со сверкающей R/G/B «звёздной пылью» (obsidianFloor из babylon_js_environment.html)
    const obsidianFloorShaderMat = new BABYLON.ShaderMaterial(
      'obsidianFloorMat',
      scene,
      { vertex: 'obsidianFloor', fragment: 'obsidianFloor' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['world', 'worldViewProjection', 'uTime', 'uSurge', 'uCameraPos'],
        samplers: ['uStardustMap']
      }
    );
    obsidianFloorShaderMat.setTexture('uStardustMap', TEXTURES.voidStardustRGB);
    obsidianFloorShaderMat.setFloat('uTime', 0);
    obsidianFloorShaderMat.setFloat('uSurge', 0);
    obsidianFloorShaderMat.setVector3('uCameraPos', camera.position);
    obsidianFloorShaderMat.backFaceCulling = false;
    activeVoidShaderMaterials.push(obsidianFloorShaderMat);

    // 3. Шейдер полупрозрачных лент абсолютной тьмы, тянущихся из трещин стен (createDarkVoidRibbons)
    const darkRibbonMat = new BABYLON.ShaderMaterial(
      'darkRibbonMat',
      scene,
      { vertex: 'voidMist', fragment: 'voidMist' },
      {
        attributes: ['position', 'uv', 'aPhase'],
        uniforms: ['worldViewProjection', 'uTime', 'uIsDarkRibbon'],
        needAlphaBlending: true
      }
    );
    darkRibbonMat.setFloat('uTime', 0);
    darkRibbonMat.setFloat('uIsDarkRibbon', 1.0);
    darkRibbonMat.backFaceCulling = false;
    darkRibbonMat.disableDepthWrite = true;
    activeVoidShaderMaterials.push(darkRibbonMat);

    for (let i = 0; i < 18; i++) {
      const floor = i % 12;
      const baseAngle = (i / 18) * TWO_PI + 0.2;
      const startY = floor * 14 + 1.5;
      const rawPoints = [];
      for (let p = 0; p <= 7; p++) {
        const t = p / 7;
        const r = 30.2 - t * 8.5;
        const ang = baseAngle + Math.sin(t * Math.PI * 1.5 + i) * 0.18;
        const y = startY + t * 9.5 + Math.cos(t * Math.PI * 2.0) * 1.2;
        rawPoints.push(new BABYLON.Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r));
      }
      const curve = new CatmullRomCurve3(rawPoints);
      const ribbonMesh = createVariableTubeMesh(
        curve,
        20,
        0.46 - (i % 3) * 0.08,
        i * 1.7,
        darkRibbonMat,
        towerDecorGroup
      );
      const vCount = ribbonMesh.geometry.attributes.position.count;
      const phases = new Float32Array(vCount);
      for (let k = 0; k < vCount; k++) phases[k] = i * 1.7;
      ribbonMesh.geometry.setAttribute('aPhase', new BABYLON.BufferAttribute(phases, 1));
    }

    // 4. Обсидиановые диски со звёздной пылью на этажах и рунические скрижали на стенах
    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      // Покрытие центральных и островных зон шейдером обсидианового пола со звёздной пылью
      const validCells = floorValidCellsByFloor[floor] || [];
      for (let c = 0; c < validCells.length; c += 3) {
        const [cx, cz] = validCells[c];
        const tileGeo = new BABYLON.PlaneGeometry(3.88, 3.88);
        tileGeo.rotateX(-Math.PI / 2);
        const tileMesh = new BABYLON.Mesh(tileGeo, obsidianFloorShaderMat);
        tileMesh.position.set(cx, floorY + 0.015, cz);
        towerDecorGroup.add(tileMesh);
      }

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

    // 5. Купол «Сложенное как бумага небо» наверху башни (skyRift из babylon_js_environment.html)
    const skyRiftMat = new BABYLON.ShaderMaterial(
      'skyRiftMat',
      scene,
      { vertex: 'skyRift', fragment: 'skyRift' },
      {
        attributes: ['position', 'uv'],
        uniforms: ['world', 'worldViewProjection', 'uTime', 'uSurge']
      }
    );
    skyRiftMat.setFloat('uTime', 0);
    skyRiftMat.setFloat('uSurge', 0);
    skyRiftMat.backFaceCulling = false;
    activeVoidShaderMaterials.push(skyRiftMat);

    const domeGeo = new BABYLON.CylinderGeometry(0.1, 34, 18, 9, 1, true);
    domeGeo.rotateX(Math.PI);
    const domeMesh = new BABYLON.Mesh(domeGeo, skyRiftMat);
    domeMesh.position.set(0, 12 * 14 + 14, 0);
    towerDecorGroup.add(domeMesh);

    // 6. Парящие в невесомости осколки ступеней и рунные монолиты (левитируют с Аномалией гравитации = 1.4)
    const floatingCount = 96;
    const floatingGeo = jitterGeometry(new BABYLON.BoxGeometry(1.15, 0.65, 1.15), 0.14);
    activeVoidFloatingMesh = new BABYLON.InstancedMesh(
      floatingGeo,
      dissolvingStairMat,
      floatingCount
    );
    activeVoidFloatingData = [];

    const dummy = new BABYLON.Object3D();
    for (let i = 0; i < floatingCount; i++) {
      const floor = i % 12;
      const angle = seededRandom(seed, 'vfltA', i) * TWO_PI;
      const radius =
        i % 3 === 0
          ? 6 + seededRandom(seed, 'vfltR', i) * 14
          : 25.8 + seededRandom(seed, 'vfltR', i) * 3.2;
      const baseY =
        i % 3 === 0
          ? floor * 14 - 3.8 - seededRandom(seed, 'vfltY', i) * 4.2
          : floor * 14 + 2.2 + seededRandom(seed, 'vfltY', i) * 9.5;
      const scale = 0.5 + seededRandom(seed, 'vfltS', i) * 1.25;
      const item = {
        x: Math.cos(angle) * radius,
        baseY,
        z: Math.sin(angle) * radius,
        rx: seededRandom(seed, 'vfltRX', i) * TWO_PI,
        ry: seededRandom(seed, 'vfltRY', i) * TWO_PI,
        rz: seededRandom(seed, 'vfltRZ', i) * TWO_PI,
        scale,
        phase: i * 0.43,
        speed: 0.55 + (i % 5) * 0.18
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

    // 7. Биолюминесцентный «планктон» в воздухе по всей высоте башни (plankton GLSL из babylon_js_environment.html)
    const planktonCount = 1600;
    const pPositions = new Float32Array(planktonCount * 3);
    const pColors = new Float32Array(planktonCount * 3);
    const pScales = new Float32Array(planktonCount);
    const pPhases = new Float32Array(planktonCount);
    const palette = [
      new BABYLON.Color(0x8a2be2),
      new BABYLON.Color(0xa855f7),
      new BABYLON.Color(0x60a5fa),
      new BABYLON.Color(0xe879f9)
    ];

    for (let i = 0; i < planktonCount; i++) {
      const r = 2.5 + Math.pow(seededRandom(seed, 'plkR', i), 0.7) * 26.8;
      const ang = seededRandom(seed, 'plkA', i) * TWO_PI;
      const h = -6 + seededRandom(seed, 'plkH', i) * 176;
      pPositions[i * 3] = Math.cos(ang) * r;
      pPositions[i * 3 + 1] = h;
      pPositions[i * 3 + 2] = Math.sin(ang) * r;

      const col = palette[i % palette.length];
      pColors[i * 3] = col.r;
      pColors[i * 3 + 1] = col.g;
      pColors[i * 3 + 2] = col.b;
      pScales[i] = 0.7 + seededRandom(seed, 'plkS', i) * 2.0;
      pPhases[i] = seededRandom(seed, 'plkP', i) * TWO_PI;
    }

    const planktonGeo = new BABYLON.BufferGeometry();
    planktonGeo.setAttribute('position', new BABYLON.BufferAttribute(pPositions, 3));
    planktonGeo.setAttribute('aColor', new BABYLON.BufferAttribute(pColors, 3));
    planktonGeo.setAttribute('aScale', new BABYLON.BufferAttribute(pScales, 1));
    planktonGeo.setAttribute('aPhase', new BABYLON.BufferAttribute(pPhases, 1));

    const planktonMat = new BABYLON.ShaderMaterial(
      'planktonMat',
      scene,
      { vertex: 'plankton', fragment: 'plankton' },
      {
        attributes: ['position', 'aColor', 'aScale', 'aPhase'],
        uniforms: ['worldView', 'projection', 'uTime', 'uGravitySpeed'],
        needAlphaBlending: true
      }
    );
    planktonMat.pointsCloud = true;
    planktonMat.disableDepthWrite = true;
    planktonMat.alphaMode = BABYLON.Engine.ALPHA_ADD;
    planktonMat.setFloat('uTime', 0);
    planktonMat.setFloat('uGravitySpeed', activeTowerVfxState.gravityAnomaly || 1.4);
    activeVoidShaderMaterials.push(planktonMat);

    const planktonPoints = new BABYLON.Points(planktonGeo, planktonMat);
    towerDecorGroup.add(planktonPoints);
  }

  // Сборка объединённой структурной геометрии (колонны, капители, арки, шлаковые камни)
  if (structureParts.length) {
    const mergedStructGeo = mergeGeometryParts(structureParts);
    const structMat = new BABYLON.MeshStandardMaterial({
      map: TOWER_WALL_TEXTURES[towerId].map,
      bumpMap: TOWER_WALL_TEXTURES[towerId].bump,
      bumpScale: 0.35,
      color: 0xffffff,
      vertexColors: true,
      roughness: towerId === 'ice' ? 0.16 : 0.86,
      metalness: towerId === 'ice' ? 0.32 : 0.16
    });
    const structMesh = new BABYLON.Mesh(mergedStructGeo, structMat);
    structMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(structMesh);
  }

  // Сборка акцентной геометрии (сосульки, морозная корка, рунические скрижали, кристаллы)
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
    } else if (towerId === 'ice') {
      accentMat = new BABYLON.MeshStandardMaterial({
        color: 0xd8f4ff,
        vertexColors: true,
        emissive: 0x3b98d8,
        emissiveIntensity: 0.62,
        roughness: 0.06,
        metalness: 0.32,
        transparent: true,
        opacity: 0.88
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
    }
    const accentMesh = new BABYLON.Mesh(mergedAccentGeo, accentMat);
    accentMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(accentMesh);
  }
}

/**
 * По-кадровое обновление всех шейдеров башен, 3D-потоков и капель лавы,
 * морозного пара, растворения ступеней и левитации осколков.
 */
function updateTowerDecorAnimations(time, dt, towerId) {
  // 1. Прыжковые площадки
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

  // 2. Алтари пакта
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

  // 3. Печати босса
  bossGateBeamMat.opacity = 0.78 + Math.sin(time * 6.5) * 0.18;

  // 4. Анимация Пепельной башни: GLSL ручьи лавы, сгустки на стенах, капли со ступеней и лужи
  if (towerId === 'ash') {
    const lavaSpd = activeTowerVfxState.lavaSpeed || 2.25;
    const speedScale = lavaSpd / 2.1;

    for (let i = 0; i < activeAshFlowShaderMats.length; i++) {
      const m = activeAshFlowShaderMats[i];
      m.setFloat('uTime', time);
      m.setFloat('uSpeed', lavaSpd);
      m.setVector3('uCameraPos', camera.position);
    }
    for (let i = 0; i < activeAshPuddleShaderMats.length; i++) {
      const m = activeAshPuddleShaderMats[i];
      m.setFloat('uTime', time);
      m.setFloat('uSpeed', lavaSpd);
      m.setVector3('uCameraPos', camera.position);
    }

    // Движение вязких 3D-сгустков лавы вдоль настенных потоков
    for (let i = 0; i < activeAshWallStreamGlobs.length; i++) {
      const g = activeAshWallStreamGlobs[i];
      const t = (time * g.speed * speedScale + g.phase) % 1.0;
      const pt = g.curve.getPointAt(t);
      g.mesh.position.copy(pt);
      const s = Math.max(0.02, Math.sin(t * Math.PI));
      g.mesh.scale.set(0.85 * s, 1.65 * s, 0.85 * s);
    }

    // Падение 3D-капель лавы со ступеней в небольшие лужицы
    for (let i = 0; i < activeAshFallingDrops.length; i++) {
      const d = activeAshFallingDrops[i];
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
  }

  // 5. Анимация Ледяной башни: эмиссия трещин льда (1.95) и стелющийся морозный туман
  else if (towerId === 'ice') {
    if (TOWER_SLAB_MATERIALS.ice) {
      TOWER_SLAB_MATERIALS.ice.emissiveIntensity =
        activeTowerVfxState.iceCracksEmissive || 1.95;
    }
    const blzSpd = activeTowerVfxState.blizzardSpeed || 0.5;
    const iceTime = time * (blzSpd / 0.5);
    for (let i = 0; i < activeIceCreepingFogMeshes.length; i++) {
      const item = activeIceCreepingFogMeshes[i];
      item.material.setFloat('uTime', iceTime);
      item.mesh.position.y = item.baseY + Math.sin(iceTime * 0.8 + item.phase) * 0.06;
    }
  }

  // 6. Анимация Башни Пустоты: растворение ступеней (0.39 -> 0.65 в бурю), обсидиановый пол, левитация осколков (1.4)
  else if (towerId === 'void') {
    const gravSpeed = activeTowerVfxState.gravityAnomaly || 1.4;
    const dissolveLvl = activeTowerVfxState.dissolveThreshold || 0.39;
    const stormInt = state && state.towerStorm ? state.towerStorm.intensity || 0 : 0;

    for (let i = 0; i < activeVoidShaderMaterials.length; i++) {
      const mat = activeVoidShaderMaterials[i];
      mat.setFloat('uTime', time);
      mat.setFloat('uSurge', stormInt * 1.4);
      mat.setFloat('uGravitySpeed', gravSpeed);
      mat.setVector3('uCameraPos', camera.position);
      if (mat.metadata && mat.metadata.isDissolvingStair) {
        mat.setFloat('uDissolveLevel', dissolveLvl);
      }
    }

    for (let i = 0; i < activeVoidMistBillboards.length; i++) {
      activeVoidMistBillboards[i].rotation.z = time * 0.22 + i;
    }

    if (activeVoidFloatingMesh && activeVoidFloatingData.length) {
      const dummy = _pickupDummyObj;
      const gravTime = time * gravSpeed;
      for (let i = 0; i < activeVoidFloatingData.length; i++) {
        const item = activeVoidFloatingData[i];
        dummy.position.set(
          item.x + Math.cos(gravTime * 0.45 + item.phase) * 0.18,
          item.baseY + Math.sin(gravTime * item.speed + item.phase) * 0.65,
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
  lavaPuddles.length = 0;
  blockGrid = new Array(GRID_FLOORS * GRID_DIM * GRID_DIM).fill(null);

  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  let prevStairPositions = [];
  const stairPositionsByFloor = [];
  const floorEdgeCellsByFloor = [];
  const floorValidCellsByFloor = [];
  const dissolvedStairBlockIndices = new Set();
  const dissolvedStairEntries = [];

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
    const validFloorCells = [];
    for (const cellKey of activeCells) {
      const ci = (cellKey / 15) | 0;
      const cj = cellKey % 15;
      const x = (ci - 7) * 4;
      const z = (cj - 7) * 4;
      blocks.push([x - 2, x + 2, z - 2, z + 2, floorY - 1, floorY, floor]);
      validFloorCells.push([x, z]);

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
    floorValidCellsByFloor[floor] = validFloorCells;

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
          const stepTopY = floorY + 2 * stepIdx;

          blocks.push([x - 2, x + 2, z - 2, z + 2, floorY, stepTopY, floor, routeTag]);
          const stairBlockIdx = blocks.length - 1;
          prevStairPositions.push([x, z]);

          // В Башне Пустоты часть ступеней (например, 2-я, 4-я и 5-я) делаются визуально «растворившимися»
          // через 3D Simplex Noise шейдер stairDissolve, но в физическом массиве blocks остаются твёрдыми!
          const isDissolvedVoidStep =
            towerId === 'void' && !isForkFloor && (stepIdx === 2 || stepIdx === 4 || stepIdx === 5);
          if (isDissolvedVoidStep) {
            dissolvedStairBlockIndices.add(stairBlockIdx);
            dissolvedStairEntries.push({
              x,
              z,
              topY: stepTopY,
              centerY: stepTopY - 1.15 * 0.5,
              floor
            });
          }

          floorStairs.push([x, z, stepTopY, isDissolvedVoidStep]);

          if (floor % 4 === 3 && floor < 11) {
            blocks.push([x - 2.05, x + 2.05, z - 2.05, z + 2.05, floorY, floorY + 16, floor, 3]);
            (bossGateBlockIndices[floor] = bossGateBlockIndices[floor] || []).push(blocks.length - 1);
          }

          if (isForkFloor && (stepIdx === 1 || stepIdx === 6)) {
            const markerSprite = new BABYLON.Sprite(FORK_ROUTE_MATERIALS[routeTag]);
            markerSprite.scale.setScalar(stepIdx === 1 ? 5 : 6);
            markerSprite.position.set(x, stepTopY + 3, z);
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
    // Физический барьер Печати босса (b[7] === 3) или визуально растворившаяся ступень Пустоты
    // скрываются в непрозрачном InstancedMesh, но остаются в массиве blocks для коллизий!
    if (b[7] === 3 || dissolvedStairBlockIndices.has(idx)) {
      dummyObj.position.set(0, -999, 0);
      dummyObj.scale.set(0, 0, 0);
      dummyObj.updateMatrix();
      towerInstancedMesh.setMatrixAt(idx, dummyObj.matrix);
      return;
    }

    const isStairBlock = rawH > 1.5 && b[7] !== 3;
    const visualH = isStairBlock ? 1.15 : rawH;
    const cx = (b[0] + b[1]) / 2;
    const cz = (b[2] + b[3]) / 2;
    const visualCenterY = isStairBlock ? b[5] - visualH * 0.5 : (b[4] + b[5]) / 2;
    dummyObj.position.set(cx, visualCenterY, cz);
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

    blockColor.setHex(baseColorHex);

    // В Пепельной башне некоторые участки пола и ступеней обуглены до черноты (мировой 3D-шум копоти из babylon_js_glsl.html)
    if (towerId === 'ash' && !b[7] && typeof stoneNoise3D === 'function') {
      const wChar1 = stoneNoise3D(cx * 0.085 + 2.3, visualCenterY * 0.085 + 7.1, cz * 0.085 + 4.9);
      const wChar2 = stoneNoise3D(cx * 0.22 + 11.7, visualCenterY * 0.22 + 3.3, cz * 0.22 + 8.2);
      const rawMask = wChar1 * 0.68 + wChar2 * 0.32;
      const charT = Math.max(0, Math.min(1, (rawMask - 0.46) / 0.24));
      const charMask = charT * charT * (3 - 2 * charT);
      const darken = 1.0 - charMask * 0.84;
      blockColor.r = blockColor.r * darken + 0.04 * charMask;
      blockColor.g = blockColor.g * darken + 0.04 * charMask;
      blockColor.b = blockColor.b * darken + 0.05 * charMask;
    } else {
      blockColor.offsetHSL(0, 0, ((b[0] / 4 + b[2] / 4) & 1) * 0.05);
    }

    towerInstancedMesh.setColorAt(idx, blockColor);
  });

  towerInstancedMesh.instanceMatrix.needsUpdate = true;
  if (towerInstancedMesh.instanceColor) {
    towerInstancedMesh.instanceColor.needsUpdate = true;
  }
  scene.add(towerInstancedMesh);

  buildTowerArchitecture(
    seed,
    stairPositionsByFloor,
    floorEdgeCellsByFloor,
    floorValidCellsByFloor,
    dissolvedStairEntries
  );
}
