/* ==========================================================================
   Ввод (клавиатура/мышь), инициализация забега (1–4 игрока, 12–24 этажа / 3 акта),
   логика полуэтажей-балконов (floorY + 6), разделённых секторов (split_ring),
   безопасных «Залов Кузницы», малых печатей лестниц и командных мини-квестов
   (Рунные круги, Хранители печати, Ядро горна), кооперативных событий этажей
   («Связующая цепь», «Полярный резонанс»), механики возрождения «Угасающий уголь»
   и основной шаг физики (60 Гц)
   ========================================================================== */

let state = null;
const keysPressed = {};
let isMouseDown = 0;

// 3D-группа визуализации союзников для кооперативного режима (2–4 игрока)
const coopAlliesGroup = new THREE.Group();
scene.add(coopAlliesGroup);

// 3D-группа объектов командных мини-квестов для снятия малых печатей этажей
const floorQuestGroup = new THREE.Group();
scene.add(floorQuestGroup);

// 3D-группа визуализации кооперативных событий («Связующая цепь» и «Полярный резонанс»)
const coopEventVisualGroup = new THREE.Group();
scene.add(coopEventVisualGroup);

// 3D-группа объектов возрождения «Угасающий уголь» (игрока и павших союзников)
const fadingEmberGroup = new THREE.Group();
scene.add(fadingEmberGroup);

