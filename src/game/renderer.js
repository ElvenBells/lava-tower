/* ==========================================================================
   Отрисовка игрового кадра:
   анимация героя «Угленосец», положение камеры, LOD-анимация 12 типов мобов
   и 9 боссов, обновление 3D-буферов оружия, снарядов, лута, частиц и HUD
   ========================================================================== */

var DOM_CACHE = {
  healthBar: getById('hb'),
  xpBar: getById('xb'),
  statsText: getById('st'),
  bossBarFill: getById('bossBarFill'),
  bossHpText: getById('bossHpText'),
  bossHpContainer: getById('bossHp')
};

const _projectileDummyObj = new BABYLON.Object3D();
const _tempVec3 = new BABYLON.Vector3();
const _tempQuatA = new BABYLON.Quaternion();
const _tempQuatB = new BABYLON.Quaternion();
const _tempEuler = new BABYLON.Euler();

const _leaperPose = {
  hipY: 0,
  lean: 0,
  legB: 0,
  shin: 0,
  foot: 0,
  legF: 0,
  foreF: 0,
  tail: 0,
  headX: 0,
  jaw: 0.12
};

const LOD_DISTANCE = 32;

var lastBossWidthText = '';
var lastBossHpText = '';
var lastBossNameText = '';
var lastBossShownState = 0;

/**
 * Отрисовывает один кадр активного забега.
 * @param {number} dt шаг времени кадра (с)
 */
