const test = require('node:test');
const assert = require('node:assert');
const config = require('../js/config');

test('grid and path defined', () => {
  assert.strictEqual(config.GRID_COLS, 8);
  assert.strictEqual(config.GRID_ROWS, 12);
  assert.ok(config.PATH_WAYPOINTS.length >= 2);
});

test('four tower types with 3 levels each', () => {
  const types = Object.keys(config.TOWERS);
  assert.deepStrictEqual(types.sort(), ['scarecrow', 'sticky', 'web', 'windmill']);
  for (const t of types) {
    assert.strictEqual(config.TOWERS[t].levels.length, 3);
    assert.ok(config.TOWERS[t].cost > 0);
    assert.ok(config.TOWERS[t].emoji.length > 0);
  }
});

test('tower levels grow in power', () => {
  const s = config.TOWERS.scarecrow.levels;
  assert.ok(s[1].damage > s[0].damage);
  assert.ok(s[2].damage > s[1].damage);
  const st = config.TOWERS.sticky.levels;
  assert.ok(st[1].slow > st[0].slow);
  assert.ok(st[2].slow > st[1].slow);
});

test('five enemy types', () => {
  const types = Object.keys(config.ENEMIES);
  assert.deepStrictEqual(types.sort(), ['aphid', 'locust', 'mouse', 'snail', 'sparrow']);
  assert.strictEqual(config.ENEMIES.locust.damage, 5);
  for (const t of types) {
    assert.ok(config.ENEMIES[t].hp > 0);
    assert.ok(config.ENEMIES[t].speed > 0);
    assert.ok(config.ENEMIES[t].reward > 0);
  }
});

test('ten waves, wave 10 contains locust boss', () => {
  assert.strictEqual(config.WAVES.length, 10);
  const last = config.WAVES[9];
  assert.ok(last.groups.some(g => g.type === 'locust'));
  for (const w of config.WAVES) {
    for (const g of w.groups) {
      assert.ok(config.ENEMIES[g.type], `unknown enemy type ${g.type}`);
      assert.ok(g.count > 0 && g.interval > 0);
    }
  }
});

test('economy and ad constants', () => {
  assert.strictEqual(config.INITIAL_GOLD, 100);
  assert.strictEqual(config.INITIAL_HP, 20);
  assert.strictEqual(config.SELL_REFUND_RATE, 0.7);
  assert.strictEqual(config.AD.HP_THRESHOLD, 0.3);
  assert.strictEqual(config.AD.GOLD_FALLBACK, 80);
  assert.strictEqual(config.UPGRADE_COST_MULTIPLIERS.length, 2);
});
