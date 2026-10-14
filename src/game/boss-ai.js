/* ==========================================================================
   ИИ, уникальные навыки, опасные зоны и 3D-анимация 9 боссов трёх башен:
   - Пепельная башня ('ash'): Голем Пепельных Врат, Кристальная Матка, Лавовый Колосс
   - Ледяная башня ('ice'): Хранитель Забытых Обрядов, Изувеченная Снежная Пряха, Первозданный Буран
   - Башня Пустоты ('void'): Архитектор Искажения, Пожиратель Фаз, Вестник Коллапса
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

function bossLocalToWorld(boss, lx, ly, lz, outCoords) {
  const cosYaw = Math.cos(boss.facingYaw);
  const sinYaw = Math.sin(boss.facingYaw);
  const scale = boss.bossScale;
  outCoords[0] = boss.x + (lx * cosYaw + lz * sinYaw) * scale;
  outCoords[1] = boss.y + ly * scale;
  outCoords[2] = boss.z + (-lx * sinYaw + lz * cosYaw) * scale;
  return outCoords;
}

function resetBossEffects() {
  for (const ring of bossRings) {
    ring.active = 0;
    ring.mesh.visible = false;
  }
  for (const arc of bossArcs) {
    arc.active = 0;
    arc.mesh.visible = false;
  }
  for (const geyser of bossGeysers) {
    geyser.stage = 0;
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
    ring.mesh.visible = false;
    ring.mesh.material.opacity = 0;
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

function updateBossHazards(dt) {
  const player = state.player;
  const airHeight = player.y - player.lastGroundY;

  for (const ring of bossRings) {
    if (!ring.active) continue;
    ring.radius += ring.speed * dt;
    if (ring.radius > ring.maxRadius) {
      ring.active = 0;
      ring.mesh.visible = false;
      continue;
    }
    if (!ring.hasHit) {
      const dist = hypot2D(player.x - ring.x, player.z - ring.z);
      if (dist < ring.radius + 0.9 && dist > ring.radius - 1.7) {
        ring.hasHit = 1;
        if (ring.damage > 0 && airHeight < 0.55 && Math.abs(player.y - ring.y) < 2.6) {
          damagePlayer(ring.damage);
          if (state.towerId === 'ice') state.chillTimer = Math.max(state.chillTimer, 2.0);
          triggerScreenShake(0.35);
        }
      }
    }
  }

  for (const arc of bossArcs) {
    if (!arc.active) continue;
    arc.radius += 10 * dt;
    if (arc.radius > 17) {
      arc.active = 0;
      arc.mesh.visible = false;
      continue;
    }
    if (!arc.hasHit) {
      const dist = hypot2D(player.x - arc.x, player.z - arc.z);
      if (dist < arc.radius + 0.9 && dist > arc.radius - 1.7) {
        arc.hasHit = 1;
        const bearing = Math.atan2(player.z - arc.z, player.x - arc.x);
        if (Math.abs(angleDiff(bearing, arc.gapAngle)) > 0.95 && Math.abs(player.y - arc.y) < 5) {
          damagePlayer(arc.damage);
          if (state.towerId === 'ice') state.chillTimer = Math.max(state.chillTimer, 2.2);
        }
      }
    }
  }

  for (const geyser of bossGeysers) {
    if (!geyser.stage) continue;
    geyser.timer += dt;
    if (geyser.stage === 1) {
      if (geyser.timer > 0.85) {
        geyser.stage = 2;
        geyser.timer = 0;
        geyser.hasHit = 0;
        geyser.ring.visible = false;
        geyser.jet.visible = true;
        playSound('geyser');
        triggerScreenShake(0.18);
        if (hypot2D(player.x - geyser.x, player.z - geyser.z) < 7) {
          spawnSparkBurst(geyser.x, geyser.y + 0.4, geyser.z, 20, 'land');
        }
      }
    } else {
      if (
        !geyser.hasHit &&
        hypot2D(player.x - geyser.x, player.z - geyser.z) < 1.8 &&
        player.y < geyser.y + 6 &&
        player.y > geyser.y - 1.2
      ) {
        geyser.hasHit = 1;
        damagePlayer(16);
        if (state.towerId === 'ice') state.chillTimer = Math.max(state.chillTimer, 2.0);
        triggerScreenShake(0.3);
      }
      if (geyser.timer > 0.6) {
        geyser.stage = 0;
        geyser.jet.visible = false;
      }
    }
  }
}

/**
 * Вспомогательная функция веерного залпа снарядов босса.
 */
