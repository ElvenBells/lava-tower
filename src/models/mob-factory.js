/* ==========================================================================
   Фабрика и объектный пул мешей мобов и боссов с поддержкой 3 башен:
   - 12 типов обычных мобов (4 роли × 3 башни: 'ash', 'ice', 'void')
   - 9 уникальных боссов (3 тира × 3 башни)
   ========================================================================== */

const PROTOTYPE_VARIANTS = 2;
const ENEMY_PROTOTYPES = {
  ash: { s: [], r: null, l: [], t: [] },
  ice: { s: [], r: null, l: [], t: [] },
  void: { s: [], r: null, l: [], t: [] }
};

for (const towerId of ['ash', 'ice', 'void']) {
  for (let v = 0; v < PROTOTYPE_VARIANTS; v++) {
    ENEMY_PROTOTYPES[towerId].s.push(buildOgarekPrototype(towerId));
    ENEMY_PROTOTYPES[towerId].l.push(buildLeaperPrototype(towerId));
    ENEMY_PROTOTYPES[towerId].t.push(buildGuardPrototype(towerId));
  }
  ENEMY_PROTOTYPES[towerId].r = buildShypPrototype(towerId);
}

const mobPool = {};
const mobCreatedCount = {};
const bossPool = {};

for (const towerId of ['ash', 'ice', 'void']) {
  for (const type of ['s', 'r', 'l', 't']) {
    mobPool[`${towerId}_${type}`] = [];
    mobCreatedCount[`${towerId}_${type}`] = 0;
  }
  for (const bkind of ['golem', 'womb', 'koloss']) {
    bossPool[`${towerId}_${bkind}`] = [];
  }
}

function getActiveTowerIdForFactory(explicitTowerId) {
  if (explicitTowerId && ENEMY_PROTOTYPES[explicitTowerId]) return explicitTowerId;
  if (typeof state !== 'undefined' && state && state.towerId && ENEMY_PROTOTYPES[state.towerId]) {
    return state.towerId;
  }
  if (typeof currentTowerTheme !== 'undefined' && currentTowerTheme && currentTowerTheme.id) {
    return currentTowerTheme.id;
  }
  return 'ash';
}

function createBossInstanceByKind(bossKind, towerId) {
  if (bossKind === 'womb') return createWombInstance(towerId);
  if (bossKind === 'koloss') return createKolossInstance(towerId);
  return createGolemInstance(towerId);
}

