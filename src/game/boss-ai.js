/* ==========================================================================
   Блок 5 — ИИ мобов, 9 боссов и баланс сложности для кооператива (2–4 игрока):
   - Система распределения агрессии (Threat / Multi-Target) по массиву state.players
   - Кооперативные фазы 9 боссов трёх башен (этажи 4, 8, 12):
     * Этаж 4 (Голем, Хранитель, Архитектор): двойные ударные кольца и секторные
       разломы (spawnBossArc) сразу по двум разным игрокам; у Архитектора Искажения —
       геометрические ловушки (blueprintGrid), связывающие двух игроков линией урона.
     * Этаж 8 (Кристальная Матка, Пряха, Пожиратель Фаз): привязка 4 кругов призыва
       (summonRings) к взлому щита — одновременное удержание подсвеченных рунных кругов
       снимает неуязвимость босса (enemy.shield = 1) втрое быстрее (×3) и открывает
       окно двойного урона (enemy.weak = 1).
     * Этаж 12 (Лавовый Колосс, Первозданный Буран, Вестник Коллапса): синхронные
       извержения гейзеров (bossGeysers) под позициями всех живых игроков и механика
       «Перегрузки ядра», где один игрок отвлекает разворот босса (boss.facingYaw),
       пока остальные бьют по уязвимым отдушинам (KOLOSS_VENTS) на его спине.
   ========================================================================== */

const KOLOSS_DRIP_ANCHORS = [
  [0, 4.95, 0.5],
  [1.6, 2.0, 0.2],
  [-1.6, 2.0, 0.2],
  [0.95, 4.2, 0.7],
  [-0.95, 4.2, 0.7],
  [1.55, 3.3, 0.1],
  [-1.55, 3.3, 0.1]
];

const KOLOSS_SHED_ANCHORS = [
  [0, 4.2, 0.6],
  [0.9, 4.6, 0],
  [-0.9, 4.6, 0],
  [1.55, 2.6, 0.1],
  [-1.55, 2.6, 0.1],
  [0, 5.3, 0]
];

const KOLOSS_VENTS = [
  [1.15, 4.05, 0.25],
  [-1.15, 4.05, 0.25],
  [0, 4.35, -0.85],
  [1.55, 5.05, 0],
  [-1.55, 5.05, 0]
];

const _bossWorldCoords = [0, 0, 0];

// 3D-группа для кооперативных ловушек боссов (линии урона blueprintGrid, лучи взлома рун, маркеры отдушин спины)
const bossCoopVisualsGroup = new THREE.Group();
scene.add(bossCoopVisualsGroup);

function bossLocalToWorld(boss, lx, ly, lz, outCoords) {
  const cosYaw = Math.cos(boss.facingYaw);
  const sinYaw = Math.sin(boss.facingYaw);
  const scale = boss.bossScale;
  outCoords[0] = boss.x + (lx * cosYaw + lz * sinYaw) * scale;
  outCoords[1] = boss.y + ly * scale;
  outCoords[2] = boss.z + (-lx * sinYaw + lz * cosYaw) * scale;
  return outCoords;
}

/* ==========================================================================
   1. СИСТЕМА РАСПРЕДЕЛЕНИЯ АГРЕССИИ (THREAT / MULTI-TARGET) ПО STATE.PLAYERS
   ========================================================================== */

/**
 * Синхронизирует и возвращает единый массив всех участников отряда `state.players`
 * (`state.player` + `state.coopPeers`).
 */
function syncAndGetPlayersArray() {
  if (!state || !state.player) return [];
  const p = state.player;
  if (!p.id) p.id = 1;
  p.isLocalPlayer = 1;
  p.heroId = state.heroId || 'wan';
  if (!p.shortName) p.shortName = 'Игрок 1';
  if (!p.name) p.name = 'Игрок 1 (Вы)';
  if (p.maxHp === undefined) p.maxHp = state.maxHp || 100;
  else p.maxHp = state.maxHp || p.maxHp;

  if (!Array.isArray(state.players)) {
    state.players = [];
  }
  state.players.length = 0;
  state.players.push(p);

  if (state.coopPeers && state.coopPeers.length) {
    for (let i = 0; i < state.coopPeers.length; i++) {
      const peer = state.coopPeers[i];
      if (!peer) continue;
      if (!peer.id) peer.id = i + 2;
      peer.isLocalPlayer = 0;
      if (peer.lastGroundY === undefined) peer.lastGroundY = peer.y || 0;
      else peer.lastGroundY = peer.y;
      state.players.push(peer);
    }
  }
  return state.players;
}

/**
 * Проверяет, жив ли участник отряда и не находится ли он в состоянии «Угасающего угля».
 */
function isPlayerUnitAlive(unit) {
  if (!unit || !state) return false;
  if (unit === state.player || unit.isLocalPlayer) {
    if (unit.hp <= 0) return false;
    if (state.playerEmber && (state.playerEmber.active || state.playerEmber.lostInLava)) {
      return false;
    }
    return true;
  }
  if (unit.hp <= 0) return false;
  if (unit.ember && (unit.ember.active || unit.ember.lostInLava)) {
    return false;
  }
  return true;
}

/**
 * Возвращает список всех живых участников отряда из `state.players`.
 */
function getLivingPlayers() {
  const allPlayers = syncAndGetPlayersArray();
  const living = [];
  for (let i = 0; i < allPlayers.length; i++) {
    if (isPlayerUnitAlive(allPlayers[i])) {
      living.push(allPlayers[i]);
    }
  }
  if (!living.length && state && state.player) {
    living.push(state.player);
  }
  return living;
}

/**
 * Наносит урон конкретному игроку или кооп-союзнику из `state.players`.
 */
function damagePlayerUnit(unit, amount, options) {
  if (!unit || !state || !isPlayerUnitAlive(unit)) return;
  const opts = options || {};
  if (unit === state.player || unit.isLocalPlayer) {
    damagePlayer(amount, opts.isLavaDamage);
    if (opts.applyChill || state.towerId === 'ice') {
      state.chillTimer = Math.max(state.chillTimer || 0, opts.chillDuration || 2.0);
    }
    if (opts.shake) {
      triggerScreenShake(opts.shake);
    }
    return;
  }

  // Урон по кооп-союзнику из state.players
  if ((unit.invulnerabilityTimer || 0) > 0 && !opts.isLavaDamage) return;
  if (!opts.isLavaDamage) {
    unit.invulnerabilityTimer = 0.55;
    amount *= 1 + 0.03 * (state.maxFloorReached || 0);
    // Нижний страж-союзник получает меньше урона в ближнем бою
    if (unit.prefersLowerGuard) {
      amount *= 0.78;
    }
  }
  unit.hp = Math.max(0, (unit.hp || unit.maxHp || 110) - amount);
  if (unit.hp <= 0 && typeof triggerPeerFadingEmber === 'function') {
    triggerPeerFadingEmber(unit);
  }
}

/**
 * Регистрирует агрессию (Threat) на враге/боссе при нанесении урона игроком или союзником.
 */
function registerPlayerThreatOnEnemy(enemy, attackerUnit, damageAmount, options) {
  if (!enemy || !state) return;
  const opts = options || {};
  if (!enemy.threatMap) enemy.threatMap = {};

  let unit = attackerUnit;
  if (!unit) {
    const players = syncAndGetPlayersArray();
    if (opts.attackerId) {
      unit = players.find((p) => p.id === opts.attackerId);
    } else if (opts.attackerHeroId) {
      unit = players.find((p) => p.heroId === opts.attackerHeroId);
    }
    if (!unit) unit = state.player;
  }

  const pid = (unit && unit.id) || 1;
  let threatWeight = 1.0;
  // Тяжёлые удары ближнего боя и «Нижний страж» генерируют повышенную угрозу, удерживая разворот босса
  if (opts.isHeavyMelee) threatWeight *= 1.45;
  if (unit && (unit.prefersLowerGuard || (unit.isLocalPlayer && state.itemsOwned && state.itemsOwned.heart))) {
    threatWeight *= 1.35;
  }
  const addedThreat = Math.max(1, (damageAmount || 5) * threatWeight);
  enemy.threatMap[pid] = (enemy.threatMap[pid] || 0) + addedThreat;
  if (unit) {
    unit.threatScore = (unit.threatScore || 0) + addedThreat;
    unit.damageDealt = (unit.damageDealt || 0) + (damageAmount || 0);
  }
}

/**
 * Выбирает приоритетную цель для моба или босса из массива `state.players`
 * с учётом дистанции, перепада высоты, накопленной агрессии (Threat) от урона
 * и распределения волн (`aggroSlot`), чтобы враги давили со всех сторон.
 */
function selectEnemyTargetFromPlayers(enemy, dt) {
  const living = getLivingPlayers();
  if (!living.length) return state.player;

  if (!enemy.threatMap) enemy.threatMap = {};
  const decay = Math.exp(-(dt || 0.016) * 0.28);
  for (const k in enemy.threatMap) {
    enemy.threatMap[k] *= decay;
  }

  enemy.retargetTimer = (enemy.retargetTimer || 0) - (dt || 0.016);
  if (
    enemy.targetPlayer &&
    isPlayerUnitAlive(enemy.targetPlayer) &&
    enemy.retargetTimer > 0 &&
    enemy.type !== 'b'
  ) {
    return enemy.targetPlayer;
  }
  enemy.retargetTimer = enemy.type === 'b' ? 0.18 : 0.45 + (enemy.aggroSlot % 5) * 0.08;

  let bestPlayer = living[0];
  let bestScore = -1e9;
  const preferredIdx = (enemy.aggroSlot || 0) % living.length;

  for (let i = 0; i < living.length; i++) {
    const cand = living[i];
    const dist = hypot2D(cand.x - enemy.x, cand.z - enemy.z);
    const dy = Math.abs((cand.y || 0) - (enemy.y || 0));
    const threatVal = (enemy.threatMap[cand.id] || 0) + (cand.threatScore || 0) * 0.08;

    // Близость + нанесённый урон (Threat) + распределение роя по разным игрокам
    const distScore = 140 / (dist + 4.5);
    const threatScore = enemy.type === 'b' ? threatVal * 0.55 : threatVal * 0.25;
    const heightPenalty = dy > 4.5 ? (dy - 4.5) * 3.2 : 0;
    const slotBonus = enemy.type !== 'b' && i === preferredIdx ? 16.0 : 0;
    const currentTargetStickiness = enemy.targetPlayer === cand ? 6.5 : 0;

    const totalScore = distScore + threatScore + slotBonus + currentTargetStickiness - heightPenalty;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestPlayer = cand;
    }
  }

  enemy.targetPlayer = bestPlayer;
  return bestPlayer;
}

/**
 * Возвращает основную и вторую (отличную от первой) цели босса из `state.players`
 * для парных кооперативных атак (`spawnBossArc`, `blueprintGrid` и др.).
 */
function getBossCoopTargets(boss, fallbackPrimary) {
  const living = getLivingPlayers();
  const primary =
    (boss && boss.targetPlayer && isPlayerUnitAlive(boss.targetPlayer) && boss.targetPlayer) ||
    (fallbackPrimary && isPlayerUnitAlive(fallbackPrimary) && fallbackPrimary) ||
    living[0] ||
    state.player;

  let secondary = null;
  if (living.length >= 2) {
    // Выбираем второго живого игрока (приоритетно с наибольшей дистанцией или угрозой, отличного от primary)
    let bestSecScore = -1e9;
    for (let i = 0; i < living.length; i++) {
      const cand = living[i];
      if (cand === primary) continue;
      const d = boss ? hypot2D(cand.x - boss.x, cand.z - boss.z) : 10;
      const t = (boss && boss.threatMap && boss.threatMap[cand.id]) || 0;
      const sc = d * 0.5 + t * 0.2 + Math.random() * 2;
      if (sc > bestSecScore) {
        bestSecScore = sc;
        secondary = cand;
      }
    }
  }
  return { primary, secondary, livingPlayers: living };
}

/* ==========================================================================
   2. СБРОС И ОБНОВЛЕНИЕ ОПАСНЫХ ЗОН БОССОВ (ВСЕ УЧАСТНИКИ ОТРЯДА)
   ========================================================================== */

function clearBlueprintDamageLines() {
  if (typeof state !== 'undefined' && state && state.blueprintDamageLines) {
    for (const line of state.blueprintDamageLines) {
      if (line.meshGroup && line.meshGroup.parent) {
        line.meshGroup.parent.remove(line.meshGroup);
      }
    }
    state.blueprintDamageLines.length = 0;
  }
  bossCoopVisualsGroup.clear();
}

function resetBossEffects() {
  clearBlueprintDamageLines();
  for (const ring of bossRings) {
    ring.active = 0;
    ring.hasHit = 0;
    ring.hitMask = 0;
    ring.mesh.visible = false;
  }
  for (const arc of bossArcs) {
    arc.active = 0;
    arc.hasHit = 0;
    arc.hitMask = 0;
    arc.mesh.visible = false;
  }
  for (const geyser of bossGeysers) {
    geyser.stage = 0;
    geyser.hasHit = 0;
    geyser.hitMask = 0;
    geyser.ring.visible = false;
    geyser.jet.visible = false;
  }

  golemDecalTargetOpacity = 0;
  golemDecalMat.opacity = 0;
  golemDecal.visible = false;
  golemDecal.position.y = -500;

  wombRuneTargetOpacity = 0;
  runeMat.opacity = 0;
  wombRune.visible = false;
  wombRune.position.y = -500;

  summonRingsTargetOpacity = 0;
  for (const ring of summonRings) {
    ring.occupied = 0;
    ring.occupiedBy = null;
    ring.mesh.visible = false;
    ring.mesh.material.opacity = 0;
    ring.mesh.scale.setScalar(1);
  }

  _bossDummyObj.position.set(0, -500, 0);
  _bossDummyObj.rotation.set(0, 0, 0);
  _bossDummyObj.scale.setScalar(1);
  _bossDummyObj.updateMatrix();

  for (const piece of slagData) {
    piece.active = 0;
    piece.y = -500;
  }
  for (let i = 0; i < SLAG_COUNT; i++) {
    slagInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }
  slagInstancedMesh.instanceMatrix.needsUpdate = true;

  for (const drip of dripData) {
    drip.active = 0;
    drip.y = -500;
  }
  for (let i = 0; i < DRIP_COUNT; i++) {
    dripInstancedMesh.setMatrixAt(i, _bossDummyObj.matrix);
  }
  dripInstancedMesh.instanceMatrix.needsUpdate = true;

  if (typeof coalBootEruptions !== 'undefined') {
    for (const er of coalBootEruptions) {
      er.active = 0;
      er.group.visible = false;
    }
  }
  if (typeof frostSlideCrystals !== 'undefined') {
    for (const fc of frostSlideCrystals) {
      fc.active = 0;
      fc.mesh.visible = false;
    }
  }
  if (typeof steamBurstEffects !== 'undefined') {
    for (const sb of steamBurstEffects) {
      sb.active = 0;
      sb.mesh.visible = false;
    }
  }
  if (typeof thunderStrikeEffects !== 'undefined') {
    for (const ts of thunderStrikeEffects) {
      ts.active = 0;
      ts.mesh.visible = false;
    }
  }
  if (typeof smeltCrystalBursts !== 'undefined') {
    for (const sc of smeltCrystalBursts) {
      sc.active = 0;
      sc.mesh.visible = false;
    }
  }
  if (typeof bombVisualPool !== 'undefined') {
    for (const bMesh of bombVisualPool) {
      bMesh.visible = false;
    }
  }
  if (typeof waveEffectRings !== 'undefined') {
    for (const wMesh of waveEffectRings) {
      wMesh.visible = false;
      wMesh.lifeLeft = 0;
    }
  }

  bossLight.intensity = 0;
  bossLight.position.set(0, -500, 0);

  lastBossWidthText = '';
  lastBossHpText = '';
  lastBossNameText = '';
  lastBossShownState = 0;
  if (DOM_CACHE && DOM_CACHE.bossHpContainer) {
    DOM_CACHE.bossHpContainer.classList.remove('visible');
  }
}

