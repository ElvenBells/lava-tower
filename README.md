# Lava Tower

3D экшен-рогалик на **Three.js (r128)** с процедурной генерацией башни, текстур, моделей и звука.

## Запуск проекта

Проект не требует сборщиков (Webpack/Vite) или установки `node_modules` и работает двумя способами:
1. **Прямой запуск из проводника (`file://`)**: откройте файл `index.html` двойным кликом в любом современном браузере.
2. **Через локальный сервер (`http://`)**: откройте папку проекта в VS Code и запустите расширение **Live Server** (или выполните `python3 -m http.server 8000`).

---

## Структура проекта

```text
lava-tower/
├── index.html                        # Точка входа (HTML-разметка HUD и подключение скриптов)
├── README.md                         # Описание архитектуры и карта переименований
├── css/
│   └── styles.css                    # Стили интерфейса, панелей меню, HUD и полосы босса
├── vendor/
│   └── three.min.js                  # Библиотека Three.js (r128)
└── src/
    ├── main.js                       # Прогрев шейдеров и главный игровой цикл (requestAnimationFrame)
    ├── utils/
    │   └── math-and-rng.js           # Математические функции, детерминированный ГСЧ, обёртка localStorage
    ├── audio/
    │   └── sound-engine.js           # Процедурный Web Audio API синтезатор звуков с лимитером голосов
    ├── config/
    │   └── game-data.js              # Баланс и статика: оружие, предметы, тома, враги, боссы, башни, кузница
    ├── graphics/
    │   ├── scene-setup.js            # Инициализация WebGLRenderer, сцены, камеры и источников света
    │   └── procedural-textures.js    # Генераторы всех процедурных Canvas-текстур
    ├── models/
    │   ├── player-model.js           # Модель героя, плоскость лавы, внешние стены и смена тем башен
    │   ├── geometry-utils.js         # Слияние геометрий (mergeGeometryParts), смещение вершин, подкраска
    │   ├── enemy-models.js           # Прототипы и сборка моделей обычных мобов (Огарёк, Шип, Страж, Прыгун)
    │   ├── boss-models.js            # Прототипы и сборка моделей 3 боссов (Голем, Матка, Колосс)
    │   └── mob-factory.js            # Объектный пул мешей мобов и боссов (MobFactory)
    ├── effects/
    │   └── particles-and-fx.js       # Пулы молний, искр, дыма, колец, снарядов, шлака, капель, гейзеров и лута
    ├── world/
    │   └── tower-generator.js        # Пространственная сетка блоков и процедурная генерация 12 этажей башни
    ├── game/
    │   ├── combat-and-loot.js        # Пространственная сетка врагов, урон, синергии, спавн, элиты, лут и события
    │   ├── boss-ai.js                # ИИ, опасные зоны и анимация поз трёх боссов
    │   ├── physics-and-step.js       # Обработка ввода, инициализация забега и шаг симуляции (updateGameStep)
    │   └── renderer.js               # Отрисовка кадра, LOD-анимация мобов и обновление HUD (renderGameFrame)
    └── ui/
        └── menus-and-hud.js          # Главное меню, выбор башни/героя, кузница, карточки наград, пакты и пауза
```

---

## Карта основных переименований (было → стало)

| Исходное имя | Новое имя | Назначение |
| :--- | :--- | :--- |
| `$` | `getById(id)` | Поиск DOM-элемента по `id` |
| `D`, `T`, `BD` | `Math`, `TWO_PI`, `BASE_DAMAGE` | Стандартный `Math`, `2π`, базовый урон (12) |
| `sh`, `R`, `day` | `hashString`, `seededRandom`, `getCurrentDateCode` | Хеширование строк, детерминированный ГСЧ, код даты `YYYYMMDD` |
| `ls`, `hyp`, `fmt` | `storage`, `hypot2D`, `formatTime` | Безопасная работа с `localStorage`, 2D-гипотенуза, формат `M:SS` |
| `sfx` | `playSound` | Процедурный синтез звуковых эффектов |
| `WP`, `IT`, `TM`, `MU` | `WEAPONS`, `ITEMS`, `TOMES`, `MUTATORS` | Конфиги оружия, предметов, томов и мутаторов |
| `TY`, `WAVET`, `POOL` | `ENEMY_TYPES`, `WAVE_THRESHOLDS`, `UPGRADE_POOL` | Параметры врагов, пороги спавна волн и пул улучшений |
| `BOSSD`, `ELITE`, `ELK` | `BOSS_CONFIGS`, `ELITE_MODIFIERS`, `ELITE_SCALE_BY_TYPE` | Параметры боссов и элитных врагов |
| `S` | `state` | Состояние текущего забега |
| `S.p` | `state.player` | Состояние игрока (`x, y, z, vy, isGrounded, doubleJumpsUsed, coyoteTimer, jumpBufferTimer, hp, lastGroundY...`) |
| `S.E`, `S.P`, `S.K` | `state.enemies`, `state.projectiles`, `state.pickups` | Списки активных врагов, снарядов и выпадающего лута |
| `B`, `pads`, `CH`, `ALT` | `blocks`, `jumpPads`, `chests`, `altars` | Геометрия блоков башни, трамплины, сундуки и алтари |
| `ov_(b, x, y, z)` | `isCollidingWithBlock(block, x, y, z)` | Проверка пересечения хитбокса игрока с блоком |
| `groundAt(x, y, z)` | `getGroundHeightAt(x, y, z)` | Поиск высоты пола под точкой через пространственную сетку |
| `build(seed)` | `buildTower(seed)` | Генерация 12 этажей башни по сиду |
| `step(dt)` | `updateGameStep(dt)` | Фиксированный шаг физики и игровой логики (60 Гц) |
| `render()` | `renderGameFrame(dt)` | Отрисовка 3D-сцены, LOD-анимаций и обновление HUD |
