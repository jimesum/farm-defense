const test = require('node:test');
const assert = require('node:assert');
const Game = require('../js/main');
const config = require('../js/config');

function newGame() {
  return new Game(config);
}

test('initial state', () => {
  const g = newGame();
  assert.strictEqual(g.gold, 100);
  assert.strictEqual(g.hp, 20);
  assert.strictEqual(g.state, 'prep');
  assert.strictEqual(g.waveIndex, -1);
});

test('placeTower deducts gold and rejects invalid placements', () => {
  const g = newGame();
  assert.strictEqual(g.placeTower('scarecrow', 0, 2).ok, false, 'on path');
  const r = g.placeTower('scarecrow', 3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.gold, 50);
  assert.strictEqual(g.placeTower('scarecrow', 3, 3).ok, false, 'occupied');
  g.gold = 10;
  assert.strictEqual(g.placeTower('scarecrow', 4, 4).ok, false, 'insufficient gold');
});

test('upgrade and sell flow', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  const r = g.upgradeTowerAt(3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.gold, 100 - 50 - 40);
  const s = g.sellTowerAt(3, 3);
  assert.strictEqual(s.ok, true);
  assert.strictEqual(g.gold, 10 + 62); // floor(90 * 0.7) === 62 in JS floats
  assert.strictEqual(g.towerAt(3, 3), undefined);
});

test('wave starts after rest countdown and spawns enemies', () => {
  const g = newGame();
  g.update(config.WAVE_REST + 0.1); // 倒计时结束
  assert.strictEqual(g.state, 'combat');
  assert.strictEqual(g.waveIndex, 0);
  g.update(0.016);
  assert.ok(g.enemies.length >= 1, 'first aphid spawned');
});

test('kills grant gold, leaks cost hp', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 1); // 覆盖第一段路
  g.update(config.WAVE_REST + 0.1);
  // 跑 30 秒模拟
  for (let t = 0; t < 30; t += 0.05) g.update(0.05);
  assert.ok(g.gold > 50, 'earned gold from kills');
  assert.ok(g.hp <= 20);
});

test('hp ad prompt triggers at low hp, once per game', () => {
  const g = newGame();
  g.hp = 5; // <= 20 * 0.3
  g.update(config.WAVE_REST + 0.1);
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp');
  g.declineAd();
  assert.strictEqual(g.adPrompt, null);
  assert.strictEqual(g.adOffered, true);
  g.hp = 1;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, null, 'no second prompt');
});

test('boss ad prompt triggers before wave 10', () => {
  const g = newGame();
  g.waveIndex = 8;
  g.state = 'prep';
  g.restTimer = 0;
  g.update(0.1); // 进入第 10 波
  assert.strictEqual(g.adPrompt, 'boss');
  assert.strictEqual(g.waveIndex, 9);
});

test('losing sets state lost', () => {
  const g = newGame();
  g.hp = 1;
  g.update(config.WAVE_REST + 0.1);
  // 不放塔，蚜虫 22.5 秒走完全程
  for (let t = 0; t < 30 && g.state !== 'lost'; t += 0.1) g.update(0.1);
  assert.strictEqual(g.state, 'lost');
});

test('winning all 10 waves sets state won', () => {
  const g = newGame();
  // 铺满高等级塔
  g.gold = 99999;
  const spots = [[3,1],[2,3],[4,3],[5,4],[7,3],[0,4],[2,6],[3,7],[5,6],[7,7],[4,9],[5,10],[7,9],[0,7]];
  for (const [c, r] of spots) {
    if (g.placeTower('scarecrow', c, r).ok) {
      g.upgradeTowerAt(c, r);
      g.upgradeTowerAt(c, r);
    }
  }
  for (let t = 0; t < 600 && g.state !== 'won' && g.state !== 'lost'; t += 0.1) g.update(0.1);
  assert.strictEqual(g.state, 'won');
});

test('grantRandomTower places a free level-1 tower with zero invested', () => {
  const g = newGame();
  const r = g.grantRandomTower(4, 4);
  assert.strictEqual(r.ok, true);
  const t = g.towerAt(4, 4);
  assert.strictEqual(t.level, 1);
  assert.strictEqual(t.invested, 0);
  assert.strictEqual(g.gold, 100, 'no gold spent');
});

test('grantRandomUpgrade upgrades a random tower or falls back to gold', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  const r = g.grantRandomUpgrade();
  assert.strictEqual(r.applied, 'upgrade');
  assert.strictEqual(g.towerAt(3, 3).level, 2);
  // 全满级时发金币
  g.gold = 100; // L2→L3 costs 60; leftover 50 after place is not enough
  g.upgradeTowerAt(3, 3);
  const goldBefore = g.gold;
  const r2 = g.grantRandomUpgrade();
  assert.strictEqual(r2.applied, 'gold');
  assert.strictEqual(g.gold, goldBefore + config.AD.GOLD_FALLBACK);
});
