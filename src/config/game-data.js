/* ==========================================================================
   Конфигурация и баланс игры:
   оружие (9 видов, лимит 2 слота на игрока), матрица межклассовых стихийных
   реакций (Пар, Сверхпроводимость, Детонация шлака, Коллапс Пустоты),
   предметы и реликвии с компромиссами (Brotato-стиль), вертикальная
   специализация («Нижний страж» и «Верхний стрелок»), командные ауры 5 героев,
   тома, мутаторы, мобы, боссы, башни, 3-актная прогрессия и кооп-квесты
   ========================================================================== */

/**
 * Лимит активных слотов оружия на одного игрока (чтобы убрать клонов-универсалов
 * и побудить 2–4 игроков собирать взаимодополняющие стихийные роли).
 */
const MAX_WEAPON_SLOTS = 2;

/**
 * Автоатакующее оружие (9 видов, до 8 уровней, максимум 2 слота на игрока).
 */
const WEAPONS = {
  fire: {
    name: 'Огненные шары',
    tags: ['fire'],
    isHeavyMelee: 0,
    role: 'Поджог · Огонь',
    description: 'Залп лавовых метеоров, поджигающих цели на 3 с (база для Пара и Детонации шлака)'
  },
  blade: {
    name: 'Орбитальные клинки',
    tags: ['kin'],
    isHeavyMelee: 0,
    role: 'Орбита · Кинетика',
    description: 'Вращающиеся вокруг героя клинки-осколки, резонирующие со стихийными тегами'
  },
  wave: {
    name: 'Ударная волна',
    tags: ['kin'],
    isHeavyMelee: 1,
    role: 'Тяжёлый импульс · Кинетика',
    description: 'Тяжёлый круговой удар: вызывает Детонацию шлака по горящим и Коллапс Пустоты (+50%) по стянутым'
  },
  spear: {
    name: 'Морозные копья',
    tags: ['ice'],
    isHeavyMelee: 0,
    role: 'Снайпер · Лёд',
    description: 'Сверхзвуковые пронзающие ледяные копья: замораживают ряд врагов (база для Пара и Сверхпроводимости)'
  },
  chain: {
    name: 'Цепная молния',
    tags: ['elec'],
    isHeavyMelee: 0,
    role: 'Дуга · Молния',
    description: 'Дуговой разряд по цепочке целей; по замёрзшим запускает Сверхпроводимость (−30% защиты всему этажу)'
  },
  grav: {
    name: 'Сфера гравитации',
    tags: ['void', 'kin'],
    isHeavyMelee: 0,
    role: 'Контроль · Пустота',
    description: 'Сингулярность стягивает и замедляет мобов в одну точку, подготавливая Коллапс Пустоты (+50% урона)'
  },
  totem: {
    name: 'Магмовый тотем-турель',
    tags: ['fire'],
    isHeavyMelee: 0,
    role: 'Инженер · Огонь',
    description: 'Устанавливает турель горна, ведущую перекрёстный огонь лавовыми залпами и поджигающую врагов'
  },
  shield: {
    name: 'Кузнечный щит-бумеранг',
    tags: ['kin'],
    isHeavyMelee: 1,
    role: 'Танковый бросок · Кинетика',
    description: 'Тяжёлый зубчатый щит-бумеранг: пробивает толпу туда-обратно, вызывая Детонацию шлака и Коллапс Пустоты'
  },
  scythe: {
    name: 'Коса Бездны',
    tags: ['void', 'ice'],
    isHeavyMelee: 1,
    role: 'Тяжёлая жатва · Пустота/Лёд',
    description: 'Широкий серповидный взмах ближнего боя: остужает, стягивает врагов перед героем и бьёт Коллапсом Пустоты'
  }
};

/**
 * Матрица межклассовых стихийных реакций (общие статусы врагов для всех игроков в коопе).
 */
