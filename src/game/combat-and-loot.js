/* ==========================================================================
   Боевая система, пространственная сетка врагов (расширенная до R=50 м под 23×23),
   спавн мобов, элиты, лут, переключение 3 актов и события этажей
   ========================================================================== */

/* ---------- 1. Пространственная сетка врагов (ячейки 10×10 м, до ±50 м) ---------- */

const ENEMY_GRID_DIM = 11;
const ENEMY_GRID_OFFSET = 5;
const ENEMY_GRID_CELL_SIZE = 10;
const enemySpatialGrid = [];
for (let i = 0; i < ENEMY_GRID_DIM * ENEMY_GRID_DIM; i++) {
  enemySpatialGrid.push([]);
}

const _hitCandidates = [];
const _separationCandidates = [];

function buildEnemyGrid() {
  for (let i = 0; i < enemySpatialGrid.length; i++) {
    enemySpatialGrid[i].length = 0;
  }
  for (let i = 0; i < state.enemies.length; i++) {
    const enemy = state.enemies[i];
    const ix = Math.round(enemy.x / ENEMY_GRID_CELL_SIZE) + ENEMY_GRID_OFFSET;
    const iz = Math.round(enemy.z / ENEMY_GRID_CELL_SIZE) + ENEMY_GRID_OFFSET;
    if (ix < 0 || ix >= ENEMY_GRID_DIM || iz < 0 || iz >= ENEMY_GRID_DIM) continue;
    enemySpatialGrid[ix * ENEMY_GRID_DIM + iz].push(i);
  }
}

function collectNearbyEnemies(x, z, outEnemies) {
  outEnemies.length = 0;
  const ix0 = Math.round(x / ENEMY_GRID_CELL_SIZE);
  const iz0 = Math.round(z / ENEMY_GRID_CELL_SIZE);
  for (let a = ix0 - 1; a <= ix0 + 1; a++) {
    if (a < -ENEMY_GRID_OFFSET || a > ENEMY_GRID_OFFSET) continue;
    for (let c = iz0 - 1; c <= iz0 + 1; c++) {
      if (c < -ENEMY_GRID_OFFSET || c > ENEMY_GRID_OFFSET) continue;
      const cell = enemySpatialGrid[(a + ENEMY_GRID_OFFSET) * ENEMY_GRID_DIM + (c + ENEMY_GRID_OFFSET)];
      for (let k = 0; k < cell.length; k++) {
        outEnemies.push(state.enemies[cell[k]]);
      }
    }
  }
}

function findNearestEnemy(maxRadius, fromX, fromZ) {
  const ox = fromX !== undefined ? fromX : state.player.x;
  const oz = fromZ !== undefined ? fromZ : state.player.z;
  let nearest = null;
  let minDistance = maxRadius;
  for (const enemy of state.enemies) {
    const dist = hypot2D(enemy.x - ox, enemy.z - oz);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = enemy;
    }
  }
  return nearest;
}

/* ---------- 2. Экранные эффекты и урон ---------- */

function triggerScreenShake(amount) {
  if (state) {
    state.screenShake = Math.max(state.screenShake, amount);
  }
}

function triggerScreenFlash(backgroundCss) {
  const flashEl = getById('flash');
  flashEl.style.background = backgroundCss;
  flashEl.style.opacity = '0.6';
  setTimeout(() => {
    flashEl.style.opacity = '0';
  }, 80);
}

function showToast(message, duration = 1.6) {
  const toastEl = getById('toast');
  toastEl.textContent = message;
  toastEl.style.opacity = 1;
  if (state) {
    state.toastTimer = duration;
  }
}