const MobFactory = {
  create(type, bossKind, explicitTowerId) {
    const towerId = getActiveTowerIdForFactory(explicitTowerId);
    const key = `${towerId}_${type}`;
    const protos = ENEMY_PROTOTYPES[towerId] || ENEMY_PROTOTYPES.ash;

    if (type === 's') {
      return createOgarekInstance(protos.s[mobCreatedCount[key]++ % PROTOTYPE_VARIANTS]);
    }
    if (type === 'r') {
      return createShypInstance(protos.r);
    }
    if (type === 'l') {
      return createLeaperInstance(protos.l[mobCreatedCount[key]++ % PROTOTYPE_VARIANTS]);
    }
    if (type === 't') {
      return createGuardInstance(protos.t[mobCreatedCount[key]++ % PROTOTYPE_VARIANTS]);
    }
    return createBossInstanceByKind(bossKind || 'golem', towerId);
  },

  acquire(type, bossKind, explicitTowerId) {
    const towerId = getActiveTowerIdForFactory(explicitTowerId);
    const poolKey =
      type === 'b' ? `${towerId}_${bossKind || 'golem'}` : `${towerId}_${type}`;
    const pool = type === 'b' ? bossPool[poolKey] : mobPool[poolKey];

    let mesh = pool ? pool.pop() : null;
    if (!mesh) {
      mesh = this.create(type, bossKind, towerId);
    }

    const ud = mesh.userData;
    ud.towerId = towerId;
    mesh.visible = true;
    mesh.position.set(0, -999, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.setScalar(ud.rootScale);

    applyStatusTint(ud.tintMats, 0);
    ud.tintState = 0;

    for (const lodObj of ud.lodObjs) {
      lodObj.visible = true;
    }

    if (type === 's') {
      ud.chunksPhase = Math.random() * Math.PI * 2;
      for (const piece of ud.debris) {
        const pieceData = piece.userData;
        pieceData.angle = Math.random() * Math.PI * 2;
        pieceData.radius = 1.7 + Math.random() * 0.7;
        pieceData.height = 0.6 + Math.random() * 1.1;
        pieceData.speed = 0.4 + Math.random() * 0.5;
        piece.scale.setScalar(0.7 + Math.random() * 0.6);
      }
      ud.eyeMatO.color.copy(ud.eyeBaseO);
      ud.eyeMatI.color.copy(ud.eyeBaseI);
      ud.haloMat.opacity = 0.9;
    } else if (type === 'r') {
      for (const shard of ud.shards) {
        const shardData = shard.userData;
        shardData.angle = Math.random() * Math.PI * 2;
        shardData.phase = Math.random() * Math.PI * 2;
        shardData.radius = 1.65 + Math.random() * 0.55;
        shardData.speed = 0.45 + Math.random() * 0.4;
      }
      for (const sd of ud.stData) {
        sd.radius = 0.12 + Math.random() * 0.48;
        sd.theta = Math.random() * Math.PI * 2;
        sd.y = (Math.random() - 0.5) * 1.6;
      }
      ud.shellMat.opacity = towerId === 'ice' ? 0.68 : 0.56;
      ud.edgesMat.opacity = 0.65;
      ud.shellMat.emissiveIntensity = 0.65;
    } else if (type === 't') {
      ud.atkState = 'idle';
      ud.atkT = 0;
      ud.atkTimer = 3 + Math.random() * 2;
      ud.impacted = false;
      ud.flare = 0;
      ud.shake = 0;
      ud.coal = 1;
      ud.coalT = 0;
      ud.headYaw = 0;
      ud.eyeMat.color.copy(ud.eyeBase);
      ud.haloMat.opacity = 0.85;
      for (const crackMat of ud.crackMats) {
        crackMat.opacity = 0.6;
      }
      ud.hips.position.y = 1.5;
      ud.torso.rotation.x = 0.12;
      ud.torso.scale.setScalar(1);
      ud.head.rotation.set(0, 0, 0);
      ud.armR.g.rotation.set(0, 0, 0.06);
      ud.armL.g.rotation.set(0, 0, -0.06);
      ud.legR.rotation.x = 0;
      ud.legL.rotation.x = 0;
    } else if (type === 'l') {
      ud.flare = 0;
      ud.shake = 0;
      ud.headYaw = 0;
      ud.eyeMat.color.copy(ud.eyeBase);
      ud.haloMat.opacity = 0.85;
      ud.hips.position.y = 0.98;
      ud.hips.rotation.x = 0;
      ud.head.rotation.set(0, 0, 0);
      ud.jaw.rotation.x = 0.12;
      ud.legFL.g.rotation.x = 0;
      ud.legFL.fore.rotation.x = 0;
      ud.legFR.g.rotation.x = 0;
      ud.legFR.fore.rotation.x = 0;
      ud.legBL.g.rotation.x = 0;
      ud.legBL.shin.rotation.x = 0;
      ud.legBL.foot.rotation.x = 0;
      ud.legBR.g.rotation.x = 0;
      ud.legBR.shin.rotation.x = 0;
      ud.legBR.foot.rotation.x = 0;
      for (const seg of ud.tailSegs) {
        seg.rotation.x = 0;
      }
    } else if (type === 'b') {
      if (ud.bkind === 'golem') {
        ud.charMat.emissiveIntensity = 1.15;
        ud.eyeMat.color.copy(ud.eyeBase);
        ud.haloMat.opacity = 0.9;
        for (const crackMat of ud.crackMats) {
          crackMat.opacity = 0.6;
        }
        ud.chestGlow.material.opacity = 0.55;
        ud.hips.position.y = 2.75;
        ud.torso.rotation.set(0.1, 0, 0);
        ud.head.rotation.set(0.1, 0, 0);
        ud.jaw.rotation.x = 0.06;
        ud.armR.rotation.set(-0.15, 0, 0.12);
        ud.armL.rotation.set(-0.15, 0, -0.12);
        ud.legR.rotation.x = 0;
        ud.legL.rotation.x = 0;
        if (ud.bellPivot) ud.bellPivot.rotation.set(0, 0, 0);
      } else if (ud.bkind === 'womb') {
        ud.coreGlowMat.opacity = 0.25;
        ud.haloMat.opacity = 0.7;
        ud.shieldMat.opacity = 0.18;
        ud.shieldWireMat.opacity = 0.28;
        ud.vrMat.opacity = 0;
        ud.core.scale.setScalar(1);
        ud.shell.rotation.set(0, 0, 0);
      } else {
        ud.lavaMat.emissiveIntensity = 1.1;
        ud.columnMat.emissiveIntensity = 1.25;
        ud.haloMat.opacity = 0.9;
        for (const crackMat of ud.crackMats) {
          crackMat.opacity = 0;
        }
        ud.weakSprite.material.opacity = 0;
        for (const vent of ud.vents) {
          vent.flare.material.opacity = 0;
        }
        ud.baseGlow.material.opacity = 0.45;
        ud.chestGlow.material.opacity = 0.6;
        ud.column.scale.y = 1;
        ud.hips.position.y = KOLOSS_COLUMN_HEIGHT;
        ud.torso.rotation.set(0.08, 0, 0);
        ud.head.rotation.set(0.1, 0, 0);
        ud.jaw.rotation.x = 0.08;
        ud.armR.g.rotation.set(-0.15, 0, 0.18);
        ud.armL.g.rotation.set(-0.15, 0, -0.18);
        ud.armR.elbow.rotation.x = -0.35;
        ud.armL.elbow.rotation.x = -0.35;
        for (const inc of ud.incData) {
          inc.life = Math.random() * 7;
        }
      }
    }

    return mesh;
  },

  release(type, mesh) {
    if (!mesh) return;
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    const towerId = (mesh.userData && mesh.userData.towerId) || 'ash';
    if (type === 'b') {
      const bKey = `${towerId}_${mesh.userData.bkind || 'golem'}`;
      if (!bossPool[bKey]) bossPool[bKey] = [];
      bossPool[bKey].push(mesh);
    } else {
      const mKey = `${towerId}_${type}`;
      if (!mobPool[mKey]) mobPool[mKey] = [];
      mobPool[mKey].push(mesh);
    }
  }
};
