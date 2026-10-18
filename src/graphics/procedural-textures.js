/* ==========================================================================
   Процедурные текстуры и GLSL-шейдеры окружения трёх башен
   (перенесены из детальных 3D-рендеров ash tower.html, ice tower.html, void tower.html):
   1) Пепельная башня: детализированный базальт с обугленными до черноты участками,
      редкими лавовыми трещинами, картами нормалей/шероховатости, 3D-ручьями и лужами лавы
   2) Ледяная башня: кубическая карта отражений (IOR 1.31), зеркальный лёд со светящимися
      трещинами (#88ddff), рельеф ледяных граней и вмёрзшие в толщу льда силуэты
   3) Башня Пустоты: асинхронные руны в каналах R/G/B, обсидиановый пол со сверкающей
      звёздной пылью, 3D Simplex Noise шейдеры растворения ступеней, бездны и лент тьмы
   ========================================================================== */

function createProceduralTexture(drawFn, size = 256, repeatX = 1, repeatY = 1) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = size;
  drawFn(texCanvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (repeatX !== 1 || repeatY !== 1) {
    texture.repeat.set(repeatX, repeatY);
  }
  return texture;
}

const TEXTURES = {};
const TOWER_WALL_TEXTURES = {};
const TOWER_FLOOR_TEXTURES = {};

// Реестр всех кастомных шейдерных uniforms башен для обновления в каждом кадре
const TOWER_SHADER_UNIFORMS = {
  ashLavaSea: null,
  ashFlows: [],
  ashPuddles: [],
  iceBlizzard: [],
  iceDust: null,
  iceSpiralSnow: null,
  iceCreepingFog: [],
  voidList: []
};

function drawSeamlessCrack(ctx, size, points, width, strokeStyle, shadowColor, shadowBlur) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = strokeStyle;
  if (shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur || 8;
  }
  for (const ox of [-size, 0, size]) {
    for (const oy of [-size, 0, size]) {
      ctx.beginPath();
      ctx.moveTo(points[0][0] + ox, points[0][1] + oy);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0] + ox, points[i][1] + oy);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function generateCrackNetwork(size, mainCount, stepCount, spreadX, spreadY) {
  const network = [];
  for (let c = 0; c < mainCount; c++) {
    const pts = [];
    let x = ((c + 0.5) / mainCount) * size + (Math.random() - 0.5) * 35;
    let y = Math.random() * size;
    pts.push([x, y]);
    for (let s = 0; s < stepCount; s++) {
      x += (Math.random() - 0.5) * spreadX;
      y += spreadY * (0.6 + Math.random() * 0.8);
      pts.push([x, y]);
      if (Math.random() < 0.5 && s > 0) {
        const branch = [[x, y]];
        let bx = x;
        let by = y;
        for (let b = 0; b < 3; b++) {
          bx += (Math.random() - 0.5) * spreadX * 0.9;
          by += (Math.random() - 0.3) * spreadY * 0.8;
          branch.push([bx, by]);
        }
        network.push({ pts: branch, main: false });
      }
    }
    network.push({ pts, main: true });
  }
  return network;
}

