/* ==========================================================================
   Интерфейс пользователя (UI):
   главное меню, выбор числа игроков (1–4, масштаб 15×15 / 19×19 / 23×23),
   выбор структуры забега (3 Акта на 24/18 этажей или 1 Акт на 12 этажей),
   выбор башни и героя, кузница, карточки наград, пакты, пауза и таблица рекордов
   ========================================================================== */

/* ---------- 1. Загрузка и нормализация сохранений localStorage ---------- */

let leaderboard = storage.get('lt_lb');
if (!Array.isArray(leaderboard)) {
  leaderboard = [];
}

let playerNickname = storage.get('lt_nick');
if (typeof playerNickname !== 'string') {
  playerNickname = 'Игрок';
}

let rawMeta = storage.get('lt_meta');
if (!rawMeta || typeof rawMeta !== 'object' || !rawMeta.u) {
  rawMeta = { u: { wan: 1 }, tu: { ash: 1 }, f: {}, a: 0 };
}
rawMeta.u.wan = 1;
if (!rawMeta.tu) rawMeta.tu = {};
rawMeta.tu.ash = 1;
rawMeta.tu.ice = 1;
rawMeta.tu.void = 1;
if (!rawMeta.f) rawMeta.f = {};
if (!rawMeta.a) rawMeta.a = 0;

const metaProgress = {
  get raw() {
    return rawMeta;
  },
  get unlockedHeroes() {
    return rawMeta.u;
  },
  get unlockedTowers() {
    return rawMeta.tu;
  },
  get forge() {
    return rawMeta.f;
  },
  get ash() {
    return rawMeta.a;
  },
  set ash(val) {
    rawMeta.a = val;
  },
  save() {
    storage.set('lt_meta', rawMeta);
  }
};

let selectedHeroId = storage.get('lt_hero');
if (!HEROES[selectedHeroId] || !metaProgress.unlockedHeroes[selectedHeroId]) {
  selectedHeroId = 'wan';
}

let selectedTowerId = storage.get('lt_tower');
if (!TOWERS[selectedTowerId] || !metaProgress.unlockedTowers[selectedTowerId]) {
  selectedTowerId = 'ash';
}

let selectedPlayerCount = Number(storage.get('lt_pcount')) || 2;
if (![1, 2, 3, 4].includes(selectedPlayerCount)) {
  selectedPlayerCount = 2;
}

let selectedCampaignModeId = storage.get('lt_camp') || 'acts3_24';
if (typeof RUN_CAMPAIGN_MODES !== 'undefined' && !RUN_CAMPAIGN_MODES[selectedCampaignModeId]) {
  selectedCampaignModeId = 'acts3_24';
}

function saveNicknameFromInput() {
  const inputEl = getById('nk');
  if (inputEl && inputEl.value) {
    playerNickname = inputEl.value.slice(0, 16);
    storage.set('lt_nick', playerNickname);
  }
}

/* ---------- 2. Выбор числа игроков (масштаб сетки), режима 3 актов, героев и Кузница ---------- */

function selectPlayerCount(count) {
  saveNicknameFromInput();
  selectedPlayerCount = Math.max(1, Math.min(4, count | 0));
  storage.set('lt_pcount', selectedPlayerCount);
  buildTower(
    hashString('lava' + getCurrentDateCode() + selectedTowerId),
    selectedPlayerCount,
    selectedCampaignModeId
  );
  showMainMenu();
}

function selectCampaignMode(modeId) {
  saveNicknameFromInput();
  if (RUN_CAMPAIGN_MODES[modeId]) {
    selectedCampaignModeId = modeId;
    storage.set('lt_camp', modeId);
    buildTower(
      hashString('lava' + getCurrentDateCode() + selectedTowerId),
      selectedPlayerCount,
      selectedCampaignModeId
    );
  }
  showMainMenu();
}

function buildCoopAndCampaignSelectHtml() {
  const btnStyle = 'font-size:12.5px;padding:6px 12px;margin:4px 0;';
  const smallStyle = 'font-family:Rubik;font-weight:400';

  const coopButtons = [1, 2, 3, 4]
    .map((cnt) => {
      const preset = COOP_SCALE_PRESETS[cnt];
      const isSel = selectedPlayerCount === cnt;
      return (
        `<button onclick="selectPlayerCount(${cnt})" style="display:inline-block;width:48%;margin:1%;padding:7px 10px;font-size:12px;${isSel ? 'border-color:#45fff0;background:#163d3a' : ''}">` +
        `${isSel ? '▶ ' : ''}${cnt} игр. · ${preset.gridDim}×${preset.gridDim}<br>` +
        `<small style="${smallStyle};opacity:.85">Радиус ${preset.radiusMeters} м</small>` +
        `</button>`
      );
    })
    .join('');

  const campButtons = Object.values(RUN_CAMPAIGN_MODES)
    .map((m) => {
      const isSel = selectedCampaignModeId === m.id;
      return (
        `<button onclick="selectCampaignMode('${m.id}')" style="${btnStyle}${isSel ? 'border-color:#ffd040;background:#4a1d0f' : ''}">` +
        `${isSel ? '▶ ' : ''}${m.name}<br>` +
        `<small style="${smallStyle};opacity:.85">${m.description}</small>` +
        `</button>`
      );
    })
    .join('');

  return (
    `<h4>Масштаб этажа (Кооп 1–4 игрока)</h4><div>${coopButtons}</div>` +
    `<h4>Структура забега (3 Акта / 1 Акт)</h4>${campButtons}`
  );
}

function unlockHero(heroId) {
  if (metaProgress.unlockedHeroes[heroId]) return;
  metaProgress.unlockedHeroes[heroId] = 1;
  metaProgress.save();
  showToast('🔓 Открыт герой: ' + HEROES[heroId].name, 3.4);
  playSound('win');
}

function selectHero(heroId) {
  saveNicknameFromInput();
  selectedHeroId = heroId;
  storage.set('lt_hero', heroId);
  showMainMenu();
}

function buildHeroSelectHtml() {
  const buttonStyle = 'font-size:13px;padding:7px 14px;';
  const smallStyle = 'font-family:Rubik;font-weight:400';

  return (
    '<h4>Герой</h4>' +
    Object.entries(HEROES)
      .map(([heroId, hero]) => {
        const isUnlocked = metaProgress.unlockedHeroes[heroId];
        const isSelected = selectedHeroId === heroId;
        if (isUnlocked) {
          return (
            `<button onclick="selectHero('${heroId}')" style="${buttonStyle}${isSelected ? 'border-color:#ffd040;background:#4a1d0f' : ''}">` +
            `${isSelected ? '▶ ' : ''}${hero.name} ` +
            `<small style="${smallStyle};opacity:.8">· ${WEAPONS[hero.startWeapon].name}</small><br>` +
            `<small style="${smallStyle};opacity:.85">${hero.description}</small>` +
            `</button>`
          );
        }
        return (
          `<button disabled style="${buttonStyle}opacity:.5;cursor:default">` +
          `🔒 ${hero.name}<br><small style="${smallStyle}">${hero.unlockCondition}</small>` +
          `</button>`
        );
      })
      .join('')
  );
}

function unlockNextTower(completedTowerId) {
  const nextTowerMap = { ash: 'ice', ice: 'void' };
  const nextId = nextTowerMap[completedTowerId];
  if (!nextId || metaProgress.unlockedTowers[nextId]) return '';
  metaProgress.unlockedTowers[nextId] = 1;
  metaProgress.save();
  return '<p style="color:#ffd040">🔓 Открыта: ' + TOWERS[nextId].name + '</p>';
}

function selectTower(towerId) {
  saveNicknameFromInput();
  selectedTowerId = towerId;
  storage.set('lt_tower', towerId);
  if (TOWERS[towerId]) {
    applyTowerTheme(TOWERS[towerId]);
    buildTower(
      hashString('lava' + getCurrentDateCode() + towerId),
      selectedPlayerCount,
      selectedCampaignModeId
    );
  }
  showMainMenu();
}

function unlockAllTowersForPreview() {
  saveNicknameFromInput();
  metaProgress.unlockedTowers.ash = 1;
  metaProgress.unlockedTowers.ice = 1;
  metaProgress.unlockedTowers.void = 1;
  metaProgress.save();
  playSound('win');
  showToast('🔓 Все 3 башни открыты!', 2.4);
  showMainMenu();
}

