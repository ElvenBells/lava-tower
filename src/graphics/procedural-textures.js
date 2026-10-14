/* ==========================================================================
   Процедурные текстуры (генерируются один раз на старте и переиспользуются)
   ========================================================================== */

/**
 * Создаёт повторяющуюся текстуру на основе функции рисования на 2D-канвасе.
 * @param {(ctx: CanvasRenderingContext2D, size: number) => void} drawFn
 * @param {number} size
 * @returns {THREE.CanvasTexture}
 */
function createProceduralTexture(drawFn, size = 128) {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = size;
  drawFn(texCanvas.getContext('2d'), size);
  const texture = new THREE.CanvasTexture(texCanvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const TEXTURES = {};

// Кирпичная кладка внешних стен башни
const brickTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#4a3644';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0, row = 0; y < size; y += 16, row++) {
    ctx.fillStyle = row % 2 ? '#3d2c3a' : '#463344';
    for (let x = -16; x < size; x += 32) {
      ctx.fillRect(x + (row % 2 ? 16 : 0) + 1, y + 1, 30, 14);
    }
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(${(20 + Math.random() * 40) | 0},10,10,${Math.random() * 0.3})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
});
brickTexture.repeat.set(14, 14);

// Каменная плитка платформ и ступеней
const stoneTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#5c5a66';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#3e3c48';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 8 + Math.random() * 18, 0, 7);
    ctx.stroke();
  }
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
});
stoneTexture.repeat.set(6, 6);

// Поверхность лавы (Пепельная башня)
const lavaTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#ff5a00';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ffc23d' : '#c22500';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 14, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
});
lavaTexture.repeat.set(4, 4);

// Поверхность метели (Ледяная башня)
const iceLavaTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#bfe6ff';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#6fb4e8';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 14, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
});
iceLavaTexture.repeat.set(4, 4);

// Поверхность бездны (Башня Пустоты)
const voidLavaTexture = createProceduralTexture((ctx, size) => {
  ctx.fillStyle = '#2a0a4a';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#7a30c0' : '#12031f';
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 14, 0, 7);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = '#e8c8ff';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
});
voidLavaTexture.repeat.set(4, 4);

// Ядро Огарька
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
});

// Тёплое свечение (спрайты ореолов)
TEXTURES.glowWarm = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,244,180,1)');
  gradient.addColorStop(0.3, 'rgba(255,190,70,0.55)');
  gradient.addColorStop(1, 'rgba(255,120,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
});

// Угольное свечение
TEXTURES.coal = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,225,180,1)');
  gradient.addColorStop(0.28, 'rgba(255,70,25,0.6)');
  gradient.addColorStop(1, 'rgba(255,20,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
});

// Фиолетовое свечение Пустоты
TEXTURES.glowPurple = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(225,180,255,0.95)');
  gradient.addColorStop(0.35, 'rgba(150,70,255,0.5)');
  gradient.addColorStop(1, 'rgba(90,20,200,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
});

// Белое свечение (для тонируемых маркеров элит и развилок)
TEXTURES.glowWhite = createProceduralTexture((ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
});

// Ядро Пустотного Шипа и Кристальной Матки
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

// Кирпичные вставки Каменного Стража
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
});

// Светящиеся трещины Стража и Голема
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

// Внутренняя лава Обсидианового Прыгуна и ядер боссов
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
}, 256);
TEXTURES.leaperLava.repeat.set(2, 1);

/* ===== Текстуры боссов ===== */

// Трещины-жилы для эмиссии обугленного камня Голема
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

// Радиальные трещины пола (фаза 2 Голема)
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
      [7, 'rgba(255,80,10,0.85)', 16],
      [2.4, '#ffd8b0', 6]
    ]) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.shadowColor = '#ff5500';
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

// Рунный круг призыва Кристальной Матки
TEXTURES.wombRune = (() => {
  const texCanvas = document.createElement('canvas');
  texCanvas.width = texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(200,130,255,0.85)';
  ctx.shadowColor = '#a040ff';
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

// Текущие золотые жилы по телу Лавового Колосса
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

// Глаза-озёра кипящей магмы Колосса
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

// Золотые трещины фазы 2 Колосса (декали)
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

// Фоны для каждой из трёх башен
const BACKGROUND_TEXTURES = {
  ash: defaultBackgroundTexture,
  ice: createBackgroundGradientTexture(...TOWERS.ice.backgroundGradient),
  void: createBackgroundGradientTexture(...TOWERS.void.backgroundGradient)
};