function calculateDamageMultiplier(tags) {
  const owned = state.itemsOwned;
  let additiveBonus = state.tomeLevels.dmg * 0.1;
  let totalMultiplier = state.damageMultiplier;

  if (owned.comp) {
    additiveBonus += Math.min(
      0.4,
      Math.max(0, Math.floor((state.player.y - state.lavaY) / 5)) * 0.02
    );
  }
  if (owned.heart && state.player.y - state.lavaY < 6) {
    additiveBonus += 0.25 * owned.heart;
  }
  // Бонус снайперской позиции при стрельбе с вертикального полуэтажа-балкона (floorY + 6)
  if (state.isOnBalcony) {
    additiveBonus += 0.2;
  }

  for (const tag of tags) {
    const count = state.tagCounts[tag] || 0;
    if (count >= 2) additiveBonus += 0.15;
    if (count >= 4) additiveBonus += 0.25;
    if (count >= 6) totalMultiplier *= 1.5;
  }

  return (1 + additiveBonus) * totalMultiplier;
}

function damageEnemy(enemy, baseDmg, tags, isFire, isChainHit) {
  if (enemy.shield) {
    if (!isChainHit) {
      playSound('shield');
      spawnWaveRingEffect(
        enemy.x,
        enemy.y + (enemy.radius || 1.5),
        enemy.z,
        1.1,
        state.towerId === 'ice' ? 0x80e8ff : 0xc090ff
      );
    }
    return;
  }

  playSound('hit');
  let dmg = baseDmg * calculateDamageMultiplier(tags);

  if (state.heroId === 'hun') {
    dmg *= enemy.type === 'b' || enemy.eliteType ? 1.5 : 0.85;
  }
  if (isFire && state.heroId === 'ash') {
    dmg *= 1.15;
  }
  if (enemy.weak) {
    dmg *= 2;
  }
  if (enemy.burnTimer > 0 && enemy.slowTimer > 0) {
    dmg *= 2;
    enemy.burnTimer = 0;
    spawnWaveRingEffect(enemy.x, enemy.y, enemy.z, 2.5, 0xdddddd);
    if (typeof spawnSteamBurstEffect === 'function') {
      spawnSteamBurstEffect(enemy.x, enemy.y, enemy.z);
    }
  }
  if (isFire) {
    enemy.burnTimer = 3;
  }

  enemy.hp -= dmg;

  if (!isChainHit && state.itemsOwned.belt && ++state.totalHitCount % 5 === 0) {
    let chainCount = 0;
    const maxTargets = 3 * state.itemsOwned.belt;
    let prevX = state.player.x;
    let prevY = state.player.y + 1.0;
    let prevZ = state.player.z;
    const enemyHitY = enemy.y + (enemy.radius || 0.8);
    if (typeof spawnThunderChainEffect === 'function') {
      spawnThunderChainEffect(prevX, prevY, prevZ, enemy.x, enemyHitY, enemy.z);
    }
    prevX = enemy.x;
    prevY = enemyHitY;
    prevZ = enemy.z;

    for (const other of state.enemies) {
      if (
        other !== enemy &&
        chainCount < maxTargets &&
        hypot2D(other.x - enemy.x, other.z - enemy.z) < 12
      ) {
        const otherY = other.y + (other.radius || 0.8);
        if (typeof spawnThunderChainEffect === 'function') {
          spawnThunderChainEffect(prevX, prevY, prevZ, other.x, otherY, other.z);
        }
        prevX = other.x;
        prevY = otherY;
        prevZ = other.z;
        damageEnemy(other, baseDmg * 0.6, ['elec'], 0, 1);
        chainCount++;
      }
    }
  }
}

function triggerShockwave(x, z, radius, damage, isFire, tags) {
  playSound('boom');
  spawnWaveRingEffect(x, state.player.y, z, radius, isFire ? 0xff7a20 : 0x80e0ff);
  triggerScreenShake(0.3);

  for (const enemy of state.enemies) {
    const enemyRadius =
      enemy.radius !== undefined ? enemy.radius : ENEMY_TYPES[enemy.type].radius;
    const hitRadius = radius + enemyRadius;
    const dx = enemy.x - x;
    const dz = enemy.z - z;
    const verticalWindow = enemyRadius + (enemy.type === 'b' ? 3.5 : 2);

    if (
      dx * dx + dz * dz < hitRadius * hitRadius &&
      Math.abs(enemy.y + enemyRadius - state.player.y) < verticalWindow
    ) {
      damageEnemy(enemy, damage, tags, isFire);
    }
  }
}