/**
 * Вычисляет кратчайшее 2D-расстояние от точки (px, pz) до отрезка (x1, z1)-(x2, z2).
 */
function distToSegment2D(px, pz, x1, z1, x2, z2) {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 1e-5) return hypot2D(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (pz - z1) * vz) / lenSq));
  return hypot2D(px - (x1 + t * vx), pz - (z1 + t * vz));
}

/**
 * Создаёт голографическую геометрическую ловушку-линию Архитектора Искажения (`blueprintGrid`),
 * связывающую двух игроков (`unitA` и `unitB`) линией урона.
 */
function spawnBlueprintDamageLineBetweenPlayers(boss, unitA, unitB, isPhase2) {
  if (!state || !unitA || !unitB) return;
  if (!state.blueprintDamageLines) state.blueprintDamageLines = [];

  const x1 = unitA.x;
  const z1 = unitA.z;
  const x2 = unitB.x;
  const z2 = unitB.z;
  const y = Math.min(unitA.lastGroundY || unitA.y, unitB.lastGroundY || unitB.y);
  const segLen = Math.max(1.5, hypot2D(x2 - x1, z2 - z1));
  const midX = (x1 + x2) * 0.5;
  const midZ = (z1 + z2) * 0.5;
  const yaw = Math.atan2(x2 - x1, z2 - z1);

  const meshGroup = new THREE.Group();
  const beamGeo = new THREE.PlaneGeometry(0.95, segLen);
  beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xd458ff,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.set(midX, y + 0.08, midZ);
  beamMesh.rotation.y = yaw;
  meshGroup.add(beamMesh);

  const coreBeamGeo = new THREE.CylinderGeometry(0.12, 0.12, segLen, 8);
  coreBeamGeo.rotateX(Math.PI / 2);
  const coreBeamMat = new THREE.MeshBasicMaterial({
    color: 0xf4d0ff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const coreBeam = new THREE.Mesh(coreBeamGeo, coreBeamMat);
  coreBeam.position.set(midX, y + 0.55, midZ);
  coreBeam.rotation.y = yaw;
  meshGroup.add(coreBeam);

  // Узловые рунные бомбы вдоль линии чертежа, связывающей двух игроков
  const nodeCount = isPhase2 ? 4 : 3;
  for (let i = 0; i < nodeCount; i++) {
    const frac = nodeCount === 1 ? 0.5 : i / (nodeCount - 1);
    const nx = x1 + (x2 - x1) * frac;
    const nz = z1 + (z2 - z1) * frac;
    state.activeBombs.push({
      x: nx,
      y,
      z: nz,
      timer: 1.15 + i * 0.14,
      nextRingTimer: 0,
      radius: 2.9,
      damage: 14,
      isBlueprintNode: 1
    });
  }

  bossCoopVisualsGroup.add(meshGroup);
  state.blueprintDamageLines.push({
    x1,
    z1,
    x2,
    z2,
    y,
    unitA,
    unitB,
    life: isPhase2 ? 3.2 : 2.5,
    maxLife: isPhase2 ? 3.2 : 2.5,
    tickTimer: 0.25,
    damage: isPhase2 ? 12 : 9,
    meshGroup,
    beamMesh,
    coreBeam,
    beamMat,
    coreBeamMat
  });
}

function updateBossHazards(dt) {
  const livingPlayers = getLivingPlayers();

  // 1. Ударные кольца боссов (проверка по всем живым игрокам из state.players)
  for (const ring of bossRings) {
    if (!ring.active) continue;
    ring.radius += ring.speed * dt;
    if (ring.radius > ring.maxRadius) {
      ring.active = 0;
      ring.mesh.visible = false;
      continue;
    }
    if (ring.hitMask === undefined) ring.hitMask = 0;
    for (let pi = 0; pi < livingPlayers.length; pi++) {
      const p = livingPlayers[pi];
      const bit = 1 << (p.id || pi + 1);
      if (ring.hitMask & bit) continue;
      const dist = hypot2D(p.x - ring.x, p.z - ring.z);
      if (dist < ring.radius + 0.9 && dist > ring.radius - 1.7) {
        ring.hitMask |= bit;
        if (p.isLocalPlayer) ring.hasHit = 1;
        const airHeight = (p.y || 0) - (p.lastGroundY !== undefined ? p.lastGroundY : p.y || 0);
        if (ring.damage > 0 && airHeight < 0.55 && Math.abs(p.y - ring.y) < 2.6) {
          damagePlayerUnit(p, ring.damage, {
            applyChill: state.towerId === 'ice',
            chillDuration: 2.0,
            shake: 0.35
          });
        }
      }
    }
  }

  // 2. Секторные разломы spawnBossArc (проверка по всем живым игрокам из state.players)
  for (const arc of bossArcs) {
    if (!arc.active) continue;
    arc.radius += 10 * dt;
    if (arc.radius > 17) {
      arc.active = 0;
      arc.mesh.visible = false;
      continue;
    }
    if (arc.hitMask === undefined) arc.hitMask = 0;
    for (let pi = 0; pi < livingPlayers.length; pi++) {
      const p = livingPlayers[pi];
      const bit = 1 << (p.id || pi + 1);
      if (arc.hitMask & bit) continue;
      const dist = hypot2D(p.x - arc.x, p.z - arc.z);
      if (dist < arc.radius + 0.9 && dist > arc.radius - 1.7) {
        arc.hitMask |= bit;
        if (p.isLocalPlayer) arc.hasHit = 1;
        const bearing = Math.atan2(p.z - arc.z, p.x - arc.x);
        if (Math.abs(angleDiff(bearing, arc.gapAngle)) > 0.95 && Math.abs(p.y - arc.y) < 5) {
          damagePlayerUnit(p, arc.damage, {
            applyChill: state.towerId === 'ice',
            chillDuration: 2.2,
            shake: 0.3
          });
        }
      }
    }
  }

  // 3. Синхронные гейзеры боссов 12-го этажа (проверка по всем живым игрокам)
  for (const geyser of bossGeysers) {
    if (!geyser.stage) continue;
    geyser.timer += dt;
    if (geyser.stage === 1) {
      if (geyser.timer > 0.85) {
        geyser.stage = 2;
        geyser.timer = 0;
        geyser.hasHit = 0;
        geyser.hitMask = 0;
        geyser.ring.visible = false;
        geyser.jet.visible = true;
        playSound('geyser');
        triggerScreenShake(0.18);
        if (hypot2D(state.player.x - geyser.x, state.player.z - geyser.z) < 9) {
          spawnSparkBurst(geyser.x, geyser.y + 0.4, geyser.z, 20, 'land');
        }
      }
    } else {
      if (geyser.hitMask === undefined) geyser.hitMask = 0;
      for (let pi = 0; pi < livingPlayers.length; pi++) {
        const p = livingPlayers[pi];
        const bit = 1 << (p.id || pi + 1);
        if (geyser.hitMask & bit) continue;
        if (
          hypot2D(p.x - geyser.x, p.z - geyser.z) < 1.85 &&
          p.y < geyser.y + 6 &&
          p.y > geyser.y - 1.2
        ) {
          geyser.hitMask |= bit;
          if (p.isLocalPlayer) geyser.hasHit = 1;
          damagePlayerUnit(p, 16, {
            applyChill: state.towerId === 'ice',
            chillDuration: 2.0,
            shake: 0.3
          });
        }
      }
      if (geyser.timer > 0.6) {
        geyser.stage = 0;
        geyser.jet.visible = false;
      }
    }
  }

  // 4. Голографические линии урона blueprintGrid Архитектора Искажения (связывающие двух игроков)
  if (state.blueprintDamageLines && state.blueprintDamageLines.length) {
    for (let i = state.blueprintDamageLines.length - 1; i >= 0; i--) {
      const line = state.blueprintDamageLines[i];
      line.life -= dt;
      if (line.life <= 0) {
        if (line.meshGroup && line.meshGroup.parent) {
          line.meshGroup.parent.remove(line.meshGroup);
        }
        state.blueprintDamageLines.splice(i, 1);
        continue;
      }

      // Если оба связанных игрока живы, линия плавно тянется за ними со скоростью проекции чертежа
      if (line.unitA && isPlayerUnitAlive(line.unitA) && line.unitB && isPlayerUnitAlive(line.unitB)) {
        line.x1 += (line.unitA.x - line.x1) * Math.min(1, dt * 3.2);
        line.z1 += (line.unitA.z - line.z1) * Math.min(1, dt * 3.2);
        line.x2 += (line.unitB.x - line.x2) * Math.min(1, dt * 3.2);
        line.z2 += (line.unitB.z - line.z2) * Math.min(1, dt * 3.2);
        const segLen = Math.max(1.0, hypot2D(line.x2 - line.x1, line.z2 - line.z1));
        const midX = (line.x1 + line.x2) * 0.5;
        const midZ = (line.z1 + line.z2) * 0.5;
        const yaw = Math.atan2(line.x2 - line.x1, line.z2 - line.z1);
        line.beamMesh.position.set(midX, line.y + 0.08, midZ);
        line.beamMesh.rotation.y = yaw;
        line.coreBeam.position.set(midX, line.y + 0.55, midZ);
        line.coreBeam.rotation.y = yaw;
        line.beamMesh.scale.set(1, 1, segLen / Math.max(1.5, line.beamMesh.geometry.parameters.height || segLen));
      }

      const fade = Math.min(1, line.life / 0.5);
      const pulse = 0.65 + 0.35 * Math.sin(state.elapsedTime * 18);
      line.beamMat.opacity = 0.75 * fade * pulse;
      line.coreBeamMat.opacity = 0.92 * fade;

      line.tickTimer -= dt;
      if (line.tickTimer <= 0) {
        line.tickTimer = 0.38;
        spawnGlobalBolt(line.x1, line.y + 0.6, line.z1, line.x2, line.y + 0.6, line.z2, 0.14, 9, 0xd868ff);
        for (let pi = 0; pi < livingPlayers.length; pi++) {
          const p = livingPlayers[pi];
          if (Math.abs(p.y - line.y) > 2.6) continue;
          const dSeg = distToSegment2D(p.x, p.z, line.x1, line.z1, line.x2, line.z2);
          if (dSeg < 0.95) {
            damagePlayerUnit(p, line.damage, { shake: 0.22 });
          }
        }
      }
    }
  }
}

/**
 * Вспомогательная функция веерного залпа снарядов босса по целевому игроку.
 */
function fireBossProjectileFan(boss, targetUnit, count, spreadAngle, speed, damage) {
  if (state.projectiles.length >= 235) return;
  const target = targetUnit || state.player;
  playSound('shoot');
  const baseAngle = Math.atan2(target.z - boss.z, target.x - boss.x);
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spreadAngle;
    const ang = baseAngle + offset;
    state.projectiles.push({
      x: boss.x,
      y: (target.y || boss.y) + 0.85,
      z: boss.z,
      vx: Math.cos(ang) * speed,
      vz: Math.sin(ang) * speed,
      lifetime: 3.8,
      isHostile: 1,
      damage
    });
  }
}

/* ==========================================================================
   3. МАШИНЫ СОСТОЯНИЙ 9 БОССОВ С КООПЕРАТИВНЫМИ ФАЗАМИ (ЭТАЖИ 4, 8, 12)
   ========================================================================== */

function updateBossAI(boss, dt, player, dx, dz, dist) {
  // Выбираем актуальную цель по системе распределения агрессии (Threat / Multi-Target)
  const targetPlayer = selectEnemyTargetFromPlayers(boss, dt) || player || state.player;
  const tdx = targetPlayer.x - boss.x;
  const tdz = targetPlayer.z - boss.z;
  const tdist = Math.sqrt(tdx * tdx + tdz * tdz) || 1;

  if (boss.bkind === 'golem') {
    updateGolemBoss(boss, dt, targetPlayer, tdx, tdz, tdist);
  } else if (boss.bkind === 'womb') {
    updateWombBoss(boss, dt, targetPlayer, tdx, tdz, tdist);
  } else {
    updateKolossBoss(boss, dt, targetPlayer, tdx, tdz, tdist);
  }
}

/**
 * СЛОТ 1 (Этаж 4) — Кооперативные фазы:
 * - 'ash': Голем Пепельных Врат
 * - 'ice': Хранитель Забытых Обрядов
 * - 'void': Архитектор Искажения
 * Кооп-механика:
 * - Выпуск ударных колец и секторных разломов (spawnBossArc) сразу в направлении двух разных игроков.
 * - У Архитектора Искажения (blueprintGrid) — генерация геометрических ловушек, связывающих двух игроков линией урона.
 */
function updateGolemBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  const isPhase2 = boss.phase === 2;
  boss.bossTimer += dt;

  const { primary, secondary, livingPlayers } = getBossCoopTargets(boss, player);
  const desiredYaw = Math.atan2(primary.x - boss.x, primary.z - boss.z);
  boss.facingYaw += angleDiff(desiredYaw, boss.facingYaw || desiredYaw) * Math.min(1, dt * 5.5);

  if (!isPhase2 && boss.hp <= boss.maxHp * 0.5) {
    boss.phase = 2;
    boss.bossState = 'roar';
    boss.bossTimer = 0;
    boss.flare = 1.6;
    boss.isMoving = 0;
    boss.roarFxDone = 0;
    boss.bossSpeedMul = 1.35;
    playSound('roar');
    triggerScreenShake(0.5);
    const flashGrad =
      towerId === 'ice'
        ? 'radial-gradient(circle, rgba(90,210,255,.38) 0%, transparent 70%)'
        : towerId === 'void'
          ? 'radial-gradient(circle, rgba(190,80,255,.4) 0%, transparent 70%)'
          : 'radial-gradient(circle, rgba(255,120,40,.35) 0%, transparent 70%)';
    triggerScreenFlash(flashGrad);
    return;
  }

  // Перемещение по телепорту (для Хранителя во 2-й фазе и Архитектора Искажения)
  if (boss.teleportDest) {
    boss.teleportDest.timer -= dt;
    if (boss.teleportDest.timer <= 0) {
      const oldX = boss.x;
      const oldZ = boss.z;
      boss.x = boss.teleportDest.x;
      boss.z = boss.teleportDest.z;
      boss.teleportDest = null;
      spawnWaveRingEffect(oldX, boss.y + 0.5, oldZ, 2.2, towerId === 'ice' ? 0x80e8ff : 0xc868ff);
      spawnBossRing(boss.x, boss.y, boss.z, 15, 10, 15);
      if (towerId === 'void') {
        fireBossProjectileFan(boss, primary, 4, Math.PI * 0.85, 11, 10);
        if (secondary) {
          fireBossProjectileFan(boss, secondary, 3, Math.PI * 0.65, 11, 10);
        }
      }
      triggerScreenShake(0.4);
      playSound('pound');
    }
  }

  const windupDuration = isPhase2 ? 0.45 : 0.68;
  const slamDuration = isPhase2 ? 0.25 : 0.35;
  const recoverDuration = isPhase2 ? 0.58 : 0.92;
  const maxArenaR = (typeof TOWER_FLOOR_RADIUS !== 'undefined' ? TOWER_FLOOR_RADIUS : 28) - 3.5;

  if (boss.bossState === 'spawn') {
    boss.isMoving = 0;
    if (boss.bossTimer > 0.9) {
      boss.bossState = 'march';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'march') {
    boss.isMoving = 1;
    boss.marchTimer += dt * (isPhase2 ? 1.5 : 0.95);
    const swing = Math.sin(boss.marchTimer * Math.PI * 2);
    if (boss.prevSwing * swing < 0 && Math.abs(swing - boss.prevSwing) < 1 && dist < 45) {
      const side = swing > 0 ? -0.65 : 0.65;
      const cosYaw = Math.cos(boss.facingYaw);
      const sinYaw = Math.sin(boss.facingYaw);
      spawnSmokePuff(
        boss.x + side * cosYaw * boss.bossScale,
        boss.y,
        boss.z - side * sinYaw * boss.bossScale,
        5
      );
      triggerScreenShake(0.045);
    }
    boss.prevSwing = swing;

    const triggerRange = towerId === 'ash' ? 15.5 : 22.0;
    const cd = isPhase2 ? 1.45 : 2.5;
    if (boss.bossTimer > cd && dist < triggerRange) {
      boss.bossState = 'windup';
      boss.bossTimer = 0;
      boss.attackCount++;

      if (towerId === 'ice') {
        boss.nextAttack = boss.attackCount % 2 === 1 ? 'bellToll' : 'staffLine';
        if (isPhase2 && boss.attackCount % 3 === 0) {
          const teleTarget = secondary && boss.attackCount % 2 === 0 ? secondary : primary;
          const ang = Math.random() * TWO_PI;
          let tx = teleTarget.x + Math.cos(ang) * 4.5;
          let tz = teleTarget.z + Math.sin(ang) * 4.5;
          const rad = hypot2D(tx, tz);
          if (rad > maxArenaR) {
            tx *= maxArenaR / rad;
            tz *= maxArenaR / rad;
          }
          boss.teleportDest = { x: tx, z: tz, timer: 0.35 };
        }
      } else if (towerId === 'void') {
        boss.nextAttack = boss.attackCount % 2 === 1 ? 'blueprintGrid' : 'spatialFold';
        if (boss.nextAttack === 'spatialFold') {
          state.activeBombs.push({
            x: boss.x,
            y: primary.lastGroundY || boss.y,
            z: boss.z,
            timer: 1.0,
            nextRingTimer: 0,
            radius: 3.8,
            damage: 15
          });
          const foldTarget = secondary && boss.attackCount % 4 === 0 ? secondary : primary;
          const ang = Math.atan2(foldTarget.z - boss.z, foldTarget.x - boss.x) + (Math.random() - 0.5) * 1.4;
          let tx = foldTarget.x - Math.cos(ang) * 5.0;
          let tz = foldTarget.z - Math.sin(ang) * 5.0;
          const rad = hypot2D(tx, tz);
          if (rad > maxArenaR) {
            tx *= maxArenaR / rad;
            tz *= maxArenaR / rad;
          }
          boss.teleportDest = { x: tx, z: tz, timer: 0.42 };
        }
      } else {
        boss.nextAttack = (isPhase2 || livingPlayers.length >= 2) && boss.attackCount % 2 === 0 ? 'pound' : 'fist';
      }
    }
  } else if (boss.bossState === 'windup') {
    boss.isMoving = 0;
    if (boss.bossTimer > windupDuration) {
      boss.bossState = 'slam';
      boss.bossTimer = 0;
      boss.impactDone = 0;
    }
  } else if (boss.bossState === 'slam') {
    boss.isMoving = 0;
    if (!boss.impactDone && boss.bossTimer > 0.12) {
      boss.impactDone = 1;
      const yawToPrimary = Math.atan2(primary.x - boss.x, primary.z - boss.z);
      const yawToSecondary = secondary
        ? Math.atan2(secondary.x - boss.x, secondary.z - boss.z)
        : yawToPrimary + Math.PI * 0.65;

      if (towerId === 'ice') {
        // ХРАНИТЕЛЬ ЗАБЫТЫХ ОБРЯДОВ: двойной секторный разлом и печати стужи по двум игрокам
        if (boss.nextAttack === 'bellToll') {
          spawnBossRing(boss.x, boss.y, boss.z, 16, 11, 18);
          spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 15);
          if (secondary || isPhase2) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 15);
            boss.pendingRingTimer = 0.28;
          }
          const targetsForSeals = secondary ? [primary, secondary] : [primary];
          for (let ti = 0; ti < targetsForSeals.length; ti++) {
            const tUnit = targetsForSeals[ti];
            const sealCount = isPhase2 ? 2 : 1;
            for (let i = 0; i < sealCount; i++) {
              const a = (i / sealCount) * TWO_PI + yawToPrimary;
              const r = i === 0 ? 0 : 3.8;
              state.activeBombs.push({
                x: tUnit.x + Math.cos(a) * r,
                y: tUnit.lastGroundY !== undefined ? tUnit.lastGroundY : boss.y,
                z: tUnit.z + Math.sin(a) * r,
                timer: 1.15 + i * 0.2,
                nextRingTimer: 0,
                radius: 3.8,
                damage: 14,
                applyChill: 1
              });
            }
          }
          spawnSparkBurst(boss.x, boss.y + 1.8, boss.z, 26, 'land');
          boss.flare = 1.5;
          boss.shake = 0.22;
          boss.floorFlare = 1;
          playSound('pound');
          triggerScreenShake(0.5);
        } else {
          // Удар Посохом Обряда: линии ледяных шпилей и секторные разломы сразу в направлении двух игроков
          const lineTargets = secondary ? [primary, secondary] : [primary];
          const spikeCount = isPhase2 ? 5 : 4;
          for (let ti = 0; ti < lineTargets.length; ti++) {
            const tUnit = lineTargets[ti];
            const ang = Math.atan2(tUnit.z - boss.z, tUnit.x - boss.x);
            for (let i = 1; i <= spikeCount; i++) {
              state.activeBombs.push({
                x: boss.x + Math.cos(ang) * i * 3.4,
                y: tUnit.lastGroundY !== undefined ? tUnit.lastGroundY : boss.y,
                z: boss.z + Math.sin(ang) * i * 3.4,
                timer: 0.55 + i * 0.16,
                nextRingTimer: 0,
                radius: 2.6,
                damage: 13,
                applyChill: 1
              });
            }
            fireBossProjectileFan(boss, tUnit, isPhase2 ? 4 : 3, 0.58, 11.5, 10);
          }
          spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 14);
          if (secondary) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 14);
          }
          boss.flare = 1.2;
          boss.shake = 0.16;
          playSound('boom');
          triggerScreenShake(0.35);
        }
      } else if (towerId === 'void') {
        // АРХИТЕКТОР ИСКАЖЕНИЯ
        if (boss.nextAttack === 'blueprintGrid') {
          // Проекция геометрического чертежа + связывание двух игроков линией урона (blueprintDamageLine)!
          const vertCount = isPhase2 ? 5 : 3;
          for (let i = 0; i < vertCount; i++) {
            const a = (i / vertCount) * TWO_PI + state.elapsedTime;
            const r = 4.2;
            let bx = primary.x + Math.cos(a) * r;
            let bz = primary.z + Math.sin(a) * r;
            const rad = hypot2D(bx, bz);
            if (rad > maxArenaR) {
              bx *= maxArenaR / rad;
              bz *= maxArenaR / rad;
            }
            state.activeBombs.push({
              x: bx,
              y: primary.lastGroundY !== undefined ? primary.lastGroundY : boss.y,
              z: bz,
              timer: 1.05 + i * 0.12,
              nextRingTimer: 0,
              radius: 3.6,
              damage: 15
            });
          }

          // Кооперативная ловушка blueprintGrid: связывает двух разных игроков линией урона!
          if (secondary) {
            spawnBlueprintDamageLineBetweenPlayers(boss, primary, secondary, isPhase2);
            if (livingPlayers.length >= 3) {
              const thirdPlayer = livingPlayers.find((p) => p !== primary && p !== secondary);
              if (thirdPlayer && isPhase2) {
                spawnBlueprintDamageLineBetweenPlayers(boss, secondary, thirdPlayer, isPhase2);
              }
            }
            if ((state.hintCooldown || 0) <= 0) {
              state.hintCooldown = 2.8;
              showToast('📐 Чертежи Архитектора: два игрока связаны линией урона — разорвите траекторию!', 2.4);
            }
          }

          fireBossProjectileFan(boss, primary, isPhase2 ? 5 : 3, 0.72, 12, 11);
          if (secondary) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 14);
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 14);
          }
          if (isPhase2 && !state.vortexPull) {
            state.vortexPull = {
              x: primary.x,
              z: primary.z,
              y: primary.lastGroundY !== undefined ? primary.lastGroundY : boss.y,
              timer: 1.6,
              strength: 5.5,
              spawnRingOnEnd: 1
            };
          }
          boss.flare = 1.45;
          boss.floorFlare = 1;
          playSound('summon');
          triggerScreenShake(0.35);
        } else {
          // Удар посохом после Складки Пространства: ударное кольцо + двойной секторный разлом по двум игрокам
          spawnBossRing(boss.x, boss.y, boss.z, 16, 10, 16);
          spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 16);
          if (secondary || isPhase2) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 16);
          }
          if (isPhase2) boss.pendingRingTimer = 0.26;
          boss.flare = 1.5;
          boss.shake = 0.2;
          playSound('boom');
          triggerScreenShake(0.45);
        }
      } else {
        // ПЕПЕЛЬНАЯ БАШНЯ — ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ: ударные кольца и двойные секторные разломы по двум игрокам
        if (boss.nextAttack === 'pound') {
          spawnBossRing(boss.x, boss.y, boss.z, 16, 10, 17);
          spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 16);
          if (secondary || isPhase2) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 16);
            boss.pendingRingTimer = 0.26;
          }
          if (dist < 50) {
            spawnSlagBurst(boss.x, boss.y, boss.z, 12, 1.4);
            spawnSparkBurst(boss.x, boss.y + 0.2, boss.z, 28, 'land');
            spawnSmokePuff(boss.x, boss.y + 0.1, boss.z, 14);
          }
          boss.flare = 1.5;
          boss.shake = 0.26;
          boss.floorFlare = 1;
          playSound('pound');
          triggerScreenShake(0.55);
        } else {
          const fistX = boss.x + Math.sin(boss.facingYaw) * 2.9 * boss.bossScale;
          const fistZ = boss.z + Math.cos(boss.facingYaw) * 2.9 * boss.bossScale;
          spawnBossRing(fistX, boss.y, fistZ, 16, 9, 15);
          spawnBossArc(boss.x, boss.y, boss.z, yawToPrimary, 14);
          if (secondary) {
            spawnBossArc(boss.x, boss.y, boss.z, yawToSecondary, 14);
          }
          if (dist < 50) {
            spawnSlagBurst(fistX, boss.y, fistZ, 7, 1.2);
            spawnSparkBurst(fistX, boss.y + 0.2, fistZ, 22, 'land');
            spawnSmokePuff(fistX, boss.y + 0.1, fistZ, 10);
          }
          boss.flare = 1;
          boss.shake = 0.16;
          playSound('boom');
          triggerScreenShake(0.4);
        }
      }
    }
    if (boss.bossTimer > slamDuration) {
      boss.bossState = 'recover';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'recover') {
    boss.isMoving = 0;
    if (boss.bossTimer > recoverDuration) {
      boss.bossState = 'march';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'roar') {
    boss.isMoving = 0;
    if (!boss.roarFxDone && boss.bossTimer > 0.3) {
      boss.roarFxDone = 1;
      spawnBossRing(boss.x, boss.y, boss.z, 0, 11, 16);
      if (dist < 50) {
        spawnSparkBurst(boss.x, boss.y + 3.2 * boss.bossScale, boss.z, 26, 'land');
      }
    }
    if (boss.bossTimer > 1.2) {
      boss.bossState = 'march';
      boss.bossTimer = 0;
    }
  }

  if (boss.pendingRingTimer > 0) {
    boss.pendingRingTimer -= dt;
    if (boss.pendingRingTimer <= 0) {
      spawnBossRing(boss.x, boss.y, boss.z, 18, 8, 19);
    }
  }

  boss.flare *= Math.exp(-dt * 3.2);
  boss.shake *= Math.exp(-dt * 8);
  boss.floorFlare *= Math.exp(-dt * 2.5);

  boss.shedTimer -= dt * (isPhase2 ? 2 : 1);
  if (boss.shedTimer <= 0) {
    boss.shedTimer = 0.12 + Math.random() * 0.15;
    if (dist < 45) {
      spawnSparkBurst(
        boss.x + (Math.random() - 0.5) * 2.2 * boss.bossScale,
        boss.y + (1 + Math.random() * 3.2) * boss.bossScale,
        boss.z + (Math.random() - 0.5) * 2.2 * boss.bossScale,
        2,
        'takeoff'
      );
    }
  }
}

