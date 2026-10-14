/* ==========================================================================
   Утилиты: математика, детерминированный ГСЧ, работа с DOM и localStorage
   ========================================================================== */

const TWO_PI = Math.PI * 2;
const BASE_DAMAGE = 12;

/**
 * Быстрый доступ к DOM-элементу по ID.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function getById(id) {
  return document.getElementById(id);
}

/**
 * Экранирование спецсимволов для безопасной вставки в HTML.
 * @param {*} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value).replace(/[<>&"]/g, (char) => '&#' + char.charCodeAt(0) + ';');
}

/**
 * FNV-подобный 32-битный хеш строки.
 * @param {string} text
 * @returns {number}
 */
function hashString(text) {
  let hash = 7;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return hash >>> 0;
}

/**
 * Детерминированный генератор псевдослучайных чисел в диапазоне [0, 1).
 * Используется для генерации этажей, ежедневного сида и предложений наград.
 * @param {number} seed
 * @param {string} salt
 * @param {number} index
 * @returns {number}
 */
function seededRandom(seed, salt, index) {
  let hash = Math.imul(seed ^ hashString(salt), 2654435761) ^ Math.imul(index + 1, 2246822519);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 2246822519);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 3266489917);
  hash ^= hash >>> 16;
  return (hash >>> 0) / 4294967296;
}

/**
 * Текущая дата в формате YYYYMMDD (для ежедневного забега).
 * @returns {string}
 */
function getCurrentDateCode() {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * Безопасная обёртка над localStorage.
 */
const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (err) {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      // Игнорируем ошибки квоты или приватного режима браузера
    }
  }
};

/**
 * Быстрая длина 2D-вектора (замена Math.hypot в горячих циклах).
 * @param {number} x
 * @param {number} z
 * @returns {number}
 */
function hypot2D(x, z) {
  return Math.sqrt(x * x + z * z);
}

/**
 * Кратчайшая разница между двумя углами в радианах в диапазоне [-PI, PI].
 * @param {number} angleA
 * @param {number} angleB
 * @returns {number}
 */
function angleDiff(angleA, angleB) {
  let diff = (angleA - angleB) % TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff;
}

/**
 * Линейная интерполяция между a и b.
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Плавное ускорение и торможение (easeInOutQuad).
 */
function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Плавное замедление (easeOutCubic).
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Плавная кривая Эрмита (smoothstep).
 */
function smoothStep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Форматирование секунд в строку M:SS.
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatTime(totalSeconds) {
  const minutes = (totalSeconds / 60) | 0;
  const seconds = String(totalSeconds % 60 | 0).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