function buildTowerSelectHtml() {
  const buttonStyle = 'font-size:13px;padding:7px 14px;';
  const smallStyle = 'font-family:Rubik;font-weight:400';
  const hasLockedTowers = TOWER_IDS.some((id) => !metaProgress.unlockedTowers[id]);

  return (
    '<h4>Стартовая башня (и предпросмотр в меню)</h4>' +
    TOWER_IDS.map((towerId) => {
      const tower = TOWERS[towerId];
      const isUnlocked = metaProgress.unlockedTowers[towerId];
      const isSelected = selectedTowerId === towerId;
      if (isUnlocked) {
        return (
          `<button onclick="selectTower('${towerId}')" style="${buttonStyle}${isSelected ? 'border-color:#ffd040;background:#4a1d0f' : ''}">` +
          `${isSelected ? '▶ ' : ''}${tower.name}<br>` +
          `<small style="${smallStyle};opacity:.85">${tower.description}</small>` +
          `</button>`
        );
      }
      return (
        `<button disabled style="${buttonStyle}opacity:.5;cursor:default">` +
        `🔒 ${tower.name}<br><small style="${smallStyle}">${tower.unlockCondition}</small>` +
        `</button>`
      );
    }).join('') +
    (hasLockedTowers
      ? `<button onclick="unlockAllTowersForPreview()" style="font-size:12px;padding:5px 12px;opacity:.85">👁 Открыть все башни (осмотр и игра)</button>`
      : '')
  );
}

function openForgeMenu() {
  saveNicknameFromInput();
  const buttonStyle = 'font-size:13px;padding:7px 14px;';
  const smallStyle = 'font-family:Rubik;font-weight:400';

  getById('pn').innerHTML =
    `<h2>КУЗНИЦА</h2><p>Пепел: <b style="color:var(--accent)">${metaProgress.ash | 0}</b></p>` +
    Object.entries(FORGE_UPGRADES)
      .map(([upgradeKey, upgrade]) => {
        const currentLv = metaProgress.forge[upgradeKey] | 0;
        const isMaxed = currentLv >= upgrade.maxLevel;
        const nextCost = upgrade.costs[currentLv];
        const isDisabled = isMaxed || (metaProgress.ash | 0) < nextCost;
        const levelLabel = isMaxed
          ? 'MAX'
          : `${currentLv}/${upgrade.maxLevel} · ${nextCost} пепла`;

        return (
          `<button ${isDisabled ? 'disabled' : ''} onclick="buyForgeUpgrade('${upgradeKey}')" style="${buttonStyle}${isDisabled ? 'opacity:.55;cursor:default' : ''}">` +
          `${upgrade.name} <small style="${smallStyle}">· ${levelLabel}</small><br>` +
          `<small style="${smallStyle};opacity:.85">${upgrade.description}</small>` +
          `</button>`
        );
      })
      .join('') +
    `<button onclick="showMainMenu()">← НАЗАД</button>`;

  getById('ov').style.display = 'flex';
}

function buyForgeUpgrade(upgradeKey) {
  const upgrade = FORGE_UPGRADES[upgradeKey];
  const currentLv = metaProgress.forge[upgradeKey] | 0;
  if (currentLv >= upgrade.maxLevel || (metaProgress.ash | 0) < upgrade.costs[currentLv]) {
    return;
  }
  metaProgress.ash -= upgrade.costs[currentLv];
  metaProgress.forge[upgradeKey] = currentLv + 1;
  metaProgress.save();
  playSound('pickup');
  openForgeMenu();
}

/* ---------- 3. Пауза, быстрые телепорты тестирования механик, выбор наград и алтари ---------- */

function debugTeleportToBalcony() {
  if (!state || state.isGameOver) return;
  const f = state.maxFloorReached;
  const bals = (typeof balconiesByFloor !== 'undefined' && balconiesByFloor[f]) || [];
  if (bals.length > 0) {
    const b = bals[0];
    state.player.x = b.centerX;
    state.player.y = b.y + 0.1;
    state.player.z = b.centerZ;
    state.player.vy = 0;
    state.player.lastGroundY = b.y;
    resumeGame();
    showToast('🎯 Телепорт на полуэтаж-балкон (floorY + 6 м)!', 2.6);
  } else {
    resumeGame();
  }
}

function debugTeleportToSplitFloor() {
  if (!state || state.isGameOver) return;
  const targetForkFloor = [1, 5, 9, 13, 17, 21].find((fl) => fl >= state.maxFloorReached) || 1;
  const floorY = targetForkFloor * 14;
  state.player.x = 0;
  state.player.y = floorY + 0.1;
  state.player.z = 0;
  state.player.vy = 0;
  state.player.lastGroundY = floorY;
  state.maxFloorReached = targetForkFloor;
  state.lavaY = floorY - 8;
  resumeGame();
  onFloorEnter();
}

function debugTeleportToForgeHall() {
  if (!state || state.isGameOver) return;
  const fhKeys = Object.keys(forgeHallsByFloor).map(Number);
  if (!fhKeys.length) {
    resumeGame();
    return;
  }
  const fKey = fhKeys.find((k) => k >= state.maxFloorReached) ?? fhKeys[0];
  const fh = forgeHallsByFloor[fKey];
  if (fh) {
    openBossGate(fh.bossFloor);
    state.activeForgeHallFloor = fh.bossFloor;
    state.isLavaPausedByForgeHall = 1;
    state.maxFloorReached = fh.bossFloor;
    state.player.x = fh.hallX;
    state.player.y = fh.hallY + 0.15;
    state.player.z = fh.hallZ;
    state.player.vy = 0;
    state.player.lastGroundY = fh.hallY;
    state.lavaY = fh.bossFloor * 14 - 4;
    resumeGame();
    showToast('⚒ Вы в безопасном «Зале Кузницы»! Лава на паузе до сбора отряда на плите.', 3.8);
  }
}

let _debugQuestCycleIdx = 0;
function debugCycleFloorMiniQuest() {
  if (!state || state.isGameOver) return;
  const f = state.maxFloorReached;
  const types = ['rune_circles', 'seal_guardians', 'forge_core'];
  const nextType = types[_debugQuestCycleIdx++ % types.length];
  startFloorMiniQuest(f, nextType);
  resumeGame();
  showToast(
    '🔒 ТЕСТ ПЕЧАТИ: ' +
      ((FLOOR_MINI_QUESTS[nextType] && FLOOR_MINI_QUESTS[nextType].name) || nextType) +
      ' — ' +
      ((FLOOR_MINI_QUESTS[nextType] && FLOOR_MINI_QUESTS[nextType].description) || ''),
    3.8
  );
}

let _debugCoopEventToggle = 0;
function debugCycleCoopFloorEvent() {
  if (!state || state.isGameOver) return;
  const keys = ['chain', 'polar', 'hunt', 'gold', 'storm', 'surge'];
  const nextKey = keys[_debugCoopEventToggle++ % keys.length];
  if (state.activeEvent) endFloorEvent(1);
  startFloorEvent(nextKey);
  resumeGame();
  showToast(
    '⚡ ТЕСТ СОБЫТИЯ: ' +
      ((FLOOR_EVENTS[nextKey] && FLOOR_EVENTS[nextKey].name) || nextKey) +
      ' — ' +
      ((FLOOR_EVENTS[nextKey] && FLOOR_EVENTS[nextKey].description) || ''),
    3.8
  );
}

let _debugEmberTargetToggle = 0;
function debugTriggerFadingEmberTest() {
  if (!state || state.isGameOver) return;
  resumeGame();
  if (state.coopPeers && state.coopPeers.length > 0 && _debugEmberTargetToggle++ % 2 === 0) {
    const peer = state.coopPeers[0];
    peer.x = state.player.x + 2.2;
    peer.y = state.player.lastGroundY;
    peer.z = state.player.z;
    triggerPeerFadingEmber(peer);
  } else {
    if ((state.playerCount || 1) < 2) {
      showToast('🕯 Для теста «Угасающего угля» выберите 2–4 игроков (сейчас создаём уголь союзника)', 3.0);
      return;
    }
    triggerPlayerFadingEmberOrGameOver();
  }
}

let _debugWeaponPairIdx = 0;
function debugCycleWeaponLoadoutPair() {
  if (!state || state.isGameOver) return;
  const pairs = [
    ['spear', 'chain'],
    ['grav', 'wave'],
    ['totem', 'shield'],
    ['fire', 'scythe'],
    ['blade', 'spear']
  ];
  const pair = pairs[_debugWeaponPairIdx++ % pairs.length];
  state.weaponLevels = {};
  state.weaponCooldowns = {};
  state.weaponLevels[pair[0]] = 3;
  state.weaponLevels[pair[1]] = 3;
  if (typeof clearCombatDeployables === 'function') clearCombatDeployables();
  recalculatePlayerTagCounts();
  resumeGame();
  showToast(
    `⚔ ТЕСТ СЛОТОВ (2/${MAX_WEAPON_SLOTS}): ${WEAPONS[pair[0]].name} (ур. 3) + ${WEAPONS[pair[1]].name} (ур. 3)`,
    3.6
  );
}

