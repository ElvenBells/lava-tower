/* ==========================================================================
   Модель игрока и базовое окружение башни:
   многослойная угроза снизу (лава / вихрь метели / воронка бездны),
   рельефные внешние стены, полупрозрачная толща льда и смена тем башен
   ========================================================================== */

const playerMesh = new THREE.Group();

const heroBodyMaterial = new THREE.MeshStandardMaterial({
  color: 0x3f6f6a,
  roughness: 0.6,
  flatShading: true
});
const heroSkinMaterial = new THREE.MeshStandardMaterial({
  color: 0xd4a574,
  roughness: 0.7,
  flatShading: true
});
const heroClothMaterial = new THREE.MeshStandardMaterial({
  color: 0x2a1f1a,
  roughness: 0.8,
  flatShading: true
});
const heroMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0xcfd3dc,
  roughness: 0.3,
  metalness: 0.7,
  flatShading: true
});

const heroTorsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1, 8), heroBodyMaterial);
heroTorsoMesh.position.y = 0.8;

const heroHeadMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), heroSkinMaterial);
heroHeadMesh.position.y = 1.6;
heroHeadMesh.scale.set(1, 0.9, 1);

const heroHelmetMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 8, 6, 0, TWO_PI, 0, Math.PI / 2),
  heroMetalMaterial
);
heroHelmetMesh.position.y = 1.7;

const heroVisorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.12, 0.15),
  new THREE.MeshBasicMaterial({ color: 0x45e0c8 })
);
heroVisorMesh.position.set(0, 1.55, 0.28);

const heroWeaponMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.18), heroMetalMaterial);
heroWeaponMesh.position.set(0.5, 0.95, 0.15);
heroWeaponMesh.rotation.z = -0.4;

const heroLeftLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 6), heroClothMaterial);
heroLeftLegMesh.position.set(-0.18, 0.3, 0);

const heroRightLegMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.6, 6), heroClothMaterial);
heroRightLegMesh.position.set(0.18, 0.3, 0);

const heroBeltMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 8), heroMetalMaterial);
heroBeltMesh.position.y = 0.95;

playerMesh.add(
  heroTorsoMesh,
  heroHeadMesh,
  heroHelmetMesh,
  heroVisorMesh,
  heroWeaponMesh,
  heroLeftLegMesh,
  heroRightLegMesh,
  heroBeltMesh
);
scene.add(playerMesh);

/* ---------- 1. Поверхность и 3D-эффекты угрозы снизу (Лава / Метель / Бездна) ---------- */

const LAVA_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
    map: lavaTexture,
    bumpMap: lavaTexture,
    bumpScale: 0.25,
    emissive: 0xff6a15,
    emissiveMap: lavaTexture,
    emissiveIntensity: 2.1,
    roughness: 0.55
  }),
  ice: new THREE.MeshStandardMaterial({
    map: iceLavaTexture,
    bumpMap: iceLavaTexture,
    bumpScale: 0.2,
    emissive: 0x68c4ff,
    emissiveMap: iceLavaTexture,
    emissiveIntensity: 1.35,
    roughness: 0.35
  }),
  void: new THREE.MeshStandardMaterial({
    map: voidLavaTexture,
    emissive: 0x9835ff,
    emissiveMap: voidLavaTexture,
    emissiveIntensity: 1.75,
    roughness: 0.75
  })
};

const lavaMesh = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), LAVA_MATERIALS.ash);
lavaMesh.rotation.x = -Math.PI / 2;
scene.add(lavaMesh);

// Группа объёмных деталей угрозы снизу (движется синхронно с lavaMesh.position.y)
const hazardEffectsGroup = new THREE.Group();
scene.add(hazardEffectsGroup);

const hazardAshGroup = new THREE.Group();
const hazardIceGroup = new THREE.Group();
const hazardVoidGroup = new THREE.Group();
hazardEffectsGroup.add(hazardAshGroup, hazardIceGroup, hazardVoidGroup);

