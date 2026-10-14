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

/**
 * Главный цикл приложения (requestAnimationFrame).
 * Ограничивает число догоняющих шагов физики (предотвращает «спираль смерти»)
 * и плавно адаптирует pixelRatio при устойчивых просадках FPS.
 * @param {number} timestamp
 */
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  let rawDelta = (timestamp - lastFrameTimestamp) / 1000;
  lastFrameTimestamp = timestamp;
  if (!(rawDelta > 0) || rawDelta > 0.25) {
    rawDelta = 1 / 60; // Защита от скачка времени после возврата из неактивной вкладки
  }
  frameDelta = Math.min(0.1, rawDelta);

  // Адаптивное разрешение рендера
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

  // Анимация текстуры лавы / метели / бездны
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
    // Фоновый пролёт камеры вокруг выбранной башни в главном меню
    const menuTime = timestamp * 0.001;
    playerMesh.visible = false;
    playerFireballInstancedMesh.count = 0;
    enemyProjectileInstancedMesh.count = 0;
    orbitalBladeInstancedMesh.count = 0;
    pickupInstancedMesh.count = 0;
    lavaMesh.position.y = -4.5;
    lavaLight.position.set(0, 6, 0);

    if (typeof updateEnvironmentVisuals === 'function') {
      updateEnvironmentVisuals(menuTime, frameDelta);
    }

    // Атмосферные частицы в меню
    dustParticles.rotation.y += frameDelta * 0.08;

    camera.position.set(
      Math.sin(timestamp * 0.00022) * 23,
      16 + Math.sin(timestamp * 0.00015) * 6,
      Math.cos(timestamp * 0.00022) * 23
    );
    camera.lookAt(0, 11 + Math.sin(timestamp * 0.00015) * 3, 0);
    renderer.render(scene, camera);
  }
}

// Применяем тему выбранной башни и генерируем её для фона главного меню
applyTowerTheme(TOWERS[selectedTowerId] || TOWERS.ash);
buildTower(hashString('lava' + getCurrentDateCode() + selectedTowerId));

// Прогрев шейдеров: компилируем все типы мобов и боссов один раз на старте,
// чтобы первый спавн во время игры не вызывал микрофриз
(function prewarmShaders() {
  const prewarmedMeshes = [];
  for (const mobType of ['s', 'r', 'l', 't']) {
    const mesh = MobFactory.acquire(mobType);
    mesh.position.set(0, -80, 0);
    scene.add(mesh);
    prewarmedMeshes.push([mobType, mesh]);
  }
  for (const bossKind of ['golem', 'womb', 'koloss']) {
    const mesh = MobFactory.acquire('b', bossKind);
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

// Запускаем главное меню и цикл рендера
showMainMenu();
requestAnimationFrame(gameLoop);