let _debugReactionDemoIdx = 0;
function debugTriggerElementalReactionShowcase() {
  if (!state || state.isGameOver) return;
  resumeGame();
  const reactionOrder = ['steam', 'superconduct', 'slag', 'collapse'];
  const rKey = reactionOrder[_debugReactionDemoIdx++ % reactionOrder.length];
  const p = state.player;
  const forwardX = -Math.sin(state.cameraYaw) * 6.5;
  const forwardZ = -Math.cos(state.cameraYaw) * 6.5;
  const tx = p.x + forwardX;
  const tz = p.z + forwardZ;

  // Убедимся, что перед игроком есть группа мобов для наглядной демонстрации реакции
  const demoEnemies = [];
  for (let i = 0; i < 3; i++) {
    const ang = (i * TWO_PI) / 3;
    const e = spawnEnemy('t', tx + Math.cos(ang) * 1.8, tz + Math.sin(ang) * 1.8, 1.5);
    e.isRising = false;
    e.y = p.lastGroundY;
    demoEnemies.push(e);
  }
  const primary = demoEnemies[0];

  if (rKey === 'steam') {
    for (const e of demoEnemies) e.slowTimer = 4.0;
    damageEnemy(primary, BASE_DAMAGE * 1.5, ['fire'], 1, 0);
  } else if (rKey === 'superconduct') {
    for (const e of demoEnemies) e.slowTimer = 4.5;
    damageEnemy(primary, BASE_DAMAGE * 1.4, ['elec'], 0, 0);
  } else if (rKey === 'slag') {
    for (const e of demoEnemies) e.burnTimer = 4.0;
    damageEnemy(primary, BASE_DAMAGE * 1.4, ['kin'], 0, 0, { isHeavyMelee: 1, canDetonateSlag: 1 });
  } else {
    for (const e of demoEnemies) {
      e.pullTimer = 3.0;
      e.slowTimer = 3.0;
    }
    if (typeof spawnGravitySphereEntity === 'function') {
      spawnGravitySphereEntity(p.x, p.y, p.z, tx, p.lastGroundY, tz, 3);
    }
    damageEnemy(primary, BASE_DAMAGE * 1.6, ['kin', 'void'], 0, 0, { isHeavyMelee: 1 });
  }
}

let _debugRelicBuildIdx = 0;
function debugCycleTradeoffAndVerticalBuild() {
  if (!state || state.isGameOver) return;
  const presets = [
    { key: 'lead', msg: '⚖ Свинцовые наплечники: +60% урона и анти-отталкивание, но −25% скорости и без двойного прыжка' },
    { key: 'glass', msg: '⚖ Стеклянный горн: итоговый урон ×1.8, но получаемый урон ×2.0' },
    { key: 'heart', msg: '🌋 Роль «Нижний страж» (Лавовое сердце): у лавы +45% урона, −40% ожога и замедление лавы −22%' },
    { key: 'comp', msg: '🎯 Роль «Верхний стрелок» (Компас высоты): до +65% урона на высоте и ×1.35 крит с балкона' },
    { key: 'cryo_core', msg: '⚖ Криогенный реактор: +40% темпа атак и авто-заморозка, но макс. HP −25% и без регена' },
    { key: 'void_shackle', msg: '⚖ Кандалы Пустоты: +45% радиуса взрывов и +35% урона по замедленным, но КД рывка ×1.8' }
  ];
  const chosen = presets[_debugRelicBuildIdx++ % presets.length];
  state.itemsOwned[chosen.key] = (state.itemsOwned[chosen.key] || 0) + 1;
  recalculatePlayerTagCounts();
  resumeGame();
  showToast(chosen.msg, 3.8);
}

function recalculatePlayerTagCounts() {
  if (!state) return;
  state.tagCounts = {};
  for (const wKey in state.weaponLevels) {
    if (state.weaponLevels[wKey] > 0 && WEAPONS[wKey] && WEAPONS[wKey].tags) {
      for (const tag of WEAPONS[wKey].tags) {
        state.tagCounts[tag] = (state.tagCounts[tag] || 0) + 1;
      }
    }
  }
  for (const itemKey in state.itemsOwned) {
    if (ITEMS[itemKey] && ITEMS[itemKey].tags) {
      for (const tag of ITEMS[itemKey].tags) {
        state.tagCounts[tag] = (state.tagCounts[tag] || 0) + state.itemsOwned[itemKey];
      }
    }
  }
}

function debugTriggerHotbarOfferTest() {
  if (!state || state.isGameOver) return;
  state.rerollsLeft = Math.max(1, state.rerollsLeft || 0);
  resumeGame();
  showUpgradeOfferModal(0, 'test-hotbar-' + (++state.offerSeq));
  showToast('🎴 Хотбар наград открыт внизу экрана! Выбирайте на бегу клавишами 1, 2, 3 или R (без паузы)', 3.6);
}

function debugTeleportToGuildChest() {
  if (!state || state.isGameOver) return;
  const f = state.maxFloorReached;
  let gChest = chests.find((c) => c.isGuildChest && !c.isOpen && c.floor === f);
  if (!gChest) {
    gChest = chests.find((c) => c.isGuildChest && !c.isOpen);
  }
  state.gold += 15;
  if (gChest) {
    state.player.x = gChest.x;
    state.player.y = gChest.y + 0.1;
    state.player.z = gChest.z + 1.8;
    state.player.vy = 0;
    state.player.lastGroundY = gChest.y;
    resumeGame();
    triggerPlayer3DPing('guild_chest');
    showToast('🏛 Телепорт к «Сундуку гильдии» (+15 золота)! Союзники уже бегут скинуться в складчину!', 3.8);
  } else {
    resumeGame();
    showToast('🪙 +15 золота выдано! Все Сундуки гильдии уже открыты', 2.6);
  }
}

let _debugPactToggle = 0;
function debugTriggerPactTest() {
  if (!state || state.isGameOver) return;
  resumeGame();
  const isGlobal = _debugPactToggle++ % 2 === 0;
  if (isGlobal) {
    const globalKeys = ['rage', 'greed', 'swift'];
    const pKey = globalKeys[_debugPactToggle % globalKeys.length];
    openPactModal({
      x: state.player.x,
      y: state.player.lastGroundY,
      z: state.player.z,
      floor: state.maxFloorReached,
      isOpen: 0,
      group: { visible: true },
      pactKey: pKey,
      pactScope: 'global'
    });
  } else {
    const persKeys = ['blood', 'frail'];
    const pKey = persKeys[_debugPactToggle % persKeys.length];
    openPactModal({
      x: state.player.x,
      y: state.player.lastGroundY,
      z: state.player.z,
      floor: state.maxFloorReached,
      isOpen: 0,
      group: { visible: true },
      pactKey: pKey,
      pactScope: 'personal'
    });
  }
}

function debugTriggerPingAndGoldDrop() {
  if (!state || state.isGameOver) return;
  state.gold = Math.max(state.gold, 8);
  resumeGame();
  dropGoldForAlly();
  triggerPlayer3DPing();
}

