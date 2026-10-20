/* ==========================================================================
   Боевая система (Блок 3 — Боевая мета, глубина билдов и командные синергии):
   - Пространственная сетка врагов (до R=50 м под 23×23)
   - Матрица 4 межклассовых стихийных реакций с общими статусами врагов:
     1) ПАР (Огонь + Лёд): мгновенный AoE-взрыв ×2 урона + ослепление мобов (3.5 с)
     2) СВЕРХПРОВОДИМОСТЬ (Лёд + Молния): дуговой разряд по всем замороженным
        целям на этаже + снижение их защиты на 30% (6 с)
     3) ДЕТОНАЦИЯ ШЛАКА (Огонь + Кинетика): выброс 3 горящих мини-луж магмы вокруг цели
     4) КОЛЛАПС ПУСТОТЫ (Стяжка/Замедление + Тяжёлый удар): +50% урона и стяжка
   - Арсенал из 9 видов оружия (лимит 2 слота на игрока): Морозные копья, Цепная
     молния, Сфера гравитации, Магмовый тотем-турель, Кузнечный щит-бумеранг, Коса Бездны
   - Реликвии с компромиссами (Свинцовые наплечники, Стеклянный горн, Крио-реактор, Кандалы)
   - Вертикальная специализация («Верхний стрелок» comp и «Нижний страж» heart)
   - Командные пассивные навыки и ауры 5 героев (Угленосцев)
   ========================================================================== */

/* ---------- 1. Пространственная сетка врагов и 3D-группа боевых объектов ---------- */

const ENEMY_GRID_DIM = 11;
const ENEMY_GRID_OFFSET = 5;
const ENEMY_GRID_CELL_SIZE = 10;
const enemySpatialGrid = [];
for (let i = 0; i < ENEMY_GRID_DIM * ENEMY_GRID_DIM; i++) {
  enemySpatialGrid.push([]);
}

const _hitCandidates = [];
const _separationCandidates = [];

// 3D-группа для турелей, сфер гравитации, бумерангов, мини-луж шлака и меток Охотника
const combatDeployablesGroup = new THREE.Group();
scene.add(combatDeployablesGroup);

function clearCombatDeployables() {
  combatDeployablesGroup.clear();
  if (!state) return;
  if (state.magmaTotems) state.magmaTotems.length = 0;
  if (state.gravitySpheres) state.gravitySpheres.length = 0;
  if (state.boomerangs) state.boomerangs.length = 0;
  if (state.combatMagmaPuddles) state.combatMagmaPuddles.length = 0;
}

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

/* ---------- 2. Кооперативные ауры героев, вертикальная специализация и множители урона ---------- */

/**
 * Проверяет, активна ли командная аура указанного героя ('wan', 'pil', 'smi', 'ash', 'hun')
 * в заданной точке (x, y, z) от локального игрока или живых кооп-союзников.
 */
