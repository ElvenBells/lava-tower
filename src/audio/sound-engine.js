/* ==========================================================================
   Звуковой движок (src/audio/sound-engine.js):
   1) Непрерывный фоновый процедурный эмбиент всех 3 башен, перенесённый из
      референсных сцен:
      - Пепельная башня: гул Великого Горна (броуновский шум + lowpass 115 Гц + LFO 0.18 Гц)
      - Ледяная башня: завывание бездонного бурана (розовый шум + bandpass 340 Гц + LFO 0.16 Гц)
      - Башня Пустоты: эфирный гул Границы Ничего (осцилляторы sawtooth 55 Гц + triangle 82.41 Гц + lowpass 190 Гц Q=4.5)
   2) Многослойные процедурные звуковые эффекты игры (атака, попадание, урон,
      прыжок, сбор лута, шипение лавовых луж, начало бури и т.д.), накладывающиеся
      поверх фонового эмбиента башни с лимитером голосов.
   ========================================================================== */

let audioContext = null;
const lastSoundTimeByType = {};
const soundEngineState = {
  activeVoices: 0,
  maxVoices: 14,
  minIntervalMs: 38,
  muted: false,
  currentTowerId: 'ash',
  stormFactor: 0,
  ambientStarted: false,
  ambientNodes: null
};

/**
 * Таблица звуковых пресетов: [частота Гц, длительность с, форма волны, громкость]
 */
const SOUND_PRESETS = {
  hit: [240, 0.085, 'square', 0.065],
  shoot: [540, 0.095, 'triangle', 0.055],
  jump: [310, 0.13, 'sine', 0.055],
  bounce: [190, 0.26, 'sine', 0.095],
  pickup: [680, 0.19, 'sine', 0.085],
  hurt: [115, 0.22, 'sawtooth', 0.095],
  boom: [72, 0.42, 'sawtooth', 0.125],
  win: [880, 0.62, 'triangle', 0.105],
  roar: [54, 0.78, 'sawtooth', 0.14],
  pound: [44, 0.56, 'sawtooth', 0.16],
  shield: [890, 0.075, 'square', 0.04],
  summon: [155, 0.36, 'triangle', 0.065],
  geyser: [88, 0.5, 'sawtooth', 0.1],
  lava_sizzle: [165, 0.14, 'sawtooth', 0.045],
  storm: [64, 0.85, 'sawtooth', 0.11]
};

const DEFAULT_SOUND_PRESET = [440, 0.1, 'sine', 0.05];

function getOrCreateAudioContext() {
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
 * Инициализирует все три ветки фонового эмбиента башен из референсных сцен
 * и плавно микширует активную башню.
 */
function ensureTowerAmbientAudio() {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (soundEngineState.ambientStarted && soundEngineState.ambientNodes) {
      syncTowerAmbientGains();
      return;
    }

    // ---------------- 1. ПЕПЕЛЬНАЯ БАШНЯ (Гул Великого Горна из babylon_js_glsl.html) ----------------
    const ashGain = ctx.createGain();
    ashGain.gain.value = 0.0;
    ashGain.connect(ctx.destination);

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

    // ---------------- 2. ЛЕДЯНАЯ БАШНЯ (Завывание ледяного бурана из babylon_js.html) ----------------
    const iceGain = ctx.createGain();
    iceGain.gain.value = 0.0;
    iceGain.connect(ctx.destination);

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

    // ---------------- 3. БАШНЯ ПУСТОТЫ (Эфирный гул Пустоты из babylon_js_environment.html) ----------------
    const voidGain = ctx.createGain();
    voidGain.gain.value = 0.0;
    voidGain.connect(ctx.destination);

    const voidOsc1 = ctx.createOscillator();
    const voidOsc2 = ctx.createOscillator();
    const voidFilter = ctx.createBiquadFilter();

    voidOsc1.type = 'sawtooth';
    voidOsc1.frequency.value = 55.0;
    voidOsc2.type = 'triangle';
    voidOsc2.frequency.value = 82.41;

    voidFilter.type = 'lowpass';
    voidFilter.frequency.value = 190;
    voidFilter.Q.value = 4.5;

    const voidLfo = ctx.createOscillator();
    voidLfo.type = 'sine';
    voidLfo.frequency.value = 0.22;
    const voidLfoGain = ctx.createGain();
    voidLfoGain.gain.value = 38;
    voidLfo.connect(voidLfoGain);
    voidLfoGain.connect(voidFilter.frequency);
    voidLfo.start();

    voidOsc1.connect(voidFilter);
    voidOsc2.connect(voidFilter);
    voidFilter.connect(voidGain);

    voidOsc1.start();
    voidOsc2.start();

    soundEngineState.ambientNodes = {
      ashGain,
      ashLowpass,
      iceGain,
      iceBandpass,
      voidGain,
      voidFilter,
      voidOsc1,
      voidOsc2
    };
    soundEngineState.ambientStarted = true;
    syncTowerAmbientGains();
  } catch (err) {
    // Игнорируем ограничения автозапуска до первого клика
  }
}