function pauseGame() {
  if (!state || state.isGameOver) return;
  state.pauseState = 2;
  getById('pn').innerHTML = `
    <h2>ПАУЗА</h2>
    <p style="font-size:12px;opacity:.85">Этаж ${state.maxFloorReached + 1}/${GRID_FLOORS} · Сетка ${GRID_DIM}×${GRID_DIM} (R=${TOWER_FLOOR_RADIUS} м) · Игроков: ${state.playerCount}</p>
    <button onclick="resumeGame()">▶ ПРОДОЛЖИТЬ</button>
    <button onclick="debugTriggerHotbarOfferTest()">🎴 ТЕСТ БЛОК 4: Безпаузный хотбар из 3 карточек (клавиши 1, 2, 3 и R)</button>
    <button onclick="debugTeleportToGuildChest()">🏛 ТЕСТ БЛОК 4: К «Сундуку гильдии» (+15 золота на складчину отряда)</button>
    <button onclick="debugTriggerPactTest()">🔮 ТЕСТ БЛОК 4: Алтарь пакта (Голосование F1/F2 за Глобальный / Мгновенный личный)</button>
    <button onclick="debugTriggerPingAndGoldDrop()">📍 ТЕСТ БЛОК 4: 3D-пинг (СКМ/V) + Сброс монет союзнику (клавиша G)</button>
    <button onclick="debugCycleWeaponLoadoutPair()">⚔ ТЕСТ БЛОК 3: Сменить пару оружия (2 слота из 9 видов)</button>
    <button onclick="debugTriggerElementalReactionShowcase()">⚗ ТЕСТ БЛОК 3: Вызвать межклассовую реакцию (Пар / Сверхпровод. / Шлак / Коллапс)</button>
    <button onclick="debugCycleTradeoffAndVerticalBuild()">⚖ ТЕСТ БЛОК 3: Реликвия с компромиссом / Вертикальная роль (comp и heart)</button>
    <button onclick="debugCycleFloorMiniQuest()">🔒 ТЕСТ БЛОК 2: Сменить мини-квест печати (Круги / Хранители / Ядро)</button>
    <button onclick="debugCycleCoopFloorEvent()">⛓ ТЕСТ БЛОК 2: Вызвать кооп-событие (Цепь / Полярный резонанс)</button>
    <button onclick="debugTriggerFadingEmberTest()">🕯 ТЕСТ БЛОК 2: Возрождение «Угасающий уголь» (3 сек. в круге)</button>
    <button onclick="debugTeleportToBalcony()">🎯 ТЕСТ БЛОК 1: На балкон полуэтажа (floorY + 6)</button>
    <button onclick="debugTeleportToSplitFloor()">🔀 ТЕСТ БЛОК 1: На этаж-развилку (2 сектора)</button>
    <button onclick="debugTeleportToForgeHall()">⚒ ТЕСТ БЛОК 1: В безопасный «Зал Кузницы»</button>
    <button onclick="triggerOrToggleStorm()">🌪 ВЫЗВАТЬ / ПЕРЕКЛЮЧИТЬ БУРЮ (B)</button>
    <button onclick="toggleGameAudioMute()">🔊 ПЕРЕКЛЮЧИТЬ ЗВУК БАШНИ</button>
    <button onclick="quitToMenu()">✕ ВЫЙТИ В ГЛАВНОЕ МЕНЮ</button>
  `;
  getById('ov').style.display = 'flex';
  try {
    if (document.exitPointerLock) document.exitPointerLock();
  } catch (err) {}
}

function resumeGame() {
  if (!state) return;
  state.pauseState = 0;
  getById('ov').style.display = 'none';
  requestPointerLock();
}

function quitToMenu() {
  if (!state) return;
  releaseAllEnemies();
  releaseAllGlobalBolts();
  if (typeof coopAlliesGroup !== 'undefined') coopAlliesGroup.clear();
  if (typeof floorQuestGroup !== 'undefined') floorQuestGroup.clear();
  if (typeof coopEventVisualGroup !== 'undefined') coopEventVisualGroup.clear();
  if (typeof fadingEmberGroup !== 'undefined') fadingEmberGroup.clear();
  if (typeof pingVisualGroup !== 'undefined') pingVisualGroup.clear();
  if (typeof clearCombatDeployables === 'function') clearCombatDeployables();
  resetBossEffects();
  state.projectiles.length = 0;
  state.bladePositions.length = 0;
  state.isGameOver = 1;
  getById('hud').style.display = 'none';
  getById('pauseHint').style.display = 'none';
  if (getById('upgradeHotbar')) getById('upgradeHotbar').style.display = 'none';
  if (getById('pactVoteWidget')) getById('pactVoteWidget').style.display = 'none';
  if (getById('offscreenIndicators')) getById('offscreenIndicators').innerHTML = '';
  if (getById('pingOverlayContainer')) getById('pingOverlayContainer').innerHTML = '';
  getById('bossHp').classList.remove('visible');
  state = null;
  applyTowerTheme(TOWERS[selectedTowerId] || TOWERS.ash);
  buildTower(
    hashString('lava' + getCurrentDateCode() + selectedTowerId),
    selectedPlayerCount,
    selectedCampaignModeId
  );
  showMainMenu();
}

/* ---------- 3Б. Блок 4: Безпаузный хотбар наград (1, 2, 3, R), Сброс золота (G), Личные/Глобальные пакты (F1/F2) и 3D-пинги ---------- */

function renderUpgradeHotbarUI() {
  const hotbarEl = getById('upgradeHotbar');
  if (!hotbarEl || !state || !state.activeHotbarOffer || !state.currentOffers) {
    if (hotbarEl) hotbarEl.style.display = 'none';
    return;
  }

  const equippedWeaponKeys = Object.keys(state.weaponLevels).filter(
    (k) => state.weaponLevels[k] > 0
  );
  const maxSlots = typeof MAX_WEAPON_SLOTS !== 'undefined' ? MAX_WEAPON_SLOTS : 2;
  const cKey = String(state.currentOfferChestKey || '');
  const sourceLabel = cKey.startsWith('gchest')
    ? '🏛 Сундук гильдии (складчина)'
    : cKey.startsWith('chest')
      ? '📦 Сундук'
      : '⚡ Уровень отряда ' + state.level;
  const queueLen = (state.pendingOfferQueue && state.pendingOfferQueue.length) || 0;
  const queueBadgeHtml =
    queueLen > 0 ? `<span class="hotbar-queue-badge">+${queueLen} в очереди</span>` : '';

  const cardsHtml = state.currentOffers
    .map((entry, idx) => {
      const [category, key] = entry;
      const isWeapon = category === 'w';
      const isTome = category === 't';
      const isTradeoff = category === 'i' && ITEMS[key] && ITEMS[key].isTradeoff;
      const icon = isWeapon
        ? WEAPONS[key].icon || '⚔️'
        : isTome
          ? TOMES[key].icon || '📘'
          : isTradeoff
            ? '⚖️'
            : '💎';
      const title = isWeapon
        ? WEAPONS[key].name
        : isTome
          ? TOMES[key].name
          : ITEMS[key].name;
      const badge = isWeapon
        ? state.weaponLevels[key]
          ? 'ур. ' + (state.weaponLevels[key] + 1)
          : `слот ${equippedWeaponKeys.length + 1}/${maxSlots}`
        : isTome
          ? '×' + ((state.tomeLevels[key] || 0) + 1)
          : (isTradeoff ? '⚠ ' : '') + '×' + ((state.itemsOwned[key] || 0) + 1);
      const subtitle = isWeapon
        ? WEAPONS[key].description || 'Автоатака, 8 уровней'
        : isTome
          ? TOMES[key].description
          : ITEMS[key].description;

      return (
        `<button type="button" class="hotbar-card cat-${category}${isTradeoff ? ' tradeoff' : ''}" onclick="pickUpgrade(${idx})">` +
        `<div class="hotbar-card-top">` +
        `<span class="hotbar-key-badge">${idx + 1}</span>` +
        `<span class="hotbar-card-name">${icon} ${title}</span>` +
        `<span class="hotbar-card-lv">${badge}</span>` +
        `</div>` +
        `<div class="hotbar-card-desc">${subtitle}</div>` +
        `</button>`
      );
    })
    .join('');

  const rerollHtml =
    state.rerollsLeft > 0
      ? `<button type="button" class="hotbar-reroll-btn" onclick="rerollUpgrades()"><b>[R]</b> Переброс (${state.rerollsLeft})</button>`
      : `<span style="font-size:11px;opacity:.75">Клавиши <b>1 · 2 · 3</b> — выбор на бегу</span>`;

  hotbarEl.innerHTML =
    `<div class="hotbar-header">` +
    `<div><span class="hotbar-title">${sourceLabel}</span> · <small style="opacity:.88">Оружие: ${equippedWeaponKeys.length}/${maxSlots}</small>${queueBadgeHtml}</div>` +
    `${rerollHtml}` +
    `</div>` +
    `<div class="hotbar-cards-row">${cardsHtml}</div>`;

  hotbarEl.style.display = 'flex';
}

/**
 * Безпаузный хотбар выбора наград из 3 карточек внизу экрана (клавиши 1, 2, 3 и R для переброса).
 * Не ставит игру на паузу (state.pauseState остаётся 0) и не сбрасывает pointerLock!
 */