function isHeroCoopAuraActiveAt(heroKey, x, y, z, customRadius) {
  if (!state) return false;
  const radius = customRadius || (HEROES[heroKey] && HEROES[heroKey].coopAuraRadius) || 12;
  const isPlayerAlive =
    !state.playerEmber || (!state.playerEmber.active && !state.playerEmber.lostInLava);

  if (
    state.heroId === heroKey &&
    isPlayerAlive &&
    Math.abs(state.player.y - y) < 5.5 &&
    hypot2D(state.player.x - x, state.player.z - z) <= radius
  ) {
    return true;
  }

  if (state.coopPeers) {
    for (let i = 0; i < state.coopPeers.length; i++) {
      const peer = state.coopPeers[i];
      if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
      if (
        peer.heroId === heroKey &&
        Math.abs(peer.y - y) < 5.5 &&
        hypot2D(peer.x - x, peer.z - z) <= radius
      ) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Возвращает эффективный множитель стоимости сундука в точке (chestX, chestY, chestZ)
 * с учётом личного бонуса Кузнеца и его командной ауры в радиусе 12 м.
 */
function getEffectiveChestCostMultiplier(chestX, chestY, chestZ) {
  if (!state) return 1;
  if (state.heroId === 'smi') return 0.7;
  if (isHeroCoopAuraActiveAt('smi', chestX, chestY, chestZ, 12.5)) {
    return 0.7;
  }
  return state.chestCostMultiplier || 1;
}

/**
 * Вычисляет радиус AoE-эффектов игрока с учётом «Кандалов Пустоты» (void_shackle).
 */
function getPlayerAoeRadiusMultiplier() {
  if (!state || !state.itemsOwned) return 1;
  return 1 + 0.45 * (state.itemsOwned.void_shackle || 0);
}

/**
 * Вычисляет темп перезарядки оружия игрока с учётом «Криогенного реактора» (cryo_core)
 * и командной ауры Странника ('wan') в радиусе 12 м.
 */
function getPlayerAttackSpeedMultiplier() {
  if (!state || !state.itemsOwned) return 1;
  let mul = 1 + 0.4 * (state.itemsOwned.cryo_core || 0);
  if (state.isWandererAuraActive) {
    mul *= 1.15;
  }
  return mul;
}

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

function calculateDamageMultiplier(tags, targetEnemy) {
  const owned = state.itemsOwned;
  let additiveBonus = state.tomeLevels.dmg * 0.1;
  let totalMultiplier = state.damageMultiplier;

  // 1. Вертикальная специализация: «Верхний стрелок» (comp) vs «Нижний страж» (heart)
  const heightAboveLava = Math.max(0, state.player.y - state.lavaY);
  if (owned.comp) {
    // +4% урона за каждые 4 м над лавой (до +65% за стак)
    const compBonus = Math.min(0.65, Math.floor(heightAboveLava / 4) * 0.04) * owned.comp;
    additiveBonus += compBonus;
    // Дополнительный снайперский мультипликатор при стрельбе с балкона или сверху вниз
    if (
      state.isOnBalcony ||
      (targetEnemy && state.player.y > (targetEnemy.y || 0) + 2.4)
    ) {
      totalMultiplier *= 1 + 0.35 * owned.comp;
    }
  }

  if (owned.heart && heightAboveLava < 7.0) {
    // Роль «Нижний страж»: +45% урона за стак на первых ступенях у самой лавы
    additiveBonus += 0.45 * owned.heart;
  }

  // 2. Реликвии с компромиссами (Brotato-стиль)
  if (owned.lead) {
    // Свинцовые наплечники: +60% урона за стак
    additiveBonus += 0.6 * owned.lead;
  }
  if (owned.glass) {
    // Стеклянный горн: итоговый урон ×1.8 за стак
    totalMultiplier *= Math.pow(1.8, owned.glass);
  }
  if (
    owned.void_shackle &&
    targetEnemy &&
    (targetEnemy.slowTimer > 0 || (targetEnemy.pullTimer || 0) > 0)
  ) {
    // Кандалы Пустоты: +35% урона по замедленным и стянутым врагам
    additiveBonus += 0.35 * owned.void_shackle;
  }

  // 3. Позиционные и кооперативные бонусы
  if (state.isOnBalcony) {
    additiveBonus += 0.2 + (state.isPilgrimAuraActive ? 0.2 : 0);
  }
  if (state.isTetherChainActive) {
    additiveBonus += 0.35;
  }
  if (state.isPolarResonanceActive) {
    additiveBonus += 0.4;
  }
  // Кооп-аура Кузнеца в радиусе 12 м: +15% кинетического урона
  if (state.isBlacksmithAuraActive && tags && tags.includes('kin')) {
    additiveBonus += 0.15;
  }

  // 4. Синергии по тегам стихий
  if (tags) {
    for (const tag of tags) {
      const count = state.tagCounts[tag] || 0;
      if (count >= 2) additiveBonus += 0.15;
      if (count >= 4) additiveBonus += 0.25;
      if (count >= 6) totalMultiplier *= 1.5;
    }
  }

  return (1 + additiveBonus) * totalMultiplier;
}

/* ---------- 3. Мини-лужи магмы (Детонация шлака), Турели, Сферы гравитации и Бумеранги ---------- */

/**
 * Создаёт 3 мини-лужи магмы вокруг точки (x, y, z) при срабатывании реакции «Детонация шлака».
 */
function spawnCombatMagmaPuddles(centerX, centerY, centerZ, count = 3) {
  if (!state) return;
  if (!state.combatMagmaPuddles) state.combatMagmaPuddles = [];

  const aoeMul = getPlayerAoeRadiusMultiplier();
  const baseRadius = 2.0 * aoeMul;
  const baseAngle = Math.random() * TWO_PI;

  for (let i = 0; i < count; i++) {
    if (state.combatMagmaPuddles.length >= 18) {
      const oldest = state.combatMagmaPuddles.shift();
      if (oldest && oldest.mesh) combatDeployablesGroup.remove(oldest.mesh);
    }

    const angle = baseAngle + (i * TWO_PI) / count + (Math.random() - 0.5) * 0.35;
    const dist = 1.6 + Math.random() * 1.4;
    let px = centerX + Math.cos(angle) * dist;
    let pz = centerZ + Math.sin(angle) * dist;
    const maxR = (typeof TOWER_FLOOR_RADIUS !== 'undefined' ? TOWER_FLOOR_RADIUS : 28) - 1.8;
    const rDist = hypot2D(px, pz);
    if (rDist > maxR) {
      px *= maxR / rDist;
      pz *= maxR / rDist;
    }

    const groundY = getGroundHeightAt(px, centerY + 1.2, pz);
    const py = groundY >= centerY - 2.5 ? groundY : centerY;

    const group = new THREE.Group();
    group.position.set(px, py + 0.04, pz);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(baseRadius, 20),
      new THREE.MeshBasicMaterial({
        map: TEXTURES.lava,
        color: 0xff6818,
        transparent: true,
        opacity: 0.86,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);

    const rim = new THREE.Mesh(
      new THREE.RingGeometry(baseRadius * 0.82, baseRadius * 1.04, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffd048,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.01;
    group.add(rim);

    combatDeployablesGroup.add(group);
    state.combatMagmaPuddles.push({
      x: px,
      y: py,
      z: pz,
      radius: baseRadius,
      life: 5.5,
      maxLife: 5.5,
      tickTimer: 0.15,
      mesh: group,
      disc,
      rim
    });
  }
}

/**
 * Устанавливает 3D «Магмовый тотем-турель» (оружие 'totem').
 */
function deployMagmaTotem(x, y, z, weaponLv, ownerId = 'player') {
  if (!state) return;
  if (!state.magmaTotems) state.magmaTotems = [];

  const maxTotemsForOwner = weaponLv >= 5 ? 2 : 1;
  const existingForOwner = state.magmaTotems.filter((t) => t.ownerId === ownerId);
  if (existingForOwner.length >= maxTotemsForOwner) {
    const oldest = existingForOwner[0];
    const idx = state.magmaTotems.indexOf(oldest);
    if (idx >= 0) state.magmaTotems.splice(idx, 1);
    if (oldest.mesh) combatDeployablesGroup.remove(oldest.mesh);
  }

  const gY = getGroundHeightAt(x, y + 1.0, z);
  const safeY = gY >= y - 2.5 ? gY : y;

  const group = new THREE.Group();
  group.position.set(x, safeY, z);

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x2c2226,
    emissive: 0xff4800,
    emissiveIntensity: 0.65,
    roughness: 0.65,
    metalness: 0.35
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 1.35, 6), baseMat);
  pillar.position.y = 0.68;
  group.add(pillar);

  const coreGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfff0b0,
      emissive: 0xff6200,
      emissiveIntensity: 2.2,
      roughness: 0.2
    })
  );
  coreGem.position.y = 1.65;
  group.add(coreGem);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.85, 20),
    new THREE.MeshBasicMaterial({
      color: 0xff8820,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);

  combatDeployablesGroup.add(group);
  spawnWaveRingEffect(x, safeY + 0.15, z, 2.2, 0xff7820);

  state.magmaTotems.push({
    ownerId,
    x,
    y: safeY,
    z,
    level: weaponLv,
    life: 11.5 + weaponLv * 0.8,
    shootCooldown: 0.25,
    mesh: group,
    coreGem,
    ring
  });
}

/**
 * Запускает 3D «Сферу гравитации» (оружие 'grav' [void, kin]), стягивающую мобов в одну точку.
 */
function spawnGravitySphereEntity(fromX, fromY, fromZ, targetX, targetY, targetZ, weaponLv) {
  if (!state) return;
  if (!state.gravitySpheres) state.gravitySpheres = [];
  if (state.gravitySpheres.length >= 4) {
    const old = state.gravitySpheres.shift();
    if (old && old.mesh) combatDeployablesGroup.remove(old.mesh);
  }

  const aoeMul = getPlayerAoeRadiusMultiplier();
  const pullRadius = (4.6 + weaponLv * 0.35) * aoeMul;

  const group = new THREE.Group();
  group.position.set(fromX, fromY + 1.1, fromZ);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 1),
    new THREE.MeshBasicMaterial({
      color: 0x18042c
    })
  );
  group.add(core);

  const accretionMat = new THREE.MeshBasicMaterial({
    color: 0xc458ff,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.06, 6, 24), accretionMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 6, 24), accretionMat);
  ring2.rotation.x = Math.PI / 2;
  group.add(ring1, ring2);

  const groundHorizon = new THREE.Mesh(
    new THREE.RingGeometry(pullRadius * 0.88, pullRadius, 32),
    new THREE.MeshBasicMaterial({
      color: 0xa845ff,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  groundHorizon.rotation.x = -Math.PI / 2;
  groundHorizon.position.y = -0.95;
  group.add(groundHorizon);

  combatDeployablesGroup.add(group);

  state.gravitySpheres.push({
    x: fromX,
    y: fromY + 1.0,
    z: fromZ,
    targetX,
    targetY: targetY + 1.0,
    targetZ,
    pullRadius,
    level: weaponLv,
    life: 3.4 + weaponLv * 0.22,
    tickTimer: 0.2,
    mesh: group,
    ring1,
    ring2,
    groundHorizon
  });
}

/**
 * Запускает 3D «Кузнечный щит-бумеранг» (оружие 'shield' [kin], тяжёлая атака ближнего боя).
 */
function spawnForgeShieldBoomerang(ownerObj, targetX, targetZ, weaponLv, isPlayerOwner = 1) {
  if (!state) return;
  if (!state.boomerangs) state.boomerangs = [];
  if (state.boomerangs.length >= 6) return;

  const angle = Math.atan2(targetZ - ownerObj.z, targetX - ownerObj.x);
  const reachDist = 11.5 + weaponLv * 1.1;

  const group = new THREE.Group();
  group.position.set(ownerObj.x, ownerObj.y + 1.0, ownerObj.z);

  const shieldDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 0.14, 8),
    new THREE.MeshStandardMaterial({
      color: 0x88929e,
      emissive: 0xff6a18,
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.85
    })
  );
  group.add(shieldDisc);

  const rimTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.08, 6, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffb840,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  rimTorus.rotation.x = Math.PI / 2;
  group.add(rimTorus);

  combatDeployablesGroup.add(group);

  state.boomerangs.push({
    ownerObj,
    isPlayerOwner,
    startX: ownerObj.x,
    startZ: ownerObj.z,
    x: ownerObj.x,
    y: ownerObj.y + 1.0,
    z: ownerObj.z,
    dirX: Math.cos(angle),
    dirZ: Math.sin(angle),
    reachDist,
    elapsed: 0,
    totalDuration: 1.15,
    damage: BASE_DAMAGE * (1.15 + 0.28 * (weaponLv - 1)),
    hitIdsOut: new Set(),
    hitIdsBack: new Set(),
    mesh: group
  });
}

