/* ==========================================================================
   Звуковой движок:
   1) Процедурные фоновые эмбиент-сцены трёх башен (перенесены из 3D-макетов):
      - Пепельная башня: гул Великого Горна (низкочастотный шум + LFO-фильтр)
      - Ледяная башня: завывание бездонного бурана (розовый шум + полосовой фильтр с LFO)
      - Башня Пустоты: мистический дрон Бездны (два осциллятора A1 + E2 через резонансный фильтр)
   2) Поверх фонового эмбиента накладываются процедурные звуковые эффекты боя,
      получения урона, прыжков, сбора лута, боссов и бурь с лимитером голосов
   ========================================================================== */

let audioContext = null;
let isAudioMuted = false;
let currentAmbientTowerId = 'ash';
let currentStormAudioFactor = 0;

const ambientNodes = {
  initialized: false,
  masterGain: null,
  ash: null,
  ice: null,
  void: null
};

const lastSoundTimeByType = {};
const soundEngineState = {
  activeVoices: 0,
  maxVoices: 14,
  minIntervalMs: 38
};

/**
 * Таблица звуковых пресетов: [частота Гц, длительность с, форма волны, громкость]
 */
const SOUND_PRESETS = {
  hit: [220, 0.08, 'square', 0.06],
  shoot: [520, 0.09, 'triangle', 0.05],
  jump: [300, 0.12, 'sine', 0.05],
  bounce: [180, 0.25, 'sine', 0.09],
  pickup: [660, 0.18, 'sine', 0.08],
  hurt: [110, 0.2, 'sawtooth', 0.09],
  sizzle: [145, 0.14, 'sawtooth', 0.045],
  boom: [70, 0.4, 'sawtooth', 0.12],
  win: [880, 0.6, 'triangle', 0.1],
  roar: [52, 0.75, 'sawtooth', 0.14],
  pound: [42, 0.55, 'sawtooth', 0.16],
  shield: [880, 0.07, 'square', 0.035],
  summon: [150, 0.35, 'triangle', 0.06],
  geyser: [85, 0.5, 'sawtooth', 0.1],
  storm: [64, 0.9, 'sawtooth', 0.11]
};

const DEFAULT_SOUND_PRESET = [440, 0.1, 'sine', 0.05];

function ensureAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

/**
 * Инициализирует все три процедурных фоновых эмбиента из макетов башен
 * и плавно микширует активную башню.
 */
