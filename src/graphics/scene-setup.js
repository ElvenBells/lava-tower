/* ==========================================================================
   Инициализация Three.js сцены, камеры, рендерера и источников освещения
   ========================================================================== */

const canvas = document.createElement('canvas');
document.body.prepend(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 300);

let maxPixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
let currentPixelRatio = maxPixelRatio;

renderer.setPixelRatio(currentPixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

/**
 * Создаёт вертикальную градиентную текстуру фона неба/башни.
 * @param {string} topColor
 * @param {string} midColor
 * @param {string} bottomColor
 * @returns {THREE.CanvasTexture}
 */
function createBackgroundGradientTexture(topColor, midColor, bottomColor) {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 256;
  const ctx = bgCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(0.55, midColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 256);
  return new THREE.CanvasTexture(bgCanvas);
}

// Фон по умолчанию (Пепельная башня)
const defaultBackgroundTexture = createBackgroundGradientTexture('#1c0f30', '#2b0f22', '#4a1207');
scene.background = defaultBackgroundTexture;
scene.fog = new THREE.FogExp2(0x140a18, 0.012);

// Постоянные источники света (число источников фиксировано — шейдеры не перекомпилируются)
const hemiLight = new THREE.HemisphereLight(0x8a7bb0, 0x3a1408, 0.6);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffd9a0, 0.4);
dirLight.position.set(40, 90, 20);
scene.add(dirLight);

const lavaLight = new THREE.PointLight(0xff5a00, 2.5, 60);
scene.add(lavaLight);

const rimLight = new THREE.PointLight(0x4080ff, 0.8, 30);
scene.add(rimLight);

// Свет босса всегда в сцене (intensity = 0 вне боя, чтобы не вызывать рекомпиляцию шейдеров)
const bossLight = new THREE.PointLight(0xff6a20, 0, 46, 2);
bossLight.position.set(0, -500, 0);
scene.add(bossLight);

/**
 * Обновляет размеры буфера рендерера и соотношение сторон камеры.
 */
function handleWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', handleWindowResize);
handleWindowResize();

/**
 * Применяет текущий pixelRatio (используется адаптивным контролем FPS).
 */
function applyPixelRatio() {
  renderer.setPixelRatio(currentPixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
