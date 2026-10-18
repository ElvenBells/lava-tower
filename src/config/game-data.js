/* ==========================================================================
   Конфигурация и баланс игры (src/config/game-data.js):
   оружие, предметы, тома, мутаторы, мобы, боссы, герои, башни (с зафиксированными
   параметрами шейдеров/VFX из референсных сцен и параметрами периодических Бурь),
   пакты и кузница
   ========================================================================== */

/**
 * Автоатакующее оружие (до 8 уровней).
 */
const WEAPONS = {
  fire: { name: 'Огненные шары', tags: ['fire'] },
  blade: { name: 'Орбитальные клинки', tags: ['kin'] },
  wave: { name: 'Ударная волна', tags: ['kin'] }
};

/**
 * Пассивные предметы (до 5 стаков) и их синергии по тегам.
 */
const ITEMS = {
  coal: {
    name: 'Угольный сапог',
    tags: ['fire', 'kin'],
    description: 'Приземление: огненная волна 3 м'
  },
  ice: {
    name: 'Ледяная подошва',
    tags: ['ice', 'kin'],
    description: 'Скольжение замедляет врагов; лёд + огонь = пар (×2)'
  },
  belt: {
    name: 'Громовой пояс',
    tags: ['elec'],
    description: 'Каждый 5-й удар: молния на 3 цели'
  },
  comp: {
    name: 'Компас высоты',
    tags: ['alt'],
    description: '+2% урона за 5 м над лавой (до +40%)'
  },
  heart: {
    name: 'Лавовое сердце',
    tags: ['fire', 'alt'],
    description: 'Лава ближе 6 м: +25% урона'
  },
  crys: {
    name: 'Плавильный кристалл',
    tags: ['fire', 'loot'],
    description: 'Горящие враги дают +50% опыта'
  }
};

/**
 * Тома характеристик.
 */
const TOMES = {
  hp: { name: 'Том жизни', description: '+20 макс. здоровья' },
  spd: { name: 'Том скорости', description: '+8% скорости' },
  dmg: { name: 'Том силы', description: '+10% урона' },
  mag: { name: 'Том притяжения', description: '+35% радиус сбора, +10% опыта' }
};

/**
 * Мутаторы ежедневного забега.
 */
const MUTATORS = [
  {
    name: 'Быстрая лава +20%',
    apply: (runState) => {
      runState.lavaSpeedMultiplier = 1.2;
    }
  },
  {
    name: 'Хрупкие: HP −25%, урон +25%',
    apply: (runState) => {
      runState.maxHpMultiplier = 0.75;
      runState.damageMultiplier = 1.25;
    }
  },
  {
    name: 'Тяжёлая гравитация +25%',
    apply: (runState) => {
      runState.gravity = 30;
    }
  },
  {
    name: 'Без двойного прыжка',
    apply: (runState) => {
      runState.disableDoubleJump = 1;
    }
  }
];

/**
 * Характеристики типов врагов по ролям:
 * - 's' (Рой): Огарёк / Мерзлявка / Теневой Мотылёк
 * - 'r' (Стрелок): Пустотный Шип / Инеевый Кристалл / Фазовый Шип
 * - 'l' (Прыгун): Обсидиановый Прыгун / Ледяной Волк / Пустотный Прыгун
 * - 't' (Танк): Каменный Страж / Мерзлотный Голем / Страж Бездны
 * - 'b' (Босс): переопределяется конфигом конкретного босса из BOSS_CONFIGS
 */
