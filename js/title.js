const INK = '#2a2118';
const BRUSH_FALLBACK = '"STXingkai","华文行楷","Xingkai SC","行楷","KaiTi","楷体",cursive';

let brushFamily = '';
let brushTried = false;
let splashLogo = null;
let splashTried = false;

function ensureBrushFont() {
  if (brushTried) return;
  brushTried = true;
  const wxApi = globalThis.wx;
  if (!wxApi || typeof wxApi.loadFont !== 'function') return;
  try {
    const family = wxApi.loadFont('fonts/brush.ttf');
    if (family) brushFamily = family;
  } catch (err) {
    brushFamily = '';
  }
}

function titleFace(size) {
  ensureBrushFont();
  const family = brushFamily ? `"${brushFamily}",${BRUSH_FALLBACK}` : BRUSH_FALLBACK;
  return `${Math.floor(size)}px ${family}`;
}

function ensureSplashLogo() {
  if (splashLogo || splashTried) return splashLogo;
  splashTried = true;
  const wxApi = globalThis.wx;
  const img = wxApi && typeof wxApi.createImage === 'function'
    ? wxApi.createImage()
    : (typeof Image === 'function' ? new Image() : null);
  if (!img) return null;
  img.onload = () => { splashLogo = img; };
  img.src = 'logo.png';
  return null;
}

function drawSplashArt(ctx, w, top, bottom) {
  const img = ensureSplashLogo();
  if (!img || !img.width || !img.height) return;
  const areaH = Math.max(40, bottom - top);
  const maxW = Math.min(w * 0.86, 520);
  const scale = Math.min(maxW / img.width, areaH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, top + (areaH - dh) / 2, dw, dh);
}

function drawTitle(ctx, w, h, safeTop) {
  const top = Math.max(0, safeTop || 0);
  ctx.fillStyle = '#f3e7d4';
  ctx.fillRect(0, 0, w, h);
  drawTitleMountains(ctx, w, top);

  const mid = top + Math.max(36, h * 0.06);
  const iconR = Math.max(16, h * 0.028);
  drawTitleCoin(ctx, 18 + iconR, mid, iconR);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = titleFace(h * 0.04);
  ctx.fillText('100', 26 + iconR * 2, mid);
  drawTitleHeart(ctx, w - 18 - iconR, mid, iconR * 0.92, '#d23b3b');
  ctx.textAlign = 'right';
  ctx.fillText('20', w - 26 - iconR * 2, mid);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = titleFace(Math.min(w * 0.086, 66));
  ctx.fillText('守住粮仓 十波来袭', w / 2, top + h * 0.15);

  const bw = Math.min(w * 0.72, 320);
  const bh = Math.max(64, h * 0.09);
  const bx = (w - bw) / 2;
  const by = h * 0.6;
  ctx.fillStyle = '#fbf7ef';
  roundRect(ctx, bx, by, bw, bh, 8);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawSplashArt(ctx, w, top + h * 0.19, by - 16);
  ctx.fillStyle = INK;
  ctx.font = titleFace(bh * 0.46);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('开始游戏', w / 2, by + bh / 2);

  return { x: bx, y: by, w: bw, h: bh };
}

function drawTitleMountains(ctx, w, top) {
  ctx.save();
  ctx.strokeStyle = 'rgba(70, 55, 40, 0.35)';
  ctx.lineWidth = 1.5;
  const y = top + 8;
  ctx.beginPath();
  ctx.moveTo(8, y + 36);
  ctx.lineTo(w * 0.16, y + 10);
  ctx.lineTo(w * 0.3, y + 32);
  ctx.lineTo(w * 0.46, y + 6);
  ctx.lineTo(w * 0.62, y + 30);
  ctx.lineTo(w * 0.8, y + 12);
  ctx.lineTo(w - 8, y + 34);
  ctx.stroke();
  ctx.restore();
}

function drawTitleCoin(ctx, x, y, r) {
  ctx.save();
  ctx.fillStyle = '#d4a017';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = titleFace(r * 1.15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('金', x, y + r * 0.04);
  ctx.restore();
}

function drawTitleHeart(ctx, x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.4);
  ctx.bezierCurveTo(-r * 1.05, -r * 0.35, -r * 0.35, -r * 1.05, 0, -r * 0.25);
  ctx.bezierCurveTo(r * 0.35, -r * 1.05, r * 1.05, -r * 0.35, 0, r * 0.4);
  ctx.fill();
  ctx.restore();
}

function drawTitleField(ctx, cx, cy, w, h) {
  const cols = 4;
  const rows = 2;
  const cell = Math.min(w / cols, h / rows);
  const x0 = cx - (cell * cols) / 2;
  const y0 = cy - (cell * rows) / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = x0 + col * cell;
      const y = y0 + row * cell;
      const stone = row === 1 && (col === 1 || col === 2);
      ctx.fillStyle = stone ? '#d5c4ab' : '#8fbfb4';
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, cell * cols, cell * rows);
}

function drawScarecrowWord(ctx, x, y, size) {
  const now = Date.now() / 1000;
  const cycle = now % 1.5;
  const k = cycle < 0.3 ? 1 - cycle / 0.3 : 0;
  const chars = ['稻', '草', '人'];
  const gap = size * 1.02;
  ctx.save();
  ctx.translate(x + k * size * 0.28, y - k * size * 0.06);
  ctx.rotate(-0.03 + k * 0.16);
  chars.forEach((ch, i) => {
    const bob = Math.sin(now * 3.2 + i * 0.8) * size * 0.05;
    const wide = 1 + (i === 1 ? k * 0.18 : 0);
    const tall = Math.max(0.72, 1 - (i === 1 ? k * 0.16 : 0));
    ctx.save();
    ctx.translate((i - 1) * gap, bob);
    ctx.scale(wide, tall);
    ctx.fillStyle = INK;
    ctx.font = titleFace(size);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.28;
    ctx.fillText(ch, 1.4, 1.6);
    ctx.globalAlpha = 1;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  });
  if (k > 0.05) {
    ctx.strokeStyle = INK;
    ctx.globalAlpha = k;
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(size * 0.55, size * 0.05);
    ctx.lineTo(size * (0.9 + k * 0.7), -size * 0.15);
    ctx.stroke();
  }
  ctx.restore();
}

