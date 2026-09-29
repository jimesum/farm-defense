// js/ui.js
const { cellToPixel, pixelToCell, drawLevelBadge } = require('./render');

const TOWER_ORDER = ['sticky', 'scarecrow', 'windmill', 'web'];
const TOWER_CHAR = { sticky: '粘', scarecrow: '草', windmill: '风', web: '网' };
const INK = '#2a2118';
const INK_FONT = '"KaiTi","STKaiti","楷体",serif';

function createUIState() {
  return {
    selected: null,        // {col,row} 当前选中格子
    toast: null,           // {text, until}
    overlay: null,         // 'won' | 'lost' | null
    panelButtons: [],      // 本帧按钮，供触摸命中
    placementMode: false,  // 广告奖励的免费塔放置模式
    adModal: false,        // 广告弹窗是否显示
    drag: null,            // { kind:'build'|'move', type, x, y, hover, fromCol, fromRow, level }
    arm: null,             // 点在已放置设施上，移动超过阈值才开始拖动
  };
}

function showToast(uiState, text) {
  uiState.toast = { text, until: Date.now() + 2000 };
}

function panelButtons(layout, uiState, game, config) {
  const buttons = [];
  const y = layout.panelY;
  const h = layout.panelH;
  if (uiState.placementMode) return buttons;

  const bw = layout.w / TOWER_ORDER.length;
  TOWER_ORDER.forEach((type, i) => {
    const def = config.TOWERS[type];
    buttons.push({
      key: 'build:' + type,
      label: `${def.emoji} ${def.name}`,
      sub: `💰${def.cost}`,
      rect: { x: i * bw, y, w: bw, h },
      enabled: game.gold >= def.cost,
    });
  });
  return buttons;
}

function buildSlotAt(x, y, game, layout) {
  const { col, row } = pixelToCell(layout, x, y);
  if (!game.isBuildSlot(col, row)) return null;
  return { col, row };
}

function handleTouchStart(x, y, game, layout, uiState, config, hooks) {
  if (game.state === 'won') {
    const r = winDialogLayout(layout).confirm;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (hooks.onHome) hooks.onHome();
      else hooks.onRestart();
    }
    return;
  }
  if (game.state === 'lost') {
    if (hooks.onHome) hooks.onHome();
    else hooks.onRestart();
    return;
  }

  // 广告弹窗
  if (uiState.adModal) {
    const dialog = adDialogLayout(layout);
    const hit = [dialog.watch, dialog.skip].find(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
    if (hit === dialog.watch) hooks.onAdWatch();
    else if (hit === dialog.skip) hooks.onAdSkip();
    return;
  }

  // 面板按钮
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (b.key.startsWith('build:')) {
        if (!b.enabled) {
          showToast(uiState, '金币不足');
          return;
        }
        uiState.selected = null;
        uiState.arm = null;
        uiState.drag = {
          kind: 'build', type: b.key.slice(6), x, y, hover: buildSlotAt(x, y, game, layout),
        };
      }
      return;
    }
  }

  // 田地点击
  const { col, row } = pixelToCell(layout, x, y);
  if (col < 0 || col >= config.GRID_COLS || row < 0 || row >= config.GRID_ROWS) {
    uiState.selected = null;
    return;
  }

  if (uiState.placementMode) {
    if (!game.isBuildSlot(col, row)) {
      showToast(uiState, '只能放在圆点上');
      return;
    }
    const r = game.grantRandomTower(col, row);
    if (r.ok) {
      uiState.placementMode = false;
      showToast(uiState, `获得援助：${config.TOWERS[r.type].name}`);
    } else {
      showToast(uiState, '这里不能放置');
    }
    return;
  }

  const plot = config.PLOT;
  if (col === plot.col && row === plot.row) {
    const got = game.collectPlot();
    if (got.ok) showToast(uiState, `收成 +${got.gold}`);
    else showToast(uiState, '菜还没长好');
    uiState.selected = null;
    return;
  }

  const t = game.towerAt(col, row);
  uiState.selected = t ? { col, row } : null;
  uiState.arm = t ? { col, row, x, y } : null;
}

function handleTouchMove(x, y, game, layout, uiState) {
  if (uiState.arm && !uiState.drag) {
    const dx = x - uiState.arm.x;
    const dy = y - uiState.arm.y;
    if (dx * dx + dy * dy > 64) {
      const t = game.towerAt(uiState.arm.col, uiState.arm.row);
      if (t) {
        uiState.drag = {
          kind: 'move', type: t.type, level: t.level,
          fromCol: t.col, fromRow: t.row, x, y,
          hover: buildSlotAt(x, y, game, layout),
        };
      }
      uiState.arm = null;
    }
  }
  if (!uiState.drag) return;
  uiState.drag.x = x;
  uiState.drag.y = y;
  uiState.drag.hover = buildSlotAt(x, y, game, layout);
}

