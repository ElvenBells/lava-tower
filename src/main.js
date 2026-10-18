/* ==========================================================================
   Точка входа (main.js):
   генерация фоновой башни для главного меню, предварительная компиляция шейдеров
   и главный игровой цикл с адаптивным разрешением и фиксированным шагом физики
   ========================================================================== */

let lastFrameTimestamp = 0;
let physicsAccumulator = 0;
let frameDelta = 0;
let averageFrameTimeMs = 16;
let pixelRatioCheckTick = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  let rawDelta = (timestamp - lastFrameTimestamp) / 1000;
  lastFrameTimestamp = timestamp;
  if (!(rawDelta > 0) || rawDelta > 0.25) {
    rawDelta = 1 / 60;
  }
  frameDelta = Math.min(0.1, rawDelta);

  averageFrameTimeMs += (rawDelta * 1000 - averageFrameTimeMs) * 0.05;
  if (++pixelRatioCheckTick >= 180) {
    pixelRatioCheckTick = 0;
    if (averageFrameTimeMs > 26 && currentPixelRatio > 1) {
      currentPixelRatio = 1;
      applyPixelRatio();
    } else if (averageFrameTimeMs < 14 && currentPixelRatio < maxPixelRatio) {
      currentPixelRatio = Math.min(maxPixelRatio, currentPixelRatio + 0.25);
      applyPixelRatio();
    }
  }

  lavaTexture.offset.x += frameDelta * 0.05;
  lavaTexture.offset.y += frameDelta * 0.03;
  iceLavaTexture.offset.x += frameDelta * 0.09;
  iceLavaTexture.offset.y += frameDelta * 0.06;
  voidLavaTexture.offset.x -= frameDelta * 0.035;
  voidLavaTexture.offset.y += frameDelta * 0.04;

  if (state && !state.isGameOver) {
    playerMesh.visible = true;
    if (!state.pauseState) {
      physicsAccumulator += frameDelta;
      if (physicsAccumulator > 0.1) {
        physicsAccumulator = 0.1;
      }
      let iterations = 0;
      while (
        physicsAccumulator >= 1 / 60 &&
        !state.pauseState &&
        !state.isGameOver &&
        iterations < 4
      ) {
        updateGameStep(1 / 60);
        physicsAccumulator -= 1 / 60;
        iterations++;
      }
      if (iterations >= 4) {
        physicsAccumulator = 0;
      }
    }
    if (!state.isGameOver) {
      renderGameFrame(frameDelta);
    }
  } else {
    const menuTime = timestamp * 0.001;
    playerMesh.visible = false;
    playerFireballInstancedMesh.count = 0;
    playerFireballCrustInstancedMesh.count = 0;
    enemyProjectileInstancedMesh.count = 0;
    orbitalBladeInstancedMesh.count = 0;
    orbitalBladeCoreInstancedMesh.count = 0;
    orbitalBladeTrailInstancedMesh.count = 0;
    if (typeof orbitalDefenseGroup !== 'undefined') {
      orbitalDefenseGroup.visible = false;
    }
    pickupInstancedMesh.count = 0;
    healPickupInstancedMesh.count = 0;
    goldPickupInstancedMesh.count = 0;
    lavaMesh.position.y = -4.5;
    lavaLight.position.set(0, 6, 0);

    // Плавный переход предпросмотра Бури в меню
    const targetMenuStorm = window.menuStormPreviewActive ? 1.0 : 0.0;
    window.menuStormPreviewFactor =
      (window.menuStormPreviewFactor || 0) +
      (targetMenuStorm - (window.menuStormPreviewFactor || 0)) * Math.min(1, frameDelta * 2.5);

    camera.position.set(
      Math.sin(timestamp * 0.00022) * 23,
      16 + Math.sin(timestamp * 0.00015) * 6,
      Math.cos(timestamp * 0.00022) * 23
    );
    camera.lookAt(0, 11 + Math.sin(timestamp * 0.00015) * 3, 0);

    if (typeof updateEnvironmentVisuals === 'function') {
      updateEnvironmentVisuals(menuTime, frameDelta);
    }
    if (typeof updateVfxStatusBanner === 'function') {
      updateVfxStatusBanner();
    }

    renderSceneWithPostProcessing();
  }
}

applyTowerTheme(TOWERS[selectedTowerId] || TOWERS.ash);
buildTower(hashString('lava' + getCurrentDateCode() + selectedTowerId));

// Прогрев шейдеров: компилируем мобов и боссов выбранной башни на старте
(function prewarmShaders() {
  const prewarmedMeshes = [];
  const initTowerId = selectedTowerId || 'ash';
  for (const mobType of ['s', 'r', 'l', 't']) {
    const mesh = MobFactory.acquire(mobType, undefined, initTowerId);
    mesh.position.set(0, -80, 0);
    scene.add(mesh);
    prewarmedMeshes.push([mobType, mesh]);
  }
  for (const bossKind of ['golem', 'womb', 'koloss']) {
    const mesh = MobFactory.acquire('b', bossKind, initTowerId);
    mesh.position.set(0, -80, 0);
    scene.add(mesh);
    prewarmedMeshes.push(['b', mesh]);
  }
  try {
    renderer.compile(scene, camera);
  } catch (err) {
    // Игнорируем возможные ошибки компиляции в нестандартных WebGL-окружениях
  }
  for (const [mobType, mesh] of prewarmedMeshes) {
    MobFactory.release(mobType, mesh);
  }
})();

showMainMenu();
requestAnimationFrame(gameLoop);
