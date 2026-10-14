/* ==========================================================================
   Интерфейс пользователя (UI):
   главное меню, выбор башни и героя, кузница, карточки наград, пакты, пауза,
   таблица рекордов и сохранение прогресса
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

// Поддержка обратной совместимости структуры мета-прогресса с форматом lt_meta (u, tu, f, a)
let rawMeta = storage.get('lt_meta');
if (!rawMeta || typeof rawMeta !== 'object' || !rawMeta.u) {
  rawMeta = { u: { wan: 1 }, tu: { ash: 1 }, f: {}, a: 0 };
}
rawMeta.u.wan = 1;
if (!rawMeta.tu) rawMeta.tu = {};
rawMeta.tu.ash = 1;
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

function saveNicknameFromInput() {
  const inputEl = getById('nk');
  if (inputEl && inputEl.value) {
    playerNickname = inputEl.value.slice(0, 16);
    storage.set('lt_nick', playerNickname);
  }
}

/* ---------- 2. Открытие героев, башен и Кузница ---------- */

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
    '<h4>Герой (стандартный забег)</h4>' +
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
  showMainMenu();
}

function buildTowerSelectHtml() {
  const buttonStyle = 'font-size:13px;padding:7px 14px;';
  const smallStyle = 'font-family:Rubik;font-weight:400';

  return (
    '<h4>Башня (стандартный забег)</h4>' +
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
    }).join('')
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

/* ---------- 3. Пауза, выбор наград и алтари пактов ---------- */