function emitCombatEvent(eventName) {
  if (eventName === 'onLand' && state.itemsOwned.coal) {
    if (typeof spawnCoalBootEruption === 'function') {
      spawnCoalBootEruption(
        state.player.x,
        state.player.y,
        state.player.z,
        state.itemsOwned.coal
      );
    }
    triggerShockwave(
      state.player.x,
      state.player.z,
      3,
      0.4 * BASE_DAMAGE * state.itemsOwned.coal,
      1,
      ['fire', 'kin']
    );
  }
}

function damagePlayer(amount, isLavaDamage) {
  if (!isLavaDamage) {
    if (state.invulnerabilityTimer > 0) return;
    state.invulnerabilityTimer = 0.4;
    amount *= 1 + 0.035 * state.maxFloorReached;
  }
  state.timeSinceLastHit = 0;
  state.player.hp -= amount;
  playSound('hurt');
  triggerScreenShake(0.4);
  triggerScreenFlash('radial-gradient(circle, rgba(255,0,0,.4) 0%, transparent 70%)');
}

/* ---------- 3. Спавн мобов, элит и боссов ---------- */

function releaseAllEnemies() {
  if (!state || !state.enemies) return;
  for (const enemy of state.enemies) {
    if (enemy.mesh) {
      if (enemy.bolts) {
        for (const bolt of enemy.bolts) releaseBolt(bolt);
        enemy.bolts.length = 0;
      }
      MobFactory.release(enemy.type, enemy.mesh);
      enemy.mesh = null;
    }
  }
  state.enemies.length = 0;
}