/* ---------- 4. Матрица межклассовых стихийных реакций и нанесение урона ---------- */

/**
 * Уведомляет игрока о сработавшей межклассовой стихийной реакции (с защитой от спама тостов).
 */
function announceElementalReaction(reactionKey, customText) {
  if (!state) return;
  if (!state.reactionCounts) {
    state.reactionCounts = { steam: 0, superconduct: 0, slag: 0, collapse: 0 };
  }
  state.reactionCounts[reactionKey] = (state.reactionCounts[reactionKey] || 0) + 1;
  state.lastReactionKey = reactionKey;
  state.lastReactionTimer = 2.8;

  if ((state.reactionToastCooldown || 0) <= 0) {
    state.reactionToastCooldown = 2.2;
    showToast(customText, 2.0);
  }
}

/**
 * Наносит урон врагу и обрабатывает глобальную командную матрицу стихийных реакций:
 * - Пар (Огонь + Лёд): мгновенный AoE-взрыв пара ×2 урона + ослепление мобов (3.5 с)
 * - Сверхпроводимость (Лёд + Молния): дуговой разряд по всем замороженным целям на этаже + снижение защиты на 30%
 * - Детонация шлака (Огонь + Кинетика): выброс 3 мини-луж магмы вокруг горящего врага
 * - Коллапс Пустоты (Стяжка/Замедление + Тяжёлый удар): +50% урона от тяжёлых атак
 */
