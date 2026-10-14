/* ==========================================================================
   Ввод (клавиатура/мышь), инициализация забега и фиксированный шаг физики (60 Гц)
   ========================================================================== */

let state = null;
const keysPressed = {};
let isMouseDown = 0;

window.addEventListener('keydown', (event) => {
  keysPressed[event.code] = 1;
  if (event.code === 'Space') {
    keysPressed.jump = 1;
    event.preventDefault();
  }
  if (event.code.startsWith('Shift')) {
    keysPressed.slide = 1;
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
    canvas.requestPointerLock();
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

/**
 * Инициализирует новое состояние забега (стандартного или ежедневного).
 * @param {number} mode 0 — стандартный забег, 1 — рейтинг дня
 */
function initializeRun(mode) {
  releaseAllEnemies();
  releaseAllGlobalBolts();
  if (state) {
    state.projectiles.length = 0;
    state.bladePositions.length = 0;
  }

  const dateCode = getCurrentDateCode();
  const seed = mode
    ? hashString('lava' + dateCode)
    : crypto.getRandomValues(new Uint32Array(1))[0];

  state = {
    mode,
    seed,
    dateCode,
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
  const towerId = mode
    ? TOWER_IDS[Math.floor(seededRandom(seed, 'twr', 0) * 3)]
    : selectedTowerId;

  state.heroId = heroId;
  state.towerId = towerId;
  state.towerConfig = TOWERS[towerId];
  state.standingStillTime = 0;
  state.chosenRoute = 0;

  if (state.towerConfig.gravityMul) {
    state.gravity *= state.towerConfig.gravityMul;
  }

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

  applyTowerTheme(state.towerConfig);
  buildTower(seed);
  showToast(state.towerConfig.name + ' · ' + heroCfg.name, 3.4);
  resetBossEffects();
}

/**
 * Основной шаг физической симуляции и игровой логики (вызывается с фиксированным dt = 1/60 с).
 */
function updateGameStep(dt) {
  const player = state.player;
  const owned = state.itemsOwned;

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
  const forwardInput = (keysPressed.KeyW ? 1 : 0) - (keysPressed.KeyS ? 1 : 0);
  const rightInput = (keysPressed.KeyD ? 1 : 0) - (keysPressed.KeyA ? 1 : 0);

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
  const moveSpeed =
    7 *
    (1 + 0.08 * state.tomeLevels.spd) *
    (state.playerSpeedMultiplier || 1) *
    (state.chillTimer > 0 ? 0.55 : 1) *
    lavaSlowFactor;

  if (keysPressed.slide && player.isGrounded && state.slideTimer <= 0 && state.slideCooldown <= 0) {
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

  if (state.towerConfig.isSlipperyIce) {
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

  if (state.vortexPull) {
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

  const playerRadialDist = hypot2D(player.x, player.z);
  if (playerRadialDist > 29.4) {
    player.x *= 29.4 / playerRadialDist;
    player.z *= 29.4 / playerRadialDist;
  }

  player.coyoteTimer = player.isGrounded ? 0.1 : player.coyoteTimer - dt;
  player.jumpBufferTimer -= dt;
  if (keysPressed.jump) {
    player.jumpBufferTimer = 0.1;
    keysPressed.jump = 0;
  }
  if (player.jumpBufferTimer > 0) {
    if (player.coyoteTimer > 0) {
      player.vy = 8.8;
      player.coyoteTimer = 0;
      player.jumpBufferTimer = 0;
      player.isGrounded = 0;
      playSound('jump');
    } else if (
      !state.disableDoubleJump &&
      player.doubleJumpsUsed < (state.maxExtraJumps || 1)
    ) {
      player.vy = 7.84;
      player.doubleJumpsUsed++;
      player.jumpBufferTimer = 0;
      playSound('jump');
    }
  }

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

  for (const pad of jumpPads) {
    if (
      Math.abs(pad.x - player.x) < 1.6 &&
      Math.abs(pad.z - player.z) < 1.6 &&
      Math.abs(pad.y - player.y) < 0.6 &&
      player.vy <= 0
    ) {
      player.vy = 17;
      player.doubleJumpsUsed = 0;
      playSound('bounce');
    }
  }

  state.maxFloorReached = Math.max(
    state.maxFloorReached,
    Math.min(11, Math.floor(player.lastGroundY / 14 + 0.07))
  );
  if (state.maxFloorReached >= 5 && !metaProgress.unlockedHeroes.pil) {
    unlockHero('pil');
  }

  const tierSpeed = [0.25, 0.35, 0.45][Math.min(2, Math.floor(state.maxFloorReached / 4))];
  const lavaRiseRate = Math.min(
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
  if (isInLava) {
    damagePlayer(state.maxHp * 0.15 * dt, 1);
  }

  if (state.timeSinceLastHit > 3 && !isInLava && player.hp < state.maxHp) {
    player.hp = Math.min(
      state.maxHp,
      player.hp + state.maxHp * 0.012 * (state.chosenRoute === 1 ? 1.8 : 1) * dt
    );
  }

  if (state.towerConfig.hasColdPenalty) {
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

  for (const bossFloor of [3, 7, 11]) {
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
      const bossRadial = hypot2D(bossX, bossZ);
      if (bossRadial > 25) {
        bossX *= 25 / bossRadial;
        bossZ *= 25 / bossRadial;
      }
      const bossKind = bossFloor === 3 ? 'golem' : bossFloor === 7 ? 'womb' : 'koloss';
      spawnEnemy('b', bossX, bossZ, 1 + ((bossFloor - 3) / 4) * 0.8, bossKind);
      const spawnedBoss = state.enemies[state.enemies.length - 1];
      spawnedBoss.isFinalBoss = bossFloor === 11;
      spawnedBoss.gateFloor = bossFloor;
      if (bossFloor < 11) {
        showToast('🔒 Печать закрыта: победите босса, чтобы подняться!', 3.4);
      }
    }
  }

  const activeFloor = Math.min(11, Math.max(0, Math.floor(player.lastGroundY / 14 + 0.07)));
  state.spawnBudget +=
    dt *
    (1.5 + activeFloor * 0.4) *
    (state.chosenRoute === 2 ? 1.35 : state.chosenRoute === 1 ? 0.7 : 1);

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

  if (state.spawnBudget >= waveCost && state.enemies.length < 250) {
    state.spawnBudget -= waveCost;
    state.waveIndexByFloor[activeFloor] = waveIdx + 1;

    for (let j = 0; j < groupSize; j++) {
      const angle = seededRandom(state.seed, 'floor-' + activeFloor, seedOffset + 10 + j * 8) * TWO_PI;
      const distFromPlayer =
        11 + seededRandom(state.seed, 'floor-' + activeFloor, seedOffset + 500 + j * 8) * 9;
      let spawnX = player.x + Math.cos(angle) * distFromPlayer;
      let spawnZ = player.z + Math.sin(angle) * distFromPlayer;
      let radialDist = hypot2D(spawnX, spawnZ);
      if (radialDist > 24) {
        spawnX *= 24 / radialDist;
        spawnZ *= 24 / radialDist;
      }
      if ((spawnX - player.x) * (spawnX - player.x) + (spawnZ - player.z) * (spawnZ - player.z) < 81) {
        const oppositeAngle = angle + Math.PI;
        spawnX = player.x + Math.cos(oppositeAngle) * distFromPlayer;
        spawnZ = player.z + Math.sin(oppositeAngle) * distFromPlayer;
        radialDist = hypot2D(spawnX, spawnZ);
        if (radialDist > 24) {
          spawnX *= 24 / radialDist;
          spawnZ *= 24 / radialDist;
        }
      }
      if (getGroundHeightAt(spawnX, player.lastGroundY, spawnZ) < player.lastGroundY - 3) {
        continue;
      }
      spawnEnemy(mobType, spawnX, spawnZ, 1 + activeFloor * 0.12);
      if (
        j === groupSize - 1 &&
        activeFloor >= 1 &&
        Math.random() <
          Math.min(
            0.5,
            (0.05 + 0.035 * activeFloor) *
              (state.isGreedPactActive ? 2 : 1) *
              (state.chosenRoute === 2 ? 2.2 : state.chosenRoute === 1 ? 0 : 1)
          )
      ) {
        promoteToElite(state.enemies[state.enemies.length - 1], activeFloor);
      }
    }
  }

  buildEnemyGrid();
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
      const target = findNearestEnemy(25);
      state.weaponCooldowns.fire = 0.2;
      if (target && state.projectiles.length < 200) {
        state.weaponCooldowns.fire = 1.1 / (1 + 0.08 * weaponLv);
        state.fireMuzzleFlash = 1.0;
        const shotCount = 1 + ((weaponLv / 3) | 0);
        const baseAngle = Math.atan2(target.z - player.z, target.x - player.x);
        playSound('shoot');
        for (let i = 0; i < shotCount; i++) {
          const angle = baseAngle + (i - (shotCount - 1) / 2) * 0.2;
          state.projectiles.push({
            x: player.x,
            y: player.y + 1,
            z: player.z,
            vx: Math.cos(angle) * 20,
            vz: Math.sin(angle) * 20,
            lifetime: 1.4,
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
        (proj.x - player.x) * (proj.x - player.x) + (proj.z - player.z) * (proj.z - player.z) < 0.81 &&
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
        const verticalTolerance = enemy.type === 'b' ? 3.5 : 1.5;
        if (
          (proj.x - enemy.x) * (proj.x - enemy.x) + (proj.z - enemy.z) * (proj.z - enemy.z) <
            hitThreshold * hitThreshold &&
          Math.abs(proj.y - (enemy.y + enemyRadius)) < enemyRadius + verticalTolerance
        ) {
          damageEnemy(enemy, proj.damage, ['fire'], proj.isFire);
          spawnSparkBurst(proj.x, proj.y, proj.z, 7, 'fire');
          spawnSlagBurst(proj.x, proj.y - 0.25, proj.z, 2, 0.55);
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

  // Логика и движение врагов (с учётом уникальных механик мобов 3 башен!)
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

    if (
      state.towerConfig.canEnemiesBlink &&
      enemy.type !== 'b' &&
      !enemy.isRising
    ) {
      if (enemy.blinkCooldown === undefined) {
        enemy.blinkCooldown = enemy.type === 's' ? 2.2 + Math.random() * 2.5 : 4 + Math.random() * 5;
      }
      const blinkRateMul = enemy.type === 't' && enemy.hp <= enemy.maxHp * 0.5 ? 2.0 : 1.0;
      if ((enemy.blinkCooldown -= dt * blinkRateMul) <= 0) {
        enemy.blinkCooldown = enemy.type === 's' ? 2.5 + Math.random() * 2.5 : 5.5 + Math.random() * 5;
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
          if (radialDist > 26) {
            nx *= 26 / radialDist;
            nz *= 26 / radialDist;
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
    if (radialClamp > 29) {
      enemy.x *= 29 / radialClamp;
      enemy.z *= 29 / radialClamp;
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
      if (radialDist > 29) {
        enemy.x *= 29 / radialDist;
        enemy.z *= 29 / radialDist;
      }

      const targetHoverY =
        enemy.anchorY + enemy.hoverHeight + Math.sin(state.elapsedTime * 1.6 + enemy.hoverPhase) * 0.3;
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
          if (dist < 3.5 && Math.abs(player.y - enemy.y) < 3) {
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
          player.hp = Math.min(state.maxHp, player.hp + state.maxHp * pickup.value);
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

  if (!state.pauseState) {
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

  if (!state.pauseState) {
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

  if (player.hp <= 0) {
    finishRun(0);
  }
}