function spawnEnemy(type, x, z, hpScale, bossKind) {
  hpScale *= (state.towerConfig && state.towerConfig.enemyHpMul) || 1;
  // Небольшое кооперативное масштабирование здоровья под размер группы
  const coopHpFactor = 1 + Math.max(0, (state.playerCount || 1) - 1) * (type === 'b' ? 0.28 : 0.15);
  hpScale *= coopHpFactor;

  const baseStats = ENEMY_TYPES[type];

  const enemy = {
    type,
    x,
    z,
    hp: baseStats.hp * hpScale,
    maxHp: baseStats.hp * hpScale,
    burnTimer: 0,
    slowTimer: 0,
    attackCooldown: 1 + Math.random(),
    tintState: 0,
    lodTier: -1,
    groundCheckTick: 0,
    groundY: null
  };

  let groundY0 =
    type === 'b' ? state.player.lastGroundY : getGroundHeightAt(x, state.player.lastGroundY, z);
  if (type !== 'b' && groundY0 < state.player.lastGroundY - 2) {
    groundY0 = state.player.lastGroundY;
  }

  const startY = type === 'b' ? state.lavaY - 4 : groundY0 - 2.6;
  let targetY;

  if (type === 's') {
    enemy.jumpState = 'idle';
    enemy.jumpTimer = 0;
    enemy.jumpVelocityY = 0;
    enemy.scaleY = 1;
    enemy.scaleXZ = 1;
    enemy.idleDuration = 1.0;
    enemy.eyeFlicker = 1;
    enemy.eyeFlickerTimer = 0;
    targetY = groundY0;
  } else if (type === 'r') {
    enemy.hoverHeight = 1.0 + Math.random() * 1.5;
    enemy.hoverPhase = Math.random() * Math.PI * 2;
    enemy.anchorY = groundY0;
    enemy.orbitDistance = 12.5 + Math.random() * 3;
    enemy.orbitSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.22 + Math.random() * 0.2);
    enemy.aimYaw = 0;
    enemy.surgeTimer = 2 + Math.random() * 3;
    enemy.surgeActiveTimer = 0;
    enemy.boltTimer = 0.5;
    enemy.bolts = [];
    enemy.surgeLevel = 0;
    enemy.flashIntensity = 0;
    targetY = groundY0 + enemy.hoverHeight;
  } else if (type === 'l') {
    enemy.jumpState = 'idle';
    enemy.jumpTimer = 0;
    enemy.jumpVelocityY = 0;
    enemy.jumpOffsetY = 0;
    enemy.jawAngle = 0.12;
    enemy.jawTimer = 2 + Math.random() * 2;
    enemy.flare = 0;
    enemy.shake = 0;
    enemy.headYaw = 0;
    targetY = groundY0;
  } else if (type === 't') {
    targetY = groundY0;
  } else if (type === 'b') {
    const bossCfg = BOSS_CONFIGS[bossKind] || BOSS_CONFIGS.golem;
    state.activeBossCount = (state.activeBossCount || 0) + 1;
    enemy.bkind = bossKind || 'golem';
    enemy.hp = enemy.maxHp = Math.round(bossCfg.hp * hpScale);
    enemy.radius = bossCfg.radius;
    enemy.contactDamage = bossCfg.contactDamage;
    enemy.xpReward = bossCfg.xp;
    enemy.bossScale = bossCfg.scale;
    enemy.bossSpeed = bossCfg.speed;
    enemy.bossSpeedMul = 1;
    enemy.isMoving = 0;
    enemy.bossState = enemy.bkind === 'koloss' ? 'emerge' : 'spawn';
    enemy.bossTimer = 0;
    enemy.phase = 1;
    enemy.flare = 0;
    enemy.shake = 0;
    enemy.combo = 0;
    enemy.nextAttack = '';
    enemy.impactDone = 0;
    enemy.attackCount = 0;
    enemy.marchTimer = Math.random() * 2;
    enemy.prevSwing = 0;
    enemy.pendingRingTimer = 0;
    enemy.floorFlare = 0;
    enemy.shedTimer = 0.2;
    enemy.roarFxDone = 0;
    enemy.isFury = 0;
    enemy.flowMultiplier = 1;
    enemy.ventTimer = 2;
    enemy.ventFlares = [0, 0, 0, 0, 0];
    enemy.dripTimer = 0.2;
    enemy.fountainAccum = 0;
    enemy.barrageTimer = 3;
    enemy.barrageShotsLeft = 0;
    enemy.barrageShotCooldown = 0;
    enemy.shield = 0;
    enemy.weak = 0;
    enemy.openAmount = 0;
    enemy.openTarget = 0;
    enemy.summonTimer = 0.5;
    enemy.orbTimer = 2;
    enemy.arcBoltTimer = 0.6;
    enemy.facingYaw = 0;
    enemy.bolts = [];
    enemy.bossName =
      (TOWER_BOSS_NAMES[state.towerId] && TOWER_BOSS_NAMES[state.towerId][enemy.bkind]) ||
      bossCfg.name;
    targetY = state.player.lastGroundY;
    if (enemy.bkind === 'womb') {
      enemy.wombFloorY = state.player.lastGroundY;
      enemy.baseY = state.player.lastGroundY + (state.towerId === 'ice' ? 2.4 : 3.2);
      targetY = enemy.baseY;
    }
  }

  enemy.isRising = true;
  enemy.risingTime = 0;
  enemy.risingDuration = 0.8;
  enemy.risingDelay = type === 'b' ? 0 : Math.random() * 0.5;
  enemy.speedVariation = type === 'b' ? 1 : 0.88 + Math.random() * 0.24;
  enemy.startY = startY;
  enemy.targetY = targetY;
  enemy.y = startY;

  enemy.mesh = MobFactory.acquire(type, enemy.bkind, state.towerId);
  scene.add(enemy.mesh);
  state.enemies.push(enemy);

  if (type === 'b') {
    lastBossNameText = '';
    lastBossShownState = 1;
    getById('bossName').textContent = enemy.bossName;
    DOM_CACHE.bossHpContainer.classList.add('visible');
    if (enemy.bkind === 'koloss') {
      enemy.risingDuration = 2.2;
      enemy.startY = targetY - 8;
      enemy.y = enemy.startY;
    }
    if (enemy.bkind === 'womb') {
      wombRune.position.set(enemy.x, enemy.wombFloorY + 0.05, enemy.z);
    }
    playSound(enemy.bkind === 'womb' ? 'summon' : 'roar');
    triggerScreenShake(0.3);
    spawnWaveRingEffect(
      enemy.x,
      targetY + 0.2,
      enemy.z,
      2.5,
      state.towerId === 'ice' ? 0x70dcff : state.towerId === 'void' ? 0xc068ff : 0xff7a20
    );
  }
}

