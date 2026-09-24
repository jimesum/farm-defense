// js/ui.js
const { cellToPixel, pixelToCell } = require('./render');
const { upgradeCost, sellValue, stats } = require('./tower');

const TOWER_ORDER = ['sticky', 'scarecrow', 'windmill', 'web'];

function createUIState() {
  return {
    selected: null,        // {col,row} 当前选中格子
    toast: null,           // {text, until}
    overlay: null,         // 'won' | 'lost' | null
    panelButtons: [],      // 本帧按钮，供触摸命中
    placementMode: false,  // 广告奖励的免费塔放置模式
    adModal: false,        // 广告弹窗是否显示
  };
}

function showToast(uiState, text) {
  uiState.toast = { text, until: Date.now() + 2000 };
}

function panelButtons(layout, uiState, game, config) {
  const buttons = [];
  const y = layout.h - layout.panelH;
  const h = layout.panelH;
  if (uiState.placementMode) return buttons;

  if (uiState.selected) {
    const t = game.towerAt(uiState.selected.col, uiState.selected.row);
    if (t) {
      const cost = upgradeCost(t, config);
      const half = layout.w / 2;
      buttons.push({
        key: 'upgrade',
        label: cost === null ? '已满级' : `⬆️ 升级`,
        sub: cost === null ? '' : `💰${cost}`,
        rect: { x: 0, y, w: half, h },
        enabled: cost !== null,
      });
      buttons.push({
        key: 'sell',
        label: '💲 出售',
        sub: `+${sellValue(t, config)}`,
        rect: { x: half, y, w: half, h },
        enabled: true,
      });
      return buttons;
    }
  }

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

function handleTouch(x, y, game, layout, uiState, config, hooks) {
  // 结算覆盖层：点击重开
  if (game.state === 'won' || game.state === 'lost') {
    hooks.onRestart();
    return;
  }

  // 广告弹窗
  if (uiState.adModal) {
    const bw = layout.w / 2;
    const by = layout.h * 0.55;
    const bh = layout.panelH * 0.8;
    if (y >= by && y <= by + bh) {
      if (x < bw) hooks.onAdWatch();
      else hooks.onAdSkip();
    }
    return;
  }

  // 面板按钮
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (b.key.startsWith('build:')) {
        const type = b.key.slice(6);
        if (!uiState.selected) return;
        const r2 = game.placeTower(type, uiState.selected.col, uiState.selected.row);
        if (!r2.ok) showToast(uiState, r2.reason === 'gold' ? '金币不足' : '无法建造');
      } else if (b.key === 'upgrade') {
        if (!b.enabled) return;
        const r2 = game.upgradeTowerAt(uiState.selected.col, uiState.selected.row);
        if (!r2.ok) showToast(uiState, r2.reason === 'gold' ? '金币不足' : '无法升级');
      } else if (b.key === 'sell') {
        game.sellTowerAt(uiState.selected.col, uiState.selected.row);
        uiState.selected = null;
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
    const r = game.grantRandomTower(col, row);
    if (r.ok) {
      uiState.placementMode = false;
      showToast(uiState, `获得援助：${config.TOWERS[r.type].name}`);
    } else {
      showToast(uiState, '这里不能放置');
    }
    return;
  }

  const t = game.towerAt(col, row);
  if (t) {
    uiState.selected = { col, row };
    return;
  }
  if (game.blocked.has(col + ',' + row)) {
    uiState.selected = null;
    return;
  }
  uiState.selected = { col, row };
}

function drawPanel(ctx, layout, uiState, game, config) {
  const y = layout.h - layout.panelH;

  // 面板底
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, y, layout.w, layout.panelH);

  if (uiState.placementMode) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = `${Math.floor(layout.panelH * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 选择一块空地放置援助设施', layout.w / 2, y + layout.panelH / 2);
    return;
  }

  // 按钮
  uiState.panelButtons = panelButtons(layout, uiState, game, config);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    ctx.fillStyle = b.enabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(r.x + 2, r.y + 4, r.w - 4, r.h - 8);
    ctx.fillStyle = b.enabled ? '#fff' : '#888';
    ctx.font = `${Math.floor(r.h * 0.26)}px sans-serif`;
    ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h * 0.36);
    ctx.font = `${Math.floor(r.h * 0.2)}px sans-serif`;
    ctx.fillText(b.sub, r.x + r.w / 2, r.y + r.h * 0.7);
  }

  // 广告弹窗
  if (uiState.adModal) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(layout.cell * 0.5)}px sans-serif`;
    ctx.fillText('⚠️ 粮仓告急！', layout.w / 2, layout.h * 0.4);
    ctx.font = `${Math.floor(layout.cell * 0.38)}px sans-serif`;
    ctx.fillText('观看广告获得援助', layout.w / 2, layout.h * 0.47);
    const bw = layout.w / 2;
    const by = layout.h * 0.55;
    const bh = layout.panelH * 0.8;
    ctx.fillStyle = '#3ec76b';
    ctx.fillRect(0, by, bw, bh);
    ctx.fillStyle = '#666';
    ctx.fillRect(bw, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(bh * 0.32)}px sans-serif`;
    ctx.fillText('📺 观看', bw / 2, by + bh / 2);
    ctx.fillText('放弃', bw + bw / 2, by + bh / 2);
  }

  // 结算覆盖层
  if (game.state === 'won' || game.state === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(layout.cell * 0.8)}px sans-serif`;
    ctx.fillText(game.state === 'won' ? '🎉 丰收了！' : '💥 粮仓被吃光了', layout.w / 2, layout.h * 0.42);
    ctx.font = `${Math.floor(layout.cell * 0.4)}px sans-serif`;
    ctx.fillText('点击任意处重新开始', layout.w / 2, layout.h * 0.55);
  }
}

module.exports = { createUIState, panelButtons, handleTouch, drawPanel, showToast };
