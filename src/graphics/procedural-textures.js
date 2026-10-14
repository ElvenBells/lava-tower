/* ==========================================================================
   Процедурные текстуры (генерируются один раз на старте и переиспользуются):
   многослойные карты цвета (map), рельефа (bumpMap) и свечения (emissiveMap)
   для Пепельной башни, Ледяной башни и Башни Пустоты, а также текстуры мобов/боссов
   ========================================================================== */

/**
 * Создаёт повторяющуюся текстуру на основе функции рисования на 2D-канвасе.
 * @param {(ctx: CanvasRenderingContext2D, size: number) => void} drawFn
 * @param {number} size
 * @param {number} repeatX
 * @param {number} repeatY
 * @returns {THREE.CanvasTexture}
 */
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

/* ---------- 1. Многослойные текстуры стен и полов для 3 башен ---------- */

const TOWER_WALL_TEXTURES = {};
const TOWER_FLOOR_TEXTURES = {};

/**
 * Рисует ломаную линию (трещину или жилу) с поддержкой бесшовного повтора по краям текстуры.
 */
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

/**
 * Генерирует набор органических ветвящихся трещин для бесшовной текстуры.
 */
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

// ==================== I. ПЕПЕЛЬНАЯ БАШНЯ (ASH) ====================
(function buildAshTowerTextures() {
  const size = 512;
  const wallCracks = generateCrackNetwork(size, 9, 8, 52, 64);

  const wallMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#18070a';
    ctx.fillRect(0, 0, sz, sz);

    const rowH = 20;
    for (let y = 0, row = 0; y < sz; y += rowH, row++) {
      let x = row % 2 ? -20 : 0;
      while (x < sz) {
        const brickW = 38 + (((Math.sin(row * 7.3 + x * 0.17) + 1) * 10) | 0);
        const r = 56 + (((Math.cos(row * 3.1 + x * 0.07) + 1) * 24) | 0);
        const g = 16 + (((Math.sin(row * 5.7 + x * 0.09) + 1) * 9) | 0);
        const b = 20 + (((Math.cos(row * 2.3 + x * 0.08) + 1) * 11) | 0);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 2, y + 2, brickW - 4, rowH - 4);

        ctx.fillStyle = 'rgba(145,45,38,0.32)';
        ctx.fillRect(x + 2, y + 2, brickW - 4, 3);
        ctx.fillStyle = 'rgba(10,2,4,0.7)';
        ctx.fillRect(x + 2, y + rowH - 5, brickW - 4, 3);

        x += brickW;
      }
    }

    for (let i = 0; i < 450; i++) {
      const rx = Math.random() * sz;
      const ry = Math.random() * sz;
      ctx.fillStyle =
        Math.random() < 0.55
          ? `rgba(12,3,5,${0.18 + Math.random() * 0.25})`
          : `rgba(115,28,16,${0.12 + Math.random() * 0.18})`;
      ctx.beginPath();
      ctx.arc(rx, ry, 3 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const crack of wallCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 11 : 6, 'rgba(16,4,4,0.88)');
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5.5 : 3.2, '#ff6810', '#ff3300', 10);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 2.2 : 1.2, '#ffe490');
    }
  }, size, 5, 4);

  const wallBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, sz, sz);
    const rowH = 20;
    for (let y = 0, row = 0; y < sz; y += rowH, row++) {
      let x = row % 2 ? -20 : 0;
      while (x < sz) {
        const brickW = 38 + (((Math.sin(row * 7.3 + x * 0.17) + 1) * 10) | 0);
        const shade = 150 + (((Math.cos(row * 4.1 + x * 0.09) + 1) * 35) | 0);
        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(x + 2, y + 2, brickW - 4, rowH - 4);
        x += brickW;
      }
    }
    for (const crack of wallCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 9 : 5, '#050505');
    }
  }, size, 5, 4);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    for (const crack of wallCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 9 : 5, 'rgba(215,38,0,0.8)', '#ff2a00', 16);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 4.2 : 2.4, '#ff7b18', '#ff6600', 10);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.8 : 1.0, '#fff0a8');
    }
  }, size, 5, 4);

  const floorVeins = generateCrackNetwork(size, 6, 6, 75, 75);

  const floorMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#26181b';
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 65; i++) {
      const rx = Math.random() * sz;
      const ry = Math.random() * sz;
      const rad = 18 + Math.random() * 55;
      const g = ctx.createRadialGradient(rx, ry, 2, rx, ry, rad);
      g.addColorStop(0, i % 2 ? 'rgba(68,38,42,0.45)' : 'rgba(22,12,15,0.55)');
      g.addColorStop(1, 'rgba(38,24,27,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(85,48,46,0.55)';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, sz - 12, sz - 12);
    ctx.strokeStyle = 'rgba(14,6,8,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, sz - 4, sz - 4);

    for (const vein of floorVeins) {
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 9 : 5, 'rgba(16,5,6,0.9)');
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 4.0 : 2.2, '#d84208', '#ff4400', 8);
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 1.5 : 0.9, '#ffbe55');
    }
  }, size, 1, 1);

  const floorBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#989898';
    ctx.fillRect(0, 0, sz, sz);
    for (let i = 0; i < 420; i++) {
      const v = i % 2 ? 165 : 55;
      ctx.fillStyle = `rgba(${v},${v},${v},0.22)`;
      ctx.fillRect(Math.random() * sz, Math.random() * sz, 4 + Math.random() * 10, 4 + Math.random() * 10);
    }
    ctx.strokeStyle = '#dcdcdc';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, sz - 12, sz - 12);
    for (const vein of floorVeins) {
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 6 : 3.5, '#181818');
    }
  }, size, 1, 1);

  const floorEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    for (const vein of floorVeins) {
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 6.5 : 3.5, 'rgba(175,32,0,0.6)', '#ff3300', 10);
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 2.4 : 1.4, '#ff7818');
      drawSeamlessCrack(ctx, sz, vein.pts, vein.main ? 1.0 : 0.6, '#ffd878');
    }
  }, size, 1, 1);

  TOWER_WALL_TEXTURES.ash = { map: wallMap, bump: wallBump, emissive: wallEmissive };
  TOWER_FLOOR_TEXTURES.ash = { map: floorMap, bump: floorBump, emissive: floorEmissive };
})();