const ENEMY_TYPES = {
  s: {
    hp: 10,
    speed: 3.5,
    scale: 0.45,
    radius: 0.55,
    color: 0xe04040,
    xp: 1,
    contactDamage: 5,
    jumpVelocity: 6,
    jumpCooldown: 2.5
  },
  r: {
    hp: 14,
    speed: 3.5,
    scale: 1,
    radius: 0.7,
    color: 0xb060e0,
    xp: 2,
    contactDamage: 0
  },
  l: {
    hp: 22,
    speed: 5,
    scale: 1,
    radius: 1.0,
    color: 0xff4422,
    xp: 3,
    contactDamage: 0,
    jumpVelocity: 7.2,
    jumpCooldown: 2
  },
  t: {
    hp: 70,
    speed: 2.2,
    scale: 1.9,
    radius: 1.3,
    color: 0x909090,
    xp: 4,
    contactDamage: 14
  },
  b: {
    hp: 500,
    speed: 2.6,
    scale: 4,
    radius: 7.5,
    color: 0xffd040,
    xp: 40,
    contactDamage: 18
  }
};

/**
 * Названия мобов в зависимости от башни (для лора и уведомлений).
 */
const TOWER_MOB_NAMES = {
  ash: {
    s: 'Огарёк',
    r: 'Пустотный Шип',
    l: 'Обсидиановый Прыгун',
    t: 'Каменный Страж'
  },
  ice: {
    s: 'Мерзлявка',
    r: 'Инеевый Кристалл',
    l: 'Ледяной Волк',
    t: 'Мерзлотный Голем'
  },
  void: {
    s: 'Теневой Мотылёк',
    r: 'Фазовый Шип',
    l: 'Пустотный Прыгун',
    t: 'Страж Бездны'
  }
};

/**
 * Пороги вероятностей появления мобов [s, r, l] по этажам (остаток — 't').
 */
const WAVE_THRESHOLDS = [
  [0.85, 1.01, 1.01],
  [0.60, 0.85, 1.01],
  [0.48, 0.70, 0.90],
  [0.40, 0.60, 0.82],
  [0.34, 0.54, 0.76]
];

/**
 * Общий пул карточек улучшений при повышении уровня или открытии сундука.
 */
const UPGRADE_POOL = [
  ...Object.keys(WEAPONS).map((key) => ['w', key]),
  ...Object.keys(ITEMS).map((key) => ['i', key]),
  ...Object.keys(TOMES).map((key) => ['t', key])
];

/**
 * Конфигурация трёх рангов боссов (этажи 4, 8 и 12).
 */
const BOSS_CONFIGS = {
  golem: {
    name: 'ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ',
    hp: 520,
    speed: 2.4,
    radius: 2.4,
    scale: 1.35,
    contactDamage: 18,
    xp: 45
  },
  womb: {
    name: 'КРИСТАЛЬНАЯ МАТКА',
    hp: 900,
    speed: 2.2,
    radius: 2.6,
    scale: 1.3,
    contactDamage: 12,
    xp: 55
  },
  koloss: {
    name: 'ЛАВОВЫЙ КОЛОСС',
    hp: 1350,
    speed: 1.7,
    radius: 3.0,
    scale: 1.5,
    contactDamage: 22,
    xp: 70
  }
};

/**
 * Модификаторы элитных врагов.
 */
const ELITE_MODIFIERS = {
  armor: { name: 'Бронированный', hpMultiplier: 3.5, speedMultiplier: 0.9, damageMultiplier: 1.35 },
  swift: { name: 'Стремительный', hpMultiplier: 2.0, speedMultiplier: 1.6, damageMultiplier: 1.0 },
  volt: { name: 'Взрывной (умирая, взрывается)', hpMultiplier: 2.2, speedMultiplier: 1.0, damageMultiplier: 1.0 }
};

const ELITE_SCALE_BY_TYPE = {
  s: 2.2,
  r: 1.4,
  l: 1.35,
  t: 1.3
};

/**
 * Шансы выпадения золота и сфер лечения по типам обычных врагов.
 */
const GOLD_DROP_CHANCE = { s: 0.10, r: 0.28, l: 0.30, t: 0.70 };
const HEAL_DROP_CHANCE = { s: 0.012, r: 0.03, l: 0.035, t: 0.08 };

/**
 * Игровые персонажи (Угленосцы Пепельной гильдии).
 */