// Детерминированные функции шума из ash tower.html
function texSeededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function texNoise2D(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);

  const n00 = texSeededRandom(xi * 57.0 + yi * 131.0 + 17.0);
  const n10 = texSeededRandom((xi + 1) * 57.0 + yi * 131.0 + 17.0);
  const n01 = texSeededRandom(xi * 57.0 + (yi + 1) * 131.0 + 17.0);
  const n11 = texSeededRandom((xi + 1) * 57.0 + (yi + 1) * 131.0 + 17.0);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function tiledNoise2D(x, y, period) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3.0 - 2.0 * xf);
  const v = yf * yf * (3.0 - 2.0 * yf);

  const x0 = ((xi % period) + period) % period;
  const x1 = (((xi + 1) % period) + period) % period;
  const y0 = ((yi % period) + period) % period;
  const y1 = (((yi + 1) % period) + period) % period;

  const n00 = texSeededRandom(x0 * 57.0 + y0 * 131.0 + 19.0);
  const n10 = texSeededRandom(x1 * 57.0 + y0 * 131.0 + 19.0);
  const n01 = texSeededRandom(x0 * 57.0 + y1 * 131.0 + 19.0);
  const n11 = texSeededRandom(x1 * 57.0 + y1 * 131.0 + 19.0);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function fbm2D(x, y, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let freq = 1.0;
  for (let i = 0; i < octaves; i++) {
    value += amp * texNoise2D(x * freq, y * freq);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function tiledFbm2D(u, v, basePeriod = 8, octaves = 4) {
  let value = 0;
  let amp = 0.5;
  let p = basePeriod;
  for (let i = 0; i < octaves; i++) {
    value += amp * tiledNoise2D(u * p, v * p, p);
    p *= 2;
    amp *= 0.5;
  }
  return value;
}

function convertBumpToNormalCanvas(bumpCanvas, strength = 3.8) {
  const w = bumpCanvas.width;
  const h = bumpCanvas.height;
  const srcCtx = bumpCanvas.getContext('2d');
  const src = srcCtx.getImageData(0, 0, w, h).data;

  const normCanvas = document.createElement('canvas');
  normCanvas.width = w;
  normCanvas.height = h;
  const dstCtx = normCanvas.getContext('2d');
  const dstImg = dstCtx.createImageData(w, h);
  const dst = dstImg.data;

  const getH = (x, y) => {
    const wx = (x + w) % w;
    const wy = (y + h) % h;
    return src[(wy * w + wx) * 4] / 255.0;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (getH(x - 1, y) - getH(x + 1, y)) * strength;
      const dy = (getH(x, y - 1) - getH(x, y + 1)) * strength;
      const dz = 1.0;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.floor(((dx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.floor(((dy / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.floor(((dz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  dstCtx.putImageData(dstImg, 0, 0);
  return normCanvas;
}

// Общий GLSL-блок 3D Simplex Noise (используется всеми тремя башнями)
const GLSL_SIMPLEX_NOISE = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

// ==================== I. ПЕПЕЛЬНАЯ БАШНЯ (ИЗ ASH TOWER.HTML) ====================
// Модификатор шейдера для каменных материалов: добавляет нетайлируемые мировые пятна обугливания до черноты
// и локализует свечение лавовых трещин в мировых координатах
function applyWorldStoneShader(material, options = {}) {
  const crackRarity = options.crackRarity !== undefined ? options.crackRarity : 0.44;
  const charStrength = options.charStrength !== undefined ? options.charStrength : 0.90;

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vStoneWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 stoneWp = vec4(transformed, 1.0);
       #ifdef USE_INSTANCING
         stoneWp = instanceMatrix * stoneWp;
       #endif
       vStoneWorldPos = (modelMatrix * stoneWp).xyz;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vStoneWorldPos;
       float stoneHash(vec3 p) {
         p = fract(p * 0.3183099 + 0.1);
         p *= 17.0;
         return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
       }
       float stoneNoise3D(vec3 x) {
         vec3 i = floor(x);
         vec3 f = fract(x);
         f = f * f * (3.0 - 2.0 * f);
         return mix(
           mix(mix(stoneHash(i + vec3(0,0,0)), stoneHash(i + vec3(1,0,0)), f.x),
               mix(stoneHash(i + vec3(0,1,0)), stoneHash(i + vec3(1,1,0)), f.x), f.y),
           mix(mix(stoneHash(i + vec3(0,0,1)), stoneHash(i + vec3(1,0,1)), f.x),
               mix(stoneHash(i + vec3(0,1,1)), stoneHash(i + vec3(1,1,1)), f.x), f.y),
           f.z);
       }`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>
       float wChar1 = stoneNoise3D(vStoneWorldPos * 0.085 + vec3(2.3, 7.1, 4.9));
       float wChar2 = stoneNoise3D(vStoneWorldPos * 0.22 + vec3(11.7, 3.3, 8.2));
       float worldCharMask = smoothstep(0.48, 0.70, wChar1 * 0.68 + wChar2 * 0.32);
       diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.015, 0.015, 0.018), worldCharMask * ${charStrength.toFixed(2)});
       float wMicro = stoneNoise3D(vStoneWorldPos * 1.65);
       diffuseColor.rgb *= (0.86 + wMicro * 0.28);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float wCrackZone = stoneNoise3D(vStoneWorldPos * 0.095 + vec3(5.2, 1.9, 9.4));
       float wCrackSub = stoneNoise3D(vStoneWorldPos * 0.24 + vec3(14.1, 8.7, 2.1));
       float crackAllow = smoothstep(${crackRarity.toFixed(2)}, ${(crackRarity + 0.18).toFixed(2)}, wCrackZone * 0.7 + wCrackSub * 0.3);
       totalEmissiveRadiance *= crackAllow;`
    );
  };
}

(function buildAshTowerTextures() {
  const size = 512;

  // 1. Детализированная каменная кладка стен (массивные тёсаные блоки базальта, обугливание до черноты и редкие лавовые трещины)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  const emCanvas = document.createElement('canvas');
  emCanvas.width = emCanvas.height = size;
  const eCtx = emCanvas.getContext('2d');

  dCtx.fillStyle = '#0c0c0e';
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#121212';
  bCtx.fillRect(0, 0, size, size);
  rCtx.fillStyle = '#e8e8e8';
  rCtx.fillRect(0, 0, size, size);
  eCtx.fillStyle = '#000000';
  eCtx.fillRect(0, 0, size, size);

  const rows = 14;
  const cols = 7;
  const blockH = size / rows;
  const blockW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (blockW * 0.48);
    for (let c = -1; c <= cols; c++) {
      const jitterW = (texSeededRandom(r * 19 + c * 73) - 0.5) * 6;
      const bx = c * blockW + offset + jitterW;
      const by = r * blockH;
      const bw = blockW - jitterW * 0.5;
      const bh = blockH;
      const pad = 2.5;

      const baseVal = 48 + Math.floor(texSeededRandom(r * 41 + c * 23) * 28);
      const warmShift = Math.floor((texSeededRandom(r * 13 + c * 97) - 0.4) * 8);
      const cr = baseVal + warmShift;
      const cg = baseVal - 1;
      const cb = baseVal + 2 - warmShift;

      dCtx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`;
      dCtx.fillRect(bx + pad, by + pad, bw - pad * 2, bh - pad * 2);

      const hVal = 150 + Math.floor(texSeededRandom(r * 71 + c * 29) * 75);
      bCtx.fillStyle = `rgb(${hVal}, ${hVal}, ${hVal})`;
      bCtx.fillRect(bx + pad + 1, by + pad + 1, bw - pad * 2 - 2, bh - pad * 2 - 2);
    }
  }

  const diffData = dCtx.getImageData(0, 0, size, size);
  const bumpData = bCtx.getImageData(0, 0, size, size);
  const roughData = rCtx.getImageData(0, 0, size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;

      const macroN = tiledFbm2D(u, v, 4, 4);
      const medN = tiledFbm2D(u + 0.31, v + 0.57, 16, 4);
      const fineN = tiledNoise2D(u * 64, v * 64, 64);
      const microCrack = Math.abs(tiledFbm2D(u + 0.13, v + 0.79, 12, 3) - 0.5) * 2.0;

      const charMask = Math.max(0, Math.min(1, (macroN - 0.52) * 3.8 + (medN - 0.5) * 0.9));
      const darkCrackMask = microCrack < 0.045 ? 1.0 - microCrack / 0.045 : 0.0;

      let r = diffData.data[idx];
      let g = diffData.data[idx + 1];
      let b = diffData.data[idx + 2];

      const grain = (medN - 0.5) * 34 + (fineN - 0.5) * 22;
      r += grain;
      g += grain * 0.96;
      b += grain * 0.94;

      r *= 1.0 - darkCrackMask * 0.72;
      g *= 1.0 - darkCrackMask * 0.72;
      b *= 1.0 - darkCrackMask * 0.72;

      const charDarken = 1.0 - charMask * 0.89;
      r = r * charDarken + 5 * charMask;
      g = g * charDarken + 5 * charMask;
      b = b * charDarken + 7 * charMask;

      diffData.data[idx] = Math.max(4, Math.min(255, Math.floor(r)));
      diffData.data[idx + 1] = Math.max(4, Math.min(255, Math.floor(g)));
      diffData.data[idx + 2] = Math.max(5, Math.min(255, Math.floor(b)));

      let bv = bumpData.data[idx];
      bv += (medN - 0.5) * 75 + (fineN - 0.5) * 42 - darkCrackMask * 110;
      bv = Math.max(0, Math.min(255, Math.floor(bv)));
      bumpData.data[idx] = bumpData.data[idx + 1] = bumpData.data[idx + 2] = bv;

      const rv = Math.max(110, Math.min(250, Math.floor(190 + charMask * 55 + (fineN - 0.5) * 35)));
      roughData.data[idx] = roughData.data[idx + 1] = roughData.data[idx + 2] = rv;
    }
  }

  dCtx.putImageData(diffData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);
  rCtx.putImageData(roughData, 0, 0);

  // Редкие тонкие ветвящиеся лавовые трещины в камне
  const sparseCrackCount = 5;
  for (let i = 0; i < sparseCrackCount; i++) {
    let cx = (0.15 + texSeededRandom(i * 113 + 9) * 0.7) * size;
    let cy = (0.15 + texSeededRandom(i * 197 + 23) * 0.7) * size;
    const segments = 15 + Math.floor(texSeededRandom(i * 43) * 10);
    let angle = Math.PI * 0.5 + (texSeededRandom(i * 79) - 0.5) * 1.2;

    for (let s = 0; s < segments; s++) {
      const stepLen = 5 + texSeededRandom(i * 311 + s * 17) * 7;
      angle += (texSeededRandom(i * 509 + s * 23) - 0.5) * 0.85;
      const nx = cx + Math.cos(angle) * stepLen;
      const ny = cy + Math.sin(angle) * stepLen;

      const t = 1.0 - s / segments;
      const taper = Math.sin(t * Math.PI);
      const width = 0.7 + taper * 1.8;

      dCtx.strokeStyle = 'rgba(6, 5, 6, 0.88)';
      dCtx.lineWidth = width * 4.8;
      dCtx.lineCap = 'round';
      dCtx.beginPath();
      dCtx.moveTo(cx, cy);
      dCtx.lineTo(nx, ny);
      dCtx.stroke();

      eCtx.strokeStyle = 'rgba(220, 50, 0, 0.45)';
      eCtx.lineWidth = width * 2.2;
      eCtx.lineCap = 'round';
      eCtx.beginPath();
      eCtx.moveTo(cx, cy);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      eCtx.strokeStyle = s % 4 === 0 ? '#ff9900' : '#ff3d00';
      eCtx.lineWidth = width * 0.85;
      eCtx.beginPath();
      eCtx.moveTo(cx, cy);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      bCtx.strokeStyle = '#020202';
      bCtx.lineWidth = width * 2.1;
      bCtx.beginPath();
      bCtx.moveTo(cx, cy);
      bCtx.lineTo(nx, ny);
      bCtx.stroke();

      cx = nx;
      cy = ny;
    }
  }

  const wallNormalCanvas = convertBumpToNormalCanvas(bumpCanvas, 4.2);

  // 2. Детализированная каменная порода пола и ступеней (монолитный колотый базальт, обугленные пятна, лавовые трещины)
  const fDiffCanvas = document.createElement('canvas');
  fDiffCanvas.width = fDiffCanvas.height = size;
  const fdCtx = fDiffCanvas.getContext('2d');

  const fBumpCanvas = document.createElement('canvas');
  fBumpCanvas.width = fBumpCanvas.height = size;
  const fbCtx = fBumpCanvas.getContext('2d');

  const fRoughCanvas = document.createElement('canvas');
  fRoughCanvas.width = fRoughCanvas.height = size;
  const frCtx = fRoughCanvas.getContext('2d');

  const fEmCanvas = document.createElement('canvas');
  fEmCanvas.width = fEmCanvas.height = size;
  const feCtx = fEmCanvas.getContext('2d');

  const fdImg = fdCtx.createImageData(size, size);
  const fbImg = fbCtx.createImageData(size, size);
  const frImg = frCtx.createImageData(size, size);
  const feImg = feCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;

      const nMacro = tiledFbm2D(u, v, 4, 4);
      const nMed = tiledFbm2D(u + 0.41, v + 0.19, 12, 4);
      const nFine = tiledFbm2D(u + 0.73, v + 0.61, 24, 3);
      const nMicro = tiledNoise2D(u * 64, v * 64, 64);

      const ridge1 = Math.abs(nMed - 0.5) * 2.0;
      const ridge2 = Math.abs(tiledFbm2D(u + 0.22, v + 0.88, 8, 4) - 0.5) * 2.0;

      const charZone = Math.max(0, Math.min(1, (nMacro - 0.50) * 3.7 + (nFine - 0.5) * 0.75));
      const stoneFissure = ridge1 < 0.065 ? 1.0 - ridge1 / 0.065 : 0.0;
      const subFissure = ridge2 < 0.04 ? (1.0 - ridge2 / 0.04) * 0.6 : 0.0;
      const totalCrackDark = Math.min(1.0, stoneFissure + subFissure);

      const baseStone = 46 + nMed * 32 + (nFine - 0.5) * 20 + (nMicro - 0.5) * 14;
      let sr = baseStone + 2;
      let sg = baseStone + 1;
      let sb = baseStone + 3;

      sr *= 1.0 - totalCrackDark * 0.78;
      sg *= 1.0 - totalCrackDark * 0.78;
      sb *= 1.0 - totalCrackDark * 0.78;

      const charMult = 1.0 - charZone * 0.89;
      sr = sr * charMult + 5 * charZone;
      sg = sg * charMult + 5 * charZone;
      sb = sb * charMult + 6 * charZone;

      fdImg.data[idx] = Math.max(4, Math.min(255, Math.floor(sr)));
      fdImg.data[idx + 1] = Math.max(4, Math.min(255, Math.floor(sg)));
      fdImg.data[idx + 2] = Math.max(5, Math.min(255, Math.floor(sb)));
      fdImg.data[idx + 3] = 255;

      let bumpVal = 140 + (nMed - 0.5) * 70 + (nFine - 0.5) * 55 + (nMicro - 0.5) * 30;
      bumpVal -= totalCrackDark * 125;
      fbImg.data[idx] = fbImg.data[idx + 1] = fbImg.data[idx + 2] = Math.max(0, Math.min(255, Math.floor(bumpVal)));
      fbImg.data[idx + 3] = 255;

      const rVal = Math.max(115, Math.min(252, Math.floor(185 + charZone * 60 + (nFine - 0.5) * 35)));
      frImg.data[idx] = frImg.data[idx + 1] = frImg.data[idx + 2] = rVal;
      frImg.data[idx + 3] = 255;

      const rareHeatPocket = nMacro < 0.30 && ridge2 < 0.28;
      if (ridge1 < 0.042 && rareHeatPocket) {
        const heatMask = (1.0 - nMacro / 0.30) * (1.0 - ridge2 / 0.28);
        const intensity = Math.pow(1.0 - ridge1 / 0.042, 1.5) * Math.min(1.0, heatMask * 2.4);
        feImg.data[idx] = Math.min(255, Math.floor(intensity * 255));
        feImg.data[idx + 1] = Math.min(255, Math.floor(intensity * 90));
        feImg.data[idx + 2] = Math.min(255, Math.floor(intensity * 10));
        fdImg.data[idx] = Math.floor(fdImg.data[idx] * 0.32);
        fdImg.data[idx + 1] = Math.floor(fdImg.data[idx + 1] * 0.32);
        fdImg.data[idx + 2] = Math.floor(fdImg.data[idx + 2] * 0.32);
      } else {
        feImg.data[idx] = feImg.data[idx + 1] = feImg.data[idx + 2] = 0;
      }
      feImg.data[idx + 3] = 255;
    }
  }

  fdCtx.putImageData(fdImg, 0, 0);
  fbCtx.putImageData(fbImg, 0, 0);
  frCtx.putImageData(frImg, 0, 0);
  feCtx.putImageData(feImg, 0, 0);

  const floorNormalCanvas = convertBumpToNormalCanvas(fBumpCanvas, 4.5);

  const wrapRepeat = (canvasEl, rx, ry) => {
    const tex = new THREE.CanvasTexture(canvasEl);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(rx, ry);
    return tex;
  };

  TOWER_WALL_TEXTURES.ash = {
    map: wrapRepeat(diffCanvas, 6, 8),
    bump: wrapRepeat(bumpCanvas, 6, 8),
    normalMap: wrapRepeat(wallNormalCanvas, 6, 8),
    roughnessMap: wrapRepeat(roughCanvas, 6, 8),
    emissive: wrapRepeat(emCanvas, 6, 8)
  };

  TOWER_FLOOR_TEXTURES.ash = {
    map: wrapRepeat(fDiffCanvas, 1, 1),
    bump: wrapRepeat(fBumpCanvas, 1, 1),
    normalMap: wrapRepeat(floorNormalCanvas, 1, 1),
    roughnessMap: wrapRepeat(fRoughCanvas, 1, 1),
    emissive: wrapRepeat(fEmCanvas, 1, 1)
  };
})();

// 3D-шейдеры и геометрия для стекающих потоков лавы и лавовых луж (из ash tower.html)
function createFlowingLavaMaterial(seedOffset = 0.0) {
  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 2.25 },
    uSeed: { value: seedOffset },
    uFogColor: { value: new THREE.Color('#220707') },
    uFogDensity: { value: 0.0165 }
  };
  TOWER_SHADER_UNIFORMS.ashFlows.push(uniforms);

  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uSeed;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vBulge;
      ${GLSL_SIMPLEX_NOISE}

      void main() {
        vUv = uv;
        float flowT = uTime * 0.55 * uSpeed + uSeed;
        float wave1 = snoise(vec3(uv.x * 9.0 - flowT * 2.2, uv.y * 4.0, uSeed + flowT * 0.4));
        float wave2 = snoise(vec3(uv.x * 20.0 - flowT * 3.8, uv.y * 6.0, uSeed * 2.1));
        float endTaper = sin(clamp(uv.x, 0.0, 1.0) * 3.14159265);

        float bulge = (wave1 * 0.65 + wave2 * 0.35) * endTaper;
        vBulge = bulge;

        vec3 displaced = position + normal * (bulge * 0.14);
        vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uSeed;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying float vBulge;
      ${GLSL_SIMPLEX_NOISE}

      void main() {
        float flowT = uTime * 0.55 * uSpeed + uSeed;
        float along = vUv.x;
        float across = abs(sin(vUv.y * 3.14159265));

        float n1 = snoise(vec3(along * 10.0 - flowT * 2.4, vUv.y * 5.0, uSeed + flowT * 0.3));
        float n2 = snoise(vec3(along * 24.0 - flowT * 4.2, vUv.y * 9.0, uSeed * 3.7));
        float crustNoise = snoise(vec3(along * 15.0 - flowT * 2.0, vUv.y * 7.0, uSeed + 5.0));

        float heat = across * 0.72 + (n1 * 0.5 + 0.5) * 0.38 + (n2 * 0.5 + 0.5) * 0.22 + vBulge * 0.25;
        float slagPatch = smoothstep(0.45, 0.78, crustNoise) * (1.0 - across * 0.55);
        heat = clamp(heat - slagPatch * 0.62, 0.02, 1.2);

        vec3 colBlackCrust = vec3(0.04, 0.02, 0.02);
        vec3 colDarkRed    = vec3(0.52, 0.04, 0.01);
        vec3 colOrange     = vec3(1.00, 0.30, 0.00);
        vec3 colBrightYel  = vec3(1.00, 0.90, 0.36);

        vec3 color = mix(colBlackCrust, colDarkRed, smoothstep(0.15, 0.42, heat));
        color = mix(color, colOrange, smoothstep(0.42, 0.72, heat));
        color = mix(color, colBrightYel, smoothstep(0.72, 0.98, heat));

        color *= (0.75 + pow(max(0.0, heat), 2.0) * 1.45);

        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
        color = mix(color, uFogColor, clamp(fogFactor * 0.7, 0.0, 0.9));

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

function createLavaPuddleMaterial(seedOffset = 0.0, hasDripRipple = false) {
  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: 2.25 },
    uSeed: { value: seedOffset },
    uDripRipple: { value: hasDripRipple ? 1.0 : 0.0 },
    uFogColor: { value: new THREE.Color('#220707') },
    uFogDensity: { value: 0.0165 }
  };
  TOWER_SHADER_UNIFORMS.ashPuddles.push(uniforms);

  return new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uSeed;
      varying vec2 vLocalXZ;
      varying float vRadial;
      varying vec3 vWorldPos;
      ${GLSL_SIMPLEX_NOISE}

      void main() {
        vLocalXZ = position.xz;
        vRadial = uv.x;
        float t = uTime * 0.35 * uSpeed + uSeed;

        vec3 pos = position;
        float centerMask = 1.0 - smoothstep(0.55, 0.98, vRadial);
        float swell = snoise(vec3(pos.xz * 0.85, t * 0.7)) * 0.07 * centerMask;
        pos.y += swell;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uSeed;
      uniform float uDripRipple;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vLocalXZ;
      varying float vRadial;
      varying vec3 vWorldPos;
      ${GLSL_SIMPLEX_NOISE}

      void main() {
        float t = uTime * 0.32 * uSpeed + uSeed;
        vec2 p = vLocalXZ * 0.95;

        float n1 = snoise(vec3(p * 1.1 + vec2(t * 0.15, -t * 0.12), t * 0.45));
        float n2 = snoise(vec3(p * 2.6 - vec2(t * 0.22, t * 0.18), t * 0.8));

        float rimCooling = smoothstep(0.62, 0.96, vRadial + n1 * 0.12);
        float cell = (n1 * 0.5 + 0.5) * 0.6 + (n2 * 0.5 + 0.5) * 0.4;
        float heat = mix(cell + 0.22, 0.04, rimCooling);

        if (uDripRipple > 0.5) {
          float rDist = length(vLocalXZ);
          float cycle = fract(uTime * 0.55 + uSeed * 0.37);
          float waveRadius = cycle * 1.15;
          float ring = exp(-pow((rDist - waveRadius) * 6.5, 2.0)) * (1.0 - cycle);
          heat += ring * 0.65 * (1.0 - rimCooling);
        }

        vec3 colCharRim  = vec3(0.025, 0.02, 0.022);
        vec3 colCrust    = vec3(0.12, 0.02, 0.01);
        vec3 colDarkRed  = vec3(0.60, 0.05, 0.01);
        vec3 colOrange   = vec3(1.00, 0.33, 0.00);
        vec3 colYellow   = vec3(1.00, 0.90, 0.35);

        vec3 color = mix(colCharRim, colCrust, smoothstep(0.05, 0.20, heat));
        color = mix(color, colDarkRed, smoothstep(0.20, 0.44, heat));
        color = mix(color, colOrange, smoothstep(0.44, 0.72, heat));
        color = mix(color, colYellow, smoothstep(0.72, 0.98, heat));

        color *= (0.7 + pow(max(0.0, heat), 2.1) * 1.45);

        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-(uFogDensity * dist) * (uFogDensity * dist));
        color = mix(color, uFogColor, clamp(fogFactor * 0.7, 0.0, 0.9));

        gl_FragColor = vec4(color, 1.0);
      }
    `
  });
}

function createOrganicPuddleMesh(radius, seed, hasDripRipple = false) {
  const puddleGroup = new THREE.Group();
  const rings = 10;
  const segments = 28;

  const geo = new THREE.BufferGeometry();
  const positions = [];
  const uvs = [];
  const indices = [];

  const getR = (angle) => {
    const n1 = Math.sin(angle * 3.0 + seed * 1.7) * 0.16;
    const n2 = Math.cos(angle * 5.0 - seed * 2.3) * 0.10;
    const n3 = Math.sin(angle * 8.0 + seed * 4.1) * 0.05;
    return radius * (1.0 + n1 + n2 + n3);
  };

  positions.push(0, 0.045, 0);
  uvs.push(0, 0.5);

  for (let r = 1; r <= rings; r++) {
    const t = r / rings;
    for (let s = 0; s < segments; s++) {
      const angle = (s / segments) * Math.PI * 2;
      const maxR = getR(angle);
      const curR = maxR * t;

      let y = 0.045;
      if (t > 0.72 && t < 0.94) {
        y += Math.sin(((t - 0.72) / 0.22) * Math.PI) * 0.08;
      } else if (t >= 0.94) {
        y = 0.01;
      }

      positions.push(Math.cos(angle) * curR, y, Math.sin(angle) * curR);
      uvs.push(t, s / segments);
    }
  }

  for (let s = 0; s < segments; s++) {
    const nextS = (s + 1) % segments;
    indices.push(0, 1 + nextS, 1 + s);
  }

  for (let r = 0; r < rings - 1; r++) {
    const rowStart = 1 + r * segments;
    const nextRowStart = 1 + (r + 1) * segments;
    for (let s = 0; s < segments; s++) {
      const nextS = (s + 1) % segments;
      const a = rowStart + s;
      const b = rowStart + nextS;
      const c = nextRowStart + s;
      const d = nextRowStart + nextS;
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const puddleMat = createLavaPuddleMaterial(seed, hasDripRipple);
  const mesh = new THREE.Mesh(geo, puddleMat);
  mesh.userData.disposeMaterial = true;
  puddleGroup.add(mesh);
  return puddleGroup;
}

function createVariableTubeGeometry(curve, tubularSegments, baseRadius, seed) {
  const radialSegments = 8;
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    const P = curve.getPointAt(u);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const organicWave = 1.0 + 0.35 * Math.sin(u * 19.0 + seed * 3.1) + 0.22 * Math.cos(u * 33.0 - seed * 1.7);
    const tipTaper =
      u < 0.08
        ? 0.45 + (u / 0.08) * 0.55
        : u > 0.85
          ? Math.max(0.12, 1.0 - ((u - 0.85) / 0.15) * 0.85)
          : 1.0;
    const r = baseRadius * organicWave * tipTaper;

    for (let j = 0; j <= radialSegments; j++) {
      const v = j / radialSegments;
      const theta = v * Math.PI * 2;
      const sin = Math.sin(theta);
      const cos = -Math.cos(theta);

      normal.x = cos * N.x + sin * B.x;
      normal.y = cos * N.y + sin * B.y;
      normal.z = cos * N.z + sin * B.z;
      normal.normalize();

      const squash = 0.75 + 0.25 * Math.sin(theta);
      vertex.x = P.x + r * squash * normal.x;
      vertex.y = P.y + r * squash * normal.y;
      vertex.z = P.z + r * squash * normal.z;

      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(u, v);
    }
  }

  for (let j = 1; j <= tubularSegments; j++) {
    for (let i = 1; i <= radialSegments; i++) {
      const a = (radialSegments + 1) * (j - 1) + (i - 1);
      const b = (radialSegments + 1) * j + (i - 1);
      const c = (radialSegments + 1) * j + i;
      const d = (radialSegments + 1) * (j - 1) + i;
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// ==================== II. ЛЕДЯНАЯ БАШНЯ (ИЗ ICE TOWER.HTML) ====================
function generateIceEnvCubeMap() {
  const size = 128;
  const canvases = [];
  for (let face = 0; face < 6; face++) {
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 0, size);
    if (face === 2) {
      grad.addColorStop(0, '#0a1526');
      grad.addColorStop(1, '#264e73');
    } else if (face === 3) {
      grad.addColorStop(0, '#c8eeff');
      grad.addColorStop(1, '#ffffff');
    } else {
      grad.addColorStop(0, '#0f223a');
      grad.addColorStop(0.45, '#68a8cf');
      grad.addColorStop(0.75, '#bfe6f7');
      grad.addColorStop(1, '#e8f7ff');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 20; i++) {
      const x = (i / 20) * size + Math.sin(i * 4.1 + face) * 4;
      const w = 2 + (i % 4) * 2;
      const streakGrad = ctx.createLinearGradient(x, 0, x, size);
      streakGrad.addColorStop(0, 'rgba(136, 221, 255, 0.04)');
      streakGrad.addColorStop(0.5, 'rgba(225, 248, 255, 0.32)');
      streakGrad.addColorStop(1, 'rgba(136, 221, 255, 0.08)');
      ctx.fillStyle = streakGrad;
      ctx.fillRect(x, 0, w, size);
    }
    canvases.push(cvs);
  }
  const cubeTexture = new THREE.CubeTexture(canvases);
  cubeTexture.needsUpdate = true;
  return cubeTexture;
}

const ICE_ENV_CUBEMAP = generateIceEnvCubeMap();

function generateFrozenSilhouetteTexture(poseVariant) {
  const w = 256;
  const h = 512;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d');

  ctx.clearRect(0, 0, w, h);

  const aura = ctx.createRadialGradient(w * 0.5, h * 0.48, 12, w * 0.5, h * 0.48, 120);
  aura.addColorStop(0, 'rgba(8, 22, 42, 0.65)');
  aura.addColorStop(0.6, 'rgba(18, 48, 78, 0.25)');
  aura.addColorStop(1, 'rgba(18, 48, 78, 0.0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.filter = 'blur(5px)';
  ctx.fillStyle = '#050d1a';
  ctx.strokeStyle = '#050d1a';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = w * 0.5;
  const headY = h * 0.23;

  ctx.beginPath();
  ctx.arc(cx + (poseVariant === 1 ? -6 : 4), headY, 21, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx - 28, headY + 22);
  ctx.quadraticCurveTo(cx + 32, headY + 20, cx + 26, headY + 125);
  ctx.lineTo(cx + 42, headY + 235);
  ctx.quadraticCurveTo(cx, headY + 215, cx - 38, headY + 240);
  ctx.lineTo(cx - 24, headY + 120);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 15;
  if (poseVariant === 0) {
    ctx.beginPath();
    ctx.moveTo(cx - 20, headY + 38);
    ctx.quadraticCurveTo(cx - 56, headY - 10, cx - 42, headY - 58);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + 22, headY + 42);
    ctx.lineTo(cx + 58, headY + 95);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx + 56, headY + 75);
    ctx.lineTo(cx + 76, headY + 210);
    ctx.stroke();
  } else if (poseVariant === 1) {
    ctx.beginPath();
    ctx.moveTo(cx - 22, headY + 40);
    ctx.lineTo(cx - 54, headY + 86);
    ctx.lineTo(cx - 35, headY + 35);
    ctx.stroke();

    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(cx - 42, headY - 45);
    ctx.lineTo(cx - 28, headY + 275);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - 24, headY + 36);
    ctx.lineTo(cx - 64, headY + 70);
    ctx.moveTo(cx + 24, headY + 36);
    ctx.lineTo(cx + 62, headY + 18);
    ctx.stroke();
  }

  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(cx - 16, headY + 150);
  ctx.lineTo(cx - 24, headY + 285);
  ctx.moveTo(cx + 16, headY + 150);
  ctx.lineTo(cx + 26, headY + 280);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(165, 230, 255, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(20, 80 + i * 55);
    ctx.lineTo(w - 20, 50 + i * 58 + (i % 2) * 30);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(cvs);
}

const ICE_SILHOUETTE_TEXTURES = [
  generateFrozenSilhouetteTexture(0),
  generateFrozenSilhouetteTexture(1),
  generateFrozenSilhouetteTexture(2)
];

(function buildIceTowerTextures() {
  const size = 512;

  // Рельеф и карта ледяных стен из ice tower.html
  const wallBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#303030';
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 64; i++) {
      const x = (i / 64) * sz;
      const grad = ctx.createLinearGradient(x, 0, x + 10, 0);
      grad.addColorStop(0, '#181818');
      grad.addColorStop(0.5, '#858585');
      grad.addColorStop(1, '#222222');
      ctx.fillStyle = grad;
      ctx.fillRect(x, 0, 10, sz);
    }

    ctx.strokeStyle = 'rgba(215, 215, 215, 0.4)';
    for (let i = 0; i < 90; i++) {
      ctx.lineWidth = 0.8 + texSeededRandom(i * 17) * 1.8;
      ctx.beginPath();
      const sx = texSeededRandom(i * 31) * sz;
      const sy = texSeededRandom(i * 47) * sz;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (texSeededRandom(i * 59) - 0.5) * 90, sy + (texSeededRandom(i * 71) - 0.5) * 160);
      ctx.stroke();
    }
  }, size, 6, 4);

  const wallMap = createProceduralTexture((ctx, sz) => {
    const bg = ctx.createLinearGradient(0, 0, sz, sz);
    bg.addColorStop(0, '#183f68');
    bg.addColorStop(0.45, '#3b78a6');
    bg.addColorStop(0.75, '#2b618e');
    bg.addColorStop(1, '#589bc8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 42; i++) {
      const x = (i / 42) * sz;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(184, 230, 255, 0.14)' : 'rgba(10, 25, 48, 0.18)';
      ctx.fillRect(x, 0, 10, sz);
    }

    ctx.strokeStyle = 'rgba(165, 232, 255, 0.55)';
    for (let i = 0; i < 55; i++) {
      ctx.lineWidth = 1.0 + texSeededRandom(i * 23) * 1.5;
      ctx.beginPath();
      const sx = texSeededRandom(i * 41) * sz;
      const sy = texSeededRandom(i * 61) * sz;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (texSeededRandom(i * 83) - 0.5) * 80, sy + (texSeededRandom(i * 97) - 0.5) * 130);
      ctx.stroke();
    }
  }, size, 6, 4);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#0d2842';
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = 'rgba(136, 221, 255, 0.55)';
    for (let i = 0; i < 45; i++) {
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const sx = texSeededRandom(i * 41) * sz;
      const sy = texSeededRandom(i * 61) * sz;
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (texSeededRandom(i * 83) - 0.5) * 80, sy + (texSeededRandom(i * 97) - 0.5) * 130);
      ctx.stroke();
    }
  }, size, 6, 4);

  // Зеркальные плиты ледяного пола со светящимися морозными трещинами (#88ddff, из generateFloorMaps в ice tower.html)
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = emissiveCanvas.height = size;
  const eCtx = emissiveCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  const floorDiffCanvas = document.createElement('canvas');
  floorDiffCanvas.width = floorDiffCanvas.height = size;
  const fdCtx = floorDiffCanvas.getContext('2d');

  eCtx.fillStyle = '#030a14';
  eCtx.fillRect(0, 0, size, size);

  rCtx.fillStyle = 'rgb(14, 14, 18)';
  rCtx.fillRect(0, 0, size, size);

  const fGrad = fdCtx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size * 0.7);
  fGrad.addColorStop(0, '#9bd6f5');
  fGrad.addColorStop(0.55, '#8bc9eb');
  fGrad.addColorStop(1, '#6faed4');
  fdCtx.fillStyle = fGrad;
  fdCtx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const numMainCracks = 22;

  for (let i = 0; i < numMainCracks; i++) {
    let angle = (i / numMainCracks) * Math.PI * 2 + (texSeededRandom(i * 19) - 0.5) * 0.22;
    let radius = size * 0.06;
    let px = cx + Math.cos(angle) * radius;
    let py = cy + Math.sin(angle) * radius;

    let stepIdx = 0;
    while (radius < size * 0.65) {
      stepIdx++;
      const step = 12 + texSeededRandom(i * 53 + stepIdx * 7) * 18;
      angle += (texSeededRandom(i * 89 + stepIdx * 13) - 0.5) * 0.34;
      radius += step;
      const nx = cx + Math.cos(angle) * radius;
      const ny = cy + Math.sin(angle) * radius;

      eCtx.strokeStyle = 'rgba(72, 185, 245, 0.32)';
      eCtx.lineWidth = 6;
      eCtx.beginPath();
      eCtx.moveTo(px, py);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      eCtx.strokeStyle = 'rgba(155, 232, 255, 0.95)';
      eCtx.lineWidth = 1.8;
      eCtx.beginPath();
      eCtx.moveTo(px, py);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      fdCtx.strokeStyle = 'rgba(220, 246, 255, 0.85)';
      fdCtx.lineWidth = 1.5;
      fdCtx.beginPath();
      fdCtx.moveTo(px, py);
      fdCtx.lineTo(nx, ny);
      fdCtx.stroke();

      rCtx.strokeStyle = 'rgba(165, 165, 165, 0.65)';
      rCtx.lineWidth = 4.5;
      rCtx.beginPath();
      rCtx.moveTo(px, py);
      rCtx.lineTo(nx, ny);
      rCtx.stroke();

      if (texSeededRandom(i * 131 + stepIdx * 29) > 0.45) {
        const branchAngle = angle + (texSeededRandom(i + stepIdx) > 0.5 ? 1 : -1) * (0.4 + texSeededRandom(stepIdx * 17) * 0.6);
        const branchLen = 14 + texSeededRandom(stepIdx * 37) * 28;
        const bx = nx + Math.cos(branchAngle) * branchLen;
        const by = ny + Math.sin(branchAngle) * branchLen;

        eCtx.strokeStyle = 'rgba(136, 221, 255, 0.72)';
        eCtx.lineWidth = 1.2;
        eCtx.beginPath();
        eCtx.moveTo(nx, ny);
        eCtx.lineTo(bx, by);
        eCtx.stroke();

        fdCtx.strokeStyle = 'rgba(195, 240, 255, 0.65)';
        fdCtx.lineWidth = 1.0;
        fdCtx.beginPath();
        fdCtx.moveTo(nx, ny);
        fdCtx.lineTo(bx, by);
        fdCtx.stroke();
      }

      px = nx;
      py = ny;
    }
  }

  const wrapFloor = (cvs) => {
    const t = new THREE.CanvasTexture(cvs);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  };

  TOWER_WALL_TEXTURES.ice = {
    map: wallMap,
    bump: wallBump,
    emissive: wallEmissive
  };
  TOWER_FLOOR_TEXTURES.ice = {
    map: wrapFloor(floorDiffCanvas),
    bump: wrapFloor(roughCanvas),
    roughnessMap: wrapFloor(roughCanvas),
    emissive: wrapFloor(emissiveCanvas)
  };
})();

// ==================== III. БАШНЯ ПУСТОТЫ (ИЗ VOID TOWER.HTML) ====================
(function buildVoidTowerTextures() {
  const size = 512;

  // Генерация рун и трещин в каналах R, G, B (из generateRunesAndCracksTextures в void tower.html)
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = emissiveCanvas.height = size;
  const ctx = emissiveCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  const wallDiffCanvas = document.createElement('canvas');
  wallDiffCanvas.width = wallDiffCanvas.height = size;
  const wCtx = wallDiffCanvas.getContext('2d');

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#606060';
  bCtx.fillRect(0, 0, size, size);

  wCtx.fillStyle = '#12081c';
  wCtx.fillRect(0, 0, size, size);

  bCtx.strokeStyle = '#242424';
  bCtx.lineWidth = 2.5;
  wCtx.strokeStyle = '#07020d';
  wCtx.lineWidth = 2.5;

  const rows = 16;
  const cols = 8;
  const rowH = size / rows;
  const colW = size / cols;

  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    bCtx.beginPath();
    bCtx.moveTo(0, y);
    bCtx.lineTo(size, y);
    bCtx.stroke();

    wCtx.beginPath();
    wCtx.moveTo(0, y);
    wCtx.lineTo(size, y);
    wCtx.stroke();

    const shift = (r % 2) * (colW * 0.5);
    for (let c = 0; c <= cols; c++) {
      const x = (c * colW + shift) % size;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x, y + rowH);
      bCtx.stroke();

      wCtx.beginPath();
      wCtx.moveTo(x, y);
      wCtx.lineTo(x, y + rowH);
      wCtx.stroke();
    }
  }

  ctx.globalCompositeOperation = 'lighter';
  const channelColors = ['#ff0000', '#00ff00', '#0000ff'];

  function drawRuneGlyph(context, cx, cy, scale, seed) {
    context.beginPath();
    context.moveTo(cx, cy - scale);
    context.lineTo(cx, cy + scale);

    const type = seed % 6;
    if (type === 0) {
      context.moveTo(cx, cy - scale);
      context.lineTo(cx + scale * 0.65, cy - scale * 0.3);
      context.lineTo(cx, cy + scale * 0.1);
      context.lineTo(cx + scale * 0.65, cy + scale * 0.85);
    } else if (type === 1) {
      context.moveTo(cx - scale * 0.6, cy - scale * 0.75);
      context.lineTo(cx, cy);
      context.lineTo(cx + scale * 0.6, cy - scale * 0.75);
    } else if (type === 2) {
      context.moveTo(cx, cy - scale * 0.8);
      context.lineTo(cx + scale * 0.6, cy - scale * 0.25);
      context.lineTo(cx, cy + scale * 0.3);
      context.lineTo(cx - scale * 0.5, cy + scale * 0.1);
      context.lineTo(cx + scale * 0.5, cy + scale * 0.7);
    } else if (type === 3) {
      context.moveTo(cx - scale * 0.55, cy - scale * 0.4);
      context.lineTo(cx, cy - scale * 0.9);
      context.lineTo(cx + scale * 0.55, cy - scale * 0.4);
      context.lineTo(cx, cy + scale * 0.2);
      context.closePath();
    } else if (type === 4) {
      context.moveTo(cx - scale * 0.6, cy - scale * 0.7);
      context.lineTo(cx + scale * 0.6, cy + scale * 0.7);
      context.moveTo(cx + scale * 0.6, cy - scale * 0.7);
      context.lineTo(cx - scale * 0.6, cy + scale * 0.7);
    } else {
      context.moveTo(cx, cy - scale * 0.7);
      context.lineTo(cx + scale * 0.6, cy - scale * 0.2);
      context.lineTo(cx, cy);
      context.lineTo(cx - scale * 0.6, cy + scale * 0.55);
    }
    context.stroke();
  }

  for (let col = 0; col < 16; col++) {
    const cx = (col + 0.5) * (size / 16);
    for (let row = 0; row < 20; row++) {
      if ((col + row * 3) % 4 === 0) continue;
      const cy = (row + 0.5) * (size / 20);
      const chIdx = (col * 7 + row * 13) % 3;
      const color = channelColors[chIdx];

      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.lineWidth = 2.0;
      drawRuneGlyph(ctx, cx, cy, 7.5, col * 31 + row * 17);
    }
  }

  for (let k = 0; k < 14; k++) {
    let x = ((k * 73) % 100) * 0.01 * size;
    let y = ((k * 41) % 100) * 0.01 * size;
    const chColor = channelColors[k % 3];

    ctx.strokeStyle = chColor;
    ctx.shadowColor = chColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);

    bCtx.strokeStyle = '#080808';
    bCtx.lineWidth = 3.5;
    bCtx.beginPath();
    bCtx.moveTo(x, y);

    for (let seg = 0; seg < 9; seg++) {
      x += Math.sin(k * 12.3 + seg * 1.9) * 16;
      y += 14 + Math.cos(k * 7.1 + seg) * 6;
      ctx.lineTo(x, y);
      bCtx.lineTo(x, y);
    }
    ctx.stroke();
    bCtx.stroke();
  }

  // Текстура «звёздной пыли» в каналах R, G, B для обсидианового пола (из generateStardustFloorTexture в void tower.html)
  const stardustCanvas = document.createElement('canvas');
  stardustCanvas.width = stardustCanvas.height = size;
  const sCtx = stardustCanvas.getContext('2d');

  sCtx.fillStyle = '#000000';
  sCtx.fillRect(0, 0, size, size);
  sCtx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 1600; i++) {
    const x = (((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1 * size;
    const y = (((Math.sin(i * 78.2330) * 23421.6312) % 1) + 1) % 1 * size;
    const radius = i % 7 === 0 ? 1.8 : 1.0;
    const ch = channelColors[i % 3];

    sCtx.fillStyle = ch;
    sCtx.beginPath();
    sCtx.arc(x, y, radius, 0, Math.PI * 2);
    sCtx.fill();
  }

  for (let v = 0; v < 10; v++) {
    let vx = (v * 53) % size;
    let vy = (v * 97) % size;
    sCtx.strokeStyle = channelColors[v % 3];
    sCtx.lineWidth = 1.4;
    sCtx.beginPath();
    sCtx.moveTo(vx, vy);
    for (let s = 0; s < 6; s++) {
      vx += Math.cos(v * 3.1 + s * 1.4) * 24;
      vy += Math.sin(v * 2.7 + s * 1.8) * 24;
      sCtx.lineTo(vx, vy);
    }
    sCtx.stroke();
  }

  const floorDiffCanvas = document.createElement('canvas');
  floorDiffCanvas.width = floorDiffCanvas.height = size;
  const fdCtx = floorDiffCanvas.getContext('2d');
  fdCtx.fillStyle = '#06040a';
  fdCtx.fillRect(0, 0, size, size);
  fdCtx.strokeStyle = 'rgba(138, 43, 226, 0.25)';
  fdCtx.lineWidth = 3;
  fdCtx.strokeRect(4, 4, size - 8, size - 8);

  const wrapRepeat = (cvs, rx, ry) => {
    const t = new THREE.CanvasTexture(cvs);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  };

  const runeEmissiveTex = wrapRepeat(emissiveCanvas, 6, 6);
  const stardustTex = wrapRepeat(stardustCanvas, 2, 2);

  TOWER_WALL_TEXTURES.void = {
    map: wrapRepeat(wallDiffCanvas, 6, 6),
    bump: wrapRepeat(bumpCanvas, 6, 6),
    emissive: runeEmissiveTex
  };
  TOWER_FLOOR_TEXTURES.void = {
    map: wrapRepeat(floorDiffCanvas, 1, 1),
    bump: wrapRepeat(bumpCanvas, 1, 1),
    emissive: stardustTex,
    stardustMap: stardustTex
  };
})();

// Шейдер асинхронных рун стен Башни Пустоты (из void tower.html)
function applyVoidWallRuneShader(material, repeatX = 6.0, repeatY = 6.0) {
  const wallUniforms = {
    uTime: { value: 0 },
    uSurge: { value: 0 },
    uRuneMap: { value: TOWER_WALL_TEXTURES.void.emissive }
  };
  TOWER_SHADER_UNIFORMS.voidList.push(wallUniforms);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wallUniforms.uTime;
    shader.uniforms.uSurge = wallUniforms.uSurge;
    shader.uniforms.uRuneMap = wallUniforms.uRuneMap;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWallWorldPos;
       varying vec2 vRuneUv;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vRuneUv = uv * vec2(${repeatX.toFixed(1)}, ${repeatY.toFixed(1)});
       vWallWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uTime;
       uniform float uSurge;
       uniform sampler2D uRuneMap;
       varying vec3 vWallWorldPos;
       varying vec2 vRuneUv;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       vec3 runeMask = texture2D(uRuneMap, vRuneUv).rgb;
       float spatialPhase = vWallWorldPos.y * 0.14 + atan(vWallWorldPos.z, vWallWorldPos.x) * 2.0;
       float waveR = pow(0.5 + 0.5 * sin(uTime * 1.35 + spatialPhase), 2.2);
       float waveG = pow(0.5 + 0.5 * sin(uTime * 0.92 - spatialPhase * 1.3 + 2.09), 2.2);
       float waveB = pow(0.5 + 0.5 * sin(uTime * 1.78 + spatialPhase * 0.7 + 4.18), 2.2);

       vec3 colR = vec3(0.541, 0.169, 0.886) * runeMask.r * waveR;
       vec3 colG = vec3(0.659, 0.333, 0.969) * runeMask.g * waveG;
       vec3 colB = vec3(0.450, 0.550, 1.000) * runeMask.b * waveB;

       float surgeBoost = 1.8 + uSurge * 2.5;
       totalEmissiveRadiance += (colR + colG + colB) * surgeBoost;`
    );
  };
}

// Шейдер обсидианового пола Башни Пустоты со сверкающей «звёздной пылью» (из void tower.html)
function applyVoidFloorStardustShader(material) {
  const floorUniforms = {
    uTime: { value: 0 },
    uSurge: { value: 0 },
    uStardustMap: { value: TOWER_FLOOR_TEXTURES.void.stardustMap }
  };
  TOWER_SHADER_UNIFORMS.voidList.push(floorUniforms);

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = floorUniforms.uTime;
    shader.uniforms.uSurge = floorUniforms.uSurge;
    shader.uniforms.uStardustMap = floorUniforms.uStardustMap;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vFloorWorldPos;`
    );
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec4 floorWp = vec4(transformed, 1.0);
       #ifdef USE_INSTANCING
         floorWp = instanceMatrix * floorWp;
       #endif
       vFloorWorldPos = (modelMatrix * floorWp).xyz;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uTime;
       uniform float uSurge;
       uniform sampler2D uStardustMap;
       varying vec3 vFloorWorldPos;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       vec2 dustUv = vFloorWorldPos.xz * 0.16;
       vec3 dustRGB = texture2D(uStardustMap, dustUv).rgb;
       vec3 viewDir = normalize(cameraPosition - vFloorWorldPos);
       float viewSparkle = pow(0.5 + 0.5 * sin(dot(viewDir, vec3(12.4, 7.8, 15.1)) + vFloorWorldPos.x * 1.5), 3.0);

       float sR = pow(0.5 + 0.5 * sin(uTime * 2.1 + vFloorWorldPos.x * 0.9), 3.0);
       float sG = pow(0.5 + 0.5 * sin(uTime * 1.6 + vFloorWorldPos.z * 1.1 + 2.1), 3.0);
       float sB = pow(0.5 + 0.5 * sin(uTime * 2.7 - (vFloorWorldPos.x + vFloorWorldPos.z) * 0.7 + 4.2), 3.0);

       vec3 sparkleCol =
           vec3(0.66, 0.33, 0.97) * dustRGB.r * sR +
           vec3(0.55, 0.80, 1.00) * dustRGB.g * sG +
           vec3(0.92, 0.65, 1.00) * dustRGB.b * sB;

       totalEmissiveRadiance = sparkleCol * (1.25 + 1.85 * viewSparkle + uSurge * 1.2);`
    );
  };
}

const brickTexture = TOWER_WALL_TEXTURES.ash.map;
const stoneTexture = TOWER_FLOOR_TEXTURES.ash.map;

/* ---------- 2. Поверхности угроз снизу (Лава / Метель / Бездна) ---------- */

const lavaTexture = createProceduralTexture((ctx, size) => {
  const bg = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size * 0.7);
  bg.addColorStop(0, '#ff8800');
  bg.addColorStop(0.5, '#e84200');
  bg.addColorStop(1, '#9e1b00');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = i % 2 ? 'rgba(38,8,6,0.72)' : 'rgba(68,14,8,0.58)';
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      10 + Math.random() * 28,
      6 + Math.random() * 18,
      Math.random() * Math.PI,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const lavaRivers = generateCrackNetwork(size, 7, 5, 65, 65);
  for (const river of lavaRivers) {
    drawSeamlessCrack(ctx, size, river.pts, 6, 'rgba(255,165,30,0.75)', '#ff6a00', 10);
    drawSeamlessCrack(ctx, size, river.pts, 2.2, '#fff4b8');
  }
}, 512, 5, 5);

const iceLavaTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#3578b0';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  for (let i = 0; i < 90; i++) {
    const r = 12 + (i / 90) * (size * 0.65);
    const a0 = i * 0.35 + Math.random() * 0.5;
    const a1 = a0 + 0.7 + Math.random() * 1.1;
    ctx.strokeStyle =
      i % 3 === 0
        ? 'rgba(255,255,255,0.78)'
        : i % 2 === 0
          ? 'rgba(185,235,255,0.62)'
          : 'rgba(25,70,120,0.55)';
    ctx.lineWidth = 4 + Math.random() * 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a1);
    ctx.stroke();
  }

  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = Math.random() < 0.6 ? 'rgba(240,252,255,0.45)' : 'rgba(120,200,250,0.4)';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 6 + Math.random() * 22, 0, Math.PI * 2);
    ctx.fill();
  }
}, 512, 4, 4);

const voidLavaTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#05010d';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 45; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 20 + Math.random() * 55;
    const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, r);
    grad.addColorStop(0, i % 2 ? 'rgba(145,45,245,0.42)' : 'rgba(70,15,140,0.48)');
    grad.addColorStop(1, 'rgba(5,1,13,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 160; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    ctx.fillStyle = i % 5 === 0 ? '#ffffff' : i % 2 === 0 ? '#e5b8ff' : '#90c8ff';
    ctx.beginPath();
    ctx.arc(sx, sy, 0.9 + Math.random() * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}, 512, 4, 4);

/* ---------- 3. Текстуры мобов, боссов и спецэффектов ---------- */

TEXTURES.ogarekCore = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#9a1800';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = `rgba(35,0,0,${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 26, 0, 7);
    ctx.fill();
  }
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#ffdd66';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = `rgba(255,${(120 + Math.random() * 110) | 0},20,${0.3 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 8, 0, 7);
    ctx.fill();
  }
}, 128);

