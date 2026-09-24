// js/render.js
const { positionAt } = require('./path');
const { stats } = require('./tower');

function computeLayout(canvas, config) {
  const w = canvas.width;
  const h = canvas.height;
  const hudH = Math.round(h * 0.08);
  const panelH = Math.round(h * 0.14);
  const fieldH = h - hudH - panelH;
  const cell = Math.floor(Math.min(w / config.GRID_COLS, fieldH / config.GRID_ROWS));
  const offsetX = Math.floor((w - cell * config.GRID_COLS) / 2);
  const offsetY = hudH + Math.floor((fieldH - cell * config.GRID_ROWS) / 2);
  return { w, h, hudH, panelH, cell, offsetX, offsetY };
}

function cellToPixel(layout, col, row) {
  return { x: layout.offsetX + col * layout.cell, y: layout.offsetY + row * layout.cell };
}

function pixelToCell(layout, px, py) {
  return {
    col: Math.floor((px - layout.offsetX) / layout.cell),
    row: Math.floor((py - layout.offsetY) / layout.cell),
  };
}

function draw(ctx, game, layout, uiState) {
  const { config } = game;
  const cell = layout.cell;

  // 背景与田地
  ctx.fillStyle = '#8fbf5a';
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = '#7ab648';
  ctx.fillRect(layout.offsetX, layout.offsetY, cell * config.GRID_COLS, cell * config.GRID_ROWS);

  // 土路
  ctx.fillStyle = '#d9b382';
  for (const key of game.blocked) {
    const [col, row] = key.split(',').map(Number);
    const p = cellToPixel(layout, col, row);
    ctx.fillRect(p.x, p.y, cell, cell);
  }

  // 粮仓（路径最后一格旁的标识）
  const granary = cellToPixel(layout, 6, 11);
  ctx.font = `${Math.floor(cell * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏠', granary.x + cell / 2, granary.y + cell / 2);

  // 选中塔的范围圈
  if (uiState.selected) {
    const t = game.towerAt(uiState.selected.col, uiState.selected.row);
    if (t) {
      const s = stats(t, config);
      const c = cellToPixel(layout, t.col, t.row);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x + cell / 2, c.y + cell / 2, s.range * cell, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 塔
  for (const t of game.towers) {
    const p = cellToPixel(layout, t.col, t.row);
    ctx.font = `${Math.floor(cell * 0.7)}px sans-serif`;
    ctx.fillText(config.TOWERS[t.type].emoji, p.x + cell / 2, p.y + cell / 2);
    // 等级点
    ctx.fillStyle = '#fff';
    for (let i = 0; i < t.level; i++) {
      ctx.fillRect(p.x + 4 + i * 7, p.y + cell - 7, 5, 5);
    }
  }

  // 害虫与血条
  for (const e of game.enemies) {
    const pos = positionAt(game.path, e.distance);
    const px = layout.offsetX + pos.x * cell;
    const py = layout.offsetY + pos.y * cell;
    ctx.font = `${Math.floor(cell * 0.6)}px sans-serif`;
    ctx.fillText(e.emoji, px, py);
    const bw = cell * 0.6;
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(px - bw / 2, py - cell * 0.42, bw, 4);
    ctx.fillStyle = ratio > 0.4 ? '#3ec76b' : '#e74c3c';
    ctx.fillRect(px - bw / 2, py - cell * 0.42, bw * ratio, 4);
  }

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, layout.w, layout.hudH);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(layout.hudH * 0.38)}px sans-serif`;
  ctx.textAlign = 'left';
  const waveText = game.waveIndex < 0 ? 1 : game.waveIndex + 1;
  ctx.fillText(`💰 ${game.gold}`, 12, layout.hudH / 2);
  ctx.fillText(`❤️ ${game.hp}`, layout.w * 0.38, layout.hudH / 2);
  ctx.fillText(`🌊 ${Math.min(waveText, config.WAVES.length)}/${config.WAVES.length}`, layout.w * 0.68, layout.hudH / 2);

  // 准备倒计时
  if (game.state === 'prep') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `${Math.floor(cell * 0.5)}px sans-serif`;
    ctx.fillText(`第 ${game.waveIndex + 2} 波来袭：${Math.ceil(game.restTimer)}s`, layout.w / 2, layout.offsetY - cell * 0.35);
  }

  // toast
  if (uiState.toast && uiState.toast.until > Date.now()) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `${Math.floor(cell * 0.42)}px sans-serif`;
    ctx.fillText(uiState.toast.text, layout.w / 2, layout.h - layout.panelH - cell * 0.4);
  }
}

module.exports = { computeLayout, cellToPixel, pixelToCell, draw };