// 1A. Детали моря магмы (Пепельная башня): плавающие корки шлака и конвекционное свечение
(function buildAshHazardDetails() {
  const glowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(30.2, 36),
    new THREE.MeshBasicMaterial({
      map: lavaTexture,
      color: 0xffaa30,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  glowDisc.rotation.x = -Math.PI / 2;
  glowDisc.position.y = 0.08;
  hazardAshGroup.add(glowDisc);
  hazardAshGroup.userData.glowDisc = glowDisc;

  // Островки застывшей базальтовой корки, плывущие в лаве
  const crustMat = new THREE.MeshStandardMaterial({
    color: 0x240b0d,
    emissive: 0x6a1400,
    emissiveIntensity: 0.65,
    roughness: 0.92,
    flatShading: true
  });
  const crustRocks = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * TWO_PI + (i % 3) * 0.2;
    const radius = 4 + (i % 4) * 6.2;
    const rockGeo = new THREE.CylinderGeometry(
      1.1 + (i % 3) * 0.6,
      1.5 + (i % 3) * 0.7,
      0.45,
      7
    );
    const rock = new THREE.Mesh(rockGeo, crustMat);
    rock.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    rock.rotation.y = i * 1.1;
    rock.userData = { baseAngle: angle, radius, phase: i * 0.7 };
    hazardAshGroup.add(rock);
    crustRocks.push(rock);
  }
  hazardAshGroup.userData.crustRocks = crustRocks;
})();

// 1B. Детали вихря метели (Ледяная башня): вращающаяся воронка бурана и ледяные осколки
(function buildIceHazardDetails() {
  const funnelRings = [];
  for (let layer = 0; layer < 3; layer++) {
    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(2.5 + layer * 5.5, 9.5 + layer * 7.2, 40, 1),
      new THREE.MeshBasicMaterial({
        map: iceLavaTexture,
        color: layer === 0 ? 0xffffff : 0x9cdfff,
        transparent: true,
        opacity: 0.42 - layer * 0.08,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.15 + layer * 0.35;
    hazardIceGroup.add(ringMesh);
    funnelRings.push(ringMesh);
  }

  // Центральное око ледяного бурана
  const eyeGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: TEXTURES.glowIce,
      color: 0xdff8ff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  eyeGlow.scale.set(28, 8, 1);
  eyeGlow.position.y = 1.2;
  hazardIceGroup.add(eyeGlow);

  hazardIceGroup.userData.funnelRings = funnelRings;
  hazardIceGroup.visible = false;
})();

// 1C. Детали Бездны (Башня Пустоты): чёрная дыра, аккреционный диск и далёкие вспыхивающие огни
(function buildVoidHazardDetails() {
  // Абсолютно чёрный горизонт событий в центре бездны
  const blackHoleCore = new THREE.Mesh(
    new THREE.CircleGeometry(9.5, 40),
    new THREE.MeshBasicMaterial({ color: 0x010003 })
  );
  blackHoleCore.rotation.x = -Math.PI / 2;
  blackHoleCore.position.y = 0.06;
  hazardVoidGroup.add(blackHoleCore);

  // Светящиеся кольца аккреционного вихря пустоты
  const vortexRings = [];
  for (let r = 0; r < 3; r++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(7.5 + r * 4.8, 12.0 + r * 6.2, 44),
      new THREE.MeshBasicMaterial({
        map: voidLavaTexture,
        color: r === 0 ? 0xe098ff : r === 1 ? 0xa840ff : 0x6818c8,
        transparent: true,
        opacity: 0.65 - r * 0.14,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12 + r * 0.18;
    hazardVoidGroup.add(ring);
    vortexRings.push(ring);
  }

  // Далёкие огни/звёзды, вспыхивающие в глубине бездны
  const abyssStarGeo = new THREE.BufferGeometry();
  const starCount = 48;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const ang = Math.random() * TWO_PI;
    const rad = 3 + Math.random() * 26;
    starPos[i * 3] = Math.cos(ang) * rad;
    starPos[i * 3 + 1] = 0.2 + Math.random() * 1.8;
    starPos[i * 3 + 2] = Math.sin(ang) * rad;
    starCol[i * 3] = 0.85;
    starCol[i * 3 + 1] = 0.65;
    starCol[i * 3 + 2] = 1.0;
  }
  abyssStarGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  abyssStarGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const abyssStars = new THREE.Points(
    abyssStarGeo,
    new THREE.PointsMaterial({
      size: 0.55,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  hazardVoidGroup.add(abyssStars);

  hazardVoidGroup.userData.vortexRings = vortexRings;
  hazardVoidGroup.userData.abyssStars = abyssStars;
  hazardVoidGroup.visible = false;
})();

/* ---------- 2. Цилиндрические внешние стены башни ---------- */

const TOWER_WALL_MATERIALS = {
  ash: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ash.map,
    bumpMap: TOWER_WALL_TEXTURES.ash.bump,
    bumpScale: 0.45,
    emissive: 0xff5a14,
    emissiveMap: TOWER_WALL_TEXTURES.ash.emissive,
    emissiveIntensity: 1.45,
    roughness: 0.86,
    metalness: 0.12,
    side: THREE.BackSide
  }),
  ice: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    bumpMap: TOWER_WALL_TEXTURES.ice.bump,
    bumpScale: 0.35,
    emissive: 0x58c4ff,
    emissiveMap: TOWER_WALL_TEXTURES.ice.emissive,
    emissiveIntensity: 1.15,
    roughness: 0.18,
    metalness: 0.28,
    side: THREE.BackSide
  }),
  void: new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.void.map,
    bumpMap: TOWER_WALL_TEXTURES.void.bump,
    bumpScale: 0.38,
    emissive: 0xc055ff,
    emissiveMap: TOWER_WALL_TEXTURES.void.emissive,
    emissiveIntensity: 1.65,
    roughness: 0.62,
    metalness: 0.25,
    side: THREE.BackSide
  })
};

const towerWallMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(30.8, 30.8, 220, 36, 1, true),
  TOWER_WALL_MATERIALS.ash
);
towerWallMesh.position.y = 80;
scene.add(towerWallMesh);
towerWallMesh.matrixAutoUpdate = false;
towerWallMesh.updateMatrix();

