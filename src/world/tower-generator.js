/* ==========================================================================
   Генерация башни и пространственная сетка блоков:
   12 этажей, планировки (Арена, Кольцо, Мосты, Острова), лестницы, развилки,
   печати боссов, прыжковые площадки, сундуки, алтари пактов и художественное
   3D-оформление окружения для Пепельной, Ледяной и Пустотной башен
   ========================================================================== */

/* ---------- 1. Скульптурные геометрии интерактивных объектов ---------- */

const jumpPadGroup = new THREE.Group();
scene.add(jumpPadGroup);

const jumpPadGeo = (function buildJumpPadGeometry() {
  const parts = [];
  const baseColor = new THREE.Color(0x2a3844);
  const ringColor = new THREE.Color(0x45ffdc);
  const coreColor = new THREE.Color(0xb8fff4);

  // Каменное восьмигранное основание
  parts.push({
    geo: new THREE.CylinderGeometry(1.32, 1.48, 0.22, 8),
    matrix: computeTransformMatrix(0, -0.04, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: baseColor
  });
  // Светящееся рунное кольцо
  parts.push({
    geo: new THREE.CylinderGeometry(1.08, 1.15, 0.28, 12),
    matrix: computeTransformMatrix(0, 0.04, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: ringColor
  });
  // Центральный кристаллический излучатель
  parts.push({
    geo: new THREE.CylinderGeometry(0.65, 0.82, 0.34, 8),
    matrix: computeTransformMatrix(0, 0.08, 0, 0, Math.PI / 8, 0, 1, 1, 1, new THREE.Matrix4()),
    color: coreColor
  });
  return mergeGeometryParts(parts);
})();

const jumpPadMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x1d9f8a,
  emissiveIntensity: 1.25,
  roughness: 0.3,
  metalness: 0.45
});

const chestGroup = new THREE.Group();
scene.add(chestGroup);

const chestGeo = (function buildChestGeometry() {
  const parts = [];
  const woodColor = new THREE.Color(0x5a2d18);
  const goldColor = new THREE.Color(0xffcf40);
  const lockColor = new THREE.Color(0xfff0a0);

  // Корпус сундука
  parts.push({
    geo: new THREE.BoxGeometry(1.26, 0.56, 0.86),
    matrix: computeTransformMatrix(0, -0.16, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: woodColor
  });
  // Выпуклая крышка сундука
  parts.push({
    geo: new THREE.CylinderGeometry(0.43, 0.43, 1.24, 8, 1, false, 0, Math.PI),
    matrix: computeTransformMatrix(0, 0.12, 0, 0, 0, Math.PI / 2, 1, 1, 1, new THREE.Matrix4()),
    color: woodColor
  });
  // Кованые золотые полосы-оковки
  for (const offsetX of [-0.46, 0, 0.46]) {
    parts.push({
      geo: new THREE.BoxGeometry(0.14, 0.88, 0.92),
      matrix: computeTransformMatrix(offsetX, -0.02, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
      color: goldColor
    });
  }
  // Замочная пластина с кристаллом
  parts.push({
    geo: new THREE.BoxGeometry(0.26, 0.32, 0.96),
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: lockColor
  });
  return mergeGeometryParts(parts);
})();

const chestMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x7a4200,
  emissiveIntensity: 0.75,
  roughness: 0.4,
  metalness: 0.55
});
const chestGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowWarm,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.7
});
// Скрытый меш для прогрева шейдера сундука на старте
(function prewarmChestShader() {
  const dummyChest = new THREE.Mesh(chestGeo, chestMat);
  dummyChest.position.y = -80;
  scene.add(dummyChest);
})();

const altarGroup = new THREE.Group();
scene.add(altarGroup);