// ==================== II. ЛЕДЯНАЯ БАШНЯ (ICE) ====================
(function buildIceTowerTextures() {
  const size = 512;
  const frostCracks = generateCrackNetwork(size, 8, 6, 62, 62);

  function drawGothicFrozenFigure(ctx, cx, cy, scale, tilt, hasStaff) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.scale(scale, scale);

    const halo = ctx.createRadialGradient(0, 0, 6, 0, 0, 82);
    halo.addColorStop(0, 'rgba(160,230,255,0.35)');
    halo.addColorStop(0.5, 'rgba(20,65,110,0.45)');
    halo.addColorStop(1, 'rgba(15,45,80,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.ellipse(0, 0, 64, 92, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(8,24,46,0.88)';
    ctx.shadowColor = 'rgba(120,210,255,0.6)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, -74);
    ctx.lineTo(15, -52);
    ctx.lineTo(12, -34);
    ctx.lineTo(-12, -34);
    ctx.lineTo(-15, -52);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-14, -36);
    ctx.lineTo(-34, -26);
    ctx.lineTo(-28, 12);
    ctx.lineTo(-36, 72);
    ctx.lineTo(-10, 64);
    ctx.lineTo(0, 32);
    ctx.lineTo(12, 68);
    ctx.lineTo(34, 72);
    ctx.lineTo(26, 10);
    ctx.lineTo(34, -26);
    ctx.lineTo(14, -36);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(12,32,58,0.92)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    if (hasStaff) {
      ctx.moveTo(22, -64);
      ctx.lineTo(14, 74);
    } else {
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 76);
      ctx.moveTo(-16, 2);
      ctx.lineTo(16, 2);
    }
    ctx.stroke();

    const heart = ctx.createRadialGradient(0, -12, 1, 0, -12, 16);
    heart.addColorStop(0, 'rgba(220,250,255,0.9)');
    heart.addColorStop(0.5, 'rgba(80,190,255,0.5)');
    heart.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = heart;
    ctx.beginPath();
    ctx.arc(0, -12, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(215,248,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, -28);
    ctx.lineTo(38, 14);
    ctx.moveTo(-30, 34);
    ctx.lineTo(35, -18);
    ctx.stroke();

    ctx.restore();
  }

  const wallMap = createProceduralTexture((ctx, sz) => {
    const bg = ctx.createLinearGradient(0, 0, sz, sz);
    bg.addColorStop(0, '#163d66');
    bg.addColorStop(0.4, '#265f96');
    bg.addColorStop(0.75, '#1b4b7a');
    bg.addColorStop(1, '#3478b2');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 32; i++) {
      ctx.save();
      ctx.translate(Math.random() * sz, Math.random() * sz);
      ctx.rotate((Math.random() - 0.5) * 0.6);
      ctx.fillStyle =
        i % 2 === 0 ? 'rgba(150,220,255,0.14)' : 'rgba(10,32,60,0.22)';
      ctx.beginPath();
      ctx.moveTo(-60, -30);
      ctx.lineTo(50, -40);
      ctx.lineTo(70, 35);
      ctx.lineTo(-40, 45);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawGothicFrozenFigure(ctx, 115, 165, 0.95, -0.06, true);
    drawGothicFrozenFigure(ctx, 375, 145, 0.88, 0.05, false);
    drawGothicFrozenFigure(ctx, 245, 395, 0.92, -0.04, false);

    for (const crack of frostCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5.5 : 3.0, 'rgba(135,215,255,0.6)', '#70d8ff', 8);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.8 : 1.0, '#f4fcff');
    }
  }, size, 4, 3);

  const wallBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, sz, sz);
    for (const crack of frostCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5 : 3, '#202020');
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.6 : 1, '#ffffff');
    }
  }, size, 4, 3);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#06182e';
    ctx.fillRect(0, 0, sz, sz);
    for (const [sx, sy] of [
      [115, 165],
      [375, 145],
      [245, 395]
    ]) {
      const g = ctx.createRadialGradient(sx, sy, 6, sx, sy, 75);
      g.addColorStop(0, 'rgba(85,195,255,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - 80, sy - 80, 160, 160);
    }
    for (const crack of frostCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5 : 2.8, 'rgba(75,195,255,0.65)', '#50c8ff', 10);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.5 : 0.9, '#ebfbff');
    }
  }, size, 4, 3);

  const floorCracks = generateCrackNetwork(size, 5, 5, 80, 80);

  const floorMap = createProceduralTexture((ctx, sz) => {
    const grad = ctx.createRadialGradient(sz / 2, sz / 2, 20, sz / 2, sz / 2, sz * 0.72);
    grad.addColorStop(0, '#bce6ff');
    grad.addColorStop(0.55, '#8ec8f2');
    grad.addColorStop(1, '#68a8dc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, sz, sz);

    const cx = sz / 2;
    const cy = sz / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(238,252,255,0.68)';
    ctx.lineWidth = 2.5;
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      const len = k % 2 === 0 ? 185 : 135;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
      for (const d of [65, 115, 155]) {
        if (d > len) continue;
        const bx = Math.cos(ang) * d;
        const by = Math.sin(ang) * d;
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ang + 0.55) * 28, by + Math.sin(ang + 0.55) * 28);
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(ang - 0.55) * 28, by + Math.sin(ang - 0.55) * 28);
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(235,250,255,0.75)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, sz - 16, sz - 16);

    for (const crack of floorCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 6 : 3.5, 'rgba(30,85,140,0.65)');
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 2.2 : 1.2, '#ffffff', '#a8e8ff', 8);
    }
  }, size, 1, 1);

  const floorBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, sz - 16, sz - 16);
    for (const crack of floorCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 4.5 : 2.5, '#202020');
    }
  }, size, 1, 1);

  const floorEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#071a30';
    ctx.fillRect(0, 0, sz, sz);
    for (const crack of floorCracks) {
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 5 : 3, 'rgba(85,205,255,0.65)', '#60d0ff', 10);
      drawSeamlessCrack(ctx, sz, crack.pts, crack.main ? 1.8 : 1.0, '#ebfbff');
    }
  }, size, 1, 1);

  TOWER_WALL_TEXTURES.ice = { map: wallMap, bump: wallBump, emissive: wallEmissive };
  TOWER_FLOOR_TEXTURES.ice = { map: floorMap, bump: floorBump, emissive: floorEmissive };
})();