function syncTowerAmbientGains() {
  if (!audioContext || !soundEngineState.ambientNodes) return;
  const nodes = soundEngineState.ambientNodes;
  const now = audioContext.currentTime;
  const muted = soundEngineState.muted;
  const towerId = soundEngineState.currentTowerId || 'ash';
  const storm = Math.max(0, Math.min(1, soundEngineState.stormFactor || 0));

  const targetAsh = !muted && towerId === 'ash' ? 0.26 + storm * 0.14 : 0.0;
  const targetIce = !muted && towerId === 'ice' ? 0.18 + storm * 0.14 : 0.0;
  const targetVoid = !muted && towerId === 'void' ? 0.16 + storm * 0.11 : 0.0;

  nodes.ashGain.gain.setTargetAtTime(targetAsh, now, 0.35);
  nodes.iceGain.gain.setTargetAtTime(targetIce, now, 0.35);
  nodes.voidGain.gain.setTargetAtTime(targetVoid, now, 0.35);

  // Во время бури частота среза фильтров повышается, усиливая мощь гула/ветра/аномалии
  nodes.ashLowpass.frequency.setTargetAtTime(115 + storm * 85, now, 0.25);
  nodes.iceBandpass.frequency.setTargetAtTime(340 + storm * 210, now, 0.25);
  nodes.voidFilter.frequency.setTargetAtTime(190 + storm * 165, now, 0.25);
}

/**
 * Переключает фоновый эмбиент на выбранную башню ('ash' | 'ice' | 'void').
 * @param {string} towerId
 */
function setTowerAmbientTheme(towerId) {
  if (towerId) {
    soundEngineState.currentTowerId = towerId;
  }
  if (soundEngineState.ambientStarted) {
    syncTowerAmbientGains();
  }
}

/**
 * Плавно модулирует фоновый звук башни во время периодической Бури (0..1).
 * @param {number} stormFactor
 */
function setTowerStormAudioFactor(stormFactor) {
  const clamped = Math.max(0, Math.min(1, +stormFactor || 0));
  if (Math.abs(clamped - soundEngineState.stormFactor) < 0.02) return;
  soundEngineState.stormFactor = clamped;
  if (soundEngineState.ambientStarted) {
    syncTowerAmbientGains();
  }
}

function toggleGameAudioMute() {
  soundEngineState.muted = !soundEngineState.muted;
  ensureTowerAmbientAudio();
  syncTowerAmbientGains();
  return soundEngineState.muted;
}

function isGameAudioMuted() {
  return soundEngineState.muted;
}

// Автоматическая разблокировка фонового эмбиента башни при первом действии игрока
['pointerdown', 'keydown', 'mousedown', 'touchstart'].forEach((evtName) => {
  window.addEventListener(
    evtName,
    () => {
      ensureTowerAmbientAudio();
    },
    { passive: true }
  );
});

/**
 * Воспроизводит процедурный звуковой эффект поверх фонового эмбиента башни.
 * @param {string} soundName
 */
function playSound(soundName) {
  try {
    ensureTowerAmbientAudio();
    if (soundEngineState.muted) return;

    const preset = SOUND_PRESETS[soundName] || DEFAULT_SOUND_PRESET;
    const [frequency, duration, waveType, volume] = preset;

    const now = window.performance && performance.now ? performance.now() : Date.now();
    const minInterval = soundName === 'lava_sizzle' ? 180 : soundEngineState.minIntervalMs;
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
      soundEngineState.activeVoices = Math.max(0, soundEngineState.activeVoices - 1);
    }, duration * 1000 + 35);

    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    const currentTime = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.type = waveType;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, frequency * 4.5), currentTime);

    if (soundName === 'pickup' || soundName === 'win') {
      oscillator.frequency.setValueAtTime(frequency * 0.85, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.45, currentTime + duration * 0.65);
    } else if (soundName === 'jump' || soundName === 'bounce') {
      oscillator.frequency.setValueAtTime(frequency * 0.75, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.35, currentTime + duration);
    } else if (soundName === 'storm') {
      oscillator.frequency.setValueAtTime(frequency * 1.2, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, currentTime + duration);
      filter.frequency.setValueAtTime(360, currentTime);
    } else {
      oscillator.frequency.setValueAtTime(frequency, currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(24, frequency * 0.38),
        currentTime + duration
      );
    }

    gainNode.gain.setValueAtTime(0.001, currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, currentTime + Math.min(0.015, duration * 0.2));
    gainNode.gain.exponentialRampToValueAtTime(0.0008, currentTime + duration);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);

    // Дополнительный суб-гармонический или кристаллический обертон для выразительности SFX
    if (soundName === 'boom' || soundName === 'pound' || soundName === 'hurt' || soundName === 'pickup') {
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = soundName === 'pickup' ? 'triangle' : 'sine';
      const subFreq = soundName === 'pickup' ? frequency * 1.5 : frequency * 0.5;
      subOsc.frequency.setValueAtTime(subFreq, currentTime);
      subOsc.frequency.exponentialRampToValueAtTime(
        soundName === 'pickup' ? subFreq * 1.25 : Math.max(20, subFreq * 0.45),
        currentTime + duration
      );
      subGain.gain.setValueAtTime(volume * 0.55, currentTime);
      subGain.gain.exponentialRampToValueAtTime(0.0008, currentTime + duration);
      subOsc.connect(subGain).connect(ctx.destination);
      subOsc.start(currentTime);
      subOsc.stop(currentTime + duration);
    }
  } catch (err) {
    // Игнорируем ошибки автовоспроизведения до первого клика пользователя
  }
}
