function drawSticky(ctx, x, y, size) {
  const w = size * 0.72;
  const h = size * 0.5;
  ctx.fillStyle = '#a15c24';
  ctx.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
  ctx.fillStyle = '#ffe56a';
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x - w / 2 + 2, y - h / 2 + 2, w * 0.35, h * 0.18);
  ctx.fillStyle = '#3a2a1a';
  const bugs = [[-0.18, -0.08], [0.12, 0.02], [0.02, 0.16]];
  for (const [bx, by] of bugs) {
    ctx.beginPath();
    ctx.ellipse(x + bx * size, y + by * size, size * 0.07, size * 0.045, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawScarecrow(ctx, x, y, size) {
  ctx.strokeStyle = '#7a4b24';
  ctx.lineWidth = Math.max(2, size * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.38);
  ctx.lineTo(x, y - size * 0.05);
  ctx.moveTo(x - size * 0.28, y + size * 0.02);
  ctx.lineTo(x + size * 0.28, y + size * 0.02);
  ctx.stroke();
  ctx.fillStyle = '#e7c56a';
  ctx.beginPath();
  ctx.arc(x, y - size * 0.16, size * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.2, y - size * 0.22);
  ctx.lineTo(x + size * 0.2, y - size * 0.22);
  ctx.lineTo(x, y - size * 0.42);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.fillRect(x - size * 0.06, y - size * 0.2, size * 0.04, size * 0.04);
  ctx.fillRect(x + size * 0.02, y - size * 0.2, size * 0.04, size * 0.04);
  ctx.strokeStyle = '#e7c56a';
  ctx.lineWidth = Math.max(2, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.22, y + size * 0.08);
  ctx.lineTo(x - size * 0.22, y + size * 0.2);
  ctx.moveTo(x + size * 0.22, y + size * 0.08);
  ctx.lineTo(x + size * 0.22, y + size * 0.2);
  ctx.stroke();
}

function drawWeb(ctx, x, y, size) {
  const w = size * 0.62;
  const h = size * 0.5;
  const left = x - w / 2;
  const top = y - h / 2;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = '#b7e39a';
  ctx.strokeStyle = '#2f6b3a';
  ctx.lineWidth = Math.max(3, size * 0.07);
  roundIconRect(ctx, left, top, w, h, size * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  roundIconRect(ctx, left + 2, top + 2, w - 4, h - 4, size * 0.06);
  ctx.clip();
  ctx.strokeStyle = '#3d8f4a';
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.beginPath();
  for (let i = 1; i <= 2; i++) {
    ctx.moveTo(left, top + h * i / 3);
    ctx.lineTo(left + w, top + h * i / 3);
    ctx.moveTo(left + w * i / 3, top);
    ctx.lineTo(left + w * i / 3, top + h);
  }
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#e23b32';
  ctx.beginPath();
  ctx.ellipse(x + w * 0.12, y + h * 0.08, size * 0.07, size * 0.05, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = Math.max(1.2, size * 0.03);
  ctx.stroke();
  ctx.restore();
}

function roundIconRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawTowerIcon(ctx, type, x, y, size) {
  if (type === 'sticky') {
    drawSticky(ctx, x, y, size);
    return true;
  }
  if (type === 'scarecrow') {
    drawScarecrow(ctx, x, y, size);
    return true;
  }
  if (type === 'web') {
    drawWeb(ctx, x, y, size);
    return true;
  }
  return false;
}

module.exports = { drawTowerIcon };
