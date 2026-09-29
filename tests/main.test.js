const test = require('node:test');
const assert = require('node:assert');
const Game = require('../js/main');
const config = require('../js/config');

function newGame() {
  return new Game(config, config.BUILD_SLOTS);
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
  assert.strictEqual(g.placeTower('scarecrow', 0, 0).ok, false, 'not a build slot');
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

test('hp ad prompts at 15, then every 3 hp, and not while one is open', () => {
  const g = newGame();
  g.update(config.WAVE_REST + 0.1);
  g.hp = 16;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, null);
  g.hp = 15;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp');
  g.hp = 12;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp', 'open dialog is not replaced');
  g.declineAd();
  assert.strictEqual(g.adPrompt, null);
  g.hp = 13;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, null);
  g.hp = 12;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp');
  g.declineAd();
  g.hp = 9;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp');
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

test('watching an ad can start a crit or slow moment', () => {
  const g = newGame();
  const random = Math.random;
  Math.random = () => 0.1;
  const moment = g.tryMoment();
  Math.random = random;
  assert.strictEqual(moment.kind, 'crit');
  assert.strictEqual(moment.timer, config.MOMENT.DURATION);
  g.update(config.MOMENT.DURATION);
  assert.strictEqual(g.moment, null);
});

test('plot grows up to 3 crops and collects them all', () => {
  const g = newGame();
  g.update(10);
  assert.strictEqual(g.plotReady, 1);
  g.update(20);
  assert.strictEqual(g.plotReady, 3);
  g.update(30);
  assert.strictEqual(g.plotReady, 3);
  const before = g.gold;
  const got = g.collectPlot();
  assert.strictEqual(got.gold, 24);
  assert.strictEqual(g.gold, before + 24);
  assert.strictEqual(g.plotReady, 0);
  assert.strictEqual(g.collectPlot().ok, false);
});

test('moveTower relocates onto an empty slot and keeps level', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  const moved = g.moveTower(3, 3, 4, 4);
  assert.strictEqual(moved.ok, true);
  assert.strictEqual(g.towerAt(3, 3), undefined);
  const t = g.towerAt(4, 4);
  assert.strictEqual(t.type, 'scarecrow');
  assert.strictEqual(t.level, 2);
  assert.strictEqual(g.gold, 10);
});

test('moveTower swaps when the destination is occupied', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  g.gold = 30;
  g.placeTower('sticky', 4, 4);
  const swapped = g.moveTower(3, 3, 4, 4);
  assert.strictEqual(swapped.ok, true);
  assert.strictEqual(swapped.swapped, true);
  assert.strictEqual(g.towerAt(4, 4).type, 'scarecrow');
  assert.strictEqual(g.towerAt(4, 4).level, 2);
  assert.strictEqual(g.towerAt(3, 3).type, 'sticky');
  assert.strictEqual(g.towerAt(3, 3).level, 1);
});

test('moveTower rejects cells that are not build slots', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  assert.strictEqual(g.moveTower(3, 3, 0, 2).ok, false);
  assert.strictEqual(g.towerAt(3, 3).type, 'scarecrow');
});

test('replaceTower sells the old tower then places the new one', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  const before = g.gold;
  const r = g.replaceTower('sticky', 3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.towerAt(3, 3).type, 'sticky');
  assert.strictEqual(g.towerAt(3, 3).level, 1);
  assert.strictEqual(g.gold, before + 62 - 30);
});

test('two same-level towers merge into the next level', () => {
  const g = newGame();
  g.gold = 500;
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  g.placeTower('scarecrow', 4, 4);
  g.upgradeTowerAt(4, 4);
  const gold = g.gold;
  const r = g.mergeTower(3, 3, 4, 4);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.towerAt(3, 3), undefined);
  const t = g.towerAt(4, 4);
  assert.strictEqual(t.type, 'scarecrow');
  assert.strictEqual(t.level, 3);
  assert.strictEqual(t.invested, 180);
  assert.strictEqual(g.towers.length, 1);
  assert.strictEqual(g.gold, gold);
});

test('max level or mismatched towers do not merge', () => {
  const g = newGame();
  g.gold = 500;
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  g.upgradeTowerAt(3, 3);
  g.placeTower('scarecrow', 4, 4);
  g.upgradeTowerAt(4, 4);
  g.upgradeTowerAt(4, 4);
  assert.strictEqual(g.mergeTower(3, 3, 4, 4).ok, false);
  assert.strictEqual(g.towers.length, 2);
  g.placeTower('sticky', 3, 1);
  assert.strictEqual(g.mergeTower(3, 1, 4, 4).ok, false);
  assert.strictEqual(g.towerAt(3, 1).type, 'sticky');
  assert.strictEqual(g.towerAt(4, 4).level, 3);
});

test('toolbar drop on a level-1 twin upgrades it to level 2', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  const r = g.absorbTower('scarecrow', 3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.upgraded, true);
  const t = g.towerAt(3, 3);
  assert.strictEqual(t.level, 2);
  assert.strictEqual(t.invested, 100);
  assert.strictEqual(g.gold, 0);
  assert.strictEqual(g.towers.length, 1);
});

test('toolbar drop on a different tower does not replace it', () => {
  const g = newGame();
  g.placeTower('sticky', 3, 3);
  const gold = g.gold;
  const r = g.absorbTower('scarecrow', 3, 3);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'occupied');
  assert.strictEqual(g.towerAt(3, 3).type, 'sticky');
  assert.strictEqual(g.gold, gold);
});

test('toolbar drop on a higher same tower does not upgrade it', () => {
  const g = newGame();
  g.gold = 200;
  g.placeTower('scarecrow', 3, 3);
  g.upgradeTowerAt(3, 3);
  const before = g.gold;
  const r = g.absorbTower('scarecrow', 3, 3);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'level');
  assert.strictEqual(g.towerAt(3, 3).level, 2);
  assert.strictEqual(g.gold, before);
});

test('replaceTower keeps the old tower when gold is short', () => {
  const g = newGame();
  g.placeTower('sticky', 3, 3);
  g.gold = 0;
  const r = g.replaceTower('windmill', 3, 3);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'gold');
  assert.strictEqual(g.towerAt(3, 3).type, 'sticky');
  assert.strictEqual(g.gold, 0);
});