TEXTURES.iceCore = createProceduralTexture((ctx, size) => {
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#8ee8ff');
  grad.addColorStop(0.75, '#1b88d8');
  grad.addColorStop(1, '#083260');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#e8fbff';
  ctx.shadowColor = '#60d8ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 3; k++) {
      x += (Math.random() - 0.5) * 55;
      y += (Math.random() - 0.5) * 55;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}, 128);

TEXTURES.voidStarSkin = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#05020e';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 24; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = 14 + Math.random() * 38;
    const g = ctx.createRadialGradient(gx, gy, 2, gx, gy, r);
    g.addColorStop(0, i % 2 ? 'rgba(120,40,220,0.45)' : 'rgba(40,80,190,0.38)');
    g.addColorStop(1, 'rgba(5,2,14,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 140; i++) {
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    const sr = 0.7 + Math.random() * 1.9;
    ctx.fillStyle = i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? '#d8a8ff' : '#88e0ff';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
}, 256, 2, 2);

TEXTURES.architectBlueprint = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(28, 6, 56, 0.38)';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(215, 130, 255, 0.92)';
  ctx.shadowColor = '#b448ff';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 3;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, 216, 216);

  // Координатная сетка и невозможная геометрия
  ctx.strokeStyle = 'rgba(180, 95, 255, 0.45)';
  ctx.lineWidth = 1;
  for (let g = 40; g < 256; g += 36) {
    ctx.beginPath();
    ctx.moveTo(g, 20);
    ctx.lineTo(g, 236);
    ctx.moveTo(20, g);
    ctx.lineTo(236, g);
    ctx.stroke();
  }

  // Треугольник, концентрические круги и руны
  ctx.strokeStyle = '#f2d4ff';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(128, 128, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(128, 128, 44, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(128, 42);
  ctx.lineTo(202, 174);
  ctx.lineTo(54, 174);
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(128, 214);
  ctx.lineTo(202, 82);
  ctx.lineTo(54, 82);
  ctx.closePath();
  ctx.stroke();

  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.frostWeb = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(210, 245, 255, 0.88)';
  ctx.shadowColor = '#68d8ff';
  ctx.shadowBlur = 10;

  const cx = 256;
  const cy = 256;
  // Радиальные нити паутины
  ctx.lineWidth = 2.2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 245, cy + Math.sin(a) * 245);
    ctx.stroke();
  }
  // Концентрические провисающие нити
  ctx.lineWidth = 1.8;
  for (const r of [48, 92, 138, 184, 228]) {
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a0 = ((i - 1) / 16) * Math.PI * 2;
      const a1 = (i / 16) * Math.PI * 2;
      const am = (a0 + a1) * 0.5;
      const x1 = cx + Math.cos(a1) * r;
      const y1 = cy + Math.sin(a1) * r;
      if (i === 0) {
        ctx.moveTo(x1, y1);
      } else {
        const xm = cx + Math.cos(am) * (r * 0.91);
        const ym = cy + Math.sin(am) * (r * 0.91);
        ctx.quadraticCurveTo(xm, ym, x1, y1);
      }
    }
    ctx.stroke();
  }
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.glowWarm = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,244,180,1)');
  gradient.addColorStop(0.3, 'rgba(255,190,70,0.55)');
  gradient.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}, 128);