const HEROES = {
  wan: {
    name: 'Угленосец · Странник',
    startWeapon: 'fire',
    description: 'Классика: сбалансированный бегун Пепельной гильдии.',
    unlockCondition: ''
  },
  pil: {
    name: 'Угленосец · Пилигрим',
    startWeapon: 'blade',
    description: 'Тройной прыжок, но HP −20%.',
    unlockCondition: 'Дойти до 6-го этажа'
  },
  smi: {
    name: 'Угленосец · Кузнец',
    startWeapon: 'wave',
    description: 'Сундуки на 30% дешевле, старт с Угольным сапогом.',
    unlockCondition: 'Открыть 3 сундука за один забег'
  },
  ash: {
    name: 'Угленосец · Пепельник',
    startWeapon: 'fire',
    description: 'Огонь +15%; убийство горящего врага лечит 3% HP.',
    unlockCondition: 'Убить элитного моба'
  },
  hun: {
    name: 'Угленосец · Охотник',
    startWeapon: 'blade',
    description: '+50% урона по элитам и боссам, −15% по остальным.',
    unlockCondition: 'Победить босса'
  }
};

/**
 * Названия планировок этажей.
 */
const FLOOR_LAYOUT_NAMES = {
  disc: 'Арена',
  ring: 'Кольцо',
  spokes: 'Мосты',
  islands: 'Острова'
};

/**
 * Случайные события на этажах.
 */
const FLOOR_EVENTS = {
  storm: { name: 'Лавовый шторм', duration: 22 },
  hunt: { name: 'Охота элит', duration: 0 },
  gold: { name: 'Золотая лихорадка', duration: 25 },
  surge: { name: 'Прилив лавы', duration: 20 }
};

const FLOOR_EVENT_KEYS = Object.keys(FLOOR_EVENTS);

/**
 * Алтари пактов (риск в обмен на награду).
 */
const PACTS = {
  rage: {
    name: 'Ярость лавы',
    description: 'Лава на 20% быстрее, урон +25%',
    apply: (runState) => {
      runState.lavaSpeedMultiplier *= 1.2;
      runState.damageMultiplier *= 1.25;
    }
  },
  frail: {
    name: 'Хрупкая сила',
    description: 'Макс. HP −20%, случайное оружие +1 уровень',
    apply: (runState) => {
      runState.maxHp = Math.round(runState.maxHp * 0.8);
      runState.player.hp = Math.min(runState.player.hp, runState.maxHp);
      const upgradeableWeapons = Object.keys(runState.weaponLevels).filter(
        (key) => runState.weaponLevels[key] < 8
      );
      if (upgradeableWeapons.length) {
        const randomWeapon = upgradeableWeapons[Math.floor(Math.random() * upgradeableWeapons.length)];
        runState.weaponLevels[randomWeapon]++;
      }
    }
  },
  greed: {
    name: 'Жадность',
    description: 'Золото ×2, элитных мобов вдвое больше',
    apply: (runState) => {
      runState.isGreedPactActive = 1;
    }
  },
  blood: {
    name: 'Кровавая жертва',
    description: '−25% текущего HP, +15 золота',
    apply: (runState) => {
      runState.player.hp = Math.max(1, runState.player.hp * 0.75);
      runState.gold += 15;
    }
  },
  swift: {
    name: 'Лёгкие ноги',
    description: 'Вы быстрее на 20%, но мобы быстрее на 15%',
    apply: (runState) => {
      runState.playerSpeedMultiplier = (runState.playerSpeedMultiplier || 1) * 1.2;
      runState.enemySpeedMultiplier = (runState.enemySpeedMultiplier || 1) * 1.15;
    }
  }
};

/**
 * Конфигурация трёх башен с зафиксированными параметрами шейдеров/VFX из референсных сцен
 * и параметрами периодических «Бурь» (Storms), осложняющих видимость поля.
 */
