const test = require('node:test');
const assert = require('node:assert');
const {
  createTower, stats, canPlace, upgradeCost, applyUpgrade,
  sellValue, inRange, updateTower, slowFactorAt,
} = require('../js/tower');
const { buildPath, pathCells } = require('../js/path');
const { createEnemy, _resetIds } = require('../js/enemy');
const config = require('../js/config');

const blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);

test('canPlace rejects path, occupied, and out-of-grid cells', () => {
  const towers = [createTower('scarecrow', 3, 3, config)];
  assert.strictEqual(canPlace(3, 3, towers, blocked, 8, 12), false, 'occupied');
  assert.strictEqual(canPlace(0, 2, towers, blocked, 8, 12), false, 'on path');
  assert.strictEqual(canPlace(-1, 0, towers, blocked, 8, 12), false, 'out of grid');
  assert.strictEqual(canPlace(4, 4, towers, blocked, 8, 12), true);
});

test('upgrade cost follows multipliers, null at max level', () => {
  const t = createTower('scarecrow', 3, 3, config); // cost 50
  assert.strictEqual(upgradeCost(t, config), 40);  // 50 * 0.8
  applyUpgrade(t, config);
  assert.strictEqual(t.level, 2);
  assert.strictEqual(t.invested, 90);
  assert.strictEqual(upgradeCost(t, config), 60);  // 50 * 1.2
  applyUpgrade(t, config);
  assert.strictEqual(t.level, 3);
  assert.strictEqual(upgradeCost(t, config), null);
});

test('sellValue returns 70% of invested', () => {
  const t = createTower('scarecrow', 3, 3, config);
  applyUpgrade(t, config); // invested 90
  assert.strictEqual(sellValue(t, config), 63);
});

test('inRange uses cell-center distance', () => {
  const t = createTower('scarecrow', 3, 3, config);
  assert.strictEqual(inRange(t, 2, { x: 5.5, y: 3.5 }), true);
  assert.strictEqual(inRange(t, 2, { x: 6.5, y: 3.5 }), false);
});

test('scarecrow attacks furthest enemy in range, respects fireRate', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('scarecrow', 3, 2, config); // range 2, center on the row-2 path
  const near = createEnemy('aphid', config);
  near.distance = 3.0; // pos (2.5, 2.5), 1 cell from tower
  const far = createEnemy('aphid', config);
  far.distance = 5.0;  // pos (4.5, 2.5), 1 cell from tower, further along the path
  const events = updateTower(t, [near, far], 0.1, config, path);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].enemyId, far.id);
  assert.strictEqual(events[0].amount, 5);
  // 冷却中不再攻击
  assert.strictEqual(updateTower(t, [near, far], 0.1, config, path).length, 0);
  // 冷却结束后再次攻击
  assert.strictEqual(updateTower(t, [near, far], 1.0, config, path).length, 1);
});

test('windmill hits all enemies in range', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('windmill', 3, 2, config); // range 1, center (3.5, 2.5) on the path
  const a = createEnemy('aphid', config);
  a.distance = 3.5; // (3.0, 2.5), 0.5 cells away
  const b = createEnemy('aphid', config);
  b.distance = 4.5; // (4.0, 2.5), 0.5 cells away
  const c = createEnemy('aphid', config);
  c.distance = 10.0; // vertical segment, out of range
  const events = updateTower(t, [a, b, c], 0.1, config, path);
  assert.strictEqual(events.length, 2);
});

test('web deals dps * dt to all in range without cooldown', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('web', 3, 2, config); // dps 2, range 1, center on the path
  const a = createEnemy('aphid', config);
  a.distance = 4.0;
  const e1 = updateTower(t, [a], 0.5, config, path);
  const e2 = updateTower(t, [a], 0.5, config, path);
  assert.strictEqual(e1[0].amount, 1);
  assert.strictEqual(e2.length, 1, 'no cooldown for dps towers');
});

test('slowFactorAt takes max slow in range', () => {
  const t1 = createTower('sticky', 3, 1, config); // slow 0.3
  const t2 = createTower('sticky', 3, 3, config);
  t2.level = 3; // slow 0.6, range 2
  const pos = { x: 3.5, y: 2.5 };
  assert.strictEqual(slowFactorAt(pos, [t1, t2], config), 0.6);
  assert.strictEqual(slowFactorAt({ x: 0.5, y: 11.5 }, [t1, t2], config), 0);
});