TEXTURES.glowIce = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(235,252,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(110,205,255,0.55)');
  gradient.addColorStop(1, 'rgba(30,120,210,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}, 128);

TEXTURES.coal = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,225,180,1)');
  gradient.addColorStop(0.28, 'rgba(255,70,25,0.6)');
  gradient.addColorStop(1, 'rgba(255,20,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}, 128);

TEXTURES.glowPurple = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(225,180,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(150,70,255,0.5)');
  gradient.addColorStop(1, 'rgba(90,20,200,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}, 128);

TEXTURES.glowWhite = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
}, 128);

TEXTURES.voidCore = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#16042c';
  ctx.fillRect(0, 0, 256, 256);

  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(240,200,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(170,60,255,0.55)');
  gradient.addColorStop(1, 'rgba(40,0,80,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(210,140,255,0.7)';
  ctx.shadowColor = '#a040ff';
  ctx.shadowBlur = 8;
  for (let i = 0; i < 30; i++) {
    const radius = 20 + Math.random() * 100;
    const startAngle = Math.random() * Math.PI * 2;
    const arcLen = 0.6 + Math.random() * 1.6;
    ctx.lineWidth = 1 + Math.random() * 2.5;
    ctx.beginPath();
    ctx.arc(128, 128, radius, startAngle, startAngle + arcLen);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 4, 0, 7);
    ctx.fill();
  }
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.guardBrick = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#b0a496';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0, row = 0; y < size; y += 16, row++) {
    for (let x = -32; x < size; x += 32) {
      const shade = (Math.random() * 30) | 0;
      ctx.fillStyle = `rgb(${150 + shade},${(85 + shade * 0.6) | 0},${(70 + shade * 0.5) | 0})`;
      ctx.fillRect(x + (row % 2 ? 16 : 0) + 1, y + 1, 30, 14);
    }
  }
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
}, 128);