// Полупрозрачный внутренний слой голубого льда (для Ледяной башни — создаёт глубину толщи льда поверх вмёрзших силуэтов)
const iceInnerGlazeMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(29.95, 29.95, 220, 36, 1, true),
  new THREE.MeshStandardMaterial({
    map: TOWER_WALL_TEXTURES.ice.map,
    color: 0x90d8ff,
    emissive: 0x2878b8,
    emissiveIntensity: 0.45,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.28,
    side: THREE.BackSide,
    depthWrite: false
  })
);
iceInnerGlazeMesh.position.y = 80;
iceInnerGlazeMesh.visible = false;
scene.add(iceInnerGlazeMesh);
iceInnerGlazeMesh.matrixAutoUpdate = false;
iceInnerGlazeMesh.updateMatrix();

let currentTowerTheme = TOWERS.ash;

/**
 * Анимирует угрозу снизу, пульсацию трещин/рун на стенах и парящие элементы башни.
 * @param {number} time
 * @param {number} dt
 */
function updateEnvironmentVisuals(time, dt) {
  hazardEffectsGroup.position.y = lavaMesh.position.y;
  const towerId = currentTowerTheme ? currentTowerTheme.id : 'ash';

  if (towerId === 'ash') {
    const wallMat = TOWER_WALL_MATERIALS.ash;
    wallMat.emissiveIntensity = 1.35 + Math.sin(time * 2.2) * 0.28;
    const glowDisc = hazardAshGroup.userData.glowDisc;
    if (glowDisc) {
      glowDisc.rotation.z = time * 0.06;
      glowDisc.material.opacity = 0.32 + Math.sin(time * 3.1) * 0.1;
    }
    const crustRocks = hazardAshGroup.userData.crustRocks;
    if (crustRocks) {
      for (let i = 0; i < crustRocks.length; i++) {
        const rock = crustRocks[i];
        const ud = rock.userData;
        const a = ud.baseAngle + time * 0.03 * (i % 2 ? 1 : -1);
        rock.position.x = Math.cos(a) * ud.radius;
        rock.position.z = Math.sin(a) * ud.radius;
        rock.position.y = 0.1 + Math.sin(time * 1.8 + ud.phase) * 0.08;
      }
    }
  } else if (towerId === 'ice') {
    const wallMat = TOWER_WALL_MATERIALS.ice;
    wallMat.emissiveIntensity = 1.05 + Math.sin(time * 1.6) * 0.18;
    const rings = hazardIceGroup.userData.funnelRings;
    if (rings) {
      rings[0].rotation.z = time * 0.55;
      rings[1].rotation.z = -time * 0.38;
      rings[2].rotation.z = time * 0.25;
    }
  } else if (towerId === 'void') {
    // Руны на стенах мерцают и гаснут
    const wallMat = TOWER_WALL_MATERIALS.void;
    wallMat.emissiveIntensity =
      1.45 + Math.sin(time * 2.4) * 0.45 + Math.cos(time * 5.7) * 0.18;
    const vRings = hazardVoidGroup.userData.vortexRings;
    if (vRings) {
      vRings[0].rotation.z = time * 0.7;
      vRings[1].rotation.z = -time * 0.45;
      vRings[2].rotation.z = time * 0.28;
    }
    const abyssStars = hazardVoidGroup.userData.abyssStars;
    if (abyssStars) {
      abyssStars.rotation.y = time * 0.08;
      abyssStars.material.opacity = 0.6 + Math.sin(time * 4.2) * 0.3;
    }
  }

  // Анимация динамических элементов башни (парящие обломки Пустоты, потоки лавы, туман)
  if (typeof updateTowerDecorAnimations === 'function') {
    updateTowerDecorAnimations(time, dt, towerId);
  }
}