const TOWERS = {
  ash: {
    id: 'ash',
    name: 'Пепельная башня',
    hazardGenitive: 'лавы',
    loseTitle: 'ЛАВА ПОБЕДИЛА',
    description:
      'Детализированный базальт с обугленными до черноты участками и лавовыми трещинами, 3D-потоки стекающей лавы, кипящие лужи на полу и капли со ступеней.',
    unlockCondition: '',
    fogColor: 0x220707,
    fogDensity: 0.065,
    hemiSkyColor: 0x747b8f,
    hemiGroundColor: 0xe04008,
    dirLightColor: 0x9aa3b8,
    dirLightIntensity: 1.05,
    lavaLightColor: 0xff5a18,
    lavaLightIntensity: 3.2,
    rimLightColor: 0xff4800,
    blockColors: [0x7c7e84, 0x6e7076, 0x74767c],
    layoutWeights: [0.15, 0.4, 0.7],
    islandRemoveProb: 0.32,
    dustColor: 0xff6a18,
    dustSize: 0.42,
    dustOpacity: 0.82,
    backgroundGradient: ['#140404', '#240808', '#4a1207'],
    // Зафиксированные базовые параметры Пепельной башни:
    // Интенсивность свечения (Bloom) = 0.3, Порог свечения (Threshold) = 0.14,
    // Термическое искажение воздуха = 0.039, Скорость течения магмы = 2.25,
    // Плотность пепельного тумана = 0.065
    vfxParams: {
      bloomStrength: 0.3,
      bloomThreshold: 0.14,
      heatDistortion: 0.039,
      lavaSpeed: 2.25,
      fogDensity: 0.065,
      renderFogDensity: 0.0155,
      rgbShift: 0.0,
      coldGrade: 0.0
    },
    // Параметры периодической Бури в Пепельной башне:
    // Повышается интенсивность свечения (2.2), термическое искажение воздуха (0.073),
    // плотность пепельного тумана (0.03 — и усиливается густота дымки, усложняя видимость)
    stormParams: {
      name: '🔥 ПЕПЕЛЬНАЯ БУРЯ',
      bloomStrength: 2.2,
      bloomThreshold: 0.12,
      heatDistortion: 0.073,
      lavaSpeed: 3.35,
      fogDensity: 0.03,
      renderFogDensity: 0.030,
      stormColorHex: 0x380c04
    }
  },
  ice: {
    id: 'ice',
    name: 'Ледяная башня',
    hazardGenitive: 'метели',
    loseTitle: 'МЕТЕЛЬ ПОБЕДИЛА',
    description:
      'Сплошной глубокий лёд с внутренними светящимися трещинами, вмёрзшие в стены силуэты, свисающие со ступеней сосульки, скользкий пол и бездонная метель.',
    unlockCondition: 'Победить Лавового Колосса в Пепельной башне',
    fogColor: 0xc4e2f5,
    fogDensity: 0.004,
    hemiSkyColor: 0xb8e2f2,
    hemiGroundColor: 0xe8f7ff,
    dirLightColor: 0xd8f1ff,
    dirLightIntensity: 0.95,
    lavaLightColor: 0x88ddff,
    lavaLightIntensity: 2.4,
    rimLightColor: 0x9be6ff,
    blockColors: [0x8bc9eb, 0x9edbff, 0x7ab8dc],
    layoutWeights: [0.25, 0.45, 0.7],
    islandRemoveProb: 0.3,
    isSlipperyIce: 1,
    hasColdPenalty: 1,
    hazardSpeedMul: 0.85,
    enemyHpMul: 1.15,
    dustColor: 0xe8f7ff,
    dustSize: 0.38,
    dustOpacity: 0.85,
    backgroundGradient: ['#0a1526', '#264e73', '#d0e8f7'],
    // Зафиксированные базовые параметры Ледяной башни:
    // Кристаллический ореол (Bloom) = 0.00, Эмиссия трещин льда = 1.95,
    // Плотность снежной взвеси = 0.004, Скорость бездонной метели = 0.5
    vfxParams: {
      bloomStrength: 0.00,
      bloomThreshold: 0.68,
      cracksEmissive: 1.95,
      fogDensity: 0.004,
      renderFogDensity: 0.004,
      blizzardSpeed: 0.5,
      heatDistortion: 0.0,
      rgbShift: 0.0,
      coldGrade: 0.22
    },
    // Параметры периодической Бури в Ледяной башне:
    // Повышается скорость бездонной метели (0.9), плотность снежной взвеси (0.024),
    // кристаллический ореол (0.08)
    stormParams: {
      name: '❄️ ЛЕДЯНОЙ БУРАН',
      bloomStrength: 0.08,
      bloomThreshold: 0.48,
      cracksEmissive: 2.45,
      fogDensity: 0.024,
      renderFogDensity: 0.024,
      blizzardSpeed: 0.9,
      coldGrade: 0.35,
      stormColorHex: 0xb8e4fa
    }
  },
  void: {
    id: 'void',
    name: 'Башня Пустоты',
    hazardGenitive: 'бездны',
    loseTitle: 'БЕЗДНА ПОБЕДИЛА',
    description:
      'Чёрный обсидиановый пол с редкими блестящими вкраплениями звёздной пыли, асинхронные руны, полурастворившиеся ступени, парящие осколки и аномальная гравитация.',
    unlockCondition: 'Победить в Ледяной башне',
    fogColor: 0x070210,
    fogDensity: 0.0092,
    hemiSkyColor: 0x1a0933,
    hemiGroundColor: 0x030106,
    dirLightColor: 0xa855f7,
    dirLightIntensity: 0.65,
    lavaLightColor: 0x8a2be2,
    lavaLightIntensity: 2.6,
    rimLightColor: 0xa855f7,
    blockColors: [0x140b24, 0x1a0e2e, 0x10081c],
    layoutWeights: [0.05, 0.3, 0.55],
    islandRemoveProb: 0.42,
    gravityMul: 0.62,
    canEnemiesBlink: 1,
    dustColor: 0xa855f7,
    dustSize: 0.36,
    dustOpacity: 0.82,
    backgroundGradient: ['#030106', '#090414', '#1a0933'],
    // Зафиксированные базовые параметры Башни Пустоты:
    // Сияние рун (Bloom) = 0.30, Искажение реальности (RGB Shift) = 0.0046,
    // Аномалия гравитации = 1.4, Порог растворения ступеней = 0.39
    vfxParams: {
      bloomStrength: 0.30,
      bloomThreshold: 0.18,
      rgbShift: 0.0046,
      gravityAnomaly: 1.4,
      dissolveThreshold: 0.39,
      fogDensity: 0.0092,
      renderFogDensity: 0.0092,
      heatDistortion: 0.0,
      coldGrade: 0.0
    },
    // Параметры периодической Бури в Башне Пустоты:
    // Усиливается сияние рун (2.15), искажение реальности (0.0080),
    // порог растворения ступеней (0.65), уменьшается гравитация (ещё более долгое приземление)
    stormParams: {
      name: '🌀 ШТОРМ ПУСТОТЫ',
      bloomStrength: 2.15,
      bloomThreshold: 0.14,
      rgbShift: 0.0080,
      gravityAnomaly: 2.25,
      dissolveThreshold: 0.65,
      playerGravityMultiplier: 0.52,
      fogDensity: 0.022,
      renderFogDensity: 0.022,
      stormColorHex: 0x1c0636
    }
  }
};