TEXTURES.guardCrack = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const paths = [];
  for (let m = 0; m < 4; m++) {
    const points = [];
    let x = 128 + (Math.random() - 0.5) * 60;
    let y = 20 + Math.random() * 40;
    points.push([x, y]);
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 70;
      y += 30 + Math.random() * 25;
      points.push([x, y]);
    }
    paths.push(points);
  }

  const drawCrackPass = (lineWidth, color, blur) => {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.shadowColor = '#ff2200';
    ctx.shadowBlur = blur;
    for (const points of paths) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  };

  drawCrackPass(7, 'rgba(255,40,10,0.85)', 16);
  drawCrackPass(2.2, '#ffd8c8', 6);

  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(255,${(80 + Math.random() * 100) | 0},40,${0.4 + Math.random() * 0.5})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 1.5 + Math.random() * 3, 0, 7);
    ctx.fill();
  }
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.iceCrack = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const paths = [];
  for (let m = 0; m < 4; m++) {
    const points = [];
    let x = 128 + (Math.random() - 0.5) * 60;
    let y = 20 + Math.random() * 40;
    points.push([x, y]);
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 70;
      y += 30 + Math.random() * 25;
      points.push([x, y]);
    }
    paths.push(points);
  }

  for (const [lw, col, blur] of [
    [7, 'rgba(80,205,255,0.85)', 16],
    [2.2, '#ffffff', 6]
  ]) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    ctx.shadowColor = '#38b8ff';
    ctx.shadowBlur = blur;
    for (const points of paths) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.leaperLava = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#9a1800';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 45; i++) {
    ctx.fillStyle = `rgba(35,0,0,${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 26, 0, 7);
    ctx.fill();
  }
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#ffdd66';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (Math.random() - 0.5) * 70;
      y += (Math.random() - 0.5) * 70;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}, 256, 2, 1);

/* ===== Текстуры боссов ===== */

TEXTURES.golemChar = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 256, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const paths = [];
  for (let m = 0; m < 5; m++) {
    const points = [];
    let x = Math.random() * 256;
    let y = Math.random() * 256;
    points.push([x, y]);
    for (let k = 0; k < 5; k++) {
      x += (Math.random() - 0.5) * 80;
      y += (Math.random() - 0.5) * 80;
      points.push([x, y]);
    }
    paths.push(points);
  }

  const drawCharPass = (lineWidth, color, blur) => {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.shadowColor = '#ff5500';
    ctx.shadowBlur = blur;
    for (const points of paths) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  };

  drawCharPass(6, 'rgba(255,80,10,0.9)', 14);
  drawCharPass(2, '#ffd8b0', 5);
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.golemFloor = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let m = 0; m < 12; m++) {
    const baseAngle = (m / 12) * Math.PI * 2 + Math.random() * 0.4;
    const points = [[256, 256]];
    let radius = 20;
    let angle = baseAngle;
    for (let k = 0; k < 6; k++) {
      radius += 30 + Math.random() * 34;
      angle += (Math.random() - 0.5) * 0.5;
      points.push([256 + Math.cos(angle) * radius, 256 + Math.sin(angle) * radius]);
    }
    for (const [lineWidth, color, blur] of [
      [7, 'rgba(255,220,180,0.85)', 16],
      [2.4, '#ffffff', 6]
    ]) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = blur;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(texCanvas);
})();

TEXTURES.wombRune = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(235,215,255,0.9)';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 14;

  for (const radius of [120, 150, 205]) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(256, 256, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    const r0 = 160;
    const r1 = 196;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(angle) * r0, 256 + Math.sin(angle) * r0);
    ctx.lineTo(256 + Math.cos(angle + 0.06) * r1, 256 + Math.sin(angle + 0.06) * r1);
    if (i % 3 === 0) {
      ctx.lineTo(256 + Math.cos(angle - 0.05) * (r1 - 14), 256 + Math.sin(angle - 0.05) * (r1 - 14));
    }
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(angle) * 40, 256 + Math.sin(angle) * 40);
    ctx.lineTo(256 + Math.cos(angle) * 118, 256 + Math.sin(angle) * 118);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(texCanvas);
})();

function createKolossFlowTexture(repeatX, repeatY) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.fillStyle = '#d45000';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = `rgba(122,24,0,${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 8 + Math.random() * 20, 0, 7);
    ctx.fill();
  }
  ctx.shadowColor = '#ff8800';
  ctx.shadowBlur = 9;
  for (let i = 0; i < 34; i++) {
    const startX = Math.random() * 256;
    ctx.strokeStyle = `rgba(255,${(190 + Math.random() * 60) | 0},80,${0.5 + Math.random() * 0.5})`;
    ctx.lineWidth = 2 + Math.random() * 6;
    ctx.beginPath();
    ctx.moveTo(startX, -10);
    let x = startX;
    for (let y = 0; y <= 270; y += 26) {
      x += (Math.random() - 0.5) * 16;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

TEXTURES.kolBody = createKolossFlowTexture(2, 2);
TEXTURES.kolCol = createKolossFlowTexture(1.5, 1);

TEXTURES.kolEye = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 128;
  const ctx = texCanvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, '#fff8d0');
  gradient.addColorStop(0.35, '#ffc040');
  gradient.addColorStop(0.75, '#ff5a00');
  gradient.addColorStop(1, '#7a1000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = 'rgba(255,240,176,0.85)';
  ctx.shadowColor = '#ffdd80';
  ctx.shadowBlur = 6;
  for (let i = 0; i < 22; i++) {
    const radius = 8 + Math.random() * 50;
    const startAngle = Math.random() * 7;
    const arcLen = 0.7 + Math.random() * 1.8;
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(64, 64, radius, startAngle, startAngle + arcLen);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.center.set(0.5, 0.5);
  return texture;
})();

TEXTURES.kolCrack = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const paths = [];
  for (let m = 0; m < 4; m++) {
    const points = [];
    let x = 128 + (Math.random() - 0.5) * 60;
    let y = 16 + Math.random() * 40;
    points.push([x, y]);
    for (let k = 0; k < 6; k++) {
      x += (Math.random() - 0.5) * 70;
      y += 30 + Math.random() * 25;
      points.push([x, y]);
    }
    paths.push(points);
  }

  const drawCrackPass = (lineWidth, color, blur) => {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = blur;
    for (const points of paths) {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.stroke();
    }
  };

  drawCrackPass(7, 'rgba(255,140,20,0.9)', 16);
  drawCrackPass(2.4, '#ffe090', 6);
  return new THREE.CanvasTexture(texCanvas);
})();