const altarGeo = (function buildAltarGeometry() {
  const parts = [];
  const stoneColor = new THREE.Color(0x2d1846);
  const trimColor = new THREE.Color(0x7a38c8);
  const crystalColor = new THREE.Color(0xe098ff);

  // Ступенчатый пьедестал алтаря
  parts.push({
    geo: new THREE.CylinderGeometry(0.72, 0.92, 0.32, 6),
    matrix: computeTransformMatrix(0, -0.58, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: stoneColor
  });
  // Резная колонна алтаря
  parts.push({
    geo: new THREE.CylinderGeometry(0.42, 0.58, 0.95, 6),
    matrix: computeTransformMatrix(0, -0.05, 0, 0, 0.5, 0, 1, 1, 1, new THREE.Matrix4()),
    color: trimColor
  });
  // Чаша алтаря
  parts.push({
    geo: new THREE.CylinderGeometry(0.68, 0.38, 0.28, 6),
    matrix: computeTransformMatrix(0, 0.45, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: stoneColor
  });
  // Парящий кристалл пакта над чашей
  parts.push({
    geo: new THREE.OctahedronGeometry(0.36, 0),
    matrix: computeTransformMatrix(0, 0.95, 0, 0.2, 0.4, 0, 0.85, 1.45, 0.85, new THREE.Matrix4()),
    color: crystalColor
  });
  return mergeGeometryParts(parts);
})();

const altarMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  vertexColors: true,
  emissive: 0x581e96,
  emissiveIntensity: 0.95,
  roughness: 0.35,
  metalness: 0.4
});
const altarGlowMat = new THREE.SpriteMaterial({
  map: TEXTURES.glowPurple,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.85
});
// Скрытый меш для прогрева шейдера алтаря на старте
(function prewarmAltarShader() {
  const dummyAltar = new THREE.Mesh(altarGeo, altarMat);
  dummyAltar.position.y = -80;
  scene.add(dummyAltar);
})();

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

// Группа архитектурного декора и атмосферных деталей башни
const towerDecorGroup = new THREE.Group();
scene.add(towerDecorGroup);