function showUpgradeOfferModal(isReroll, chestKey) {
  if (!state || state.isGameOver) return;
  if (!state.pendingOfferQueue) state.pendingOfferQueue = [];

  if (!isReroll && state.activeHotbarOffer) {
    state.pendingOfferQueue.push(chestKey || 'lvl-' + state.level + '-' + (++state.offerSeq));
    renderUpgradeHotbarUI();
    return;
  }

  state.activeHotbarOffer = 1;
  state.currentOfferChestKey = chestKey || 'lvl-' + state.level;
  const offerSeedKey =
    state.currentOfferChestKey +
    (isReroll ? 'r' + (state.rerollCount = (state.rerollCount || 0) + 1) : '');

  const equippedWeaponKeys = Object.keys(state.weaponLevels).filter(
    (k) => state.weaponLevels[k] > 0
  );
  const weaponSlotsFull =
    equippedWeaponKeys.length >= (typeof MAX_WEAPON_SLOTS !== 'undefined' ? MAX_WEAPON_SLOTS : 2);

  state.currentOffers = UPGRADE_POOL.map((entry, idx) => [
    seededRandom(state.seed, offerSeedKey, idx),
    entry
  ])
    .filter(
      ([, entry]) =>
        !(entry[0] === 'w' && state.weaponLevels[entry[1]] >= 8) &&
        !(entry[0] === 'w' && weaponSlotsFull && !state.weaponLevels[entry[1]]) &&
        !(entry[0] === 'i' && state.itemsOwned[entry[1]] >= 5) &&
        !(
          entry[0] === 'i' &&
          LOCKED_ITEMS[entry[1]] &&
          !metaProgress.forge[LOCKED_ITEMS[entry[1]]]
        )
    )
    .sort((a, b) => a[0] - b[0])
    .slice(0, 3)
    .map((pair) => pair[1]);

  renderUpgradeHotbarUI();
}

function rerollUpgrades() {
  if (!state || !state.activeHotbarOffer || state.rerollsLeft <= 0) return;
  state.rerollsLeft--;
  playSound('pickup');
  showUpgradeOfferModal(1, state.currentOfferChestKey);
}

function pickUpgrade(offerIndex) {
  if (!state || !state.activeHotbarOffer || !state.currentOffers || !state.currentOffers[offerIndex]) {
    return;
  }
  playSound('pickup');
  const [category, key] = state.currentOffers[offerIndex];
  let pickedTitle = '';

  if (category === 'w') {
    state.weaponLevels[key] = (state.weaponLevels[key] || 0) + 1;
    pickedTitle = `${WEAPONS[key].icon || '⚔️'} ${WEAPONS[key].name} (ур. ${state.weaponLevels[key]})`;
  } else if (category === 'i') {
    state.itemsOwned[key] = (state.itemsOwned[key] || 0) + 1;
    pickedTitle = `💎 ${ITEMS[key].name} (×${state.itemsOwned[key]})`;
  } else {
    state.tomeLevels[key]++;
    state.tomeFlashType = key;
    state.tomeFlashTimer = 2.4;
    if (key === 'hp') {
      state.maxHp += 20;
      state.player.hp += 20;
    }
    pickedTitle = `${TOMES[key].icon || '📘'} ${TOMES[key].name} (×${state.tomeLevels[key]})`;
    const tomeColors = { hp: 0xff2840, spd: 0x45ff88, dmg: 0xff8818, mag: 0x38f0ff };
    if (state.player && typeof spawnWaveRingEffect === 'function') {
      spawnWaveRingEffect(
        state.player.x,
        state.player.y + 0.1,
        state.player.z,
        2.6,
        tomeColors[key] || 0xffffff
      );
    }
  }

  if (category === 'i' && key === 'cryo_core') {
    state.maxHp = Math.max(25, Math.round(state.maxHp * 0.75));
    state.player.hp = Math.min(state.player.hp, state.maxHp);
  }
  recalculatePlayerTagCounts();
  showToast('Выбрано [' + (offerIndex + 1) + ']: ' + pickedTitle, 1.8);

  if (state.pendingOfferQueue && state.pendingOfferQueue.length > 0) {
    const nextKey = state.pendingOfferQueue.shift();
    state.activeHotbarOffer = 0;
    showUpgradeOfferModal(0, nextKey);
  } else {
    state.activeHotbarOffer = 0;
    const hotbarEl = getById('upgradeHotbar');
    if (hotbarEl) hotbarEl.style.display = 'none';
    checkLevelUp();
  }
}

/**
 * Сброс золотых монет союзникам по клавише G (или прямой вклад в Сундук гильдии рядом).
 */
function dropGoldForAlly() {
  if (!state || state.isGameOver || state.pauseState) return;
  const player = state.player;

  // Если игрок стоит прямо у открываемого «Сундука гильдии», G вносит золото в складчину
  const nearGuildChest = chests.find(
    (c) =>
      c.isGuildChest &&
      !c.isOpen &&
      Math.abs(c.y - player.y) < 3.0 &&
      hypot2D(c.x - player.x, c.z - player.z) < 3.6
  );
  if (nearGuildChest && state.gold >= 1) {
    const effMul =
      typeof getEffectiveChestCostMultiplier === 'function'
        ? getEffectiveChestCostMultiplier(nearGuildChest.x, nearGuildChest.y, nearGuildChest.z)
        : state.chestCostMultiplier || 1;
    const finalCost = Math.max(1, Math.ceil(nearGuildChest.cost * effMul));
    const needed = Math.max(0, finalCost - nearGuildChest.contributedGold);
    const give = Math.min(state.gold | 0, needed, 5);
    if (give > 0) {
      state.gold -= give;
      nearGuildChest.contributedGold += give;
      playSound('pickup');
      spawnSparkBurst(nearGuildChest.x, nearGuildChest.y + 0.9, nearGuildChest.z, 12, 'gold');
      showToast(
        `🏛 Вы внесли +${give} золота в «Сундук гильдии» (${nearGuildChest.contributedGold}/${finalCost})!`,
        1.8
      );
      return;
    }
  }

  if ((state.gold | 0) < 1) {
    showToast('🪙 У вас нет золота для сброса союзникам (клавиша G)', 1.5);
    return;
  }

  const dropAmount = Math.min(state.gold | 0, 3);
  state.gold -= dropAmount;

  let dirX = Math.sin(state.facingAngle);
  let dirZ = Math.cos(state.facingAngle);
  if (state.coopPeers && state.coopPeers.length > 0) {
    let nearestPeer = null;
    let bestD = 14;
    for (const peer of state.coopPeers) {
      if (peer.ember && (peer.ember.active || peer.ember.lostInLava)) continue;
      if (Math.abs(peer.y - player.y) < 3.5) {
        const d = hypot2D(peer.x - player.x, peer.z - player.z);
        if (d < bestD && d > 0.2) {
          bestD = d;
          nearestPeer = peer;
        }
      }
    }
    if (nearestPeer) {
      dirX = (nearestPeer.x - player.x) / bestD;
      dirZ = (nearestPeer.z - player.z) / bestD;
    }
  }

  const dropX = player.x + dirX * 2.1;
  const dropZ = player.z + dirZ * 2.1;
  const groundY = getGroundHeightAt(dropX, player.lastGroundY + 1, dropZ);
  const safeY = groundY >= player.lastGroundY - 2 ? groundY + 0.72 : player.lastGroundY + 0.72;

  state.pickups.push({
    type: 2,
    x: dropX,
    y: safeY,
    z: dropZ,
    value: dropAmount,
    lifetime: 55,
    isMagnetized: 0,
    speed: 7,
    phase: Math.random() * 6.28,
    droppedByPlayer: 1,
    pickupLockTimer: 1.5
  });

  playSound('pickup');
  spawnSparkBurst(dropX, safeY, dropZ, 12, 'gold');
  showToast(`🪙 Вы сбросили ${dropAmount} золота союзникам [G]!`, 1.9);
}

/**
 * Разделение Алтарей пакта (PACTS) на:
 * 1) Мгновенные личные сделки (Кровавая жертва, Хрупкая сила — рискует один игрок, без паузы)
 * 2) Глобальные модификаторы мира (Ярость лавы, Жадность, Лёгкие ноги — быстрое голосование F1 За / F2 Против)
 */
