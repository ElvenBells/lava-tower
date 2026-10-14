/* ==========================================================================
   Конфигурация и баланс игры:
   оружие, предметы, тома, мутаторы, мобы, боссы, герои, башни, пакты, кузница
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
 * Этаж 0: только Рой (85%) и Стрелки; Прыгуны — с 1-го, Танки — со 2-го этажа.
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
 * Формат элемента: [категория ('w' | 'i' | 't'), ключ]
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
 * Конфигурация трёх башен с индивидуальной атмосферой, палитрой и освещением.
 */
const TOWERS = {
  ash: {
    id: 'ash',
    name: 'Пепельная башня',
    hazardGenitive: 'лавы',
    loseTitle: 'ЛАВА ПОБЕДИЛА',
    description:
      'Тёмно-багровый кирпич с магматическими трещинами, бурлящее море лавы снизу. Боссы: Голем Пепельных Врат, Кристальная Матка, Лавовый Колосс.',
    unlockCondition: '',
    fogColor: 0x1a090d,
    fogDensity: 0.0105,
    hemiSkyColor: 0xb86b58,
    hemiGroundColor: 0x4d1506,
    dirLightColor: 0xffb878,
    dirLightIntensity: 0.55,
    lavaLightColor: 0xff5a00,
    lavaLightIntensity: 3.1,
    rimLightColor: 0xff7030,
    blockColors: [0xb58d82, 0xa87e78, 0xba7c72],
    layoutWeights: [0.15, 0.4, 0.7],
    islandRemoveProb: 0.32,
    dustColor: 0xff9442,
    dustSize: 0.34,
    dustOpacity: 0.65,
    backgroundGradient: ['#1a060a', '#3d0e14', '#6e1c0a']
  },
  ice: {
    id: 'ice',
    name: 'Ледяная башня',
    hazardGenitive: 'метели',
    loseTitle: 'МЕТЕЛЬ ПОБЕДИЛА',
    description:
      'Полупрозрачный голубой лёд с вмёрзшими силуэтами, скользкий пол и метель. Боссы: Хранитель Забытых Обрядов, Изувеченная Снежная Пряха, Первозданный Буран.',
    unlockCondition: 'Победить Лавового Колосса в Пепельной башне',
    fogColor: 0x10253d,
    fogDensity: 0.0115,
    hemiSkyColor: 0xd4f0ff,
    hemiGroundColor: 0x285680,
    dirLightColor: 0xe6f7ff,
    dirLightIntensity: 0.72,
    lavaLightColor: 0x68c8ff,
    lavaLightIntensity: 2.6,
    rimLightColor: 0x90e0ff,
    blockColors: [0xc2e4ff, 0xd4eeff, 0xb2d8f8],
    layoutWeights: [0.25, 0.45, 0.7],
    islandRemoveProb: 0.3,
    isSlipperyIce: 1,
    hasColdPenalty: 1,
    hazardSpeedMul: 0.85,
    enemyHpMul: 1.15,
    dustColor: 0xdff6ff,
    dustSize: 0.36,
    dustOpacity: 0.78,
    backgroundGradient: ['#0b1d36', '#1c426e', '#4b8ec2']
  },
  void: {
    id: 'void',
    name: 'Башня Пустоты',
    hazardGenitive: 'бездны',
    loseTitle: 'БЕЗДНА ПОБЕДИЛА',
    description:
      'Тёмно-фиолетовый камень с мерцающими рунами, слабая гравитация и бездна. Боссы: Архитектор Искажения, Пожиратель Фаз, Вестник Коллапса.',
    unlockCondition: 'Победить в Ледяной башне',
    fogColor: 0x080312,
    fogDensity: 0.0095,
    hemiSkyColor: 0xa868ff,
    hemiGroundColor: 0x18042e,
    dirLightColor: 0xc896ff,
    dirLightIntensity: 0.48,
    lavaLightColor: 0xa838ff,
    lavaLightIntensity: 2.9,
    rimLightColor: 0xd068ff,
    blockColors: [0x9c82c8, 0xb084d8, 0x8a74bc],
    layoutWeights: [0.05, 0.3, 0.55],
    islandRemoveProb: 0.42,
    gravityMul: 0.62,
    canEnemiesBlink: 1,
    dustColor: 0xc888ff,
    dustSize: 0.32,
    dustOpacity: 0.72,
    backgroundGradient: ['#030108', '#110626', '#280a48']
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
 * Уникальные имена боссов для каждой из трёх башен (по мудбордам).
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
