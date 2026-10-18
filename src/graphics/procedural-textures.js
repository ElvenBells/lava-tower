/* ==========================================================================
   Процедурные текстуры (генерируются один раз на старте и переиспользуются):
   многослойные карты цвета (map), нормалей/рельефа (bumpMap) и свечения (emissiveMap)
   для Пепельной башни (детализированный базальт с обугленными участками и редкими
   лавовыми трещинами из babylon_js_glsl.html), Ледяной башни (глубокий сплошной лёд
   с внутренними трещинами #88ddff и вмёрзшими силуэтами из babylon_js.html) и
   Башни Пустоты (R/G/B асинхронные руны и чёрный обсидиановый пол с редкими
   блестящими вкраплениями звёздной пыли из babylon_js_environment.html)
   ========================================================================== */

function createProceduralTexture(drawFn, size = 256, repeatX = 1, repeatY = 1) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = size;
  drawFn(texCanvas.getContext('2d'), size);
  const texture = new BABYLON.CanvasTexture(texCanvas);
  texture.wrapS = texture.wrapT = BABYLON.RepeatWrapping;
  if (repeatX !== 1 || repeatY !== 1) {
    texture.repeat.set(repeatX, repeatY);
  }
  return texture;
}

const TEXTURES = {};
const TOWER_WALL_TEXTURES = {};
const TOWER_FLOOR_TEXTURES = {};

/* ---------- Утилиты шума и конвертации карт рельефа в Normal Map (из референсов) ---------- */

function texSeededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
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

function stoneHash3D(px, py, pz) {
  const fx = ((px * 0.3183099 + 0.1) % 1 + 1) % 1 * 17.0;
  const fy = ((py * 0.3183099 + 0.1) % 1 + 1) % 1 * 17.0;
  const fz = ((pz * 0.3183099 + 0.1) % 1 + 1) % 1 * 17.0;
  const prod = fx * fy * fz * (fx + fy + fz);
  return prod - Math.floor(prod);
}

function stoneNoise3D(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  let fx = x - ix, fy = y - iy, fz = z - iz;
  fx = fx * fx * (3.0 - 2.0 * fx);
  fy = fy * fy * (3.0 - 2.0 * fy);
  fz = fz * fz * (3.0 - 2.0 * fz);

  const n000 = stoneHash3D(ix, iy, iz);
  const n100 = stoneHash3D(ix + 1, iy, iz);
  const n010 = stoneHash3D(ix, iy + 1, iz);
  const n110 = stoneHash3D(ix + 1, iy + 1, iz);
  const n001 = stoneHash3D(ix, iy, iz + 1);
  const n101 = stoneHash3D(ix + 1, iy, iz + 1);
  const n011 = stoneHash3D(ix, iy + 1, iz + 1);
  const n111 = stoneHash3D(ix + 1, iy + 1, iz + 1);

  const nx00 = n000 + (n100 - n000) * fx;
  const nx10 = n010 + (n110 - n010) * fx;
  const nx01 = n001 + (n101 - n001) * fx;
  const nx11 = n011 + (n111 - n011) * fx;

  const nxy0 = nx00 + (nx10 - nx00) * fy;
  const nxy1 = nx01 + (nx11 - nx01) * fy;
  return nxy0 + (nxy1 - nxy0) * fz;
}