function openPactModal(altar) {
  if (!state || state.isGameOver || !altar) return;
  altar.isOpen = 1;
  if (altar.group) altar.group.visible = false;

  const pactKey =
    altar.pactKey ||
    (altar.floor % 2 === 1
      ? PERSONAL_PACT_KEYS[altar.floor % PERSONAL_PACT_KEYS.length]
      : GLOBAL_PACT_KEYS[altar.floor % GLOBAL_PACT_KEYS.length]);
  const pact = PACTS[pactKey] || PACTS.blood;

  if (pact.scope === 'personal' || altar.pactScope === 'personal') {
    // Мгновенная личная сделка без остановки игры и без голосования
    pact.apply(state);
    recalculatePlayerTagCounts();
    playSound('boom');
    spawnWaveRingEffect(state.player.x, state.player.y + 0.2, state.player.z, 3.2, 0xff3860);
    spawnSparkBurst(state.player.x, state.player.y + 0.8, state.player.z, 22, 'fire');
    showToast(
      `${pact.icon || '🩸'} Личный пакт принят мгновенно: «${pact.name}» (${pact.description})`,
      3.4
    );
    return;
  }

  // Глобальный модификатор мира: запускаем быстрое командное голосование (F1 — За / F2 — Против) без паузы!
  const peerVoteTimers = {};
  if (state.coopPeers && state.coopPeers.length) {
    for (let i = 0; i < state.coopPeers.length; i++) {
      const peer = state.coopPeers[i];
      peerVoteTimers[peer.id] = 0.75 + i * 0.45;
    }
  }

  state.activePactVote = {
    altar,
    pactKey,
    timeLeft: 9.0,
    maxTime: 9.0,
    votes: { 1: null },
    peerVoteTimers
  };

  playSound('summon');
  renderPactVoteWidget();
  showToast(
    `🔮 Глобальный пакт «${pact.name}»: голосуйте на бегу [F1 — ЗА] / [F2 — ПРОТИВ]`,
    3.0
  );
}

function renderPactVoteWidget() {
  const widgetEl = getById('pactVoteWidget');
  if (!widgetEl) return;
  const voteState = state && state.activePactVote;
  if (!voteState) {
    widgetEl.style.display = 'none';
    return;
  }

  const pact = PACTS[voteState.pactKey] || PACTS.rage;
  const totalPlayers = Math.max(1, state.playerCount || 1);
  const pips = [];

  for (let pid = 1; pid <= totalPlayers; pid++) {
    const v = voteState.votes[pid];
    const label = pid === 1 ? 'Вы' : `Игр.${pid}`;
    const cls = v === 1 ? 'yes' : v === 0 ? 'no' : '';
    const mark = v === 1 ? '✓' : v === 0 ? '✕' : '…';
    pips.push(`<span class="pact-pip ${cls}">${label}: ${mark}</span>`);
  }

  const pct = Math.max(0, Math.min(100, (voteState.timeLeft / voteState.maxTime) * 100)).toFixed(1);

  widgetEl.innerHTML =
    `<div class="pact-vote-top">` +
    `<span class="pact-vote-title">${pact.icon || '🔮'} АЛТАРЬ ПАКТА: ${pact.name}</span>` +
    `<span class="pact-vote-scope">Глобальный · ${Math.ceil(voteState.timeLeft)} с</span>` +
    `</div>` +
    `<div class="pact-vote-desc">${pact.description}</div>` +
    `<div class="pact-vote-actions">` +
    `<div class="pact-vote-btns">` +
    `<button type="button" class="pact-btn yes" onclick="castPactVote(1)"><b>[F1]</b> ЗА</button>` +
    `<button type="button" class="pact-btn no" onclick="castPactVote(0)"><b>[F2]</b> ПРОТИВ</button>` +
    `</div>` +
    `<div class="pact-vote-pips">${pips.join('')}</div>` +
    `</div>` +
    `<div class="pact-timer-bar"><div class="pact-timer-fill" style="width:${pct}%"></div></div>`;

  widgetEl.style.display = 'block';
}

function castPactVote(voteYes) {
  if (!state || !state.activePactVote) return;
  const voteState = state.activePactVote;
  voteState.votes[1] = voteYes ? 1 : 0;
  playSound('vote');

  // Ускоряем ответы симулируемых союзников после выбора игрока
  if (state.coopPeers && state.coopPeers.length) {
    for (let i = 0; i < state.coopPeers.length; i++) {
      const peer = state.coopPeers[i];
      if (voteState.votes[peer.id] === undefined || voteState.votes[peer.id] === null) {
        voteState.peerVoteTimers[peer.id] = Math.min(
          voteState.peerVoteTimers[peer.id] || 0.3,
          0.18 + i * 0.14
        );
      }
    }
  }
  renderPactVoteWidget();
}

function resolvePactVote() {
  if (!state || !state.activePactVote) return;
  const voteState = state.activePactVote;
  const pact = PACTS[voteState.pactKey] || PACTS.rage;
  const altar = voteState.altar;

  let yesVotes = 0;
  let noVotes = 0;
  const totalPlayers = Math.max(1, state.playerCount || 1);
  for (let pid = 1; pid <= totalPlayers; pid++) {
    if (voteState.votes[pid] === 1) yesVotes++;
    else if (voteState.votes[pid] === 0) noVotes++;
  }

  state.activePactVote = null;
  const widgetEl = getById('pactVoteWidget');
  if (widgetEl) widgetEl.style.display = 'none';

  // При равенстве голосов решающим считается голос хоста/игрока (или большинство ЗА)
  const approved =
    yesVotes > noVotes || (yesVotes === noVotes && voteState.votes[1] === 1 && yesVotes > 0);

  if (approved) {
    pact.apply(state);
    playSound('boom');
    spawnWaveRingEffect(state.player.x, state.player.y + 0.2, state.player.z, 4.2, 0xb848ff);
    showToast(
      `✅ Голосование (${yesVotes} ЗА / ${noVotes} ПРОТИВ): Глобальный пакт «${pact.name}» активирован!`,
      3.2
    );
  } else {
    if (altar) {
      altar.isOpen = 0;
      if (altar.group) altar.group.visible = true;
      altar.cooldownUntil = state.elapsedTime + 5.5;
    }
    showToast(
      `❌ Голосование (${yesVotes} ЗА / ${noVotes} ПРОТИВ): отряд отклонил пакт «${pact.name}»`,
      2.6
    );
  }
}

function updatePactVoteStep(dt) {
  if (!state || !state.activePactVote) return;
  const voteState = state.activePactVote;
  voteState.timeLeft -= dt;

  const totalPlayers = Math.max(1, state.playerCount || 1);
  if (state.coopPeers && state.coopPeers.length) {
    for (let i = 0; i < state.coopPeers.length; i++) {
      const peer = state.coopPeers[i];
      if (voteState.votes[peer.id] !== undefined && voteState.votes[peer.id] !== null) continue;
      voteState.peerVoteTimers[peer.id] = (voteState.peerVoteTimers[peer.id] || 0.8) - dt;
      if (voteState.peerVoteTimers[peer.id] <= 0) {
        // Если игрок уже проголосовал, союзники поддерживают тактику лидера (либо оценивают своё здоровье)
        if (voteState.votes[1] !== null && voteState.votes[1] !== undefined) {
          voteState.votes[peer.id] = i === 0 ? voteState.votes[1] : (peer.hp > peer.maxHp * 0.35 ? voteState.votes[1] : 0);
        } else {
          voteState.votes[peer.id] = peer.hp > peer.maxHp * 0.4 ? 1 : 0;
        }
        playSound('vote');
      }
    }
  }

  let votedCount = 0;
  for (let pid = 1; pid <= totalPlayers; pid++) {
    if (voteState.votes[pid] === 1 || voteState.votes[pid] === 0) {
      votedCount++;
    }
  }

  if (votedCount >= totalPlayers && voteState.votes[1] !== null) {
    resolvePactVote();
    return;
  }
  if (voteState.timeLeft <= 0) {
    if (voteState.votes[1] === null) voteState.votes[1] = 0;
    resolvePactVote();
    return;
  }

  if ((state.frameCount & 3) === 0) {
    renderPactVoteWidget();
  }
}

function pickPact(choiceIndex) {
  castPactVote(choiceIndex >= 0 ? 1 : 0);
}

/**
 * Создаёт 3D-маяк пинга в мире (лучевой столб, рунное кольцо на полу и вращающийся ромб).
 */
function createPing3DBeaconMesh(colorHex) {
  const g = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.15, 1.52, 28),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  g.add(ring);

  const beamGeo = new THREE.CylinderGeometry(0.12, 0.34, 6.2, 12, 1, true);
  beamGeo.translate(0, 3.1, 0);
  const beam = new THREE.Mesh(
    beamGeo,
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  g.add(beam);

  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshBasicMaterial({ color: colorHex })
  );
  diamond.position.y = 2.65;
  g.add(diamond);

  g.userData = { ring, beam, diamond };
  if (typeof pingVisualGroup !== 'undefined') {
    pingVisualGroup.add(g);
  }
  return g;
}

let _pingCycleIndex = 0;

/**
 * Быстрый 3D-пинг по нажатию колёсика мыши (СКМ) или клавиши V:
 * помечает сундук, Сундук гильдии, алтарь пакта, босса/элиту или лестницу.
 */