function fireBossProjectileFan(boss, player, count, spreadAngle, speed, damage) {
  if (state.projectiles.length >= 235) return;
  playSound('shoot');
  const baseAngle = Math.atan2(player.z - boss.z, player.x - boss.x);
  for (let i = 0; i < count; i++) {
    const offset = count === 1 ? 0 : (i / (count - 1) - 0.5) * spreadAngle;
    const ang = baseAngle + offset;
    state.projectiles.push({
      x: boss.x,
      y: player.y + 0.85,
      z: boss.z,
      vx: Math.cos(ang) * speed,
      vz: Math.sin(ang) * speed,
      lifetime: 3.8,
      isHostile: 1,
      damage
    });
  }
}

/* ---------- Машины состояний боссов (step) ---------- */

function updateBossAI(boss, dt, player, dx, dz, dist) {
  if (boss.bkind === 'golem') {
    updateGolemBoss(boss, dt, player, dx, dz, dist);
  } else if (boss.bkind === 'womb') {
    updateWombBoss(boss, dt, player, dx, dz, dist);
  } else {
    updateKolossBoss(boss, dt, player, dx, dz, dist);
  }
}

/**
 * СЛОТ 1 (Этаж 4):
 * - 'ash': Голем Пепельных Врат (тяжёлый марш, удар кулаком, в ярости — двойной удар и раскол пола)
 * - 'ice': Хранитель Забытых Обрядов (звон гигантского колокола с кольцами стужи, линия ледяных шпилей от посоха, шаг сквозь метель)
 * - 'void': Архитектор Искажения (голографические чертежи-ловушки вокруг игрока, складка пространства с телепортом и секторным разломом)
 */
function updateGolemBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  const isPhase2 = boss.phase === 2;
  boss.bossTimer += dt;
  boss.facingYaw = Math.atan2(dx, dz);

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
        fireBossProjectileFan(boss, player, 4, Math.PI * 0.85, 11, 10);
      }
      triggerScreenShake(0.4);
      playSound('pound');
    }
  }

  const windupDuration = isPhase2 ? 0.45 : 0.68;
  const slamDuration = isPhase2 ? 0.25 : 0.35;
  const recoverDuration = isPhase2 ? 0.58 : 0.92;

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

    const triggerRange = towerId === 'ash' ? 13.5 : 19.5;
    const cd = isPhase2 ? 1.45 : 2.5;
    if (boss.bossTimer > cd && dist < triggerRange) {
      boss.bossState = 'windup';
      boss.bossTimer = 0;
      boss.attackCount++;

      if (towerId === 'ice') {
        // Хранитель Забытых Обрядов чередует Похоронный Звон колокола и Шпили Покаяния от посоха
        boss.nextAttack = boss.attackCount % 2 === 1 ? 'bellToll' : 'staffLine';
        if (isPhase2 && boss.attackCount % 3 === 0) {
          // Шаг сквозь метель к игроку перед ударом колокола
          const ang = Math.random() * TWO_PI;
          let tx = player.x + Math.cos(ang) * 4.5;
          let tz = player.z + Math.sin(ang) * 4.5;
          const rad = hypot2D(tx, tz);
          if (rad > 24) {
            tx *= 24 / rad;
            tz *= 24 / rad;
          }
          boss.teleportDest = { x: tx, z: tz, timer: 0.35 };
        }
      } else if (towerId === 'void') {
        // Архитектор Искажения чередует Чертежи Аннигиляции и Складку Пространства
        boss.nextAttack = boss.attackCount % 2 === 1 ? 'blueprintGrid' : 'spatialFold';
        if (boss.nextAttack === 'spatialFold') {
          // Оставляет бомбу на старом месте и готовит телепорт к игроку
          state.activeBombs.push({
            x: boss.x,
            y: player.lastGroundY,
            z: boss.z,
            timer: 1.0,
            nextRingTimer: 0,
            radius: 3.8,
            damage: 15
          });
          const ang = Math.atan2(player.z - boss.z, player.x - boss.x) + (Math.random() - 0.5) * 1.4;
          let tx = player.x - Math.cos(ang) * 5.0;
          let tz = player.z - Math.sin(ang) * 5.0;
          const rad = hypot2D(tx, tz);
          if (rad > 24) {
            tx *= 24 / rad;
            tz *= 24 / rad;
          }
          boss.teleportDest = { x: tx, z: tz, timer: 0.42 };
        }
      } else {
        boss.nextAttack = isPhase2 && boss.attackCount % 2 === 0 ? 'pound' : 'fist';
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

      if (towerId === 'ice') {
        // ХРАНИТЕЛЬ ЗАБЫТЫХ ОБРЯДОВ
        if (boss.nextAttack === 'bellToll') {
          // Удар в гигантский Ритуальный Колокол: звуковая ледяная волна + морозные печати вокруг игрока
          spawnBossRing(boss.x, boss.y, boss.z, 16, 11, 18);
          if (isPhase2) {
            boss.pendingRingTimer = 0.28;
            spawnBossArc(boss.x, boss.y, boss.z, boss.facingYaw, 15);
          }
          const sealCount = isPhase2 ? 3 : 2;
          for (let i = 0; i < sealCount; i++) {
            const a = (i / sealCount) * TWO_PI + boss.facingYaw;
            const r = i === 0 ? 0 : 4.2;
            state.activeBombs.push({
              x: player.x + Math.cos(a) * r,
              y: player.lastGroundY,
              z: player.z + Math.sin(a) * r,
              timer: 1.15 + i * 0.2,
              nextRingTimer: 0,
              radius: 3.8,
              damage: 14,
              applyChill: 1
            });
          }
          spawnSparkBurst(boss.x, boss.y + 1.8, boss.z, 26, 'land');
          boss.flare = 1.5;
          boss.shake = 0.22;
          boss.floorFlare = 1;
          playSound('pound');
          triggerScreenShake(0.5);
        } else {
          // Удар Посохом Обряда: линия ледяных шпилей к игроку + веер ледяных снарядов
          const ang = Math.atan2(player.z - boss.z, player.x - boss.x);
          const spikeCount = isPhase2 ? 6 : 4;
          for (let i = 1; i <= spikeCount; i++) {
            state.activeBombs.push({
              x: boss.x + Math.cos(ang) * i * 3.4,
              y: player.lastGroundY,
              z: boss.z + Math.sin(ang) * i * 3.4,
              timer: 0.55 + i * 0.16,
              nextRingTimer: 0,
              radius: 2.6,
              damage: 13,
              applyChill: 1
            });
          }
          fireBossProjectileFan(boss, player, isPhase2 ? 5 : 3, 0.65, 11.5, 10);
          boss.flare = 1.2;
          boss.shake = 0.16;
          playSound('boom');
          triggerScreenShake(0.35);
        }
      } else if (towerId === 'void') {
        // АРХИТЕКТОР ИСКАЖЕНИЯ
        if (boss.nextAttack === 'blueprintGrid') {
          // Проекция геометрического чертежа (треугольник / пентаграмма рунных зон вокруг игрока)
          const vertCount = isPhase2 ? 5 : 3;
          for (let i = 0; i < vertCount; i++) {
            const a = (i / vertCount) * TWO_PI + state.elapsedTime;
            const r = 4.2;
            let bx = player.x + Math.cos(a) * r;
            let bz = player.z + Math.sin(a) * r;
            const rad = hypot2D(bx, bz);
            if (rad > 25) {
              bx *= 25 / rad;
              bz *= 25 / rad;
            }
            state.activeBombs.push({
              x: bx,
              y: player.lastGroundY,
              z: bz,
              timer: 1.05 + i * 0.12,
              nextRingTimer: 0,
              radius: 3.6,
              damage: 15
            });
          }
          fireBossProjectileFan(boss, player, isPhase2 ? 5 : 3, 0.72, 12, 11);
          if (isPhase2 && !state.vortexPull) {
            state.vortexPull = {
              x: player.x,
              z: player.z,
              y: player.lastGroundY,
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
          // Удар посохом после Складки Пространства: секторный луч искажения + ударное кольцо
          spawnBossRing(boss.x, boss.y, boss.z, 16, 10, 16);
          spawnBossArc(boss.x, boss.y, boss.z, boss.facingYaw, 16);
          if (isPhase2) boss.pendingRingTimer = 0.26;
          boss.flare = 1.5;
          boss.shake = 0.2;
          playSound('boom');
          triggerScreenShake(0.45);
        }
      } else {
        // ПЕПЕЛЬНАЯ БАШНЯ — ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ (оригинальные навыки)
        if (boss.nextAttack === 'pound') {
          spawnBossRing(boss.x, boss.y, boss.z, 16, 10, 17);
          if (isPhase2) boss.pendingRingTimer = 0.26;
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
 * СЛОТ 2 (Этаж 8):
 * - 'ash': Кристальная Матка (призыв из рунных кругов под щитом, обстрел сферами и молниями, окно уязвимости ×2)
 * - 'ice': Изувеченная Снежная Пряха (активное движение на паучьих лапах, веер ледяных веретён, секторная паутина и стягивание нитью)
 * - 'void': Пожиратель Фаз (фазовый панцирь, сдвоенные залпы теневых фантомов, фазовый рывок с рассечением косами и воронкой)
 */
function updateWombBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  boss.bossTimer += dt;
  const isPhase2 = boss.phase === 2;
  boss.facingYaw = Math.atan2(dx, dz);

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
  const rechargeDuration = isPhase2 ? 3.8 : 3.4;

  if (boss.bossState === 'spawn') {
    if (boss.bossTimer > 0.9) {
      boss.bossState = 'summon';
      boss.bossTimer = 0;
      boss.summonTimer = 0.4;
      boss.specialSkillTimer = 2.6;
      placeSummonRings(boss);
    }
  } else if (boss.bossState === 'summon') {
    // Призыв миньонов соответствующей башни из 4 кругов
    boss.summonTimer -= dt;
    if (boss.summonTimer <= 0) {
      boss.summonTimer = isPhase2 ? 0.6 : 0.8;
      let summonedMinions = 0;
      for (const other of state.enemies) {
        if (other.fromWomb) summonedMinions++;
      }
      if (summonedMinions < (isPhase2 ? 8 : 6) && state.enemies.length < 200) {
        const ring = summonRings[Math.floor(Math.random() * 4)];
        const minionType = Math.random() < 0.55 ? 's' : 'r';
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

    // Дальние атаки по башням
    boss.orbTimer -= dt;
    if (boss.orbTimer <= 0 && dist < 34 && state.projectiles.length < 240) {
      if (towerId === 'ice') {
        // ИЗУВЕЧЕННАЯ СНЕЖНАЯ ПРЯХА: веер ледяных игл-веретён
        boss.orbTimer = isPhase2 ? 1.25 : 1.75;
        fireBossProjectileFan(boss, player, isPhase2 ? 5 : 3, 0.55, 11.5, 9);
      } else if (towerId === 'void') {
        // ПОЖИРАТЕЛЬ ФАЗ: залпы из двух призрачных Теневых Фантомов по бокам
        boss.orbTimer = isPhase2 ? 1.1 : 1.55;
        fireBossProjectileFan(boss, player, isPhase2 ? 4 : 2, 0.42, 12.5, 10);
      } else {
        // КРИСТАЛЬНАЯ МАТКА: прицельная энергетическая сфера
        boss.orbTimer = isPhase2 ? 1.15 : 1.7;
        fireBossProjectileFan(boss, player, 1, 0, 9.5, 9);
      }
    }

    // Уникальные спецнавыки Пряхи (Ледяная Паутина) и Пожирателя Фаз (Фазовый Рывок и Рассечение)
    if (towerId !== 'ash') {
      boss.specialSkillTimer = (boss.specialSkillTimer === undefined ? 2.8 : boss.specialSkillTimer) - dt;
      if (boss.specialSkillTimer <= 0) {
        boss.specialSkillTimer = isPhase2 ? 3.2 : 4.5;
        const floorY = boss.wombFloorY || boss.y - 3.2;

        if (towerId === 'ice') {
          // Секторная волна морозной паутины + ледяные коконы-ловушки
          spawnBossArc(boss.x, floorY, boss.z, boss.facingYaw, 14);
          for (let i = 0; i < (isPhase2 ? 3 : 2); i++) {
            state.activeBombs.push({
              x: player.x + (Math.random() - 0.5) * 7,
              y: player.lastGroundY,
              z: player.z + (Math.random() - 0.5) * 7,
              timer: 1.25 + i * 0.25,
              nextRingTimer: 0,
              radius: 3.5,
              damage: 12,
              applyChill: 1
            });
          }
          if (isPhase2 && !state.vortexPull) {
            // Натянутая нить паутины подтягивает игрока
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
          // Пожиратель Фаз совершает короткий фазовый скачок ближе к игроку и рассекает пространство серпами!
          if (dist > 7) {
            const stepDist = Math.min(6.5, dist - 5.5);
            boss.x += (dx / dist) * stepDist;
            boss.z += (dz / dist) * stepDist;
            const rad = hypot2D(boss.x, boss.z);
            if (rad > 24) {
              boss.x *= 24 / rad;
              boss.z *= 24 / rad;
            }
          }
          spawnBossArc(boss.x, floorY, boss.z, boss.facingYaw, 16);
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
      playSound('shield');
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
          2.5,
          towerId === 'ice' ? 0x80e8ff : 0xc090ff
        );
      }
    }
  } else if (boss.bossState === 'crack') {
    if (boss.bossTimer > 0.7) {
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

  const ringsActive = boss.bossState === 'summon' || boss.bossState === 'crack';
  if (ringsActive && boss.isMoving) {
    placeSummonRings(boss);
  }
  wombRuneTargetOpacity = ringsActive ? 0.55 : boss.openAmount * 0.18;
  summonRingsTargetOpacity = ringsActive ? 0.55 : 0;
  boss.flare *= Math.exp(-dt * 3);
}

/**
 * СЛОТ 3 (Этаж 12 — Финальные боссы):
 * - 'ash': Лавовый Колосс (удары кулаком, секторные волны, огненные гейзеры, ярость лавы и истощение ×2)
 * - 'ice': Первозданный Буран (ледниковый раскол со шпилями, двойной буран с веером копий, град обломков, око бурана)
 * - 'void': Вестник Коллапса (хватка звёздных рук, разрез горизонта событий, гравитационный коллапс с воронкой и гейзерами антиматерии)
 */
function updateKolossBoss(boss, dt, player, dx, dz, dist) {
  const towerId = state.towerId || 'ash';
  boss.bossTimer += dt;
  const isPhase2 = boss.phase === 2;
  boss.facingYaw = Math.atan2(dx, dz);

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
        const safeDist = dist || 1;
        const spread = (boss.barrageShotsLeft - 1) * 0.14;
        const baseA = Math.atan2(dz, dx) + spread;
        state.projectiles.push({
          x: boss.x,
          y: player.y + 0.85,
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
      if ((isPhase2 || towerId !== 'ash') && boss.barrageTimer <= 0 && dist < 34) {
        boss.barrageShotsLeft = isPhase2 ? 4 : 2;
        boss.barrageShotCooldown = 0;
        boss.barrageTimer = isPhase2 ? 5.2 + Math.random() * 2.5 : 7.0;
      }
    }

    if (boss.bossTimer > idleDuration) {
      boss.attackCount++;
      const roll = Math.random();
      boss.nextAttack = isPhase2
        ? roll < 0.38
          ? 'slam'
          : roll < 0.70
            ? 'sweep'
            : 'geysers'
        : roll < 0.52
          ? 'slam'
          : roll < 0.85
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
        placeGeysersNear(player.x, boss.y, player.z);
        playSound('summon');
        if (towerId === 'void' && !state.vortexPull) {
          // Вестник Коллапса затягивает игрока Чёрной Дырой во время взрыва столбов антиматерии!
          state.vortexPull = {
            x: boss.x,
            z: boss.z,
            y: boss.y,
            timer: 2.0,
            strength: 6.8,
            spawnBombsOnEnd: 1
          };
        } else if (towerId === 'ice') {
          // Первозданный Буран обрушивает ледяные глыбы вокруг игрока
          for (let i = 0; i < (isPhase2 ? 3 : 2); i++) {
            state.activeBombs.push({
              x: player.x + (Math.random() - 0.5) * 9,
              y: player.lastGroundY,
              z: player.z + (Math.random() - 0.5) * 9,
              timer: 1.15 + i * 0.25,
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
        // Первозданный Буран: линия ледяных шпилей от точки удара к игроку
        const ang = Math.atan2(player.z - fistZ, player.x - fistX);
        for (let i = 1; i <= (isPhase2 ? 5 : 3); i++) {
          state.activeBombs.push({
            x: fistX + Math.cos(ang) * i * 3.5,
            y: player.lastGroundY,
            z: fistZ + Math.sin(ang) * i * 3.5,
            timer: 0.5 + i * 0.16,
            nextRingTimer: 0,
            radius: 2.5,
            damage: 13,
            applyChill: 1
          });
        }
      } else if (towerId === 'void') {
        // Вестник Коллапса: Хватка Забвения выпускает кольцо звёздных снарядов
        fireBossProjectileFan(boss, player, isPhase2 ? 5 : 3, 0.9, 12, 12);
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
      spawnBossArc(boss.x, boss.y, boss.z, boss.facingYaw + (Math.random() - 0.5) * 0.7, 20);
      if (towerId === 'ice' || towerId === 'void') {
        fireBossProjectileFan(boss, player, isPhase2 ? 5 : 3, 0.75, 12.5, 11);
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
      if (isPhase2 && boss.combo >= 2) {
        boss.bossState = 'exhaust';
        boss.bossTimer = 0;
        boss.combo = 0;
      } else {
        boss.bossState = 'idle';
        boss.bossTimer = 0;
      }
    }
  } else if (boss.bossState === 'exhaust') {
    boss.isMoving = 0;
    if (boss.bossTimer > 2.4) {
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

  if (boss.isFury && boss.bossState !== 'roar') {
    boss.ventTimer -= dt;
    if (boss.ventTimer <= 0) {
      boss.ventTimer = 1.8 + Math.random() * 1.6;
      const ventIdx = Math.floor(Math.random() * 5);
      boss.ventFlares[ventIdx] = 1;
      if (dist < 45) {
        const ventPos = KOLOSS_VENTS[ventIdx];
        bossLocalToWorld(boss, ventPos[0], ventPos[1], ventPos[2], _bossWorldCoords);
        spawnSparkBurst(_bossWorldCoords[0], _bossWorldCoords[1], _bossWorldCoords[2], 16, 'takeoff');
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    boss.ventFlares[i] *= Math.exp(-dt * 3.5);
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

/* ---------- Визуал и анимация поз боссов (render) ---------- */

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
      // Архитектор Искажения плавно парит над вихрем ступеней
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
      // Хранитель высоко вздымает левую руку с Ритуальным Колоколом!
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

  // Анимация Ритуального Колокола Хранителя Забытых Обрядов
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

  // Анимация голографических чертежей и ступеней Архитектора Искажения
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
    // Пряха и Пожиратель Фаз поворачиваются лицом к игроку
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

  // Анимация 6 паучьих лап Изувеченной Снежной Пряхи
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

  // Анимация 6 серповидных богомольих лап и 2 Теневых Фантомов Пожирателя Фаз
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
  ud.shieldWire.rotation.y = time * 0.3;
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
  } else if (boss.bossState === 'geysers') {
    const tremor = Math.sin(time * 30) * 0.04;
    armRx = armLx = -1.9 + tremor;
    armRz = 0.7;
    armLz = -0.7;
    headX = -0.35;
    jaw = 0.55;
    hipsY = KOLOSS_COLUMN_HEIGHT + 0.1;
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

  // Специфическая анимация Замёрзшего Сердца Бурана и Аккреционного Диска Вестника Коллапса
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
    boss.bossState === 'exhaust' ? Math.sin(Math.min(1, bt / 2.4) * Math.PI) : 0;
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
  }

  // Вращение включений / обломков башен в вихре
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
