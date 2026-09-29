// js/render.js
const { positionAt } = require('./path');
const { stats, inRange } = require('./tower');

function computeLayout(canvas, config, safeTop) {
  const w = canvas.width;
  const h = canvas.height;
  const notch = Math.max(0, Math.round(safeTop || 0));
  const hudH = Math.max(64, Math.round((h - notch) * 0.09));
  const panelH = Math.max(112, Math.round((h - notch) * 0.12));
  const seam = Math.max(12, Math.round((h - notch) * 0.012));
  const fieldH = h - notch - hudH - panelH - seam;
  const cell = Math.floor(Math.min(w / config.GRID_COLS, fieldH / config.GRID_ROWS));
  const offsetX = Math.floor((w - cell * config.GRID_COLS) / 2);
  const gridH = cell * config.GRID_ROWS;
  const slack = Math.max(0, fieldH - gridH);
  const topGap = Math.floor(slack / 2);
  const offsetY = notch + topGap + hudH;
  const panelY = offsetY + gridH + seam;
  return { w, h, notch, hudH, panelH, panelY, cell, offsetX, offsetY };
}

function towerTargets(t, game) {
  const s = stats(t, game.config);
  const list = [];
  for (const e of game.enemies) {
    if (!e.alive) continue;
    const pos = positionAt(game.path, e.distance);
    if (!inRange(t, s.range, pos)) continue;
    list.push({ x: pos.x, y: pos.y, distance: e.distance });
  }
  list.sort((a, b) => b.distance - a.distance);
  return list;
}

const INK_FONT = '"KaiTi","STKaiti","楷体",serif';
const INK = '#2a2118';
const TOWER_CHAR = { sticky: '粘', scarecrow: '草', windmill: '风', web: '网' };
const PEST_CHAR = { aphid: '蚜', mouse: '鼠', sparrow: '雀', snail: '蜗', locust: '蝗' };