function triggerPlayer3DPing(forcedKind) {
  if (!state || state.isGameOver) return;
  if (!state.activePings) state.activePings = [];

  const player = state.player;
  const activeFloor = Math.min(
    GRID_FLOORS - 1,
    Math.max(0, Math.floor(player.lastGroundY / 14 + 0.07))
  );

  // Вектор взгляда камеры в горизонтальной плоскости
  const lookDirX = -Math.sin(state.cameraYaw);
  const lookDirZ = -Math.cos(state.cameraYaw);

  const candidates = [];

  // 1. Боссы и элитные Хранители печати
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    if (e.type === 'b' || e.isSealGuardian || e.eliteType) {
      const isBoss = e.type === 'b';
      candidates.push({
        kind: isBoss ? 'boss' : 'elite',
        icon: isBoss ? '👹' : '⚔️',
        label: isBoss ? `БОСС: ${e.bossName || 'Хранитель'}` : 'ЭЛИТНЫЙ ВРАГ',
        subLabel: `${Math.ceil(e.hp)} HP`,
        colorHex: 0xff3858,
        colorCss: '#ff3858',
        x: e.x,
        y: e.y,
        z: e.z,
        targetRef: e,
        followEntity: e
      });
    }
  }

  // 2. Сундуки гильдии и обычные сундуки на текущем и соседнем этаже
  for (const c of chests) {
    if (c.isOpen || Math.abs(c.floor - activeFloor) > 1) continue;
    const effMul =
      typeof getEffectiveChestCostMultiplier === 'function'
        ? getEffectiveChestCostMultiplier(c.x, c.y, c.z)
        : state.chestCostMultiplier || 1;
    const finalCost = Math.max(1, Math.ceil(c.cost * effMul));
    if (c.isGuildChest) {
      candidates.push({
        kind: 'guild_chest',
        icon: '🏛',
        label: 'СУНДУК ГИЛЬДИИ (Складчина)',
        subLabel: `${c.contributedGold}/${finalCost} зол.`,
        colorHex: 0x38ffe8,
        colorCss: '#38ffe8',
        x: c.x,
        y: c.y,
        z: c.z,
        targetRef: c
      });
    } else {
      candidates.push({
        kind: 'chest',
        icon: '📦',
        label: 'СУНДУК',
        subLabel: `${finalCost} зол.`,
        colorHex: 0xffc838,
        colorCss: '#ffc838',
        x: c.x,
        y: c.y,
        z: c.z,
        targetRef: c
      });
    }
  }

  // 3. Алтари пакта
  for (const a of altars) {
    if (a.isOpen || Math.abs(a.floor - activeFloor) > 1) continue;
    const pact = (a.pactKey && PACTS[a.pactKey]) || PACTS.rage;
    const isPers = a.pactScope === 'personal' || pact.scope === 'personal';
    candidates.push({
      kind: 'altar',
      icon: isPers ? '🩸' : '🔮',
      label: `АЛТАРЬ: ${pact.name}`,
      subLabel: isPers ? 'Личный пакт' : 'Голосование F1/F2',
      colorHex: isPers ? 0xff4868 : 0xd868ff,
      colorCss: isPers ? '#ff4868' : '#d868ff',
      x: a.x,
      y: a.y,
      z: a.z,
      targetRef: a
    });
  }

  // 4. Лестница на следующий этаж
  const floorStairs =
    (typeof stairPositionsByFloor !== 'undefined' && stairPositionsByFloor[activeFloor]) || [];
  if (floorStairs.length > 0) {
    const [sx, sz, sy] = floorStairs[0];
    const isSealed =
      state.floorQuest && state.floorQuest.floor === activeFloor && !state.floorQuest.completed;
    candidates.push({
      kind: 'stairs',
      icon: '🪜',
      label: `ЛЕСТНИЦА (Этаж ${activeFloor + 2})`,
      subLabel: isSealed ? 'Заперта печатью' : 'Путь открыт',
      colorHex: 0x48ff98,
      colorCss: '#48ff98',
      x: sx,
      y: sy - 1.5,
      z: sz,
      targetRef: null
    });
  }

  if (!candidates.length) return;

  // Оцениваем кандидатов по направлению взгляда камеры и расстоянию
  for (const cand of candidates) {
    const dx = cand.x - player.x;
    const dz = cand.z - player.z;
    const dist = hypot2D(dx, dz) || 1;
    const dot = (dx / dist) * lookDirX + (dz / dist) * lookDirZ;
    cand.dist = dist;
    cand.aimScore = dot * 18 - dist * 0.25 + (cand.kind === 'guild_chest' ? 4 : 0);
  }

  let chosen = null;
  if (forcedKind) {
    chosen = candidates.find((c) => c.kind === forcedKind);
  }
  if (!chosen) {
    // Сортируем по aimScore, но позволяем циклически переключать цели при повторных пингах подряд
    candidates.sort((a, b) => b.aimScore - a.aimScore);
    const topPool = candidates.slice(0, Math.min(4, candidates.length));
    chosen = topPool[_pingCycleIndex++ % topPool.length];
  }

  // Ограничиваем число одновременных пингов до 2
  while (state.activePings.length >= 2) {
    const oldPing = state.activePings.shift();
    if (oldPing && oldPing.mesh && typeof pingVisualGroup !== 'undefined') {
      pingVisualGroup.remove(oldPing.mesh);
    }
  }

  const mesh = createPing3DBeaconMesh(chosen.colorHex);
  mesh.position.set(chosen.x, chosen.y, chosen.z);

  const pingObj = {
    ...chosen,
    ownerName: playerNickname || 'Вы',
    life: 7.5,
    maxLife: 7.5,
    mesh
  };
  state.activePings.push(pingObj);

  playSound('ping');
  spawnWaveRingEffect(chosen.x, chosen.y + 0.2, chosen.z, 3.0, chosen.colorHex);
  showToast(
    `📍 Пинг (${pingObj.ownerName}): ${chosen.icon} ${chosen.label} · ${Math.round(chosen.dist)} м`,
    2.4
  );
}

function updateActivePingsStep(dt) {
  if (!state || !state.activePings || !state.activePings.length) return;
  const time = state.elapsedTime;

  for (let i = state.activePings.length - 1; i >= 0; i--) {
    const pg = state.activePings[i];
    pg.life -= dt;

    // Если пинг привязан к движущемуся боссу/элите, обновляем координаты
    if (pg.followEntity) {
      if (pg.followEntity.hp <= 0) {
        pg.life = 0;
      } else {
        pg.x = pg.followEntity.x;
        pg.y = pg.followEntity.y;
        pg.z = pg.followEntity.z;
        pg.subLabel = `${Math.ceil(pg.followEntity.hp)} HP`;
      }
    } else if (pg.targetRef && pg.targetRef.isOpen) {
      pg.life = Math.min(pg.life, 0.5);
    } else if (pg.kind === 'guild_chest' && pg.targetRef) {
      const effMul =
        typeof getEffectiveChestCostMultiplier === 'function'
          ? getEffectiveChestCostMultiplier(pg.x, pg.y, pg.z)
          : state.chestCostMultiplier || 1;
      const finalCost = Math.max(1, Math.ceil(pg.targetRef.cost * effMul));
      pg.subLabel = `${pg.targetRef.contributedGold}/${finalCost} зол.`;
    }

    if (pg.life <= 0) {
      if (pg.mesh && typeof pingVisualGroup !== 'undefined') {
        pingVisualGroup.remove(pg.mesh);
      }
      state.activePings.splice(i, 1);
      continue;
    }

    if (pg.mesh) {
      pg.mesh.position.set(pg.x, pg.y, pg.z);
      const ud = pg.mesh.userData;
      if (ud) {
        ud.ring.rotation.z = time * 2.4;
        const pulse = 1 + Math.sin(time * 7) * 0.16;
        ud.ring.scale.setScalar(pulse);
        ud.diamond.rotation.y = time * 3.2;
        ud.diamond.position.y = 2.55 + Math.sin(time * 5) * 0.22;
      }
    }
  }
}

/* ---------- 4. Таблица рекордов, главное меню и завершение забега ---------- */

