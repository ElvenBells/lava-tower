/* ==========================================================================
   Звуковой движок: процедурный синтез Web Audio API с лимитером голосов
   (предотвращает создание сотен осцилляторов в секунду в массовых боях)
   ========================================================================== */

let audioContext = null;
const lastSoundTimeByType = {};
const soundEngineState = {
  activeVoices: 0,
  maxVoices: 12,
  minIntervalMs: 40
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
  boom: [70, 0.4, 'sawtooth', 0.12],
  win: [880, 0.6, 'triangle', 0.1],
  roar: [52, 0.75, 'sawtooth', 0.14],
  pound: [42, 0.55, 'sawtooth', 0.16],
  shield: [880, 0.07, 'square', 0.035],
  summon: [150, 0.35, 'triangle', 0.06],
  geyser: [85, 0.5, 'sawtooth', 0.1]
};

const DEFAULT_SOUND_PRESET = [440, 0.1, 'sine', 0.05];

/**
 * Воспроизводит процедурный звуковой эффект по имени пресета.
 * @param {string} soundName
 */
function playSound(soundName) {
  try {
    const preset = SOUND_PRESETS[soundName] || DEFAULT_SOUND_PRESET;
    const [frequency, duration, waveType, volume] = preset;

    const now = window.performance && performance.now ? performance.now() : Date.now();
    if (
      lastSoundTimeByType[soundName] !== undefined &&
      now - lastSoundTimeByType[soundName] < soundEngineState.minIntervalMs
    ) {
      return; // Не чаще 25 раз/с на один и тот же тип звука
    }
    if (soundEngineState.activeVoices >= soundEngineState.maxVoices) {
      return; // Общий потолок одновременных голосов
    }

    lastSoundTimeByType[soundName] = now;
    soundEngineState.activeVoices++;
    setTimeout(() => {
      soundEngineState.activeVoices--;
    }, duration * 1000 + 30);

    audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const currentTime = audioContext.currentTime;

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.4, currentTime + duration);

    gainNode.gain.setValueAtTime(volume, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + duration);

    oscillator.connect(gainNode).connect(audioContext.destination);
    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);
  } catch (err) {
    // Игнорируем ошибки автовоспроизведения до первого клика пользователя
  }
}