function promoteToElite(enemy, floorIndex, forceElite) {
  let activeElites = 0;
  for (const other of state.enemies) {
    if (other.eliteType) activeElites++;
  }
  if (!forceElite && activeElites >= 2 + ((floorIndex / 4) | 0) + (state.playerCount > 2 ? 1 : 0)) {
    return;
  }

  const eliteKeys = Object.keys(ELITE_MODIFIERS);
  const chosenKey = eliteKeys[Math.floor(Math.random() * eliteKeys.length)];
  const mod = ELITE_MODIFIERS[chosenKey];
  const baseStats = ENEMY_TYPES[enemy.type];

  enemy.eliteType = chosenKey;
  enemy.eliteScale = ELITE_SCALE_BY_TYPE[enemy.type] || 1.3;
  enemy.hp *= mod.hpMultiplier;
  enemy.maxHp = enemy.hp;
  enemy.speedVariation *= mod.speedMultiplier;
  enemy.damageMultiplier = mod.damageMultiplier;
  enemy.radius = baseStats.radius * enemy.eliteScale;
  enemy.xpReward = baseStats.xp * 6;
  if (baseStats.contactDamage) {
    enemy.contactDamage = baseStats.contactDamage * mod.damageMultiplier;
  }

  const mobName =
    (TOWER_MOB_NAMES[state.towerId] && TOWER_MOB_NAMES[state.towerId][enemy.type]) || '';
  showToast('⚠ Элита: ' + mod.name + (mobName ? ' ' + mobName : ''), 1.8);
  playSound('roar');
}

/* ---------- 4. Выпадение лута и гибель врагов ---------- */

function spawnPickup(pickupType, x, y, z, value) {
  if (state.pickups.length >= MAX_PICKUPS - 20) {
    if (pickupType === 0) state.xp += value;
    else if (pickupType === 2) state.gold += value;
    return;
  }
  state.pickups.push({
    type: pickupType,
    x,
    y,
    z,
    value,
    lifetime: pickupType === 1 ? 35 : 50,
    isMagnetized: 0,
    speed: 6,
    phase: Math.random() * 6.28
  });
}

function dropEnemyLoot(enemy, xpValue) {
  const groundY = enemy.isRising
    ? enemy.type === 'r'
      ? enemy.anchorY
      : enemy.targetY
    : getGroundHeightAt(enemy.x, enemy.y + 1, enemy.z);
  const dropY = groundY + 0.7;
  const isElite = enemy.eliteType;

  // Проверяем маршрут как глобально, так и по конкретному сектору разделённого этажа
  const enemySectorRoute =
    typeof getSectorRouteAtPosition === 'function'
      ? getSectorRouteAtPosition(state.maxFloorReached, enemy.x, enemy.z) || state.chosenRoute
      : state.chosenRoute;

  spawnPickup(0, enemy.x, dropY, enemy.z, xpValue * (enemySectorRoute === 2 ? 1.35 : 1));

  if (isElite) {
    const coinCount = 3 + ((Math.random() * 3) | 0);
    for (let i = 0; i < coinCount; i++) {
      spawnPickup(
        2,
        enemy.x + (Math.random() - 0.5) * 2.4,
        dropY,
        enemy.z + (Math.random() - 0.5) * 2.4,
        state.isGreedPactActive ? 2 : 1
      );
    }
  } else if (
    Math.random() <
    GOLD_DROP_CHANCE[enemy.type] *
      (state.activeEvent && state.activeEvent.key === 'gold' ? 3 : 1) *
      (enemySectorRoute === 2 ? 2 : 1)
  ) {
    spawnPickup(2, enemy.x, dropY, enemy.z, state.isGreedPactActive ? 2 : 1);
  }

  if (
    Math.random() <
    (isElite ? 0.4 : HEAL_DROP_CHANCE[enemy.type]) * (enemySectorRoute === 1 ? 2.4 : 1)
  ) {
    spawnPickup(1, enemy.x + 0.5, dropY, enemy.z + 0.5, 0.12);
  }
}