const TOWER_IDS = ['ash', 'ice', 'void'];
const FORK_FLOORS = [1, 5, 9];

/**
 * Улучшения Кузницы (мета-прогрессия за пепел).
 */
const FORGE_UPGRADES = {
  hp: {
    name: 'Закалка',
    description: '+5% макс. здоровья за уровень',
    maxLevel: 5,
    costs: [25, 40, 60, 90, 130]
  },
  dmg: {
    name: 'Остриё',
    description: '+4% урона за уровень',
    maxLevel: 5,
    costs: [30, 50, 75, 110, 160]
  },
  spd: {
    name: 'Лёгкая поступь',
    description: '+3% скорости за уровень',
    maxLevel: 3,
    costs: [25, 45, 80]
  },
  mag: {
    name: 'Магнит',
    description: '+12% радиуса сбора за уровень',
    maxLevel: 3,
    costs: [20, 35, 60]
  },
  gld: {
    name: 'Припасы',
    description: '+3 золота на старте за уровень',
    maxLevel: 3,
    costs: [20, 40, 70]
  },
  rr: {
    name: 'Переплавка',
    description: '+1 переброс карточек за забег',
    maxLevel: 2,
    costs: [40, 90]
  },
  u_belt: {
    name: 'Открыть: Громовой пояс',
    description: 'Предмет появится в наградах',
    maxLevel: 1,
    costs: [35]
  },
  u_crys: {
    name: 'Открыть: Плавильный кристалл',
    description: 'Предмет появится в наградах',
    maxLevel: 1,
    costs: [35]
  },
  u_heart: {
    name: 'Открыть: Лавовое сердце',
    description: 'Предмет появится в наградах',
    maxLevel: 1,
    costs: [45]
  }
};