// ==================== III. БАШНЯ ПУСТОТЫ (VOID) ====================
(function buildVoidTowerTextures() {
  const size = 512;
  const voidRifts = generateCrackNetwork(size, 7, 6, 65, 65);

  function drawArcaneRune(ctx, cx, cy, runeHeight, glyphIndex) {
    const w = runeHeight * 0.52;
    const h = runeHeight;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.5);
    ctx.lineTo(0, h * 0.5);

    const pattern = glyphIndex % 6;
    if (pattern === 0) {
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w, -h * 0.15);
      ctx.lineTo(0, h * 0.1);
      ctx.moveTo(0, -h * 0.05);
      ctx.lineTo(w * 0.85, h * 0.35);
    } else if (pattern === 1) {
      ctx.moveTo(-w * 0.8, -h * 0.35);
      ctx.lineTo(w * 0.8, h * 0.15);
      ctx.moveTo(w * 0.8, -h * 0.35);
      ctx.lineTo(-w * 0.8, h * 0.15);
    } else if (pattern === 2) {
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.9, -h * 0.2);
      ctx.moveTo(0, -h * 0.1);
      ctx.lineTo(w * 0.75, h * 0.15);
      ctx.moveTo(-w * 0.7, h * 0.3);
      ctx.lineTo(w * 0.7, h * 0.3);
    } else if (pattern === 3) {
      ctx.moveTo(0, -h * 0.4);
      ctx.lineTo(-w * 0.85, -h * 0.1);
      ctx.lineTo(0, h * 0.2);
      ctx.lineTo(w * 0.85, -h * 0.1);
      ctx.closePath();
    } else if (pattern === 4) {
      ctx.moveTo(-w * 0.8, -h * 0.45);
      ctx.lineTo(0, -h * 0.1);
      ctx.lineTo(w * 0.8, -h * 0.45);
      ctx.moveTo(-w * 0.6, h * 0.2);
      ctx.lineTo(w * 0.6, h * 0.45);
    } else {
      ctx.moveTo(0, -h * 0.45);
      ctx.lineTo(w * 0.8, -h * 0.45);
      ctx.lineTo(-w * 0.7, h * 0.05);
      ctx.lineTo(w * 0.8, h * 0.45);
    }
    ctx.stroke();
    ctx.restore();
  }

  const wallMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#0a0414';
    ctx.fillRect(0, 0, sz, sz);

    const rowH = 24;
    for (let y = 0, row = 0; y < sz; y += rowH, row++) {
      let x = row % 2 ? -24 : 0;
      while (x < sz) {
        const w = 44 + (((Math.sin(row * 5.1 + x * 0.14) + 1) * 14) | 0);
        const r = 22 + (((Math.cos(row * 3.7 + x * 0.1) + 1) * 14) | 0);
        const g = 10 + (((Math.sin(row * 2.9 + x * 0.08) + 1) * 8) | 0);
        const b = 42 + (((Math.cos(row * 4.3 + x * 0.12) + 1) * 22) | 0);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x + 2, y + 2, w - 4, rowH - 4);
        ctx.strokeStyle = 'rgba(120,60,205,0.22)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 3, y + 3, w - 6, rowH - 6);
        x += w;
      }
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const colX of [96, 352]) {
      ctx.fillStyle = 'rgba(8,2,18,0.85)';
      ctx.fillRect(colX - 22, 0, 44, sz);
      for (let ry = 28, idx = 0; ry < sz; ry += 52, idx++) {
        ctx.strokeStyle = '#b450ff';
        ctx.shadowColor = '#9b30ff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 3.2;
        drawArcaneRune(ctx, colX, ry, 26, idx + colX);
        ctx.strokeStyle = '#f2d8ff';
        ctx.shadowBlur = 4;
        ctx.lineWidth = 1.3;
        drawArcaneRune(ctx, colX, ry, 26, idx + colX);
      }
    }
    ctx.shadowBlur = 0;

    for (const rift of voidRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 8 : 4.5, '#030008');
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 3.5 : 2.0, '#b040ff', '#9020ff', 10);
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 1.3 : 0.8, '#f2d2ff');
    }
  }, size, 4, 3);

  const wallBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, sz, sz);
    const rowH = 24;
    for (let y = 0, row = 0; y < sz; y += rowH, row++) {
      let x = row % 2 ? -24 : 0;
      while (x < sz) {
        const w = 44 + (((Math.sin(row * 5.1 + x * 0.14) + 1) * 14) | 0);
        ctx.fillStyle = '#a8a8a8';
        ctx.fillRect(x + 2, y + 2, w - 4, rowH - 4);
        x += w;
      }
    }
    for (const rift of voidRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 6 : 3.5, '#050505');
    }
  }, size, 4, 3);

  const wallEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    for (const colX of [96, 352]) {
      for (let ry = 28, idx = 0; ry < sz; ry += 52, idx++) {
        ctx.strokeStyle = '#b848ff';
        ctx.shadowColor = '#a028ff';
        ctx.shadowBlur = 12;
        ctx.lineWidth = 3.5;
        drawArcaneRune(ctx, colX, ry, 26, idx + colX);
        ctx.strokeStyle = '#f5ddff';
        ctx.lineWidth = 1.4;
        drawArcaneRune(ctx, colX, ry, 26, idx + colX);
      }
    }
    ctx.shadowBlur = 0;
    for (const rift of voidRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 5.5 : 3.0, 'rgba(165,45,255,0.75)', '#a030ff', 14);
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 1.6 : 0.9, '#f0c8ff');
    }
  }, size, 4, 3);

  const floorRifts = generateCrackNetwork(size, 5, 5, 78, 78);

  const floorMap = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#080311';
    ctx.fillRect(0, 0, sz, sz);

    for (let i = 0; i < 38; i++) {
      const rx = Math.random() * sz;
      const ry = Math.random() * sz;
      const rad = 25 + Math.random() * 65;
      const g = ctx.createRadialGradient(rx, ry, 4, rx, ry, rad);
      g.addColorStop(0, i % 2 ? 'rgba(85,28,150,0.38)' : 'rgba(38,12,78,0.45)');
      g.addColorStop(1, 'rgba(8,3,17,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(rx, ry, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(145,65,235,0.45)';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, sz - 12, sz - 12);

    for (const rift of floorRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 6 : 3.5, '#020005');
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 2.6 : 1.5, '#a838ff', '#8820e0', 8);
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 1.0 : 0.6, '#ecc8ff');
    }

    for (let i = 0; i < 240; i++) {
      const sx = Math.random() * sz;
      const sy = Math.random() * sz;
      const r = 0.8 + Math.random() * 2.2;
      ctx.fillStyle =
        i % 4 === 0
          ? '#ffffff'
          : i % 3 === 0
            ? '#e5b8ff'
            : i % 2 === 0
              ? '#98d8ff'
              : '#b868ff';
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }, size, 1, 1);

  const floorBump = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, sz, sz);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, sz - 12, sz - 12);
    for (const rift of floorRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 5 : 3, '#101010');
    }
  }, size, 1, 1);

  const floorEmissive = createProceduralTexture((ctx, sz) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, sz, sz);
    for (const rift of floorRifts) {
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 4.5 : 2.5, 'rgba(155,45,255,0.65)', '#9b30ff', 10);
      drawSeamlessCrack(ctx, sz, rift.pts, rift.main ? 1.4 : 0.8, '#eed0ff');
    }
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : '#d088ff';
      ctx.fillRect(Math.random() * sz, Math.random() * sz, 2.2, 2.2);
    }
  }, size, 1, 1);

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