function damageEnemy(enemy, baseDmg, tags, isFire, isChainHit, options) {
  if (!enemy || enemy.hp <= 0) return;

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

  const tagList = Array.isArray(tags) ? tags : [];
  const opts = options || {};
  const hasFire = !!(isFire || tagList.includes('fire'));
  const hasIce =
    tagList.includes('ice') ||
    (!isChainHit && state.itemsOwned && state.itemsOwned.cryo_core > 0);
  const hasElec = tagList.includes('elec');
  const hasKin = tagList.includes('kin');
  const hasVoid = tagList.includes('void');
  const isHeavyMelee = !!opts.isHeavyMelee;
  const attackerHeroId = opts.attackerHeroId || state.heroId;

  const wasBurning = enemy.burnTimer > 0;
  const wasSlowed = enemy.slowTimer > 0;
  const wasPulled = (enemy.pullTimer || 0) > 0;

  playSound('hit');
  let dmg = baseDmg * calculateDamageMultiplier(tagList, enemy);

  // Личный бонус и командная Метка уязвимости Охотника ('hun')
  if (attackerHeroId === 'hun') {
    dmg *= enemy.type === 'b' || enemy.eliteType ? 1.5 : 0.85;
  }
  if (hasFire && (attackerHeroId === 'ash' || state.heroId === 'ash')) {
    dmg *= 1.15;
  }
  if (enemy.weak) {
    dmg *= 2;
  }
  // Командная Метка Охотника: +25% урона от всей группы по помеченным элитам и боссам
  if ((enemy.hunterMarkTimer || 0) > 0) {
    dmg *= 1.25;
  }
  // Дебафф «Сверхпроводимости»: снижение защиты на 30%
  if ((enemy.armorBreakTimer || 0) > 0) {
    dmg *= 1.3;
  }

  // --- РЕАКЦИЯ 4: КОЛЛАПС ПУСТОТЫ (Стяжка/Замедление + Танковый/Тяжёлый удар ближнего боя) ---
  if (isHeavyMelee && (wasPulled || wasSlowed)) {
    dmg *= 1.5;
    if ((enemy._collapseCd || 0) <= 0) {
      enemy._collapseCd = 1.1;
      const collapseRadius = 4.2 * getPlayerAoeRadiusMultiplier();
      spawnWaveRingEffect(enemy.x, enemy.y + 0.25, enemy.z, collapseRadius, 0xb848ff);
      if (typeof spawnVoidLandingRing === 'function') {
        spawnVoidLandingRing(enemy.x, enemy.y + 0.05, enemy.z);
      }
      // Имплозия стягивает соседних врагов к эпицентру удара
      for (const other of state.enemies) {
        if (other !== enemy && other.hp > 0 && Math.abs(other.y - enemy.y) < 3.5) {
          const dist = hypot2D(other.x - enemy.x, other.z - enemy.z);
          if (dist > 0.4 && dist < collapseRadius) {
            other.x += ((enemy.x - other.x) / dist) * 1.35;
            other.z += ((enemy.z - other.z) / dist) * 1.35;
            other.pullTimer = Math.max(other.pullTimer || 0, 1.4);
          }
        }
      }
      announceElementalReaction(
        'collapse',
        '🌀 Коллапс Пустоты: +50% урона тяжёлым ударом по стянутым врагам!'
      );
    }
  }

  // --- РЕАКЦИЯ 1: ПАР (Огонь Игрока 1 + Лёд Игрока 2) ---
  if (
    !opts.isSteamAoE &&
    ((wasBurning && hasIce) || (wasSlowed && hasFire) || (wasBurning && wasSlowed))
  ) {
    dmg *= 2.0;
    enemy.burnTimer = 0;
    enemy.slowTimer = 0;
    enemy.blindTimer = 3.5;

    const steamRadius = 4.5 * getPlayerAoeRadiusMultiplier();
    spawnWaveRingEffect(enemy.x, enemy.y + 0.2, enemy.z, steamRadius, 0xd8f8ff);
    if (typeof spawnSteamBurstEffect === 'function') {
      spawnSteamBurstEffect(enemy.x, enemy.y, enemy.z);
    }
    spawnSmokePuff(enemy.x, enemy.y + 0.5, enemy.z, 10);

    // Мгновенный AoE-взрыв пара по соседним врагам с ослеплением на 3.5 с
    for (const other of state.enemies) {
      if (other !== enemy && other.hp > 0 && Math.abs(other.y - enemy.y) < 3.6) {
        if (hypot2D(other.x - enemy.x, other.z - enemy.z) <= steamRadius) {
          other.blindTimer = Math.max(other.blindTimer || 0, 3.5);
          damageEnemy(other, baseDmg * 1.15, ['fire', 'ice'], 0, 1, { isSteamAoE: 1 });
        }
      }
    }
    announceElementalReaction(
      'steam',
      '💨 Реакция ПАР (Огонь + Лёд): AoE-взрыв ×2 урона и ослепление мобов!'
    );
  }

  // --- РЕАКЦИЯ 2: СВЕРХПРОВОДИМОСТЬ (Лёд Игрока 1 + Молния Игрока 2) ---
  if (!opts.isSuperconductArc && wasSlowed && hasElec) {
    enemy.armorBreakTimer = 6.0;
    dmg *= 1.3;
    spawnWaveRingEffect(enemy.x, enemy.y + 0.3, enemy.z, 3.4, 0x60f0ff);

    let prevX = enemy.x;
    let prevY = enemy.y + (enemy.radius || 0.8);
    let prevZ = enemy.z;
    let arcHits = 0;

    // Разряд бьёт по ВСЕМ замороженным целям на текущем этаже и снижает их защиту на 30%
    for (const other of state.enemies) {
      if (
        other !== enemy &&
        other.hp > 0 &&
        other.slowTimer > 0 &&
        Math.abs(other.y - enemy.y) < 8.5
      ) {
        other.armorBreakTimer = 6.0;
        const otherY = other.y + (other.radius || 0.8);
        spawnGlobalBolt(prevX, prevY, prevZ, other.x, otherY, other.z, 0.16, 10, 0x60f0ff);
        prevX = other.x;
        prevY = otherY;
        prevZ = other.z;
        damageEnemy(other, baseDmg * 0.65, ['elec'], 0, 1, { isSuperconductArc: 1 });
        arcHits++;
      }
    }
    announceElementalReaction(
      'superconduct',
      '⚡ СВЕРХПРОВОДИМОСТЬ (Лёд + Молния): разряд по замёрзшим (' +
        (arcHits + 1) +
        ' цел.) и −30% защиты!'
    );
  }

  // --- РЕАКЦИЯ 3: ДЕТОНАЦИЯ ШЛАКА (Огонь Игрока 1 + Кинетика Игрока 2) ---
  if (
    wasBurning &&
    hasKin &&
    (!hasFire || opts.canDetonateSlag) &&
    (enemy._slagCd || 0) <= 0
  ) {
    enemy._slagCd = 1.8;
    spawnCombatMagmaPuddles(enemy.x, enemy.y, enemy.z, 3);
    spawnSlagBurst(enemy.x, enemy.y + 0.25, enemy.z, 6, 0.85);
    spawnWaveRingEffect(enemy.x, enemy.y + 0.15, enemy.z, 3.2, 0xff6818);
    announceElementalReaction(
      'slag',
      '🌋 ДЕТОНАЦИЯ ШЛАКА (Огонь + Кинетика): 3 мини-лужи магмы вокруг цели!'
    );
  }

  // Наложение общих для всей команды статусов на врага
  if (hasFire && enemy.burnTimer <= 0 && !opts.isSteamAoE) {
    enemy.burnTimer = 3.2;
  } else if (hasFire && !opts.isSteamAoE) {
    enemy.burnTimer = Math.max(enemy.burnTimer, 3.2);
  }
  if (hasIce && !opts.isSteamAoE) {
    enemy.slowTimer = Math.max(enemy.slowTimer || 0, 3.5);
  }
  if (hasVoid) {
    enemy.pullTimer = Math.max(enemy.pullTimer || 0, 1.8);
  }

  // Командный пассив Охотника ('hun'): вешает Метку уязвимости (+25% урона для всей группы) на элит и боссов
  if (
    (attackerHeroId === 'hun' || state.heroId === 'hun') &&
    (enemy.type === 'b' || enemy.eliteType)
  ) {
    const wasMarked = (enemy.hunterMarkTimer || 0) > 0;
    enemy.hunterMarkTimer = 5.5;
    if (!wasMarked) {
      spawnWaveRingEffect(enemy.x, enemy.y + (enemy.radius || 1.2), enemy.z, 2.4, 0xff3860);
    }
  }

  enemy.hp -= dmg;

  // Цепной разряд Громового пояса (каждый 5-й удар; также запускает Сверхпроводимость по замёрзшим!)
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

    // Если сама цель уже была заморожена, Громовой пояс тоже вызывает Сверхпроводимость!
    if (enemy.slowTimer > 0 && !opts.isSuperconductArc) {
      damageEnemy(enemy, baseDmg * 0.45, ['elec'], 0, 1);
    }

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

function triggerShockwave(x, z, radius, damage, isFire, tags, options) {
  playSound('boom');
  const effectiveRadius = radius * getPlayerAoeRadiusMultiplier();
  const ringColor =
    options && options.ringColor
      ? options.ringColor
      : isFire
        ? 0xff7a20
        : tags && tags.includes('void')
          ? 0xb848ff
          : 0x80e0ff;
  spawnWaveRingEffect(x, state.player.y, z, effectiveRadius, ringColor);
  triggerScreenShake(0.3);

  for (const enemy of state.enemies) {
    const enemyRadius =
      enemy.radius !== undefined ? enemy.radius : ENEMY_TYPES[enemy.type].radius;
    const hitRadius = effectiveRadius + enemyRadius;
    const dx = enemy.x - x;
    const dz = enemy.z - z;
    const verticalWindow = enemyRadius + (enemy.type === 'b' ? 3.5 : 2.2);

    if (
      dx * dx + dz * dz < hitRadius * hitRadius &&
      Math.abs(enemy.y + enemyRadius - state.player.y) < verticalWindow
    ) {
      damageEnemy(enemy, damage, tags, isFire, 0, {
        isHeavyMelee: 1,
        canDetonateSlag: 1,
        ...(options || {})
      });
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
      0.45 * BASE_DAMAGE * state.itemsOwned.coal,
      1,
      ['fire', 'kin'],
      { isHeavyMelee: 1, canDetonateSlag: 1 }
    );
  }
}

function damagePlayer(amount, isLavaDamage) {
  // Если игрок уже находится в состоянии «Угасающего угля», дополнительный урон не наносится
  if (
    state.playerEmber &&
    (state.playerEmber.active || state.playerEmber.lostInLava)
  ) {
    return;
  }
  if (!isLavaDamage) {
    if (state.invulnerabilityTimer > 0) return;
    state.invulnerabilityTimer = 0.4;
    amount *= 1 + 0.035 * state.maxFloorReached;
  } else if (state.itemsOwned && state.itemsOwned.heart) {
    // «Нижний страж» с Лавовым сердцем получает на 40% меньше урона от лавы и магмовых луж
    amount *= Math.pow(0.6, state.itemsOwned.heart);
  }

  // Компромиссная реликвия «Стеклянный горн» (glass): получаемый урон ×2 за стак
  if (state.itemsOwned && state.itemsOwned.glass) {
    amount *= Math.pow(2.0, state.itemsOwned.glass);
  }

  state.timeSinceLastHit = 0;
  state.player.hp -= amount;
  playSound('hurt');
  triggerScreenShake(0.4);
  triggerScreenFlash('radial-gradient(circle, rgba(255,0,0,.4) 0%, transparent 70%)');
}

/**
 * Обновляет все активные боевые объекты Блока 3:
 * Магмовые тотемы-турели, Сферы гравитации, Кузнечные щиты-бумеранги и мини-лужи шлака.
 */
function updateCombatDeployablesStep(dt) {
  if (!state) return;
  const time = state.elapsedTime;
  state.reactionToastCooldown = Math.max(0, (state.reactionToastCooldown || 0) - dt);
  if (state.lastReactionTimer > 0) {
    state.lastReactionTimer -= dt;
  }

  // 1. Обновление командных аур героев вокруг игрока
  state.isWandererAuraActive = isHeroCoopAuraActiveAt(
    'wan',
    state.player.x,
    state.player.y,
    state.player.z,
    12
  )
    ? 1
    : 0;
  state.isPilgrimAuraActive = isHeroCoopAuraActiveAt(
    'pil',
    state.player.x,
    state.player.y,
    state.player.z,
    12
  )
    ? 1
    : 0;
  state.isBlacksmithAuraActive = isHeroCoopAuraActiveAt(
    'smi',
    state.player.x,
    state.player.y,
    state.player.z,
    12
  )
    ? 1
    : 0;

  // 2. Обновление Магмовых тотемов-турелей ('totem')
  if (state.magmaTotems) {
    for (let i = state.magmaTotems.length - 1; i >= 0; i--) {
      const totem = state.magmaTotems[i];
      totem.life -= dt;
      if (totem.life <= 0 || totem.y < state.lavaY) {
        if (totem.mesh) combatDeployablesGroup.remove(totem.mesh);
        state.magmaTotems.splice(i, 1);
        continue;
      }

      totem.coreGem.rotation.y = time * 2.8 + i;
      totem.coreGem.position.y = 1.62 + Math.sin(time * 5 + i) * 0.1;
      totem.ring.rotation.z = -time * 1.8;

      totem.shootCooldown -= dt * getPlayerAttackSpeedMultiplier();
      if (totem.shootCooldown <= 0 && state.enemies.length > 0 && state.projectiles.length < 230) {
        const target = findNearestEnemy(22, totem.x, totem.z);
        totem.shootCooldown = Math.max(0.32, 0.78 / (1 + 0.1 * totem.level));
        if (target) {
          const ang = Math.atan2(target.z - totem.z, target.x - totem.x);
          state.projectiles.push({
            x: totem.x,
            y: totem.y + 1.55,
            z: totem.z,
            vx: Math.cos(ang) * 21,
            vz: Math.sin(ang) * 21,
            lifetime: 1.35,
            damage: BASE_DAMAGE * (0.62 + 0.2 * (totem.level - 1)),
            isFire: 1,
            tags: ['fire'],
            projKind: 'fire'
          });
          spawnSparkBurst(totem.x, totem.y + 1.6, totem.z, 4, 'fire');
        }
      }
    }
  }

  // 3. Обновление Сфер гравитации ('grav' [void, kin])
  if (state.gravitySpheres) {
    for (let i = state.gravitySpheres.length - 1; i >= 0; i--) {
      const gs = state.gravitySpheres[i];
      gs.life -= dt;
      if (gs.life <= 0) {
        spawnWaveRingEffect(gs.x, gs.y, gs.z, gs.pullRadius * 0.85, 0xc458ff);
        if (gs.mesh) combatDeployablesGroup.remove(gs.mesh);
        state.gravitySpheres.splice(i, 1);
        continue;
      }

      // Плавный полёт к точке стяжки
      gs.x += (gs.targetX - gs.x) * Math.min(1, dt * 5.5);
      gs.y += (gs.targetY - gs.y) * Math.min(1, dt * 5.5);
      gs.z += (gs.targetZ - gs.z) * Math.min(1, dt * 5.5);

      gs.mesh.position.set(gs.x, gs.y, gs.z);
      gs.ring1.rotation.y = time * 4.2;
      gs.ring1.rotation.x = time * 2.1;
      gs.ring2.rotation.z = -time * 3.8;
      gs.groundHorizon.rotation.z = time * 1.6;

      // Постоянное стягивание мобов к центру Сферы гравитации
      for (const enemy of state.enemies) {
        if (enemy.hp <= 0 || Math.abs(enemy.y - gs.y) > 4.2) continue;
        const dx = gs.x - enemy.x;
        const dz = gs.z - enemy.z;
        const dist = hypot2D(dx, dz);
        if (dist > 0.35 && dist <= gs.pullRadius) {
          const pullStrength = (enemy.type === 'b' ? 2.2 : 5.6) * dt;
          enemy.x += (dx / dist) * pullStrength;
          enemy.z += (dz / dist) * pullStrength;
          enemy.pullTimer = Math.max(enemy.pullTimer || 0, 1.2);
          enemy.slowTimer = Math.max(enemy.slowTimer || 0, 1.5);
        }
      }

      gs.tickTimer -= dt;
      if (gs.tickTimer <= 0) {
        gs.tickTimer = 0.48;
        for (const enemy of state.enemies) {
          if (
            enemy.hp > 0 &&
            Math.abs(enemy.y - gs.y) <= 4.2 &&
            hypot2D(enemy.x - gs.x, enemy.z - gs.z) <= gs.pullRadius
          ) {
            damageEnemy(
              enemy,
              BASE_DAMAGE * (0.32 + 0.1 * (gs.level - 1)),
              ['void', 'kin'],
              0,
              1
            );
          }
        }
      }
    }
  }

  // 4. Обновление Кузнечных щитов-бумерангов ('shield' [kin], тяжёлый удар)
  if (state.boomerangs) {
    for (let i = state.boomerangs.length - 1; i >= 0; i--) {
      const bm = state.boomerangs[i];
      bm.elapsed += dt;
      const t = bm.elapsed / bm.totalDuration;
      if (t >= 1) {
        if (bm.mesh) combatDeployablesGroup.remove(bm.mesh);
        state.boomerangs.splice(i, 1);
        continue;
      }

      const ownerX = bm.ownerObj ? bm.ownerObj.x : state.player.x;
      const ownerY = bm.ownerObj ? bm.ownerObj.y : state.player.y;
      const ownerZ = bm.ownerObj ? bm.ownerObj.z : state.player.z;
      const peakX = bm.startX + bm.dirX * bm.reachDist;
      const peakZ = bm.startZ + bm.dirZ * bm.reachDist;

      // Первая половина полёта — вперёд к пиковой точке, вторая — возврат к владельцу
      if (t <= 0.5) {
        const k = easeOutCubic(t * 2);
        bm.x = lerp(bm.startX, peakX, k);
        bm.z = lerp(bm.startZ, peakZ, k);
      } else {
        const k = easeInOutQuad((t - 0.5) * 2);
        bm.x = lerp(peakX, ownerX, k);
        bm.z = lerp(peakZ, ownerZ, k);
      }
      bm.y = ownerY + 1.05;

      bm.mesh.position.set(bm.x, bm.y, bm.z);
      bm.mesh.rotation.y += dt * 16;

      const hitSet = t <= 0.5 ? bm.hitIdsOut : bm.hitIdsBack;
      collectNearbyEnemies(bm.x, bm.z, _hitCandidates);
      for (let hi = 0; hi < _hitCandidates.length; hi++) {
        const enemy = _hitCandidates[hi];
        if (!enemy || enemy.hp <= 0 || hitSet.has(enemy)) continue;
        const eRad = enemy.radius !== undefined ? enemy.radius : ENEMY_TYPES[enemy.type].radius;
        if (
          hypot2D(enemy.x - bm.x, enemy.z - bm.z) <= eRad + 1.05 &&
          Math.abs(enemy.y + eRad - bm.y) < eRad + 2.5
        ) {
          hitSet.add(enemy);
          damageEnemy(enemy, bm.damage, ['kin'], 0, 0, {
            isHeavyMelee: 1,
            canDetonateSlag: 1
          });
          spawnSparkBurst(bm.x, bm.y, bm.z, 6, 'land');
        }
      }
    }
  }

  // 5. Обновление мини-луж магмы от «Детонации шлака»
  if (state.combatMagmaPuddles) {
    for (let i = state.combatMagmaPuddles.length - 1; i >= 0; i--) {
      const puddle = state.combatMagmaPuddles[i];
      puddle.life -= dt;
      if (puddle.life <= 0) {
        if (puddle.mesh) combatDeployablesGroup.remove(puddle.mesh);
        state.combatMagmaPuddles.splice(i, 1);
        continue;
      }

      const fade = Math.min(1, puddle.life / 1.2);
      puddle.disc.material.opacity = 0.82 * fade;
      puddle.rim.material.opacity = 0.72 * fade;
      puddle.rim.rotation.z = time * 1.5 + i;

      puddle.tickTimer -= dt;
      if (puddle.tickTimer <= 0) {
        puddle.tickTimer = 0.42;
        for (const enemy of state.enemies) {
          if (
            enemy.hp > 0 &&
            Math.abs(enemy.y - puddle.y) < 2.6 &&
            hypot2D(enemy.x - puddle.x, enemy.z - puddle.z) <= puddle.radius + (enemy.radius || 0.7)
          ) {
            enemy.burnTimer = Math.max(enemy.burnTimer || 0, 3.0);
            damageEnemy(enemy, BASE_DAMAGE * 0.35, ['fire'], 1, 1);
          }
        }
      }
    }
  }
}

/* ---------- 5. Спавн мобов, элит и боссов ---------- */

function releaseAllEnemies() {
  if (!state || !state.enemies) return;
  for (const enemy of state.enemies) {
    if (enemy.hunterMarkMesh && enemy.hunterMarkMesh.parent) {
      enemy.hunterMarkMesh.parent.remove(enemy.hunterMarkMesh);
      enemy.hunterMarkMesh = null;
    }
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
  // Кооперативное масштабирование здоровья под размер группы
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
    pullTimer: 0,
    blindTimer: 0,
    armorBreakTimer: 0,
    hunterMarkTimer: 0,
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
  return enemy;
}

function promoteToElite(enemy, floorIndex, forceElite, silentToast) {
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

  if (!silentToast) {
    const mobName =
      (TOWER_MOB_NAMES[state.towerId] && TOWER_MOB_NAMES[state.towerId][enemy.type]) || '';
    showToast('⚠ Элита: ' + mod.name + (mobName ? ' ' + mobName : ''), 1.8);
    playSound('roar');
  }
}

/* ---------- 6. Выпадение лута и гибель врагов (с командным лечением Пепельника) ---------- */

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

  if (enemy.hunterMarkMesh && enemy.hunterMarkMesh.parent) {
    enemy.hunterMarkMesh.parent.remove(enemy.hunterMarkMesh);
    enemy.hunterMarkMesh = null;
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
    ((enemy.burnTimer > 0 || enemy.armorBreakTimer > 0) && state.itemsOwned.crys
      ? 1 + 0.5 * state.itemsOwned.crys
      : 1);

  state.kills++;

  if (enemy.type === 'b') {
    state.xp += xpValue;
    dropBossLoot(enemy);
    unlockHero('hun');
  } else {
    dropEnemyLoot(enemy, xpValue);
  }

  // Если убит элитный «Хранитель печати» текущего этажа — продвигаем командный мини-квест снятия печати
  if (enemy.isSealGuardian && typeof onSealGuardianKilled === 'function') {
    onSealGuardianKilled(enemy);
  }

  // Если убит целевой элитный моб события «Охота элит» — учитываем групповой прогресс
  if (
    enemy.isHuntTarget &&
    state.activeEvent &&
    state.activeEvent.key === 'hunt'
  ) {
    state.activeEvent.huntKilled = (state.activeEvent.huntKilled || 0) + 1;
    if (state.activeEvent.huntKilled >= (state.activeEvent.huntTotal || 2)) {
      const bonusGold = 6 + state.playerCount * 2;
      state.gold += bonusGold;
      state.player.hp = Math.min(state.maxHp, state.player.hp + state.maxHp * 0.2);
      playSound('win');
      showToast('🏆 Охота элит завершена отрядом! +' + bonusGold + ' золота и +20% HP', 2.8);
      endFloorEvent(1);
    }
  }

  if (enemy.eliteType) {
    unlockHero('ash');
  }

  // Командный пассив Пепельника ('ash'): убийство горящего врага лечит на 2% HP и самого Пепельника, и ближайшего раненого союзника!
  const hasAshenInSquad =
    state.heroId === 'ash' ||
    (state.coopPeers &&
      state.coopPeers.some(
        (p) => p.heroId === 'ash' && (!p.ember || (!p.ember.active && !p.ember.lostInLava))
      ));
  if (hasAshenInSquad && enemy.burnTimer > 0) {
    const isPlayerAlive =
      !state.playerEmber || (!state.playerEmber.active && !state.playerEmber.lostInLava);
    if (isPlayerAlive && state.player.hp < state.maxHp) {
      state.player.hp = Math.min(state.maxHp, state.player.hp + state.maxHp * 0.02);
    }
    // Находим ближайшего раненого союзника в коопе и лечим его на 2% HP + соединяем тёплым лучом пепла
    if (state.coopPeers && state.coopPeers.length > 0) {
      let nearestInjuredPeer = null;
      let bestDist = 1e9;
      for (const peer of state.coopPeers) {
        if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
        if (peer.hp < peer.maxHp) {
          const d = hypot2D(peer.x - state.player.x, peer.z - state.player.z);
          if (d < bestDist) {
            bestDist = d;
            nearestInjuredPeer = peer;
          }
        }
      }
      if (nearestInjuredPeer) {
        nearestInjuredPeer.hp = Math.min(
          nearestInjuredPeer.maxHp,
          nearestInjuredPeer.hp + nearestInjuredPeer.maxHp * 0.02
        );
        spawnGlobalBolt(
          enemy.x,
          enemy.y + 0.6,
          enemy.z,
          nearestInjuredPeer.x,
          nearestInjuredPeer.y + 1.0,
          nearestInjuredPeer.z,
          0.12,
          8,
          0xffaa38
        );
      }
    }
  }

  if (enemy.eliteType === 'volt') {
    state.activeBombs.push({ x: enemy.x, y: enemy.y, z: enemy.z, timer: 1.2, nextRingTimer: 0 });
  }

  if (enemy.type === 'b') {
    state.bossesDefeated++;
    state.lavaY -= 12;
    state.activeBossCount = Math.max(0, (state.activeBossCount || 0) - 1);

    // Возрождаем всех павших игроков/союзников (включая тех, чей «Угасающий уголь» ушёл под лаву!)
    const revivedCount =
      typeof reviveAllFallenEmbersOnBossVictory === 'function'
        ? reviveAllFallenEmbersOnBossVictory()
        : 0;

    if (enemy.gateFloor !== undefined && enemy.gateFloor < GRID_FLOORS - 1) {
      openBossGate(enemy.gateFloor);
      if (typeof forgeHallsByFloor !== 'undefined' && forgeHallsByFloor[enemy.gateFloor]) {
        state.activeForgeHallFloor = enemy.gateFloor;
        state.isLavaPausedByForgeHall = 1;
        showToast(
          '🔓 Печать босса снята!' +
            (revivedCount > 0 ? ' Павшие Угленосцы возрождены! ' : ' ') +
            'Впереди Зал Кузницы — лава на паузе до сбора отряда!',
          4.8
        );
      } else {
        showToast(
          '🔓 Печать босса снята — путь наверх открыт' +
            (revivedCount > 0 ? ' · Павшие возрождены!' : ''),
          3.4
        );
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

/* ---------- 7. События этажей (адаптированные под 2–4 игроков + кооперативные) и переходы актов ---------- */

function startFloorEvent(eventKey) {
  const player = state.player;
  const maxSpawnR = TOWER_FLOOR_RADIUS - 4;
  const evCfg = FLOOR_EVENTS[eventKey] || FLOOR_EVENTS.storm;

  state.isTetherChainActive = 0;
  state.isPolarResonanceActive = 0;
  if (typeof clearCoopEventVisuals === 'function') {
    clearCoopEventVisuals();
  }

  if (eventKey === 'hunt') {
    const huntCount = Math.min(4, Math.max(2, (state.playerCount || 2) + 1));
    let spawnedHunt = 0;
    for (let q = 0; q < huntCount; q++) {
      const anchor =
        q > 0 && state.coopPeers && state.coopPeers[(q - 1) % state.coopPeers.length]
          ? state.coopPeers[(q - 1) % state.coopPeers.length]
          : player;
      for (let attempt = 0; attempt < 10; attempt++) {
        const angle = (q * TWO_PI) / huntCount + attempt * 0.55;
        let x = anchor.x + Math.cos(angle) * 12;
        let z = anchor.z + Math.sin(angle) * 12;
        const radialDist = hypot2D(x, z);
        if (radialDist > maxSpawnR) {
          x *= maxSpawnR / radialDist;
          z *= maxSpawnR / radialDist;
        }
        if (getGroundHeightAt(x, player.lastGroundY, z) < player.lastGroundY - 3) continue;
        const e = spawnEnemy(
          state.maxFloorReached >= 2 && q % 2 === 0 ? 't' : 'l',
          x,
          z,
          1 + state.maxFloorReached * 0.12
        );
        promoteToElite(e, state.maxFloorReached, 1, q > 0);
        e.isHuntTarget = 1;
        spawnedHunt++;
        break;
      }
    }
    state.activeEvent = {
      key: 'hunt',
      timeLeft: evCfg.duration || 20,
      actionTimer: 1.5,
      counter: 0,
      huntTotal: Math.max(1, spawnedHunt),
      huntKilled: 0
    };
    return;
  }

  const poleAngle = seededRandom(state.seed, 'polA', state.maxFloorReached) * TWO_PI;
  const poleRadius = Math.max(14, TOWER_FLOOR_RADIUS * 0.68);

  state.activeEvent = {
    key: eventKey,
    timeLeft: evCfg.duration || 22,
    actionTimer: 0.9,
    counter: 0,
    poleAngle,
    poleAX: Math.cos(poleAngle) * poleRadius,
    poleAZ: Math.sin(poleAngle) * poleRadius,
    poleBX: -Math.cos(poleAngle) * poleRadius,
    poleBZ: -Math.sin(poleAngle) * poleRadius,
    resonancePulseTimer: 2.5
  };

  if (typeof setupCoopEventVisuals === 'function') {
    setupCoopEventVisuals(state.activeEvent);
  }
}

function endFloorEvent(silent) {
  const ev = state.activeEvent;
  const eventKey = ev && ev.key;
  state.activeEvent = null;
  state.isTetherChainActive = 0;
  state.isPolarResonanceActive = 0;
  if (typeof clearCoopEventVisuals === 'function') {
    clearCoopEventVisuals();
  }
  if (silent) return;
  if (eventKey === 'surge') {
    const reward = 5 + (state.playerCount || 2) * 2;
    state.gold += reward;
    showToast('🌊 Прилив отступил: +' + reward + ' золота отряду', 2.2);
  } else if (eventKey === 'chain') {
    state.gold += 6;
    showToast('⛓ Связующая цепь рассеялась: +6 золота за синхронность', 2.0);
  } else if (eventKey === 'polar') {
    state.gold += 8;
    showToast('🧭 Полярный резонанс завершён: +8 золота отряду', 2.0);
  } else {
    showToast('Событие этажа окончено', 1.5);
  }
}

function updateFloorEvent(dt) {
  const ev = state.activeEvent;
  if (!ev) return;
  const player = state.player;
  const maxBombR = TOWER_FLOOR_RADIUS - 1.5;

  if (ev.key === 'storm') {
    ev.actionTimer -= dt;
    if (ev.actionTimer <= 0) {
      ev.actionTimer = Math.max(0.45, 0.85 - (state.playerCount - 1) * 0.1);
      ev.counter++;
      let anchorX = player.x;
      let anchorZ = player.z;
      if (state.coopPeers && state.coopPeers.length > 0 && ev.counter % 2 === 1) {
        const peer = state.coopPeers[ev.counter % state.coopPeers.length];
        if (peer && (!peer.ember || (!peer.ember.active && !peer.ember.lostInLava))) {
          anchorX = peer.x;
          anchorZ = peer.z;
        }
      }
      let x = anchorX + (Math.random() - 0.5) * 18;
      let z = anchorZ + (Math.random() - 0.5) * 18;
      if (ev.counter % 4 === 0) {
        x = anchorX;
        z = anchorZ;
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
      if (ev.counter % 5 === 0) {
        spawnPickup(2, x, player.lastGroundY + 0.7, z, 1);
      }
    }
  } else if (ev.key === 'gold') {
    ev.actionTimer -= dt;
    if (ev.actionTimer <= 0) {
      ev.actionTimer = 3.2;
      ev.counter++;
      const angle = Math.random() * TWO_PI;
      const dist = 4 + Math.random() * 9;
      let gx = player.x + Math.cos(angle) * dist;
      let gz = player.z + Math.sin(angle) * dist;
      const r = hypot2D(gx, gz);
      if (r > maxBombR - 2) {
        gx *= (maxBombR - 2) / r;
        gz *= (maxBombR - 2) / r;
      }
      const gy = getGroundHeightAt(gx, player.lastGroundY + 1, gz);
      if (gy >= player.lastGroundY - 2) {
        spawnPickup(2, gx, gy + 0.75, gz, state.isGreedPactActive ? 2 : 1);
        spawnSparkBurst(gx, gy + 0.4, gz, 10, 'gold');
      }
    }
  } else if (ev.key === 'chain' || ev.key === 'polar') {
    if (typeof updateCoopFloorEventStep === 'function') {
      updateCoopFloorEventStep(ev, dt);
    }
  }
}

function onFloorEnter() {
  const floor = state.maxFloorReached;

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
    message += ' · РАЗВИЛКА: зелёная — тихий сектор, красная — опасный';
  }

  if (
    !isBossFloorIndex(floor) &&
    floor < GRID_FLOORS - 1 &&
    typeof startFloorMiniQuest === 'function'
  ) {
    const questObj =
      state.floorQuest && state.floorQuest.floor === floor
        ? state.floorQuest
        : startFloorMiniQuest(floor);
    if (questObj && FLOOR_MINI_QUESTS[questObj.type]) {
      message += ' · 🔒 Печать: ' + FLOOR_MINI_QUESTS[questObj.type].shortName;
    }
  }

  if (state.activeEvent) {
    endFloorEvent(1);
  }

  if (
    floor >= 1 &&
    !isBossFloorIndex(floor) &&
    floor < GRID_FLOORS - 1 &&
    !state.isLavaPausedByForgeHall &&
    seededRandom(state.seed, 'evp', floor) < 0.68
  ) {
    const roll = seededRandom(state.seed, 'ev', floor);
    let eventKey = FLOOR_EVENT_KEYS[Math.floor(roll * FLOOR_EVENT_KEYS.length)];
    if (state.playerCount >= 2 && seededRandom(state.seed, 'evcoop', floor) < 0.46) {
      eventKey = floor % 2 === 0 ? 'chain' : 'polar';
    }
    startFloorEvent(eventKey);
    message += ' · ⚡ ' + (FLOOR_EVENTS[eventKey].shortName || FLOOR_EVENTS[eventKey].name);
  }

  showToast(
    message,
    actTransitionBanner || FORK_FLOORS.includes(floor) || prevForks.length ? 4.8 : 3.4
  );
}
