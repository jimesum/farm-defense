// game.js
const config = require('./js/config');
const Game = require('./js/main');
const render = require('./js/render');
const ui = require('./js/ui');
const createAdController = require('./js/ad');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

// DPR: clientX/clientY are CSS pixels; scale canvas so touches align
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
canvas.width = info.windowWidth * info.pixelRatio;
canvas.height = info.windowHeight * info.pixelRatio;
ctx.scale(info.pixelRatio, info.pixelRatio);
const cssCanvas = { width: info.windowWidth, height: info.windowHeight };
const layout = render.computeLayout(cssCanvas, config);

let game = new Game(config);
const uiState = ui.createUIState();
const ad = createAdController(wx, config);
ad.load();

const hooks = {
  onRestart() {
    game = new Game(config);
    uiState.selected = null;
    uiState.placementMode = false;
    uiState.adModal = false;
  },
  onAdWatch() {
    uiState.adModal = false;
    game.consumeAdPrompt();
    ad.show({
      onReward() {
        const roll = game.rollAdReward();
        if (roll === 'upgrade' && game.towers.length > 0) {
          const r = game.grantRandomUpgrade();
          ui.showToast(uiState, r.applied === 'gold' ? `援助：💰${config.AD.GOLD_FALLBACK}` : `援助：${config.TOWERS[r.tower.type].name}升级！`);
        } else {
          uiState.placementMode = true;
        }
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
  ui.handleTouch(t.clientX, t.clientY, game, layout, uiState, config, hooks);
});

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  // 广告触发：血量告急或 Boss 波前
  if (game.adPrompt && !uiState.adModal) {
    uiState.adModal = true;
  }
  render.draw(ctx, game, layout, uiState);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