function buildCoopAllyAvatarMesh(tintHex) {
  const g = new THREE.Group();
  const cloakMat = new THREE.MeshStandardMaterial({
    color: tintHex,
    emissive: tintHex,
    emissiveIntensity: 0.35,
    roughness: 0.55,
    metalness: 0.25
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 1.18, 8), cloakMat);
  body.position.y = 0.62;
  g.add(body);

  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.52, 7), cloakMat);
  hood.position.y = 1.42;
  g.add(hood);

  const auraRing = new THREE.Mesh(
    new THREE.RingGeometry(0.52, 0.68, 24),
    new THREE.MeshBasicMaterial({
      color: tintHex,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  auraRing.rotation.x = -Math.PI / 2;
  auraRing.position.y = 0.04;
  g.add(auraRing);

  g.userData = { body, hood, auraRing, tintHex };
  return g;
}

/**
 * Создаёт 3D-модель «Угасающего угля» с 3-секундным рунным кругом возрождения.
 */
function createFadingEmberVisualMesh(tintHex = 0xff6a18) {
  const g = new THREE.Group();

  // Тлеющее угольное ядро
  const coalCore = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.46, 0),
    new THREE.MeshStandardMaterial({
      color: 0x2a1410,
      emissive: tintHex,
      emissiveIntensity: 1.85,
      roughness: 0.6,
      metalness: 0.2
    })
  );
  coalCore.position.y = 0.68;
  g.add(coalCore);

  // Внешнее кольцо удержания (радиус 3.0 м)
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: tintHex,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.65, 3.02, 36), outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.06;
  g.add(outerRing);

  // Внутренний диск прогресса раздувания угля (масштабируется от 0.08 до 1.0 за 3 секунды)
  const fillDiscMat = new THREE.MeshBasicMaterial({
    map: TEXTURES.runicJumpPad,
    color: 0xffd24c,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const fillDisc = new THREE.Mesh(new THREE.CircleGeometry(2.65, 32), fillDiscMat);
  fillDisc.rotation.x = -Math.PI / 2;
  fillDisc.position.y = 0.05;
  fillDisc.scale.setScalar(0.1);
  g.add(fillDisc);

  // Вертикальный сигнальный луч для союзников
  const beaconGeo = new THREE.CylinderGeometry(0.32, 0.75, 5.2, 16, 1, true);
  beaconGeo.translate(0, 2.6, 0);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: tintHex,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  g.add(beacon);

  const glowSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowWarm,
      color: tintHex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowSprite.scale.setScalar(3.2);
  glowSprite.position.y = 0.75;
  g.add(glowSprite);

  g.userData = { coalCore, outerRing, fillDisc, beacon, glowSprite };
  fadingEmberGroup.add(g);
  return g;
}

window.addEventListener('keydown', (event) => {
  keysPressed[event.code] = 1;
  if (event.code === 'Space') {
    keysPressed.jump = 1;
    event.preventDefault();
  }
  if (event.code.startsWith('Shift')) {
    keysPressed.slide = 1;
  }
  if (event.code === 'KeyF') {
    keysPressed.interactCore = 1;
  }
  if (event.code === 'KeyB') {
    if (typeof triggerOrToggleStorm === 'function') {
      triggerOrToggleStorm();
    }
  }
  if (event.code === 'Escape' && state && !state.isGameOver && !state.pauseState) {
    event.preventDefault();
    pauseGame();
  }
});

window.addEventListener('keyup', (event) => {
  keysPressed[event.code] = 0;
});

window.addEventListener('mousedown', () => {
  isMouseDown = 1;
});

window.addEventListener('mouseup', () => {
  isMouseDown = 0;
});

window.addEventListener('mousemove', (event) => {
  if (
    state &&
    !state.isGameOver &&
    !state.pauseState &&
    (document.pointerLockElement || isMouseDown)
  ) {
    state.cameraYaw -= event.movementX * 0.003;
    state.cameraPitch = Math.max(-0.2, Math.min(1.2, state.cameraPitch + event.movementY * 0.003));
  }
});

function requestPointerLock() {
  try {
    const p = canvas.requestPointerLock();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
  } catch (err) {
    // Игнорируем отказ блокировки курсора
  }
}

canvas.onclick = () => {
  if (state && !state.isGameOver && !state.pauseState) {
    requestPointerLock();
  }
};

document.addEventListener('pointerlockchange', () => {
  if (
    !document.pointerLockElement &&
    state &&
    !state.isGameOver &&
    state.pauseState === 0 &&
    state.elapsedTime > 1
  ) {
    pauseGame();
  }
});

/* ---------- 1. Командные мини-квесты для снятия малых печатей лестницы (15–25 секунд) ---------- */

/**
 * Находит валидную координату плиты пола на этаже для размещения рунного круга или Ядра горна.
 */
function pickValidFloorPointNear(floorIndex, desiredX, desiredZ, minDistFromList, minDistVal = 6) {
  const floorY = floorIndex * 14;
  const candidates =
    (typeof floorValidCellsByFloor !== 'undefined' && floorValidCellsByFloor[floorIndex]) || [];
  const edges =
    (typeof floorEdgeCellsByFloor !== 'undefined' && floorEdgeCellsByFloor[floorIndex]) || [];
  const pool = candidates.length >= 4 ? candidates : [...candidates, ...edges];

  let bestPt = null;
  let bestScore = 1e12;
  for (let i = 0; i < pool.length; i++) {
    const [cx, cz] = pool[i];
    if (minDistFromList && minDistFromList.length) {
      let tooClose = false;
      for (let k = 0; k < minDistFromList.length; k++) {
        if (hypot2D(cx - minDistFromList[k].x, cz - minDistFromList[k].z) < minDistVal) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;
    }
    const d = hypot2D(cx - desiredX, cz - desiredZ);
    if (d < bestScore) {
      bestScore = d;
      bestPt = { x: cx, y: floorY, z: cz };
    }
  }

  if (bestPt) return bestPt;
  const gY = getGroundHeightAt(desiredX, floorY + 1, desiredZ);
  return {
    x: desiredX,
    y: gY >= floorY - 2 ? gY : floorY,
    z: desiredZ
  };
}

/**
 * Запускает командный мини-квест на обычном этаже для снятия малой печати лестницы за 15–25 секунд.
 * Поддерживает 3 типа задач:
 * - 'rune_circles': одновременный захват N рунных кругов на разных краях арены
 * - 'seal_guardians': убийство 2–3 элитных «Хранителей печати»
 * - 'forge_core': перенос тяжёлого «Ядра горна» к лестнице (носитель замедлен и не атакует, союзники прикрывают)
 */
function startFloorMiniQuest(floorIndex, forcedQuestType) {
  floorQuestGroup.clear();
  if (!state) return null;
  state.isCarryingForgeCore = 0;

  if (isBossFloorIndex(floorIndex) || floorIndex >= GRID_FLOORS - 1) {
    state.floorQuest = null;
    return null;
  }
  if (typeof bossGateVisualsByFloor !== 'undefined' && bossGateVisualsByFloor[floorIndex]) {
    bossGateVisualsByFloor[floorIndex].visible = true;
  }

  const questKeys =
    typeof FLOOR_MINI_QUEST_KEYS !== 'undefined'
      ? FLOOR_MINI_QUEST_KEYS
      : ['rune_circles', 'seal_guardians', 'forge_core'];
  const chosenType =
    forcedQuestType && questKeys.includes(forcedQuestType)
      ? forcedQuestType
      : questKeys[(floorIndex + (state.seed % 3)) % questKeys.length];

  const floorY = floorIndex * 14;
  const stairs =
    (typeof stairPositionsByFloor !== 'undefined' && stairPositionsByFloor[floorIndex]) || [];
  const firstStep = stairs[0] || [0, TOWER_FLOOR_RADIUS - 8, floorY + 2];
  const stairAngle = Math.atan2(firstStep[1], firstStep[0]);

  const quest = {
    floor: floorIndex,
    type: chosenType,
    completed: 0,
    progress: 0,
    elapsed: 0,
    maxDuration:
      (FLOOR_MINI_QUESTS[chosenType] && FLOOR_MINI_QUESTS[chosenType].maxSealDuration) || 24,
    targetDuration:
      (FLOOR_MINI_QUESTS[chosenType] && FLOOR_MINI_QUESTS[chosenType].targetDuration) || 18,
    stairX: firstStep[0],
    stairZ: firstStep[1],
    circles: [],
    simultaneousHoldCount: 0,
    guardiansTotal: 0,
    guardiansKilled: 0,
    guardianEntries: [],
    core: null
  };

  if (chosenType === 'rune_circles') {
    const circleCount = Math.max(2, Math.min(4, state.playerCount || 2));
    const placedPts = [{ x: firstStep[0], z: firstStep[1] }];
    const ringRadius = Math.max(12, TOWER_FLOOR_RADIUS * 0.62);

    for (let cIdx = 0; cIdx < circleCount; cIdx++) {
      // Разносим круги на противоположные края арены (а на split_ring — в оба полукольца)
      const targetAngle =
        stairAngle + Math.PI * 0.45 + ((cIdx + 0.5) * TWO_PI) / circleCount;
      const desiredX = Math.cos(targetAngle) * ringRadius;
      const desiredZ = Math.sin(targetAngle) * ringRadius;
      const pt = pickValidFloorPointNear(floorIndex, desiredX, desiredZ, placedPts, 9);
      placedPts.push(pt);

      const cGroup = new THREE.Group();
      cGroup.position.set(pt.x, pt.y + 0.06, pt.z);

      const outerMat = new THREE.MeshBasicMaterial({
        color: 0x38ffe8,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const outerRing = new THREE.Mesh(new THREE.RingGeometry(2.85, 3.35, 36), outerMat);
      outerRing.rotation.x = -Math.PI / 2;
      cGroup.add(outerRing);

      const innerMat = new THREE.MeshBasicMaterial({
        map: TEXTURES.runicJumpPad,
        color: 0xffd24c,
        transparent: true,
        opacity: 0.68,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const innerDisc = new THREE.Mesh(new THREE.CircleGeometry(2.8, 32), innerMat);
      innerDisc.rotation.x = -Math.PI / 2;
      innerDisc.position.y = 0.02;
      innerDisc.scale.setScalar(0.15);
      cGroup.add(innerDisc);

      const pillarGeo = new THREE.CylinderGeometry(2.4, 2.7, 4.5, 20, 1, true);
      pillarGeo.translate(0, 2.25, 0);
      const pillarMat = new THREE.MeshBasicMaterial({
        color: 0x38ffe8,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      cGroup.add(pillar);

      const crystalMat = new THREE.MeshBasicMaterial({ color: 0xffe066 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), crystalMat);
      crystal.position.y = 1.25;
      cGroup.add(crystal);

      floorQuestGroup.add(cGroup);
      quest.circles.push({
        index: cIdx,
        x: pt.x,
        y: pt.y,
        z: pt.z,
        radius: 3.4,
        charge: 0,
        captured: 0,
        isOccupied: 0,
        group: cGroup,
        outerRing,
        outerMat,
        innerDisc,
        innerMat,
        pillar,
        pillarMat,
        crystal
      });
    }
  } else if (chosenType === 'seal_guardians') {
    const guardianCount = (state.playerCount || 2) >= 3 ? 3 : 2;
    quest.guardiansTotal = guardianCount;
    const placedPts = [{ x: state.player.x, z: state.player.z }];
    const spawnR = Math.max(11, TOWER_FLOOR_RADIUS * 0.56);

    for (let gIdx = 0; gIdx < guardianCount; gIdx++) {
      const gAngle = stairAngle + ((gIdx + 0.5) * TWO_PI) / guardianCount;
      const desiredX = Math.cos(gAngle) * spawnR;
      const desiredZ = Math.sin(gAngle) * spawnR;
      const pt = pickValidFloorPointNear(floorIndex, desiredX, desiredZ, placedPts, 7);
      placedPts.push(pt);

      const mobType = gIdx === 0 && floorIndex >= 1 ? 't' : gIdx % 2 === 1 ? 'l' : 'r';
      const enemy = spawnEnemy(mobType, pt.x, pt.z, 1 + floorIndex * 0.12);
      promoteToElite(enemy, floorIndex, 1, gIdx > 0);
      enemy.isSealGuardian = 1;
      enemy.sealFloor = floorIndex;

      // 3D рунный нимб и луч «Хранителя печати» над элитным врагом
      const markerGroup = new THREE.Group();
      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.06, 6, 24),
        new THREE.MeshBasicMaterial({
          color: 0xffaa28,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      haloRing.rotation.x = Math.PI / 2;
      markerGroup.add(haloRing);

      const sigilGem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.36, 0),
        new THREE.MeshBasicMaterial({ color: 0x45fff0 })
      );
      sigilGem.position.y = 0.65;
      markerGroup.add(sigilGem);

      markerGroup.position.set(pt.x, pt.y + 2.6, pt.z);
      floorQuestGroup.add(markerGroup);

      quest.guardianEntries.push({
        enemy,
        markerGroup,
        haloRing,
        sigilGem
      });
    }
  } else if (chosenType === 'forge_core') {
    // Пьедестал-приёмник у входа на заблокированную лестницу
    const socketDesiredX = firstStep[0] * 0.78;
    const socketDesiredZ = firstStep[1] * 0.78;
    const socketPt = pickValidFloorPointNear(floorIndex, socketDesiredX, socketDesiredZ, [], 0);

    // Спавним тяжёлое «Ядро горна» на противоположном краю этажа
    const coreAngle = stairAngle + Math.PI + (seededRandom(state.seed, 'fcore', floorIndex) - 0.5) * 0.55;
    const coreDist = Math.max(15, TOWER_FLOOR_RADIUS * 0.65);
    const corePt = pickValidFloorPointNear(
      floorIndex,
      Math.cos(coreAngle) * coreDist,
      Math.sin(coreAngle) * coreDist,
      [socketPt],
      12
    );

    // 3D-модель Приёмника печати у лестницы
    const socketGroup = new THREE.Group();
    socketGroup.position.set(socketPt.x, socketPt.y + 0.06, socketPt.z);
    const socketRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.15, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffb830,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    socketRing.rotation.x = -Math.PI / 2;
    socketGroup.add(socketRing);

    const socketBeamGeo = new THREE.CylinderGeometry(2.1, 2.5, 4.8, 20, 1, true);
    socketBeamGeo.translate(0, 2.4, 0);
    const socketBeam = new THREE.Mesh(
      socketBeamGeo,
      new THREE.MeshBasicMaterial({
        color: 0xffa020,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    socketGroup.add(socketBeam);
    floorQuestGroup.add(socketGroup);

    // 3D-модель тяжёлого «Ядра горна» с вращающимися бронзовыми гироскопами
    const coreGroup = new THREE.Group();
    coreGroup.position.set(corePt.x, corePt.y + 1.0, corePt.z);

    const sphereMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.62, 1),
      new THREE.MeshStandardMaterial({
        color: 0xff6818,
        emissive: 0xff4500,
        emissiveIntensity: 1.9,
        roughness: 0.28,
        metalness: 0.4
      })
    );
    coreGroup.add(sphereMesh);

    const gyroMat = new THREE.MeshStandardMaterial({
      color: 0xffd048,
      emissive: 0x985200,
      emissiveIntensity: 0.85,
      roughness: 0.25,
      metalness: 0.85
    });
    const gyroRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.065, 6, 24), gyroMat);
    const gyroRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.055, 6, 24), gyroMat);
    gyroRing2.rotation.x = Math.PI / 2;
    coreGroup.add(gyroRing1, gyroRing2);

    const escortAuraRing = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.75, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffaa30,
        transparent: true,
        opacity: 0.72,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    escortAuraRing.rotation.x = -Math.PI / 2;
    escortAuraRing.position.y = -0.92;
    coreGroup.add(escortAuraRing);

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: TEXTURES.glowWarm,
        color: 0xff9820,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    coreGlow.scale.setScalar(3.6);
    coreGroup.add(coreGlow);

    floorQuestGroup.add(coreGroup);

    quest.core = {
      x: corePt.x,
      y: corePt.y,
      z: corePt.z,
      startX: corePt.x,
      startZ: corePt.z,
      socketX: socketPt.x,
      socketY: socketPt.y,
      socketZ: socketPt.z,
      totalDist: Math.max(8, hypot2D(corePt.x - socketPt.x, corePt.z - socketPt.z)),
      carrier: null, // null | 'player' | peerObj
      heatPulseTimer: 1.6,
      coreGroup,
      socketGroup,
      gyroRing1,
      gyroRing2,
      escortAuraRing,
      socketRing
    };
  }

  state.floorQuest = quest;
  return quest;
}

/**
 * Вызывается при убийстве элитного «Хранителя печати» в combat-and-loot.js.
 */
function onSealGuardianKilled(enemy) {
  if (!state || !state.floorQuest || state.floorQuest.completed) return;
  const q = state.floorQuest;
  if (q.type !== 'seal_guardians' || enemy.sealFloor !== q.floor) return;

  q.guardiansKilled = Math.min(q.guardiansTotal, (q.guardiansKilled || 0) + 1);
  q.progress = Math.min(1, q.guardiansKilled / Math.max(1, q.guardiansTotal));

  if (q.guardiansKilled >= q.guardiansTotal) {
    completeFloorMiniQuest();
  } else {
    showToast(
      '⚔ Хранитель печати повержен (' + q.guardiansKilled + '/' + q.guardiansTotal + ')!',
      1.8
    );
  }
}

/**
 * Завершает активный мини-квест этажа, снимает малую печать с лестницы и выдаёт награду группе.
 */
function completeFloorMiniQuest() {
  if (!state || !state.floorQuest || state.floorQuest.completed) return;
  const q = state.floorQuest;
  q.completed = 1;
  q.progress = 1;
  state.isCarryingForgeCore = 0;

  openBossGate(q.floor);
  floorQuestGroup.clear();

  const bonusGold = 3 + (state.playerCount || 2);
  state.gold += bonusGold;
  state.xp += 3 + q.floor;
  playSound('win');

  const stairs =
    (typeof stairPositionsByFloor !== 'undefined' && stairPositionsByFloor[q.floor]) || [];
  if (stairs.length > 0) {
    const [sx, sz, sy] = stairs[0];
    spawnWaveRingEffect(sx, sy, sz, 4.2, 0x45fff0);
    spawnSparkBurst(sx, sy + 0.8, sz, 26, 'xp');
  }

  const questTitle =
    (FLOOR_MINI_QUESTS[q.type] && FLOOR_MINI_QUESTS[q.type].shortName) || 'Мини-квест';
  showToast(
    '🔓 Малая печать снята (' +
      questTitle +
      ')! Лестница на этаж ' +
      (q.floor + 2) +
      ' открыта (+' +
      bonusGold +
      ' золота)',
    3.4
  );
  checkLevelUp();
}

/**
 * Обновляет прогресс активного командного мини-квеста на этаже (15–25 с).
 */
function updateFloorMiniQuestStep(dt) {
  if (!state || !state.floorQuest || state.floorQuest.completed) {
    state.isCarryingForgeCore = 0;
    return;
  }
  const q = state.floorQuest;
  const player = state.player;
  const time = state.elapsedTime;
  const isPlayerAlive = !state.playerEmber || (!state.playerEmber.active && !state.playerEmber.lostInLava);

  // Если игрок уже каким-то образом оказался выше этого этажа, автоматически открываем печать
  if (state.maxFloorReached > q.floor) {
    completeFloorMiniQuest();
    return;
  }

  q.elapsed += dt;

  // Подсказка при попытке забежать на заблокированную малой печатью лестницу
  if (
    state.hintCooldown <= 0 &&
    Math.abs(player.y - q.floor * 14) < 3.5 &&
    hypot2D(player.x - q.stairX, player.z - q.stairZ) < 4.2
  ) {
    state.hintCooldown = 2.4;
    const pct = Math.min(99, Math.round(q.progress * 100));
    showToast(
      '🔒 Лестница заперта малой печатью (' +
        pct +
        '%): ' +
        ((FLOOR_MINI_QUESTS[q.type] && FLOOR_MINI_QUESTS[q.type].description) || ''),
      2.3
    );
  }

  if (q.type === 'rune_circles') {
    let occupiedNow = 0;
    let capturedCount = 0;

    for (let i = 0; i < q.circles.length; i++) {
      const c = q.circles[i];
      let hasHolder = 0;
      if (
        isPlayerAlive &&
        Math.abs(player.y - c.y) < 3.2 &&
        hypot2D(player.x - c.x, player.z - c.z) <= c.radius
      ) {
        hasHolder = 1;
      }
      if (!hasHolder && state.coopPeers) {
        for (let pi = 0; pi < state.coopPeers.length; pi++) {
          const peer = state.coopPeers[pi];
          if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
          if (
            Math.abs(peer.y - c.y) < 3.2 &&
            hypot2D(peer.x - c.x, peer.z - c.z) <= c.radius + 0.4
          ) {
            hasHolder = 1;
            break;
          }
        }
      }
      c.isOccupied = hasHolder;
      if (hasHolder) occupiedNow++;
    }

    q.simultaneousHoldCount = occupiedNow;
    // Одновременное удержание нескольких кругов даёт кооперативный бонус скорости захвата ×1.65!
    const syncMultiplier = occupiedNow >= q.circles.length ? 1.65 : occupiedNow >= 2 ? 1.35 : 1.0;

    let sumCharge = 0;
    for (let i = 0; i < q.circles.length; i++) {
      const c = q.circles[i];
      if (!c.captured) {
        // Базовый темп + быстрый заряд при удержании круга (снятие печати за 15–22 с)
        const chargeRate = (c.isOccupied ? 0.21 * syncMultiplier : 0.042) * dt;
        c.charge = Math.min(1, c.charge + chargeRate);
        if (c.charge >= 1) {
          c.captured = 1;
          playSound('pickup');
          spawnWaveRingEffect(c.x, c.y + 0.15, c.z, 3.2, 0x40ff98);
          spawnSparkBurst(c.x, c.y + 0.5, c.z, 18, 'xp');
        }
      }
      if (c.captured) capturedCount++;
      sumCharge += c.charge;

      // 3D-анимация рунного круга
      c.outerRing.rotation.z = time * (c.isOccupied ? 2.4 : 0.9) + i;
      c.innerDisc.scale.setScalar(0.15 + 0.85 * c.charge);
      c.crystal.position.y = 1.0 + c.charge * 1.35 + Math.sin(time * 4 + i) * 0.12;
      c.crystal.rotation.y = time * 2.2;
      if (c.captured) {
        c.outerMat.color.setHex(0x40ff98);
        c.innerMat.color.setHex(0x40ff98);
        c.pillarMat.opacity = 0.08;
      } else if (c.isOccupied) {
        c.outerMat.color.setHex(0xffd24c);
        c.pillarMat.opacity = 0.34;
      } else {
        c.outerMat.color.setHex(0x38ffe8);
        c.pillarMat.opacity = 0.18;
      }
    }

    q.progress = Math.min(1, sumCharge / Math.max(1, q.circles.length));
    if (capturedCount >= q.circles.length || q.progress >= 1 || q.elapsed >= q.maxDuration) {
      completeFloorMiniQuest();
    }
  } else if (q.type === 'seal_guardians') {
    let aliveGuardians = 0;
    for (let i = 0; i < q.guardianEntries.length; i++) {
      const entry = q.guardianEntries[i];
      const e = entry.enemy;
      const stillInList = e && e.hp > 0 && state.enemies.includes(e);
      if (stillInList) {
        aliveGuardians++;
        entry.markerGroup.visible = true;
        entry.markerGroup.position.set(e.x, e.y + (e.radius || 1.2) * 2.1 + 1.1, e.z);
        entry.haloRing.rotation.z = time * 2.5 + i;
        entry.sigilGem.rotation.y = -time * 3.0;
        entry.sigilGem.position.y = 0.65 + Math.sin(time * 5 + i) * 0.15;
      } else {
        entry.markerGroup.visible = false;
      }
    }

    const slainByCount = Math.max(q.guardiansKilled, q.guardiansTotal - aliveGuardians);
    q.guardiansKilled = slainByCount;
    const timeAssist = Math.min(0.99, q.elapsed / q.maxDuration);
    q.progress = Math.min(
      1,
      Math.max(slainByCount / Math.max(1, q.guardiansTotal), timeAssist * 0.85)
    );

    if (aliveGuardians === 0 || q.guardiansKilled >= q.guardiansTotal || q.elapsed >= q.maxDuration) {
      completeFloorMiniQuest();
    }
  } else if (q.type === 'forge_core' && q.core) {
    const core = q.core;

    // Если игрок нажал F или подошёл вплотную к свободному (или несомому союзником) Ядру горна
    const distPlayerToCore = hypot2D(player.x - core.x, player.z - core.z);
    if (isPlayerAlive) {
      if (core.carrier === null && distPlayerToCore < 2.6 && Math.abs(player.y - core.y) < 3.0) {
        core.carrier = 'player';
        playSound('pickup');
        showToast(
          '🔥 Вы несёте «Ядро горна»! Скорость −32%, атака отключена — союзники вас прикрывают! (F — передать союзнику)',
          3.2
        );
      } else if (keysPressed.interactCore) {
        keysPressed.interactCore = 0;
        if (core.carrier === 'player' && state.coopPeers.length > 0) {
          const nearPeer = state.coopPeers.find(
            (p) => !p.ember || (!p.ember.active && !p.ember.lostInLava)
          );
          if (nearPeer) {
            core.carrier = nearPeer;
            showToast('🛡 Ядро горна передано союзнику (' + nearPeer.name + ') — прикрывайте его огнём!', 2.6);
          }
        } else if (core.carrier !== 'player' && distPlayerToCore < 3.8) {
          core.carrier = 'player';
          showToast('🔥 Вы перехватили «Ядро горна» — несите его к лестнице!', 2.4);
        }
      }
    } else if (core.carrier === 'player') {
      core.carrier = null;
    }
    keysPressed.interactCore = 0;

    // Если игрок не подобрал Ядро в течение 4 секунд (или занят боем), ближайший живой союзник берёт Ядро и несёт к лестнице
    if (core.carrier === null && q.elapsed > 4.0 && state.coopPeers.length > 0) {
      for (let pi = 0; pi < state.coopPeers.length; pi++) {
        const peer = state.coopPeers[pi];
        if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
        if (hypot2D(peer.x - core.x, peer.z - core.z) < 2.8) {
          core.carrier = peer;
          showToast('🛡 ' + peer.name + ' поднял «Ядро горна» и несёт к лестнице — прикрывайте его!', 2.8);
          break;
        }
      }
    }

    // Обновление позиции Ядра горна
    if (core.carrier === 'player') {
      state.isCarryingForgeCore = 1;
      core.x = player.x;
      core.y = player.y;
      core.z = player.z;
    } else if (core.carrier && typeof core.carrier === 'object') {
      state.isCarryingForgeCore = 0;
      const peer = core.carrier;
      if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) {
        core.carrier = null;
      } else {
        core.x = peer.x;
        core.y = peer.y;
        core.z = peer.z;
      }
    } else {
      state.isCarryingForgeCore = 0;
    }

    // Защитный тепловой импульс Ядра горна каждые 1.8 с вокруг носителя
    if (core.carrier !== null) {
      core.heatPulseTimer -= dt;
      if (core.heatPulseTimer <= 0) {
        core.heatPulseTimer = 1.8;
        spawnWaveRingEffect(core.x, core.y + 0.25, core.z, 3.6, 0xff9820);
        for (let ei = 0; ei < state.enemies.length; ei++) {
          const e = state.enemies[ei];
          if (hypot2D(e.x - core.x, e.z - core.z) < 3.8 && Math.abs(e.y - core.y) < 3.0) {
            damageEnemy(e, BASE_DAMAGE * 0.45, ['fire'], 1);
          }
        }
      }
    }

    core.coreGroup.position.set(
      core.x,
      core.y + (core.carrier ? 2.15 : 1.0) + Math.sin(time * 4.5) * 0.1,
      core.z
    );
    core.gyroRing1.rotation.y = time * 2.8;
    core.gyroRing1.rotation.x = time * 1.4;
    core.gyroRing2.rotation.z = -time * 2.4;
    core.escortAuraRing.rotation.z = time * 1.2;
    core.socketRing.rotation.z = -time * 1.8;

    const remDist = hypot2D(core.x - core.socketX, core.z - core.socketZ);
    const distProgress = Math.max(0, Math.min(1, 1 - remDist / core.totalDist));
    q.progress = Math.max(distProgress, Math.min(0.99, (q.elapsed / q.maxDuration) * 0.9));

    if (remDist <= 3.6 || q.elapsed >= q.maxDuration) {
      triggerShockwave(core.socketX, core.socketZ, 7.5, BASE_DAMAGE * 2.5, 1, ['fire', 'kin']);
      completeFloorMiniQuest();
    }
  }
}

/* ---------- 2. Кооперативные события этажей («Связующая цепь» и «Полярный резонанс») ---------- */

function clearCoopEventVisuals() {
  coopEventVisualGroup.clear();
}

function setupCoopEventVisuals(ev) {
  coopEventVisualGroup.clear();
  if (!ev || !state) return;

  const floorY = state.maxFloorReached * 14;

  if (ev.key === 'chain') {
    const chainBeams = [];
    const linkCount = Math.max(1, state.coopPeers.length);
    for (let i = 0; i < linkCount; i++) {
      const beamGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 8);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x45fff0,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      coopEventVisualGroup.add(beamMesh);
      chainBeams.push({ mesh: beamMesh, mat: beamMat });
    }
    const radiusRing = new THREE.Mesh(
      new THREE.RingGeometry(9.65, 10.0, 48),
      new THREE.MeshBasicMaterial({
        color: 0x45fff0,
        transparent: true,
        opacity: 0.42,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    radiusRing.rotation.x = -Math.PI / 2;
    coopEventVisualGroup.add(radiusRing);
    ev.visuals = { chainBeams, radiusRing };
  } else if (ev.key === 'polar') {
    // Два противоположных полюса на краях арены
    const poleColors = [0x38f2ff, 0xff58e8];
    const poleCoords = [
      [ev.poleAX, ev.poleAZ],
      [ev.poleBX, ev.poleBZ]
    ];
    const poles = [];
    for (let p = 0; p < 2; p++) {
      const [px, pz] = poleCoords[p];
      const py = getGroundHeightAt(px, floorY + 1, pz);
      const safeY = py >= floorY - 2 ? py : floorY;
      const pGroup = new THREE.Group();
      pGroup.position.set(px, safeY + 0.06, pz);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(4.2, 4.85, 36),
        new THREE.MeshBasicMaterial({
          color: poleColors[p],
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      pGroup.add(ring);

      const columnGeo = new THREE.CylinderGeometry(3.8, 4.2, 5.5, 20, 1, true);
      columnGeo.translate(0, 2.75, 0);
      const column = new THREE.Mesh(
        columnGeo,
        new THREE.MeshBasicMaterial({
          color: poleColors[p],
          transparent: true,
          opacity: 0.2,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      pGroup.add(column);

      coopEventVisualGroup.add(pGroup);
      poles.push({ x: px, y: safeY, z: pz, group: pGroup, ring, column });
    }
    ev.visuals = { poles };
  }
}

function updateCoopFloorEventStep(ev, dt) {
  if (!state || !ev) return;
  const player = state.player;
  const time = state.elapsedTime;

  if (ev.key === 'chain') {
    // «Связующая цепь»: бонус +35% к урону, пока игроки держатся ближе 10 м друг от друга
    let linkedCount = 0;
    const visuals = ev.visuals;
    if (visuals && visuals.radiusRing) {
      visuals.radiusRing.position.set(player.x, player.y + 0.05, player.z);
      visuals.radiusRing.rotation.z = time * 0.6;
    }

    if (state.coopPeers.length === 0) {
      // В одиночном режиме цепь всегда активна вокруг игрока
      linkedCount = 1;
    } else {
      for (let i = 0; i < state.coopPeers.length; i++) {
        const peer = state.coopPeers[i];
        const beamEntry = visuals && visuals.chainBeams && visuals.chainBeams[i];
        if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) {
          if (beamEntry) beamEntry.mesh.visible = false;
          continue;
        }
        const dx = peer.x - player.x;
        const dy = peer.y - player.y;
        const dz = peer.z - player.z;
        const dist2D = hypot2D(dx, dz);
        const dist3D = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
        const isWithin10m = dist2D <= 10.0;
        if (isWithin10m) linkedCount++;

        if (beamEntry) {
          beamEntry.mesh.visible = true;
          beamEntry.mesh.position.set(
            (player.x + peer.x) * 0.5,
            (player.y + peer.y) * 0.5 + 0.95,
            (player.z + peer.z) * 0.5
          );
          beamEntry.mesh.scale.set(isWithin10m ? 1.15 : 0.45, dist3D, isWithin10m ? 1.15 : 0.45);
          const dir = new THREE.Vector3(dx / dist3D, dy / dist3D, dz / dist3D);
          beamEntry.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          beamEntry.mat.color.setHex(isWithin10m ? 0x45fff0 : 0xff3848);
          beamEntry.mat.opacity = isWithin10m ? 0.82 + Math.sin(time * 12 + i) * 0.15 : 0.35;
        }
      }
    }

    state.isTetherChainActive = linkedCount > 0 ? 1 : 0;
    if (visuals && visuals.radiusRing) {
      visuals.radiusRing.material.color.setHex(state.isTetherChainActive ? 0x45fff0 : 0xff3848);
    }

    // Электрический урон врагам, пересекающим активную Связующую цепь между игроками
    ev.actionTimer -= dt;
    if (state.isTetherChainActive && ev.actionTimer <= 0) {
      ev.actionTimer = 0.55;
      for (let pi = 0; pi < state.coopPeers.length; pi++) {
        const peer = state.coopPeers[pi];
        if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
        if (hypot2D(peer.x - player.x, peer.z - player.z) > 10.0) continue;
        const midX = (player.x + peer.x) * 0.5;
        const midZ = (player.z + peer.z) * 0.5;
        for (let ei = 0; ei < state.enemies.length; ei++) {
          const e = state.enemies[ei];
          if (hypot2D(e.x - midX, e.z - midZ) < 4.5 && Math.abs(e.y - player.y) < 3.0) {
            damageEnemy(e, BASE_DAMAGE * 0.38, ['elec'], 0, 1);
            spawnSparkBurst(e.x, e.y + 0.7, e.z, 5, 'xp');
          }
        }
      }
    }
  } else if (ev.key === 'polar') {
    // «Полярный резонанс»: нужно держаться на противоположных концах арены
    let maxSeparation = 0;
    let oppositeHold = 0;
    const minOppositeDist = Math.max(18, TOWER_FLOOR_RADIUS * 0.78);

    if (state.coopPeers.length === 0) {
      // В соло-режиме достаточно держаться у внешнего края арены
      maxSeparation = hypot2D(player.x, player.z) * 2;
      oppositeHold = maxSeparation >= minOppositeDist ? 1 : 0;
    } else {
      for (let i = 0; i < state.coopPeers.length; i++) {
        const peer = state.coopPeers[i];
        if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
        const sep = hypot2D(player.x - peer.x, player.z - peer.z);
        if (sep > maxSeparation) maxSeparation = sep;
        // Проверяем нахождение в противоположных полушариях арены или у полюсов A и B
        const dot = player.x * peer.x + player.z * peer.z;
        if (sep >= minOppositeDist || (dot < -35 && sep >= minOppositeDist * 0.75)) {
          oppositeHold = 1;
        }
      }
    }

    state.isPolarResonanceActive = oppositeHold;
    state.polarSeparationMeters = maxSeparation;

    if (ev.visuals && ev.visuals.poles) {
      for (let p = 0; p < ev.visuals.poles.length; p++) {
        const pole = ev.visuals.poles[p];
        pole.ring.rotation.z = time * (oppositeHold ? 2.5 : 0.8) * (p === 0 ? 1 : -1);
        pole.column.material.opacity = oppositeHold ? 0.35 : 0.16;
      }
    }

    if (oppositeHold) {
      ev.resonancePulseTimer = (ev.resonancePulseTimer || 2.4) - dt;
      if (ev.resonancePulseTimer <= 0) {
        ev.resonancePulseTimer = 2.4;
        triggerShockwave(player.x, player.z, 6.0, BASE_DAMAGE * 0.75, 0, ['elec', 'kin']);
      }
    }
  }
}

/* ---------- 3. Механика возрождения «Угасающий уголь» (3 с в круге / после победы над боссом) ---------- */

/**
 * Переводит игрока при hp <= 0 в состояние «Угасающего угля» на ближайшей плите выше лавы.
 * Возвращает true, если уголь создан (есть живые союзники), или false, если вся команда пала.
 */
function triggerPlayerFadingEmberOrGameOver() {
  if (!state) return false;
  if ((state.playerCount || 1) <= 1) {
    return false;
  }

  // Проверяем, остался ли хотя бы один живой союзник, способный раздуть уголь или победить босса
  const hasLivingAlly = state.coopPeers.some(
    (p) => !p.ember || (!p.ember.active && !p.ember.lostInLava)
  );
  if (!hasLivingAlly) {
    return false;
  }

  if (state.playerEmber && (state.playerEmber.active || state.playerEmber.lostInLava)) {
    return true;
  }

  const safeSlab =
    typeof findNearestSafeSlabAboveLava === 'function'
      ? findNearestSafeSlabAboveLava(state.player.x, state.player.y, state.player.z, 1.0)
      : { x: state.player.x, y: Math.max(state.player.lastGroundY, state.lavaY + 2), z: state.player.z };

  const meshGroup = createFadingEmberVisualMesh(0xff6a18);
  meshGroup.position.set(safeSlab.x, safeSlab.y, safeSlab.z);

  state.player.hp = 0;
  state.player.x = safeSlab.x;
  state.player.y = safeSlab.y;
  state.player.z = safeSlab.z;
  state.player.vy = 0;
  state.player.lastGroundY = safeSlab.y;
  state.isCarryingForgeCore = 0;
  if (state.floorQuest && state.floorQuest.core && state.floorQuest.core.carrier === 'player') {
    state.floorQuest.core.carrier = null;
  }

  state.playerEmber = {
    active: 1,
    lostInLava: 0,
    x: safeSlab.x,
    y: safeSlab.y,
    z: safeSlab.z,
    progress: 0,
    required: (typeof FADING_EMBER_CONFIG !== 'undefined' && FADING_EMBER_CONFIG.reviveChannelTime) || 3.0,
    meshGroup
  };

  playSound('hurt');
  spawnWaveRingEffect(safeSlab.x, safeSlab.y + 0.2, safeSlab.z, 3.2, 0xff6a18);
  showToast(
    '🕯 Вы стали «Угасающим углём» на ближайшей плите! Союзник раздует пламя за 3 сек. удержания круга!',
    4.0
  );
  return true;
}

/**
 * Переводит павшего союзника в состояние «Угасающего угля» на ближайшей плите выше лавы.
 */
function triggerPeerFadingEmber(peer) {
  if (!state || !peer || (peer.ember && (peer.ember.active || peer.ember.lostInLava))) return;

  const safeSlab =
    typeof findNearestSafeSlabAboveLava === 'function'
      ? findNearestSafeSlabAboveLava(peer.x, peer.y, peer.z, 1.0)
      : { x: peer.x, y: Math.max(peer.y, state.lavaY + 2), z: peer.z };

  const tintHex = (peer.mesh && peer.mesh.userData && peer.mesh.userData.tintHex) || 0x38f2dc;
  const meshGroup = createFadingEmberVisualMesh(tintHex);
  meshGroup.position.set(safeSlab.x, safeSlab.y, safeSlab.z);

  peer.hp = 0;
  peer.x = safeSlab.x;
  peer.y = safeSlab.y;
  peer.z = safeSlab.z;
  if (peer.mesh) peer.mesh.visible = false;

  peer.ember = {
    active: 1,
    lostInLava: 0,
    x: safeSlab.x,
    y: safeSlab.y,
    z: safeSlab.z,
    progress: 0,
    required: (typeof FADING_EMBER_CONFIG !== 'undefined' && FADING_EMBER_CONFIG.reviveChannelTime) || 3.0,
    meshGroup
  };

  spawnWaveRingEffect(safeSlab.x, safeSlab.y + 0.2, safeSlab.z, 3.0, tintHex);
  showToast(
    '🕯 ' + peer.name + ' стал «Угасающим углём»! Встаньте в его круг на 3 сек., чтобы возродить!',
    3.6
  );
}

/**
 * Обновляет все активные «Угасающие угли» (игрока и союзников):
 * - 3 секунды удержания круга союзником возрождают павшего;
 * - если уголь уходит под лаву (state.lavaY > ember.y + 0.35), погибший ждёт победы отряда над ближайшим боссом.
 */
function updateFadingEmbersStep(dt) {
  if (!state) return;
  const player = state.player;
  const time = state.elapsedTime;
  const reviveRadius =
    (typeof FADING_EMBER_CONFIG !== 'undefined' && FADING_EMBER_CONFIG.reviveRadius) || 3.0;
  const reviveHpFrac =
    (typeof FADING_EMBER_CONFIG !== 'undefined' && FADING_EMBER_CONFIG.reviveHpFraction) || 0.55;

  // 1. Обновление «Угасающего угля» локального игрока
  if (state.playerEmber) {
    const pEmber = state.playerEmber;
    if (pEmber.active) {
      // Проверка ухода угля под уровень лавы
      if (state.lavaY > pEmber.y + 0.35) {
        pEmber.active = 0;
        pEmber.lostInLava = 1;
        if (pEmber.meshGroup) pEmber.meshGroup.visible = false;
        showToast(
          '🌋 Ваш «Угасающий уголь» ушёл под лаву! Вы вернётесь в строй после победы команды над ближайшим боссом.',
          4.5
        );
      } else {
        // Проверяем, стоит ли живой союзник в круге угля (радиус 3.0 м)
        let allyChanneling = 0;
        for (let i = 0; i < state.coopPeers.length; i++) {
          const peer = state.coopPeers[i];
          if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
          if (
            Math.abs(peer.y - pEmber.y) < 3.0 &&
            hypot2D(peer.x - pEmber.x, peer.z - pEmber.z) <= reviveRadius + 0.3
          ) {
            allyChanneling++;
          }
        }

        if (allyChanneling > 0) {
          pEmber.progress += dt * (1 + (allyChanneling - 1) * 0.35);
          if (Math.random() < 0.35) {
            spawnSparkBurst(pEmber.x, pEmber.y + 0.6, pEmber.z, 2, 'fire');
          }
        } else {
          pEmber.progress = Math.max(0, pEmber.progress - dt * 0.25);
        }

        // Анимация 3D-модели угля игрока
        if (pEmber.meshGroup && pEmber.meshGroup.userData) {
          const ud = pEmber.meshGroup.userData;
          const ratio = Math.min(1, pEmber.progress / pEmber.required);
          ud.coalCore.rotation.y = time * 2.2;
          ud.coalCore.position.y = 0.65 + ratio * 0.55 + Math.sin(time * 5) * 0.08;
          ud.outerRing.rotation.z = time * (allyChanneling ? 2.6 : 0.9);
          ud.fillDisc.scale.setScalar(0.1 + 0.9 * ratio);
        }

        if (pEmber.progress >= pEmber.required) {
          // Возрождение игрока!
          if (pEmber.meshGroup) {
            fadingEmberGroup.remove(pEmber.meshGroup);
          }
          player.x = pEmber.x;
          player.y = pEmber.y + 0.05;
          player.z = pEmber.z;
          player.vy = 0;
          player.lastGroundY = pEmber.y;
          player.hp = Math.round(state.maxHp * reviveHpFrac);
          state.invulnerabilityTimer = 2.5;
          state.playerEmber = null;
          playSound('win');
          triggerShockwave(player.x, player.z, 6.5, BASE_DAMAGE * 2.0, 1, ['fire', 'kin']);
          spawnSparkBurst(player.x, player.y + 0.8, player.z, 30, 'fire');
          showToast('🔥 Союзник раздул ваш «Угасающий уголь»! Вы снова в бою!', 3.2);
        }
      }
    } else if (pEmber.lostInLava) {
      // Пока уголь игрока под лавой, камера следует за ведущим живым союзником, который идёт к боссу
      const leadAlly = state.coopPeers.find(
        (p) => !p.ember || (!p.ember.active && !p.ember.lostInLava)
      );
      if (leadAlly) {
        player.x += (leadAlly.x - player.x) * Math.min(1, dt * 5);
        player.y += (leadAlly.y - player.y) * Math.min(1, dt * 5);
        player.z += (leadAlly.z - player.z) * Math.min(1, dt * 5);
        player.lastGroundY = leadAlly.y;
      } else {
        // Все союзники тоже погибли
        finishRun(0);
        return;
      }
    }
  }

  // 2. Обновление «Угасающих углей» союзников
  const isPlayerAlive = !state.playerEmber || (!state.playerEmber.active && !state.playerEmber.lostInLava);
  for (let i = 0; i < state.coopPeers.length; i++) {
    const peer = state.coopPeers[i];
    if (!peer.ember) continue;
    const emb = peer.ember;

    if (emb.active) {
      if (state.lavaY > emb.y + 0.35) {
        emb.active = 0;
        emb.lostInLava = 1;
        if (emb.meshGroup) emb.meshGroup.visible = false;
        showToast(
          '🌋 «Угасающий уголь» (' +
            peer.name +
            ') ушёл под лаву! Союзник вернётся после победы над ближайшим боссом.',
          3.6
        );
        continue;
      }

      let revivers = 0;
      if (
        isPlayerAlive &&
        Math.abs(player.y - emb.y) < 3.0 &&
        hypot2D(player.x - emb.x, player.z - emb.z) <= reviveRadius
      ) {
        revivers++;
      }
      for (let j = 0; j < state.coopPeers.length; j++) {
        if (i === j) continue;
        const other = state.coopPeers[j];
        if (other.ember && (other.ember.active || other.ember.lostInLava)) continue;
        if (
          Math.abs(other.y - emb.y) < 3.0 &&
          hypot2D(other.x - emb.x, other.z - emb.z) <= reviveRadius + 0.2
        ) {
          revivers++;
        }
      }

      if (revivers > 0) {
        emb.progress += dt * (1 + (revivers - 1) * 0.35);
        if (Math.random() < 0.35) {
          spawnSparkBurst(emb.x, emb.y + 0.6, emb.z, 2, 'xp');
        }
      } else {
        emb.progress = Math.max(0, emb.progress - dt * 0.2);
      }

      if (emb.meshGroup && emb.meshGroup.userData) {
        const ud = emb.meshGroup.userData;
        const ratio = Math.min(1, emb.progress / emb.required);
        ud.coalCore.rotation.y = time * 2.2 + i;
        ud.coalCore.position.y = 0.65 + ratio * 0.55 + Math.sin(time * 5 + i) * 0.08;
        ud.outerRing.rotation.z = time * (revivers ? 2.6 : 0.9);
        ud.fillDisc.scale.setScalar(0.1 + 0.9 * ratio);
      }

      if (emb.progress >= emb.required) {
        if (emb.meshGroup) {
          fadingEmberGroup.remove(emb.meshGroup);
        }
        peer.ember = null;
        peer.hp = peer.maxHp * 0.65;
        peer.invulnerabilityTimer = 2.5;
        peer.x = emb.x;
        peer.y = emb.y;
        peer.z = emb.z;
        if (peer.mesh) peer.mesh.visible = true;
        playSound('win');
        spawnWaveRingEffect(peer.x, peer.y + 0.2, peer.z, 4.0, 0x38ffe8);
        spawnSparkBurst(peer.x, peer.y + 0.8, peer.z, 22, 'xp');
        showToast('🔥 «Угасающий уголь» раздут — ' + peer.name + ' возвращается в строй!', 2.8);
      }
    }
  }

  // Если и игрок, и все союзники пали / ушли под лаву — конец забега
  if (state.playerEmber && (state.playerEmber.active || state.playerEmber.lostInLava)) {
    const anyAllyAlive = state.coopPeers.some(
      (p) => !p.ember || (!p.ember.active && !p.ember.lostInLava)
    );
    if (!anyAllyAlive) {
      finishRun(0);
    }
  }
}

/**
 * Возрождает всех павших игроков и союзников (включая тех, чей «Угасающий уголь» ушёл под лаву)
 * сразу после победы команды над ближайшим боссом.
 */
function reviveAllFallenEmbersOnBossVictory() {
  if (!state) return 0;
  let revivedCount = 0;
  const reviveFrac =
    (typeof FADING_EMBER_CONFIG !== 'undefined' &&
      FADING_EMBER_CONFIG.bossVictoryReviveHpFraction) ||
    0.65;

  const safeSlab =
    typeof findNearestSafeSlabAboveLava === 'function'
      ? findNearestSafeSlabAboveLava(state.player.x, state.player.y, state.player.z, 1.2)
      : { x: state.player.x, y: state.player.lastGroundY, z: state.player.z };

  if (state.playerEmber) {
    if (state.playerEmber.meshGroup) {
      fadingEmberGroup.remove(state.playerEmber.meshGroup);
    }
    state.playerEmber = null;
    state.player.x = safeSlab.x;
    state.player.y = safeSlab.y + 0.05;
    state.player.z = safeSlab.z;
    state.player.vy = 0;
    state.player.lastGroundY = safeSlab.y;
    state.player.hp = Math.round(state.maxHp * reviveFrac);
    state.invulnerabilityTimer = 3.0;
    revivedCount++;
  }

  for (let i = 0; i < state.coopPeers.length; i++) {
    const peer = state.coopPeers[i];
    if (peer.ember) {
      if (peer.ember.meshGroup) {
        fadingEmberGroup.remove(peer.ember.meshGroup);
      }
      peer.ember = null;
      peer.hp = peer.maxHp * reviveFrac;
      peer.invulnerabilityTimer = 3.0;
      peer.x = safeSlab.x + Math.cos(i * 2.1) * 2.2;
      peer.y = safeSlab.y;
      peer.z = safeSlab.z + Math.sin(i * 2.1) * 2.2;
      if (peer.mesh) peer.mesh.visible = true;
      revivedCount++;
    } else {
      peer.hp = Math.min(peer.maxHp, peer.hp + peer.maxHp * 0.35);
    }
  }

  if (revivedCount > 0) {
    spawnWaveRingEffect(safeSlab.x, safeSlab.y + 0.2, safeSlab.z, 5.2, 0xffaa30);
    spawnSparkBurst(safeSlab.x, safeSlab.y + 1.0, safeSlab.z, 32, 'gold');
  }
  return revivedCount;
}

/* ---------- 4. Инициализация забега и кооперативный ИИ союзников ---------- */

/**
 * Инициализирует новое состояние забега (стандартного, кооперативного 2–4 игрока или ежедневного).
 * @param {number} mode 0 — стандартный забег, 1 — рейтинг дня
 */
function initializeRun(mode) {
  releaseAllEnemies();
  releaseAllGlobalBolts();
  coopAlliesGroup.clear();
  floorQuestGroup.clear();
  coopEventVisualGroup.clear();
  fadingEmberGroup.clear();
  if (state) {
    state.projectiles.length = 0;
    state.bladePositions.length = 0;
  }

  const dateCode = getCurrentDateCode();
  const seed = mode
    ? hashString('lava' + dateCode)
    : crypto.getRandomValues(new Uint32Array(1))[0];

  const playerCount =
    typeof selectedPlayerCount !== 'undefined' && selectedPlayerCount >= 1
      ? selectedPlayerCount
      : 2;
  const campaignModeId = mode
    ? 'acts3_24'
    : (typeof selectedCampaignModeId !== 'undefined' && selectedCampaignModeId) || 'acts3_24';
  const campaignCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[campaignModeId]) ||
    RUN_CAMPAIGN_MODES.acts3_24;

  configureTowerSpatialScale(playerCount, campaignModeId);

  state = {
    mode,
    seed,
    dateCode,
    playerCount,
    campaignModeId,
    isThreeActRun: !!campaignCfg.isThreeAct,
    totalFloors: campaignCfg.totalFloors || 24,
    elapsedTime: 0,
    player: {
      x: 0,
      y: 0.01,
      z: 0,
      vy: 0,
      isGrounded: 0,
      doubleJumpsUsed: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      slideDirX: 0,
      slideDirZ: 0,
      hp: 100,
      lastGroundY: 0,
      iceVelocityX: 0,
      iceVelocityZ: 0
    },
    coopPeers: [],
    playerEmber: null,
    floorQuest: null,
    isCarryingForgeCore: 0,
    isTetherChainActive: 0,
    isPolarResonanceActive: 0,
    polarSeparationMeters: 0,
    isOnBalcony: 0,
    isLavaPausedByForgeHall: 0,
    activeForgeHallFloor: -1,
    forgeHallReadyCount: 0,
    cameraYaw: 0,
    cameraPitch: 0.35,
    lavaY: -10,
    lavaSpeedMultiplier: 1,
    maxHpMultiplier: 1,
    damageMultiplier: 1,
    gravity: 24,
    disableDoubleJump: 0,
    maxFloorReached: 0,
    lastAnnouncedFloor: 0,
    level: 1,
    xp: 0,
    kills: 0,
    bossesDefeated: 0,
    slideTimer: 0,
    slideCooldown: 0,
    facingAngle: 0,
    bossFuryLavaMultiplier: 1,
    weaponLevels: {},
    itemsOwned: {},
    tomeLevels: { hp: 0, spd: 0, dmg: 0, mag: 0 },
    weaponCooldowns: {},
    tagCounts: {},
    enemies: [],
    projectiles: [],
    bladePositions: [],
    activeBladeCount: 0,
    spawnBudget: 10,
    waveIndexByFloor: {},
    bossSpawnedByFloor: {},
    totalHitCount: 0,
    bladeTickTimer: 0,
    bladeOrbitAngle: 0,
    bladeTickId: 0,
    fireMuzzleFlash: 0,
    pauseState: 0,
    isGameOver: 0,
    mutatorName: null,
    frameCount: 0,
    screenShake: 0,
    invulnerabilityTimer: 0,
    timeSinceLastHit: 0,
    gold: 0,
    pickups: [],
    activeBombs: [],
    chestsOpened: 0,
    toastTimer: 0,
    hintCooldown: 0,
    currentOfferChestKey: 0
  };

  for (let i = 0; i < 12; i++) {
    state.bladePositions.push([0, 0]);
  }

  if (mode) {
    const mutIdx = Math.floor(seededRandom(seed, 'mut', 0) * MUTATORS.length);
    MUTATORS[mutIdx].apply(state);
    state.mutatorName = MUTATORS[mutIdx].name;
  }

  const heroId = mode ? 'wan' : selectedHeroId;
  const heroCfg = HEROES[heroId];
  const initialTowerId = state.isThreeActRun
    ? 'ash'
    : mode
      ? TOWER_IDS[Math.floor(seededRandom(seed, 'twr', 0) * 3)]
      : selectedTowerId;

  state.heroId = heroId;
  state.towerId = initialTowerId;
  state.towerConfig = TOWERS[initialTowerId];
  state.standingStillTime = 0;
  state.chosenRoute = 0;

  state.unscaledBaseGravity = state.gravity;
  if (state.towerConfig.gravityMul) {
    state.gravity *= state.towerConfig.gravityMul;
  }
  state.baseGravity = state.gravity;
  state.puddleSizzleCooldown = 0;
  state.isStandingInLavaPuddle = 0;
  state.towerStorm = {
    active: 0,
    blend: 0,
    timer: 0,
    duration: 11,
    cooldown: 18
  };
  window.menuStormPreviewActive = 0;
  window.menuStormPreviewFactor = 0;

  state.maxExtraJumps = heroId === 'pil' ? 2 : 1;
  state.chestCostMultiplier = heroId === 'smi' ? 0.7 : 1;
  state.activeEvent = null;
  state.playerSpeedMultiplier = 1;
  state.enemySpeedMultiplier = 1;
  state.isGreedPactActive = 0;
  state.currentPactOffers = null;

  const startingWeapon = mode
    ? ['fire', 'blade', 'wave'][Math.floor(seededRandom(seed, 'hero', 0) * 3)]
    : heroCfg.startWeapon;
  state.weaponLevels[startingWeapon] = 1;

  if (heroId === 'pil') {
    state.maxHpMultiplier *= 0.8;
  }
  if (heroId === 'smi') {
    state.itemsOwned.coal = 1;
    for (const tag of ITEMS.coal.tags) {
      state.tagCounts[tag] = (state.tagCounts[tag] || 0) + 1;
    }
  }

  state.activeBossCount = 0;
  state.chillTimer = 0;
  state.vortexPull = null;

  state.maxHpMultiplier *= 1 + 0.05 * (metaProgress.forge.hp | 0);
  state.damageMultiplier *= 1 + 0.04 * (metaProgress.forge.dmg | 0);
  state.playerSpeedMultiplier *= 1 + 0.03 * (metaProgress.forge.spd | 0);
  state.pickupRadiusMultiplier = 1 + 0.12 * (metaProgress.forge.mag | 0);
  state.gold += 3 * (metaProgress.forge.gld | 0);
  state.rerollsLeft = 1 + (metaProgress.forge.rr | 0);
  state.rerollCount = 0;

  state.maxHp = 100 * state.maxHpMultiplier;
  state.player.hp = state.maxHp;

  // Создаём симулируемых кооп-союзников (для 2–4 игроков), которые выполняют мини-квесты печатей,
  // разделяются на развилках, занимают балконы, поддерживают кооп-события и раздувают «Угасающий уголь»
  const allyColors = [0x38f2dc, 0xffb838, 0xc868ff];
  const allyNames = ['Союзник 2 (Снайпер)', 'Союзник 3 (Штурмовик)', 'Союзник 4 (Страж)'];
  for (let pIdx = 1; pIdx < playerCount; pIdx++) {
    const startAng = (pIdx / playerCount) * TWO_PI;
    const mesh = buildCoopAllyAvatarMesh(allyColors[(pIdx - 1) % allyColors.length]);
    const ax = Math.cos(startAng) * 3.2;
    const az = Math.sin(startAng) * 3.2;
    mesh.position.set(ax, 0.01, az);
    coopAlliesGroup.add(mesh);
    state.coopPeers.push({
      id: pIdx + 1,
      name: allyNames[(pIdx - 1) % allyNames.length],
      x: ax,
      y: 0.01,
      z: az,
      vy: 0,
      hp: 110,
      maxHp: 110,
      invulnerabilityTimer: 0,
      ember: null,
      facingAngle: startAng,
      sectorRoute: (pIdx % 2) + 1,
      prefersBalcony: pIdx === 1 ? 1 : 0,
      shootCooldown: 0.4 * pIdx,
      onReadyPlate: 0,
      mesh
    });
  }

  applyTowerTheme(state.towerConfig);
  buildTower(seed, playerCount, campaignModeId);

  // Запускаем стартовый командный мини-квест малой печати на 1-м этаже (индекс 0)
  const q0 = startFloorMiniQuest(0);
  const scaleInfo = COOP_SCALE_PRESETS[playerCount] || COOP_SCALE_PRESETS[2];
  const questLabel =
    q0 && FLOOR_MINI_QUESTS[q0.type] ? ' · 🔒 Печать: ' + FLOOR_MINI_QUESTS[q0.type].shortName : '';
  showToast(
    (state.isThreeActRun ? '3 Акта (' + GRID_FLOORS + ' эт.)' : state.towerConfig.name) +
      ' · ' +
      scaleInfo.label +
      questLabel,
    4.2
  );
  resetBossEffects();
}

/**
 * Обновляет движение и действия кооперативных союзников:
 * - Приоритет 1: Раздувание «Угасающего угля» павшего игрока или союзника (3 с в круге)
 * - Приоритет 2: Сбор на Стартовой плите в безопасных «Залах Кузницы»
 * - Приоритет 3: Выполнение командного мини-квеста малой печати (захват рунных кругов, фокус Хранителей, переноска/прикрытие Ядра горна)
 * - Приоритет 4: Позиционирование под кооперативные события («Связующая цепь» <10 м или «Полярный резонанс» на противоположном краю)
 * - Приоритет 5: Разделение по полукольцам развилок (split_ring) и занятие снайперских балконов (floorY + 6)
 */
function updateCoopPeersStep(dt) {
  if (!state || !state.coopPeers || !state.coopPeers.length) return;
  const player = state.player;
  const isPlayerEmberActive = !!(state.playerEmber && state.playerEmber.active);
  const isPlayerLostInLava = !!(state.playerEmber && state.playerEmber.lostInLava);

  let activeFloor = Math.min(
    GRID_FLOORS - 1,
    Math.max(0, Math.floor(player.lastGroundY / 14 + 0.07))
  );
  const activeForgeHall =
    state.isLavaPausedByForgeHall && state.activeForgeHallFloor >= 0
      ? forgeHallsByFloor[state.activeForgeHallFloor]
      : null;

  for (let i = 0; i < state.coopPeers.length; i++) {
    const peer = state.coopPeers[i];
    peer.invulnerabilityTimer = Math.max(0, (peer.invulnerabilityTimer || 0) - dt);

    // Если союзник находится в состоянии «Угасающего угля», он не двигается и не стреляет
    if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) {
      if (peer.mesh) peer.mesh.visible = false;
      continue;
    }
    if (peer.mesh) peer.mesh.visible = true;

    // Регенерация здоровья живого союзника вне лавы
    if (peer.hp < peer.maxHp && peer.y > state.lavaY + 1) {
      peer.hp = Math.min(peer.maxHp, peer.hp + peer.maxHp * 0.025 * dt);
    }
    // Урон союзнику от лавы или врагов поблизости
    if (peer.y < state.lavaY) {
      peer.hp -= peer.maxHp * 0.14 * dt;
    }
    if (peer.invulnerabilityTimer <= 0 && state.enemies.length > 0) {
      const nearThreat = findNearestEnemy(1.6, peer.x, peer.z);
      if (nearThreat && Math.abs(nearThreat.y - peer.y) < 2.2) {
        peer.invulnerabilityTimer = 1.1;
        peer.hp -= nearThreat.type === 'b' ? 22 : 11;
      }
    }
    if (peer.hp <= 0) {
      triggerPeerFadingEmber(peer);
      continue;
    }

    let targetX = player.x;
    let targetY = player.lastGroundY;
    let targetZ = player.z;
    let moveSpeedCap = 8.6;

    // Проверка: нужно ли раздуть «Угасающий уголь» игрока или другого союзника
    const fallenPeerWithActiveEmber = state.coopPeers.find(
      (other) => other !== peer && other.ember && other.ember.active
    );

    if (isPlayerEmberActive) {
      const angleOffset = (i / state.coopPeers.length) * TWO_PI;
      targetX = state.playerEmber.x + Math.cos(angleOffset) * 1.1;
      targetY = state.playerEmber.y;
      targetZ = state.playerEmber.z + Math.sin(angleOffset) * 1.1;
      moveSpeedCap = 10.2;
    } else if (fallenPeerWithActiveEmber && i === 0) {
      targetX = fallenPeerWithActiveEmber.ember.x;
      targetY = fallenPeerWithActiveEmber.ember.y;
      targetZ = fallenPeerWithActiveEmber.ember.z;
      moveSpeedCap = 9.8;
    } else if (activeForgeHall && !activeForgeHall.isActivated) {
      // В Зале Кузницы союзники встают на Стартовую плиту (Ready Plate)
      const angleOffset = (i / state.coopPeers.length) * TWO_PI;
      targetX = activeForgeHall.readyX + Math.cos(angleOffset) * 1.4;
      targetY = activeForgeHall.readyY;
      targetZ = activeForgeHall.readyZ + Math.sin(angleOffset) * 1.4;
    } else if (isPlayerLostInLava) {
      // Если уголь игрока ушёл под лаву, выжившие союзники сами штурмуют башню до босса!
      const boss = state.enemies.find((e) => e.type === 'b');
      if (boss) {
        const orbitAng = state.elapsedTime * 0.7 + (i * TWO_PI) / state.coopPeers.length;
        targetX = boss.x + Math.cos(orbitAng) * 9.5;
        targetZ = boss.z + Math.sin(orbitAng) * 9.5;
        targetY = boss.y;
      } else if (
        state.floorQuest &&
        !state.floorQuest.completed &&
        state.floorQuest.floor === activeFloor
      ) {
        // Выполняют мини-квест печати, чтобы открыть лестницу к этажу босса
        const fq = state.floorQuest;
        if (fq.type === 'rune_circles' && fq.circles.length) {
          const unc = fq.circles.find((c) => !c.captured) || fq.circles[0];
          targetX = unc.x;
          targetY = unc.y;
          targetZ = unc.z;
        } else if (fq.type === 'forge_core' && fq.core) {
          if (!fq.core.carrier) {
            targetX = fq.core.x;
            targetY = fq.core.y;
            targetZ = fq.core.z;
          } else {
            targetX = fq.core.socketX;
            targetY = fq.core.socketY;
            targetZ = fq.core.socketZ;
          }
        }
      } else {
        // Поднимаются на следующий этаж к боссу
        const nextFloor = Math.min(GRID_FLOORS - 1, activeFloor + 1);
        targetY = nextFloor * 14;
        targetX = Math.cos(state.elapsedTime * 0.5 + i) * 8;
        targetZ = Math.sin(state.elapsedTime * 0.5 + i) * 8;
        state.maxFloorReached = Math.max(state.maxFloorReached, nextFloor);
      }
    } else if (
      state.floorQuest &&
      !state.floorQuest.completed &&
      state.floorQuest.floor === activeFloor
    ) {
      // Командное выполнение мини-квеста малой печати этажа
      const fq = state.floorQuest;
      if (fq.type === 'rune_circles' && fq.circles.length > 0) {
        // Каждый союзник занимает свой незахваченный рунный круг для синхронного захвата!
        const targetCircle =
          fq.circles[(i + 1) % fq.circles.length] && !fq.circles[(i + 1) % fq.circles.length].captured
            ? fq.circles[(i + 1) % fq.circles.length]
            : fq.circles.find((c) => !c.captured) || fq.circles[i % fq.circles.length];
        targetX = targetCircle.x + Math.cos(i * 1.9) * 0.8;
        targetY = targetCircle.y;
        targetZ = targetCircle.z + Math.sin(i * 1.9) * 0.8;
      } else if (fq.type === 'forge_core' && fq.core) {
        const core = fq.core;
        if (core.carrier === peer) {
          // Союзник-носитель несёт Ядро горна к лестнице (замедлен до 68%)
          targetX = core.socketX;
          targetY = core.socketY;
          targetZ = core.socketZ;
          moveSpeedCap = 5.4;
        } else if (core.carrier === 'player') {
          // Игрок несёт Ядро горна (без атаки) -> союзники берут его в плотное кольцо прикрытия!
          const guardAng = state.elapsedTime * 1.4 + (i * TWO_PI) / state.coopPeers.length;
          targetX = player.x + Math.cos(guardAng) * 3.2;
          targetZ = player.z + Math.sin(guardAng) * 3.2;
          targetY = player.lastGroundY;
          moveSpeedCap = 9.2;
        } else if (core.carrier === null && i === state.coopPeers.length - 1 && fq.elapsed > 3.5) {
          // Союзник-Страж идёт подобрать Ядро горна, если игрок занят боем
          targetX = core.x;
          targetY = core.y;
          targetZ = core.z;
        }
      } else if (fq.type === 'seal_guardians' && fq.guardianEntries.length > 0) {
        const aliveEntry = fq.guardianEntries.find(
          (ge) => ge.enemy && ge.enemy.hp > 0 && state.enemies.includes(ge.enemy)
        );
        if (aliveEntry) {
          const ge = aliveEntry.enemy;
          const orbitA = state.elapsedTime * 0.8 + i * 2.1;
          targetX = ge.x + Math.cos(orbitA) * 7.5;
          targetZ = ge.z + Math.sin(orbitA) * 7.5;
          targetY = activeFloor * 14;
        }
      }
    } else if (state.activeEvent && state.activeEvent.key === 'chain') {
      // Во время события «Связующая цепь» союзники держатся в радиусе 6.5–8.5 м от игрока (< 10 м для бонуса +35% урона)
      const chainAng = state.elapsedTime * 0.55 + ((i + 1) * TWO_PI) / (state.coopPeers.length + 1);
      targetX = player.x + Math.cos(chainAng) * 7.2;
      targetZ = player.z + Math.sin(chainAng) * 7.2;
      targetY = player.lastGroundY;
    } else if (state.activeEvent && state.activeEvent.key === 'polar') {
      // Во время «Полярного резонанса» союзники занимают противоположный от игрока полюс арены
      const ev = state.activeEvent;
      const distPlayerToA = hypot2D(player.x - ev.poleAX, player.z - ev.poleAZ);
      const distPlayerToB = hypot2D(player.x - ev.poleBX, player.z - ev.poleBZ);
      const usePoleB = distPlayerToA <= distPlayerToB;
      targetX = (usePoleB ? ev.poleBX : ev.poleAX) + Math.cos(i * 2.0) * 1.5;
      targetZ = (usePoleB ? ev.poleBZ : ev.poleAZ) + Math.sin(i * 2.0) * 1.5;
      targetY = activeFloor * 14;
    } else if (floorLayouts[activeFloor] === 'split_ring' && splitFloorConfigs[activeFloor]) {
      // На этаже после развилки союзники делятся между Зелёным и Красным полукольцами
      const cfg = splitFloorConfigs[activeFloor];
      const desiredSign = peer.sectorRoute === cfg.positiveRoute ? 1 : -1;
      const orbitR = TOWER_FLOOR_RADIUS * 0.62;
      const sweep = Math.sin(state.elapsedTime * 0.55 + i * 1.7) * 0.85;
      const secAngle = cfg.axisAngle + (desiredSign > 0 ? 0 : Math.PI) + sweep;
      targetX = Math.cos(secAngle) * orbitR;
      targetZ = Math.sin(secAngle) * orbitR;
      targetY = activeFloor * 14;
    } else {
      // На обычных этажах снайперский союзник занимает балкон (floorY + 6), а остальные держат широкий строй
      const floorBals = balconiesByFloor[activeFloor] || [];
      if (peer.prefersBalcony && floorBals.length > 0) {
        const bal = floorBals[i % floorBals.length];
        targetX = bal.centerX;
        targetY = bal.y;
        targetZ = bal.centerZ;
      } else {
        const spreadAngle = state.elapsedTime * 0.4 + ((i + 1) * TWO_PI) / (state.coopPeers.length + 1);
        const spreadDist = Math.min(14, TOWER_FLOOR_RADIUS * 0.34);
        targetX = player.x + Math.cos(spreadAngle) * spreadDist;
        targetZ = player.z + Math.sin(spreadAngle) * spreadDist;
        const rDist = hypot2D(targetX, targetZ);
        if (rDist > TOWER_FLOOR_RADIUS - 3) {
          targetX *= (TOWER_FLOOR_RADIUS - 3) / rDist;
          targetZ *= (TOWER_FLOOR_RADIUS - 3) / rDist;
        }
        targetY = getGroundHeightAt(targetX, player.lastGroundY + 1, targetZ);
        if (targetY < player.lastGroundY - 2) targetY = player.lastGroundY;
      }
    }

    const dx = targetX - peer.x;
    const dz = targetZ - peer.z;
    const dist = hypot2D(dx, dz);
    if (dist > 0.35) {
      const spd = Math.min(dist * 3.4, moveSpeedCap);
      peer.x += (dx / dist) * spd * dt;
      peer.z += (dz / dist) * spd * dt;
      peer.facingAngle = Math.atan2(dx, dz);
    }
    peer.y += (targetY - peer.y) * Math.min(1, dt * 6.5);

    if (peer.mesh) {
      peer.mesh.position.set(peer.x, peer.y, peer.z);
      peer.mesh.rotation.y = peer.facingAngle;
    }

    // Огневая поддержка союзника (если союзник сам не несёт тяжёлое Ядро горна)
    const isPeerCarryingCore =
      state.floorQuest && state.floorQuest.core && state.floorQuest.core.carrier === peer;
    const isEscortingPlayerCore =
      state.floorQuest && state.floorQuest.core && state.floorQuest.core.carrier === 'player';

    peer.shootCooldown -= dt * (isEscortingPlayerCore ? 1.55 : 1.0);
    if (
      !isPeerCarryingCore &&
      peer.shootCooldown <= 0 &&
      state.enemies.length > 0 &&
      state.projectiles.length < 220
    ) {
      const isPeerOnBalcony = Math.abs((peer.y % 14) - 6) < 1.2;
      // Приоритет по Хранителям печати и боссам
      let targetEnemy = state.enemies.find(
        (e) => (e.isSealGuardian || e.type === 'b') && hypot2D(e.x - peer.x, e.z - peer.z) < 34
      );
      if (!targetEnemy) {
        targetEnemy = findNearestEnemy(isPeerOnBalcony ? 36 : 22, peer.x, peer.z);
      }
      peer.shootCooldown = isPeerOnBalcony ? 1.1 : 1.35;
      if (targetEnemy) {
        const shotAngle = Math.atan2(targetEnemy.z - peer.z, targetEnemy.x - peer.x);
        const coopBonus =
          (state.isTetherChainActive ? 1.35 : 1) * (state.isPolarResonanceActive ? 1.4 : 1);
        state.projectiles.push({
          x: peer.x,
          y: peer.y + 1.0,
          z: peer.z,
          vx: Math.cos(shotAngle) * (isPeerOnBalcony ? 24 : 19),
          vz: Math.sin(shotAngle) * (isPeerOnBalcony ? 24 : 19),
          lifetime: 1.4,
          damage: BASE_DAMAGE * (isPeerOnBalcony ? 0.65 : 0.48) * coopBonus,
          isFire: 1
        });
      }
    }
  }
}

/* ---------- 5. Основной шаг физической симуляции и игровой логики (60 Гц) ---------- */

function updateGameStep(dt) {
  const player = state.player;
  const owned = state.itemsOwned;
  const isPlayerInEmber = !!(
    state.playerEmber &&
    (state.playerEmber.active || state.playerEmber.lostInLava)
  );

  state.elapsedTime += dt;
  state.invulnerabilityTimer -= dt;
  state.chillTimer -= dt;
  state.slideCooldown -= dt;
  state.timeSinceLastHit += dt;
  state.hintCooldown -= dt;

  if (state.toastTimer > 0 && (state.toastTimer -= dt) <= 0) {
    getById('toast').style.opacity = 0;
  }

  if (keysPressed.ArrowLeft || keysPressed.KeyQ) state.cameraYaw += 2 * dt;
  if (keysPressed.ArrowRight || keysPressed.KeyE) state.cameraYaw -= 2 * dt;

  const sinYaw = Math.sin(state.cameraYaw);
  const cosYaw = Math.cos(state.cameraYaw);
  const forwardInput = isPlayerInEmber ? 0 : (keysPressed.KeyW ? 1 : 0) - (keysPressed.KeyS ? 1 : 0);
  const rightInput = isPlayerInEmber ? 0 : (keysPressed.KeyD ? 1 : 0) - (keysPressed.KeyA ? 1 : 0);

  let wishX = -sinYaw * forwardInput + cosYaw * rightInput;
  let wishZ = -cosYaw * forwardInput - sinYaw * rightInput;
  const wishLen = hypot2D(wishX, wishZ);
  if (wishLen) {
    wishX /= wishLen;
    wishZ /= wishLen;
    state.facingAngle = Math.atan2(wishX, wishZ);
  }

  const isInLava = player.y < state.lavaY;
  const lavaSlowFactor = isInLava ? 0.6 : 1;
  // Носитель тяжёлого «Ядра горна» замедляется до 68%, а при «Полярном резонансе» отряд ускоряется на +20%
  const coreCarrierSlowFactor = state.isCarryingForgeCore
    ? (FLOOR_MINI_QUESTS.forge_core && FLOOR_MINI_QUESTS.forge_core.carrierSpeedMul) || 0.68
    : 1;
  const polarSpeedBoost = state.isPolarResonanceActive ? 1.2 : 1;

  const moveSpeed =
    7 *
    (1 + 0.08 * state.tomeLevels.spd) *
    (state.playerSpeedMultiplier || 1) *
    (state.chillTimer > 0 ? 0.55 : 1) *
    lavaSlowFactor *
    coreCarrierSlowFactor *
    polarSpeedBoost;

  if (
    !isPlayerInEmber &&
    !state.isCarryingForgeCore &&
    keysPressed.slide &&
    player.isGrounded &&
    state.slideTimer <= 0 &&
    state.slideCooldown <= 0
  ) {
    state.slideTimer = 1;
    state.slideCooldown = 1.3 / (1 + 0.3 * (owned.ice || 0));
    state.invulnerabilityTimer = Math.max(state.invulnerabilityTimer, 0.3);
    player.slideDirX = wishLen ? wishX : -sinYaw;
    player.slideDirZ = wishLen ? wishZ : -cosYaw;
    playSound('shoot');
  }
  keysPressed.slide = 0;

  let velocityX = wishX * moveSpeed;
  let velocityZ = wishZ * moveSpeed;
  if (state.slideTimer > 0) {
    state.slideTimer -= dt;
    const slideSpeed = (7 + 7 * state.slideTimer) * lavaSlowFactor;
    velocityX = player.slideDirX * slideSpeed;
    velocityZ = player.slideDirZ * slideSpeed;
  }

  if (state.towerConfig.isSlipperyIce && !isPlayerInEmber) {
    if (state.slideTimer > 0) {
      player.iceVelocityX = velocityX;
      player.iceVelocityZ = velocityZ;
    } else {
      const blend = Math.min(1, dt * (player.isGrounded ? 3.2 : 1.2));
      player.iceVelocityX =
        (player.iceVelocityX || 0) + (velocityX - (player.iceVelocityX || 0)) * blend;
      player.iceVelocityZ =
        (player.iceVelocityZ || 0) + (velocityZ - (player.iceVelocityZ || 0)) * blend;
      velocityX = player.iceVelocityX;
      velocityZ = player.iceVelocityZ;
    }
  }

  if (state.vortexPull && !isPlayerInEmber) {
    const pull = state.vortexPull;
    pull.timer -= dt;
    const distToVortex = hypot2D(pull.x - player.x, pull.z - player.z);
    if (distToVortex > 2.6) {
      velocityX += ((pull.x - player.x) / distToVortex) * pull.strength;
      velocityZ += ((pull.z - player.z) / distToVortex) * pull.strength;
    }
    if (pull.timer <= 0) {
      if (pull.spawnRingOnEnd) {
        spawnBossRing(pull.x, pull.y, pull.z, 12, 10, 14);
      }
      if (pull.spawnBombsOnEnd) {
        for (let i = 0; i < 5; i++) {
          const angle = (i * TWO_PI) / 5 + Math.random();
          state.activeBombs.push({
            x: pull.x + Math.cos(angle) * 5,
            y: player.lastGroundY,
            z: pull.z + Math.sin(angle) * 5,
            timer: 0.8,
            nextRingTimer: 0,
            radius: 3.2,
            damage: 15
          });
        }
      }
      playSound('boom');
      state.vortexPull = null;
    }
  }

  const currentFloorIdx = Math.floor(player.y / 14);
  if (!isPlayerInEmber) {
    const nextX = player.x + velocityX * dt;
    collectNearbyBlocks(nextX, player.z, currentFloorIdx, _candidateBlockIndices);
    let blockedX = false;
    for (let k = 0; k < _candidateBlockIndices.length; k++) {
      if (isCollidingWithBlock(blocks[_candidateBlockIndices[k]], nextX, player.y, player.z)) {
        blockedX = true;
        break;
      }
    }
    if (!blockedX) player.x = nextX;

    const nextZ = player.z + velocityZ * dt;
    collectNearbyBlocks(player.x, nextZ, currentFloorIdx, _candidateBlockIndices);
    let blockedZ = false;
    for (let k = 0; k < _candidateBlockIndices.length; k++) {
      if (isCollidingWithBlock(blocks[_candidateBlockIndices[k]], player.x, player.y, nextZ)) {
        blockedZ = true;
        break;
      }
    }
    if (!blockedZ) player.z = nextZ;

    // Динамическое ограничение радиуса башни (29.4 м / 37.4 м / 45.4 м в зависимости от числа игроков)
    const playerRadialDist = hypot2D(player.x, player.z);
    if (playerRadialDist > TOWER_PLAYER_CLAMP_RADIUS) {
      player.x *= TOWER_PLAYER_CLAMP_RADIUS / playerRadialDist;
      player.z *= TOWER_PLAYER_CLAMP_RADIUS / playerRadialDist;
    }

    player.coyoteTimer = player.isGrounded ? 0.1 : player.coyoteTimer - dt;
    player.jumpBufferTimer -= dt;
    if (keysPressed.jump) {
      player.jumpBufferTimer = 0.1;
      keysPressed.jump = 0;
    }
    if (player.jumpBufferTimer > 0) {
      if (player.coyoteTimer > 0) {
        player.vy = state.isCarryingForgeCore ? 7.6 : 8.8;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.isGrounded = 0;
        playSound('jump');
      } else if (
        !state.disableDoubleJump &&
        !state.isCarryingForgeCore &&
        player.doubleJumpsUsed < (state.maxExtraJumps || 1)
      ) {
        player.vy = 7.84;
        player.doubleJumpsUsed++;
        player.jumpBufferTimer = 0;
        playSound('jump');
      }
    }
  } else {
    keysPressed.jump = 0;
  }

  // Обновление периодической Бури башни
  if (state.towerStorm) {
    const ts = state.towerStorm;
    if (ts.active) {
      ts.timer -= dt;
      ts.blend = Math.min(1, ts.blend + dt * 0.65);
      if (ts.timer <= 0) {
        ts.active = 0;
        ts.cooldown = 24 + Math.random() * 10;
        showToast('Погода проясняется — буря стихла', 2.0);
      }
    } else {
      ts.blend = Math.max(0, ts.blend - dt * 0.5);
      ts.cooldown -= dt;
      if (ts.cooldown <= 0) {
        triggerTowerStorm(11);
      }
    }

    if (state.towerId === 'void') {
      const baseMul = state.towerConfig.vfxBase.gravityMul || 0.62;
      const stormMul = state.towerConfig.vfxStorm.gravityMul || 0.35;
      const curMul = lerp(baseMul, stormMul, ts.blend);
      const descentSlow = player.vy < 0 ? lerp(1.0, 0.72, ts.blend) : 1.0;
      state.gravity = (state.unscaledBaseGravity || 24) * curMul * descentSlow;
    }
  }

  if (!isPlayerInEmber) {
    player.vy -= state.gravity * dt;
    const fallVelocity = player.vy;
    const oldY = player.y;
    player.y += player.vy * dt;
    let groundedNow = 0;

    collectNearbyBlocks(player.x, player.z, currentFloorIdx, _candidateBlockIndices);
    for (let k = 0; k < _candidateBlockIndices.length; k++) {
      const block = blocks[_candidateBlockIndices[k]];
      if (
        player.x + 0.4 > block[0] &&
        player.x - 0.4 < block[1] &&
        player.z + 0.4 > block[2] &&
        player.z - 0.4 < block[3]
      ) {
        if (player.vy <= 0 && oldY >= block[5] - 0.05 && player.y <= block[5]) {
          player.y = block[5];
          player.vy = 0;
          groundedNow = 1;
        } else if (player.vy > 0 && oldY + 1.6 <= block[4] + 0.05 && player.y + 1.6 > block[4]) {
          player.y = block[4] - 1.6;
          player.vy = 0;
        }
      }
    }

    if (groundedNow && !player.isGrounded && fallVelocity < -6) {
      emitCombatEvent('onLand');
    }
    if (groundedNow) {
      player.doubleJumpsUsed = 0;
      player.lastGroundY = player.y;
    }
    player.isGrounded = groundedNow;

    // Проверка нахождения на вертикальном полуэтаже-балконе (floorY + 6)
    const activeBalcony =
      typeof getActiveBalconyUnderPlayer === 'function'
        ? getActiveBalconyUnderPlayer(player.x, player.y, player.z)
        : null;
    const wasOnBalcony = state.isOnBalcony;
    state.isOnBalcony = activeBalcony ? 1 : 0;
    if (state.isOnBalcony && !wasOnBalcony && state.hintCooldown <= 0) {
      state.hintCooldown = 2.4;
      showToast('🎯 Снайперский балкон (+6 м): дальность оружия +50%, урон +20%', 2.2);
    }

    // Прыжковые площадки (jumpPads), включая калиброванные площадки для запрыгивания на балконы (floorY + 6)
    for (const pad of jumpPads) {
      if (
        Math.abs(pad.x - player.x) < 1.6 &&
        Math.abs(pad.z - player.z) < 1.6 &&
        Math.abs(pad.y - player.y) < 0.65 &&
        player.vy <= 0
      ) {
        const desiredPeak = pad.targetHeight || 9.6;
        player.vy = Math.sqrt(2 * Math.max(10, state.gravity) * desiredPeak);
        player.doubleJumpsUsed = 0;
        if (pad.isBalconyPad && pad.targetX !== undefined) {
          const bdx = pad.targetX - player.x;
          const bdz = pad.targetZ - player.z;
          const bDist = hypot2D(bdx, bdz) || 1;
          player.x += (bdx / bDist) * 0.45;
          player.z += (bdz / bDist) * 0.45;
        }
        playSound('bounce');
        spawnWaveRingEffect(
          pad.x,
          pad.y + 0.15,
          pad.z,
          2.4,
          pad.isBalconyPad ? 0xffd24c : 0x38ffe8
        );
        spawnSparkBurst(pad.x, pad.y + 0.25, pad.z, 18, 'xp');
      }
    }
  }

  state.maxFloorReached = Math.max(
    state.maxFloorReached,
    Math.min(GRID_FLOORS - 1, Math.floor(player.lastGroundY / 14 + 0.07))
  );
  if (state.maxFloorReached >= 5 && !metaProgress.unlockedHeroes.pil) {
    unlockHero('pil');
  }

  // На этаже с разделёнными полукольцами (split_ring) динамически отслеживаем сектор игрока
  const activeFloor = Math.min(
    GRID_FLOORS - 1,
    Math.max(0, Math.floor(player.lastGroundY / 14 + 0.07))
  );
  if (floorLayouts[activeFloor] === 'split_ring' && typeof getSectorRouteAtPosition === 'function') {
    const curSec = getSectorRouteAtPosition(activeFloor, player.x, player.z);
    if (curSec) {
      state.chosenRoute = curSec;
    }
  }

  // Обновляем союзников, командный мини-квест печати и «Угасающие угли»
  updateCoopPeersStep(dt);
  updateFloorMiniQuestStep(dt);

  // --- ЛОГИКА БЕЗОПАСНЫХ «ЗАЛОВ КУЗНИЦЫ» ПОСЛЕ БОССОВ И СТАРТОВОЙ ПЛИТЫ ГОТОВНОСТИ ---
  if (typeof forgeHallsByFloor !== 'undefined') {
    for (const fKey in forgeHallsByFloor) {
      const fh = forgeHallsByFloor[fKey];
      if (!fh) continue;

      if (
        !isPlayerInEmber &&
        Math.abs(player.y - fh.hallY) < 2.4 &&
        hypot2D(player.x - fh.hallX, player.z - fh.hallZ) < 3.6
      ) {
        if (!fh.healedPlayers.local) {
          fh.healedPlayers.local = 1;
          const healAmt = state.maxHp * 0.35;
          player.hp = Math.min(state.maxHp, player.hp + healAmt);
          state.damageMultiplier *= 1.06;
          playSound('win');
          spawnWaveRingEffect(fh.hallX, fh.hallY + 0.2, fh.hallZ, 3.2, 0xffaa30);
          spawnSparkBurst(fh.hallX, fh.hallY + 0.8, fh.hallZ, 24, 'gold');
          showToast(
            '⚒ Зал Кузницы: здоровье +35%, закалка оружия +6%! Встаньте всей группой на стартовую плиту наверху.',
            4.2
          );
        }
      }

      if (!fh.isActivated && state.activeForgeHallFloor === fh.bossFloor) {
        let readyPlayers = 0;
        const playerOnPlate =
          !isPlayerInEmber &&
          Math.abs(player.y - fh.readyY) < 2.4 &&
          hypot2D(player.x - fh.readyX, player.z - fh.readyZ) <= fh.readyRadius;
        if (playerOnPlate) readyPlayers++;

        for (let pi = 0; pi < state.coopPeers.length; pi++) {
          const peer = state.coopPeers[pi];
          const peerOnPlate =
            Math.abs(peer.y - fh.readyY) < 2.4 &&
            hypot2D(peer.x - fh.readyX, peer.z - fh.readyZ) <= fh.readyRadius + 0.5;
          peer.onReadyPlate = peerOnPlate ? 1 : 0;
          if (peerOnPlate) readyPlayers++;
        }

        state.forgeHallReadyCount = readyPlayers;

        if (readyPlayers >= state.playerCount || player.lastGroundY >= fh.readyY + 6) {
          fh.readyHoldTimer = (fh.readyHoldTimer || 0) + dt;
          if (fh.readyHoldTimer >= 0.75 || player.lastGroundY >= fh.readyY + 6) {
            fh.isActivated = 1;
            state.isLavaPausedByForgeHall = 0;
            state.activeForgeHallFloor = -1;
            playSound('win');
            spawnWaveRingEffect(fh.readyX, fh.readyY + 0.15, fh.readyZ, 4.2, 0x38ffe8);
            spawnSparkBurst(fh.readyX, fh.readyY + 0.5, fh.readyZ, 28, 'xp');
            showToast(
              '⚡ Все игроки (' +
                state.playerCount +
                '/' +
                state.playerCount +
                ') на стартовой плите! Подъём ' +
                state.towerConfig.hazardGenitive +
                ' возобновлён!',
              3.5
            );
          }
        } else {
          fh.readyHoldTimer = 0;
          if (playerOnPlate && state.hintCooldown <= 0) {
            state.hintCooldown = 1.6;
            showToast(
              '⏳ Ожидание отряда на стартовой плите: ' +
                readyPlayers +
                '/' +
                state.playerCount +
                ' (лава на паузе)',
              1.5
            );
          }
        }
      }
    }
  }

  // Подъём лавы (ставится на полную паузу в безопасном «Зале Кузницы»)
  const tierSpeed = [0.25, 0.35, 0.45][Math.min(2, Math.floor((state.maxFloorReached % 12) / 4))];
  const lavaRiseRate = state.isLavaPausedByForgeHall
    ? 0
    : Math.min(
        0.62,
        tierSpeed *
          state.lavaSpeedMultiplier *
          (state.bossFuryLavaMultiplier || 1) *
          (state.activeEvent && state.activeEvent.key === 'surge' ? 1.8 : 1) *
          (state.chosenRoute === 2 ? 1.15 : 1) *
          (state.towerConfig.hazardSpeedMul || 1) *
          (state.activeBossCount > 0 ? 0.35 : 1)
      );
  state.lavaY += lavaRiseRate * dt;
  if (isInLava && !isPlayerInEmber) {
    damagePlayer(state.maxHp * 0.15 * dt, 1);
  }

  // Постоянный небольшой урон при нахождении в лавовой луже на полу (Пепельная башня)
  state.isStandingInLavaPuddle = 0;
  state.puddleSizzleCooldown = Math.max(0, (state.puddleSizzleCooldown || 0) - dt);
  if (
    !isPlayerInEmber &&
    state.towerId === 'ash' &&
    !isInLava &&
    typeof getActiveLavaPuddleUnderPlayer === 'function'
  ) {
    const activePuddle = getActiveLavaPuddleUnderPlayer(player.x, player.y, player.z);
    if (activePuddle) {
      state.isStandingInLavaPuddle = 1;
      const puddleDps = state.maxHp * 0.048 * dt;
      player.hp -= puddleDps;
      state.timeSinceLastHit = 0;
      if (state.puddleSizzleCooldown <= 0) {
        state.puddleSizzleCooldown = 0.24;
        playSound('sizzle');
        spawnSparkBurst(player.x, player.y + 0.08, player.z, 3, 'fire');
        triggerScreenFlash('radial-gradient(circle, rgba(255,90,0,.22) 0%, transparent 72%)');
        if (state.hintCooldown <= 0) {
          state.hintCooldown = 2.6;
          showToast('🔥 Лавовая лужа! Вы получаете ожог, пока стоите в лаве', 1.5);
        }
      }
    }
  }

  if (!isPlayerInEmber && state.timeSinceLastHit > 3 && !isInLava && player.hp < state.maxHp) {
    player.hp = Math.min(
      state.maxHp,
      player.hp + state.maxHp * 0.012 * (state.chosenRoute === 1 ? 2.0 : 1) * dt
    );
  }

  if (!isPlayerInEmber && state.towerConfig.hasColdPenalty && !state.isLavaPausedByForgeHall) {
    const iceSpeed = hypot2D(player.iceVelocityX || 0, player.iceVelocityZ || 0);
    if (iceSpeed < 1.2 && state.slideTimer <= 0) {
      state.standingStillTime += dt;
    } else {
      state.standingStillTime = 0;
    }
    if (state.standingStillTime > 2.5) {
      if (state.standingStillTime < 2.52 && state.hintCooldown <= 0) {
        state.hintCooldown = 3;
        showToast('❄ Холод! Не стойте на месте', 1.6);
      }
      player.hp -= (state.maxHp * 0.035 * dt) / (1 + 0.3 * (state.tagCounts.fire || 0));
      state.timeSinceLastHit = 0;
    }
  }

  // Спавн боссов по расписанию выбранной кампании (12, 18 или 24 этажа / 3 акта)
  const campaignCfg =
    (typeof RUN_CAMPAIGN_MODES !== 'undefined' && RUN_CAMPAIGN_MODES[state.campaignModeId]) ||
    RUN_CAMPAIGN_MODES.acts3_24;
  const bossFloorList = campaignCfg.bossFloors || [3, 7, 11];

  for (let bIdx = 0; bIdx < bossFloorList.length; bIdx++) {
    const bossFloor = bossFloorList[bIdx];
    if (state.maxFloorReached >= bossFloor && !state.bossSpawnedByFloor[bossFloor]) {
      state.bossSpawnedByFloor[bossFloor] = 1;
      let dx = -player.x;
      let dz = -player.z;
      let dist = hypot2D(dx, dz);
      if (dist < 5) {
        dx = 1;
        dz = 0;
        dist = 1;
      }
      let bossX = player.x + (dx / dist) * 14;
      let bossZ = player.z + (dz / dist) * 14;
      const maxBossR = TOWER_FLOOR_RADIUS - 3;
      const bossRadial = hypot2D(bossX, bossZ);
      if (bossRadial > maxBossR) {
        bossX *= maxBossR / bossRadial;
        bossZ *= maxBossR / bossRadial;
      }
      const bossRankCycle = ['golem', 'womb', 'koloss'];
      const bossKind = state.isThreeActRun
        ? bIdx % 2 === 0
          ? bIdx === 2
            ? 'womb'
            : 'golem'
          : 'koloss'
        : bossRankCycle[bIdx % 3];
      spawnEnemy('b', bossX, bossZ, 1 + (bossFloor / 4) * 0.55, bossKind);
      const spawnedBoss = state.enemies[state.enemies.length - 1];
      spawnedBoss.isFinalBoss = bossFloor === GRID_FLOORS - 1;
      spawnedBoss.gateFloor = bossFloor;
      if (bossFloor < GRID_FLOORS - 1) {
        showToast(
          '🔒 Великая печать закрыта: победите босса, чтобы открыть Зал Кузницы и возродить павших!',
          3.8
        );
      }
    }
  }

  // Во время паузы в Зале Кузницы волны обычных мобов не спавнятся
  if (!state.isLavaPausedByForgeHall) {
    state.spawnBudget +=
      dt *
      (1.5 + activeFloor * 0.35) *
      (1 + (state.playerCount - 1) * 0.22) *
      (state.chosenRoute === 2 ? 1.35 : state.chosenRoute === 1 ? 0.65 : 1);
  }

  const waveIdx = state.waveIndexByFloor[activeFloor] || 0;
  const seedOffset = waveIdx * 1000;
  const roll = seededRandom(state.seed, 'floor-' + activeFloor, seedOffset);
  const thresholds = WAVE_THRESHOLDS[Math.min(4, activeFloor)];
  let mobType =
    roll < thresholds[0] ? 's' : roll < thresholds[1] ? 'r' : roll < thresholds[2] ? 'l' : 't';
  if (activeFloor === 0 && waveIdx === 0) {
    mobType = 's';
  }

  const groupSize =
    mobType === 's'
      ? 8 + Math.floor(seededRandom(state.seed, 'floor-' + activeFloor, seedOffset + 1) * 5)
      : mobType === 'r'
        ? 3
        : mobType === 'l'
          ? 2
          : 1;
  const waveCost =
    groupSize * (mobType === 't' ? 7 : mobType === 'r' ? 2.5 : mobType === 'l' ? 3 : 1);

  const maxSpawnRadius = TOWER_FLOOR_RADIUS - 4;
  if (!state.isLavaPausedByForgeHall && state.spawnBudget >= waveCost && state.enemies.length < 250) {
    state.spawnBudget -= waveCost;
    state.waveIndexByFloor[activeFloor] = waveIdx + 1;

    for (let j = 0; j < groupSize; j++) {
      const angle = seededRandom(state.seed, 'floor-' + activeFloor, seedOffset + 10 + j * 8) * TWO_PI;
      const distFromPlayer =
        11 + seededRandom(state.seed, 'floor-' + activeFloor, seedOffset + 500 + j * 8) * 11;
      let spawnX = player.x + Math.cos(angle) * distFromPlayer;
      let spawnZ = player.z + Math.sin(angle) * distFromPlayer;
      let radialDist = hypot2D(spawnX, spawnZ);
      if (radialDist > maxSpawnRadius) {
        spawnX *= maxSpawnRadius / radialDist;
        spawnZ *= maxSpawnRadius / radialDist;
      }
      if (
        (spawnX - player.x) * (spawnX - player.x) + (spawnZ - player.z) * (spawnZ - player.z) <
        81
      ) {
        const oppositeAngle = angle + Math.PI;
        spawnX = player.x + Math.cos(oppositeAngle) * distFromPlayer;
        spawnZ = player.z + Math.sin(oppositeAngle) * distFromPlayer;
        radialDist = hypot2D(spawnX, spawnZ);
        if (radialDist > maxSpawnRadius) {
          spawnX *= maxSpawnRadius / radialDist;
          spawnZ *= maxSpawnRadius / radialDist;
        }
      }
      if (getGroundHeightAt(spawnX, activeFloor * 14, spawnZ) < activeFloor * 14 - 3) {
        continue;
      }
      spawnEnemy(mobType, spawnX, spawnZ, 1 + activeFloor * 0.11);

      const spawnSectorRoute =
        floorLayouts[activeFloor] === 'split_ring' && typeof getSectorRouteAtPosition === 'function'
          ? getSectorRouteAtPosition(activeFloor, spawnX, spawnZ)
          : state.chosenRoute;

      if (
        j === groupSize - 1 &&
        activeFloor >= 1 &&
        Math.random() <
          Math.min(
            0.55,
            (0.05 + 0.032 * activeFloor) *
              (state.isGreedPactActive ? 2 : 1) *
              (spawnSectorRoute === 2 ? 2.2 : spawnSectorRoute === 1 ? 0 : 1)
          )
      ) {
        promoteToElite(state.enemies[state.enemies.length - 1], activeFloor);
      }
    }
  }

  buildEnemyGrid();

  // Автоатака оружия игрока (отключается, если игрок несёт «Ядро горна» или находится в «Угасающем угле»)
  if (!isPlayerInEmber && !state.isCarryingForgeCore) {
    for (const weaponId in state.weaponLevels) {
      const weaponLv = state.weaponLevels[weaponId];
      if (weaponId === 'blade') {
        state.bladeOrbitAngle += dt * 3.2;
        const bladeCount = 1 + weaponLv;
        state.activeBladeCount = bladeCount;
        for (let i = 0; i < bladeCount; i++) {
          const angle = state.bladeOrbitAngle + (i * TWO_PI) / bladeCount;
          state.bladePositions[i][0] = player.x + Math.cos(angle) * 2.8;
          state.bladePositions[i][1] = player.z + Math.sin(angle) * 2.8;
        }
        if ((state.bladeTickTimer -= dt) <= 0) {
          state.bladeTickTimer = 0.25;
          const tickId = ++state.bladeTickId;
          for (let bi = 0; bi < bladeCount; bi++) {
            const bx = state.bladePositions[bi][0];
            const bz = state.bladePositions[bi][1];
            collectNearbyEnemies(bx, bz, _hitCandidates);
            for (let hi = 0; hi < _hitCandidates.length; hi++) {
              const enemy = _hitCandidates[hi];
              if (enemy._lastBladeTickId === tickId) continue;
              const enemyRadius =
                enemy.radius !== undefined ? enemy.radius : ENEMY_TYPES[enemy.type].radius;
              const hitThreshold = 1.2 + enemyRadius;
              const verticalTolerance = enemy.type === 'b' ? 3.5 : 1.5;
              if (
                (enemy.x - bx) * (enemy.x - bx) + (enemy.z - bz) * (enemy.z - bz) <
                  hitThreshold * hitThreshold &&
                Math.abs(enemy.y + enemyRadius - player.y - 1) < enemyRadius + verticalTolerance
              ) {
                damageEnemy(enemy, 0.5 * BASE_DAMAGE * (1 + 0.25 * weaponLv), ['kin']);
                spawnSparkBurst(
                  bx,
                  player.y + 1.0,
                  bz,
                  4,
                  state.tagCounts && state.tagCounts.fire ? 'fire' : 'land'
                );
                enemy._lastBladeTickId = tickId;
              }
            }
          }
        }
        continue;
      }

      if ((state.weaponCooldowns[weaponId] = (state.weaponCooldowns[weaponId] || 0) - dt) > 0) {
        continue;
      }

      if (weaponId === 'fire') {
        const targetRange = state.isOnBalcony ? 38 : 25;
        const target = findNearestEnemy(targetRange);
        state.weaponCooldowns.fire = 0.2;
        if (target && state.projectiles.length < 200) {
          state.weaponCooldowns.fire = 1.1 / (1 + 0.08 * weaponLv);
          state.fireMuzzleFlash = 1.0;
          const shotCount = 1 + ((weaponLv / 3) | 0);
          const baseAngle = Math.atan2(target.z - player.z, target.x - player.x);
          const projSpeed = state.isOnBalcony ? 25 : 20;
          playSound('shoot');
          for (let i = 0; i < shotCount; i++) {
            const angle = baseAngle + (i - (shotCount - 1) / 2) * 0.2;
            state.projectiles.push({
              x: player.x,
              y: player.y + 1,
              z: player.z,
              vx: Math.cos(angle) * projSpeed,
              vz: Math.sin(angle) * projSpeed,
              lifetime: state.isOnBalcony ? 1.75 : 1.4,
              damage: BASE_DAMAGE * (1 + 0.3 * (weaponLv - 1)),
              isFire: 1
            });
          }
        }
      }

      if (weaponId === 'wave') {
        state.weaponCooldowns.wave = 3.2 / (1 + 0.05 * weaponLv);
        triggerShockwave(
          player.x,
          player.z,
          4 + 0.4 * weaponLv,
          BASE_DAMAGE * 1.1 * (1 + 0.3 * (weaponLv - 1)),
          0,
          ['kin']
        );
      }
    }
  } else {
    state.activeBladeCount = 0;
  }

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.x += proj.vx * dt;
    proj.z += proj.vz * dt;
    proj.lifetime -= dt;
    let isExpired = proj.lifetime <= 0;

    if (!proj.isHostile && Math.random() < 0.28) {
      spawnSparkBurst(proj.x, proj.y, proj.z, 1, 'fire');
    }

    if (proj.isHostile) {
      if (
        !isPlayerInEmber &&
        (proj.x - player.x) * (proj.x - player.x) + (proj.z - player.z) * (proj.z - player.z) <
          0.81 &&
        Math.abs(proj.y - player.y - 0.8) < 1.5
      ) {
        damagePlayer(proj.damage || 8);
        if (state.towerId === 'ice') state.chillTimer = Math.max(state.chillTimer, 1.5);
        isExpired = 1;
      }
    } else {
      collectNearbyEnemies(proj.x, proj.z, _hitCandidates);
      for (let hi = 0; hi < _hitCandidates.length; hi++) {
        const enemy = _hitCandidates[hi];
        const enemyRadius =
          enemy.radius !== undefined ? enemy.radius : ENEMY_TYPES[enemy.type].radius;
        const hitThreshold = enemyRadius + 0.4;
        const verticalTolerance = enemy.type === 'b' ? 6.5 : state.isOnBalcony ? 6.8 : 2.2;
        if (
          (proj.x - enemy.x) * (proj.x - enemy.x) + (proj.z - enemy.z) * (proj.z - enemy.z) <
            hitThreshold * hitThreshold &&
          Math.abs(proj.y - (enemy.y + enemyRadius)) < enemyRadius + verticalTolerance
        ) {
          damageEnemy(enemy, proj.damage, ['fire'], proj.isFire);
          spawnSparkBurst(proj.x, enemy.y + 0.8, proj.z, 7, 'fire');
          spawnSlagBurst(proj.x, enemy.y + 0.2, proj.z, 2, 0.55);
          isExpired = 1;
          break;
        }
      }
    }

    if (isExpired) {
      state.projectiles[i] = state.projectiles[state.projectiles.length - 1];
      state.projectiles.pop();
    }
  }

  const maxEnemyRadial = TOWER_FLOOR_RADIUS + 1.0;
  for (const enemy of state.enemies) {
    const baseStats = ENEMY_TYPES[enemy.type];
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    const dist = Math.sqrt(dx * dx + dz * dz) || 1;

    if (state.slideTimer > 0 && owned.ice && dist < 3 + owned.ice) {
      enemy.slowTimer = 2;
    }

    if (enemy.isRising) {
      if (enemy.risingDelay > 0) {
        enemy.risingDelay -= dt;
      } else {
        enemy.risingTime += dt;
        const k = Math.min(1, enemy.risingTime / enemy.risingDuration);
        const ease = 1 - Math.pow(1 - k, 3);
        enemy.y = enemy.startY + (enemy.targetY - enemy.startY) * ease;
        if (k >= 1) {
          enemy.isRising = false;
          enemy.y = enemy.targetY;
        }
      }
      if (enemy.type === 'b') {
        updateBossAI(enemy, dt, player, dx, dz, dist);
      }
      enemy.burnTimer -= dt;
      enemy.slowTimer -= dt;
      enemy.attackCooldown -= dt;
      continue;
    }

    if (enemy.type === 'b') {
      updateBossAI(enemy, dt, player, dx, dz, dist);
    }

    const moveDirFactor =
      enemy.type === 'b'
        ? enemy.isMoving || 0
        : enemy.type === 'r'
          ? dist > (enemy.orbitDistance || 13.5)
            ? 1
            : dist < (enemy.orbitDistance || 13.5) - 2.5
              ? -1
              : 0
          : enemy.type === 'l'
            ? enemy.jumpState === 'idle'
              ? 1
              : 0
            : 1;

    let towerMobSpeedBonus = 1;
    if (state.towerId === 'ice') {
      if (enemy.type === 'l') towerMobSpeedBonus = 1.18;
      else if (enemy.type === 't' && enemy.hp <= enemy.maxHp * 0.5) towerMobSpeedBonus = 1.32;
    }

    const baseMoveSpeed =
      (enemy.bossSpeed !== undefined ? enemy.bossSpeed : baseStats.speed) *
      towerMobSpeedBonus *
      (enemy.slowTimer > 0 ? 0.7 : 1) *
      (enemy.bossSpeedMul || 1) *
      (enemy.speedVariation || 1) *
      (state.enemySpeedMultiplier || 1);
    const radialSpeed = baseMoveSpeed * moveDirFactor;

    if (state.towerConfig.canEnemiesBlink && enemy.type !== 'b' && !enemy.isRising) {
      if (enemy.blinkCooldown === undefined) {
        enemy.blinkCooldown =
          enemy.type === 's' ? 2.2 + Math.random() * 2.5 : 4 + Math.random() * 5;
      }
      const blinkRateMul = enemy.type === 't' && enemy.hp <= enemy.maxHp * 0.5 ? 2.0 : 1.0;
      if ((enemy.blinkCooldown -= dt * blinkRateMul) <= 0) {
        enemy.blinkCooldown =
          enemy.type === 's' ? 2.5 + Math.random() * 2.5 : 5.5 + Math.random() * 5;
        if (enemy.type === 's' && dist > 3.5 && dist < 24) {
          const step = 2.4;
          const nx = enemy.x + (dx / dist) * step + (Math.random() - 0.5) * 1.4;
          const nz = enemy.z + (dz / dist) * step + (Math.random() - 0.5) * 1.4;
          const gY = getGroundHeightAt(nx, player.lastGroundY, nz);
          if (gY >= player.lastGroundY - 2.5) {
            enemy.x = nx;
            enemy.z = nz;
            enemy.groundY = gY;
          }
        } else if (dist > 9 && dist < 34 && enemy.jumpState !== 'air') {
          const angle =
            Math.atan2(enemy.z - player.z, enemy.x - player.x) + (Math.random() - 0.5) * 1.2;
          const radius = enemy.type === 'r' ? 12 + Math.random() * 2 : 7.5 + Math.random() * 2;
          let nx = player.x + Math.cos(angle) * radius;
          let nz = player.z + Math.sin(angle) * radius;
          const radialDist = hypot2D(nx, nz);
          if (radialDist > maxSpawnRadius) {
            nx *= maxSpawnRadius / radialDist;
            nz *= maxSpawnRadius / radialDist;
          }
          const newGroundY = getGroundHeightAt(nx, player.lastGroundY, nz);
          if (newGroundY >= player.lastGroundY - 2.5 && newGroundY <= player.lastGroundY + 2.5) {
            spawnWaveRingEffect(enemy.x, enemy.y, enemy.z, 1.5, 0xb060ff);
            spawnWaveRingEffect(nx, newGroundY, nz, 1.5, 0xb060ff);
            enemy.x = nx;
            enemy.z = nz;
            enemy.groundY = null;
            if (enemy.type !== 'r') enemy.y = newGroundY;
          }
        }
      }
    }

    const oldEnemyX = enemy.x;
    const oldEnemyZ = enemy.z;
    enemy.x += (dx / dist) * radialSpeed * dt;
    enemy.z += (dz / dist) * radialSpeed * dt;

    if (enemy.type === 'r' && enemy.orbitSpeed) {
      enemy.x += (-dz / dist) * baseMoveSpeed * enemy.orbitSpeed * dt;
      enemy.z += (dx / dist) * baseMoveSpeed * enemy.orbitSpeed * dt;
    }

    const radialClamp = hypot2D(enemy.x, enemy.z);
    if (radialClamp > maxEnemyRadial) {
      enemy.x *= maxEnemyRadial / radialClamp;
      enemy.z *= maxEnemyRadial / radialClamp;
    }

    let groundY = 0;
    if (enemy.type !== 'r') {
      const isClose = dist < 16 || enemy.jumpState === 'air';
      enemy.groundCheckTick++;
      if (isClose || (enemy.groundCheckTick & 3) === 0 || enemy.groundY === null) {
        enemy.groundY = getGroundHeightAt(enemy.x, enemy.y, enemy.z);
      }
      groundY = enemy.groundY;
      if (enemy.type !== 'b' && enemy.jumpState !== 'air' && groundY < enemy.y - 3) {
        enemy.x = oldEnemyX;
        enemy.z = oldEnemyZ;
        enemy.groundY = getGroundHeightAt(enemy.x, enemy.y, enemy.z);
        groundY = enemy.groundY;
      }
    }

    if (enemy.type === 's') {
      enemy.groundY = groundY;
      if (enemy.jumpState === 'idle') {
        enemy.scaleY += (1 - enemy.scaleY) * Math.min(1, dt * 10);
        enemy.scaleXZ += (1 - enemy.scaleXZ) * Math.min(1, dt * 10);
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
        if (enemy.jumpTimer > enemy.idleDuration) {
          enemy.jumpState = 'crouch';
          enemy.jumpTimer = 0;
        } else {
          enemy.jumpTimer += dt;
        }
      } else if (enemy.jumpState === 'crouch') {
        const k = Math.min(1, enemy.jumpTimer / 0.22);
        enemy.scaleY = 1 - 0.2 * k;
        enemy.scaleXZ = 1 + 0.14 * k;
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
        if (k >= 1) {
          enemy.jumpState = 'air';
          enemy.jumpTimer = 0;
          enemy.jumpVelocityY = baseStats.jumpVelocity;
          if (dist < 45) spawnSparkBurst(enemy.x, enemy.y, enemy.z, 14, 'takeoff');
        } else {
          enemy.jumpTimer += dt;
        }
      } else if (enemy.jumpState === 'air') {
        enemy.jumpVelocityY -= state.gravity * dt;
        enemy.y += enemy.jumpVelocityY * dt;
        const stretch = Math.min(0.16, Math.abs(enemy.jumpVelocityY) * 0.028);
        enemy.scaleY = 1 + stretch;
        enemy.scaleXZ = 1 - stretch * 0.6;
        if (enemy.y <= groundY && enemy.jumpVelocityY < 0) {
          enemy.y = groundY;
          enemy.jumpState = 'land';
          enemy.jumpTimer = 0;
          if (dist < 45) {
            spawnSparkBurst(enemy.x, enemy.y, enemy.z, 20, 'land');
            spawnSmokePuff(enemy.x, enemy.y, enemy.z, 6);
            spawnFireLandingRing(enemy.x, enemy.y, enemy.z);
          }
        }
        enemy.jumpTimer += dt;
      } else {
        const k = Math.min(1, enemy.jumpTimer / 0.2);
        enemy.scaleY = 0.8 + 0.2 * k;
        enemy.scaleXZ = 1.14 - 0.14 * k;
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
        if (k >= 1) {
          enemy.jumpState = 'idle';
          enemy.jumpTimer = 0;
          enemy.idleDuration = 0.8 + Math.random() * 0.9;
        } else {
          enemy.jumpTimer += dt;
        }
      }
    } else if (enemy.type === 'r') {
      enemy.groundCheckTick++;
      if (enemy.anchorY === undefined || (enemy.groundCheckTick & 7) === 4) {
        enemy.anchorY = getGroundHeightAt(enemy.x, enemy.y, enemy.z);
      }

      collectNearbyEnemies(enemy.x, enemy.z, _separationCandidates);
      for (let si = 0; si < _separationCandidates.length; si++) {
        const other = _separationCandidates[si];
        if (other === enemy) continue;
        const ox = enemy.x - other.x;
        const oz = enemy.z - other.z;
        const distSq = ox * ox + oz * oz;
        if (distSq > 6.25) continue;
        if (distSq > 1e-6) {
          const sepDist = Math.sqrt(distSq);
          const pushFactor = ((2.5 - sepDist) / sepDist) * 4 * dt;
          enemy.x += ox * pushFactor;
          enemy.z += oz * pushFactor;
        } else {
          enemy.x += (Math.random() - 0.5) * 0.2;
          enemy.z += (Math.random() - 0.5) * 0.2;
        }
      }

      const radialDist = hypot2D(enemy.x, enemy.z);
      if (radialDist > maxEnemyRadial) {
        enemy.x *= maxEnemyRadial / radialDist;
        enemy.z *= maxEnemyRadial / radialDist;
      }

      const targetHoverY =
        enemy.anchorY +
        enemy.hoverHeight +
        Math.sin(state.elapsedTime * 1.6 + enemy.hoverPhase) * 0.3;
      enemy.y += (targetHoverY - enemy.y) * Math.min(1, dt * 4);

      enemy.surgeTimer -= dt;
      if (enemy.surgeTimer <= 0 && enemy.surgeActiveTimer <= 0) {
        enemy.surgeActiveTimer = 1.4;
        enemy.surgeTimer = 4.5 + Math.random() * 3;
      }
      enemy.shield =
        state.towerId === 'void' && enemy.surgeActiveTimer > 0.45 && enemy.surgeActiveTimer < 0.95
          ? 1
          : 0;

      if (enemy.surgeActiveTimer > 0) {
        enemy.surgeActiveTimer -= dt;
        if (enemy.surgeActiveTimer <= 0) {
          if (dist < 45) {
            const gndX = enemy.x + (Math.random() - 0.5) * 1.2;
            const gndZ = enemy.z + (Math.random() - 0.5) * 1.2;
            const gndY = enemy.anchorY !== undefined ? enemy.anchorY : enemy.y - enemy.hoverHeight;
            spawnGlobalBolt(enemy.x, enemy.y - 0.9, enemy.z, gndX, gndY + 0.05, gndZ, 0.16, 12);
            spawnVoidLandingRing(gndX, gndY, gndZ);
            spawnShypOuterBolt(enemy);
            spawnShypOuterBolt(enemy);

            if (state.towerId === 'ice' && dist < 4.5) {
              state.chillTimer = Math.max(state.chillTimer, 1.8);
            }
          }
          enemy.flashIntensity = 8;
          triggerScreenShake(0.15);
        }
      }
      enemy.surgeLevel +=
        ((enemy.surgeActiveTimer > 0 ? 1 : 0) - enemy.surgeLevel) * Math.min(1, dt * 6);

      if (dist < 34) {
        enemy.boltTimer -= dt;
        if (enemy.boltTimer <= 0) {
          const boltCount =
            1 + (Math.random() < 0.4 ? 1 : 0) + (enemy.surgeLevel > 0.5 ? 1 : 0);
          for (let k = 0; k < boltCount; k++) {
            if (Math.random() < 0.6) spawnShypInnerBolt(enemy);
            else spawnShypOuterBolt(enemy);
          }
          enemy.boltTimer = (0.25 + Math.random() * 0.85) * (1 - 0.65 * enemy.surgeLevel);
        }
      }
      enemy.flashIntensity *= Math.exp(-dt * 9);
    } else if (enemy.type === 'l') {
      enemy.groundY = groundY;
      if (enemy.jumpState === 'idle') {
        enemy.jumpTimer += dt;
        if (enemy.jumpTimer > 1.5 + Math.random() * 1.2 && dist < 20 && enemy.attackCooldown <= 0) {
          enemy.jumpState = 'crouch';
          enemy.jumpTimer = 0;
          enemy.attackCooldown = 1.5;
        }
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
      } else if (enemy.jumpState === 'crouch') {
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
        if (enemy.jumpTimer >= 0.28) {
          enemy.jumpState = 'air';
          enemy.jumpTimer = 0;
          enemy.jumpVelocityY = baseStats.jumpVelocity;
          enemy.jumpOffsetY = 0;
          if (dist < 45) spawnSparkBurst(enemy.x, enemy.y, enemy.z, 18, 'takeoff');
        }
        enemy.jumpTimer += dt;
      } else if (enemy.jumpState === 'air') {
        enemy.jumpOffsetY += enemy.jumpVelocityY * dt;
        enemy.jumpVelocityY -= state.gravity * dt;
        const jdx = player.x - enemy.x;
        const jdz = player.z - enemy.z;
        const jd = Math.sqrt(jdx * jdx + jdz * jdz) || 1;
        enemy.x += (jdx / jd) * 2.4 * dt;
        enemy.z += (jdz / jd) * 2.4 * dt;
        if (enemy.jumpOffsetY <= 0 && enemy.jumpVelocityY < 0) {
          enemy.jumpOffsetY = 0;
          enemy.jumpState = 'land';
          enemy.jumpTimer = 0;
          enemy.flare = 1;
          enemy.shake = 0.09;
          enemy.jawAngle = 0.4;
          if (!isPlayerInEmber && dist < 3.5 && Math.abs(player.y - enemy.y) < 3) {
            damagePlayer(13 * (enemy.damageMultiplier || 1));
            if (state.towerId === 'ice') state.chillTimer = Math.max(state.chillTimer, 1.8);
          }
          if (dist < 45) {
            spawnSparkBurst(enemy.x, enemy.y, enemy.z, 26, 'land');
            spawnSmokePuff(enemy.x, enemy.y, enemy.z, 12);
            spawnFireLandingRing(enemy.x, enemy.y, enemy.z);
            triggerScreenShake(0.3);
          }
        }
        enemy.jumpTimer += dt;
      } else if (enemy.jumpState === 'land') {
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
        if (enemy.jumpTimer > 0.5) {
          enemy.jumpState = 'idle';
          enemy.jumpTimer = 0;
        }
        enemy.jumpTimer += dt;
      }
      enemy.y = enemy.groundY + (enemy.jumpOffsetY || 0);
    } else if (enemy.type === 't') {
      if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
      else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
    } else if (enemy.type === 'b') {
      if (enemy.bkind !== 'womb') {
        if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
        else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
      }
    } else {
      if (enemy.y < groundY) enemy.y = Math.min(groundY, enemy.y + 8 * dt);
      else if (enemy.y > groundY) enemy.y = Math.max(groundY, enemy.y - 12 * dt);
    }

    enemy.burnTimer -= dt;
    enemy.slowTimer -= dt;
    enemy.attackCooldown -= dt;
    if (enemy.burnTimer > 0 && !enemy.shield) {
      enemy.hp -= BASE_DAMAGE * 0.3 * dt;
    }

    const enemyRadius = enemy.radius !== undefined ? enemy.radius : baseStats.radius;
    const contactDmg =
      enemy.contactDamage !== undefined ? enemy.contactDamage : baseStats.contactDamage;
    if (
      !isPlayerInEmber &&
      contactDmg &&
      dist < enemyRadius + 0.6 &&
      Math.abs(player.y - enemy.y) < (enemy.bkind === 'womb' ? 3.4 : 2.5) &&
      enemy.attackCooldown <= 0
    ) {
      damagePlayer(contactDmg);
      if (enemy.type === 's' && state.towerId === 'ice') {
        state.chillTimer = Math.max(state.chillTimer, 1.4);
      }
      enemy.attackCooldown = 0.6;
    }

    if (
      enemy.type === 'r' &&
      enemy.attackCooldown <= 0 &&
      dist < 22 &&
      state.projectiles.length < 250
    ) {
      enemy.attackCooldown = 1.8;
      playSound('shoot');
      const shotCount = state.towerId === 'ice' ? 2 : 1;
      const baseA = Math.atan2(dz, dx);
      for (let s = 0; s < shotCount; s++) {
        const ang = baseA + (shotCount > 1 ? (s - 0.5) * 0.14 : 0);
        state.projectiles.push({
          x: enemy.x,
          y: enemy.y + ENEMY_TYPES[enemy.type].radius,
          z: enemy.z,
          vx: Math.cos(ang) * 12,
          vz: Math.sin(ang) * 12,
          lifetime: 3,
          isHostile: 1,
          damage: 7 * (enemy.damageMultiplier || 1)
        });
      }
    }
  }

  const magnetRadius =
    4.5 * (1 + 0.35 * state.tomeLevels.mag) * (state.pickupRadiusMultiplier || 1);
  const magnetRadiusSq = magnetRadius * magnetRadius;

  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const pickup = state.pickups[i];
    pickup.lifetime -= dt;
    if (
      pickup.lifetime <= 0 ||
      pickup.y < state.lavaY + 0.2 ||
      player.lastGroundY - pickup.y > 30
    ) {
      state.pickups[i] = state.pickups[state.pickups.length - 1];
      state.pickups.pop();
      continue;
    }

    const dx = player.x - pickup.x;
    const dy = player.y + 0.8 - pickup.y;
    const dz = player.z - pickup.z;
    const distSq = dx * dx + dy * dy + dz * dz;

    if (!pickup.isMagnetized && distSq < magnetRadiusSq) {
      pickup.isMagnetized = 1;
    }
    if (pickup.isMagnetized) {
      pickup.speed += 40 * dt;
      const dist = Math.sqrt(distSq) || 1;
      const stepDist = Math.min(dist, pickup.speed * dt);
      pickup.x += (dx / dist) * stepDist;
      pickup.y += (dy / dist) * stepDist;
      pickup.z += (dz / dist) * stepDist;

      if (dist < 0.9) {
        if (pickup.type === 0) {
          state.xp += pickup.value * (1 + 0.1 * state.tomeLevels.mag);
        } else if (pickup.type === 1) {
          if (!isPlayerInEmber) {
            player.hp = Math.min(state.maxHp, player.hp + state.maxHp * pickup.value);
          }
        } else {
          state.gold += pickup.value;
        }
        playSound('pickup');
        const pickedType = pickup.type;
        state.pickups[i] = state.pickups[state.pickups.length - 1];
        state.pickups.pop();
        if (pickedType === 0) {
          checkLevelUp();
          if (state.pauseState) break;
        }
      }
    }
  }

  if (!state.pauseState && !isPlayerInEmber) {
    for (let ci = 0; ci < chests.length; ci++) {
      const chest = chests[ci];
      if (chest.isOpen) continue;
      if (
        Math.abs(player.y - chest.y) < 2.5 &&
        hypot2D(player.x - chest.x, player.z - chest.z) < 2.2
      ) {
        const finalCost = Math.ceil(chest.cost * state.chestCostMultiplier);
        if (state.gold >= finalCost) {
          state.gold -= finalCost;
          chest.isOpen = 1;
          chest.group.visible = false;
          state.chestsOpened++;
          if (state.chestsOpened >= 3) {
            unlockHero('smi');
          }
          playSound('win');
          spawnWaveRingEffect(chest.x, chest.y + 0.5, chest.z, 2.5, 0xffc83d);
          showUpgradeOfferModal(0, 'chest' + state.chestsOpened);
          break;
        } else if (state.hintCooldown <= 0) {
          state.hintCooldown = 0.9;
          showToast('Сундук: ' + finalCost + ' золота (у вас ' + (state.gold | 0) + ')', 1.2);
        }
      }
    }
  }

  if (!state.pauseState && !isPlayerInEmber) {
    for (let ai = 0; ai < altars.length; ai++) {
      const altar = altars[ai];
      if (altar.isOpen || state.elapsedTime < altar.cooldownUntil) continue;
      if (
        Math.abs(player.y - altar.y) < 2.5 &&
        hypot2D(player.x - altar.x, player.z - altar.z) < 2.2
      ) {
        openPactModal(altar);
        break;
      }
    }
  }

  if (state.maxFloorReached > state.lastAnnouncedFloor) {
    state.lastAnnouncedFloor = state.maxFloorReached;
    onFloorEnter();
  }
  if (state.activeEvent) {
    state.activeEvent.timeLeft -= dt;
    updateFloorEvent(dt);
    if (state.activeEvent.timeLeft <= 0) {
      endFloorEvent();
    }
  }

  for (let i = state.activeBombs.length - 1; i >= 0; i--) {
    const bomb = state.activeBombs[i];
    bomb.timer -= dt;
    bomb.nextRingTimer -= dt;
    if (bomb.nextRingTimer <= 0) {
      bomb.nextRingTimer = 0.3;
      spawnWaveRingEffect(
        bomb.x,
        bomb.y,
        bomb.z,
        bomb.radius || 4.5,
        bomb.applyChill
          ? 0x60d0ff
          : state.towerId === 'void'
            ? 0xb848ff
            : 0xff3010
      );
    }
    if (bomb.timer <= 0) {
      playSound('boom');
      spawnWaveRingEffect(
        bomb.x,
        bomb.y,
        bomb.z,
        (bomb.radius || 4.5) + 0.5,
        bomb.applyChill ? 0x90ecff : state.towerId === 'void' ? 0xd878ff : 0xffa040
      );
      spawnSlagBurst(bomb.x, bomb.y, bomb.z, 6, 0.85);
      spawnSparkBurst(bomb.x, bomb.y + 0.3, bomb.z, 16, bomb.applyChill ? 'steam' : 'fire');
      triggerScreenShake(0.35);
      if (
        !isPlayerInEmber &&
        hypot2D(player.x - bomb.x, player.z - bomb.z) < (bomb.radius || 4.5) &&
        Math.abs(player.y - bomb.y) < 3
      ) {
        damagePlayer(bomb.damage || 22);
        if (bomb.applyChill) state.chillTimer = 2.5;
      }
      state.activeBombs[i] = state.activeBombs[state.activeBombs.length - 1];
      state.activeBombs.pop();
    }
  }

  updateBossHazards(dt);

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) {
      if (!state.isGameOver) killEnemy(i);
    } else if (
      !state.isGameOver &&
      enemy.type !== 'b' &&
      !enemy.isRising &&
      (enemy.y < state.lavaY + 0.3 || player.lastGroundY - enemy.y > 28)
    ) {
      // Если элитный «Хранитель печати» поглощён лавой — засчитываем его устранение для снятия печати
      if (enemy.isSealGuardian && typeof onSealGuardianKilled === 'function') {
        onSealGuardianKilled(enemy);
      }
      if (enemy.bolts) {
        for (const bolt of enemy.bolts) releaseBolt(bolt);
        enemy.bolts.length = 0;
      }
      if (enemy.mesh) {
        MobFactory.release(enemy.type, enemy.mesh);
        enemy.mesh = null;
      }
      state.enemies[i] = state.enemies[state.enemies.length - 1];
      state.enemies.pop();
    }
  }

  // Перехват смерти игрока (hp <= 0) механикой «Угасающий уголь» вместо мгновенного конца игры
  if (player.hp <= 0 && !isPlayerInEmber) {
    const enteredEmber = triggerPlayerFadingEmberOrGameOver();
    if (!enteredEmber) {
      finishRun(0);
      return;
    }
  }

  updateFadingEmbersStep(dt);
}

function triggerTowerStorm(duration = 11) {
  if (!state || state.isGameOver) return;
  const ts = state.towerStorm;
  if (!ts) return;
  ts.active = 1;
  ts.duration = duration;
  ts.timer = duration;
  playSound('storm');
  const stormTitle =
    (state.towerConfig && state.towerConfig.vfxStorm && state.towerConfig.vfxStorm.stormName) ||
    'БУРЯ БАШНИ';
  if (state.towerId === 'ash') {
    showToast('🌪 ' + stormTitle + '! Свечение, марево и пепел усилены!', 3.0);
  } else if (state.towerId === 'ice') {
    showToast('❄ ' + stormTitle + '! Бездонная метель и снежная взвесь сгущаются!', 3.0);
  } else {
    showToast('🌀 ' + stormTitle + '! Сияние рун, искажение реальности и невесомость усилены!', 3.0);
  }
}

function triggerOrToggleStorm() {
  if (state && !state.isGameOver && state.towerStorm) {
    if (state.towerStorm.active) {
      state.towerStorm.active = 0;
      state.towerStorm.cooldown = 25;
      showToast('Буря остановлена', 1.4);
    } else {
      triggerTowerStorm(12);
    }
  } else {
    window.menuStormPreviewActive = !window.menuStormPreviewActive;
    playSound('storm');
  }
}
window.triggerOrToggleStorm = triggerOrToggleStorm;
