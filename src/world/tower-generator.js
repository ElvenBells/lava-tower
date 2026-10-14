/* ==========================================================================
   Генерация башни и пространственная сетка блоков:
   12 этажей, планировки (Арена, Кольцо, Мосты, Острова), лестницы, развилки,
   печати боссов, прыжковые площадки, сундуки и алтари пактов
   ========================================================================== */

const jumpPadGroup = new THREE.Group();
scene.add(jumpPadGroup);
const jumpPadGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 12);
const jumpPadMat = new THREE.MeshStandardMaterial({
  color: 0x45e0c8,
  emissive: 0x1d8f80,
  emissiveIntensity: 1.2
});

const chestGroup = new THREE.Group();
scene.add(chestGroup);
const chestGeo = new THREE.BoxGeometry(1.3, 0.9, 0.9);
const chestMat = new THREE.MeshStandardMaterial({
  color: 0xffc83d,
  emissive: 0x6a3a00,
  emissiveIntensity: 0.8,
  roughness: 0.5,
  metalness: 0.4
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
const altarGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.5, 6);
const altarMat = new THREE.MeshStandardMaterial({
  color: 0x8a3ae0,
  emissive: 0x4a1a7a,
  emissiveIntensity: 0.9,
  roughness: 0.4,
  metalness: 0.3
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

// Глобальные коллекции объектов текущего уровня башни
let blocks = [];
let jumpPads = [];
let chests = [];
let altars = [];
let floorLayouts = [];
let forkMarkers = [];
let bossGateBlockIndices = {};
let towerInstancedMesh = null;

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

/**
 * Строит все 12 этажей башни по заданному зерну `seed`.
 */
function buildTower(seed) {
  if (towerInstancedMesh) {
    scene.remove(towerInstancedMesh);
    towerInstancedMesh.geometry.dispose();
    towerInstancedMesh.material.dispose();
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
    for (const cellKey of activeCells) {
      const x = (((cellKey / 15) | 0) - 7) * 4;
      const z = ((cellKey % 15) - 7) * 4;
      blocks.push([x - 2, x + 2, z - 2, z + 2, floorY - 1, floorY, floor]);
    }

    // Ступени на следующий этаж и печати боссов
    prevStairPositions = [];
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

  // Единый InstancedMesh для всех блоков башни
  const dummyObj = new THREE.Object3D();
  const blockColor = new THREE.Color();
  towerInstancedMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.85 }),
    blocks.length
  );

  blocks.forEach((b, idx) => {
    dummyObj.position.set((b[0] + b[1]) / 2, (b[4] + b[5]) / 2, (b[2] + b[3]) / 2);
    dummyObj.scale.set(b[1] - b[0] - 0.1, b[5] - b[4], b[3] - b[2] - 0.1);
    dummyObj.updateMatrix();
    towerInstancedMesh.setMatrixAt(idx, dummyObj.matrix);

    const baseColorHex =
      b[7] === 1
        ? 0x3fbf7a
        : b[7] === 2
          ? 0xd23a2a
          : b[7] === 3
            ? 0xff2a60
            : currentTowerTheme.blockColors[Math.floor(b[6] / 4)];

    towerInstancedMesh.setColorAt(
      idx,
      blockColor.setHex(baseColorHex).offsetHSL(0, 0, ((b[0] / 4 + b[2] / 4) & 1) * 0.06)
    );
  });

  towerInstancedMesh.instanceMatrix.needsUpdate = true;
  if (towerInstancedMesh.instanceColor) {
    towerInstancedMesh.instanceColor.needsUpdate = true;
  }
  scene.add(towerInstancedMesh);
}
