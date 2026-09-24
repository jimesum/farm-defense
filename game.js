// game.js
const config = require('./js/config');
const Game = require('./js/main');
const render = require('./js/render');
const createAdController = require('./js/ad');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const game = new Game(config);
const layout = render.computeLayout(canvas, config);
const uiState = { selected: null, toast: null, overlay: null, panelButtons: [] };
const ad = createAdController(wx, config);
ad.load();

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  render.draw(ctx, game, layout, uiState);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Task 10 将在此接入 wx.onTouchStart 与 ui 模块