function initAmbientSoundscapes() {
  if (ambientNodes.initialized) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const masterGain = ctx.createGain();
    masterGain.gain.value = isAudioMuted ? 0.0 : 1.0;
    masterGain.connect(ctx.destination);
    ambientNodes.masterGain = masterGain;

    // -------------------------------------------------------------------------
    // 1. ПЕПЕЛЬНАЯ БАШНЯ — Синтезированный гул Великого Горна (из ash tower.html)
    // -------------------------------------------------------------------------
    const ashGain = ctx.createGain();
    ashGain.gain.value = 0.0;
    ashGain.connect(masterGain);

    const ashBufferSize = ctx.sampleRate * 4;
    const ashNoiseBuffer = ctx.createBuffer(1, ashBufferSize, ctx.sampleRate);
    const ashOutput = ashNoiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < ashBufferSize; i++) {
      const white = Math.random() * 2 - 1;
      ashOutput[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = ashOutput[i];
      ashOutput[i] *= 3.2;
    }

    const ashNoise = ctx.createBufferSource();
    ashNoise.buffer = ashNoiseBuffer;
    ashNoise.loop = true;

    const ashLowpass = ctx.createBiquadFilter();
    ashLowpass.type = 'lowpass';
    ashLowpass.frequency.value = 115;

    const ashLfo = ctx.createOscillator();
    ashLfo.frequency.value = 0.18;
    const ashLfoGain = ctx.createGain();
    ashLfoGain.gain.value = 45;
    ashLfo.connect(ashLfoGain);
    ashLfoGain.connect(ashLowpass.frequency);
    ashLfo.start();

    ashNoise.connect(ashLowpass);
    ashLowpass.connect(ashGain);
    ashNoise.start();

    ambientNodes.ash = {
      gain: ashGain,
      filter: ashLowpass,
      lfo: ashLfo,
      lfoGain: ashLfoGain,
      baseVolume: 0.28,
      baseFreq: 115
    };

    // -------------------------------------------------------------------------
    // 2. ЛЕДЯНАЯ БАШНЯ — Генеративный звук ледяного бурана (из ice tower.html)
    // -------------------------------------------------------------------------
    const iceGain = ctx.createGain();
    iceGain.gain.value = 0.0;
    iceGain.connect(masterGain);

    const iceBufferSize = ctx.sampleRate * 3;
    const iceNoiseBuffer = ctx.createBuffer(1, iceBufferSize, ctx.sampleRate);
    const iceOutput = iceNoiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < iceBufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      iceOutput[i] = (b0 + b1 + b2 + white * 0.02) * 0.35;
    }

    const iceNoise = ctx.createBufferSource();
    iceNoise.buffer = iceNoiseBuffer;
    iceNoise.loop = true;

    const iceBandpass = ctx.createBiquadFilter();
    iceBandpass.type = 'bandpass';
    iceBandpass.frequency.value = 340;
    iceBandpass.Q.value = 2.8;

    const iceLfo = ctx.createOscillator();
    iceLfo.type = 'sine';
    iceLfo.frequency.value = 0.16;
    const iceLfoGain = ctx.createGain();
    iceLfoGain.gain.value = 180;
    iceLfo.connect(iceLfoGain);
    iceLfoGain.connect(iceBandpass.frequency);
    iceLfo.start();

    iceNoise.connect(iceBandpass);
    iceBandpass.connect(iceGain);
    iceNoise.start();

    ambientNodes.ice = {
      gain: iceGain,
      filter: iceBandpass,
      lfo: iceLfo,
      lfoGain: iceLfoGain,
      baseVolume: 0.20,
      baseFreq: 340
    };

    // -------------------------------------------------------------------------
    // 3. БАШНЯ ПУСТОТЫ — Мистический эмбиент-гул Бездны (из void tower.html)
    // -------------------------------------------------------------------------
    const voidGain = ctx.createGain();
    voidGain.gain.value = 0.0;
    voidGain.connect(masterGain);

    const voidOsc1 = ctx.createOscillator();
    const voidOsc2 = ctx.createOscillator();
    const voidFilter = ctx.createBiquadFilter();

    voidOsc1.type = 'sawtooth';
    voidOsc1.frequency.value = 55.0; // Нота A1
    voidOsc2.type = 'triangle';
    voidOsc2.frequency.value = 82.41; // Квинта E2

    voidFilter.type = 'lowpass';
    voidFilter.frequency.value = 190;
    voidFilter.Q.value = 4.5;

    voidOsc1.connect(voidFilter);
    voidOsc2.connect(voidFilter);
    voidFilter.connect(voidGain);

    voidOsc1.start();
    voidOsc2.start();

    ambientNodes.void = {
      gain: voidGain,
      filter: voidFilter,
      osc1: voidOsc1,
      osc2: voidOsc2,
      baseVolume: 0.16,
      baseFreq: 190
    };

    ambientNodes.initialized = true;
    syncAmbientToTower(currentAmbientTowerId, currentStormAudioFactor);
  } catch (err) {
    // Игнорируем возможные ограничения Web Audio до жеста пользователя
  }
}

/**
 * Переключает или обновляет фоновый эмбиент башни и модулирует его под Бурю.
 * @param {string} towerId 'ash' | 'ice' | 'void'
 * @param {number} stormFactor 0..1
 */