/**
 * СЛОТ 2 (Этаж 8) — Кооперативные фазы:
 * - 'ash': Кристальная Матка
 * - 'ice': Изувеченная Снежная Пряха
 * - 'void': Пожиратель Фаз
 * Кооп-механика:
 * - Привязка 4 кругов призыва (summonRings) к механике взлома щита: если игроки одновременно
 *   встают в подсвеченные рунные круги, неуязвимость босса (enemy.shield = 1) спадает втрое быстрее (×3)
 *   и открывает окно двойного урона (enemy.weak = 1).
 */
function updateWombBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  const isPhase2 = boss.phase === 2;
  const { primary, secondary, livingPlayers } = getBossCoopTargets(boss, player);

  const desiredYaw = Math.atan2(primary.x - boss.x, primary.z - boss.z);
  boss.facingYaw += angleDiff(desiredYaw, boss.facingYaw || desiredYaw) * Math.min(1, dt * 5.0);

  if (!isPhase2 && boss.hp <= boss.maxHp * 0.5) {
    boss.phase = 2;
    boss.flare = 1.6;
    playSound('roar');
    triggerScreenShake(0.35);
    if (dist < 50) {
      spawnWaveRingEffect(
        boss.x,
        boss.y,
        boss.z,
        3.2,
        towerId === 'ice' ? 0x80e8ff : 0xc090ff
      );
    }
  }

  // Пряха и Пожиратель Фаз двигаются активнее Кристальной Матки
  if (towerId === 'ice' || towerId === 'void') {
    boss.isMoving = dist > 10.5 ? 1 : 0;
  } else {
    boss.isMoving = dist > 30 ? 1 : 0;
  }

  const hoverAmp = towerId === 'ice' ? 0.08 : 0.22;
  boss.y = boss.baseY + Math.sin(state.elapsedTime * 1.4) * hoverAmp;

  const summonDuration = isPhase2 ? 4.8 : 6.0;
  const rechargeDuration = (isPhase2 ? 3.8 : 3.4) + (boss.shieldBrokenByRunes ? 1.4 : 0);

  // --- ПРОВЕРКА УДЕРЖАНИЯ 4 РУННЫХ КРУГОВ ПРИЗЫВА (summonRings) ИГРОКАМИ ---
  let occupiedRingsCount = 0;
  const requiredRingsForFullHack = Math.min(4, Math.max(1, livingPlayers.length));
  const ringsActive = boss.bossState === 'summon' || boss.bossState === 'crack';

  if (ringsActive) {
    for (let ri = 0; ri < summonRings.length; ri++) {
      const ring = summonRings[ri];
      ring.occupied = 0;
      ring.occupiedBy = null;
      for (let pi = 0; pi < livingPlayers.length; pi++) {
        const p = livingPlayers[pi];
        if (Math.abs(p.y - ring.y) < 3.2 && hypot2D(p.x - ring.x, p.z - ring.z) <= 2.2) {
          ring.occupied = 1;
          ring.occupiedBy = p;
          occupiedRingsCount++;
          break;
        }
      }
    }
  } else {
    for (let ri = 0; ri < summonRings.length; ri++) {
      summonRings[ri].occupied = 0;
      summonRings[ri].occupiedBy = null;
    }
  }

  // Если игроки одновременно стоят в подсвеченных рунных кругах, щит (enemy.shield = 1) спадает втрое быстрее!
  const isFullRuneOverload =
    ringsActive &&
    (occupiedRingsCount >= requiredRingsForFullHack ||
      (livingPlayers.length >= 2 && occupiedRingsCount >= 2));
  const shieldDecayMultiplier = isFullRuneOverload
    ? 3.0
    : ringsActive && occupiedRingsCount > 0
      ? 1.0 + occupiedRingsCount * 0.75
      : 1.0;

  boss.occupiedSummonRings = occupiedRingsCount;
  boss.requiredSummonRings = requiredRingsForFullHack;
  boss.shieldDecayMultiplier = shieldDecayMultiplier;
  boss.bossTimer += dt * (boss.bossState === 'summon' ? shieldDecayMultiplier : 1.0);

  if (isFullRuneOverload) {
    boss.runeBoltTick = (boss.runeBoltTick || 0) - dt;
    if (boss.runeBoltTick <= 0) {
      boss.runeBoltTick = 0.22;
      for (let ri = 0; ri < summonRings.length; ri++) {
        const ring = summonRings[ri];
        if (ring.occupied) {
          spawnGlobalBolt(ring.x, ring.y + 0.35, ring.z, boss.x, boss.y, boss.z, 0.16, 9, 0x38ffe8);
        }
      }
      boss.shake = Math.max(boss.shake, 0.14);
    }
  }

  if (boss.bossState === 'spawn') {
    if (boss.bossTimer > 0.9) {
      boss.bossState = 'summon';
      boss.bossTimer = 0;
      boss.summonTimer = 0.4;
      boss.specialSkillTimer = 2.6;
      boss.shieldBrokenByRunes = 0;
      placeSummonRings(boss);
    }
  } else if (boss.bossState === 'summon') {
    // Призыв миньонов соответствующей башни из 4 кругов (до лимита 400 врагов)
    boss.summonTimer -= dt;
    if (boss.summonTimer <= 0) {
      boss.summonTimer = isPhase2 ? 0.6 : 0.8;
      let summonedMinions = 0;
      for (const other of state.enemies) {
        if (other.fromWomb) summonedMinions++;
      }
      const maxMinions = (isPhase2 ? 8 : 6) + Math.max(0, (state.playerCount || 1) - 1) * 2;
      if (summonedMinions < maxMinions && state.enemies.length < 385) {
        const ring = summonRings[Math.floor(Math.random() * 4)];
        const minionType = Math.random() < 0.6 ? 's' : 'r';
        spawnEnemy(
          minionType,
          ring.x + (Math.random() - 0.5) * 1.2,
          ring.z + (Math.random() - 0.5) * 1.2,
          1 + state.maxFloorReached * 0.12
        );
        state.enemies[state.enemies.length - 1].fromWomb = 1;
        playSound('summon');
        if (dist < 50) {
          spawnWaveRingEffect(
            ring.x,
            ring.y + 0.4,
            ring.z,
            1.3,
            towerId === 'ice' ? 0x80e8ff : 0xc070ff
          );
        }
      }
    }

    // Электрические/морозные дуги вокруг босса
    boss.arcBoltTimer -= dt;
    if (boss.arcBoltTimer <= 0) {
      boss.arcBoltTimer = isPhase2 ? 0.4 : 0.6;
      if (dist < 45 && boss.bolts.length < 8) {
        const angle = Math.random() * TWO_PI;
        const radius = 1.2 + Math.random() * 1.4;
        boss.bolts.push(
          acquireBolt(
            boss.mesh,
            0,
            0,
            0,
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * radius * 0.6,
            Math.sin(angle) * radius,
            0.18,
            9,
            0.14 + Math.random() * 0.16
          )
        );
      }
    }

    // Дальние атаки по башням (обстрел основной и второй цели в коопе)
    boss.orbTimer -= dt;
    if (boss.orbTimer <= 0 && dist < 38 && state.projectiles.length < 235) {
      if (towerId === 'ice') {
        boss.orbTimer = isPhase2 ? 1.25 : 1.75;
        fireBossProjectileFan(boss, primary, isPhase2 ? 5 : 3, 0.55, 11.5, 9);
        if (secondary) fireBossProjectileFan(boss, secondary, 3, 0.45, 11.5, 9);
      } else if (towerId === 'void') {
        boss.orbTimer = isPhase2 ? 1.1 : 1.55;
        fireBossProjectileFan(boss, primary, isPhase2 ? 4 : 2, 0.42, 12.5, 10);
        if (secondary) fireBossProjectileFan(boss, secondary, 2, 0.36, 12.5, 10);
      } else {
        boss.orbTimer = isPhase2 ? 1.15 : 1.7;
        fireBossProjectileFan(boss, primary, 1, 0, 9.5, 9);
        if (secondary) fireBossProjectileFan(boss, secondary, 1, 0, 9.5, 9);
      }
    }

    // Уникальные спецнавыки Пряхи и Пожирателя Фаз
    if (towerId !== 'ash') {
      boss.specialSkillTimer = (boss.specialSkillTimer === undefined ? 2.8 : boss.specialSkillTimer) - dt;
      if (boss.specialSkillTimer <= 0) {
        boss.specialSkillTimer = isPhase2 ? 3.2 : 4.5;
        const floorY = boss.wombFloorY || boss.y - 3.2;

        if (towerId === 'ice') {
          spawnBossArc(boss.x, floorY, boss.z, boss.facingYaw, 14);
          if (secondary) {
            spawnBossArc(
              boss.x,
              floorY,
              boss.z,
              Math.atan2(secondary.x - boss.x, secondary.z - boss.z),
              14
            );
          }
          for (let i = 0; i < (isPhase2 ? 3 : 2); i++) {
            const bombTarget = secondary && i % 2 === 1 ? secondary : primary;
            state.activeBombs.push({
              x: bombTarget.x + (Math.random() - 0.5) * 7,
              y: bombTarget.lastGroundY !== undefined ? bombTarget.lastGroundY : floorY,
              z: bombTarget.z + (Math.random() - 0.5) * 7,
              timer: 1.25 + i * 0.25,
              nextRingTimer: 0,
              radius: 3.5,
              damage: 12,
              applyChill: 1
            });
          }
          if (isPhase2 && !state.vortexPull) {
            state.vortexPull = {
              x: boss.x,
              z: boss.z,
              y: floorY,
              timer: 1.5,
              strength: 5.8,
              spawnRingOnEnd: 1
            };
          }
          boss.flare = 1.2;
          playSound('boom');
        } else if (towerId === 'void') {
          const maxR = (typeof TOWER_FLOOR_RADIUS !== 'undefined' ? TOWER_FLOOR_RADIUS : 28) - 4;
          if (dist > 7) {
            const stepDist = Math.min(6.5, dist - 5.5);
            boss.x += (dx / dist) * stepDist;
            boss.z += (dz / dist) * stepDist;
            const rad = hypot2D(boss.x, boss.z);
            if (rad > maxR) {
              boss.x *= maxR / rad;
              boss.z *= maxR / rad;
            }
          }
          spawnBossArc(boss.x, floorY, boss.z, boss.facingYaw, 16);
          if (secondary) {
            spawnBossArc(
              boss.x,
              floorY,
              boss.z,
              Math.atan2(secondary.x - boss.x, secondary.z - boss.z),
              16
            );
          }
          if (!state.vortexPull) {
            state.vortexPull = {
              x: boss.x,
              z: boss.z,
              y: floorY,
              timer: 1.9,
              strength: 6.5,
              spawnRingOnEnd: 1
            };
          }
          boss.flare = 1.35;
          playSound('pound');
          triggerScreenShake(0.3);
        }
      }
    }

    if (boss.bossTimer > summonDuration) {
      boss.bossState = 'crack';
      boss.bossTimer = 0;
      boss.flare = 1.4;
      boss.shieldBrokenByRunes = occupiedRingsCount > 0 ? 1 : 0;
      playSound('shield');
      if (occupiedRingsCount > 0) {
        showToast(
          '🔓 Рунные круги активированы (' +
            occupiedRingsCount +
            '/' +
            requiredRingsForFullHack +
            ')! Щит босса взломан (×3 скорость) — ОКНО УЯЗВИМОСТИ ×2!',
          3.0
        );
      }
      if (dist < 50) {
        for (let k = 0; k < 6; k++) {
          const angle = Math.random() * TWO_PI;
          const radius = 1.6 + Math.random() * 0.6;
          if (boss.bolts.length < 14) {
            boss.bolts.push(
              acquireBolt(
                boss.mesh,
                0,
                0,
                0,
                Math.cos(angle) * radius,
                (Math.random() - 0.5) * radius * 0.7,
                Math.sin(angle) * radius,
                0.25,
                8,
                0.2
              )
            );
          }
        }
        spawnWaveRingEffect(
          boss.x,
          boss.y,
          boss.z,
          2.8,
          occupiedRingsCount > 0 ? 0x38ffe8 : towerId === 'ice' ? 0x80e8ff : 0xc090ff
        );
      }
    }
  } else if (boss.bossState === 'crack') {
    const crackDur = boss.shieldBrokenByRunes ? 0.32 : 0.7;
    if (boss.bossTimer > crackDur) {
      boss.bossState = 'recharge';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'recharge') {
    boss.arcBoltTimer -= dt;
    if (boss.arcBoltTimer <= 0 && dist < 45 && boss.bolts.length < 8) {
      boss.arcBoltTimer = 0.3;
      const angle = Math.random() * TWO_PI;
      const radius = 1.2 + Math.random() * 1.2;
      boss.bolts.push(
        acquireBolt(
          boss.mesh,
          0,
          0,
          0,
          Math.cos(angle) * radius,
          (Math.random() - 0.5) * radius,
          Math.sin(angle) * radius,
          0.2,
          8,
          0.12
        )
      );
    }
    if (boss.bossTimer > rechargeDuration) {
      boss.bossState = 'close';
      boss.bossTimer = 0;
      boss.shieldBrokenByRunes = 0;
    }
  } else {
    if (boss.bossTimer > 0.7) {
      boss.bossState = 'summon';
      boss.bossTimer = 0;
      boss.summonTimer = 0.5;
      placeSummonRings(boss);
    }
  }

  boss.shield =
    boss.bossState === 'summon' || boss.bossState === 'crack' || boss.bossState === 'close' ? 1 : 0;
  boss.weak = boss.bossState === 'recharge' ? 1 : 0;
  boss.openTarget =
    boss.bossState === 'recharge'
      ? 1
      : boss.bossState === 'crack'
        ? easeInOutQuad(Math.min(1, boss.bossTimer / 0.7)) * 0.4
        : 0;
  boss.openAmount += (boss.openTarget - boss.openAmount) * Math.min(1, dt * 7);

  if (ringsActive && boss.isMoving) {
    placeSummonRings(boss);
  }
  wombRuneTargetOpacity = ringsActive ? 0.55 : boss.openAmount * 0.18;
  summonRingsTargetOpacity = ringsActive ? (occupiedRingsCount > 0 ? 0.92 : 0.62) : 0;
  boss.flare *= Math.exp(-dt * 3);
}