function renderGameFrame(dt) {
  const player = state.player;
  const time = state.elapsedTime;

  // Позиция, поворот и процедурная анимация героя «Угленосец» (бег, прыжки, двойной прыжок, подкат)
  playerMesh.position.set(player.x, player.y, player.z);
  playerMesh.rotation.y = state.facingAngle;
  playerMesh.scale.set(1, 1, 1);
  playerMesh.visible = state.invulnerabilityTimer > 0 ? ((time * 24) | 0) % 2 === 0 : true;
  if (typeof updatePlayerAnimation === 'function') {
    updatePlayerAnimation(dt);
  }

  lavaMesh.position.y = state.lavaY;
  if (typeof updateEnvironmentVisuals === 'function') {
    updateEnvironmentVisuals(time, dt);
  }
  lavaLight.position.set(player.x * 0.3, Math.max(state.lavaY, player.y - 6) + 2, player.z * 0.3);
  rimLight.position.set(
    player.x - Math.sin(state.cameraYaw) * 3,
    player.y + 2,
    player.z - Math.cos(state.cameraYaw) * 3
  );

  // Камера с защитой от выхода за стены башни и тряской экрана
  const cosPitch = Math.cos(state.cameraPitch);
  let camX = player.x + Math.sin(state.cameraYaw) * cosPitch * 6;
  let camZ = player.z + Math.cos(state.cameraYaw) * cosPitch * 6;
  const camRadial = hypot2D(camX, camZ);
  if (camRadial > 29.6) {
    camX *= 29.6 / camRadial;
    camZ *= 29.6 / camRadial;
  }
  camera.position.set(camX, player.y + 1 + Math.sin(state.cameraPitch) * 6, camZ);

  if (state.screenShake > 0) {
    camera.position.x += Math.sin(time * 30) * state.screenShake * 0.3;
    camera.position.y += Math.cos(time * 30) * state.screenShake * 0.2;
    state.screenShake *= 0.9;
  }
  camera.lookAt(player.x, player.y + 1, player.z);

  // Отрисовка и анимация всех активных врагов
  let activeEliteMarkers = 0;

  for (let ei = 0; ei < state.enemies.length; ei++) {
    const enemy = state.enemies[ei];
    const baseStats = ENEMY_TYPES[enemy.type];
    if (!enemy.mesh) continue;

    const ud = enemy.mesh.userData;
    const dx = player.x - enemy.x;
    const dz = player.z - enemy.z;
    const dist2D = Math.sqrt(dx * dx + dz * dz) || 1;
    const dy = player.y - enemy.y;
    const dist3D = Math.sqrt(dx * dx + dz * dz + dy * dy);

    const newTintState = enemy.burnTimer > 0 ? 2 : enemy.slowTimer > 0 ? 1 : 0;
    if (newTintState !== enemy.tintState) {
      enemy.tintState = newTintState;
      ud.tintState = newTintState;
      applyStatusTint(ud.tintMats, newTintState);
    }

    const lodTier = dist3D > LOD_DISTANCE ? 1 : 0;
    if (lodTier !== enemy.lodTier) {
      enemy.lodTier = lodTier;
      for (const lodObj of ud.lodObjs) {
        lodObj.visible = !lodTier;
      }
    }

    if (enemy.type === 'b') {
      if (enemy.bolts && enemy.bolts.length) {
        updateBoltList(enemy.bolts, dt);
      }
      if (enemy.bkind === 'golem') {
        renderGolemBoss(enemy, ud, dt);
      } else if (enemy.bkind === 'womb') {
        renderWombBoss(enemy, ud, dt, lodTier);
      } else {
        renderKolossBoss(enemy, ud, dt);
      }
    } else if (enemy.type === 's') {
      const hasWings = !!(ud.wingL && ud.wingR);
      const hoverBoost = hasWings ? 0.36 + Math.sin(time * 6.5 + enemy.x) * 0.14 : 0;
      enemy.mesh.position.set(enemy.x, enemy.y + baseStats.radius + hoverBoost, enemy.z);
      enemy.mesh.scale.set(
        baseStats.scale * (enemy.scaleXZ || 1),
        baseStats.scale * (enemy.scaleY || 1),
        baseStats.scale * (enemy.scaleXZ || 1)
      );
      if (hasWings) {
        enemy.mesh.rotation.y = Math.atan2(dx, dz);
        const flap = Math.sin(time * 24 + enemy.x * 2) * 0.55;
        ud.wingL.rotation.y = flap;
        ud.wingR.rotation.y = -flap;
      } else {
        enemy.mesh.rotation.y = time * 0.3 + enemy.x * 0.5;
      }
      ud.core.rotation.y = -time * 0.25;
      if (ud.flameCrown) {
        ud.flameCrown.rotation.y = time * 2.5;
        ud.flameCrown.scale.y = 0.88 + Math.sin(time * 14 + enemy.x) * 0.22;
      }

      if (lodTier === 0) {
        ud.chunks.scale.setScalar(1 + Math.sin(time * 1.8 + ud.chunksPhase) * 0.02);
        ud.burg.scale.copy(ud.chunks.scale);

        if (!enemy.eyeFlickerTimer) enemy.eyeFlickerTimer = 0;
        if (!enemy.eyeFlicker) enemy.eyeFlicker = 1;
        enemy.eyeFlickerTimer -= dt;
        if (enemy.eyeFlickerTimer <= 0) {
          enemy.eyeFlicker = Math.random() < 0.12 ? 0.35 : 0.9 + Math.random() * 0.1;
          enemy.eyeFlickerTimer = 0.05 + Math.random() * 0.25;
        }
        ud.eyeMatO.color.copy(ud.eyeBaseO).multiplyScalar(enemy.eyeFlicker);
        ud.eyeMatI.color.copy(ud.eyeBaseI).multiplyScalar(enemy.eyeFlicker);
        ud.haloMat.opacity = 0.45 + 0.45 * enemy.eyeFlicker;

        for (const piece of ud.debris) {
          const pieceData = piece.userData;
          pieceData.angle += dt * pieceData.speed;
          piece.position.set(
            Math.cos(pieceData.angle) * pieceData.radius,
            pieceData.height + Math.sin(time * 1.5 + pieceData.angle) * 0.2,
            Math.sin(pieceData.angle) * pieceData.radius
          );
          piece.rotation.x += dt;
          piece.rotation.y += dt * 0.7;
        }
      } else {
        enemy.eyeFlickerTimer = 0.1;
      }
    } else if (enemy.type === 'r') {
      enemy.mesh.position.set(enemy.x, enemy.y + baseStats.radius, enemy.z);
      _tempVec3.set(dz / dist2D, 0, -dx / dist2D);
      _tempQuatA.setFromAxisAngle(_tempVec3, Math.PI / 2);
      _tempEuler.set(
        Math.sin(time * 0.7 + enemy.x) * 0.05,
        time * (ud.towerId === 'ice' ? 0.85 : 0.35),
        Math.cos(time * 0.9 + enemy.z) * 0.06
      );
      _tempQuatB.setFromEuler(_tempEuler);
      enemy.mesh.quaternion.copy(_tempQuatA).multiply(_tempQuatB);

      const surge = enemy.surgeLevel || 0;
      const pulse = 1 + Math.sin(time * 4.2) * 0.08 + surge * 0.35;
      ud.core.scale.setScalar(pulse);
      ud.core.rotation.y = -time * 0.8;
      ud.glow.material.opacity = Math.min(
        1,
        0.32 + surge * 0.3 + (enemy.flashIntensity || 0) * 0.02
      );
      ud.glow.scale.setScalar(2.8 + surge * 0.8 + (enemy.flashIntensity || 0) * 0.08);

      ud.shellMat.opacity = enemy.shield ? 0.18 : ud.towerId === 'ice' ? 0.68 : 0.56;
      if (!enemy.tintState) {
        ud.shellMat.emissiveIntensity = 0.65 + surge * 0.7;
      }
      ud.edgesMat.opacity = 0.45 + surge * 0.35 + Math.sin(time * 6) * 0.1;

      if (ud.phaseRings && ud.phaseRings.length) {
        ud.phaseRings[0].rotation.z += dt * 1.8;
        ud.phaseRings[1].rotation.x -= dt * 1.4;
      }

      if (lodTier === 0) {
        const posAttr = ud.stGeo.attributes.position;
        const colAttr = ud.stGeo.attributes.color;
        const stData = ud.stData;

        for (let i = 0; i < stData.length; i++) {
          const sd = stData[i];
          sd.theta += dt * sd.swirlSpeed * (1.4 - sd.radius) * (1 + 1.2 * surge);
          sd.y += Math.sin(time * sd.freqY + sd.phase) * dt * 0.35;
          if (sd.y > 1.05) sd.y = 1.05;
          if (sd.y < -1.05) sd.y = -1.05;

          const maxR = 0.6 * (1 - Math.abs(sd.y) / 1.45);
          sd.radius += Math.sin(time * 1.3 + sd.phase) * dt * 0.06;
          if (sd.radius > maxR) sd.radius = maxR;
          if (sd.radius < 0.05) sd.radius = 0.05;

          posAttr.array[i * 3] = Math.cos(sd.theta) * sd.radius;
          posAttr.array[i * 3 + 1] = sd.y;
          posAttr.array[i * 3 + 2] = Math.sin(sd.theta) * sd.radius;

          const brightness = 0.65 + 0.35 * Math.sin(time * 3 + sd.phase) + surge * 0.4;
          colAttr.array[i * 3] = Math.min(1, sd.color.r * brightness);
          colAttr.array[i * 3 + 1] = Math.min(1, sd.color.g * brightness);
          colAttr.array[i * 3 + 2] = Math.min(1, sd.color.b * brightness);
        }
        posAttr.needsUpdate = colAttr.needsUpdate = true;

        for (const shard of ud.shards) {
          const shardData = shard.userData;
          shardData.angle += dt * shardData.speed;
          shard.position.set(
            Math.cos(shardData.angle) * shardData.radius,
            Math.sin(shardData.angle * 0.7 + shardData.phase) * 0.6,
            Math.sin(shardData.angle) * shardData.radius
          );
          shard.rotation.x += dt * 1.4;
          shard.rotation.y += dt;
        }
      }
      if (enemy.bolts && enemy.bolts.length) {
        updateBoltList(enemy.bolts, dt);
      }
    } else if (enemy.type === 'l') {
      enemy.mesh.position.set(enemy.x, enemy.y + baseStats.radius - 0.98 * 0.7, enemy.z);
      enemy.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;

      if (lodTier === 0) {
        const breath = Math.sin(time * 2.6);
        const P = _leaperPose;
        P.hipY = 0.98;
        P.lean = 0.06;
        P.legB = -0.95;
        P.shin = 1.9;
        P.foot = -0.95;
        P.legF = -0.25;
        P.foreF = 0.55;
        P.tail = 0;
        P.headX = 0;
        P.jaw = enemy.jawAngle || 0.12;

        if (enemy.jumpState === 'idle') {
          P.hipY += breath * 0.015;
          P.lean += breath * 0.01;
          P.tail = Math.sin(time * 2.1) * 0.1;
        } else if (enemy.jumpState === 'crouch') {
          const k = easeInOutQuad(Math.min(1, enemy.jumpTimer / 0.28));
          P.hipY = lerp(0.98, 0.72, k);
          P.lean = lerp(0.06, 0.26, k);
          P.legB = lerp(-0.95, -1.32, k);
          P.shin = lerp(1.9, 2.4, k);
          P.foot = lerp(-0.95, -1.08, k);
          P.legF = lerp(-0.25, -0.6, k);
          P.foreF = lerp(0.55, 0.9, k);
          P.tail = lerp(0, -0.75, k);
          P.headX = lerp(0, 0.18, k);
        } else if (enemy.jumpState === 'air') {
          const k = smoothStep(
            Math.max(0, Math.min(1, 0.5 - enemy.jumpVelocityY / ENEMY_TYPES.l.jumpVelocity))
          );
          P.lean = lerp(-0.24, 0.1, k);
          P.legB = lerp(-0.55, -1.5, k);
          P.shin = lerp(1.2, 2.5, k);
          P.foot = lerp(-0.4, -1.0, k);
          P.legF = lerp(-1.15, -1.35, k);
          P.foreF = lerp(0.3, 0.5, k);
          P.tail = lerp(-0.95, -0.5, k);
          P.headX = -0.18;
        } else if (enemy.jumpState === 'land') {
          const k =
            enemy.jumpTimer < 0.16
              ? easeInOutQuad(enemy.jumpTimer / 0.16)
              : 1 - easeInOutQuad((enemy.jumpTimer - 0.16) / 0.34);
          P.hipY = lerp(0.98, 0.66, k);
          P.lean = lerp(0.06, 0.32, k);
          P.legB = lerp(-0.95, -1.38, k);
          P.shin = lerp(1.9, 2.45, k);
          P.foot = lerp(-0.95, -1.07, k);
          P.legF = lerp(-0.25, -0.95, k);
          P.foreF = lerp(0.55, 1.15, k);
          P.tail = lerp(0, 0.55, k);
          P.headX = lerp(0, 0.26, k);
        }

        ud.hips.position.y = P.hipY - 0.98;
        ud.hips.rotation.x = P.lean;
        ud.legBL.g.rotation.x = P.legB;
        ud.legBR.g.rotation.x = P.legB;
        ud.legBL.shin.rotation.x = P.shin;
        ud.legBR.shin.rotation.x = P.shin;
        ud.legBL.foot.rotation.x = P.foot;
        ud.legBR.foot.rotation.x = P.foot;
        ud.legFL.g.rotation.x = P.legF;
        ud.legFR.g.rotation.x = P.legF;
        ud.legFL.fore.rotation.x = P.foreF;
        ud.legFR.fore.rotation.x = P.foreF;

        for (let i = 0; i < ud.tailSegs.length; i++) {
          ud.tailSegs[i].rotation.x =
            P.tail * (1 - i * 0.15) + Math.sin(time * 2.1 + i * 0.7) * 0.08;
        }

        const targetYaw = Math.max(-0.7, Math.min(0.7, Math.atan2(dx, dz)));
        ud.headYaw += (targetYaw - ud.headYaw) * Math.min(1, dt * 5);
        ud.head.rotation.y = ud.headYaw;
        ud.head.rotation.x = P.headX - P.lean * 0.55;

        enemy.jawTimer -= dt;
        if (enemy.jawTimer <= 0 && enemy.jumpState === 'idle') {
          enemy.jawAngle = 0.5;
          enemy.jawTimer = 2 + Math.random() * 3;
          ud.flare = Math.max(ud.flare, 0.5);
        }
        enemy.jawAngle +=
          ((enemy.jumpState === 'idle' ? 0.12 : enemy.jawAngle || 0.12) -
            (enemy.jawAngle || 0.12)) *
          Math.min(1, dt * 6);
        ud.jaw.rotation.x = enemy.jawAngle || 0.12;

        ud.flare *= Math.exp(-dt * 3.5);
        const coalBrightness =
          0.85 +
          Math.sin(time * 9) * 0.08 +
          (Math.sin(time * 37) > 0.96 ? -0.4 : 0) +
          ud.flare * 0.9;
        ud.eyeMat.color.copy(ud.eyeBase).multiplyScalar(coalBrightness);
        ud.haloMat.opacity = Math.min(1, 0.45 + 0.4 * coalBrightness);
        ud.glow.material.opacity = Math.min(1, 0.28 + 0.14 * coalBrightness + ud.flare * 0.25);

        ud.shake *= Math.exp(-dt * 9);
        enemy.mesh.position.x += (Math.random() - 0.5) * ud.shake;
        enemy.mesh.position.z += (Math.random() - 0.5) * ud.shake;
      }
    } else if (enemy.type === 't') {
      enemy.mesh.position.set(enemy.x, enemy.y + 0.02, enemy.z);
      enemy.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;

      if (lodTier === 0 || dist2D < 45) {
        const walkPhase = time * baseStats.speed * 2.5;
        const legSwing = Math.sin(walkPhase) * 0.25;
        ud.legR.rotation.x = legSwing;
        ud.legL.rotation.x = -legSwing;

        const breath = Math.sin(time * 1.1);
        ud.torso.scale.setScalar(1 + breath * 0.012);
        ud.hips.position.y = 1.5 + breath * 0.02;

        ud.atkTimer -= dt;
        ud.atkT += dt;

        if (ud.atkState === 'idle' && ud.atkTimer <= 0 && dist2D < 12) {
          ud.atkState = 'windup';
          ud.atkT = 0;
          ud.flare = Math.max(ud.flare, 0.45);
        } else if (ud.atkState === 'windup' && ud.atkT > 0.55) {
          ud.atkState = 'slam';
          ud.atkT = 0;
          ud.impacted = false;
        } else if (ud.atkState === 'slam') {
          if (!ud.impacted && ud.atkT > 0.12) {
            ud.impacted = true;
            if (dist2D < 4.5 && Math.abs(player.y - enemy.y) < 3) {
              damagePlayer(17 * (enemy.damageMultiplier || 1));
              if (state.towerId === 'ice') {
                state.chillTimer = Math.max(state.chillTimer, 2.2);
              }
            }
            if (state.towerId === 'void' && dist2D < 9 && !state.vortexPull) {
              state.vortexPull = {
                x: enemy.x,
                z: enemy.z,
                y: enemy.y,
                timer: 0.9,
                strength: 4.8,
                spawnRingOnEnd: 0
              };
            }
            spawnFireLandingRing(enemy.x, enemy.y + 0.05, enemy.z);
            triggerScreenShake(0.35);
            ud.flare = 1;
            ud.shake = 0.15;
          }
          if (ud.atkT > 0.22) {
            ud.atkState = 'recover';
            ud.atkT = 0;
          }
        } else if (ud.atkState === 'recover' && ud.atkT > 0.7) {
          ud.atkState = 'idle';
          ud.atkT = 0;
          ud.atkTimer = 2.5 + Math.random() * 2;
        }

        let armRp = -0.08;
        let armLp = -0.08;
        let armRz = 0.06;
        const armLz = -0.06;
        let lean = 0.12;
        let headX = 0.16;
        let headY = Math.sin(time * 0.5) * 0.04;

        const doubleSlam = ud.towerId === 'ice' && enemy.hp <= enemy.maxHp * 0.5;

        if (ud.atkState === 'windup') {
          const k = easeInOutQuad(Math.min(1, ud.atkT / 0.55));
          armRp = lerp(armRp, -2.5, k);
          armLp = lerp(armLp, doubleSlam ? -2.5 : -0.5, k);
          armRz = lerp(armRz, 0.25, k);
          lean = lerp(lean, -0.14, k);
          headX = lerp(headX, 0.02, k);
          headY = lerp(headY, 0, k);
        } else if (ud.atkState === 'slam') {
          const k = Math.min(1, ud.atkT / 0.22);
          const ee = k * k;
          armRp = lerp(-2.5, -0.55, ee);
          armLp = lerp(doubleSlam ? -2.5 : -0.5, doubleSlam ? -0.55 : -0.9, ee);
          armRz = lerp(0.25, 0.1, ee);
          lean = lerp(-0.14, 0.42, ee);
          headX = lerp(0.02, 0.42, ee);
          headY = 0;
        } else if (ud.atkState === 'recover') {
          const k = easeInOutQuad(Math.min(1, ud.atkT / 0.7));
          armRp = lerp(-0.55, -0.08, k);
          armLp = lerp(doubleSlam ? -0.55 : -0.9, -0.08, k);
          lean = lerp(0.42, 0.12, k);
          headX = lerp(0.42, 0.16, k);
        }

        ud.torso.rotation.x = lean + breath * 0.015;
        ud.head.rotation.x = headX;
        ud.head.rotation.y = headY;
        ud.armR.g.rotation.x = armRp + Math.sin(time * 1.3) * 0.02;
        ud.armL.g.rotation.x = armLp + Math.sin(time * 1.3 + 3) * 0.02;
        ud.armR.g.rotation.z = armRz;
        ud.armL.g.rotation.z = armLz;

        ud.shake *= Math.exp(-dt * 8);
        enemy.mesh.position.x += (Math.random() - 0.5) * ud.shake;
        enemy.mesh.position.z += (Math.random() - 0.5) * ud.shake;

        ud.flare *= Math.exp(-dt * 3.5);
        ud.coalT -= dt;
        if (ud.coalT <= 0) {
          ud.coal = 0.8 + Math.random() * 0.25 + (Math.random() < 0.1 ? -0.45 : 0);
          ud.coalT = 0.06 + Math.random() * 0.2;
        }
        const coalBrightness = ud.coal + ud.flare * 0.9;
        ud.eyeMat.color.copy(ud.eyeBase).multiplyScalar(coalBrightness);
        ud.haloMat.opacity = Math.min(1, 0.45 + 0.4 * coalBrightness);
        for (const halo of ud.eyeHalos) {
          halo.scale.setScalar(0.6 + ud.flare * 0.25);
        }

        const crackOpacity = 0.5 + Math.sin(time * 1.7) * 0.12 + ud.flare * 0.45;
        for (const mat of ud.crackMats) {
          mat.opacity = Math.min(1, crackOpacity);
        }
      }
    }

    if (enemy.type !== 'b') {
      const eliteScale = enemy.eliteScale || 1;
      if (enemy.type !== 's') {
        if (!ud.baseScaleVec) ud.baseScaleVec = enemy.mesh.scale.clone();
        if (eliteScale !== ud.appliedEliteScale) {
          ud.appliedEliteScale = eliteScale;
          enemy.mesh.scale.copy(ud.baseScaleVec).multiplyScalar(eliteScale);
        }
      } else if (eliteScale !== 1) {
        enemy.mesh.scale.multiplyScalar(eliteScale);
        enemy.mesh.position.y += (eliteScale - 1) * baseStats.scale;
      }

      if (enemy.eliteType && activeEliteMarkers < eliteMarkerSprites.length) {
        const marker = eliteMarkerSprites[activeEliteMarkers++];
        marker.visible = true;
        marker.material = ELITE_MARKER_MATERIALS[enemy.eliteType];
        marker.position.set(
          enemy.x,
          enemy.y + baseStats.radius * 2 * eliteScale + 1.4,
          enemy.z
        );
        marker.material.rotation = time * 1.2;
        marker.scale.setScalar(2.15 + Math.sin(time * 6.5 + ei) * 0.32);
      }
    }
  }

  for (let q = activeEliteMarkers; q < eliteMarkerSprites.length; q++) {
    eliteMarkerSprites[q].visible = false;
  }

  // Детализированные 3D-модели лута по мудборду 8:
  // Кристаллы опыта (октаэдр + кометный след при притяжении), Кристалл здоровья (пульсирует как сердце),
  // Золотая монета (октаэдр с быстрым вращением и вихрем)
  let xpPickupCount = 0;
  let healPickupCount = 0;
  let goldPickupCount = 0;
  for (let i = 0; i < state.pickups.length; i++) {
    const pk = state.pickups[i];
    const bobY = pk.y + Math.sin(time * 3.2 + pk.phase) * 0.14;
    _pickupDummyObj.position.set(pk.x, bobY, pk.z);

    if (pk.type === 0 && xpPickupCount < MAX_PICKUPS) {
      const size = pk.value >= 5 ? 1.42 : 0.88 + Math.min(0.42, pk.value * 0.08);
      if (pk.isMagnetized) {
        // При полёте к герою кристалл наклоняется вперёд и оставляет бирюзовый шлейф искр (кадр 2 мудборда 8)
        const toHeroYaw = Math.atan2(player.x - pk.x, player.z - pk.z);
        _pickupDummyObj.rotation.set(0.45, toHeroYaw, time * 8);
        if (Math.random() < 0.35) {
          spawnSparkBurst(pk.x, pk.y, pk.z, 1, 'xp');
        }
      } else {
        _pickupDummyObj.rotation.set(Math.sin(time * 2.2 + pk.phase) * 0.12, time * 2.2 + pk.phase, 0);
      }
      _pickupDummyObj.scale.setScalar(size);
      _pickupDummyObj.updateMatrix();
      pickupInstancedMesh.setMatrixAt(xpPickupCount, _pickupDummyObj.matrix);
      pickupInstancedMesh.setColorAt(xpPickupCount, PICKUP_COLORS[pk.value >= 5 ? 3 : 0]);
      xpPickupCount++;
    } else if (pk.type === 1 && healPickupCount < 120) {
      // Пульсация рубинового кристалла «как сердце» (кадр 4 мудборда 8)
      const heartBeat = Math.pow(Math.max(0, Math.sin(time * 5.5 + pk.phase)), 3);
      const pulse = 1.12 + heartBeat * 0.24;
      _pickupDummyObj.rotation.set(0, time * 1.4 + pk.phase, 0);
      _pickupDummyObj.scale.setScalar(pulse);
      _pickupDummyObj.updateMatrix();
      healPickupInstancedMesh.setMatrixAt(healPickupCount++, _pickupDummyObj.matrix);
    } else if (pk.type === 2 && goldPickupCount < 200) {
      // Быстрое вращение золотого октаэдра (кадр 6 мудборда 8)
      _pickupDummyObj.rotation.set(0.14 * Math.sin(time * 4 + pk.phase), time * 6.8 + pk.phase, 0);
      _pickupDummyObj.scale.setScalar(0.98);
      _pickupDummyObj.updateMatrix();
      goldPickupInstancedMesh.setMatrixAt(goldPickupCount++, _pickupDummyObj.matrix);
    }
  }
  pickupInstancedMesh.count = xpPickupCount;
  pickupInstancedMesh.instanceMatrix.needsUpdate = true;
  if (pickupInstancedMesh.instanceColor) {
    pickupInstancedMesh.instanceColor.needsUpdate = true;
  }
  healPickupInstancedMesh.count = healPickupCount;
  if (healPickupCount) healPickupInstancedMesh.instanceMatrix.needsUpdate = true;
  goldPickupInstancedMesh.count = goldPickupCount;
  if (goldPickupCount) goldPickupInstancedMesh.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < chests.length; i++) {
    const chest = chests[i];
    if (!chest.isOpen) {
      chest.group.rotation.y = time * 0.65;
      chest.group.position.y = chest.y + 0.68 + Math.sin(time * 2.2 + i) * 0.07;
    }
  }

  // Снаряды игрока (Пылающий Метеор + Обсидиановая корка) и вражеские снаряды (Осколок/Веретено)
  let fireCount = 0;
  let enemyFireCount = 0;
  let bladeCount = 0;

  for (const proj of state.projectiles) {
    const flyYaw = Math.atan2(proj.vx || 0, proj.vz || 1);
    const spinRoll = time * 11 + proj.x * 1.7 + proj.z * 1.3;
    const pulseScale = 1 + Math.sin(time * 22 + proj.x) * 0.1;

    if (proj.isHostile) {
      if (enemyFireCount >= 100) continue;
      _projectileDummyObj.position.set(proj.x, proj.y, proj.z);
      _projectileDummyObj.rotation.set(0, flyYaw, spinRoll);
      _projectileDummyObj.scale.setScalar(pulseScale);
      _projectileDummyObj.updateMatrix();
      enemyProjectileInstancedMesh.setMatrixAt(enemyFireCount++, _projectileDummyObj.matrix);
    } else {
      if (fireCount >= 250) continue;
      _projectileDummyObj.position.set(proj.x, proj.y, proj.z);
      _projectileDummyObj.rotation.set(0, flyYaw, 0);
      _projectileDummyObj.scale.setScalar(pulseScale);
      _projectileDummyObj.updateMatrix();
      playerFireballInstancedMesh.setMatrixAt(fireCount, _projectileDummyObj.matrix);

      // Потрескавшаяся лавовая корка вращается вокруг своей оси и «дышит» в полёте (мудборд 1)
      const crustBreath = pulseScale * (1.03 + Math.cos(time * 18 + proj.z) * 0.05);
      _projectileDummyObj.rotation.set(spinRoll * 0.55, flyYaw + spinRoll * 0.7, -spinRoll * 0.45);
      _projectileDummyObj.scale.setScalar(crustBreath);
      _projectileDummyObj.updateMatrix();
      playerFireballCrustInstancedMesh.setMatrixAt(fireCount, _projectileDummyObj.matrix);
      fireCount++;
    }
  }

  // Цветовой резонанс ядра и шлейфа Орбитальных клинков с собранными стихиями
  const tags = state.tagCounts || {};
  if (tags.fire > 0) {
    orbitalBladeCoreMat.emissive.setHex(0xff6a15);
    orbitalBladeTrailMat.color.setHex(0xff8c28);
  } else if (tags.ice > 0) {
    orbitalBladeCoreMat.emissive.setHex(0x40d8ff);
    orbitalBladeTrailMat.color.setHex(0x88f2ff);
  } else if (tags.elec > 0) {
    orbitalBladeCoreMat.emissive.setHex(0xc858ff);
    orbitalBladeTrailMat.color.setHex(0xd888ff);
  } else {
    orbitalBladeCoreMat.emissive.setHex(0x45e8ff);
    orbitalBladeTrailMat.color.setHex(0x60f0ff);
  }

  for (let i = 0; i < (state.activeBladeCount || 0); i++) {
    const bladePos = state.bladePositions[i];
    if (bladeCount >= 50) break;
    const hoverWave = Math.sin(time * 7 + i * 1.4) * 0.08;
    _projectileDummyObj.position.set(bladePos[0], player.y + 1.0 + hoverWave, bladePos[1]);
    const angle = Math.atan2(bladePos[1] - player.z, bladePos[0] - player.x);
    const bankTilt = Math.PI / 2 + Math.sin(time * 9 + i) * 0.14;
    _projectileDummyObj.rotation.set(0, -angle, bankTilt);
    _projectileDummyObj.scale.setScalar(1.45);
    _projectileDummyObj.updateMatrix();
    orbitalBladeInstancedMesh.setMatrixAt(bladeCount, _projectileDummyObj.matrix);
    orbitalBladeCoreInstancedMesh.setMatrixAt(bladeCount, _projectileDummyObj.matrix);
    orbitalBladeTrailInstancedMesh.setMatrixAt(bladeCount, _projectileDummyObj.matrix);
    bladeCount++;
  }

  // Синхронизация «Магической нити» (r = 2.8 м) и сферической «Орбитальной защиты» (мудборд 1)
  if (typeof orbitalDefenseGroup !== 'undefined') {
    const bladeLv = (state.weaponLevels && state.weaponLevels.blade) | 0;
    orbitalDefenseGroup.visible = bladeCount > 0;
    if (bladeCount > 0) {
      orbitalDefenseGroup.position.set(player.x, player.y + 1.0, player.z);
      orbitalThreadMat.color.copy(orbitalBladeTrailMat.color);
      orbitalThreadMat.opacity = 0.34 + 0.12 * Math.sin(time * 6);
      primaryOrbitThreadRing.rotation.z = state.bladeOrbitAngle || 0;
      secondaryOrbitThreadRing.material.color.copy(orbitalBladeTrailMat.color);

      // Сферические вихревые дуги «Орбитальной защиты» усиливаются с ростом уровня клинков
      const cageOpacity = bladeLv >= 3 ? Math.min(0.42, (bladeLv - 2) * 0.07) : 0;
      for (let c = 0; c < orbitalCageRings.length; c++) {
        const cRing = orbitalCageRings[c];
        cRing.visible = cageOpacity > 0.01 && c < bladeLv - 1;
        if (cRing.visible) {
          cRing.material.color.copy(orbitalBladeTrailMat.color);
          cRing.material.opacity = cageOpacity * (0.75 + 0.25 * Math.sin(time * 8 + c));
          cRing.rotation.x += dt * (2.2 + c * 0.5) * (c % 2 ? 1 : -1);
          cRing.rotation.y += dt * (3.1 - c * 0.4);
        }
      }
    }
  }

  playerFireballInstancedMesh.count = fireCount;
  playerFireballCrustInstancedMesh.count = fireCount;
  enemyProjectileInstancedMesh.count = enemyFireCount;
  orbitalBladeInstancedMesh.count = bladeCount;
  orbitalBladeCoreInstancedMesh.count = bladeCount;
  orbitalBladeTrailInstancedMesh.count = bladeCount;

  if (fireCount) {
    playerFireballInstancedMesh.instanceMatrix.needsUpdate = true;
    playerFireballCrustInstancedMesh.instanceMatrix.needsUpdate = true;
  }
  if (enemyFireCount) enemyProjectileInstancedMesh.instanceMatrix.needsUpdate = true;
  if (bladeCount) {
    orbitalBladeInstancedMesh.instanceMatrix.needsUpdate = true;
    orbitalBladeCoreInstancedMesh.instanceMatrix.needsUpdate = true;
    orbitalBladeTrailInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  // Анимация 3D Ударных волн (с короной зубцов и двойным тором)
  for (const ringMesh of waveEffectRings) {
    if (ringMesh.visible) {
      ringMesh.lifeLeft -= dt;
      const maxL = ringMesh.maxLife || 0.36;
      const progress = Math.min(1, Math.max(0, 1 - ringMesh.lifeLeft / maxL));
      const rTarget = ringMesh.targetRadius || 3;
      const curRadius = rTarget * (0.38 + easeOutCubic(progress) * 0.68);
      const curHeight = Math.max(0.5, rTarget * 0.28 * Math.sin(progress * Math.PI));
      ringMesh.scale.set(curRadius, curHeight, curRadius);
      ringMesh.rotation.y += dt * 2.6;
      ringMesh.material.opacity = Math.max(0, (1 - progress) * 0.88);
      if (ringMesh.lifeLeft <= 0) ringMesh.visible = false;
    }
  }

  const activeTowerId = state.towerId || 'ash';
  dustParticles.rotation.y += dt * (activeTowerId === 'ice' ? 0.24 : activeTowerId === 'void' ? 0.03 : 0.06);
  const dustPosArr = dustParticles.geometry.attributes.position.array;
  for (let i = 0; i < DUST_PARTICLE_COUNT * 3; i += 3) {
    if (activeTowerId === 'ice') {
      dustPosArr[i + 1] += dt * 0.85;
    } else if (activeTowerId === 'void') {
      dustPosArr[i + 1] += Math.sin(time * 1.5 + i * 0.37) * dt * 0.28;
    } else {
      dustPosArr[i + 1] += dt * 0.55;
    }
    if (dustPosArr[i + 1] > 180) dustPosArr[i + 1] = 0;
    if (dustPosArr[i + 1] < 0) dustPosArr[i + 1] = 180;
  }
  dustParticles.geometry.attributes.position.needsUpdate = true;

  const sparkPosAttr = sparkGeo.attributes.position;
  const sparkColAttr = sparkGeo.attributes.color;
  let anySparkActive = false;
  for (let i = 0; i < SPARK_PARTICLE_COUNT; i++) {
    const sp = sparkData[i];
    if (!sp.active) continue;
    anySparkActive = true;
    sp.life += dt;
    if (sp.life >= sp.max) {
      sp.active = false;
      sparkPosAttr.array[i * 3 + 1] = -100;
      continue;
    }
    sp.velocity.y -= 1.4 * dt;
    sparkPosAttr.array[i * 3] += sp.velocity.x * dt;
    sparkPosAttr.array[i * 3 + 1] += sp.velocity.y * dt;
    sparkPosAttr.array[i * 3 + 2] += sp.velocity.z * dt;
    const fade = 1 - sp.life / sp.max;
    sparkColAttr.array[i * 3] = sp.color.r * fade;
    sparkColAttr.array[i * 3 + 1] = sp.color.g * fade;
    sparkColAttr.array[i * 3 + 2] = sp.color.b * fade;
  }
  if (anySparkActive) {
    sparkPosAttr.needsUpdate = sparkColAttr.needsUpdate = true;
  }

  const smokePosAttr = smokeGeo.attributes.position;
  const smokeColAttr = smokeGeo.attributes.color;
  let anySmokeActive = false;
  for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
    const sm = smokeData[i];
    if (!sm.active) continue;
    anySmokeActive = true;
    sm.life += dt;
    if (sm.life >= sm.max) {
      sm.active = false;
      smokePosAttr.array[i * 3 + 1] = -100;
      continue;
    }
    smokePosAttr.array[i * 3] += sm.velocity.x * dt;
    smokePosAttr.array[i * 3 + 1] += sm.velocity.y * dt;
    smokePosAttr.array[i * 3 + 2] += sm.velocity.z * dt;
    const ratio = sm.life / sm.max;
    smokeColAttr.array[i * 3] = smokeStartColor.r + (smokeEndColor.r - smokeStartColor.r) * ratio;
    smokeColAttr.array[i * 3 + 1] =
      smokeStartColor.g + (smokeEndColor.g - smokeStartColor.g) * ratio;
    smokeColAttr.array[i * 3 + 2] =
      smokeStartColor.b + (smokeEndColor.b - smokeStartColor.b) * ratio;
  }
  if (anySmokeActive) {
    smokePosAttr.needsUpdate = smokeColAttr.needsUpdate = true;
  }

  for (const ring of fireLandingRings) {
    if (!ring.visible) continue;
    ring.userData.life += dt / 0.45;
    if (ring.userData.life >= 1) {
      ring.visible = false;
      continue;
    }
    const rScale = 1 + ring.userData.life * 2.4;
    ring.scale.set(rScale, 1 + (1 - ring.userData.life) * 0.8, rScale);
    ring.material.opacity = Math.max(0, (1 - ring.userData.life) * 0.72);
  }

  for (const ring of voidLandingRings) {
    if (!ring.visible) continue;
    ring.userData.life += dt / 0.45;
    if (ring.userData.life >= 1) {
      ring.visible = false;
      continue;
    }
    const rScale = 1 + ring.userData.life * 2.4;
    ring.scale.set(rScale, 1 + (1 - ring.userData.life) * 0.8, rScale);
    ring.material.opacity = Math.max(0, (1 - ring.userData.life) * 0.72);
  }

  updateGlobalBolts(dt);
  syncBossVisualEffects(dt);

  // Полоса здоровья босса с индивидуальными статусами для всех 9 боссов
  const activeBoss = state.enemies.find((e) => e.type === 'b');
  if (activeBoss) {
    const currentHp = Math.max(0, activeBoss.hp);
    const widthPercent = Math.max(0, (currentHp / activeBoss.maxHp) * 100).toFixed(1) + '%';
    const hpText = Math.ceil(currentHp) + ' / ' + activeBoss.maxHp;

    if (widthPercent !== lastBossWidthText) {
      lastBossWidthText = widthPercent;
      DOM_CACHE.bossBarFill.style.width = widthPercent;
    }
    if (hpText !== lastBossHpText) {
      lastBossHpText = hpText;
      DOM_CACHE.bossHpText.textContent = hpText;
    }

    let statusSuffix = '';
    if (activeBoss.bkind === 'womb') {
      if (activeTowerId === 'ice') {
        statusSuffix = activeBoss.shield
          ? ' · КОКОН ПАУТИНЫ'
          : activeBoss.weak
            ? ' · НИТИ СОРВАНЫ ×2'
            : '';
      } else if (activeTowerId === 'void') {
        statusSuffix = activeBoss.shield
          ? ' · ФАЗОВЫЙ ПАНЦИРЬ'
          : activeBoss.weak
            ? ' · РАЗЛОМ СИНГУЛЯРНОСТИ ×2'
            : '';
      } else {
        statusSuffix = activeBoss.shield
          ? ' · ЩИТ'
          : activeBoss.weak
            ? ' · ЯДРО ОТКРЫТО ×2'
            : '';
      }
    } else if (activeBoss.bkind === 'koloss' && activeBoss.bossState === 'exhaust') {
      statusSuffix =
        activeTowerId === 'ice'
          ? ' · СЕРДЦЕ ОТКРЫТО ×2'
          : activeTowerId === 'void'
            ? ' · ГОРИЗОНТ ОТКРЫТ ×2'
            : ' · ИСТОЩЕНИЕ ×2';
    } else if (activeBoss.phase === 2) {
      if (activeTowerId === 'ice') {
        statusSuffix = activeBoss.bkind === 'koloss' ? ' · ОКО БУРАНА' : ' · ЗВОН ПОКАЯНИЯ';
      } else if (activeTowerId === 'void') {
        statusSuffix = activeBoss.bkind === 'koloss' ? ' · СИНГУЛЯРНОСТЬ' : ' · СЛОМ ГЕОМЕТРИИ';
      } else {
        statusSuffix = activeBoss.bkind === 'koloss' ? ' · ЯРОСТЬ ЛАВЫ' : ' · ЯРОСТЬ';
      }
    }

    const fullBossTitle = activeBoss.bossName + statusSuffix;
    if (fullBossTitle !== lastBossNameText) {
      lastBossNameText = fullBossTitle;
      getById('bossName').textContent = fullBossTitle;
    }
    if (!lastBossShownState) {
      lastBossShownState = 1;
      DOM_CACHE.bossHpContainer.classList.add('visible');
    }
  } else if (lastBossShownState) {
    lastBossShownState = 0;
    lastBossWidthText = '';
    lastBossHpText = '';
    lastBossNameText = '';
    DOM_CACHE.bossHpContainer.classList.remove('visible');
  }

  if (state.frameCount++ % 6 === 0) {
    DOM_CACHE.healthBar.style.width = Math.max(0, (player.hp / state.maxHp) * 100) + '%';
    DOM_CACHE.xpBar.style.width = (state.xp / (6 + 5 * state.level)) * 100 + '%';

    const inventorySummary = [
      ...Object.entries(state.weaponLevels).map(([k, v]) => WEAPONS[k].name + ' ' + v),
      ...Object.entries(state.itemsOwned).map(([k, v]) => ITEMS[k].name + ' ×' + v),
      ...Object.entries(state.tomeLevels || {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => TOMES[k].name + ' ×' + v)
    ].join(', ');

    DOM_CACHE.statsText.innerHTML =
      `${HEROES[state.heroId].name}<br>` +
      `Этаж ${state.maxFloorReached + 1}/12 · ур. ${state.level} · ${formatTime(state.elapsedTime | 0)}<br>` +
      `До ${state.towerConfig.hazardGenitive}: ${Math.max(0, player.y - state.lavaY).toFixed(1)} м · золото: ${state.gold | 0}<br>` +
      `Рывок (Shift): ${state.slideCooldown > 0 ? state.slideCooldown.toFixed(1) + ' с' : 'готов'}` +
      `${state.chosenRoute ? '<br>Путь: ' + (state.chosenRoute === 1 ? 'тихий' : 'опасный') : ''}` +
      `${state.activeEvent ? '<br>Событие: ' + FLOOR_EVENTS[state.activeEvent.key].name + ' · ' + (state.activeEvent.timeLeft | 0) + ' с' : ''}` +
      `${state.mutatorName ? '<br>' + state.mutatorName : ''}` +
      `<br>${inventorySummary}`;
  }

  renderer.render(scene, camera);
}
