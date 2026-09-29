const test = require('node:test');
const assert = require('node:assert');
const { createEnemy, applyWaveScale, updateEnemy, applyDamage, _resetIds } = require('../js/enemy');
const { buildPath } = require('../js/path');
const config = require('../js/config');

test('later waves raise hp and speed', () => {
  const early = createEnemy('aphid', config);
  applyWaveScale(early, 0, config);
  assert.strictEqual(early.hp, 20);
  assert.strictEqual(early.speed, 1.2);
  const wave2 = createEnemy('aphid', config);
  applyWaveScale(wave2, 1, config);
  assert.strictEqual(wave2.hp, Math.round(10 * 1.05) * 2);
  assert.ok(Math.abs(wave2.speed - 1.2 * 1.05) < 1e-9);
  const wave3 = createEnemy('aphid', config);
  applyWaveScale(wave3, 2, config);
  assert.strictEqual(wave3.hp, Math.round(10 * 1.1) * 2);
  assert.ok(Math.abs(wave3.speed - 1.2 * 1.1) < 1e-9);
  const wave4 = createEnemy('aphid', config);
  applyWaveScale(wave4, 3, config);
  assert.strictEqual(wave4.hp, Math.round(10 * 1.15) * 2);
  assert.ok(Math.abs(wave4.speed - 1.2 * 1.15) < 1e-9);
  const wave5 = createEnemy('aphid', config);
  applyWaveScale(wave5, 4, config);
  assert.strictEqual(wave5.hp, Math.round(10 * 1.3) * 2);
  assert.ok(Math.abs(wave5.speed - 1.2 * 1.3) < 1e-9);
  const wave6 = createEnemy('aphid', config);
  applyWaveScale(wave6, 5, config);
  assert.strictEqual(wave6.hp, Math.round(10 * 1.4) * 2);
  assert.ok(Math.abs(wave6.speed - 1.2 * 1.4) < 1e-9);
  const wave7 = createEnemy('aphid', config);
  applyWaveScale(wave7, 6, config);
  assert.strictEqual(wave7.hp, Math.round(10 * 1.45) * 2);
  assert.ok(Math.abs(wave7.speed - 1.2 * 1.45) < 1e-9);
  const wave8 = createEnemy('aphid', config);
  applyWaveScale(wave8, 7, config);
  assert.strictEqual(wave8.hp, Math.round(10 * 1.55) * 2);
  assert.ok(Math.abs(wave8.speed - 1.2 * 1.55) < 1e-9);
  const late = createEnemy('aphid', config);
  applyWaveScale(late, 9, config);
  assert.strictEqual(late.hp, Math.round(10 * 1.65) * 2);
  assert.ok(Math.abs(late.speed - 1.2 * 1.65) < 1e-9);
});

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