/**
 * Проверяет и обрабатывает попадание игрока или союзника по уязвимым отдушинам (`KOLOSS_VENTS`)
 * на спине босса 12-го этажа (Лавовый Колосс, Первозданный Буран, Вестник Коллапса),
 * пока другой участник отряда отвлекает разворот босса (`boss.facingYaw`).
 * Возвращает множитель урона по боссу.
 */
function evaluateKolossVentBackstabMultiplier(boss, attackerUnit, baseDmg) {
  if (!boss || boss.bkind !== 'koloss') return 1.0;
  const attacker = attackerUnit || state.player;
  const angleFromBossToAttacker = Math.atan2(attacker.x - boss.x, attacker.z - boss.z);
  const backAngle = (boss.facingYaw || 0) + Math.PI;
  const diffToBack = Math.abs(angleDiff(angleFromBossToAttacker, backAngle));

  const isBackHit = diffToBack < 1.32;
  const isOverloadPhase = boss.bossState === 'coreOverload';

  if (isBackHit && (isOverloadPhase || boss.isFury || (state.playerCount || 1) >= 2)) {
    // Попадание по уязвимым отдушинам (KOLOSS_VENTS) на спине босса!
    const ventIdx = ((boss.ventOverloadHits || 0) % KOLOSS_VENTS.length);
    boss.ventFlares[ventIdx] = 1.0;
    const ventPos = KOLOSS_VENTS[ventIdx];
    bossLocalToWorld(boss, ventPos[0], ventPos[1], ventPos[2], _bossWorldCoords);
    spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 14, 'fire');

    if (isOverloadPhase) {
      boss.ventOverloadDamage = (boss.ventOverloadDamage || 0) + baseDmg;
      boss.ventOverloadHits = (boss.ventOverloadHits || 0) + 1;
      const requiredHits = Math.max(4, (state.playerCount || 2) * 3);
      if (boss.ventOverloadHits >= requiredHits) {
        boss.ventOverloadHits = 0;
        boss.ventOverloadDamage = 0;
        boss.bossState = 'exhaust';
        boss.bossTimer = 0;
        boss.weak = 1;
        boss.flare = 1.8;
        boss.shake = 0.32;
        boss.hp = Math.max(1, boss.hp - boss.maxHp * 0.06);
        spawnBossRing(boss.x, boss.y, boss.z, 0, 12, 16);
        playSound('boom');
        triggerScreenShake(0.5);
        showToast('💥 Отдушины спины (KOLOSS_VENTS) пробиты! Ядро перегружено — ОКНО УЯЗВИМОСТИ ×2!', 3.2);
      }
      return 2.25;
    }
    return 1.55;
  }

  // Во время фазы «Перегрузка ядра» лобовая броня босса поглощает 55% урона (нужно бить в спину!)
  if (isOverloadPhase && !isBackHit) {
    return 0.45;
  }
  return 1.0;
}