const ELEMENTAL_REACTIONS = {
  steam: {
    id: 'steam',
    name: 'Пар',
    comboLabel: 'Огонь + Лёд',
    colorHex: 0xd8f8ff,
    aoeRadius: 4.5,
    damageMultiplier: 2.0,
    blindDuration: 3.5,
    description: 'Мгновенный AoE-взрыв пара с двойным уроном (×2) и ослеплением мобов на 3.5 с'
  },
  superconduct: {
    id: 'superconduct',
    name: 'Сверхпроводимость',
    comboLabel: 'Лёд + Молния',
    colorHex: 0x60e8ff,
    defenseReduction: 0.30,
    debuffDuration: 6.0,
    arcDamageFraction: 0.55,
    description: 'Электрический разряд бьёт по всем замороженным целям на этаже и снижает их защиту на 30%'
  },
  slag: {
    id: 'slag',
    name: 'Детонация шлака',
    comboLabel: 'Огонь + Кинетика',
    colorHex: 0xff6818,
    puddleCount: 3,
    puddleRadius: 2.1,
    puddleDuration: 5.5,
    description: 'Кинетический удар по горящему врагу разбрасывает вокруг 3 мини-лужи магмы, сжигающие мобов'
  },
  collapse: {
    id: 'collapse',
    name: 'Коллапс Пустоты',
    comboLabel: 'Стяжка/Замедление + Тяжёлый удар',
    colorHex: 0xb848ff,
    heavyMeleeBonus: 0.50,
    implosionRadius: 4.2,
    description: 'Стянутые или замедленные в одной точке враги получают +50% урона от тяжёлых атак ближнего боя'
  }
};

/**
 * Пассивные предметы и реликвии с компромиссами (до 5 стаков) и их синергии по тегам.
 */
