/* ==========================================================================
   Модель игрока и базовое окружение башни (лава, внешние стены, темы башен)
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

// Плоскость поднимающейся лавы / метели / бездны
const lavaMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  new THREE.MeshStandardMaterial({
    map: lavaTexture,
    emissive: 0xff7722,
    emissiveMap: lavaTexture,
    emissiveIntensity: 2,
    roughness: 0.6
  })
);
lavaMesh.rotation.x = -Math.PI / 2;
scene.add(lavaMesh);

// Цилиндрическая внешняя стена башни
const towerWallMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(30.5, 30.5, 220, 28, 1, true),
  new THREE.MeshStandardMaterial({
    map: brickTexture,
    side: THREE.BackSide,
    roughness: 0.95
  })
);
towerWallMesh.position.y = 80;
scene.add(towerWallMesh);
towerWallMesh.matrixAutoUpdate = false;
towerWallMesh.updateMatrix();

// Материалы лавы/метели/бездны по башням
const LAVA_MATERIALS = {
  ash: lavaMesh.material,
  ice: new THREE.MeshStandardMaterial({
    map: iceLavaTexture,
    emissive: 0x5ab0ff,
    emissiveMap: iceLavaTexture,
    emissiveIntensity: 1.4,
    roughness: 0.6
  }),
  void: new THREE.MeshStandardMaterial({
    map: voidLavaTexture,
    emissive: 0xa040ff,
    emissiveMap: voidLavaTexture,
    emissiveIntensity: 1.6,
    roughness: 0.6
  })
};

let currentTowerTheme = TOWERS.ash;

/**
 * Применяет цветовую и визуальную тему выбранной башни к сцене.
 * @param {object} towerConfig
 */
function applyTowerTheme(towerConfig) {
  currentTowerTheme = towerConfig;
  lavaMesh.material = LAVA_MATERIALS[towerConfig.id];
  scene.background = BACKGROUND_TEXTURES[towerConfig.id];
  scene.fog.color.setHex(towerConfig.fogColor);
  scene.fog.density = towerConfig.fogDensity;
  hemiLight.color.setHex(towerConfig.hemiSkyColor);
  hemiLight.groundColor.setHex(towerConfig.hemiGroundColor);
  lavaLight.color.setHex(towerConfig.lavaLightColor);
}
