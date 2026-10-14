/* ==========================================================================
   Фабрика и объектный пул мешей мобов и боссов
   (исключает аллокации и сборку мусора во время боя)
   ========================================================================== */

const PROTOTYPE_VARIANTS = 3;
const ENEMY_PROTOTYPES = {
  s: [],
  r: null,
  l: [],
  t: [],
  b: null
};

for (let v = 0; v < PROTOTYPE_VARIANTS; v++) {
  ENEMY_PROTOTYPES.s.push(buildOgarekPrototype());
  ENEMY_PROTOTYPES.l.push(buildLeaperPrototype());
  ENEMY_PROTOTYPES.t.push(buildGuardPrototype());
}
ENEMY_PROTOTYPES.r = buildShypPrototype();

const mobPool = { s: [], r: [], l: [], t: [], b: [] };
const mobCreatedCount = { s: 0, r: 0, l: 0, t: 0, b: 0 };
const bossPool = { golem: [], womb: [], koloss: [] };

function createBossInstanceByKind(bossKind) {
  if (bossKind === 'womb') return createWombInstance();
  if (bossKind === 'koloss') return createKolossInstance();
  return createGolemInstance();
}

const MobFactory = {
  create(type, bossKind) {
    if (type === 's') {
      return createOgarekInstance(ENEMY_PROTOTYPES.s[mobCreatedCount.s++ % PROTOTYPE_VARIANTS]);
    }
    if (type === 'r') {
      return createShypInstance(ENEMY_PROTOTYPES.r);
    }
    if (type === 'l') {
      return createLeaperInstance(ENEMY_PROTOTYPES.l[mobCreatedCount.l++ % PROTOTYPE_VARIANTS]);
    }
    if (type === 't') {
      return createGuardInstance(ENEMY_PROTOTYPES.t[mobCreatedCount.t++ % PROTOTYPE_VARIANTS]);
    }
    return createBossInstanceByKind(bossKind || 'golem');
  },

  acquire(type, bossKind) {
    let mesh =
      type === 'b' ? bossPool[bossKind || 'golem'].pop() : mobPool[type].pop();
    if (!mesh) {
      mesh = this.create(type, bossKind);
    }

    const ud = mesh.userData;
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
        pieceData.radius = 1.8 + Math.random() * 0.7;
        pieceData.height = 0.9 + Math.random() * 1.1;
        pieceData.speed = 0.25 + Math.random() * 0.4;
        piece.scale.setScalar(0.7 + Math.random() * 0.7);
      }
      ud.eyeMatO.color.copy(ud.eyeBaseO);
      ud.eyeMatI.color.copy(ud.eyeBaseI);
      ud.haloMat.opacity = 0.9;
    } else if (type === 'r') {
      for (const shard of ud.shards) {
        const shardData = shard.userData;
        shardData.angle = Math.random() * Math.PI * 2;
        shardData.phase = Math.random() * Math.PI * 2;
        shardData.radius = 1.7 + Math.random() * 0.6;
        shardData.speed = 0.35 + Math.random() * 0.4;
      }
      for (const sd of ud.stData) {
        sd.radius = 0.1 + Math.random() * 0.45;
        sd.theta = Math.random() * Math.PI * 2;
        sd.y = (Math.random() - 0.5) * 1.6;
      }
      ud.shellMat.opacity = 0.5;
      ud.edgesMat.opacity = 0.55;
      ud.shellMat.emissiveIntensity = 0.55;
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
        ud.charMat.emissiveIntensity = 1.0;
        ud.eyeMat.color.copy(ud.eyeBase);
        ud.haloMat.opacity = 0.9;
        for (const crackMat of ud.crackMats) {
          crackMat.opacity = 0.5;
        }
        ud.chestGlow.material.opacity = 0.4;
        ud.hips.position.y = 2.75;
        ud.torso.rotation.x = 0.1;
        ud.head.rotation.set(0.1, 0, 0);
        ud.jaw.rotation.x = 0.06;
        ud.armR.rotation.set(-0.15, 0, 0.12);
        ud.armL.rotation.set(-0.15, 0, -0.12);
        ud.legR.rotation.x = 0;
        ud.legL.rotation.x = 0;
      } else if (ud.bkind === 'womb') {
        ud.coreGlowMat.opacity = 0.2;
        ud.haloMat.opacity = 0.6;
        ud.shieldMat.opacity = 0.16;
        ud.shieldWireMat.opacity = 0.25;
        ud.vrMat.opacity = 0;
        ud.core.scale.setScalar(1);
        ud.shell.rotation.set(0, 0, 0);
      } else {
        ud.lavaMat.emissiveIntensity = 1.15;
        ud.columnMat.emissiveIntensity = 1.25;
        ud.haloMat.opacity = 0.9;
        for (const crackMat of ud.crackMats) {
          crackMat.opacity = 0;
        }
        ud.weakSprite.material.opacity = 0;
        for (const vent of ud.vents) {
          vent.flare.material.opacity = 0;
        }
        ud.baseGlow.material.opacity = 0.4;
        ud.chestGlow.material.opacity = 0.4;
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
    if (type === 'b') {
      bossPool[mesh.userData.bkind].push(mesh);
    } else {
      mobPool[type].push(mesh);
    }
  }
};