function drawBrushChar(ctx, char, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color || INK;
  ctx.font = `bold ${Math.floor(size)}px ${INK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha *= 0.28;
  ctx.fillText(char, x + 1.2, y + 1.4);
  ctx.globalAlpha /= 0.28;
  ctx.fillText(char, x, y);
  ctx.restore();
}

function drawMeshNet(ctx, x, y, radius) {
  ctx.beginPath();
  for (let ring = 1; ring <= 2; ring++) {
    const r = radius * ring / 2;
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }
  for (let i = 0; i < 6; i++) {
    const a = i * (Math.PI / 3);
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
  }
  ctx.stroke();
}

function scarecrowThrust(since) {
  const out = 0.12;
  const hold = 0.05;
  const back = 0.16;
  if (since < 0 || since >= out + hold + back) return 0;
  if (since < out) {
    const t = since / out;
    return t * t;
  }
  if (since < out + hold) return 1;
  const t = (since - out - hold) / back;
  return Math.max(0, 1 - t * t);
}

function drawJavelin(ctx, ox, oy, aim, reach, cell) {
  const ux = Math.cos(aim);
  const uy = Math.sin(aim);
  const px = -uy;
  const py = ux;
  const tail = cell * 0.08;
  if (reach <= tail + 1) return;
  const head = Math.min(cell * 0.16, Math.max(cell * 0.07, (reach - tail) * 0.45));
  const neck = Math.max(tail, reach - head);
  const at = (d, side) => ({
    x: ox + ux * d + px * side,
    y: oy + uy * d + py * side,
  });
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(3.4, cell * 0.046);
  const a = at(tail, 0);
  const b = at(neck, 0);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  const tip = at(reach, 0);
  const headL = at(neck, head * 0.3);
  const headR = at(neck, -head * 0.3);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(headL.x, headL.y);
  ctx.lineTo(headR.x, headR.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTowerPose(ctx, t, game, layout) {
  const cell = layout.cell;
  const origin = cellToPixel(layout, t.col, t.row);
  const ox = origin.x + cell / 2;
  const oy = origin.y + cell / 2;
  const targets = towerTargets(t, game);
  const attacking = targets.length > 0;
  const now = Date.now() / 1000;
  const lead = targets[0];
  let aim = 0;
  if (lead) {
    const px = layout.offsetX + lead.x * cell;
    const py = layout.offsetY + lead.y * cell;
    aim = Math.atan2(py - oy, px - ox);
  }

  if (t.type === 'windmill' && attacking) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    const rate = stats(t, game.config).fireRate || 0.8;
    const spin = now * 10 * (rate / 0.8);
    for (let i = 0; i < 3; i++) {
      const a = spin + i * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * cell * 0.16, Math.sin(a) * cell * 0.16);
      ctx.lineTo(Math.cos(a) * cell * 0.52, Math.sin(a) * cell * 0.52);
      ctx.stroke();
    }
    ctx.restore();
    const gust = (Math.sin(now * 12 * ((stats(t, game.config).fireRate || 0.8) / 0.8)) + 1) / 2;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 + gust * 0.55;
    for (const mark of targets) {
      const px = layout.offsetX + mark.x * cell;
      const py = layout.offsetY + mark.y * cell;
      const nx = -(py - oy);
      const ny = px - ox;
      const len = Math.hypot(nx, ny) || 1;
      const ox2 = (nx / len) * cell * 0.06;
      const oy2 = (ny / len) * cell * 0.06;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(px, py);
      ctx.moveTo(ox + ox2, oy + oy2);
      ctx.lineTo(ox + (px - ox) * (0.55 + gust * 0.35) + ox2, oy + (py - oy) * (0.55 + gust * 0.35) + oy2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (t.type === 'web' && attacking) {
    const cycle = 1.15 / (stats(t, game.config).fireRate || 1);
    const phase = (now % cycle) / cycle;
    let gx = 0;
    let gy = 0;
    for (const mark of targets) {
      gx += layout.offsetX + mark.x * cell;
      gy += layout.offsetY + mark.y * cell;
    }
    gx /= targets.length;
    gy /= targets.length;
    const fly = Math.min(1, phase / 0.42);
    const ease = fly * fly * (3 - 2 * fly);
    const nx = ox + (gx - ox) * ease;
    const ny = oy + (gy - oy) * ease;
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.35 + (1 - ease) * 0.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    drawMeshNet(ctx, nx, ny, cell * (0.1 + ease * 0.62));
    if (phase > 0.48) {
      const hold = Math.min(1, (phase - 0.48) / 0.16);
      const fade = phase > 0.82 ? 1 - (phase - 0.82) / 0.18 : 1;
      ctx.globalAlpha = 0.85 * hold * Math.max(0, fade);
      for (const mark of targets) {
        drawMeshNet(ctx, layout.offsetX + mark.x * cell, layout.offsetY + mark.y * cell, cell * 0.28 * hold);
      }
    }
    ctx.restore();
  }

  if (t.type === 'sticky' && attacking) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.fillStyle = 'rgba(42,33,24,0.32)';
    ctx.lineWidth = 3.6;
    ctx.lineCap = 'round';
    targets.forEach((mark, i) => {
      const px = layout.offsetX + mark.x * cell;
      const py = layout.offsetY + mark.y * cell;
      const wob = Math.sin(now * 6 + i) * cell * 0.05;
      const mx = (ox + px) / 2 + wob;
      const my = (oy + py) / 2 + Math.abs(wob) + cell * 0.04;
      ctx.globalAlpha = 0.82;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(mx, my, px, py);
      ctx.stroke();
      const blob = cell * (0.12 + Math.sin(now * 8 + i) * 0.03);
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(px, py + cell * 0.04, blob * 1.35, blob, wob, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(px - blob * 0.4, py);
      ctx.quadraticCurveTo(px, py + blob * 1.7, px + blob * 0.3, py + blob * 0.15);
      ctx.stroke();
    });
    ctx.restore();
  }

  ctx.save();
  ctx.translate(ox, oy);
  if (t.type === 'scarecrow' && t.stab) {
    const extend = scarecrowThrust(now - (t.stab.at || 0));
    if (extend > 0) {
      const px = layout.offsetX + t.stab.x * cell;
      const py = layout.offsetY + t.stab.y * cell;
      const stabAim = Math.atan2(py - oy, px - ox);
      const lunge = extend * cell * 0.14;
      ctx.rotate(stabAim * 0.22);
      ctx.translate(Math.cos(stabAim) * lunge, Math.sin(stabAim) * lunge);
      ctx.scale(1 + extend * 0.08, Math.max(0.78, 1 - extend * 0.12));
    }
  } else if (t.type === 'windmill' && attacking) {
    const rate = (stats(t, game.config).fireRate || 0.8) / 0.8;
    const pulse = 1 + Math.sin(now * 14 * rate) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.rotate(Math.sin(now * 14 * rate) * 0.12);
  } else if (t.type === 'web' && attacking) {
    const cycle = 1.15 / (stats(t, game.config).fireRate || 1);
    const phase = (now % cycle) / cycle;
    const toss = phase < 0.32 ? Math.sin((phase / 0.32) * Math.PI) : 0;
    ctx.rotate(aim * 0.15);
    ctx.translate(Math.cos(aim) * toss * cell * 0.2, Math.sin(aim) * toss * cell * 0.2);
    ctx.scale(1 + toss * 0.22, Math.max(0.7, 1 - toss * 0.2));
  } else if (t.type === 'sticky' && attacking) {
    const pull = (Math.sin(now * 5) + 1) / 2;
    ctx.rotate(aim * 0.12);
    ctx.translate(Math.cos(aim) * pull * cell * 0.06, Math.sin(aim) * pull * cell * 0.06);
    ctx.scale(1 + pull * 0.08, 1 - pull * 0.06);
  }
  drawBrushChar(ctx, TOWER_CHAR[t.type] || '塔', 0, 0, cell * 0.72);
  ctx.restore();

  if (t.type === 'scarecrow' && t.stab) {
    const extend = scarecrowThrust(now - (t.stab.at || 0));
    if (extend > 0.02) {
      const px = layout.offsetX + t.stab.x * cell;
      const py = layout.offsetY + t.stab.y * cell;
      const stabAim = Math.atan2(py - oy, px - ox);
      const hit = Math.hypot(px - ox, py - oy);
      const tail = cell * 0.08;
      const tip = Math.max(hit, tail + cell * 0.45);
      drawJavelin(ctx, ox, oy, stabAim, tail + (tip - tail) * extend, cell);
    }
  }
  drawLevelBadge(ctx, ox, oy, t.level, cell);
}

function drawCoin(ctx, x, y, r) {
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
  ctx.font = `bold ${Math.floor(r * 1.05)}px ${INK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('金', x, y + r * 0.04);
  ctx.restore();
}

function drawHeart(ctx, x, y, r, color) {
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

function drawPaddy(ctx, x, y, cell) {
  ctx.fillStyle = '#8fbfb4';
  ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + cell / 2, y + 3);
  ctx.lineTo(x + cell / 2, y + cell - 3);
  ctx.moveTo(x + 3, y + cell / 2);
  ctx.lineTo(x + cell - 3, y + cell / 2);
  ctx.stroke();
}

function drawStone(ctx, x, y, cell, col, row) {
  ctx.fillStyle = '#d5c4ab';
  ctx.fillRect(x, y, cell, cell);
  ctx.fillStyle = '#a89880';
  for (let i = 0; i < 6; i++) {
    const px = x + cell * (0.16 + ((col * 17 + i * 29) % 68) / 100);
    const py = y + cell * (0.16 + ((row * 13 + i * 23) % 68) / 100);
    ctx.beginPath();
    ctx.arc(px, py, cell * (0.045 + (i % 3) * 0.012), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPaperTile(ctx, x, y, cell, hot) {
  ctx.fillStyle = hot ? '#fff8e8' : '#f6f1e6';
  ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
  ctx.strokeStyle = hot ? INK : 'rgba(42,33,24,0.28)';
  ctx.lineWidth = hot ? 2 : 1;
  ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
}

function drawInkWash(ctx, layout) {
  ctx.save();
  ctx.strokeStyle = 'rgba(70, 55, 40, 0.35)';
  ctx.lineWidth = 1.5;
  const y = layout.notch + 6;
  ctx.beginPath();
  ctx.moveTo(8, y + 34);
  ctx.lineTo(layout.w * 0.16, y + 10);
  ctx.lineTo(layout.w * 0.3, y + 30);
  ctx.lineTo(layout.w * 0.46, y + 6);
  ctx.lineTo(layout.w * 0.62, y + 28);
  ctx.lineTo(layout.w * 0.8, y + 12);
  ctx.lineTo(layout.w - 8, y + 32);
  ctx.stroke();
  ctx.restore();
}

function drawGranaryBase(ctx, x, y, cell) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(42,33,24,0.1)';
  ctx.beginPath();
  ctx.ellipse(x + cell * 0.5, y + cell * 0.9, cell * 0.36, cell * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, cell * 0.022);
  const floor = y + cell * 0.7;
  ctx.beginPath();
  ctx.moveTo(x + cell * 0.24, floor);
  ctx.lineTo(x + cell * 0.24, y + cell * 0.88);
  ctx.moveTo(x + cell * 0.76, floor);
  ctx.lineTo(x + cell * 0.76, y + cell * 0.88);
  ctx.stroke();
  ctx.fillStyle = '#f3e2c4';
  ctx.beginPath();
  ctx.rect(x + cell * 0.16, y + cell * 0.4, cell * 0.68, cell * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c9a56a';
  ctx.fillRect(x + cell * 0.42, y + cell * 0.52, cell * 0.16, cell * 0.18);
  ctx.strokeRect(x + cell * 0.42, y + cell * 0.52, cell * 0.16, cell * 0.18);
  ctx.fillStyle = '#e7d3a6';
  ctx.beginPath();
  ctx.moveTo(x + cell * 0.5, y + cell * 0.16);
  ctx.lineTo(x + cell * 0.08, y + cell * 0.44);
  ctx.lineTo(x + cell * 0.92, y + cell * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(42,33,24,0.4)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + cell * 0.5, y + cell * 0.2);
    ctx.lineTo(x + cell * (0.22 + i * 0.16), y + cell * 0.42);
    ctx.stroke();
  }
  ctx.fillStyle = '#d4a017';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, cell * 0.016);
  ctx.beginPath();
  ctx.ellipse(x + cell * 0.3, y + cell * 0.8, cell * 0.07, cell * 0.05, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGranary(ctx, game, layout) {
  const cell = layout.cell;
  const g = game.config.GRANARY;
  const granary = cellToPixel(layout, g.col, g.row);
  const cx = granary.x + cell / 2;
  const cy = granary.y + cell / 2;
  drawGranaryBase(ctx, granary.x, granary.y, cell);
  if (game.granaryFlash > 0) {
    ctx.fillStyle = `rgba(255, 70, 70, ${Math.min(0.85, game.granaryFlash / 0.45)})`;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const intervalMs = 450;
  const tick = Math.floor(Date.now() / intervalMs);
  const mark = tick % 2 === 0 ? '粮' : '仓';
  const phase = (Date.now() % intervalMs) / intervalMs;
  // 每次切换瞬间字号跳动，随后回落，不是持续晃动
  const pulse = phase < 0.32 ? 1 + Math.sin((phase / 0.32) * Math.PI) * 0.28 : 1;
  drawBrushChar(ctx, mark, cx, cy + cell * 0.08, cell * 0.48 * pulse);
  const ratio = Math.max(0, game.hp / game.config.INITIAL_HP);
  const hearts = 3;
  for (let i = 0; i < hearts; i++) {
    const filled = ratio > i / hearts;
    drawHeart(ctx, cx + (i - 1) * cell * 0.26, granary.y + cell * 0.14, cell * 0.09, filled ? '#d23b3b' : 'rgba(42,33,24,0.18)');
  }
}

function drawLevelBadge(ctx, x, y, level, size) {
  ctx.fillStyle = INK;
  ctx.font = `bold ${Math.max(12, Math.floor(size * 0.28))}px ${INK_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(level), x + size * 0.34, y - size * 0.3);
}

function hudRound(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawRangeCircle(ctx, cx, cy, radius) {
  ctx.fillStyle = 'rgba(42,33,24,0.08)';
  ctx.strokeStyle = 'rgba(42,33,24,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
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

function isCropCell(config, game, col, row) {
  if (row === 0) return false;
  if (game.blocked.has(col + ',' + row)) return false;
  if (config.PLOT.col === col && config.PLOT.row === row) return false;
  if (config.GRANARY.col === col && config.GRANARY.row === row) return false;
  return !game.buildSlots.some(s => s.col === col && s.row === row);
}

function drawWheat(ctx, x, y, s, lean) {
  ctx.strokeStyle = '#c4a035';
  ctx.lineWidth = Math.max(1.2, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.42);
  ctx.quadraticCurveTo(x + lean * s * 0.2, y + s * 0.1, x + lean * s * 0.08, y - s * 0.28);
  ctx.stroke();
  ctx.strokeStyle = '#7dae3a';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.12);
  ctx.quadraticCurveTo(x - s * 0.22, y + s * 0.02, x - s * 0.28, y + s * 0.16);
  ctx.moveTo(x + lean * s * 0.04, y - s * 0.02);
  ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.08, x + s * 0.26, y + s * 0.06);
  ctx.stroke();
  const hx = x + lean * s * 0.08;
  const hy = y - s * 0.28;
  ctx.fillStyle = '#e2b84a';
  for (let i = 0; i < 6; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const gy = hy + i * s * 0.045;
    ctx.beginPath();
    ctx.ellipse(hx + side * s * 0.045, gy, s * 0.035, s * 0.055, side * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f3d56a';
  ctx.beginPath();
  ctx.ellipse(hx, hy - s * 0.02, s * 0.03, s * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCabbage(ctx, x, y, s) {
  const leaves = ['#2f7a32', '#3e9440', '#69b84e', '#8fd16a'];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 6);
    ctx.fillStyle = leaves[i % leaves.length];
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.12, y + Math.sin(a) * s * 0.1, s * 0.16, s * 0.08, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#d6efb0';
  ctx.beginPath();
  ctx.arc(x, y, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,90,30,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.05, 0.4, 2.2);
  ctx.stroke();
}

function drawRice(ctx, x, y, s, lean) {
  ctx.strokeStyle = '#3d8f32';
  ctx.lineWidth = Math.max(1.4, s * 0.045);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.38);
  ctx.quadraticCurveTo(x + lean * s * 0.15, y, x + lean * s * 0.05, y - s * 0.34);
  ctx.stroke();
  ctx.strokeStyle = '#5cb044';
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  ctx.beginPath();
  ctx.moveTo(x + lean * s * 0.02, y + s * 0.05);
  ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.05, x - s * 0.32, y + s * 0.12);
  ctx.moveTo(x + lean * s * 0.04, y - s * 0.08);
  ctx.quadraticCurveTo(x + s * 0.18, y - s * 0.16, x + s * 0.3, y);
  ctx.stroke();
  const hx = x + lean * s * 0.05;
  const hy = y - s * 0.34;
  ctx.strokeStyle = '#d8c56a';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + i * s * 0.045, hy - s * 0.1);
    ctx.stroke();
  }
}

function drawCrop(ctx, x, y, cell, col, row) {
  const kind = (col * 3 + row * 5) % 3;
  const lean = col % 2 === 0 ? -1 : 1;
  ctx.save();
  if (kind === 0) {
    drawWheat(ctx, x + cell * 0.38, y + cell * 0.48, cell * 0.85, lean);
    drawWheat(ctx, x + cell * 0.68, y + cell * 0.58, cell * 0.62, -lean);
  } else if (kind === 1) {
    drawCabbage(ctx, x + cell * 0.4, y + cell * 0.48, cell * 0.7);
    drawCabbage(ctx, x + cell * 0.7, y + cell * 0.68, cell * 0.42);
  } else {
    drawRice(ctx, x + cell * 0.4, y + cell * 0.5, cell * 0.8, lean);
    drawRice(ctx, x + cell * 0.68, y + cell * 0.62, cell * 0.55, -lean);
  }
  ctx.restore();
}

const PEST_GAIT = {
  aphid: { stride: 4.4, hop: 0.14, wobble: 0.22 },
  mouse: { stride: 8.2, hop: 0.08, wobble: 0.08 },
  sparrow: { stride: 5.2, hop: 0.28, wobble: 0.16 },
  snail: { stride: 2.0, hop: 0.03, wobble: 0.06 },
  locust: { stride: 3.4, hop: 0.2, wobble: 0.14 },
};

function pestFacing(path, distance) {
  const a = positionAt(path, Math.max(0, distance - 0.08));
  const b = positionAt(path, Math.min(path.totalLength, distance + 0.08));
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const face = dx < -0.001 ? -1 : 1;
  const tilt = dy > 0.001 ? 0.18 : dy < -0.001 ? -0.12 : 0;
  return { face, tilt };
}

function drawPest(ctx, e, path, px, py, cell) {
  const gait = PEST_GAIT[e.type] || PEST_GAIT.aphid;
  const phase = e.distance * gait.stride + Date.now() / 700;
  const hop = Math.abs(Math.sin(phase));
  const hit = e.hitFlash > 0 ? Math.min(1, e.hitFlash / 0.15) : 0;
  const wide = 1 + (1 - hop) * 0.16 + hit * 0.22;
  const tall = Math.max(0.35, 1 - (1 - hop) * 0.1 + hop * 0.18 - hit * 0.28);
  const lift = hop * cell * gait.hop;
  const facing = pestFacing(path, e.distance);
  const font = e.type === 'locust' ? cell * 0.86 : cell * 0.66;

  ctx.save();
  ctx.translate(px, py + cell * 0.22);
  ctx.scale(1.15 - hop * 0.4, 0.42);
  ctx.fillStyle = 'rgba(48, 62, 24, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, cell * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(px, py - lift);
  ctx.rotate(facing.tilt + Math.sin(phase) * gait.wobble);
  ctx.scale(facing.face * wide, tall);
  ctx.font = `bold ${Math.floor(font)}px ${INK_FONT}`;
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(PEST_CHAR[e.type] || e.emoji, 0, 0);
  ctx.restore();
}

function drawPop(ctx, fx, x, y, cell) {
  const t = 1 - Math.max(0, fx.life / fx.max);
  const alpha = Math.max(0, 1 - t * t);
  const scale = fx.scale || 1;
  let sx;
  let sy;
  let dy;
  let rot;
  if (t < 0.28) {
    const k = t / 0.28;
    sx = 1 + k * 0.85;
    sy = 1 - k * 0.72;
    dy = k * cell * 0.1;
    rot = 0;
  } else {
    const k = (t - 0.28) / 0.72;
    sx = 1.85 * (1 - k);
    sy = 0.28 + k * 1.15;
    dy = -k * cell * 0.7;
    rot = k * 1.4 * (fx.spin || 1);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + dy);
  ctx.rotate(rot);
  ctx.scale(sx * scale, Math.max(0.05, sy) * scale);
  ctx.font = `${Math.floor(cell * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fx.emoji || '', 0, 0);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + (fx.spin || 1);
    const dist = (0.12 + t * 0.62) * cell * scale;
    ctx.fillStyle = i % 2 === 0 ? '#d6ef86' : '#f6d36b';
    ctx.beginPath();
    ctx.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist * 0.72, cell * 0.045 * (1.15 - t) * scale, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = `rgba(255, 244, 214, ${alpha})`;
  ctx.beginPath();
  ctx.arc(x, y, cell * (0.12 + t * 0.55) * scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function draw(ctx, game, layout, uiState) {
  const { config } = game;
  const cell = layout.cell;

  ctx.fillStyle = '#f3e7d4';
  ctx.fillRect(0, 0, layout.w, layout.h);
  drawInkWash(ctx, layout);

  for (let row = 0; row < config.GRID_ROWS; row++) {
    for (let col = 0; col < config.GRID_COLS; col++) {
      const p = cellToPixel(layout, col, row);
      if (game.blocked.has(col + ',' + row)) drawStone(ctx, p.x, p.y, cell, col, row);
      else if (game.buildSlots.some(s => s.col === col && s.row === row)) drawPaperTile(ctx, p.x, p.y, cell, false);
      else drawPaddy(ctx, p.x, p.y, cell);
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.strokeRect(layout.offsetX - 1, layout.offsetY - 1, cell * config.GRID_COLS + 2, cell * config.GRID_ROWS + 2);

  // 菜畦
  const plot = config.PLOT;
  const plotPx = cellToPixel(layout, plot.col, plot.row);
  drawPaperTile(ctx, plotPx.x, plotPx.y, cell, false);
  drawBrushChar(ctx, '畦', plotPx.x + cell / 2, plotPx.y + cell * 0.42, cell * 0.5);
  if (game.plotReady > 0) {
    ctx.fillStyle = '#8a2e28';
    ctx.font = `bold ${Math.max(14, Math.floor(cell * 0.28))}px ${INK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×' + game.plotReady, plotPx.x + cell / 2, plotPx.y + cell * 0.78);
  }
  if (game.plotReady < plot.max) {
    const ratio = game.plotTimer / plot.interval;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(plotPx.x + cell / 2, plotPx.y + cell / 2, cell * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.stroke();
  }

  // 指定建造点
  for (const slot of game.buildSlots) {
    if (game.towerAt(slot.col, slot.row)) continue;
    const p = cellToPixel(layout, slot.col, slot.row);
    const hover = uiState.drag && uiState.drag.hover
      && uiState.drag.hover.col === slot.col && uiState.drag.hover.row === slot.row;
    if (hover) drawPaperTile(ctx, p.x, p.y, cell, true);
  }

  drawGranary(ctx, game, layout);

  // 按住时显示攻击范围，松手后不保留
  if (uiState.drag && uiState.drag.kind === 'move') {
    const t = game.towerAt(uiState.drag.fromCol, uiState.drag.fromRow);
    if (t) {
      const range = stats(t, config).range * cell;
      const at = uiState.drag.hover || { col: t.col, row: t.row };
      const c = cellToPixel(layout, at.col, at.row);
      drawRangeCircle(ctx, c.x + cell / 2, c.y + cell / 2, range);
    }
  } else if (uiState.arm) {
    const t = game.towerAt(uiState.arm.col, uiState.arm.row);
    if (t) {
      const c = cellToPixel(layout, t.col, t.row);
      drawRangeCircle(ctx, c.x + cell / 2, c.y + cell / 2, stats(t, config).range * cell);
    }
  }

  // 塔
  for (const t of game.towers) {
    const dragging = uiState.drag && uiState.drag.kind === 'move'
      && t.col === uiState.drag.fromCol && t.row === uiState.drag.fromRow;
    ctx.save();
    if (dragging) ctx.globalAlpha = 0.35;
    drawTowerPose(ctx, t, game, layout);
    ctx.restore();
  }

  // 害虫与血条
  for (const e of game.enemies) {
    const pos = positionAt(game.path, e.distance);
    const px = layout.offsetX + pos.x * cell;
    const py = layout.offsetY + pos.y * cell;
    drawPest(ctx, e, game.path, px, py, cell);
    if (e.hitFlash > 0) {
      ctx.strokeStyle = `rgba(255,80,80,${Math.min(1, e.hitFlash / 0.15)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, cell * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
    const ratio = Math.max(0, Math.min(1, e.hp / e.maxHp));
    for (let i = 0; i < 3; i++) {
      const filled = ratio > i / 3;
      drawHeart(ctx, px + (i - 1) * cell * 0.18, py - cell * 0.42, cell * 0.06, filled ? '#d23b3b' : 'rgba(42,33,24,0.18)');
    }
  }

  for (const fx of game.fx || []) {
    const alpha = Math.max(0, fx.life / fx.max);
    if (fx.kind === 'bolt') {
      const x1 = layout.offsetX + fx.x1 * cell;
      const y1 = layout.offsetY + fx.y1 * cell;
      const x2 = layout.offsetX + fx.x2 * cell;
      const y2 = layout.offsetY + fx.y2 * cell;
      ctx.strokeStyle = INK;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'pulse') {
      const x = layout.offsetX + fx.x * cell;
      const y = layout.offsetY + fx.y * cell;
      ctx.strokeStyle = '#3d6b5a';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, cell * (0.25 + (1 - alpha) * 0.55), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (fx.kind === 'pop') {
      const x = layout.offsetX + fx.x * cell;
      const y = layout.offsetY + fx.y * cell;
      drawPop(ctx, fx, x, y, cell);
    } else if (fx.kind === 'float') {
      const x = layout.offsetX + fx.x * cell;
      const y = layout.offsetY + fx.y * cell - (1 - alpha) * cell * 0.8;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fx.color;
      ctx.font = `${Math.max(12, Math.floor(cell * 0.32))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(fx.text, x, y);
      ctx.globalAlpha = 1;
    }
  }

  const waveText = game.waveIndex < 0 ? 1 : game.waveIndex + 1;
  const mid = layout.offsetY - layout.hudH * 0.5;
  const iconR = Math.max(16, layout.hudH * 0.32);
  drawCoin(ctx, 18 + iconR, mid, iconR);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.floor(layout.hudH * 0.42)}px ${INK_FONT}`;
  ctx.fillText(String(game.gold), 26 + iconR * 2, mid);
  ctx.textAlign = 'center';
  ctx.font = `bold ${Math.floor(layout.hudH * 0.46)}px ${INK_FONT}`;
  ctx.fillText('农场', layout.w / 2, mid - layout.hudH * 0.16);
  ctx.font = `${Math.floor(layout.hudH * 0.3)}px ${INK_FONT}`;
  ctx.fillText(`第${Math.min(waveText, config.WAVES.length)}波`, layout.w / 2, mid + layout.hudH * 0.24);
  drawHeart(ctx, layout.w - 18 - iconR, mid, iconR * 0.92, '#d23b3b');
  ctx.textAlign = 'right';
  ctx.font = `bold ${Math.floor(layout.hudH * 0.4)}px ${INK_FONT}`;
  ctx.fillStyle = INK;
  ctx.fillText(String(game.hp), layout.w - 26 - iconR * 2, mid);

  if (game.moment) {
    const label = game.moment.kind === 'crit' ? '非常时刻 · 全线暴击' : '非常时刻 · 动作迟缓';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(16, Math.floor(cell * 0.42))}px sans-serif`;
    ctx.fillStyle = game.moment.kind === 'crit' ? '#c0392b' : '#1a5276';
    ctx.fillText(`${label}  ${Math.ceil(game.moment.timer)}s`, layout.w / 2, layout.offsetY + cell * 0.5);
    ctx.restore();
  }

  // 波次警报：田地最上一行，这一行没有建造点
  if (game.state === 'prep') {
    const blink = 0.45 + 0.55 * Math.abs(Math.sin(Date.now() / 160));
    const bannerY = layout.offsetY + cell * 0.5;
    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.offsetX, layout.offsetY, cell * config.GRID_COLS, cell);
    ctx.clip();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(18, Math.floor(cell * 0.72))}px sans-serif`;
    ctx.shadowColor = '#ff1a1a';
    ctx.shadowBlur = 14;
    ctx.fillStyle = `rgba(255, 32, 32, ${blink})`;
    const waveNo = game.waveIndex + 2;
    ctx.fillText(`第 ${waveNo} 波攻击  ${Math.ceil(game.restTimer)}s`, layout.w / 2, bannerY);
    ctx.restore();
  }

  // toast
  if (uiState.toast && uiState.toast.until > Date.now()) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `${Math.floor(cell * 0.42)}px sans-serif`;
    ctx.fillText(uiState.toast.text, layout.w / 2, layout.panelY - cell * 0.35);
  }

  require('./ui').drawPanel(ctx, layout, uiState, game, game.config);

  if (uiState.drag && uiState.drag.kind === 'build') {
    const range = config.TOWERS[uiState.drag.type].levels[0].range * cell;
    if (uiState.drag.hover) {
      const c = cellToPixel(layout, uiState.drag.hover.col, uiState.drag.hover.row);
      drawRangeCircle(ctx, c.x + cell / 2, c.y + cell / 2, range);
    } else {
      drawRangeCircle(ctx, uiState.drag.x, uiState.drag.y, range);
    }
  }
}

module.exports = { computeLayout, cellToPixel, pixelToCell, draw, drawLevelBadge };