/**
 * СЛОТ 3 (Этаж 12 — Финальные боссы) — Кооперативные фазы:
 * - 'ash': Лавовый Колосс
 * - 'ice': Первозданный Буран
 * - 'void': Вестник Коллапса
 * Кооп-механика:
 * - Синхронные извержения гейзеров (bossGeysers) под позициями всех живых игроков.
 * - Механика «Перегрузки ядра» (coreOverload), где одному игроку нужно отвлекать разворот
 *   босса (boss.facingYaw), пока остальные бьют по уязвимым отдушинам (KOLOSS_VENTS) на его спине.
 */
function updateKolossBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  boss.bossTimer += dt;
  const isPhase2 = boss.phase === 2;
  const { primary, secondary, livingPlayers } = getBossCoopTargets(boss, player);

  // Плавный разворот boss.facingYaw за игроком с максимальной агрессией (отвлекающим танком),
  // чтобы остальные игроки могли заходить за спину и бить по KOLOSS_VENTS!
  const desiredYaw = Math.atan2(primary.x - boss.x, primary.z - boss.z);
  const yawTurnSpeed =
    boss.bossState === 'exhaust'
      ? 0.4
      : boss.bossState === 'coreOverload'
        ? 1.75
        : isPhase2
          ? 3.4
          : 2.6;
  boss.facingYaw += angleDiff(desiredYaw, boss.facingYaw || desiredYaw) * Math.min(1, dt * yawTurnSpeed);

  if (!isPhase2 && boss.hp <= boss.maxHp * 0.5) {
    boss.phase = 2;
    boss.bossState = 'roar';
    boss.bossTimer = 0;
    boss.combo = 0;
    boss.roarFxDone = 0;
    if (!boss.isFury) {
      boss.isFury = 1;
      state.bossFuryLavaMultiplier = 1.25;
      boss.bossSpeedMul = 1.3;
    }
    playSound('roar');
    const flashGrad =
      towerId === 'ice'
        ? 'radial-gradient(circle, rgba(100,220,255,.42) 0%, transparent 75%)'
        : towerId === 'void'
          ? 'radial-gradient(circle, rgba(185,65,255,.45) 0%, transparent 75%)'
          : 'radial-gradient(circle, rgba(255,90,20,.4) 0%, transparent 75%)';
    triggerScreenFlash(flashGrad);
  }

  boss.flowMultiplier += ((boss.isFury ? 1.35 : 1) - boss.flowMultiplier) * Math.min(1, dt * 2);

  const idleDuration = isPhase2 ? 1.45 : 2.15;
  const windSlamDuration = isPhase2 ? 0.48 : 0.68;
  const windSweepDuration = isPhase2 ? 0.44 : 0.58;
  const recoverDuration = isPhase2 ? 0.58 : 0.92;

  if (boss.bossState === 'emerge') {
    boss.isMoving = 0;
    if (dist < 50 && Math.random() < 0.5) {
      spawnSparkBurst(
        boss.x + (Math.random() - 0.5) * 4 * boss.bossScale,
        boss.y + 0.1,
        boss.z + (Math.random() - 0.5) * 4 * boss.bossScale,
        3,
        'takeoff'
      );
    }
    if (boss.bossTimer > 2.0) {
      boss.bossState = 'roar';
      boss.bossTimer = 0;
      boss.roarFxDone = 0;
      playSound('roar');
    }
  } else if (boss.bossState === 'idle') {
    boss.isMoving = 1;
    if (boss.barrageShotsLeft > 0) {
      boss.barrageShotCooldown -= dt;
      if (boss.barrageShotCooldown <= 0 && state.projectiles.length < 240) {
        boss.barrageShotCooldown = 0.2;
        boss.barrageShotsLeft--;
        playSound('shoot');
        const shotTarget = secondary && boss.barrageShotsLeft % 2 === 1 ? secondary : primary;
        const spread = (boss.barrageShotsLeft - 1) * 0.14;
        const baseA = Math.atan2(shotTarget.z - boss.z, shotTarget.x - boss.x) + spread;
        state.projectiles.push({
          x: boss.x,
          y: (shotTarget.y || boss.y) + 0.85,
          z: boss.z,
          vx: Math.cos(baseA) * 13.5,
          vz: Math.sin(baseA) * 13.5,
          lifetime: 3.2,
          isHostile: 1,
          damage: 11
        });
        if (dist < 50) {
          bossLocalToWorld(boss, 0, 4.9, 0.5, _bossWorldCoords);
          spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 4, 'takeoff');
        }
      }
    } else {
      boss.barrageTimer -= dt;
      if ((isPhase2 || towerId !== 'ash') && boss.barrageTimer <= 0 && dist < 36) {
        boss.barrageShotsLeft = isPhase2 ? 4 : 2;
        boss.barrageShotCooldown = 0;
        boss.barrageTimer = isPhase2 ? 5.2 + Math.random() * 2.5 : 7.0;
      }
    }

    if (boss.bossTimer > idleDuration) {
      boss.attackCount++;
      const roll = Math.random();
      boss.nextAttack = isPhase2
        ? roll < 0.34
          ? 'slam'
          : roll < 0.65
            ? 'sweep'
            : 'geysers'
        : roll < 0.46
          ? 'slam'
          : roll < 0.78
            ? 'sweep'
            : 'geysers';
      boss.bossState =
        boss.nextAttack === 'slam'
          ? 'windSlam'
          : boss.nextAttack === 'sweep'
            ? 'windSweep'
            : 'windGeys';
      boss.bossTimer = 0;

      if (boss.nextAttack === 'geysers') {
        // Синхронные извержения гейзеров (bossGeysers) под позициями ВСЕХ живых игроков!
        if (typeof placeCoopBossGeysers === 'function') {
          placeCoopBossGeysers(boss, livingPlayers);
        } else {
          placeGeysersNear(primary.x, boss.y, primary.z);
        }
        playSound('summon');
        if (towerId === 'void' && !state.vortexPull) {
          state.vortexPull = {
            x: boss.x,
            z: boss.z,
            y: boss.y,
            timer: 2.0,
            strength: 6.8,
            spawnBombsOnEnd: 1
          };
        } else if (towerId === 'ice') {
          for (let pi = 0; pi < livingPlayers.length; pi++) {
            const lp = livingPlayers[pi];
            state.activeBombs.push({
              x: lp.x + (Math.random() - 0.5) * 4.5,
              y: lp.lastGroundY !== undefined ? lp.lastGroundY : boss.y,
              z: lp.z + (Math.random() - 0.5) * 4.5,
              timer: 1.15 + pi * 0.18,
              nextRingTimer: 0,
              radius: 3.6,
              damage: 13,
              applyChill: 1
            });
          }
        }
      }
    }
  } else if (boss.bossState === 'windSlam') {
    boss.isMoving = 0;
    if (boss.bossTimer > windSlamDuration) {
      boss.bossState = 'slam';
      boss.bossTimer = 0;
      boss.impactDone = 0;
    }
  } else if (boss.bossState === 'slam') {
    boss.isMoving = 0;
    if (!boss.impactDone && boss.bossTimer > 0.12) {
      boss.impactDone = 1;
      bossLocalToWorld(boss, 0.35, 0.6, 3.4, _bossWorldCoords);
      const fistX = _bossWorldCoords[0];
      const fistZ = _bossWorldCoords[2];
      spawnBossRing(fistX, boss.y, fistZ, 18, 10, 17);

      if (towerId === 'ice') {
        const spikeTargets = secondary ? [primary, secondary] : [primary];
        for (let ti = 0; ti < spikeTargets.length; ti++) {
          const st = spikeTargets[ti];
          const ang = Math.atan2(st.z - fistZ, st.x - fistX);
          for (let i = 1; i <= (isPhase2 ? 5 : 3); i++) {
            state.activeBombs.push({
              x: fistX + Math.cos(ang) * i * 3.5,
              y: st.lastGroundY !== undefined ? st.lastGroundY : boss.y,
              z: fistZ + Math.sin(ang) * i * 3.5,
              timer: 0.5 + i * 0.16,
              nextRingTimer: 0,
              radius: 2.5,
              damage: 13,
              applyChill: 1
            });
          }
        }
      } else if (towerId === 'void') {
        fireBossProjectileFan(boss, primary, isPhase2 ? 5 : 3, 0.9, 12, 12);
        if (secondary) fireBossProjectileFan(boss, secondary, 3, 0.7, 12, 12);
      }

      if (dist < 50) {
        spawnSparkBurst(fistX, boss.y + 0.3, fistZ, 26, 'land');
        spawnSmokePuff(fistX, boss.y + 0.1, fistZ, 10);
        spawnSlagBurst(fistX, boss.y, fistZ, 7, 1.25);
      }
      boss.flare = 1.25;
      boss.shake = 0.2;
      playSound('boom');
      triggerScreenShake(0.45);
    }
    if (boss.bossTimer > 0.24) {
      boss.bossState = 'recover';
      boss.bossTimer = 0;
      boss.combo++;
    }
  } else if (boss.bossState === 'windSweep') {
    boss.isMoving = 0;
    if (boss.bossTimer > windSweepDuration) {
      boss.bossState = 'sweep';
      boss.bossTimer = 0;
      spawnBossArc(boss.x, boss.y, boss.z, boss.facingYaw + (Math.random() - 0.5) * 0.4, 20);
      if (secondary) {
        spawnBossArc(
          boss.x,
          boss.y,
          boss.z,
          Math.atan2(secondary.x - boss.x, secondary.z - boss.z),
          18
        );
      }
      if (towerId === 'ice' || towerId === 'void') {
        fireBossProjectileFan(boss, primary, isPhase2 ? 5 : 3, 0.75, 12.5, 11);
      }
      playSound('boom');
      triggerScreenShake(0.22);
      boss.flare = Math.max(boss.flare, 0.85);
    }
  } else if (boss.bossState === 'sweep') {
    boss.isMoving = 0;
    if (boss.bossTimer > 0.5) {
      boss.bossState = 'recover';
      boss.bossTimer = 0;
      boss.combo++;
    }
  } else if (boss.bossState === 'windGeys') {
    boss.isMoving = 0;
    if (boss.bossTimer > 0.5) {
      boss.bossState = 'geysers';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'geysers') {
    boss.isMoving = 0;
    if (boss.bossTimer > 1.25) {
      boss.bossState = 'recover';
      boss.bossTimer = 0;
      boss.combo++;
    }
  } else if (boss.bossState === 'recover') {
    boss.isMoving = 0;
    if (boss.bossTimer > recoverDuration) {
      // Переход в кооперативную фазу «Перегрузки ядра» (coreOverload) после серии из 2 атак
      if (boss.combo >= 2) {
        boss.bossState = 'coreOverload';
        boss.bossTimer = 0;
        boss.combo = 0;
        boss.ventOverloadHits = 0;
        boss.ventOverloadDamage = 0;
        boss.overloadGeyserTimer = 0.25;
        for (let i = 0; i < 5; i++) boss.ventFlares[i] = 1.0;
        playSound('roar');
        showToast(
          '🔥 Перегрузка ядра! Один игрок отвлекает разворот босса, остальные — бейте по отдушинам (KOLOSS_VENTS) на спине!',
          3.4
        );
      } else {
        boss.bossState = 'idle';
        boss.bossTimer = 0;
      }
    }
  } else if (boss.bossState === 'coreOverload') {
    // Фаза «Перегрузки ядра»: босс поворачивается (boss.facingYaw) к отвлекающему игроку (primary),
    // выпускает синхронные гейзеры под живыми игроками, а отдушины на спине (KOLOSS_VENTS) раскалены и уязвимы!
    boss.isMoving = 0;
    for (let i = 0; i < 5; i++) {
      boss.ventFlares[i] = 0.85 + 0.15 * Math.sin(state.elapsedTime * 16 + i);
    }
    boss.overloadGeyserTimer = (boss.overloadGeyserTimer || 0) - dt;
    if (boss.overloadGeyserTimer <= 0) {
      boss.overloadGeyserTimer = 1.85;
      if (typeof placeCoopBossGeysers === 'function') {
        placeCoopBossGeysers(boss, livingPlayers);
      } else {
        placeGeysersNear(primary.x, boss.y, primary.z);
      }
    }
    if (boss.bossTimer > 4.2) {
      boss.bossState = isPhase2 ? 'exhaust' : 'idle';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'exhaust') {
    boss.isMoving = 0;
    if (boss.bossTimer > 2.6) {
      boss.bossState = 'idle';
      boss.bossTimer = 0;
    }
  } else if (boss.bossState === 'roar') {
    boss.isMoving = 0;
    if (!boss.roarFxDone && boss.bossTimer > 0.35) {
      boss.roarFxDone = 1;
      spawnBossRing(boss.x, boss.y, boss.z, 0, 11, 17);
      if (dist < 50) {
        bossLocalToWorld(boss, 0, 5.4, 0, _bossWorldCoords);
        spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 30, 'land');
        spawnSparkBurst(boss.x, boss.y + 0.2, boss.z, 20, 'takeoff');
      }
      boss.flare = 1.6;
      boss.shake = 0.22;
      triggerScreenShake(0.4);
      if (boss.isFury) {
        for (let i = 0; i < 5; i++) boss.ventFlares[i] = 1;
      }
    }
    if (boss.bossTimer > 1.6) {
      boss.bossState = 'idle';
      boss.bossTimer = 0;
    }
  }

  boss.weak = boss.bossState === 'exhaust' ? 1 : 0;

  if ((boss.isFury || boss.bossState === 'coreOverload') && boss.bossState !== 'roar') {
    boss.ventTimer -= dt;
    if (boss.ventTimer <= 0) {
      boss.ventTimer = boss.bossState === 'coreOverload' ? 0.45 : 1.8 + Math.random() * 1.6;
      const ventIdx = Math.floor(Math.random() * 5);
      boss.ventFlares[ventIdx] = 1;
      if (dist < 45) {
        const ventPos = KOLOSS_VENTS[ventIdx];
        bossLocalToWorld(boss, ventPos[0], ventPos[1], ventPos[2], _bossWorldCoords);
        spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 16, 'takeoff');
      }
    }
  }
  if (boss.bossState !== 'coreOverload') {
    for (let i = 0; i < 5; i++) {
      boss.ventFlares[i] *= Math.exp(-dt * 3.5);
    }
  }

  if (dist < 45 && boss.bossState !== 'emerge') {
    boss.dripTimer -= dt;
    if (boss.dripTimer <= 0) {
      boss.dripTimer = 0.09 + Math.random() * 0.12;
      const anchor = KOLOSS_DRIP_ANCHORS[Math.floor(Math.random() * KOLOSS_DRIP_ANCHORS.length)];
      bossLocalToWorld(boss, anchor[0], anchor[1], anchor[2], _bossWorldCoords);
      spawnMagmaDripAt(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], boss.y + 0.1);
    }
  }

  if (dist < 45) {
    boss.fountainAccum += dt * 20 * (boss.isFury ? 1.5 : 1);
    while (boss.fountainAccum > 1) {
      boss.fountainAccum -= 1;
      const angle = Math.random() * TWO_PI;
      const radius = (2.1 + Math.random() * 0.8) * boss.bossScale;
      spawnSparkBurst(
        boss.x + Math.cos(angle) * radius,
        boss.y + 0.1,
        boss.z + Math.sin(angle) * radius,
        1,
        'takeoff'
      );
    }
  } else {
    boss.fountainAccum = 0;
  }

  boss.shedTimer -= dt * (boss.isFury ? 1.8 : 1);
  if (boss.shedTimer <= 0) {
    boss.shedTimer = 0.1 + Math.random() * 0.14;
    if (dist < 45 && boss.bossState !== 'emerge') {
      const anchor = KOLOSS_SHED_ANCHORS[Math.floor(Math.random() * KOLOSS_SHED_ANCHORS.length)];
      bossLocalToWorld(
        boss,
        anchor[0] + (Math.random() - 0.5) * 0.6,
        anchor[1] + (Math.random() - 0.5) * 0.6,
        anchor[2] + (Math.random() - 0.5) * 0.6,
        _bossWorldCoords
      );
      spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 2, 'takeoff');
    }
  }

  boss.flare *= Math.exp(-dt * 3.2);
  boss.shake *= Math.exp(-dt * 8);
}