function handleTouchEnd(x, y, game, layout, uiState) {
  uiState.arm = null;
  if (!uiState.drag) return;
  const drag = uiState.drag;
  uiState.drag = null;
  const slot = buildSlotAt(x, y, game, layout);
  if (!slot) return;
  if (drag.kind === 'move') {
    const source = game.towerAt(drag.fromCol, drag.fromRow);
    const target = game.towerAt(slot.col, slot.row);
    if (game.canMerge(source, target)) {
      const merged = game.mergeTower(drag.fromCol, drag.fromRow, slot.col, slot.row);
      if (merged.ok) {
        uiState.selected = { col: slot.col, row: slot.row };
        showToast(uiState, `合并为 ${merged.level} 级`);
      }
      return;
    }
    const r = game.moveTower(drag.fromCol, drag.fromRow, slot.col, slot.row);
    if (r.ok) uiState.selected = { col: slot.col, row: slot.row };
    else showToast(uiState, '只能放到建造点上');
    return;
  }
  const r = game.absorbTower(drag.type, slot.col, slot.row);
  uiState.selected = null;
  if (r.ok) {
    if (r.upgraded) showToast(uiState, '升到 2 级');
  } else if (r.reason === 'gold') showToast(uiState, '金币不足');
  else if (r.reason === 'level') showToast(uiState, '同种设施已高于 1 级');
  else if (r.reason === 'occupied') showToast(uiState, '这里已经有设施');
  else showToast(uiState, '这里不能放置');
}

function drawSquareFace(ctx, card, char, name, price) {
  const side = card.w;
  const cx = card.x + side / 2;
  const glyph = Math.floor(side * 0.34);
  const nameSize = Math.max(12, Math.floor(side * 0.15));
  const priceSize = Math.max(11, Math.floor(side * 0.13));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  ctx.font = `bold ${glyph}px ${INK_FONT}`;
  ctx.fillText(char, cx, card.y + side * 0.3);
  ctx.font = `${nameSize}px ${INK_FONT}`;
  ctx.fillText(name, cx, card.y + side * 0.64);
  if (price === '' || price == null) return;
  ctx.font = `bold ${priceSize}px ${INK_FONT}`;
  ctx.fillText(String(price), cx, card.y + side * 0.84);
}