function convertBumpToNormalCanvas(bumpCanvas, strength = 3.5) {
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
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

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

// ==================== I. ПЕПЕЛЬНАЯ БАШНЯ (ASH — из babylon_js_glsl.html) ====================
// Детализированный базальтовый камень, некоторые участки обуглены до черноты,
// в некоторых местах присутствуют ветвящиеся «лавовые трещины»
(function buildAshTowerTextures() {
  const size = 512;

  // 1. Текстуры каменной кладки стен (createWallStoneTextures из babylon_js_glsl.html)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = diffCanvas.height = size;
  const dCtx = diffCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  const emCanvas = document.createElement('canvas');
  emCanvas.width = emCanvas.height = size;
  const eCtx = emCanvas.getContext('2d');

  dCtx.fillStyle = '#0c0c0e';
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#121212';
  bCtx.fillRect(0, 0, size, size);
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

      const baseVal = 50 + Math.floor(texSeededRandom(r * 41 + c * 23) * 30);
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

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;

      const macroN = tiledFbm2D(u, v, 4, 4);
      const medN = tiledFbm2D(u + 0.31, v + 0.57, 16, 4);
      const fineN = tiledNoise2D(u * 96, v * 96, 96);
      const microCrack = Math.abs(tiledFbm2D(u + 0.13, v + 0.79, 12, 3) - 0.5) * 2.0;

      // Обугленные до глубокой черноты участки камня
      const charMask = Math.max(0, Math.min(1, (macroN - 0.52) * 3.8 + (medN - 0.5) * 0.9));
      const darkCrackMask = microCrack < 0.045 ? (1.0 - microCrack / 0.045) : 0.0;

      let r = diffData.data[idx];
      let g = diffData.data[idx + 1];
      let b = diffData.data[idx + 2];

      const grain = (medN - 0.5) * 34 + (fineN - 0.5) * 22;
      r += grain;
      g += grain * 0.96;
      b += grain * 0.94;

      r *= (1.0 - darkCrackMask * 0.72);
      g *= (1.0 - darkCrackMask * 0.72);
      b *= (1.0 - darkCrackMask * 0.72);

      const charDarken = 1.0 - charMask * 0.90;
      r = r * charDarken + 4 * charMask;
      g = g * charDarken + 4 * charMask;
      b = b * charDarken + 6 * charMask;

      diffData.data[idx]     = Math.max(4, Math.min(255, Math.floor(r)));
      diffData.data[idx + 1] = Math.max(4, Math.min(255, Math.floor(g)));
      diffData.data[idx + 2] = Math.max(5, Math.min(255, Math.floor(b)));

      let bv = bumpData.data[idx];
      bv += (medN - 0.5) * 75 + (fineN - 0.5) * 42 - darkCrackMask * 110;
      bv = Math.max(0, Math.min(255, Math.floor(bv)));
      bumpData.data[idx] = bumpData.data[idx + 1] = bumpData.data[idx + 2] = bv;
    }
  }

  dCtx.putImageData(diffData, 0, 0);
  bCtx.putImageData(bumpData, 0, 0);

  // Ветвящиеся лавовые трещины в некоторых местах стены
  const sparseCrackCount = 6;
  for (let i = 0; i < sparseCrackCount; i++) {
    let cx = (0.14 + texSeededRandom(i * 113 + 9) * 0.72) * size;
    let cy = (0.14 + texSeededRandom(i * 197 + 23) * 0.72) * size;
    const segments = 16 + Math.floor(texSeededRandom(i * 43) * 12);
    let angle = Math.PI * 0.5 + (texSeededRandom(i * 79) - 0.5) * 1.2;

    for (let s = 0; s < segments; s++) {
      const stepLen = 5 + texSeededRandom(i * 311 + s * 17) * 7;
      angle += (texSeededRandom(i * 509 + s * 23) - 0.5) * 0.85;
      const nx = cx + Math.cos(angle) * stepLen;
      const ny = cy + Math.sin(angle) * stepLen;

      const t = 1.0 - s / segments;
      const taper = Math.sin(t * Math.PI);
      const width = 0.9 + taper * 2.2;

      dCtx.strokeStyle = 'rgba(5, 4, 5, 0.9)';
      dCtx.lineWidth = width * 4.5;
      dCtx.lineCap = 'round';
      dCtx.beginPath();
      dCtx.moveTo(cx, cy);
      dCtx.lineTo(nx, ny);
      dCtx.stroke();

      eCtx.strokeStyle = 'rgba(235, 55, 0, 0.55)';
      eCtx.lineWidth = width * 2.4;
      eCtx.lineCap = 'round';
      eCtx.shadowColor = '#ff3800';
      eCtx.shadowBlur = 8;
      eCtx.beginPath();
      eCtx.moveTo(cx, cy);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      eCtx.strokeStyle = s % 3 === 0 ? '#ffaa18' : '#ff4500';
      eCtx.lineWidth = width * 0.95;
      eCtx.beginPath();
      eCtx.moveTo(cx, cy);
      eCtx.lineTo(nx, ny);
      eCtx.stroke();

      bCtx.strokeStyle = '#020202';
      bCtx.lineWidth = width * 2.2;
      bCtx.beginPath();
      bCtx.moveTo(cx, cy);
      bCtx.lineTo(nx, ny);
      bCtx.stroke();

      cx = nx;
      cy = ny;
    }
  }

  const wallNormalCanvas = convertBumpToNormalCanvas(bumpCanvas, 4.2);
  const wallMap = new BABYLON.CanvasTexture(diffCanvas);
  const wallBump = new BABYLON.CanvasTexture(wallNormalCanvas);
  const wallEmissive = new BABYLON.CanvasTexture(emCanvas);
  for (const t of [wallMap, wallBump, wallEmissive]) {
    t.wrapS = t.wrapT = BABYLON.RepeatWrapping;
    t.repeat.set(6, 4);
  }

  // 2. Текстуры каменного пола и ступеней (createFloorStoneTextures из babylon_js_glsl.html)
  const fDiffCanvas = document.createElement('canvas');
  fDiffCanvas.width = fDiffCanvas.height = size;
  const fdCtx = fDiffCanvas.getContext('2d');

  const fBumpCanvas = document.createElement('canvas');
  fBumpCanvas.width = fBumpCanvas.height = size;
  const fbCtx = fBumpCanvas.getContext('2d');

  const fEmCanvas = document.createElement('canvas');
  fEmCanvas.width = fEmCanvas.height = size;
  const feCtx = fEmCanvas.getContext('2d');

  const fdImg = fdCtx.createImageData(size, size);
  const fbImg = fbCtx.createImageData(size, size);
  const feImg = feCtx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const idx = (y * size + x) * 4;

      const nMacro = tiledFbm2D(u, v, 4, 4);
      const nMed = tiledFbm2D(u + 0.41, v + 0.19, 12, 4);
      const nFine = tiledFbm2D(u + 0.73, v + 0.61, 32, 3);
      const nMicro = tiledNoise2D(u * 96, v * 96, 96);

      const ridge1 = Math.abs(nMed - 0.5) * 2.0;
      const ridge2 = Math.abs(tiledFbm2D(u + 0.22, v + 0.88, 8, 4) - 0.5) * 2.0;

      const charZone = Math.max(0, Math.min(1, (nMacro - 0.50) * 3.6 + (nFine - 0.5) * 0.75));
      const stoneFissure = ridge1 < 0.068 ? (1.0 - ridge1 / 0.068) : 0.0;
      const subFissure = ridge2 < 0.042 ? (1.0 - ridge2 / 0.042) * 0.6 : 0.0;
      const totalCrackDark = Math.min(1.0, stoneFissure + subFissure);

      let baseStone = 52 + nMed * 36 + (nFine - 0.5) * 22 + (nMicro - 0.5) * 14;
      let sr = baseStone + 2;
      let sg = baseStone + 1;
      let sb = baseStone + 3;

      sr *= (1.0 - totalCrackDark * 0.78);
      sg *= (1.0 - totalCrackDark * 0.78);
      sb *= (1.0 - totalCrackDark * 0.78);

      const charMult = 1.0 - charZone * 0.90;
      sr = sr * charMult + 4 * charZone;
      sg = sg * charMult + 4 * charZone;
      sb = sb * charMult + 5 * charZone;

      fdImg.data[idx]     = Math.max(4, Math.min(255, Math.floor(sr)));
      fdImg.data[idx + 1] = Math.max(4, Math.min(255, Math.floor(sg)));
      fdImg.data[idx + 2] = Math.max(5, Math.min(255, Math.floor(sb)));
      fdImg.data[idx + 3] = 255;

      let bumpVal = 140 + (nMed - 0.5) * 70 + (nFine - 0.5) * 55 + (nMicro - 0.5) * 30;
      bumpVal -= totalCrackDark * 125;
      fbImg.data[idx] = fbImg.data[idx + 1] = fbImg.data[idx + 2] = Math.max(0, Math.min(255, Math.floor(bumpVal)));
      fbImg.data[idx + 3] = 255;

      // Лавовые трещины в некоторых участках каменного пола
      const rareHeatPocket = nMacro < 0.28 && ridge2 < 0.25;
      if (ridge1 < 0.038 && rareHeatPocket) {
        const heatMask = (1.0 - nMacro / 0.28) * (1.0 - ridge2 / 0.25);
        const intensity = Math.pow(1.0 - ridge1 / 0.038, 1.5) * Math.min(1.0, heatMask * 2.5);
        feImg.data[idx]     = Math.min(255, Math.floor(intensity * 255));
        feImg.data[idx + 1] = Math.min(255, Math.floor(intensity * 95));
        feImg.data[idx + 2] = Math.min(255, Math.floor(intensity * 12));
        fdImg.data[idx]     = Math.floor(fdImg.data[idx] * 0.32);
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
  feCtx.putImageData(feImg, 0, 0);

  const floorNormalCanvas = convertBumpToNormalCanvas(fBumpCanvas, 4.5);
  const floorMap = new BABYLON.CanvasTexture(fDiffCanvas);
  const floorBump = new BABYLON.CanvasTexture(floorNormalCanvas);
  const floorEmissive = new BABYLON.CanvasTexture(fEmCanvas);
  for (const t of [floorMap, floorBump, floorEmissive]) {
    t.wrapS = t.wrapT = BABYLON.RepeatWrapping;
    t.repeat.set(1, 1);
  }

  TOWER_WALL_TEXTURES.ash = { map: wallMap, bump: wallBump, emissive: wallEmissive };
  TOWER_FLOOR_TEXTURES.ash = { map: floorMap, bump: floorBump, emissive: floorEmissive };
})();