function buildLeaderboardHtml() {
  const todayCode = getCurrentDateCode();
  const todayTop = leaderboard
    .filter((entry) => entry.d === todayCode)
    .sort((a, b) => b.s - a.s || a.t - b.t)
    .slice(0, 5);

  const bestByDay = {};
  leaderboard
    .filter((entry) => entry.d.slice(0, 6) === todayCode.slice(0, 6))
    .forEach((entry) => {
      if (!(bestByDay[entry.d] >= entry.s)) {
        bestByDay[entry.d] = entry.s;
      }
    });

  const monthlyTotal = Object.values(bestByDay)
    .sort((a, b) => b - a)
    .slice(0, 15)
    .reduce((sum, score) => sum + score, 0);

  return (
    `<h4>Рейтинг дня (локальный)</h4>` +
    `<ol>${
      todayTop
        .map(
          (r) =>
            `<li>${escapeHtml(r.n)}: ${r.s} · ${formatTime(r.t)}${r.w ? ' ★' : ''}</li>`
        )
        .join('') || '<li>пока пусто</li>'
    }</ol>` +
    `<p>Месяц: сумма лучших 15 дней — <b>${monthlyTotal}</b></p>`
  );
}

function startRun(mode) {
  playSound('pickup');
  saveNicknameFromInput();
  initializeRun(mode);
  getById('ov').style.display = 'none';
  getById('hud').style.display = 'block';
  getById('pauseHint').style.display = 'block';
  requestPointerLock();
}

function finishRun(isVictory) {
  if (state.isGameOver) return;
  state.isGameOver = 1;
  releaseAllGlobalBolts();
  if (typeof coopAlliesGroup !== 'undefined') coopAlliesGroup.clear();
  if (typeof floorQuestGroup !== 'undefined') floorQuestGroup.clear();
  if (typeof coopEventVisualGroup !== 'undefined') coopEventVisualGroup.clear();
  if (typeof fadingEmberGroup !== 'undefined') fadingEmberGroup.clear();
  if (typeof clearCombatDeployables === 'function') clearCombatDeployables();
  resetBossEffects();

  const durationSec = state.elapsedTime | 0;
  const totalF = state.totalFloors || GRID_FLOORS || 24;
  const floorsCleared = isVictory ? totalF : state.maxFloorReached + 1;
  const totalScore =
    1000 * floorsCleared +
    2500 * state.bossesDefeated +
    2 * state.kills +
    (isVictory ? 15000 + 20 * Math.max(0, 900 - durationSec) : 0);

  const unlockedTowerHtml = isVictory ? unlockNextTower(state.towerId) : '';
  const earnedAsh = Math.floor(
    floorsCleared * 3 + state.bossesDefeated * 12 + state.kills * 0.12 + (isVictory ? 80 : 0)
  );
  metaProgress.ash = (metaProgress.ash || 0) + earnedAsh;
  metaProgress.save();

  if (state.mode) {
    leaderboard.push({
      d: state.dateCode,
      s: totalScore,
      t: durationSec,
      n: playerNickname,
      w: +isVictory
    });
    storage.set('lt_lb', leaderboard.slice(-300));
  }

  if (typeof pingVisualGroup !== 'undefined') pingVisualGroup.clear();
  getById('hud').style.display = 'none';
  getById('pauseHint').style.display = 'none';
  if (getById('upgradeHotbar')) getById('upgradeHotbar').style.display = 'none';
  if (getById('pactVoteWidget')) getById('pactVoteWidget').style.display = 'none';
  if (getById('offscreenIndicators')) getById('offscreenIndicators').innerHTML = '';
  if (getById('pingOverlayContainer')) getById('pingOverlayContainer').innerHTML = '';
  if (document.exitPointerLock) document.exitPointerLock();
  getById('bossHp').classList.remove('visible');

  getById('pn').innerHTML =
    `<h2>${isVictory ? 'ПОБЕДА!' : state.towerConfig.loseTitle}</h2>` +
    `${unlockedTowerHtml}` +
    `<p style="color:#ffd040">Пепел: +${earnedAsh} (всего ${metaProgress.ash})</p>` +
    `<p>Этажей: ${floorsCleared}/${totalF} · боссов: ${state.bossesDefeated} · убийств: ${state.kills} · время ${formatTime(durationSec)}<br>` +
    `Очки: <b style="color:var(--accent)">${totalScore}</b></p>` +
    `${state.mode ? buildLeaderboardHtml() : '<p><small>Стандартный режим в таблицу не попадает.</small></p>'}` +
    `<button onclick="openForgeMenu()">⚒ КУЗНИЦА</button>` +
    `<button onclick="showMainMenu()">В МЕНЮ</button>`;

  getById('ov').style.display = 'flex';
}

function showMainMenu() {
  getById('toast').style.opacity = 0;
  const todayCode = getCurrentDateCode();
  const dailySeed = hashString('lava' + todayCode);
  const dailyTowerName =
    TOWERS[TOWER_IDS[Math.floor(seededRandom(dailySeed, 'twr', 0) * 3)]].name;
  const dailyMutatorName =
    MUTATORS[Math.floor(seededRandom(dailySeed, 'mut', 0) * MUTATORS.length)].name;
  const dailyWeaponName =
    Object.values(WEAPONS)[Math.floor(seededRandom(dailySeed, 'hero', 0) * 3)].name;

  getById('pn').innerHTML =
    `<h1>LAVA TOWER · CO-OP</h1>` +
    `<p>Кооперативная версия для 1–4 игроков (Блоки 1–4): масштабируемые этажи (15×15 / 19×19 / 23×23), командные печати и события, матрица 4 стихийных реакций, безпаузный хотбар наград (1/2/3/R), общий опыт + личное золото (G — сброс), «Сундуки гильдии» в складчину, личные/глобальные пакты (F1/F2), HUD союзников и 3D-пинги (СКМ/V).</p>` +
    `<p>Ник: <input id="nk" value="${escapeHtml(playerNickname)}" maxlength="16"></p>` +
    `<button onclick="startRun(0)" style="background:#4a1d0f;border-color:#ffd040;font-size:16px">▶ НАЧАТЬ ЗАБЕГ (${COOP_SCALE_PRESETS[selectedPlayerCount].label})</button>` +
    `${buildCoopAndCampaignSelectHtml()}` +
    `<button onclick="openForgeMenu()">⚒ КУЗНИЦА · пепел: ${metaProgress.ash | 0}</button>` +
    `${buildTowerSelectHtml()}` +
    `${buildHeroSelectHtml()}` +
    `<button onclick="startRun(1)">☀ РЕЙТИНГ ДНЯ<br><small style="color:#c9a2ff;font-family:Rubik">Сид ${todayCode} · 3 Акта · старт: ${dailyWeaponName} · мутатор: ${dailyMutatorName}</small></button>` +
    `${buildLeaderboardHtml()}` +
    `<small style="font-size:11px;opacity:0.78">WASD — бег · Пробел — прыжок · Shift — рывок · <b>1/2/3/R</b> — выбор карточек без паузы · <b>G</b> — скинуть золото · <b>СКМ / V</b> — 3D-пинг · <b>F1/F2</b> — голосование пакта · <b>ESC</b> — пауза и тесты Блоков 1–4.</small>`;

  getById('ov').style.display = 'flex';
}

// Совместимые псевдонимы для глобальных вызовов
window.go = startRun;
window.resume = resumeGame;
window.quitToMenu = quitToMenu;
window.forge = openForgeMenu;
window.buyF = buyForgeUpgrade;
window.selH = selectHero;
window.selT = selectTower;
window.selectPlayerCount = selectPlayerCount;
window.selectCampaignMode = selectCampaignMode;
window.debugTeleportToBalcony = debugTeleportToBalcony;
window.debugTeleportToSplitFloor = debugTeleportToSplitFloor;
window.debugTeleportToForgeHall = debugTeleportToForgeHall;
window.unlockAllTowersForPreview = unlockAllTowersForPreview;
window.menu = showMainMenu;
window.pick = pickUpgrade;
window.pactPick = pickPact;

window.debugCycleFloorMiniQuest = debugCycleFloorMiniQuest;
window.debugCycleCoopFloorEvent = debugCycleCoopFloorEvent;
window.debugTriggerFadingEmberTest = debugTriggerFadingEmberTest;

window.debugCycleWeaponLoadoutPair = debugCycleWeaponLoadoutPair;
window.debugTriggerElementalReactionShowcase = debugTriggerElementalReactionShowcase;
window.debugCycleTradeoffAndVerticalBuild = debugCycleTradeoffAndVerticalBuild;
window.pickUpgrade = pickUpgrade;
window.rerollUpgrades = rerollUpgrades;
window.dropGoldForAlly = dropGoldForAlly;
window.castPactVote = castPactVote;
window.triggerPlayer3DPing = triggerPlayer3DPing;
window.debugTriggerHotbarOfferTest = debugTriggerHotbarOfferTest;
window.debugTeleportToGuildChest = debugTeleportToGuildChest;
window.debugTriggerPactTest = debugTriggerPactTest;
window.debugTriggerPingAndGoldDrop = debugTriggerPingAndGoldDrop;