const LOCKED_ITEMS = {
  belt: 'u_belt',
  crys: 'u_crys',
  heart: 'u_heart'
};

/**
 * Уникальные имена боссов для каждой из трёх башен.
 */
const TOWER_BOSS_NAMES = {
  ash: {
    golem: 'ГОЛЕМ ПЕПЕЛЬНЫХ ВРАТ',
    womb: 'КРИСТАЛЬНАЯ МАТКА',
    koloss: 'ЛАВОВЫЙ КОЛОСС'
  },
  ice: {
    golem: 'ХРАНИТЕЛЬ ЗАБЫТЫХ ОБРЯДОВ',
    womb: 'ИЗУВЕЧЕННАЯ СНЕЖНАЯ ПРЯХА',
    koloss: 'ПЕРВОЗДАННЫЙ БУРАН'
  },
  void: {
    golem: 'АРХИТЕКТОР ИСКАЖЕНИЯ',
    womb: 'ПОЖИРАТЕЛЬ ФАЗ',
    koloss: 'ВЕСТНИК КОЛЛАПСА'
  }
};

const TOWER_BOSS_TINTS = {
  ash: [0, 0, 0],
  ice: [0, 0, 0],
  void: [0, 0, 0]
};

// Глобальные переменные состояния между модулями
var currentTowerTheme = TOWERS.ash;
var state = null;
var selectedHeroId = 'wan';
var selectedTowerId = 'ash';
var blocks = [];
var jumpPads = [];
var chests = [];
var altars = [];
var lavaPuddles = [];
var floorLayouts = [];
var forkMarkers = [];
var bossGateBlockIndices = {};
var bossGateVisualsByFloor = {};
var towerInstancedMesh = null;
var lastBossWidthText = '';
var lastBossHpText = '';
var lastBossNameText = '';
var lastBossShownState = 0;
var DOM_CACHE = null;

// Текущие динамические параметры VFX/шейдеров активной башни (интерполируются при Буре)
var activeTowerVfxState = {
  towerId: 'ash',
  stormFactor: 0.0,
  bloomStrength: 0.3,
  bloomThreshold: 0.14,
  heatDistortion: 0.039,
  lavaSpeed: 2.25,
  fogDensity: 0.065,
  renderFogDensity: 0.0155,
  cracksEmissive: 1.95,
  blizzardSpeed: 0.5,
  rgbShift: 0.0046,
  gravityAnomaly: 1.4,
  dissolveThreshold: 0.39,
  coldGrade: 0.0
};