/**
 * Применяет цветовую и визуальную тему выбранной башни к сцене.
 * @param {object} towerConfig
 */
function applyTowerTheme(towerConfig) {
  currentTowerTheme = towerConfig;
  const id = towerConfig.id;

  lavaMesh.material = LAVA_MATERIALS[id];
  towerWallMesh.material = TOWER_WALL_MATERIALS[id];
  iceInnerGlazeMesh.visible = id === 'ice';

  hazardAshGroup.visible = id === 'ash';
  hazardIceGroup.visible = id === 'ice';
  hazardVoidGroup.visible = id === 'void';

  scene.background = BACKGROUND_TEXTURES[id];
  scene.fog.color.setHex(towerConfig.fogColor);
  scene.fog.density = towerConfig.fogDensity;

  hemiLight.color.setHex(towerConfig.hemiSkyColor);
  hemiLight.groundColor.setHex(towerConfig.hemiGroundColor);
  if (towerConfig.dirLightColor) {
    dirLight.color.setHex(towerConfig.dirLightColor);
  }
  if (towerConfig.dirLightIntensity !== undefined) {
    dirLight.intensity = towerConfig.dirLightIntensity;
  }
  lavaLight.color.setHex(towerConfig.lavaLightColor);
  if (towerConfig.lavaLightIntensity !== undefined) {
    lavaLight.intensity = towerConfig.lavaLightIntensity;
  }
  if (towerConfig.rimLightColor) {
    rimLight.color.setHex(towerConfig.rimLightColor);
  }

  if (typeof dustMat !== 'undefined' && towerConfig.dustColor) {
    dustMat.color.setHex(towerConfig.dustColor);
    dustMat.size = towerConfig.dustSize || 0.32;
    dustMat.opacity = towerConfig.dustOpacity || 0.6;
  }
}