function drawPanel(ctx, layout, uiState, game, config) {
  const y = layout.panelY;

  ctx.strokeStyle = 'rgba(42,33,24,0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(18, y + 4);
  ctx.lineTo(layout.w - 18, y + 4);
  ctx.stroke();

  if (uiState.placementMode) {
    ctx.fillStyle = INK;
    ctx.font = `bold ${Math.floor(layout.panelH * 0.28)}px ${INK_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点空地放置援助设施', layout.w / 2, y + layout.panelH / 2);
    return;
  }

  // 按钮
  uiState.panelButtons = panelButtons(layout, uiState, game, config);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    const held = uiState.drag && uiState.drag.kind === 'build' && b.key === 'build:' + uiState.drag.type;
    const gap = 8;
    const side = Math.min(r.w - gap, r.h - 6);
    const card = {
      x: r.x + (r.w - side) / 2,
      y: r.y + (r.h - side) / 2 + (held ? -2 : 0),
      w: side,
      h: side,
    };
    ctx.save();
    ctx.beginPath();
    roundRectPath(ctx, card.x, card.y + (held ? 0 : 3), card.w, card.h, 6);
    ctx.fillStyle = 'rgba(42,33,24,0.08)';
    ctx.fill();
    ctx.beginPath();
    roundRectPath(ctx, card.x, card.y, card.w, card.h, 4);
    ctx.fillStyle = b.enabled ? '#fbf7ef' : '#e7dfd0';
    ctx.fill();
    ctx.lineWidth = held ? 3 : 1.5;
    ctx.strokeStyle = INK;
    ctx.stroke();
    if (!b.enabled) ctx.globalAlpha = 0.4;
    const type = b.key.slice(6);
    const def = config.TOWERS[type];
    drawSquareFace(ctx, card, TOWER_CHAR[type] || '塔', def.name, def.cost);
    ctx.restore();
  }

  if (uiState.drag) {
    const gx = uiState.drag.x;
    const gy = uiState.drag.y - layout.cell * 0.2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.floor(layout.cell * 0.72)}px ${INK_FONT}`;
    ctx.fillStyle = INK;
    ctx.fillText(TOWER_CHAR[uiState.drag.type] || '塔', gx, gy);
    if (uiState.drag.level) drawLevelBadge(ctx, gx, gy, uiState.drag.level, layout.cell * 0.7);
  }

  // 广告弹窗。通关或失败时不再盖在结算框上。
  if (uiState.adModal && game.state !== 'won' && game.state !== 'lost') {
    const dialog = adDialogLayout(layout);
    ctx.fillStyle = 'rgba(40, 24, 12, 0.72)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    const c = dialog.card;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    roundRectPath(ctx, c.x + 4, c.y + 6, c.w, c.h, 16);
    ctx.fill();
    ctx.fillStyle = '#f0d7a8';
    ctx.beginPath();
    roundRectPath(ctx, c.x, c.y, c.w, c.h, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5c3b22';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a2e28';
    ctx.font = `bold ${Math.floor(c.w * 0.09)}px sans-serif`;
    ctx.fillText(game.adPrompt === 'hp' ? '粮仓告急' : '强敌来袭', layout.w / 2, c.y + c.h * 0.22);
    ctx.fillStyle = '#5c4632';
    ctx.font = `${Math.max(14, Math.floor(c.w * 0.045))}px sans-serif`;
    ctx.fillText('观看广告，获得一座设施', layout.w / 2, c.y + c.h * 0.46);
    drawDialogButton(ctx, dialog.watch, '#3e8f4a', '观看');
    drawDialogButton(ctx, dialog.skip, '#8a5a32', '放弃');
  }

  if (game.state === 'won') {
    const dialog = winDialogLayout(layout);
    ctx.fillStyle = 'rgba(40, 24, 12, 0.72)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    const c = dialog.card;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    roundRectPath(ctx, c.x + 4, c.y + 6, c.w, c.h, 16);
    ctx.fill();
    ctx.fillStyle = '#f0d7a8';
    ctx.beginPath();
    roundRectPath(ctx, c.x, c.y, c.w, c.h, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#5c3b22';
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#8a2e28';
    ctx.font = `bold ${Math.floor(c.w * 0.09)}px ${INK_FONT}`;
    ctx.fillText('恭喜', layout.w / 2, c.y + c.h * 0.28);
    ctx.fillText('保卫粮仓成功', layout.w / 2, c.y + c.h * 0.46);
    ctx.fillStyle = '#5c4632';
    ctx.font = `${Math.max(14, Math.floor(c.w * 0.045))}px ${INK_FONT}`;
    ctx.fillText('十波来袭已全部守住', layout.w / 2, c.y + c.h * 0.64);
    drawDialogButton(ctx, dialog.confirm, '#3e8f4a', '确认');
  } else if (game.state === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(layout.cell * 0.8)}px sans-serif`;
    ctx.fillText('💥 粮仓被吃光了', layout.w / 2, layout.h * 0.42);
    ctx.font = `${Math.floor(layout.cell * 0.4)}px sans-serif`;
    ctx.fillText('点击返回首页', layout.w / 2, layout.h * 0.55);
  }
}

function winDialogLayout(layout) {
  const cardW = Math.min(layout.w * 0.86, 460);
  const cardH = Math.min(layout.h * 0.42, 360);
  const card = {
    x: (layout.w - cardW) / 2,
    y: (layout.h - cardH) / 2,
    w: cardW,
    h: cardH,
  };
  const bw = Math.min(cardW * 0.55, 220);
  const bh = Math.max(48, cardH * 0.16);
  return {
    card,
    confirm: { x: card.x + (cardW - bw) / 2, y: card.y + cardH - bh - 22, w: bw, h: bh },
  };
}

function adDialogLayout(layout) {
  const cardW = Math.min(layout.w * 0.9, 480);
  const cardH = Math.min(layout.h * 0.52, 420);
  const card = {
    x: (layout.w - cardW) / 2,
    y: (layout.h - cardH) / 2,
    w: cardW,
    h: cardH,
  };
  const gap = 12;
  const bw = (cardW - 36 - gap) / 2;
  const bh = Math.max(44, cardH * 0.2);
  const by = card.y + cardH - bh - 18;
  return {
    card,
    watch: { x: card.x + 18, y: by, w: bw, h: bh },
    skip: { x: card.x + 18 + bw + gap, y: by, w: bw, h: bh },
  };
}

function drawDialogButton(ctx, r, fill, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  roundRectPath(ctx, r.x, r.y + 3, r.w, r.h, 10);
  ctx.fill();
  ctx.fillStyle = fill;
  ctx.beginPath();
  roundRectPath(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3d2914';
  ctx.stroke();
  ctx.fillStyle = '#fff8ea';
  ctx.font = `bold ${Math.floor(r.h * 0.42)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

module.exports = {
  createUIState, panelButtons, handleTouchStart, handleTouchMove, handleTouchEnd, drawPanel, showToast,
};