function hitStart(x, y, button) {
  if (!button) return false;
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

function drawLoud(ctx, text, x, y, size, fill, stroke) {
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(4, size * 0.12);
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawChip(ctx, x, y, w, h, paint) {
  ctx.fillStyle = '#f4e6c8';
  ctx.strokeStyle = '#5c4632';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
  paint();
}

function drawPill(ctx, x, y, w, h, text) {
  ctx.fillStyle = '#5c4632';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = '#f6e7c4';
  ctx.font = `bold ${Math.floor(h * 0.46)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
}

function drawStars(ctx, cx, cy, n) {
  for (let i = 0; i < n; i++) {
    const x = cx + (i - (n - 1) / 2) * 28;
    ctx.fillStyle = '#e2b143';
    ctx.strokeStyle = '#8a6a20';
    ctx.lineWidth = 1.5;
    star(ctx, x, cy, 11);
    ctx.fill();
    ctx.stroke();
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const b = a + Math.PI / 5;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    ctx.lineTo(x + Math.cos(b) * r * 0.45, y + Math.sin(b) * r * 0.45);
  }
  ctx.closePath();
}

function drawBoard(ctx, cx, cy, w, h) {
  ctx.fillStyle = 'rgba(90, 120, 60, 0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + h * 0.55, w * 0.62, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3e2c4';
  ctx.strokeStyle = '#6b5344';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, cy);
  ctx.lineTo(cx + w / 2, cy);
  ctx.lineTo(cx + w * 0.38, cy + h);
  ctx.lineTo(cx - w * 0.38, cy + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let i = 1; i < 4; i++) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2 + w * t, cy);
    ctx.lineTo(cx - w * 0.38 + w * 0.76 * t, cy + h);
    ctx.stroke();
  }
}

function ink(ctx, width) {
  ctx.strokeStyle = '#3d2a22';
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function drawSwayingScarecrow(ctx, x, y, s) {
  const sway = Math.sin(Date.now() / 320) * 0.22;
  const pivotY = y + s * 0.32;
  ctx.save();
  ctx.translate(x, pivotY);
  ctx.rotate(sway);
  ctx.translate(-x, -pivotY);
  drawCartoonScarecrow(ctx, x, y, s);
  ctx.restore();
}

function drawCartoonScarecrow(ctx, x, y, s) {
  ctx.save();
  ink(ctx, Math.max(3, s * 0.06));
  ctx.strokeStyle = '#6b3e22';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.32);
  ctx.lineTo(x, y + s * 0.02);
  ctx.moveTo(x - s * 0.28, y + s * 0.08);
  ctx.lineTo(x + s * 0.28, y + s * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#f2d56b';
  ctx.beginPath();
  ctx.arc(x, y - s * 0.08, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ink(ctx, Math.max(2, s * 0.045));
  ctx.stroke();
  ctx.fillStyle = '#e23b32';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.24, y - s * 0.16);
  ctx.quadraticCurveTo(x, y - s * 0.48, x + s * 0.24, y - s * 0.16);
  ctx.quadraticCurveTo(x, y - s * 0.22, x - s * 0.24, y - s * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - s * 0.07, y - s * 0.1, s * 0.055, 0, Math.PI * 2);
  ctx.arc(x + s * 0.07, y - s * 0.1, s * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(x - s * 0.06, y - s * 0.09, s * 0.028, 0, Math.PI * 2);
  ctx.arc(x + s * 0.08, y - s * 0.09, s * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c47b2d';
  ctx.lineWidth = Math.max(2, s * 0.04);
  ctx.beginPath();
  ctx.arc(x, y - s * 0.01, s * 0.06, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.fillStyle = '#f3b4a8';
  ctx.beginPath();
  ctx.arc(x - s * 0.14, y - s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.arc(x + s * 0.14, y - s * 0.04, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShed(ctx, x, y) {
  ctx.save();
  ink(ctx, 3);
  ctx.fillStyle = '#f6e2b8';
  roundRect(ctx, x - 26, y - 6, 52, 32, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e23b32';
  ctx.beginPath();
  ctx.moveTo(x - 32, y - 4);
  ctx.quadraticCurveTo(x, y - 36, x + 32, y - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#6b3e22';
  roundRect(ctx, x - 7, y + 6, 14, 18, 3);
  ctx.fill();
  ctx.fillStyle = '#7ec8ea';
  ctx.beginPath();
  ctx.arc(x + 14, y + 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBasket(ctx, x, y) {
  ctx.save();
  ink(ctx, 3);
  ctx.fillStyle = '#e39a3c';
  ctx.beginPath();
  ctx.moveTo(x - 22, y - 4);
  ctx.quadraticCurveTo(x, y + 8, x + 22, y - 4);
  ctx.lineTo(x + 16, y + 22);
  ctx.quadraticCurveTo(x, y + 28, x - 16, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7ebd4a';
  ctx.beginPath();
  ctx.arc(x - 8, y - 10, 10, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 12, 11, 0, Math.PI * 2);
  ctx.arc(x, y - 16, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

module.exports = { drawTitle, hitStart };