/* ==========================================================================
   4. ВИЗУАЛ И АНИМАЦИЯ ПОЗ БОССОВ (RENDER)
   ========================================================================== */

function renderGolemBoss(boss, ud, dt) {
  const time = state.elapsedTime;
  const isPhase2 = boss.phase === 2;
  const bt = boss.bossTimer;
  const towerId = ud.towerId || state.towerId || 'ash';

  boss.mesh.rotation.y = boss.facingYaw;
  boss.mesh.position.set(boss.x, boss.y, boss.z);
  boss.mesh.scale.setScalar(boss.bossScale);

  let armR = -0.15;
  let armL = -0.15;
  let armRz = 0.12;
  let armLz = -0.12;
  let lean = 0.1;
  let hipY = 2.75;
  let headX = 0.1;
  let headY = Math.sin(time * 0.4) * 0.25;
  let legL = 0;
  let legR = 0;
  let jaw = 0.06;

  if (boss.bossState === 'march') {
    const swing = Math.sin(boss.marchTimer * Math.PI * 2);
    if (towerId === 'void') {
      hipY = 2.95 + Math.sin(time * 2.2) * 0.22;
      lean = 0.08 + Math.sin(time * 1.5) * 0.04;
      armR = -0.35 + Math.sin(time * 1.8) * 0.12;
      armL = -0.65 + Math.cos(time * 2.1) * 0.18;
    } else {
      legL = swing * 0.42;
      legR = -swing * 0.42;
      armR += -swing * 0.12;
      armL += swing * 0.12;
      hipY += Math.abs(Math.cos(boss.marchTimer * Math.PI * 2)) * 0.1;
      lean = 0.14;
    }
    jaw = 0.06 + Math.abs(Math.sin(time * 0.7)) * 0.05;
  } else if (boss.bossState === 'windup') {
    const k = easeInOutQuad(Math.min(1, bt / (isPhase2 ? 0.45 : 0.68)));
    if (boss.nextAttack === 'pound' || boss.nextAttack === 'blueprintGrid') {
      armR = lerp(-0.15, -2.6, k);
      armL = lerp(-0.15, -2.6, k);
      lean = lerp(0.14, -0.22, k);
      hipY = lerp(2.75, 2.95, k);
      headX = lerp(0.1, -0.3, k);
    } else if (boss.nextAttack === 'bellToll') {
      armL = lerp(-0.15, -2.65, k);
      armLz = lerp(-0.12, -0.35, k);
      armR = lerp(-0.15, -0.6, k);
      lean = lerp(0.14, -0.18, k);
      hipY = lerp(2.75, 2.9, k);
    } else {
      armR = lerp(-0.15, -2.5, k);
      armL = lerp(-0.15, -0.5, k);
      armRz = lerp(0.12, 0.3, k);
      lean = lerp(0.14, -0.18, k);
      hipY = lerp(2.75, 2.88, k);
      headX = lerp(0.1, -0.05, k);
    }
    headY = 0;
    jaw = lerp(0.06, 0.25, k);
  } else if (boss.bossState === 'slam') {
    const k = Math.min(1, bt / (isPhase2 ? 0.25 : 0.35));
    const ee = k * k;
    if (boss.nextAttack === 'pound' || boss.nextAttack === 'blueprintGrid') {
      armR = lerp(-2.6, -0.45, ee);
      armL = lerp(-2.6, -0.45, ee);
      lean = lerp(-0.22, 0.5, ee);
      hipY = lerp(2.95, 2.35, ee);
      headX = lerp(-0.3, 0.5, ee);
    } else if (boss.nextAttack === 'bellToll') {
      armL = lerp(-2.65, -0.35, ee);
      armR = lerp(-0.6, -0.9, ee);
      lean = lerp(-0.18, 0.42, ee);
      hipY = lerp(2.9, 2.45, ee);
    } else {
      armR = lerp(-2.5, -0.35, ee);
      armL = lerp(-0.5, -0.9, ee);
      lean = lerp(-0.18, 0.42, ee);
      hipY = lerp(2.88, 2.45, ee);
      headX = lerp(-0.05, 0.45, ee);
    }
    headY = 0;
    jaw = lerp(0.25, 0.4, ee);
  } else if (boss.bossState === 'recover') {
    const k = easeInOutQuad(Math.min(1, bt / (isPhase2 ? 0.58 : 0.92)));
    armR = lerp(-0.45, -0.15, k);
    armL = lerp(-0.6, -0.15, k);
    lean = lerp(0.45, 0.1, k);
    hipY = lerp(2.4, 2.75, k);
    headX = lerp(0.45, 0.1, k);
    jaw = lerp(0.4, 0.06, k);
  } else {
    const k = Math.sin(Math.min(1, bt / 1.2) * Math.PI);
    armR = lerp(-0.15, -2.9, k);
    armL = lerp(-0.15, -2.9, k);
    lean = lerp(0.1, -0.28, k);
    hipY = lerp(2.75, 2.82, k);
    headX = lerp(0.1, -0.45, k);
    jaw = lerp(0.06, 0.6, k);
    headY = 0;
  }

  ud.hips.position.y = hipY;
  ud.torso.rotation.x = lean;
  ud.head.rotation.x = headX;
  ud.head.rotation.y = headY;
  ud.jaw.rotation.x = jaw;
  ud.armR.rotation.x = armR;
  ud.armR.rotation.z = armRz;
  ud.armL.rotation.x = armL;
  ud.armL.rotation.z = armLz;
  ud.legL.rotation.x = legL;
  ud.legR.rotation.x = legR;

  if (ud.bellPivot) {
    const bellSwing =
      boss.bossState === 'windup' || boss.bossState === 'slam'
        ? Math.sin(time * 16) * 0.55
        : Math.sin(boss.marchTimer * Math.PI * 2) * 0.25;
    ud.bellPivot.rotation.x = -armL * 0.75 + bellSwing;
    ud.bellPivot.rotation.z = Math.cos(time * 3.2) * 0.16;
    if (ud.bellGlow) {
      ud.bellGlow.scale.setScalar(3.2 + boss.flare * 1.8);
    }
  }

  if (ud.stairVortex) {
    ud.stairVortex.rotation.y = time * (isPhase2 ? 0.85 : 0.45);
  }
  if (ud.blueprints) {
    for (let i = 0; i < ud.blueprints.length; i++) {
      const bp = ud.blueprints[i];
      const d = bp.userData;
      const orbitA = time * (isPhase2 ? 1.1 : 0.55) + d.phase;
      bp.position.x = d.baseX + Math.cos(orbitA) * 0.22;
      bp.position.y = d.baseY + Math.sin(orbitA * 1.4) * 0.18;
      bp.position.z = d.baseZ + Math.sin(orbitA) * 0.18 + boss.flare * 0.35;
      bp.rotation.z = d.brz + Math.sin(time * 2 + d.phase) * 0.14;
    }
  }

  if (boss.shake > 0.002) {
    boss.mesh.position.x += (Math.random() - 0.5) * boss.shake;
    boss.mesh.position.z += (Math.random() - 0.5) * boss.shake;
  }

  const coalBrightness =
    0.85 + Math.sin(time * 8) * 0.1 + (Math.sin(time * 31) > 0.95 ? -0.4 : 0) + boss.flare;
  ud.eyeMat.color.copy(ud.eyeBase).multiplyScalar(coalBrightness);
  ud.haloMat.opacity = Math.min(1, 0.5 + 0.4 * coalBrightness);
  for (const halo of ud.eyeHalos) {
    halo.scale.setScalar(0.65 + boss.flare * 0.4);
  }

  if (!boss.tintState) {
    ud.charMat.emissiveIntensity =
      1.1 + Math.sin(time * 3.4) * 0.3 + boss.flare * 1.2 + (isPhase2 ? 0.9 : 0);
  }

  const crackOpacity =
    0.55 + Math.sin(time * 1.9) * 0.14 + boss.flare * 0.45 + (isPhase2 ? 0.25 : 0);
  for (const mat of ud.crackMats) {
    mat.opacity = Math.min(1, crackOpacity);
  }

  ud.chestGlow.material.opacity = Math.min(0.92, 0.38 + Math.sin(time * 4) * 0.1 + boss.flare * 0.4);
  ud.chestGlow.scale.setScalar(4.6 + boss.flare * 1.5);

  golemDecalTargetOpacity = isPhase2
    ? Math.min(0.68, 0.42 + Math.sin(time * 5) * 0.1 + boss.flare * 0.25 + boss.floorFlare * 0.4)
    : boss.floorFlare * 0.45;
  golemDecal.position.set(boss.x, boss.y + 0.05, boss.z);

  bossLight.color.setHex(
    towerId === 'ice' ? 0x58d0ff : towerId === 'void' ? 0xb845ff : 0xff5500
  );
  bossLight.position.set(boss.x, boss.y + 2.6 * boss.bossScale, boss.z);
  bossLight.intensity = 2.0 + Math.sin(time * 4) * 0.5 + boss.flare * 3 + (isPhase2 ? 0.8 : 0);
}