/* ---------- 4. Художественные фоны неба для трёх башен ---------- */

function createRichSkyTexture(towerId) {
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d');

  if (towerId === 'ash') {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#140509');
    grad.addColorStop(0.4, '#360c14');
    grad.addColorStop(0.75, '#681812');
    grad.addColorStop(1, '#b83c0c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 38; i++) {
      const cx = Math.random() * 512;
      const cy = 40 + Math.random() * 380;
      const rx = 50 + Math.random() * 110;
      const ry = 20 + Math.random() * 45;
      const cGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, rx);
      cGrad.addColorStop(0, i % 2 ? 'rgba(95,18,24,0.38)' : 'rgba(28,8,12,0.45)');
      cGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (towerId === 'ice') {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#071426');
    grad.addColorStop(0.45, '#183b63');
    grad.addColorStop(0.8, '#3d78ab');
    grad.addColorStop(1, '#8fd0f8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 35; i++) {
      const cx = Math.random() * 512;
      const cy = Math.random() * 512;
      const r = 40 + Math.random() * 90;
      const cGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
      cGrad.addColorStop(0, 'rgba(195,238,255,0.22)');
      cGrad.addColorStop(1, 'rgba(20,55,90,0)');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#020006');
    grad.addColorStop(0.5, '#0d041f');
    grad.addColorStop(0.85, '#220942');
    grad.addColorStop(1, '#441278');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(155,70,255,0.22)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      const x0 = Math.random() * 512;
      const y0 = Math.random() * 360;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (Math.random() - 0.5) * 180, y0 + (Math.random() - 0.5) * 120);
      ctx.lineTo(x0 + (Math.random() - 0.5) * 180, y0 + (Math.random() - 0.5) * 120);
      ctx.closePath();
      ctx.stroke();
    }

    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = i % 4 === 0 ? '#ffffff' : i % 2 === 0 ? '#dfb8ff' : '#88c8ff';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5 + (i % 2), 1.5 + (i % 2));
    }
  }

  return new THREE.CanvasTexture(skyCanvas);
}