function pauseGame() {
  if (!state || state.isGameOver) return;
  state.pauseState = 2;
  getById('pn').innerHTML = `
    <h2>ПАУЗА</h2>
    <button onclick="resumeGame()">▶ ПРОДОЛЖИТЬ</button>
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
  resetBossEffects();
  state.projectiles.length = 0;
  state.bladePositions.length = 0;
  state.isGameOver = 1;
  getById('hud').style.display = 'none';
  getById('pauseHint').style.display = 'none';
  getById('bossHp').classList.remove('visible');
  state = null;
  showMainMenu();
}

function showUpgradeOfferModal(isReroll, chestKey) {
  state.pauseState = 1;
  state.currentOfferChestKey = chestKey || 0;
  const offerSeedKey =
    (chestKey || 'offer-' + state.level) +
    (isReroll ? 'r' + (state.rerollCount = (state.rerollCount || 0) + 1) : '');

  state.currentOffers = UPGRADE_POOL.map((entry, idx) => [
    seededRandom(state.seed, offerSeedKey, idx),
    entry
  ])
    .filter(
      ([, entry]) =>
        !(entry[0] === 'w' && state.weaponLevels[entry[1]] >= 8) &&
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

  getById('pn').innerHTML =
    `<h3>${chestKey ? 'Сундук' : 'Уровень ' + state.level}</h3>` +
    state.currentOffers
      .map((entry, idx) => {
        const [category, key] = entry;
        const isWeapon = category === 'w';
        const isTome = category === 't';
        const title = isWeapon
          ? WEAPONS[key].name
          : isTome
            ? TOMES[key].name
            : ITEMS[key].name;
        const badge = isWeapon
          ? state.weaponLevels[key]
            ? 'ур. ' + (state.weaponLevels[key] + 1)
            : 'новое'
          : isTome
            ? ''
            : '×' + ((state.itemsOwned[key] || 0) + 1);
        const subtitle = isWeapon
          ? 'Автоатака, 8 уровней'
          : isTome
            ? TOMES[key].description
            : ITEMS[key].description;

        return `<button onclick="pickUpgrade(${idx})"><b>${title}</b> ${badge}<br><small>${subtitle}</small></button>`;
      })
      .join('') +
    (state.rerollsLeft > 0
      ? `<button onclick="rerollUpgrades()">Переброс (осталось: ${state.rerollsLeft})</button>`
      : '');

  getById('ov').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
}

function rerollUpgrades() {
  if (!state || state.rerollsLeft <= 0) return;
  state.rerollsLeft--;
  showUpgradeOfferModal(1, state.currentOfferChestKey);
}

function pickUpgrade(offerIndex) {
  playSound('pickup');
  const [category, key] = state.currentOffers[offerIndex];
  if (category === 'w') {
    state.weaponLevels[key] = (state.weaponLevels[key] || 0) + 1;
  } else if (category === 'i') {
    state.itemsOwned[key] = (state.itemsOwned[key] || 0) + 1;
  } else {
    state.tomeLevels[key]++;
    if (key === 'hp') {
      state.maxHp += 20;
      state.player.hp += 20;
    }
  }

  state.tagCounts = {};
  for (const itemKey in state.itemsOwned) {
    for (const tag of ITEMS[itemKey].tags) {
      state.tagCounts[tag] = (state.tagCounts[tag] || 0) + state.itemsOwned[itemKey];
    }
  }

  state.pauseState = 0;
  getById('ov').style.display = 'none';
  requestPointerLock();
  checkLevelUp();
}

function openPactModal(altar) {
  state.pauseState = 1;
  state.activePactAltar = altar;
  altar.isOpen = 1;
  altar.group.visible = false;

  const pactKeys = Object.keys(PACTS)
    .map((key) => [
      seededRandom(state.seed, 'alt' + altar.floor, key.charCodeAt(0) * 7 + key.length),
      key
    ])
    .sort((a, b) => a[0] - b[0])
    .slice(0, 2)
    .map((pair) => pair[1]);

  state.currentPactOffers = pactKeys;

  getById('pn').innerHTML =
    '<h3>Алтарь пакта</h3>' +
    pactKeys
      .map(
        (key, idx) =>
          `<button onclick="pickPact(${idx})"><b>${PACTS[key].name}</b><br><small>${PACTS[key].description}</small></button>`
      )
      .join('') +
    '<button onclick="pickPact(-1)">Отказаться (алтарь останется)</button>';

  getById('ov').style.display = 'flex';
  if (document.exitPointerLock) document.exitPointerLock();
  playSound('summon');
}

function pickPact(choiceIndex) {
  const altar = state.activePactAltar;
  if (choiceIndex >= 0) {
    const pactKey = state.currentPactOffers[choiceIndex];
    PACTS[pactKey].apply(state);
    playSound('boom');
    showToast('Пакт: ' + PACTS[pactKey].name, 2.2);
  } else {
    altar.isOpen = 0;
    altar.group.visible = true;
    altar.cooldownUntil = state.elapsedTime + 5;
  }
  state.pauseState = 0;
  getById('ov').style.display = 'none';
  requestPointerLock();
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
  resetBossEffects();

  const durationSec = state.elapsedTime | 0;
  const floorsCleared = isVictory ? 12 : state.maxFloorReached;
  const totalScore =
    1000 * floorsCleared +
    2500 * state.bossesDefeated +
    2 * state.kills +
    (isVictory ? 10000 + 20 * Math.max(0, 600 - durationSec) : 0);

  const unlockedTowerHtml = isVictory ? unlockNextTower(state.towerId) : '';
  const earnedAsh = Math.floor(
    floorsCleared * 3 + state.bossesDefeated * 12 + state.kills * 0.12 + (isVictory ? 60 : 0)
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

  getById('hud').style.display = 'none';
  getById('pauseHint').style.display = 'none';
  if (document.exitPointerLock) document.exitPointerLock();
  getById('bossHp').classList.remove('visible');

  getById('pn').innerHTML =
    `<h2>${isVictory ? 'ПОБЕДА!' : state.towerConfig.loseTitle}</h2>` +
    `${unlockedTowerHtml}` +
    `<p style="color:#ffd040">Пепел: +${earnedAsh} (всего ${metaProgress.ash})</p>` +
    `<p>Этажей: ${floorsCleared}/12 · боссов: ${state.bossesDefeated} · убийств: ${state.kills} · время ${formatTime(durationSec)}<br>` +
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
    `<h1>LAVA TOWER</h1>` +
    `<p>Беги вверх: оружие бьёт само, снизу поднимается лава. 12 этажей, 3 босса на этажах 4, 8 и 12 (свои у каждой башни). Пока босс жив, лестница наверх запечатана. За забег копится пепел — тратьте его в кузнице.</p>` +
    `<p>Ник: <input id="nk" value="${escapeHtml(playerNickname)}" maxlength="16"></p>` +
    `<button onclick="openForgeMenu()">⚒ КУЗНИЦА · пепел: ${metaProgress.ash | 0}</button>` +
    `${buildTowerSelectHtml()}` +
    `${buildHeroSelectHtml()}` +
    `<button onclick="startRun(0)">▶ СТАНДАРТНЫЙ ЗАБЕГ</button>` +
    `<button onclick="startRun(1)">☀ РЕЙТИНГ ДНЯ<br><small style="color:#c9a2ff;font-family:Rubik">Сид ${todayCode} · башня: ${dailyTowerName} · старт: ${dailyWeaponName} · мутатор: ${dailyMutatorName}</small></button>` +
    `${buildLeaderboardHtml()}` +
    `<small style="font-size:11px;opacity:0.7">WASD — бег, пробел — прыжок (двойной), Shift — рывок-скольжение (на миг неуязвим), сундуки открываются за золото, мышь — камера. <b>ESC — пауза.</b></small>`;

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
window.menu = showMainMenu;
window.pick = pickUpgrade;
window.pactPick = pickPact;