function dropBossLoot(boss) {
  const groundY = getGroundHeightAt(boss.x, boss.y + 1, boss.z);
  const dropY = groundY + 0.7;
  for (let i = 0; i < 3; i++) {
    const angle = (i * TWO_PI) / 3;
    spawnPickup(1, boss.x + Math.cos(angle) * 2.5, dropY, boss.z + Math.sin(angle) * 2.5, 0.22);
  }
  for (let i = 0; i < 10; i++) {
    const angle = (i * TWO_PI) / 10 + 0.4;
    spawnPickup(2, boss.x + Math.cos(angle) * 3.2, dropY, boss.z + Math.sin(angle) * 3.2, 1);
  }
}

function checkLevelUp() {
  if (state.pauseState || state.isGameOver) return;
  const xpRequired = 6 + 5 * state.level;
  if (state.xp >= xpRequired) {
    state.xp -= xpRequired;
    state.level++;
    state.player.hp = Math.min(state.maxHp, state.player.hp + state.maxHp * 0.15);
    showUpgradeOfferModal(0);
  }
}

function killEnemy(enemyIndex) {
  const enemy = state.enemies[enemyIndex];
  const baseStats = ENEMY_TYPES[enemy.type];
  playSound('pickup');

  if (enemy.type === 's' && state.towerId === 'ice') {
    spawnSparkBurst(enemy.x, enemy.y + 0.4, enemy.z, 12, 'land');
  }
  if (enemy.burnTimer > 0 && state.itemsOwned.crys && typeof spawnSmeltCrystalBurst === 'function') {
    spawnSmeltCrystalBurst(enemy.x, enemy.y, enemy.z);
  }

  if (enemy.mesh) {
    if (enemy.bolts) {
      for (const bolt of enemy.bolts) releaseBolt(bolt);
      enemy.bolts.length = 0;
    }
    MobFactory.release(enemy.type, enemy.mesh);
    enemy.mesh = null;
  }

  const xpValue =
    (enemy.xpReward || baseStats.xp) *
    (enemy.burnTimer > 0 && state.itemsOwned.crys ? 1 + 0.5 * state.itemsOwned.crys : 1);

  state.kills++;

  if (enemy.type === 'b') {
    state.xp += xpValue;
    dropBossLoot(enemy);
    unlockHero('hun');
  } else {
    dropEnemyLoot(enemy, xpValue);
  }

  if (enemy.eliteType) {
    unlockHero('ash');
  }
  if (state.heroId === 'ash' && enemy.burnTimer > 0) {
    state.player.hp = Math.min(state.maxHp, state.player.hp + state.maxHp * 0.03);
  }
  if (enemy.eliteType === 'volt') {
    state.activeBombs.push({ x: enemy.x, y: enemy.y, z: enemy.z, timer: 1.2, nextRingTimer: 0 });
  }

  if (enemy.type === 'b') {
    state.bossesDefeated++;
    state.lavaY -= 12;
    state.activeBossCount = Math.max(0, (state.activeBossCount || 0) - 1);

    if (enemy.gateFloor !== undefined && enemy.gateFloor < GRID_FLOORS - 1) {
      openBossGate(enemy.gateFloor);
      // Если после этого босса есть безопасный «Зал Кузницы», ставим подъём лавы на паузу,
      // пока все игроки не соберутся на стартовой плите следующего яруса!
      if (typeof forgeHallsByFloor !== 'undefined' && forgeHallsByFloor[enemy.gateFloor]) {
        state.activeForgeHallFloor = enemy.gateFloor;
        state.isLavaPausedByForgeHall = 1;
        showToast(
          '🔓 Печать снята! Впереди Зал Кузницы — лава на паузе, пока отряд не встанет на стартовую плиту!',
          4.6
        );
      } else {
        showToast('🔓 Печать снята — путь наверх открыт', 3.2);
      }
    }

    playSound('win');
    triggerScreenFlash('radial-gradient(circle, rgba(255,200,100,.5) 0%, transparent 70%)');
    DOM_CACHE.bossHpContainer.classList.remove('visible');
    lastBossShownState = 0;
    lastBossWidthText = '';
    lastBossHpText = '';
    lastBossNameText = '';

    if (enemy.bkind === 'koloss' && enemy.isFury) {
      state.bossFuryLavaMultiplier = 1;
    }
    if (enemy.bkind === 'womb') {
      wombRuneTargetOpacity = 0;
      summonRingsTargetOpacity = 0;
    }
    if (enemy.bkind === 'golem') {
      golemDecalTargetOpacity = 0;
    }

    bossLight.intensity = 0;
    triggerScreenShake(0.6);
    spawnSparkBurst(enemy.x, enemy.y + 1.4, enemy.z, enemy.bkind === 'womb' ? 40 : 50, 'land');
    spawnSmokePuff(enemy.x, enemy.y + 0.4, enemy.z, 16);
    spawnWaveRingEffect(
      enemy.x,
      enemy.y + 1,
      enemy.z,
      4,
      state.towerId === 'ice' ? 0x70dcff : state.towerId === 'void' ? 0xc070ff : 0xffa040
    );

    if (enemy.isFinalBoss) {
      return finishRun(1);
    }
  }

  state.enemies[enemyIndex] = state.enemies[state.enemies.length - 1];
  state.enemies.pop();
  checkLevelUp();
}

