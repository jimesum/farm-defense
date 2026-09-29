// game.js
const config = require('./js/config');
const Game = require('./js/main');
const render = require('./js/render');
const ui = require('./js/ui');
const title = require('./js/title');
const createAdController = require('./js/ad');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// DPR: clientX/clientY are CSS pixels; scale canvas so touches align
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
canvas.width = info.windowWidth * info.pixelRatio;
canvas.height = info.windowHeight * info.pixelRatio;
ctx.scale(info.pixelRatio, info.pixelRatio);
const cssCanvas = { width: info.windowWidth, height: info.windowHeight };
const safeTop = (info.safeArea && info.safeArea.top) || info.statusBarHeight || 0;
const layout = render.computeLayout(cssCanvas, config, safeTop);

let game = new Game(config);
let started = false;
let startButton = null;
const uiState = ui.createUIState();
const ad = createAdController(wx, config);
ad.load();

const hooks = {
  onRestart() {
    game = new Game(config);
    uiState.selected = null;
    uiState.placementMode = false;
    uiState.adModal = false;
    uiState.drag = null;
    uiState.arm = null;
  },
  onHome() {
    started = false;
    hooks.onRestart();
  },
  onAdWatch() {
    uiState.adModal = false;
    game.consumeAdPrompt();
    ad.show({
      onReward() {
        const moment = game.tryMoment();
        if (moment) {
          ui.showToast(uiState, moment.kind === 'crit' ? '非常时刻：全线暴击' : '非常时刻：动作迟缓');
        }
        uiState.placementMode = true;
      },
      onSkip() {
        ui.showToast(uiState, '广告未播放完成');
      },
    });
  },
  onAdSkip() {
    uiState.adModal = false;
    game.declineAd();
  },
};

wx.onTouchStart(e => {
  const t = e.touches[0];
  if (!started) {
    if (title.hitStart(t.clientX, t.clientY, startButton)) started = true;
    return;
  }
  ui.handleTouchStart(t.clientX, t.clientY, game, layout, uiState, config, hooks);
});
wx.onTouchMove(e => {
  if (!started) return;
  const t = e.touches[0];
  ui.handleTouchMove(t.clientX, t.clientY, game, layout, uiState);
});
wx.onTouchEnd(e => {
  if (!started) return;
  const t = e.changedTouches[0];
  ui.handleTouchEnd(t.clientX, t.clientY, game, layout, uiState);
});

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (started && !uiState.adModal) {
    game.update(dt);
  }
  if (started && (game.state === 'won' || game.state === 'lost')) {
    uiState.adModal = false;
  } else if (started && game.adPrompt && !uiState.adModal) {
    uiState.adModal = true;
  }
  if (started) render.draw(ctx, game, layout, uiState);
  else startButton = title.drawTitle(ctx, cssCanvas.width, cssCanvas.height, safeTop);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