// ==================== II. ЛЕДЯНАЯ БАШНЯ (ICE — из babylon_js.html) ====================
// Сплошной глубокий лёд с внутренними трещинами (#88ddff, эмиссия = 1.95) и вмёрзшими силуэтами
(function buildIceTowerTextures() {
  const size = 512;

  // Генератор альфа-текстур вмёрзших в лёд силуэтов странников (из babylon_js.html)
  function buildFrozenSilhouetteTex(poseVariant) {
    const w = 256, h = 512;
    const cvs = document.createElement('canvas');
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    const aura = ctx.createRadialGradient(w * 0.5, h * 0.48, 12, w * 0.5, h * 0.48, 120);
    aura.addColorStop(0, 'rgba(8, 22, 42, 0.68)');
    aura.addColorStop(0.6, 'rgba(18, 48, 78, 0.28)');
    aura.addColorStop(1, 'rgba(18, 48, 78, 0.0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
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

    ctx.strokeStyle = 'rgba(165, 230, 255, 0.38)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(20, 80 + i * 55);
      ctx.lineTo(w - 20, 50 + i * 58 + (i % 2) * 30);
      ctx.stroke();
    }

    return new BABYLON.CanvasTexture(cvs);
  }

  TEXTURES.frozenSilhouettes = [
    buildFrozenSilhouetteTex(0),
    buildFrozenSilhouetteTex(1),
    buildFrozenSilhouetteTex(2)
  ];

  const frostCracks = generateCrackNetwork(size, 9, 6, 62, 62);

  // Рельефная карта нормалей ледяных стен (generateIceWallNormalTexture из babylon_js.html)
  const wallHeightCvs = document.createElement('canvas');
  wallHeightCvs.width = wallHeightCvs.height = size;
  const whCtx = wallHeightCvs.getContext('2d');
  whCtx.fillStyle = '#303030';
  whCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 64; i++) {
    const x = (i / 64) * size;
    const grad = whCtx.createLinearGradient(x, 0, x + 10, 0);
    grad.addColorStop(0, '#181818');
    grad.addColorStop(0.5, '#909090');
    grad.addColorStop(1, '#222222');
    whCtx.fillStyle = grad;
    whCtx.fillRect(x, 0, 10, size);
  }
  whCtx.strokeStyle = 'rgba(225, 225, 225, 0.5)';
  for (let i = 0; i < 95; i++) {
    whCtx.lineWidth = 0.8 + texSeededRandom(i * 19) * 1.8;
    whCtx.beginPath();
    const sx = texSeededRandom(i * 37) * size;
    const sy = texSeededRandom(i * 53) * size;
    whCtx.moveTo(sx, sy);
    whCtx.lineTo(sx + (texSeededRandom(i * 71) - 0.5) * 90, sy + (texSeededRandom(i * 89) - 0.5) * 160);
    whCtx.stroke();
  }
  const wallNormalCvs = convertBumpToNormalCanvas(wallHeightCvs, 3.2);
  const wallBump = new BABYLON.CanvasTexture(wallNormalCvs);
  wallBump.wrapS = wallBump.wrapT = BABYLON.RepeatWrapping;
  wallBump.repeat.set(6, 3);

  const wallMap = createProceduralTexture((ctx, sz) => {
    const bg = ctx.createLinearGradient(0, 0, sz, sz);
    bg.addColorStop(0, '#112c4a');
    bg.addColorStop(0.45, '#255a8c');
    bg.addColorStop(0.8, '#1b4772');
    bg.addColorStop(1, '#3b78a6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 36; i++) {
      ctx.save();
      ctx.translate(texSeededRandom(i * 17) * sz, texSeededRandom(i * 31) * sz);
      ctx.rotate((texSeededRandom(i * 43) - 0.5) * 0.6);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(155,225,255,0.16)' : 'rgba(8,26,50,0.26)';
      ctx.beginPath();
      ctx.moveTo(-60, -30);
      ctx.lineTo(50, -40);
      ctx.lineTo(70, 35);
      ctx.lineTo(-40, 45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const crack of frostCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 6.0 : 3.2, 'rgba(136,221,255,0.65)', '#88ddff', 10);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.9 : 1.1, '#f4fcff');
    }
  }, size, 6, 3);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#071c33';
    ctx.fillRect(0, 0, sz, sz);
    for (const crack of frostCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5.5 : 3.0, 'rgba(136,221,255,0.75)', '#88ddff', 12);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.8 : 1.0, '#ffffff');
    }
  }, size, 6, 3);

  // Сплошной глубокий лёд пола с внутренними светящимися трещинами (generateFloorMaps из babylon_js.html)
  const fEmCanvas = document.createElement('canvas');
  fEmCanvas.width = fEmCanvas.height = size;
  const feCtx = fEmCanvas.getContext('2d');

  const fRoughCanvas = document.createElement('canvas');
  fRoughCanvas.width = fRoughCanvas.height = size;
  const frCtx = fRoughCanvas.getContext('2d');

  const fDiffCanvas = document.createElement('canvas');
  fDiffCanvas.width = fDiffCanvas.height = size;
  const fdCtx = fDiffCanvas.getContext('2d');

  feCtx.fillStyle = '#030a14';
  feCtx.fillRect(0, 0, size, size);
  frCtx.fillStyle = 'rgb(16, 16, 20)';
  frCtx.fillRect(0, 0, size, size);

  // Глубокий слоистый ледяной массив
  const iceGrad = fdCtx.createRadialGradient(size * 0.5, size * 0.5, 16, size * 0.5, size * 0.5, size * 0.72);
  iceGrad.addColorStop(0, '#4a8ab8');
  iceGrad.addColorStop(0.5, '#2b6391');
  iceGrad.addColorStop(1, '#173d63');
  fdCtx.fillStyle = iceGrad;
  fdCtx.fillRect(0, 0, size, size);

  // Внутренние глубинные разломы льда (эффект толстого многометрового льда)
  const deepSubCracks = generateCrackNetwork(size, 6, 6, 75, 75);
  for (const dc of deepSubCracks) {
    drawSeamlessCrack(fdCtx, size, dc.pts, dc.main ? 10 : 6, 'rgba(10, 28, 52, 0.55)');
    drawSeamlessCrack(fdCtx, size, dc.pts, dc.main ? 4 : 2.2, 'rgba(72, 168, 225, 0.38)');
  }

  // Верхняя сеть морозных светящихся трещин (#88ddff, как в generateFloorMaps из babylon_js.html)
  const surfaceCracks = generateCrackNetwork(size, 9, 7, 68, 68);
  for (const sc of surfaceCracks) {
    drawSeamlessCrack(feCtx, size, sc.pts, sc.main ? 7.5 : 4.2, 'rgba(72, 185, 245, 0.38)', '#88ddff', 10);
    drawSeamlessCrack(feCtx, size, sc.pts, sc.main ? 2.2 : 1.3, 'rgba(155, 232, 255, 0.95)');

    drawSeamlessCrack(fdCtx, size, sc.pts, sc.main ? 5.0 : 3.0, 'rgba(136, 221, 255, 0.65)');
    drawSeamlessCrack(fdCtx, size, sc.pts, sc.main ? 1.8 : 1.0, '#effbff');

    drawSeamlessCrack(frCtx, size, sc.pts, sc.main ? 5.5 : 3.0, 'rgba(195, 195, 195, 0.8)');
  }

  const floorNormalCvs = convertBumpToNormalCanvas(fRoughCanvas, 2.6);
  const floorMap = new BABYLON.CanvasTexture(fDiffCanvas);
  const floorBump = new BABYLON.CanvasTexture(floorNormalCvs);
  const floorEmissive = new BABYLON.CanvasTexture(fEmCanvas);

  TOWER_WALL_TEXTURES.ice = { map: wallMap, bump: wallBump, emissive: wallEmissive };
  TOWER_FLOOR_TEXTURES.ice = { map: floorMap, bump: floorBump, emissive: floorEmissive };
})();