/* ---------- 5. События этажей и бесшовный переход между 3 актами ---------- */

function startFloorEvent(eventKey) {
  const player = state.player;
  const maxSpawnR = TOWER_FLOOR_RADIUS - 4;
  if (eventKey === 'hunt') {
    for (let q = 0; q < 2; q++) {
      for (let attempt = 0; attempt < 8; attempt++) {
        const angle = Math.random() * TWO_PI;
        let x = player.x + Math.cos(angle) * 13;
        let z = player.z + Math.sin(angle) * 13;
        const radialDist = hypot2D(x, z);
        if (radialDist > maxSpawnR) {
          x *= maxSpawnR / radialDist;
          z *= maxSpawnR / radialDist;
        }
        if (getGroundHeightAt(x, player.lastGroundY, z) < player.lastGroundY - 3) continue;
        spawnEnemy(state.maxFloorReached >= 2 ? 't' : 'l', x, z, 1 + state.maxFloorReached * 0.12);
        promoteToElite(state.enemies[state.enemies.length - 1], state.maxFloorReached, 1);
        break;
      }
    }
    return;
  }
  state.activeEvent = {
    key: eventKey,
    timeLeft: FLOOR_EVENTS[eventKey].duration,
    actionTimer: 1,
    counter: 0
  };
}

function endFloorEvent(silent) {
  const eventKey = state.activeEvent && state.activeEvent.key;
  state.activeEvent = null;
  if (silent) return;
  if (eventKey === 'surge') {
    state.gold += 6;
    showToast('Прилив отступил: +6 золота', 2);
  } else {
    showToast('Событие окончено', 1.5);
  }
}

