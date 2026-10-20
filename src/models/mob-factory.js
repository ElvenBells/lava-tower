/* ==========================================================================
   Фабрика и объектный пул мешей мобов и боссов с поддержкой 3 башен:
   - 12 типов обычных мобов (4 роли × 3 башни: 'ash', 'ice', 'void')
   - 9 уникальных боссов (3 тира × 3 башни)
   - Единый THREE.InstancedMesh для мелких мобов роя (type === 's', до 400 врагов)
   ========================================================================== */

const MAX_ENEMIES_LIMIT = 400;
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

/**
 * Сливает набор геометрий прототипа роя ('s') в единую вершинную BufferGeometry
 * с сохранением существующих атрибутов цвета вершин (vertexColors) для THREE.InstancedMesh.
 */
function buildUnifiedSwarmInstancedGeometry(proto, towerId) {
  const entries = [];
  const identityMat = new THREE.Matrix4();

  const coreColor =
    towerId === 'ice'
      ? new THREE.Color(0x68dcff)
      : towerId === 'void'
        ? new THREE.Color(0xa848ff)
        : new THREE.Color(0xff5a18);
  const eyeOuterCol =
    towerId === 'ice'
      ? new THREE.Color(0x70e4ff)
      : towerId === 'void'
        ? new THREE.Color(0xd868ff)
        : new THREE.Color(0xffb820);
  const eyeInnerCol =
    towerId === 'ice'
      ? new THREE.Color(0xffffff)
      : towerId === 'void'
        ? new THREE.Color(0xf8e0ff)
        : new THREE.Color(0xfff8d0);
  const debrisCol =
    towerId === 'ice'
      ? new THREE.Color(0xa8e8ff)
      : towerId === 'void'
        ? new THREE.Color(0x8a38d8)
        : new THREE.Color(0x3d3d44);

  if (proto.coreGeo) {
    entries.push({ geo: proto.coreGeo, matrix: identityMat, fallbackColor: coreColor });
  }
  if (proto.chunksRockGeo) {
    entries.push({ geo: proto.chunksRockGeo, matrix: identityMat, fallbackColor: new THREE.Color(0x382e32) });
  }
  if (proto.chunksBurgGeo) {
    entries.push({ geo: proto.chunksBurgGeo, matrix: identityMat, fallbackColor: coreColor });
  }
  if (proto.wingGeoL) {
    entries.push({ geo: proto.wingGeoL, matrix: identityMat, fallbackColor: coreColor });
  }
  if (proto.wingGeoR) {
    entries.push({ geo: proto.wingGeoR, matrix: identityMat, fallbackColor: coreColor });
  }
  if (proto.flameCrownGeo) {
    entries.push({ geo: proto.flameCrownGeo, matrix: identityMat, fallbackColor: new THREE.Color(0xff9820) });
  }
  if (proto.eyeOuterGeo) {
    entries.push({ geo: proto.eyeOuterGeo, matrix: identityMat, fallbackColor: eyeOuterCol });
  }
  if (proto.eyeInnerGeo) {
    entries.push({ geo: proto.eyeInnerGeo, matrix: identityMat, fallbackColor: eyeInnerCol });
  }
  if (proto.debrisGeo) {
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2 + 0.4;
      const mat4 = computeTransformMatrix(
        Math.cos(ang) * 1.65,
        0.55 + (i % 2) * 0.45,
        Math.sin(ang) * 1.65,
        i * 0.7,
        ang,
        0,
        0.85,
        0.85,
        0.85
      ).clone();
      entries.push({ geo: proto.debrisGeo, matrix: mat4, fallbackColor: debrisCol });
    }
  }

  let totalVertices = 0;
  const prepared = [];
  for (const item of entries) {
    const cloned = item.geo.clone();
    const nonIdx = cloned.index ? cloned.toNonIndexed() : cloned;
    nonIdx.applyMatrix4(item.matrix);
    prepared.push({ geom: nonIdx, fallbackColor: item.fallbackColor });
    totalVertices += nonIdx.attributes.position.count;
  }

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const item of prepared) {
    const geom = item.geom;
    const count = geom.attributes.position.count;
    positions.set(geom.attributes.position.array.subarray(0, count * 3), offset * 3);
    if (geom.attributes.normal) {
      normals.set(geom.attributes.normal.array.subarray(0, count * 3), offset * 3);
    }
    const colAttr = geom.attributes.color;
    if (colAttr) {
      colors.set(colAttr.array.subarray(0, count * 3), offset * 3);
    } else {
      const fc = item.fallbackColor || coreColor;
      for (let i = 0; i < count; i++) {
        colors[(offset + i) * 3] = fc.r;
        colors[(offset + i) * 3 + 1] = fc.g;
        colors[(offset + i) * 3 + 2] = fc.b;
      }
    }
    offset += count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return merged;
}

// Единый пул THREE.InstancedMesh для мелких мобов роя (type === 's') по примеру блоков башни
const swarmInstancedMeshByBiome = {};
const _swarmInitDummy = new THREE.Object3D();
const _swarmInitColor = new THREE.Color(0xffffff);
_swarmInitDummy.position.set(0, -999, 0);
_swarmInitDummy.scale.set(0, 0, 0);
_swarmInitDummy.updateMatrix();

for (const towerId of ['ash', 'ice', 'void']) {
  const proto = ENEMY_PROTOTYPES[towerId].s[0];
  const swarmGeo = buildUnifiedSwarmInstancedGeometry(proto, towerId);
  const swarmMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: towerId === 'ice' ? 0.2 : 0.72,
    metalness: towerId === 'ice' ? 0.3 : 0.15,
    flatShading: true,
    emissive: towerId === 'ice' ? 0x185888 : towerId === 'void' ? 0x581888 : 0x581808,
    emissiveIntensity: 0.55
  });
  const instMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, MAX_ENEMIES_LIMIT);
  instMesh.frustumCulled = false;
  instMesh.count = 0;
  for (let i = 0; i < MAX_ENEMIES_LIMIT; i++) {
    instMesh.setMatrixAt(i, _swarmInitDummy.matrix);
    instMesh.setColorAt(i, _swarmInitColor);
  }
  instMesh.instanceMatrix.needsUpdate = true;
  if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
  scene.add(instMesh);
  swarmInstancedMeshByBiome[towerId] = instMesh;
}

let swarmInstancedMesh = swarmInstancedMeshByBiome.ash;

function resetSwarmInstancedMeshes() {
  for (const towerId of ['ash', 'ice', 'void']) {
    const im = swarmInstancedMeshByBiome[towerId];
    if (im) {
      im.count = 0;
    }
  }
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