const BACKGROUND_TEXTURES = {
  ash: createRichSkyTexture('ash'),
  ice: createRichSkyTexture('ice'),
  void: createRichSkyTexture('void')
};
scene.background = BACKGROUND_TEXTURES.ash;


/* ---------- 5. Специальные текстуры по референсам-мудбордам (оружие, экипировка, объекты карты) ---------- */

// Потрескавшаяся лавовая корка (для Огненных шаров, Угольного сапога и Сундука с замком из магмы)
TEXTURES.crackedLavaCrust = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#1b0b0e';
  ctx.fillRect(0, 0, size, size);

  // Базальтовые полигональные плитки корки
  const seeds = [];
  const gridN = 6;
  for (let gx = 0; gx < gridN; gx++) {
    for (let gy = 0; gy < gridN; gy++) {
      seeds.push([
        ((gx + 0.2 + Math.random() * 0.6) / gridN) * size,
        ((gy + 0.2 + Math.random() * 0.6) / gridN) * size
      ]);
    }
  }

  // Рисуем сеть раскалённых трещин между центрами ячеек
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const cracks = generateCrackNetwork(size, 10, 7, 48, 48);
  for (const c of cracks) {
    drawSeamlessCrack(ctx, size, c.pts, c.main ? 12 : 7, 'rgba(255,65,0,0.85)', '#ff3800', 14);
    drawSeamlessCrack(ctx, size, c.pts, c.main ? 6 : 3.5, '#ff9e18', '#ff7700', 8);
    drawSeamlessCrack(ctx, size, c.pts, c.main ? 2.4 : 1.4, '#fff6b8');
  }

  // Тёмные шероховатые острова остывшей лавовой корки поверх
  for (const [sx, sy] of seeds) {
    const r = 14 + Math.random() * 14;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = Math.random() < 0.5 ? '#231114' : '#2f1618';
    ctx.strokeStyle = '#ff7a12';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const sides = 6;
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2;
      const rad = r * (0.72 + Math.random() * 0.35);
      if (k === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
      else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}, 256, 1, 1);