function updateFloorEvent(dt) {
  const ev = state.activeEvent;
  const player = state.player;
  const maxBombR = TOWER_FLOOR_RADIUS - 1.5;
  if (ev.key === 'storm') {
    ev.actionTimer -= dt;
    if (ev.actionTimer <= 0) {
      ev.actionTimer = 0.8;
      ev.counter++;
      let x = player.x + (Math.random() - 0.5) * 18;
      let z = player.z + (Math.random() - 0.5) * 18;
      if (ev.counter % 3 === 0) {
        x = player.x;
        z = player.z;
      }
      const radialDist = hypot2D(x, z);
      if (radialDist > maxBombR) {
        x *= maxBombR / radialDist;
        z *= maxBombR / radialDist;
      }
      state.activeBombs.push({
        x,
        y: player.lastGroundY,
        z,
        timer: 1,
        nextRingTimer: 0,
        radius: 2.8,
        damage: 14
      });
    }
  }
}

function onFloorEnter() {
  const floor = state.maxFloorReached;

  // Бесшовное переключение биома и темы башни при переходе в новый Акт (Пепел -> Лёд -> Пустота)
  let actTransitionBanner = '';
  if (state.isThreeActRun && typeof getFloorBiomeId === 'function') {
    const targetBiomeId = getFloorBiomeId(floor);
    if (targetBiomeId && targetBiomeId !== state.towerId && TOWERS[targetBiomeId]) {
      state.towerId = targetBiomeId;
      state.towerConfig = TOWERS[targetBiomeId];
      state.gravity = (state.unscaledBaseGravity || 24) * (state.towerConfig.gravityMul || 1);
      state.baseGravity = state.gravity;
      applyTowerTheme(state.towerConfig);
      playSound('win');
      actTransitionBanner = '🌟 ' + (state.towerConfig.actTitle || state.towerConfig.name) + ' · ';
    }
  }

  let message =
    actTransitionBanner +
    'Этаж ' +
    (floor + 1) +
    '/' +
    GRID_FLOORS +
    ' · ' +
    (FLOOR_LAYOUT_NAMES[floorLayouts[floor] || 'disc'] || 'Арена');

  const prevForks = forkMarkers.filter((f) => f.floor === floor - 1);
  if (prevForks.length) {
    let bestDist = 1e9;
    let chosenRoute = 0;
    for (const marker of prevForks) {
      const dist = hypot2D(state.player.x - marker.x, state.player.z - marker.z);
      if (dist < bestDist) {
        bestDist = dist;
        chosenRoute = marker.route;
      }
    }
    if (floorLayouts[floor] === 'split_ring' && typeof getSectorRouteAtPosition === 'function') {
      const secRoute = getSectorRouteAtPosition(floor, state.player.x, state.player.z);
      if (secRoute) chosenRoute = secRoute;
    }
    state.chosenRoute = chosenRoute;
    message +=
      ' · ' +
      (chosenRoute === 1
        ? '🌿 Тихий сектор: меньше мобов, лечение ×2.4'
        : '🔥 Опасный сектор: больше элит, золото ×2 и опыт +35%');
  } else {
    state.chosenRoute = 0;
  }

  if (FORK_FLOORS.includes(floor) && !isBossFloorIndex(floor) && floor < GRID_FLOORS - 1) {
    message += ' · РАЗВИЛКА: зелёная лестница — тихий сектор, красная — опасный сектор';
  }

  if (state.activeEvent) {
    endFloorEvent(1);
  }

  if (
    floor >= 1 &&
    !isBossFloorIndex(floor) &&
    floor < GRID_FLOORS - 1 &&
    !state.isLavaPausedByForgeHall &&
    seededRandom(state.seed, 'evp', floor) < 0.55
  ) {
    const eventKey =
      FLOOR_EVENT_KEYS[Math.floor(seededRandom(state.seed, 'ev', floor) * FLOOR_EVENT_KEYS.length)];
    startFloorEvent(eventKey);
    message += ' · ' + FLOOR_EVENTS[eventKey].name;
  }

  showToast(
    message,
    actTransitionBanner || FORK_FLOORS.includes(floor) || prevForks.length ? 4.8 : 2.8
  );
}
