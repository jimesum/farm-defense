const test = require('node:test');
const assert = require('node:assert');
const { createEnemy, updateEnemy, applyDamage, _resetIds } = require('../js/enemy');
const { buildPath } = require('../js/path');
const config = require('../js/config');

test('createEnemy reads stats from config', () => {
  _resetIds();
  const e = createEnemy('aphid', config);
  assert.strictEqual(e.hp, 10);
  assert.strictEqual(e.maxHp, 10);
  assert.strictEqual(e.speed, 1.2);
  assert.strictEqual(e.distance, 0);
  assert.strictEqual(e.alive, true);
  assert.strictEqual(e.reachedEnd, false);
});

test('updateEnemy moves along path by speed * dt', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  const e = createEnemy('mouse', config); // speed 2.0
  updateEnemy(e, path, 1.0, 0);
  assert.strictEqual(e.distance, 2.0);
});

test('slowFactor reduces movement', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  const e = createEnemy('mouse', config);
  updateEnemy(e, path, 1.0, 0.5);
  assert.strictEqual(e.distance, 1.0);
});

test('enemy reaching end is flagged and no longer alive', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  const e = createEnemy('mouse', config);
  updateEnemy(e, path, 100, 0);
  assert.strictEqual(e.reachedEnd, true);
  assert.strictEqual(e.alive, false);
});

test('applyDamage returns true on kill', () => {
  const e = createEnemy('aphid', config);
  assert.strictEqual(applyDamage(e, 4), false);
  assert.strictEqual(e.hp, 6);
  assert.strictEqual(applyDamage(e, 6), true);
  assert.strictEqual(e.alive, false);
});