// Внутренние морозные трещины для Ледяной подошвы и морозного следа
TEXTURES.iceSoleCrack = createProceduralTexture((ctx, size) => {
  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size * 0.65);
  grad.addColorStop(0, '#bfefff');
  grad.addColorStop(0.5, '#6fc8f8');
  grad.addColorStop(1, '#2b78b8');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.shadowColor = '#78e4ff';
  ctx.shadowBlur = 10;
  for (let i = 0; i < 14; i++) {
    const baseA = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
    let x = cx;
    let y = cy;
    ctx.lineWidth = i % 2 === 0 ? 3.2 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 1; s <= 5; s++) {
      const dist = (s / 5) * (size * 0.48);
      const a = baseA + (Math.random() - 0.5) * 0.35;
      x = cx + Math.cos(a) * dist;
      y = cy + Math.sin(a) * dist;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}, 256, 1, 1);

// Рунный кинетический круг для Прыжковой площадки (Пада)
TEXTURES.runicJumpPad = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 248);
  bg.addColorStop(0, 'rgba(210,255,250,0.98)');
  bg.addColorStop(0.35, 'rgba(40,245,215,0.85)');
  bg.addColorStop(0.78, 'rgba(12,135,130,0.75)');
  bg.addColorStop(1, 'rgba(8,35,42,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#e8fffb';
  ctx.shadowColor = '#20ffe0';
  ctx.shadowBlur = 12;

  for (const r of [64, 118, 168, 212, 236]) {
    ctx.lineWidth = r === 168 || r === 212 ? 4.5 : 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Вписанный восьмиугольник и звезда кинетического импульса
  ctx.lineWidth = 3;
  for (let offset = 0; offset < 2; offset++) {
    ctx.beginPath();
    for (let k = 0; k <= 4; k++) {
      const a = (k / 4) * Math.PI * 2 + (offset * Math.PI) / 4;
      const px = cx + Math.cos(a) * 166;
      const py = cy + Math.sin(a) * 166;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Псевдо-руны во внешнем кольце [172..208]
  ctx.lineWidth = 2.6;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 190, cy + Math.sin(a) * 190);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.moveTo(-6, -4);
    ctx.lineTo(6, 4);
    if (i % 2 === 0) {
      ctx.moveTo(-6, 6);
      ctx.lineTo(6, -6);
    }
    ctx.stroke();
    ctx.restore();
  }

  return new THREE.CanvasTexture(texCanvas);
})();

// Концентрические кинетические кольца и радиальные линии для Ударной волны
TEXTURES.shockwaveRunes = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  const cx = 256;
  const cy = 256;
  ctx.clearRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(215,248,255,0.92)';
  ctx.shadowColor = '#58d8ff';
  ctx.shadowBlur = 14;

  for (const [r, lw] of [
    [68, 2.5],
    [128, 3.5],
    [186, 4.2],
    [238, 6.0]
  ]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineWidth = 2.2;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 48);
    ctx.lineTo(cx + Math.cos(a) * 242, cy + Math.sin(a) * 242);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(texCanvas);
})();

// Каменный кратер с раскалёнными лавовыми швами для Угольного сапога
TEXTURES.coalCraterDecal = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  const cx = 256;
  const cy = 256;
  ctx.clearRect(0, 0, 512, 512);

  const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, 245);
  glow.addColorStop(0, 'rgba(255,230,120,0.95)');
  glow.addColorStop(0.35, 'rgba(255,105,15,0.75)');
  glow.addColorStop(0.82, 'rgba(180,28,0,0.45)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 248, 0, Math.PI * 2);
  ctx.fill();

  // Концентрические и радиальные трещины каменной кладки
  ctx.strokeStyle = '#fff0a0';
  ctx.shadowColor = '#ff5500';
  ctx.shadowBlur = 12;
  for (const r of [62, 124, 188, 232]) {
    ctx.lineWidth = r === 232 ? 6 : 3.5;
    ctx.beginPath();
    for (let s = 0; s <= 24; s++) {
      const a = (s / 24) * Math.PI * 2;
      const jr = r + Math.sin(s * 3.7 + r) * 6;
      const px = cx + Math.cos(a) * jr;
      const py = cy + Math.sin(a) * jr;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.lineWidth = 3.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
    ctx.lineTo(cx + Math.cos(a + 0.08) * 124, cy + Math.sin(a + 0.08) * 124);
    ctx.lineTo(cx + Math.cos(a - 0.05) * 232, cy + Math.sin(a - 0.05) * 232);
    ctx.stroke();
  }

  return new THREE.CanvasTexture(texCanvas);
})();

// Зубчатый светящийся ореол для маркеров элитных мобов (Бронированный / Стремительный / Взрывной)
TEXTURES.eliteHalo = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 256;
  const ctx = texCanvas.getContext('2d');
  const cx = 128;
  const cy = 128;
  ctx.clearRect(0, 0, 256, 256);

  // Мягкое внешнее свечение кольца
  const radGrad = ctx.createRadialGradient(cx, cy, 42, cx, cy, 120);
  radGrad.addColorStop(0, 'rgba(255,255,255,0)');
  radGrad.addColorStop(0.55, 'rgba(255,255,255,0.85)');
  radGrad.addColorStop(0.78, 'rgba(255,255,255,0.35)');
  radGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = radGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 120, 0, Math.PI * 2);
  ctx.fill();

  // Основное яркое кольцо + 12 острых лучей-шипов наружу (как на мудборде)
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();

  const spikes = 12;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const isMajor = i % 3 === 0;
    const innerR = 66;
    const outerR = isMajor ? 114 : 96;
    const halfSpread = isMajor ? 0.12 : 0.08;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - halfSpread) * innerR, cy + Math.sin(a - halfSpread) * innerR);
    ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
    ctx.lineTo(cx + Math.cos(a + halfSpread) * innerR, cy + Math.sin(a + halfSpread) * innerR);
    ctx.closePath();
    ctx.fill();
  }

  return new THREE.CanvasTexture(texCanvas);
})();