function renderWombBoss(boss, ud, dt, tier) {
  const time = state.elapsedTime;
  const isPhase2 = boss.phase === 2;
  const towerId = ud.towerId || state.towerId || 'ash';

  if (towerId === 'ice' || towerId === 'void') {
    boss.mesh.rotation.y = boss.facingYaw;
  } else {
    boss.mesh.rotation.y = time * 0.18;
  }
  boss.mesh.position.set(boss.x, boss.y, boss.z);
  boss.mesh.scale.setScalar(boss.bossScale);

  if (boss.shake > 0.002) {
    boss.mesh.position.x += (Math.random() - 0.5) * boss.shake * 0.5;
    boss.mesh.position.z += (Math.random() - 0.5) * boss.shake * 0.5;
  }

  const openRatio = boss.openAmount;
  ud.shell.rotation.y = towerId === 'ash' ? Math.sin(time * 0.8) * 0.15 : -time * 0.35;
  const pulse = 1 + Math.sin(time * (2 + openRatio * 6)) * (0.05 + openRatio * 0.07);
  ud.core.scale.setScalar(pulse);
  ud.core.rotation.y = time * 0.5;
  ud.coreGlowMat.opacity = 0.2 + openRatio * 0.5 + boss.flare * 0.2;
  ud.haloMat.opacity = 0.5 + openRatio * 0.35 + boss.flare * 0.2;
  ud.halo.scale.setScalar(4.4 + openRatio * 1.6 + Math.sin(time * 3) * 0.2);

  if (ud.spiderLegs) {
    for (let i = 0; i < ud.spiderLegs.length; i++) {
      const leg = ud.spiderLegs[i];
      const d = leg.userData;
      const stepPhase = time * (isPhase2 ? 7.5 : 5.2) + d.idx * 1.2 + (d.side > 0 ? 0 : Math.PI);
      leg.rotation.y = d.baseYaw + Math.sin(stepPhase) * 0.22;
      leg.rotation.z = d.side * (Math.cos(stepPhase) * 0.18 + openRatio * 0.25);
    }
  }
  if (ud.webBackdrop) {
    ud.webBackdrop.rotation.z = time * 0.25;
  }

  if (ud.scytheArms) {
    for (let i = 0; i < ud.scytheArms.length; i++) {
      const arm = ud.scytheArms[i];
      const d = arm.userData;
      const slashWave = Math.sin(time * (isPhase2 ? 6.0 : 4.0) + d.row * 0.9 + (d.side > 0 ? 0 : 1.5));
      arm.rotation.y = d.side * (-0.35 + openRatio * 0.65 + slashWave * 0.25);
      arm.rotation.z = d.side * (0.15 * slashWave - openRatio * 0.3);
    }
  }
  if (ud.phantoms) {
    for (let i = 0; i < ud.phantoms.length; i++) {
      const ph = ud.phantoms[i];
      const d = ph.userData;
      ph.position.x = d.baseX + Math.sin(time * 2.2 + i * 3) * 0.35;
      ph.position.y = d.baseY + Math.cos(time * 2.7 + i * 2) * 0.25;
    }
  }

  const shardData = ud.shardData;
  for (let i = 0; i < shardData.length; i++) {
    const shard = shardData[i];
    const radius =
      shard.baseR + (shard.openR - shard.baseR) * openRatio + Math.sin(time * 2 + shard.ph) * 0.04;
    _bossDummyObj.position.set(shard.dir.x * radius, shard.dir.y * radius, shard.dir.z * radius);
    _bossDummyObj.quaternion.copy(shard.quat);
    _bossDummyObj.scale.set(shard.sx, shard.sy, shard.sz);
    _bossDummyObj.updateMatrix();
    ud.shardIM.setMatrixAt(i, _bossDummyObj.matrix);
  }
  ud.shardIM.instanceMatrix.needsUpdate = true;

  ud.shieldMat.opacity = 0.18 * (1 - openRatio) + Math.sin(time * 4) * 0.03 * (1 - openRatio);
  ud.shieldWireMat.opacity = 0.28 * (1 - openRatio);
  ud.shield.scale.setScalar(1 + Math.sin(time * 2.4) * 0.02);
  ud.shieldWire.rotation.y = time * (boss.shieldDecayMultiplier > 1 ? 1.2 : 0.3);
  ud.vrMat.opacity = openRatio * (0.55 + Math.sin(time * 6) * 0.2);
  ud.vulnRings[0].rotation.z += dt * 1.6;
  ud.vulnRings[1].rotation.z -= dt * 1.2;

  if (!boss.tintState) {
    ud.crystalMat.emissiveIntensity =
      0.55 + openRatio * 0.4 + boss.flare * 0.5 + (isPhase2 ? 0.35 : 0);
  }

  if (ud.swarm.visible && tier === 0) {
    const swarmData = ud.swData;
    for (let i = 0; i < swarmData.length; i++) {
      const sw = swarmData[i];
      sw.a += dt * sw.sp * (1 + openRatio * 1.5);
      const radius = sw.r * (1 - 0.3 * openRatio);
      _bossDummyObj.position.set(
        Math.cos(sw.a) * radius,
        Math.sin(sw.a * sw.w + sw.ph) * sw.h,
        Math.sin(sw.a) * radius
      );
      _bossDummyObj.rotation.set(sw.a * 2, sw.a * 3, sw.ph);
      _bossDummyObj.scale.setScalar(sw.s * (1 + openRatio * 0.3));
      _bossDummyObj.updateMatrix();
      ud.swarm.setMatrixAt(i, _bossDummyObj.matrix);
    }
    ud.swarm.instanceMatrix.needsUpdate = true;
  }

  wombRune.position.set(boss.x, boss.wombFloorY + 0.05, boss.z);
  bossLight.color.setHex(
    towerId === 'ice' ? 0x60d8ff : towerId === 'void' ? 0xb848ff : 0xa050ff
  );
  bossLight.position.set(boss.x, boss.y, boss.z);
  bossLight.intensity = 2.2 + openRatio * 3 + boss.flare * 2.5 + Math.sin(time * 7) * 0.3;
}

function renderKolossBoss(boss, ud, dt) {
  const time = state.elapsedTime;
  const isPhase2 = boss.phase === 2;
  const bt = boss.bossTimer;
  const towerId = ud.towerId || state.towerId || 'ash';

  boss.mesh.rotation.y = boss.facingYaw;
  boss.mesh.position.set(boss.x, boss.y, boss.z);
  boss.mesh.scale.setScalar(boss.bossScale);

  let armRx = -0.15;
  let armLx = -0.15;
  let armRz = 0.18;
  let armLz = -0.18;
  let elbRx = -0.35;
  let elbLx = -0.35;
  let torsoX = 0.08;
  let torsoY = 0;
  let hipsY = KOLOSS_COLUMN_HEIGHT;
  let headX = 0.1;
  let headY = Math.sin(time * 0.4) * 0.3;
  let jaw = 0.08;

  if (boss.bossState === 'emerge') {
    const k = easeOutCubic(Math.min(1, bt / 2.0));
    hipsY = lerp(1.0, KOLOSS_COLUMN_HEIGHT, k);
    armRx = armLx = lerp(-1.6, -0.15, k);
    armRz = lerp(0.6, 0.18, k);
    armLz = lerp(-0.6, -0.18, k);
    headX = lerp(-0.4, 0.1, k);
    jaw = lerp(0.5, 0.08, k);
  } else if (boss.bossState === 'idle') {
    const swing = Math.sin(time * (isPhase2 ? 1.6 : 1.0) * Math.PI);
    armRx += -swing * 0.12;
    armLx += swing * 0.12;
    hipsY += Math.sin(time * 2.2) * 0.08;
    torsoY = Math.sin(time * 0.5) * 0.12;
    jaw = 0.08 + Math.abs(Math.sin(time * 0.7)) * 0.06;
  } else if (boss.bossState === 'windSlam') {
    const k = easeInOutQuad(Math.min(1, bt / (isPhase2 ? 0.48 : 0.68)));
    armRx = lerp(-0.15, -2.6, k);
    elbRx = lerp(-0.35, -0.7, k);
    torsoX = lerp(0.08, -0.22, k);
    hipsY = lerp(KOLOSS_COLUMN_HEIGHT, KOLOSS_COLUMN_HEIGHT + 0.15, k);
    headX = lerp(0.1, -0.25, k);
    jaw = lerp(0.08, 0.3, k);
  } else if (boss.bossState === 'slam') {
    const k = Math.min(1, bt / 0.24);
    const ee = k * k;
    armRx = lerp(-2.6, -0.5, ee);
    elbRx = lerp(-0.7, -0.15, ee);
    torsoX = lerp(-0.22, 0.5, ee);
    hipsY = lerp(KOLOSS_COLUMN_HEIGHT + 0.15, KOLOSS_COLUMN_HEIGHT - 0.35, ee);
    headX = lerp(-0.25, 0.5, ee);
    jaw = lerp(0.3, 0.45, ee);
  } else if (boss.bossState === 'windSweep') {
    const k = easeInOutQuad(Math.min(1, bt / (isPhase2 ? 0.44 : 0.58)));
    armRx = lerp(-0.15, -0.25, k);
    armRz = lerp(0.18, 1.4, k);
    torsoY = lerp(0, -0.85, k);
    headY = lerp(0, -0.5, k);
    jaw = lerp(0.08, 0.25, k);
  } else if (boss.bossState === 'sweep') {
    const k = Math.min(1, bt / 0.5);
    torsoY = lerp(-0.9, 0.9, easeInOutQuad(k));
    armRz = 1.45;
    armRx = -0.35;
    headY = lerp(-0.5, 0.5, k);
    hipsY = KOLOSS_COLUMN_HEIGHT - 0.12;
    jaw = 0.35;
  } else if (boss.bossState === 'windGeys') {
    const k = easeInOutQuad(Math.min(1, bt / 0.5));
    armRx = armLx = lerp(-0.15, -1.9, k);
    armRz = lerp(0.18, 0.7, k);
    armLz = lerp(-0.18, -0.7, k);
    headX = lerp(0.1, -0.35, k);
    jaw = lerp(0.08, 0.5, k);
  } else if (boss.bossState === 'geysers' || boss.bossState === 'coreOverload') {
    const tremor = Math.sin(time * 30) * 0.04;
    armRx = armLx = (boss.bossState === 'coreOverload' ? -0.95 : -1.9) + tremor;
    armRz = 0.75;
    armLz = -0.75;
    torsoX = boss.bossState === 'coreOverload' ? 0.22 : 0.08;
    headX = boss.bossState === 'coreOverload' ? -0.2 : -0.35;
    jaw = 0.55;
    hipsY = KOLOSS_COLUMN_HEIGHT + 0.08;
  } else if (boss.bossState === 'exhaust') {
    const k = easeInOutQuad(Math.min(1, bt / 0.5));
    armRx = armLx = lerp(-0.15, -0.02, k);
    armRz = lerp(0.18, 0.3, k);
    armLz = lerp(-0.18, -0.3, k);
    elbRx = elbLx = lerp(-0.35, -0.12, k);
    torsoX = lerp(0.08, 0.38, k) + Math.sin(time * 2.4) * 0.03;
    headX = lerp(0.1, 0.5, k);
    hipsY = KOLOSS_COLUMN_HEIGHT - 0.3;
    jaw = lerp(0.08, 0.18, k);
    headY = 0;
  } else if (boss.bossState === 'recover') {
    const k = easeInOutQuad(Math.min(1, bt / (isPhase2 ? 0.58 : 0.92)));
    armRx = lerp(-0.5, -0.15, k);
    armLx = lerp(-0.5, -0.15, k);
    armRz = lerp(0.6, 0.18, k);
    armLz = lerp(-0.6, -0.18, k);
    torsoX = lerp(0.4, 0.08, k);
    headX = lerp(0.45, 0.1, k);
    hipsY = lerp(KOLOSS_COLUMN_HEIGHT - 0.3, KOLOSS_COLUMN_HEIGHT, k);
    jaw = lerp(0.4, 0.08, k);
  } else {
    const k = Math.sin(Math.min(1, bt / 1.6) * Math.PI);
    armRx = armLx = lerp(-0.15, -2.9, k);
    armRz = lerp(0.18, 0.55, k);
    armLz = lerp(-0.18, -0.55, k);
    torsoX = lerp(0.08, -0.3, k);
    headX = lerp(0.1, -0.45, k);
    jaw = lerp(0.08, 0.65, k);
    hipsY = KOLOSS_COLUMN_HEIGHT + 0.12 * k;
    headY = 0;
  }

  ud.hips.position.y = hipsY;
  ud.column.scale.y = Math.max(0.3, hipsY / KOLOSS_COLUMN_HEIGHT);
  ud.column.rotation.y = time * (towerId === 'ice' ? 2.4 : towerId === 'void' ? 1.8 : 0.5) * boss.flowMultiplier;
  ud.torso.rotation.x = torsoX;
  ud.torso.rotation.y = torsoY;
  ud.head.rotation.x = headX;
  ud.head.rotation.y = headY;
  ud.jaw.rotation.x = jaw;
  ud.armR.g.rotation.x = armRx;
  ud.armR.g.rotation.z = armRz;
  ud.armL.g.rotation.x = armLx;
  ud.armL.g.rotation.z = armLz;
  ud.armR.elbow.rotation.x = elbRx;
  ud.armL.elbow.rotation.x = elbLx;

  if (ud.frozenHeartMesh) {
    ud.frozenHeartMesh.rotation.y = time * 1.8;
    const heartPulse = 1 + Math.sin(time * 5.5) * 0.12 + (boss.weak ? 0.3 : 0);
    ud.frozenHeartMesh.scale.set(0.9 * heartPulse, 1.25 * heartPulse, 0.85 * heartPulse);
  }
  if (ud.accretionDiscGroup) {
    ud.accretionDiscGroup.rotation.z = -time * (isPhase2 ? 2.8 : 1.6);
    const discScale = 1 + Math.sin(time * 4.5) * 0.08 + boss.flare * 0.25;
    ud.accretionDiscGroup.scale.setScalar(discScale);
  }

  if (boss.shake > 0.002) {
    boss.mesh.position.x += (Math.random() - 0.5) * boss.shake;
    boss.mesh.position.z += (Math.random() - 0.5) * boss.shake;
  }

  if (towerId === 'ash') {
    TEXTURES.kolBody.offset.y -= dt * 0.06 * boss.flowMultiplier;
    TEXTURES.kolCol.offset.y -= dt * 0.11 * boss.flowMultiplier;
    TEXTURES.kolEye.rotation += dt * 0.7;
  }

  if (!boss.tintState) {
    ud.lavaMat.emissiveIntensity =
      1.0 + Math.sin(time * 3.1) * 0.15 + boss.flare * 0.8 + (boss.isFury ? 0.35 : 0);
    ud.columnMat.emissiveIntensity =
      1.15 + Math.sin(time * 2.6) * 0.2 + boss.flare * 0.9 + (boss.isFury ? 0.4 : 0);
    ud.incMat.emissiveIntensity =
      0.45 + Math.sin(time * 2) * 0.15 + (boss.isFury ? 0.5 : 0);
  }

  const coalBrightness =
    0.85 + Math.sin(time * 8) * 0.1 + (Math.sin(time * 31) > 0.95 ? -0.35 : 0) + boss.flare;
  ud.haloMat.opacity = Math.min(1, 0.55 + 0.4 * coalBrightness);
  for (const halo of ud.eyeHalos) {
    halo.scale.setScalar(0.9 + boss.flare * 0.5);
  }

  const exhaustRatio =
    boss.bossState === 'exhaust'
      ? Math.sin(Math.min(1, bt / 2.6) * Math.PI)
      : boss.bossState === 'coreOverload'
        ? 0.65
        : 0;
  const crackTarget = isPhase2
    ? 0.45 + Math.sin(time * 5) * 0.12 + boss.flare * 0.3 + exhaustRatio * 0.45
    : exhaustRatio * 0.3;
  for (const mat of ud.crackMats) {
    mat.opacity += (crackTarget - mat.opacity) * Math.min(1, dt * 5);
  }

  ud.weakSprite.material.opacity = exhaustRatio * 0.85;
  ud.weakSprite.scale.setScalar(2.4 + Math.sin(time * 9) * 0.25);

  for (let i = 0; i < ud.vents.length; i++) {
    ud.vents[i].flare.material.opacity = boss.ventFlares[i];
    const ventScale = boss.bossState === 'coreOverload' ? 2.6 + Math.sin(time * 12 + i) * 0.4 : 1.85;
    ud.vents[i].flare.scale.setScalar(ventScale);
  }

  const inclusions = ud.incData;
  for (let i = 0; i < inclusions.length; i++) {
    const inc = inclusions[i];
    if (towerId === 'ice' || towerId === 'void') {
      const orbitAngle = time * (isPhase2 ? 1.5 : 0.9) + (i / inclusions.length) * TWO_PI;
      const r = 2.25 + (i % 3) * 0.75;
      _bossDummyObj.position.set(
        Math.cos(orbitAngle) * r,
        0.5 + (i % 4) * 0.65 + Math.sin(time * 2 + i) * 0.2,
        Math.sin(orbitAngle) * r
      );
      _bossDummyObj.rotation.set(inc.rx + time * 0.8, inc.ry + time, inc.rz);
      _bossDummyObj.scale.setScalar(inc.base);
      _bossDummyObj.updateMatrix();
      ud.incIM.setMatrixAt(i, _bossDummyObj.matrix);
    } else {
      inc.life += dt;
      let ratio = Math.min(1, inc.life / inc.max);
      if (ratio >= 1) {
        inc.life = 0;
        inc.max = 6 + Math.random() * 6;
        const host = KOLOSS_INCLUSION_HOSTS[Math.floor(Math.random() * KOLOSS_INCLUSION_HOSTS.length)];
        inc.hx = host.x;
        inc.hy = host.y;
        inc.hz = host.z;
        inc.hr = host.r;
        inc.dx = Math.random() - 0.5;
        inc.dy = Math.random() - 0.5;
        inc.dz = Math.random() - 0.5;
        const len = Math.sqrt(inc.dx * inc.dx + inc.dy * inc.dy + inc.dz * inc.dz) || 1;
        inc.dx /= len;
        inc.dy /= len;
        inc.dz /= len;
        ratio = 0;
      }
      const scale = inc.base * (1 - 0.85 * ratio * ratio);
      const radius = inc.hr * (0.92 - 0.22 * ratio);
      _bossDummyObj.position.set(
        inc.hx + inc.dx * radius,
        inc.hy + inc.dy * radius,
        inc.hz + inc.dz * radius
      );
      _bossDummyObj.rotation.set(inc.rx, inc.ry, inc.rz);
      _bossDummyObj.scale.setScalar(Math.max(0.02, scale));
      _bossDummyObj.updateMatrix();
      ud.incIM.setMatrixAt(i, _bossDummyObj.matrix);
    }
  }
  ud.incIM.instanceMatrix.needsUpdate = true;

  ud.baseGlow.material.opacity = Math.min(
    0.85,
    0.35 + Math.sin(time * 2.4) * 0.08 + (boss.isFury ? 0.2 : 0) + boss.flare * 0.2
  );
  ud.baseGlow.scale.setScalar(7.2 + Math.sin(time * 3) * 0.5 + boss.flare);
  ud.chestGlow.material.opacity = Math.min(
    0.92,
    0.45 + Math.sin(time * 4) * 0.1 + boss.flare * 0.35 + (boss.isFury ? 0.15 : 0)
  );
  ud.chestGlow.scale.setScalar(4.4 + boss.flare * 1.2);

  bossLight.color.setHex(
    towerId === 'ice' ? 0x58d0ff : towerId === 'void' ? 0xb848ff : 0xff7a20
  );
  bossLight.position.set(boss.x, boss.y + 3.6 * boss.bossScale, boss.z);
  bossLight.intensity =
    2.6 + Math.sin(time * 4) * 0.6 + boss.flare * 3 + (boss.isFury ? 1.2 : 0);
}