// ==================== III. БАШНЯ ПУСТОТЫ (VOID — из babylon_js_environment.html) ====================
// Руны в R/G/B каналах и чёрный обсидиановый пол с редкими блестящими вкраплениями звёздной пыли
(function buildVoidTowerTextures() {
  const size = 512;

  // 1. Текстуры R/G/B рун и каменного рельефа стен (generateRunesAndCracksTextures из babylon_js_environment.html)
  const runeRGBCanvas = document.createElement('canvas');
  runeRGBCanvas.width = runeRGBCanvas.height = size;
  const rCtx = runeRGBCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d');

  rCtx.fillStyle = '#000000';
  rCtx.fillRect(0, 0, size, size);

  bCtx.fillStyle = '#606060';
  bCtx.fillRect(0, 0, size, size);
  bCtx.strokeStyle = '#282828';
  bCtx.lineWidth = 2.5;
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
    const shift = (r % 2) * (colW * 0.5);
    for (let c = 0; c <= cols; c++) {
      const x = (c * colW + shift) % size;
      bCtx.beginPath();
      bCtx.moveTo(x, y);
      bCtx.lineTo(x, y + rowH);
      bCtx.stroke();
    }
  }

  rCtx.globalCompositeOperation = 'lighter';
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

      rCtx.strokeStyle = color;
      rCtx.shadowColor = color;
      rCtx.shadowBlur = 5;
      rCtx.lineWidth = 2.0;
      drawRuneGlyph(rCtx, cx, cy, 7.5, col * 31 + row * 17);
    }
  }

  for (let k = 0; k < 14; k++) {
    let x = ((k * 73) % 100) * 0.01 * size;
    let y = ((k * 41) % 100) * 0.01 * size;
    const chColor = channelColors[k % 3];

    rCtx.strokeStyle = chColor;
    rCtx.shadowColor = chColor;
    rCtx.shadowBlur = 7;
    rCtx.lineWidth = 1.6;
    rCtx.beginPath();
    rCtx.moveTo(x, y);

    bCtx.strokeStyle = '#080808';
    bCtx.lineWidth = 3.5;
    bCtx.beginPath();
    bCtx.moveTo(x, y);

    for (let seg = 0; seg < 9; seg++) {
      x += Math.sin(k * 12.3 + seg * 1.9) * 16;
      y += 12 + Math.cos(k * 7.1 + seg) * 6;
      rCtx.lineTo(x, y);
      bCtx.lineTo(x, y);
    }
    rCtx.stroke();
    bCtx.stroke();
  }

  TEXTURES.voidRuneRGB = new BABYLON.CanvasTexture(runeRGBCanvas);
  TEXTURES.voidRuneRGB.wrapS = TEXTURES.voidRuneRGB.wrapT = BABYLON.RepeatWrapping;

  TEXTURES.voidBump = new BABYLON.CanvasTexture(bumpCanvas);
  TEXTURES.voidBump.wrapS = TEXTURES.voidBump.wrapT = BABYLON.RepeatWrapping;

  // 2. Текстура R/G/B «звёздной пыли» для чёрного обсидианового пола (generateStardustFloorTexture из babylon_js_environment.html)
  const dustCanvas = document.createElement('canvas');
  dustCanvas.width = dustCanvas.height = size;
  const dCtx = dustCanvas.getContext('2d');
  dCtx.fillStyle = '#000000';
  dCtx.fillRect(0, 0, size, size);
  dCtx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < 1600; i++) {
    const x = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * size;
    const y = ((Math.sin(i * 78.2330) * 23421.6312) % 1 + 1) % 1 * size;
    const radius = (i % 7 === 0) ? 1.9 : 1.1;
    const ch = channelColors[i % 3];
    dCtx.fillStyle = ch;
    dCtx.beginPath();
    dCtx.arc(x, y, radius, 0, Math.PI * 2);
    dCtx.fill();
  }

  for (let v = 0; v < 10; v++) {
    let vx = (v * 53) % size;
    let vy = (v * 97) % size;
    dCtx.strokeStyle = channelColors[v % 3];
    dCtx.lineWidth = 1.4;
    dCtx.beginPath();
    dCtx.moveTo(vx, vy);
    for (let s = 0; s < 6; s++) {
      vx += Math.cos(v * 3.1 + s * 1.4) * 26;
      vy += Math.sin(v * 2.7 + s * 1.8) * 26;
      dCtx.lineTo(vx, vy);
    }
    dCtx.stroke();
  }

  TEXTURES.voidStardustRGB = new BABYLON.CanvasTexture(dustCanvas);
  TEXTURES.voidStardustRGB.wrapS = TEXTURES.voidStardustRGB.wrapT = BABYLON.RepeatWrapping;

  // 3. Многослойные текстуры стен и чёрного обсидианового пола для инстансированных блоков Башни Пустоты
  const voidRifts = generateCrackNetwork(size, 6, 6, 65, 65);

  const wallMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#0a0414';
    ctx.fillRect(0, 0, sz, sz);
    for (let r = 0; r < rows; r++) {
      const y = r * rowH;
      const shift = (r % 2) * (colW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + shift;
        const shade = (texSeededRandom(r * 19 + c * 31) * 14) | 0;
        ctx.fillStyle = `rgb(${18 + shade}, ${8 + (shade >> 1)}, ${28 + shade})`;
        ctx.fillRect(x + 2, y + 2, colW - 4, rowH - 4);
      }
    }
    for (let col = 0; col < 16; col++) {
      const cx = (col + 0.5) * (sz / 16);
      for (let row = 0; row < 20; row++) {
        if ((col + row * 3) % 4 === 0) continue;
        const cy = (row + 0.5) * (sz / 20);
        const palette = ['#8a2be2', '#a855f7', '#738cff'];
        const colStr = palette[(col * 7 + row * 13) % 3];
        ctx.strokeStyle = colStr;
        ctx.shadowColor = colStr;
        ctx.shadowBlur = 6;
        ctx.lineWidth = 2.2;
        drawRuneGlyph(ctx, cx, cy, 7.5, col * 31 + row * 17);
      }
    }
    ctx.shadowBlur = 0;
    for (const rift of voidRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 6 : 3.5, '#030008');
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 2.5 : 1.5, '#a855f7', '#8a2be2', 8);
    }
  }, size, 6, 3);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    for (let col = 0; col < 16; col++) {
      const cx = (col + 0.5) * (sz / 16);
      for (let row = 0; row < 20; row++) {
        if ((col + row * 3) % 4 === 0) continue;
        const cy = (row + 0.5) * (sz / 20);
        const palette = ['#8a2be2', '#a855f7', '#738cff'];
        const colStr = palette[(col * 7 + row * 13) % 3];
        ctx.strokeStyle = colStr;
        ctx.shadowColor = colStr;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 2.4;
        drawRuneGlyph(ctx, cx, cy, 7.5, col * 31 + row * 17);
      }
    }
  }, size, 6, 3);

  const wallNormalCvs = convertBumpToNormalCanvas(bumpCanvas, 3.0);
  const wallBump = new BABYLON.CanvasTexture(wallNormalCvs);
  wallBump.wrapS = wallBump.wrapT = BABYLON.RepeatWrapping;
  wallBump.repeat.set(6, 3);

  // Пол Башни Пустоты: глубокий чёрный обсидиановый камень (#06040a) с редкими блестящими вкраплениями
  const floorMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#06040a';
    ctx.fillRect(0, 0, sz, sz);

    // Мягкие зеркальные грани полированного обсидиана
    for (let i = 0; i < 24; i++) {
      const rx = texSeededRandom(i * 23 + 1) * sz;
      const ry = texSeededRandom(i * 41 + 7) * sz;
      const rad = 28 + texSeededRandom(i * 59) * 55;
      const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      g.addColorStop(0, i % 2 ? 'rgba(32, 16, 54, 0.35)' : 'rgba(14, 8, 26, 0.45)');
      g.addColorStop(1, 'rgba(6, 4, 10, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Тонкая фиолетовая фаска по кромке обсидиановой плиты
    ctx.strokeStyle = 'rgba(138, 43, 226, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, sz - 8, sz - 8);

    // Редкие тонкие прожилки звёздной пыли
    const sparkleColors = ['#a855f7', '#8cd0ff', '#ebb8ff', '#ffffff'];
    for (let v = 0; v < 6; v++) {
      let vx = ((v * 83) % sz);
      let vy = ((v * 127) % sz);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.28)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 5; s++) {
        vx += Math.cos(v * 3.1 + s * 1.4) * 22;
        vy += Math.sin(v * 2.7 + s * 1.8) * 22;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }

    // Редкие блестящие вкрапления звёздной пыли в чёрном обсидиане (как в референсе babylon_js_environment.html)
    for (let i = 0; i < 420; i++) {
      const sx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * sz;
      const sy = ((Math.sin(i * 78.2330) * 23421.6312) % 1 + 1) % 1 * sz;
      const r = (i % 9 === 0) ? 1.85 : 1.05;
      ctx.fillStyle = sparkleColors[i % sparkleColors.length];
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, size, 1, 1);

  const floorEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    const sparkleColors = ['#a855f7', '#8cd0ff', '#ebb8ff', '#ffffff'];
    for (let v = 0; v < 6; v++) {
      let vx = ((v * 83) % sz);
      let vy = ((v * 127) % sz);
      ctx.strokeStyle = 'rgba(138, 43, 226, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      for (let s = 0; s < 5; s++) {
        vx += Math.cos(v * 3.1 + s * 1.4) * 22;
        vy += Math.sin(v * 2.7 + s * 1.8) * 22;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 420; i++) {
      const sx = ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * sz;
      const sy = ((Math.sin(i * 78.2330) * 23421.6312) % 1 + 1) % 1 * sz;
      const r = (i % 9 === 0) ? 1.9 : 1.1;
      ctx.fillStyle = sparkleColors[i % sparkleColors.length];
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, size, 1, 1);

  const floorBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, sz, sz);
  }, 128, 1, 1);

  TOWER_WALL_TEXTURES.void = { map: wallMap, bump: wallBump, emissive: wallEmissive };
  TOWER_FLOOR_TEXTURES.void = { map: floorMap, bump: floorBump, emissive: floorEmissive };
})();

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

  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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
  const texture = new BABYLON.CanvasTexture(texCanvas);
  texture.wrapS = texture.wrapT = BABYLON.RepeatWrapping;
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
  const texture = new BABYLON.CanvasTexture(texCanvas);
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
  return new BABYLON.CanvasTexture(texCanvas);
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

  return new BABYLON.CanvasTexture(skyCanvas);
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

  return new BABYLON.CanvasTexture(texCanvas);
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

  return new BABYLON.CanvasTexture(texCanvas);
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

  return new BABYLON.CanvasTexture(texCanvas);
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

  return new BABYLON.CanvasTexture(texCanvas);
})();