function syncAmbientToTower(towerId, stormFactor = 0) {
  if (towerId) currentAmbientTowerId = towerId;
  currentStormAudioFactor = Math.max(0, Math.min(1, stormFactor || 0));

  if (!ambientNodes.initialized || !audioContext) return;
  const now = audioContext.currentTime;

  for (const id of ['ash', 'ice', 'void']) {
    const node = ambientNodes[id];
    if (!node) continue;
    const isActive = id === currentAmbientTowerId && !isAudioMuted;
    const stormBoost = isActive ? 1 + currentStormAudioFactor * 0.68 : 0;
    const targetGain = isActive ? node.baseVolume * stormBoost : 0.0;
    node.gain.gain.setTargetAtTime(targetGain, now, 0.25);

    if (isActive && node.filter) {
      const freqBoost =
        id === 'ash'
          ? currentStormAudioFactor * 75
          : id === 'ice'
            ? currentStormAudioFactor * 160
            : currentStormAudioFactor * 130;
      node.filter.frequency.setTargetAtTime(node.baseFreq + freqBoost, now, 0.25);
    }
  }
}

/**
 * Включает/выключает звук игры (фоновый эмбиент + SFX).
 */
function toggleGameAudioMute() {
  isAudioMuted = !isAudioMuted;
  ensureAudioContext();
  if (!ambientNodes.initialized) {
    initAmbientSoundscapes();
  }
  if (ambientNodes.masterGain && audioContext) {
    ambientNodes.masterGain.gain.setTargetAtTime(
      isAudioMuted ? 0.0 : 1.0,
      audioContext.currentTime,
      0.15
    );
  }
  syncAmbientToTower(currentAmbientTowerId, currentStormAudioFactor);
  updateAudioButtonUI();
  return !isAudioMuted;
}

function updateAudioButtonUI() {
  const btn = document.getElementById('audioToggleBtn');
  if (!btn) return;
  const towerNames = { ash: 'Горн', ice: 'Буран', void: 'Бездна' };
  const label = towerNames[currentAmbientTowerId] || 'Звук';
  btn.textContent = isAudioMuted ? `🔇 Звук: Выкл` : `🔊 ${label}: Вкл`;
  btn.classList.toggle('muted', isAudioMuted);
}

// Автоматический запуск фонового эмбиента башни при первом жесте пользователя
function onFirstUserAudioGesture() {
  ensureAudioContext();
  if (!ambientNodes.initialized) {
    initAmbientSoundscapes();
  } else {
    syncAmbientToTower(currentAmbientTowerId, currentStormAudioFactor);
  }
  updateAudioButtonUI();
}

window.addEventListener('pointerdown', onFirstUserAudioGesture, { passive: true });
window.addEventListener('keydown', onFirstUserAudioGesture, { passive: true });

/**
 * Воспроизводит процедурный звуковой эффект поверх фонового эмбиента.
 * @param {string} soundName
 */
function playSound(soundName) {
  try {
    if (!ambientNodes.initialized) {
      initAmbientSoundscapes();
    }
    if (isAudioMuted) return;

    const preset = SOUND_PRESETS[soundName] || DEFAULT_SOUND_PRESET;
    const [frequency, duration, waveType, volume] = preset;

    const now = window.performance && performance.now ? performance.now() : Date.now();
    const minInterval = soundName === 'sizzle' ? 180 : soundEngineState.minIntervalMs;
    if (
      lastSoundTimeByType[soundName] !== undefined &&
      now - lastSoundTimeByType[soundName] < minInterval
    ) {
      return;
    }
    if (soundEngineState.activeVoices >= soundEngineState.maxVoices) {
      return;
    }

    lastSoundTimeByType[soundName] = now;
    soundEngineState.activeVoices++;
    setTimeout(() => {
      soundEngineState.activeVoices--;
    }, duration * 1000 + 30);

    const ctx = ensureAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const currentTime = ctx.currentTime;

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, frequency * (soundName === 'pickup' || soundName === 'win' ? 1.45 : 0.4)),
      currentTime + duration
    );

    gainNode.gain.setValueAtTime(volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(ctx.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  } catch (err) {
    // Игнорируем ошибки автовоспроизведения до первого клика пользователя
  }
}

window.toggleGameAudioMute = toggleGameAudioMute;