/* ==========================================================================
   5. АВТОНОМНАЯ ИНТЕГРАЦИЯ БЛОКА 5 (SWARM INSTANCED MESH, SPAWN BUDGET +45%,
      ЛИМИТ 400 ВРАГОВ, FINDNEARESTENEMY И MULTI-TARGET STEP)
   Позволяет модулю `src/game/boss-ai.js` самостоятельно активировать все
   механики Блока 5, даже если заменён только этот файл.
   ========================================================================== */

const MAX_SWARM_INSTANCES = 400;

/**
 * Гарантирует создание единого THREE.InstancedMesh для мелких мобов роя (type === 's')
 * по примеру блоков башни (до 400 инстансов на биом).
 */
function ensureSwarmInstancedMeshPool() {
  if (typeof window !== 'undefined' && window.swarmInstancedMeshByBiome) {
    return window.swarmInstancedMeshByBiome;
  }
  if (typeof swarmInstancedMeshByBiome !== 'undefined' && swarmInstancedMeshByBiome.ash) {
    if (typeof window !== 'undefined') window.swarmInstancedMeshByBiome = swarmInstancedMeshByBiome;
    return swarmInstancedMeshByBiome;
  }
  if (typeof THREE === 'undefined' || typeof scene === 'undefined' || typeof ENEMY_PROTOTYPES === 'undefined') {
    return null;
  }

  const poolByBiome = {};
  const dummy = new THREE.Object3D();
  const initCol = new THREE.Color(0xffffff);
  dummy.position.set(0, -999, 0);
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();

  for (const towerId of ['ash', 'ice', 'void']) {
    const proto =
      (ENEMY_PROTOTYPES[towerId] && ENEMY_PROTOTYPES[towerId].s && ENEMY_PROTOTYPES[towerId].s[0]) ||
      (ENEMY_PROTOTYPES.ash && ENEMY_PROTOTYPES.ash.s && ENEMY_PROTOTYPES.ash.s[0]);
    if (!proto) continue;

    const parts = [];
    const idMat = new THREE.Matrix4();
    const fallbackCol = new THREE.Color(
      towerId === 'ice' ? 0x68dcff : towerId === 'void' ? 0xa848ff : 0xff5a18
    );
    if (proto.coreGeo) parts.push({ geo: proto.coreGeo.clone(), matrix: idMat, color: fallbackCol });
    if (proto.chunksRockGeo) parts.push({ geo: proto.chunksRockGeo.clone(), matrix: idMat });
    if (proto.chunksBurgGeo) parts.push({ geo: proto.chunksBurgGeo.clone(), matrix: idMat });
    if (proto.wingGeoL) parts.push({ geo: proto.wingGeoL.clone(), matrix: idMat });
    if (proto.wingGeoR) parts.push({ geo: proto.wingGeoR.clone(), matrix: idMat });
    if (proto.flameCrownGeo) parts.push({ geo: proto.flameCrownGeo.clone(), matrix: idMat });

    const mergedGeo =
      typeof mergeGeometryParts === 'function' && parts.length
        ? mergeGeometryParts(parts)
        : new THREE.OctahedronGeometry(0.65, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: !!mergedGeo.attributes.color,
      roughness: towerId === 'ice' ? 0.2 : 0.72,
      metalness: towerId === 'ice' ? 0.3 : 0.15,
      flatShading: true,
      emissive: towerId === 'ice' ? 0x185888 : towerId === 'void' ? 0x581888 : 0x581808,
      emissiveIntensity: 0.55
    });

    const instMesh = new THREE.InstancedMesh(mergedGeo, mat, MAX_SWARM_INSTANCES);
    instMesh.frustumCulled = false;
    instMesh.count = 0;
    for (let i = 0; i < MAX_SWARM_INSTANCES; i++) {
      instMesh.setMatrixAt(i, dummy.matrix);
      instMesh.setColorAt(i, initCol);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
    scene.add(instMesh);
    poolByBiome[towerId] = instMesh;
  }

  if (typeof window !== 'undefined') {
    window.swarmInstancedMeshByBiome = poolByBiome;
    window.swarmInstancedMesh = poolByBiome.ash;
  }
  return poolByBiome;
}

// Переопределяем findNearestEnemy для поддержки массива state.players и таблицы агрессии (Threat)
findNearestEnemy = function findNearestEnemyMultiTarget(maxRadius, fromX, fromZ) {
  if (!state || !state.enemies) return null;
  let sourceUnit = state.player;
  let ox = state.player.x;
  let oz = state.player.z;
  let oy = state.player.y;

  if (fromX && typeof fromX === 'object') {
    sourceUnit = fromX;
    ox = fromX.x;
    oz = fromX.z;
    oy = fromX.y !== undefined ? fromX.y : state.player.y;
  } else if (fromX !== undefined && fromZ !== undefined) {
    ox = fromX;
    oz = fromZ;
    const players = syncAndGetPlayersArray();
    if (players.length > 1) {
      let bestP = state.player;
      let bestPDist = hypot2D(state.player.x - ox, state.player.z - oz);
      for (let i = 0; i < players.length; i++) {
        const p = players[i];
        const d = hypot2D(p.x - ox, p.z - oz);
        if (d < bestPDist) {
          bestPDist = d;
          bestP = p;
        }
      }
      sourceUnit = bestP;
      oy = bestP.y !== undefined ? bestP.y : oy;
    }
  }

  let bestEnemy = null;
  let bestEffectiveDist = maxRadius;

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (enemy.hp <= 0) continue;
    const dist = hypot2D(enemy.x - ox, enemy.z - oz);
    if (dist >= maxRadius) continue;

    let effectiveDist = dist;
    if (enemy.targetPlayer === sourceUnit) {
      effectiveDist *= 0.82;
    }
    if (enemy.type === 'b' || enemy.isSealGuardian) {
      effectiveDist *= 0.88;
    }
    if (Math.abs((enemy.y || 0) - oy) > 8.5) {
      effectiveDist += 6.0;
    }

    if (effectiveDist < bestEffectiveDist) {
      bestEffectiveDist = effectiveDist;
      bestEnemy = enemy;
    }
  }
  return bestEnemy;
};

// Расширяем пулы bossGeysers (до 12) и bossArcs (до 8), если они были инициализированы меньшим размером
(function upgradeBossHazardPoolsForCoop() {
  if (typeof bossArcs !== 'undefined' && typeof bossArcGeo !== 'undefined' && bossArcs.length < 8) {
    while (bossArcs.length < 8) {
      const mesh = new THREE.Mesh(
        bossArcGeo,
        new THREE.MeshBasicMaterial({
          color: 0xff7a20,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 4;
      scene.add(mesh);
      bossArcs.push({ mesh, active: 0, x: 0, y: 0, z: 0, radius: 0, gapAngle: 0, damage: 0, hasHit: 0, hitMask: 0 });
    }
  }

  if (typeof bossGeysers !== 'undefined' && typeof geyserJetGeo !== 'undefined' && bossGeysers.length < 12) {
    while (bossGeysers.length < 12) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.1, 1.5, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffd060,
          transparent: true,
          opacity: 0,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.visible = false;
      ring.renderOrder = 4;
      scene.add(ring);

      const jet = new THREE.Mesh(
        geyserJetGeo,
        new THREE.MeshBasicMaterial({
          color: 0xffc050,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      );
      jet.visible = false;
      jet.renderOrder = 4;
      jet.scale.y = 0.01;
      scene.add(jet);

      bossGeysers.push({ stage: 0, timer: 0, x: 0, y: 0, z: 0, ring, jet, hasHit: 0, hitMask: 0 });
    }
  }

  if (typeof placeCoopBossGeysers === 'undefined') {
    window.placeCoopBossGeysers = function placeCoopBossGeysersFallback(bossEntity, livingPlayers) {
      const maxR = (typeof TOWER_FLOOR_RADIUS !== 'undefined' ? TOWER_FLOOR_RADIUS : 28) - 2.2;
      const playersList =
        Array.isArray(livingPlayers) && livingPlayers.length ? livingPlayers : getLivingPlayers();
      const baseFloorY = bossEntity ? bossEntity.y : state.player.lastGroundY;
      let placed = 0;
      for (let i = 0; i < playersList.length && placed < bossGeysers.length; i++) {
        const p = playersList[i];
        if (!p) continue;
        let gx = p.x;
        let gz = p.z;
        const r = hypot2D(gx, gz);
        if (r > maxR) {
          gx *= maxR / r;
          gz *= maxR / r;
        }
        const gy = p.lastGroundY !== undefined ? p.lastGroundY : baseFloorY;
        const geyser = bossGeysers[placed++];
        geyser.stage = 1;
        geyser.timer = 0;
        geyser.x = gx;
        geyser.y = gy;
        geyser.z = gz;
        geyser.hasHit = 0;
        geyser.hitMask = 0;
        geyser.ring.position.set(gx, gy + 0.06, gz);
        geyser.ring.visible = true;
        geyser.ring.material.opacity = 0.35;
        geyser.jet.position.set(gx, gy + 0.05, gz);
        geyser.jet.visible = false;
        geyser.jet.scale.y = 0.01;
      }
    };
  }

  ensureSwarmInstancedMeshPool();
})();

/**
 * Обновление буфера THREE.InstancedMesh для всех мелких мобов роя (type === 's', до 400 врагов).
 * Вызывается автоматически при отрисовке кадра или из renderGameFrame.
 */
function syncSwarmInstancedMeshFrame(time) {
  if (!state || !state.enemies) return;
  const pool = ensureSwarmInstancedMeshPool();
  if (!pool) return;

  const counts = { ash: 0, ice: 0, void: 0 };
  const dummy = _bossDummyObj;
  const tintCol = new THREE.Color();
  const baseStats = ENEMY_TYPES.s;

  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    if (enemy.type !== 's' || enemy.mesh) continue;
    const bId = enemy.towerId || state.towerId || 'ash';
    const im = pool[bId] || pool.ash;
    const idx = counts[bId] || 0;
    if (!im || idx >= MAX_SWARM_INSTANCES) continue;

    const eliteScale = enemy.eliteScale || 1;
    const hasWings = bId === 'ice' || bId === 'void';
    const hoverBoost = hasWings ? 0.36 + Math.sin(time * 6.5 + enemy.x) * 0.14 : 0;
    const sY = baseStats.scale * (enemy.scaleY || 1) * eliteScale;
    const sXZ = baseStats.scale * (enemy.scaleXZ || 1) * eliteScale;
    const faceTarget = enemy.targetPlayer || state.player;

    dummy.position.set(
      enemy.x,
      enemy.y + baseStats.radius + hoverBoost + (eliteScale - 1) * baseStats.scale,
      enemy.z
    );
    const yaw = hasWings
      ? Math.atan2(faceTarget.x - enemy.x, faceTarget.z - enemy.z)
      : time * 0.35 + enemy.x * 0.5;
    dummy.rotation.set(0, yaw, 0);
    dummy.scale.set(sXZ, sY, sXZ);
    dummy.updateMatrix();
    im.setMatrixAt(idx, dummy.matrix);

    if (enemy.burnTimer > 0) tintCol.setHex(0xff6820);
    else if (enemy.slowTimer > 0) tintCol.setHex(0x68dcff);
    else if ((enemy.pullTimer || 0) > 0) tintCol.setHex(0xd878ff);
    else if (enemy.eliteType === 'armor') tintCol.setHex(0x88c8ff);
    else if (enemy.eliteType === 'swift') tintCol.setHex(0xffe868);
    else if (enemy.eliteType === 'volt') tintCol.setHex(0xff6878);
    else tintCol.setHex(0xffffff);

    im.setColorAt(idx, tintCol);
    counts[bId] = idx + 1;
  }

  for (const bId of ['ash', 'ice', 'void']) {
    const im = pool[bId];
    if (!im) continue;
    im.count = counts[bId] || 0;
    if (im.count > 0) {
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }
}