// Скульптурная геометрия каменной/ледяной/пустотной плиты (вписана в 1×1×1 для точного совпадения с физикой)
const sculptedSlabGeometry = (function buildSculptedSlabGeometry() {
  const parts = [];
  const topColor = new THREE.Color(0xffffff);
  const midColor = new THREE.Color(0xd8d4dc);
  const bottomColor = new THREE.Color(0x9a94a2);

  // Верхняя основная плита с фаской (y ∈ [0.14, 0.50])
  parts.push({
    geo: new THREE.BoxGeometry(1.0, 0.36, 1.0),
    matrix: computeTransformMatrix(0, 0.32, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: topColor
  });
  // Утопленный фриз-поясок посередине блока (y ∈ [-0.16, 0.14])
  parts.push({
    geo: new THREE.BoxGeometry(0.91, 0.3, 0.91),
    matrix: computeTransformMatrix(0, -0.01, 0, 0, 0, 0, 1, 1, 1, new THREE.Matrix4()),
    color: midColor
  });
  // Нижний сужающийся замковый свод/консоль под плитой (y ∈ [-0.50, -0.16])
  parts.push({
    geo: new THREE.CylinderGeometry(0.66, 0.48, 0.34, 4),
    matrix: computeTransformMatrix(0, -0.33, 0, 0, Math.PI / 4, 0, 1, 1, 1, new THREE.Matrix4()),
    color: bottomColor
  });

  return mergeGeometryParts(parts);
})();

// Материалы плит и ступеней для трёх башен
const TOWER_SLAB_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
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
  ice: new THREE.MeshStandardMaterial({
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
  void: new THREE.MeshStandardMaterial({
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

// Глобальные коллекции объектов текущего уровня башни
let blocks = [];
let jumpPads = [];
let chests = [];
let altars = [];
let floorLayouts = [];
let forkMarkers = [];
let bossGateBlockIndices = {};
let towerInstancedMesh = null;

// Ссылки на анимируемые элементы окружения текущей башни
let activeVoidFloatingMesh = null;
let activeVoidFloatingData = [];
let activeAshLavaStreamMat = null;
let activeVoidRunePillarMat = null;

/* ---------- Пространственная сетка блоков (ячейки 4×4×этаж) ---------- */

const GRID_FLOORS = 12;
const GRID_DIM = 15;
const GRID_OFFSET = 7; // индексы ячеек ix, iz ∈ [-7, 7]

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

/**
 * Собирает индексы блоков в окрестности точки (этаж ±1, ячейки ±1).
 */
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

/**
 * Проверяет пересечение хитбокса игрока с блоком `[minX, maxX, minZ, maxZ, minY, maxY]`.
 */
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

/**
 * Возвращает высоту самой высокой опоры под точкой `(x, y, z)`.
 */
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
 * Открывает запечатанный проход наверх после победы над боссом этажа `floorIndex`.
 */
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
  bossGateBlockIndices[floorIndex] = [];
}

/* ---------- Генерация архитектурного окружения и деталей по темам башен ---------- */

/**
 * Создаёт 3D-силуэт замёрзшего воина/монаха для вмуровывания в ледяные стены Ледяной башни.
 */
function buildFrozenSilhouetteBaseGeometry() {
  const parts = [];
  const darkIceColor = new THREE.Color(0x0c2240);
  const cloakColor = new THREE.Color(0x14365e);
  const frostCoreColor = new THREE.Color(0x88dcff);

  // Остроконечный монашеский капюшон Ордена Инея
  parts.push({
    geo: new THREE.ConeGeometry(0.42, 0.85, 6),
    matrix: computeTransformMatrix(0, 1.72, 0, 0.12, 0, 0, 0.95, 1.0, 0.85, new THREE.Matrix4()),
    color: darkIceColor
  });
  // Массивные наплечники
  parts.push({
    geo: new THREE.CylinderGeometry(0.68, 0.82, 0.55, 6),
    matrix: computeTransformMatrix(0, 1.12, 0, 0, 0, 0, 1.15, 1.0, 0.65, new THREE.Matrix4()),
    color: cloakColor
  });
  // Торс и длинная мантия, вмёрзшая в лёд
  parts.push({
    geo: new THREE.CylinderGeometry(0.52, 0.85, 2.2, 7),
    matrix: computeTransformMatrix(0, 0.05, 0, 0, 0, 0, 1.0, 1.0, 0.62, new THREE.Matrix4()),
    color: darkIceColor
  });
  // Сложенные перед грудью руки, сжимающие меч/посох
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
  // Застывшее ледяное ядро и кристаллы льда, пронзающие фигуру
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

/**
 * Очищает предыдущие декоративные меши башни.
 */
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
 * Строит уникальное 3D-окружение башни (колонны, арки, трещины/потоки лавы,
 * сосульки и вмёрзшие силуэты, парящие обломки и рунные монолиты).
 */
function buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor) {
  clearTowerDecorGroup();
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  const structureParts = [];
  const accentParts = [];
  const tempMat = new THREE.Matrix4();

  const pillarCount = 8;
  const wallRadius = 30.18;

  // Цвета архитектурного каркаса по башням
  const pillarPrimaryColor =
    towerId === 'ash'
      ? new THREE.Color(0x361318)
      : towerId === 'ice'
        ? new THREE.Color(0x5da8dc)
        : new THREE.Color(0x1f0f38);
  const pillarSecondaryColor =
    towerId === 'ash'
      ? new THREE.Color(0x220a0d)
      : towerId === 'ice'
        ? new THREE.Color(0x98dcff)
        : new THREE.Color(0x34195e);
  const accentGlowColor =
    towerId === 'ash'
      ? new THREE.Color(0xff6a15)
      : towerId === 'ice'
        ? new THREE.Color(0x88e4ff)
        : new THREE.Color(0xc458ff);

  // 1. Массивные периметральные контрфорсы/пилястры вдоль стен башни (8 колонн)
  const pillarSectionGeo = new THREE.CylinderGeometry(0.95, 1.12, 14, 6);
  const capitalGeo = new THREE.CylinderGeometry(1.45, 1.05, 1.3, 6);
  const archSegmentGeo = new THREE.BoxGeometry(5.6, 0.95, 0.95);

  for (let p = 0; p < pillarCount; p++) {
    const angle = (p / pillarCount) * TWO_PI;
    const px = Math.cos(angle) * wallRadius;
    const pz = Math.sin(angle) * wallRadius;
    const rotY = -angle + Math.PI / 2;

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      // Ствол пилястры на этаже
      computeTransformMatrix(px, floorY + 7, pz, 0, rotY, 0, 1, 1, 0.75, tempMat);
      structureParts.push({
        geo: pillarSectionGeo,
        matrix: tempMat.clone(),
        color: pillarPrimaryColor
      });

      // Массивная капитель/пояс на уровне каждого этажа
      computeTransformMatrix(px, floorY + 0.2, pz, 0, rotY, 0, 1.1, 1, 0.85, tempMat);
      structureParts.push({
        geo: capitalGeo,
        matrix: tempMat.clone(),
        color: pillarSecondaryColor
      });

      // Настенные стрельчатые арки-рёбра между колоннами (на каждом 2-м этаже)
      if (floor % 2 === 1) {
        const nextAngle = ((p + 0.5) / pillarCount) * TWO_PI;
        const ax = Math.cos(nextAngle) * (wallRadius + 0.15);
        const az = Math.sin(nextAngle) * (wallRadius + 0.15);
        const aRotY = -nextAngle + Math.PI / 2;

        computeTransformMatrix(ax, floorY + 0.1, az, 0, aRotY, 0.14, 1.05, 1, 0.7, tempMat);
        structureParts.push({
          geo: archSegmentGeo,
          matrix: tempMat.clone(),
          color: pillarSecondaryColor
        });
      }
    }
  }

  // 2. Детализация винтовых лестниц (каменные/ледяные/рунные балюстрады и ступени)
  const stairStepTrimGeo = new THREE.BoxGeometry(4.15, 0.32, 4.15);
  const stairPostGeo = new THREE.CylinderGeometry(0.24, 0.32, 1.35, 6);

  for (let floor = 0; floor < 11; floor++) {
    const stairs = stairPositionsByFloor[floor] || [];
    for (let s = 0; s < stairs.length; s++) {
      const [sx, sz, topY] = stairs[s];
      // Рельефная верхняя плита ступени с выступающим карнизом
      computeTransformMatrix(sx, topY - 0.14, sz, 0, 0, 0, 1, 1, 1, tempMat);
      structureParts.push({
        geo: stairStepTrimGeo,
        matrix: tempMat.clone(),
        color: pillarSecondaryColor
      });
      // Стройная опорная колонна под высокой ступенью вместо растянутого блока
      const colH = Math.max(0.5, topY - floor * 14 - 1.1);
      if (colH > 0.8) {
        computeTransformMatrix(sx, floor * 14 + colH * 0.5, sz, 0, s * 0.5, 0, 1.15, colH / 14, 1.15, tempMat);
        structureParts.push({
          geo: pillarSectionGeo,
          matrix: tempMat.clone(),
          color: pillarPrimaryColor
        });
      }

      // Боковые столбики балюстрады на первой и последней ступени марша
      if (s % 6 === 0 || s % 6 === 5) {
        computeTransformMatrix(sx + 1.65, topY + 0.65, sz + 1.65, 0, 0, 0, 1, 1, 1, tempMat);
        structureParts.push({
          geo: stairPostGeo,
          matrix: tempMat.clone(),
          color: pillarPrimaryColor
        });
        computeTransformMatrix(sx - 1.65, topY + 0.65, sz - 1.65, 0, 0, 0, 1, 1, 1, tempMat);
        accentParts.push({
          geo: new THREE.OctahedronGeometry(0.28, 0),
          matrix: computeTransformMatrix(sx + 1.65, topY + 1.48, sz + 1.65, 0, 0, 0, 1, 1.3, 1, new THREE.Matrix4()),
          color: accentGlowColor
        });
      }
    }
  }

  // 3. Специфические для каждой башни 3D-детали (по мудбордам и лору)
  if (towerId === 'ash') {
    // ПЕПЕЛЬНАЯ БАШНЯ:
    // - Узкие раскалённые бойницы в стенах, сочащиеся лавой
    // - Потоки жидкой магмы, стекающие по стенам и краям ступеней
    // - Сталактиты застывшего шлака под плитами и кованые цепи под арками
    const slitGeo = new THREE.BoxGeometry(0.85, 4.8, 0.35);
    const lavaFallGeo = new THREE.CylinderGeometry(0.18, 0.42, 6.5, 6);
    const stalactiteGeo = new THREE.ConeGeometry(0.42, 2.2, 5);
    const chainLinkGeo = new THREE.CylinderGeometry(0.12, 0.12, 5.5, 5);

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;
      for (let p = 0; p < pillarCount; p++) {
        const midAngle = ((p + 0.5) / pillarCount) * TWO_PI;
        const wx = Math.cos(midAngle) * 30.35;
        const wz = Math.sin(midAngle) * 30.35;
        const rotY = -midAngle + Math.PI / 2;

        // Светящиеся бойницы и вертикальные разломы с лавой
        if ((floor + p) % 2 === 0) {
          computeTransformMatrix(wx, floorY + 7.5, wz, 0, rotY, 0, 1, 1, 1, tempMat);
          accentParts.push({
            geo: slitGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xff7818)
          });

          // Стекающий из разлома поток лавы по стене
          computeTransformMatrix(wx * 0.99, floorY + 3.2, wz * 0.99, 0, rotY, 0, 1, 1, 0.5, tempMat);
          accentParts.push({
            geo: lavaFallGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xffaa30)
          });
        } else {
          // Тяжёлые раскалённые цепи, свисающие вдоль стен Горна
          computeTransformMatrix(wx * 0.985, floorY + 9.5, wz * 0.985, 0.08, rotY, 0.12, 1, 1, 1, tempMat);
          structureParts.push({
            geo: chainLinkGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0x1c080a)
          });
        }
      }

      // Наросты остывшей лавы и сталактиты под краями островков и ступеней
      const edgeCells = floorEdgeCellsByFloor[floor] || [];
      for (let e = 0; e < edgeCells.length; e += 3) {
        const [ex, ez] = edgeCells[e];
        const dropH = 1.6 + ((e % 3) * 0.6);
        computeTransformMatrix(ex, floorY - 1.0 - dropH * 0.45, ez, Math.PI, e * 0.7, 0, 1, dropH / 2.2, 1, tempMat);
        structureParts.push({
          geo: stalactiteGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0x2d0f12)
        });
        // Раскалённая капля на кончике сталактита
        if (e % 6 === 0) {
          computeTransformMatrix(ex, floorY - 1.0 - dropH * 0.9, ez, Math.PI, 0, 0, 0.55, 0.5, 0.55, tempMat);
          accentParts.push({
            geo: stalactiteGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xff6a10)
          });
        }
      }

      // Стекающая по ступеням лестниц лава (как на центральном кадре мудборда Пепельной башни)
      const stairs = stairPositionsByFloor[floor] || [];
      for (let s = 1; s < stairs.length; s += 2) {
        const [sx, sz, topY] = stairs[s];
        computeTransformMatrix(sx + 1.85, topY - 1.2, sz, 0, 0, 0.08, 0.65, 0.45, 0.65, tempMat);
        accentParts.push({
          geo: lavaFallGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0xff8420)
        });
      }
    }
  } else if (towerId === 'ice') {
    // ЛЕДЯНАЯ БАШНЯ:
    // - 3D вмёрзшие силуэты в толще ледяных стен (между внешней стеной 30.8 и внутренним слоем льда 29.95)
    // - Гроздья острых сосулек под мостами, лестницами и готическими арками
    // - Выступающие ледяные кристаллы и холодный туман из трещин пола
    const icicleGeo = new THREE.ConeGeometry(0.32, 2.4, 5);
    const crystalSpikeGeo = new THREE.CylinderGeometry(0.06, 0.42, 2.8, 6);
    const silhouetteParts = [];

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;

      // Кристаллические ледяные контрфорсы и стрельчатые рёбра на стенах, обрамляющие вмёрзшие силуэты
      for (let s = 0; s < 4; s++) {
        const angle = ((s + 0.5) / 4) * TWO_PI + (floor % 2) * 0.38;
        const ribRadius = 30.12;
        const sx = Math.cos(angle) * ribRadius;
        const sz = Math.sin(angle) * ribRadius;
        const rotY = -angle + Math.PI / 2;
        computeTransformMatrix(sx, floorY + 7.0, sz, 0, rotY, 0.12, 1.1, 2.2, 0.8, tempMat);
        accentParts.push({
          geo: crystalSpikeGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0x98dcff)
        });
      }

      // Ледяные пики-наросты у основания колонн
      for (let p = 0; p < pillarCount; p++) {
        if ((floor + p) % 2 !== 0) continue;
        const angle = (p / pillarCount) * TWO_PI + 0.18;
        const cx = Math.cos(angle) * 29.85;
        const cz = Math.sin(angle) * 29.85;
        computeTransformMatrix(cx, floorY + 1.4, cz, -0.25, -angle, 0.15, 1, 1, 1, tempMat);
        accentParts.push({
          geo: crystalSpikeGeo,
          matrix: tempMat.clone(),
          color: new THREE.Color(0xb8eeff)
        });
      }

      // Сосульки под краями этажей и островов
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
          color: new THREE.Color(0xcff2ff)
        });
      }

      // Каскады сосулек под винтовыми лестницами (как на панорамах мудборда Ледяной башни)
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
            color: new THREE.Color(0xdcf6ff)
          });
        }
      }

      // Холодный туман, сочащийся из трещин пола
      if (edgeCells.length > 0) {
        for (let m = 0; m < 2; m++) {
          const [mx, mz] = edgeCells[(m * 7 + floor * 3) % edgeCells.length];
          const mistSprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: TEXTURES.glowIce,
              color: 0xb8ecff,
              transparent: true,
              opacity: 0.32,
              blending: THREE.AdditiveBlending,
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
      const silMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        emissive: 0x164a78,
        emissiveIntensity: 0.65,
        roughness: 0.4,
        metalness: 0.2
      });
      const silMesh = new THREE.Mesh(mergedSilGeo, silMat);
      silMesh.userData.disposeMaterial = true;
      towerDecorGroup.add(silMesh);
    }
  } else if (towerId === 'void') {
    // БАШНЯ ПУСТОТЫ:
    // - Парящие в невесомости каменные кубы, обломки ступеней и рунные обелиски
    // - Изогнутые ленты/щупальца застывшей пустоты вдоль стен и лестниц
    // - Светящиеся рунные скрижали на колоннах
    const runeTabletGeo = new THREE.BoxGeometry(0.95, 5.2, 0.32);
    const tendrilSegGeo = new THREE.CylinderGeometry(0.18, 0.34, 4.2, 6);

    for (let floor = 0; floor < 12; floor++) {
      const floorY = floor * 14;
      for (let p = 0; p < pillarCount; p++) {
        const angle = (p / pillarCount) * TWO_PI;
        const rx = Math.cos(angle) * 29.45;
        const rz = Math.sin(angle) * 29.45;
        const rotY = -angle + Math.PI / 2;

        // Светящиеся рунные скрижали на монолитных колоннах
        if ((floor + p) % 2 === 0) {
          computeTransformMatrix(rx, floorY + 7.0, rz, 0, rotY, 0, 1, 1, 1, tempMat);
          accentParts.push({
            geo: runeTabletGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0xd478ff)
          });
        }

        // Изгибающиеся ленты тёмной материи («пространство складывается, как бумага»)
        if ((floor + p) % 3 === 0) {
          const tAngle = angle + 0.22;
          const tx = Math.cos(tAngle) * 29.6;
          const tz = Math.sin(tAngle) * 29.6;
          computeTransformMatrix(tx, floorY + 5.5, tz, 0.35, -tAngle, 0.42, 1, 1, 1, tempMat);
          structureParts.push({
            geo: tendrilSegGeo,
            matrix: tempMat.clone(),
            color: new THREE.Color(0x120624)
          });
        }
      }

      // Фиолетовые энергетические кристаллы вдоль винтовых лестниц
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
          0.6,
          1.2,
          0.6,
          tempMat
        );
        accentParts.push({
          geo: new THREE.OctahedronGeometry(0.45, 0),
          matrix: tempMat.clone(),
          color: new THREE.Color(0xc868ff)
        });
      }
    }

    // Парящие в невесомости каменные кубы и обломки (анимируются в каждом кадре)
    const floatingCount = 72;
    const floatingGeo = jitterGeometry(new THREE.BoxGeometry(1.15, 0.85, 1.15), 0.12);
    const floatingMat = new THREE.MeshStandardMaterial({
      map: TOWER_FLOOR_TEXTURES.void.map,
      emissive: 0x9030ff,
      emissiveMap: TOWER_FLOOR_TEXTURES.void.emissive,
      emissiveIntensity: 1.35,
      roughness: 0.5,
      metalness: 0.3
    });
    activeVoidFloatingMesh = new THREE.InstancedMesh(floatingGeo, floatingMat, floatingCount);
    activeVoidFloatingMesh.userData.disposeMaterial = true;
    activeVoidFloatingData = [];

    const dummy = new THREE.Object3D();
    for (let i = 0; i < floatingCount; i++) {
      const floor = i % 12;
      const angle = seededRandom(seed, 'vfltA', i) * TWO_PI;
      // Часть обломков парит у стен (r ∈ [26.8, 29.2]), часть — в пропастях под этажами
      const radius =
        i % 3 === 0
          ? 6 + seededRandom(seed, 'vfltR', i) * 14
          : 26.8 + seededRandom(seed, 'vfltR', i) * 2.4;
      const baseY =
        i % 3 === 0
          ? floor * 14 - 4.2 - seededRandom(seed, 'vfltY', i) * 4.5
          : floor * 14 + 2.5 + seededRandom(seed, 'vfltY', i) * 9.5;
      const scale = 0.55 + seededRandom(seed, 'vfltS', i) * 1.25;
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

  // Собираем единый меш архитектурного каркаса (колонны, капители, арки, балюстрады, сталактиты)
  if (structureParts.length) {
    const mergedStructGeo = mergeGeometryParts(structureParts);
    const structMat = new THREE.MeshStandardMaterial({
      map: TOWER_WALL_TEXTURES[towerId].map,
      bumpMap: TOWER_WALL_TEXTURES[towerId].bump,
      bumpScale: 0.3,
      color: 0xffffff,
      vertexColors: true,
      roughness: towerId === 'ice' ? 0.2 : 0.82,
      metalness: towerId === 'ice' ? 0.35 : 0.2
    });
    const structMesh = new THREE.Mesh(mergedStructGeo, structMat);
    structMesh.userData.disposeMaterial = true;
    towerDecorGroup.add(structMesh);
  }

  // Собираем единый меш светящихся/полупрозрачных акцентов (потоки лавы, сосульки, рунные скрижали)
  if (accentParts.length) {
    const mergedAccentGeo = mergeGeometryParts(accentParts);
    let accentMat;
    if (towerId === 'ash') {
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
    } else if (towerId === 'ice') {
      accentMat = new THREE.MeshStandardMaterial({
        color: 0xd8f4ff,
        vertexColors: true,
        emissive: 0x3898e0,
        emissiveIntensity: 0.55,
        roughness: 0.08,
        metalness: 0.35,
        transparent: true,
        opacity: 0.82
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

/**
 * Обновляет анимацию парящих обломков Пустоты и пульсацию архитектурных акцентов.
 */
function updateTowerDecorAnimations(time, dt, towerId) {
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

/**
 * Строит все 12 этажей башни по заданному зерну `seed`.
 */
function buildTower(seed) {
  if (towerInstancedMesh) {
    scene.remove(towerInstancedMesh);
    towerInstancedMesh = null;
  }

  jumpPadGroup.clear();
  chestGroup.clear();
  altarGroup.clear();
  forkSpriteGroup.clear();

  chests = [];
  altars = [];
  floorLayouts = [];
  forkMarkers = [];
  bossGateBlockIndices = {};
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

    // Координаты ступеней с этого этажа на следующий
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

    // Выбор планировки этажа (Арена / Кольцо / Мосты / Острова)
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
        // Оставляем проём над лестницей с предыдущего этажа
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

      // Проверка связности графа плит (с учётом прыжка через 1 клетку)
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

      // Запоминаем краевые плиты (граничащие с пропастью или проёмом) для размещения сосулек/сталактитов
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

    // Ступени на следующий этаж и печати боссов
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
            const markerSprite = new THREE.Sprite(FORK_ROUTE_MATERIALS[routeTag]);
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

    // Прыжковые площадки
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
        const padMesh = new THREE.Mesh(jumpPadGeo, jumpPadMat);
        padMesh.position.set(x, floorY + 0.15, z);
        jumpPadGroup.add(padMesh);
      }
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    insertBlockIntoGrid(i);
  }

  // Сундуки: по 2 на этаж на свободных плитах
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

        const group = new THREE.Group();
        const mesh = new THREE.Mesh(chestGeo, chestMat);
        const glow = new THREE.Sprite(chestGlowMat);
        glow.scale.setScalar(3.2);
        glow.position.y = 0.4;
        group.add(mesh, glow);
        group.position.set(x, floorY + 0.45, z);
        chestGroup.add(group);
        chests.push({ x, y: floorY, z, group, isOpen: 0, cost: Math.round(4 + 2.5 * floor) });
        break;
      }
    }
  }

  // Алтари пактов: ~50% обычных этажей
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

      const group = new THREE.Group();
      const mesh = new THREE.Mesh(altarGeo, altarMat);
      const glow = new THREE.Sprite(altarGlowMat);
      glow.scale.setScalar(3.6);
      glow.position.y = 0.6;
      group.add(mesh, glow);
      group.position.set(x, floorY + 0.75, z);
      altarGroup.add(group);
      altars.push({ x, y: floorY, z, group, isOpen: 0, floor, cooldownUntil: 0 });
      break;
    }
  }

  // Единый InstancedMesh со скульптурными плитами и материалом текущей башни
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';
  const dummyObj = new THREE.Object3D();
  const blockColor = new THREE.Color();
  towerInstancedMesh = new THREE.InstancedMesh(
    sculptedSlabGeometry,
    TOWER_SLAB_MATERIALS[towerId] || TOWER_SLAB_MATERIALS.ash,
    blocks.length
  );

  const gateColorHex =
    towerId === 'ash' ? 0xff4518 : towerId === 'ice' ? 0x45d8ff : 0xc845ff;

  blocks.forEach((b, idx) => {
    const rawH = b[5] - b[4];
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

  // Строим архитектурное окружение башни (пилястры, арки, сосульки, вмёрзшие силуэты, руны, парящие обломки)
  buildTowerArchitecture(seed, stairPositionsByFloor, floorEdgeCellsByFloor);
}