const ITEMS = {
  coal: {
    name: 'Угольный сапог',
    tags: ['fire', 'kin'],
    isTradeoff: 0,
    description: 'Приземление: тяжёлая огненно-кинетическая волна 3 м (активирует Детонацию шлака)'
  },
  ice: {
    name: 'Ледяная подошва',
    tags: ['ice', 'kin'],
    isTradeoff: 0,
    description: 'Рывок замораживает врагов вокруг; основа для реакций Пар (×2) и Сверхпроводимость'
  },
  belt: {
    name: 'Громовой пояс',
    tags: ['elec'],
    isTradeoff: 0,
    description: 'Каждый 5-й удар: цепная молния (по замёрзшим вызывает Сверхпроводимость −30% защиты)'
  },
  comp: {
    name: 'Компас высоты',
    tags: ['alt'],
    isTradeoff: 0,
    roleLabel: 'Верхний стрелок',
    description: '«Верхний стрелок»: +4% урона за 4 м над лавой (до +65%), с балкона +35% дальности и ×1.35 крит по низине'
  },
  heart: {
    name: 'Лавовое сердце',
    tags: ['fire', 'alt'],
    isTradeoff: 0,
    roleLabel: 'Нижний страж',
    description: '«Нижний страж»: ближе 7 м к лаве +45% урона, −40% ожога от лавы и замедление подъёма лавы для команды на 22%'
  },
  crys: {
    name: 'Плавильный кристалл',
    tags: ['fire', 'loot'],
    isTradeoff: 0,
    description: 'Горящие и поражённые реакциями враги дают +50% опыта'
  },
  lead: {
    name: 'Свинцовые наплечники',
    tags: ['kin', 'curse'],
    isTradeoff: 1,
    description: 'КОМПРОМИСС: +60% урона и иммунитет к отталкиванию/стяжке, но −25% скорости и отключение двойного прыжка'
  },
  glass: {
    name: 'Стеклянный горн',
    tags: ['fire', 'curse'],
    isTradeoff: 1,
    description: 'КОМПРОМИСС: итоговый урон ×1.8, но получаемый игроком урон ×2.0'
  },
  cryo_core: {
    name: 'Криогенный реактор',
    tags: ['ice', 'elec', 'curse'],
    isTradeoff: 1,
    description: 'КОМПРОМИСС: +40% темпа атак и авто-охлаждение целей, но макс. HP −25% и нет пассивной регенерации'
  },
  void_shackle: {
    name: 'Кандалы Пустоты',
    tags: ['void', 'curse'],
    isTradeoff: 1,
    description: 'КОМПРОМИСС: +45% радиуса взрывов/стяжки и +35% урона по замедленным, но перезарядка рывка (Shift) ×1.8'
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
 * Конфигурация трёх рангов боссов (этажи 4, 8 и 12 / 16, 20 и 24 в 3 актах).
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
 * Игровые персонажи (5 Угленосцев Пепельной гильдии) с уникальными кооперативными аурами.
 */
const HEROES = {
  wan: {
    name: 'Угленосец · Странник',
    startWeapon: 'fire',
    coopAuraName: 'Путеводный горн (12 м)',
    coopAuraRadius: 12,
    coopAuraDesc: 'Аура 12 м: +15% скорости бега и темпа атак союзникам, +25% к скорости захвата кругов и раздувания углей.',
    description: 'Сбалансированный лидер. Кооп-аура (12 м): +15% скорости и темпа атак группе, +25% к захвату кругов.',
    unlockCondition: ''
  },
  pil: {
    name: 'Угленосец · Пилигрим',
    startWeapon: 'spear',
    coopAuraName: 'Поступь ветра (12 м)',
    coopAuraRadius: 12,
    coopAuraDesc: 'Аура 12 м: даёт союзникам −30% перезарядки рывка (Shift) и +20% урона с полуэтажей-балконов.',
    description: 'Тройной прыжок, HP −20%. Кооп-аура (12 м): −30% КД рывка и +20% снайперского урона с высоты всей группе.',
    unlockCondition: 'Дойти до 6-го этажа'
  },
  smi: {
    name: 'Угленосец · Кузнец',
    startWeapon: 'wave',
    coopAuraName: 'Скидка горна (12 м)',
    coopAuraRadius: 12,
    coopAuraDesc: 'Аура 12 м: снижает цену сундуков на 30% для всех игроков в радиусе 12 м и даёт +15% кинетического урона.',
    description: 'Старт с Угольным сапогом. Кооп-аура (12 м): сундуки на 30% дешевле для всех союзников рядом +15% кин. урона.',
    unlockCondition: 'Открыть 3 сундука за один забег'
  },
  ash: {
    name: 'Угленосец · Пепельник',
    startWeapon: 'fire',
    coopAuraName: 'Пепельное причастие',
    coopAuraRadius: 18,
    coopAuraDesc: 'При убийстве горящего врага лечит на 2% HP и себя, и ближайшего раненого союзника (+15% урона огнём).',
    description: 'Огонь +15%. Кооп-пассив: убийство горящего врага лечит на 2% HP и себя, и ближайшего раненого союзника.',
    unlockCondition: 'Убить элитного моба'
  },
  hun: {
    name: 'Угленосец · Охотник',
    startWeapon: 'chain',
    coopAuraName: 'Метка уязвимости',
    coopAuraRadius: 36,
    coopAuraDesc: 'Удары по элитам и боссам вешают командную Метку уязвимости (+25% урона от всей группы на 5 с).',
    description: '+50% урона по элитам/боссам (−15% по обычным). Кооп-пассив: вешает на элит и боссов Метку (+25% урона для всей группы).',
    unlockCondition: 'Победить босса'
  }
};

/**
 * Названия планировок этажей (включая разделённые сектора после развилки).
 */
const FLOOR_LAYOUT_NAMES = {
  disc: 'Арена',
  ring: 'Кольцо (широкое 8 м)',
  spokes: 'Мосты (широкие 8 м)',
  islands: 'Острова',
  split_ring: 'Разделённые сектора (Тихий / Опасный)'
};

/**
 * Командные мини-квесты для снятия малых печатей лестницы на обычных этажах (15–25 с)
 * по образцу The Spell Brigade и Risk of Rain 2.
 */
const FLOOR_MINI_QUESTS = {
  rune_circles: {
    id: 'rune_circles',
    name: 'Рунные круги печати',
    shortName: 'Рунные круги',
    targetDuration: 18,
    maxSealDuration: 24,
    description: 'Одновременно удерживайте N рунных кругов по краям арены для снятия печати'
  },
  seal_guardians: {
    id: 'seal_guardians',
    name: 'Хранители печати',
    shortName: 'Хранители печати',
    targetDuration: 20,
    maxSealDuration: 25,
    description: 'Убейте элитных Хранителей печати, чтобы разрушить барьер лестницы'
  },
  forge_core: {
    id: 'forge_core',
    name: 'Ядро горна',
    shortName: 'Ядро горна',
    targetDuration: 19,
    maxSealDuration: 25,
    carrierSpeedMul: 0.68,
    description: 'Перенесите тяжёлое Ядро горна к лестнице (несущий замедлен и не атакует, союзники прикрывают)'
  }
};

const FLOOR_MINI_QUEST_KEYS = Object.keys(FLOOR_MINI_QUESTS);

/**
 * Расширенный пул случайных событий на этажах (адаптированные под группу 2–4 игроков
 * + новые кооперативные события «Связующая цепь» и «Полярный резонанс»).
 */
const FLOOR_EVENTS = {
  storm: {
    name: 'Лавовый шторм (групповой)',
    shortName: 'Лавовый шторм',
    duration: 22,
    isCoop: 0,
    description: 'Метеоры бьют по позициям отряда, оставляя золотой шлак'
  },
  hunt: {
    name: 'Охота элит (стая)',
    shortName: 'Охота элит',
    duration: 20,
    isCoop: 0,
    description: 'Охотники за головами по числу игроков (+награда отряду за зачистку)'
  },
  gold: {
    name: 'Золотая лихорадка (жилы горна)',
    shortName: 'Золотая лихорадка',
    duration: 25,
    isCoop: 0,
    description: 'Шанс золота ×3 и выбросы золотых самородков вокруг отряда'
  },
  surge: {
    name: 'Прилив лавы',
    shortName: 'Прилив лавы',
    duration: 20,
    isCoop: 0,
    description: 'Ускоренный подъём стихии с командной наградой за выживание'
  },
  chain: {
    name: 'Связующая цепь (+35% урона ближе 10 м)',
    shortName: 'Связующая цепь',
    duration: 24,
    isCoop: 1,
    tetherMaxDist: 10,
    damageBonus: 0.35,
    description: 'Бонус +35% к урону и электрическая дуга, пока игроки ближе 10 м друг от друга'
  },
  polar: {
    name: 'Полярный резонанс (противоположные края)',
    shortName: 'Полярный резонанс',
    duration: 24,
    isCoop: 1,
    damageBonus: 0.4,
    speedBonus: 0.2,
    description: 'Держитесь на противоположных краях арены для резонанса (+40% урона и волны)'
  }
};

const FLOOR_EVENT_KEYS = Object.keys(FLOOR_EVENTS);

/**
 * Параметры механики возрождения «Угасающий уголь» (по аналогии с Vampire Survivors).
 */
const FADING_EMBER_CONFIG = {
  reviveChannelTime: 3.0,
  reviveRadius: 3.0,
  reviveHpFraction: 0.55,
  bossVictoryReviveHpFraction: 0.65
};

/**
 * Алтари пактов (риск в обмен на награду, с учётом лимита 2 слотов оружия).
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
    description: 'Макс. HP −20%, активное оружие +1 уровень',
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
 * Конфигурация трёх башен с зафиксированными параметрами шейдеров/VFX из 3D-макетов
 * и параметрами периодических «Бурь».
 */
const TOWERS = {
  ash: {
    id: 'ash',
    name: 'Пепельная башня',
    actTitle: 'АКТ I · ПЕПЕЛЬНАЯ БАШНЯ',
    hazardGenitive: 'лавы',
    loseTitle: 'ЛАВА ПОБЕДИЛА',
    description:
      'Детализированный базальт с обугленными участками и редкими лавовыми трещинами, 3D-ручьи текущей по стенам и ступеням магмы, кипящие лужи на полу и атмосфера «Великого Горна».',
    unlockCondition: '',
    fogColor: 0x220707,
    fogDensity: 0.0165,
    hemiSkyColor: 0x525664,
    hemiGroundColor: 0xd93800,
    dirLightColor: 0x8a92a6,
    dirLightIntensity: 0.75,
    lavaLightColor: 0xff5a18,
    lavaLightIntensity: 2.6,
    rimLightColor: 0xff4800,
    blockColors: [0x7c7e84, 0x6e7076, 0x5c5e64],
    layoutWeights: [0.15, 0.4, 0.7],
    islandRemoveProb: 0.32,
    dustColor: 0xff7722,
    dustSize: 0.52,
    dustOpacity: 0.85,
    backgroundGradient: ['#140505', '#220707', '#3a0a06'],
    vfxBase: {
      bloomStrength: 0.3,
      bloomThreshold: 0.14,
      bloomRadius: 0.55,
      heatDistortion: 0.039,
      lavaSpeed: 2.25,
      fogDensity: 0.065,
      renderFogDensity: 0.0165
    },
    vfxStorm: {
      stormName: 'ПЕПЕЛЬНАЯ БУРЯ',
      bloomStrength: 2.2,
      bloomThreshold: 0.14,
      bloomRadius: 0.65,
      heatDistortion: 0.073,
      lavaSpeed: 3.15,
      fogDensity: 0.03,
      renderFogDensity: 0.032
    }
  },
  ice: {
    id: 'ice',
    name: 'Ледяная башня',
    actTitle: 'АКТ II · ЛЕДЯНАЯ БАШНЯ',
    hazardGenitive: 'метели',
    loseTitle: 'МЕТЕЛЬ ПОБЕДИЛА',
    description:
      'Полупрозрачный лёд (IOR 1.31) с вмёрзшими силуэтами тех, кто не дошёл до вершины, зеркальный пол со светящимися трещинами (#88ddff), сосульки на ступенях и 3-слойная воронка метели.',
    unlockCondition: 'Победить Лавового Колосса в Пепельной башне',
    fogColor: 0xc4e2f5,
    fogDensity: 0.004,
    hemiSkyColor: 0xb8e2f2,
    hemiGroundColor: 0xe8f7ff,
    dirLightColor: 0xe6f7ff,
    dirLightIntensity: 0.78,
    lavaLightColor: 0x88ddff,
    lavaLightIntensity: 2.2,
    rimLightColor: 0x9be6ff,
    blockColors: [0x8bc9eb, 0x9edbff, 0x7ba6c2],
    layoutWeights: [0.25, 0.45, 0.7],
    islandRemoveProb: 0.3,
    isSlipperyIce: 1,
    hasColdPenalty: 1,
    hazardSpeedMul: 0.85,
    enemyHpMul: 1.15,
    dustColor: 0xe8f7ff,
    dustSize: 0.44,
    dustOpacity: 0.88,
    backgroundGradient: ['#0a1526', '#264e73', '#d0e8f7'],
    vfxBase: {
      bloomStrength: 0.0,
      bloomThreshold: 0.72,
      bloomRadius: 0.65,
      crackEmissive: 1.95,
      fogDensity: 0.004,
      renderFogDensity: 0.004,
      blizzardSpeed: 0.5
    },
    vfxStorm: {
      stormName: 'ЛЕДЯНОЙ БУРАН',
      bloomStrength: 0.08,
      bloomThreshold: 0.62,
      bloomRadius: 0.68,
      crackEmissive: 2.55,
      fogDensity: 0.024,
      renderFogDensity: 0.024,
      blizzardSpeed: 0.9
    }
  },
  void: {
    id: 'void',
    name: 'Башня Пустоты',
    actTitle: 'АКТ III · БАШНЯ ПУСТОТЫ',
    hazardGenitive: 'бездны',
    loseTitle: 'БЕЗДНА ПОБЕДИЛА',
    description:
      'Тёмно-фиолетовый камень (#12081c) с асинхронными рунами и лентами абсолютной тьмы, обсидиановый пол со звёздной пылью, растворённые ступени, парящие осколки и аномальная гравитация.',
    unlockCondition: 'Победить в Ледяной башне',
    fogColor: 0x070210,
    fogDensity: 0.0092,
    hemiSkyColor: 0x1a0933,
    hemiGroundColor: 0x000000,
    dirLightColor: 0xa855f7,
    dirLightIntensity: 0.52,
    lavaLightColor: 0x8a2be2,
    lavaLightIntensity: 3.1,
    rimLightColor: 0xa855f7,
    blockColors: [0x12081c, 0x1a0c28, 0x0e0618],
    layoutWeights: [0.05, 0.3, 0.55],
    islandRemoveProb: 0.42,
    gravityMul: 0.62,
    canEnemiesBlink: 1,
    dustColor: 0xa855f7,
    dustSize: 0.42,
    dustOpacity: 0.85,
    backgroundGradient: ['#030106', '#090412', '#1a0933'],
    vfxBase: {
      bloomStrength: 0.30,
      bloomThreshold: 0.18,
      bloomRadius: 0.65,
      rgbShift: 0.0046,
      gravityAnomaly: 1.4,
      dissolveThreshold: 0.39,
      renderFogDensity: 0.0092,
      gravityMul: 0.62
    },
    vfxStorm: {
      stormName: 'ШТОРМ ПУСТОТЫ',
      bloomStrength: 2.15,
      bloomThreshold: 0.16,
      bloomRadius: 0.72,
      rgbShift: 0.0080,
      gravityAnomaly: 2.35,
      dissolveThreshold: 0.65,
      renderFogDensity: 0.022,
      gravityMul: 0.35
    }
  }
};

const TOWER_IDS = ['ash', 'ice', 'void'];

/**
 * Этажи-развилки (FORK_FLOORS):
 * В 0-индексации [1, 5, 9, 13, 17, 21] соответствуют 2, 6, 10 этажам (и 14, 18, 22 в 3-актном забеге).
 */
const FORK_FLOORS = [1, 5, 9, 13, 17, 21];

/**
 * Конфигурации дистанции забега (3 акта на 24 этажа, 3 акта на 18 этажей или классические 12 этажей).
 */
const RUN_CAMPAIGN_MODES = {
  acts3_24: {
    id: 'acts3_24',
    name: '3 Акта · 24 этажа (Большое приключение)',
    shortLabel: '3 Акта (24 эт.)',
    totalFloors: 24,
    isThreeAct: 1,
    floorsPerAct: 8,
    bossFloors: [3, 7, 11, 15, 19, 23],
    forgeHallAfterFloors: [3, 7, 11, 15, 19],
    description: 'Бесшовное восхождение: Пепельная (1–8) → Ледяная (9–16) → Пустотная (17–24) башни, 6 боссов и Залы Кузницы.'
  },
  acts3_18: {
    id: 'acts3_18',
    name: '3 Акта · 18 этажей (Ускоренная трилогия)',
    shortLabel: '3 Акта (18 эт.)',
    totalFloors: 18,
    isThreeAct: 1,
    floorsPerAct: 6,
    bossFloors: [3, 5, 9, 11, 15, 17],
    forgeHallAfterFloors: [3, 5, 9, 11, 15],
    description: 'Три акта по 6 этажей (Пепел 1–6 → Лёд 7–12 → Пустота 13–18) с Залами Кузницы после боссов.'
  },
  single_12: {
    id: 'single_12',
    name: '1 Акт · 12 этажей (Выбранная башня)',
    shortLabel: '1 Акт (12 эт.)',
    totalFloors: 12,
    isThreeAct: 0,
    floorsPerAct: 12,
    bossFloors: [3, 7, 11],
    forgeHallAfterFloors: [3, 7],
    description: 'Классический забег на 12 этажей в одной выбранной башне с Залами Кузницы между 4–5 и 8–9 этажами.'
  }
};

/**
 * Параметры масштабирования сетки этажа под 1, 2 и 3–4 игроков.
 */
const COOP_SCALE_PRESETS = {
  1: { playerCount: 1, gridDim: 15, gridOffset: 7, radiusMeters: 28, label: '1 игрок · 15×15 (R=28 м)' },
  2: { playerCount: 2, gridDim: 19, gridOffset: 9, radiusMeters: 36, label: '2 игрока · 19×19 (R=36 м)' },
  3: { playerCount: 3, gridDim: 23, gridOffset: 11, radiusMeters: 44, label: '3 игрока · 23×23 (R=44 м)' },
  4: { playerCount: 4, gridDim: 23, gridOffset: 11, radiusMeters: 44, label: '4 игрока · 23×23 (R=44 м)' }
};

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
