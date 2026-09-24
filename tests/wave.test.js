const test = require('node:test');
const assert = require('node:assert');
const { createWaveState, updateWave, isWaveCleared } = require('../js/wave');
const config = require('../js/config');

test('first enemy spawns immediately, then by interval', () => {
  const s = createWaveState(0, config); // 6 aphid @1.2
  assert.deepStrictEqual(updateWave(s, 0.016), ['aphid']);
  assert.deepStrictEqual(updateWave(s, 0.5), []);
  assert.deepStrictEqual(updateWave(s, 1.2), ['aphid']);
});

test('groups run sequentially with a gap', () => {
  const s = createWaveState(1, config); // 8 aphid @1.0, then 2 mouse @1.5
  let spawns = [];
  for (let t = 0; t < 8; t += 0.1) spawns = spawns.concat(updateWave(s, 0.1));
  assert.strictEqual(spawns.filter(x => x === 'aphid').length, 8);
  assert.strictEqual(spawns.filter(x => x === 'mouse').length, 0, 'second group waits for gap');
  // 越过 2 秒组间间隔
  for (let t = 0; t < 3; t += 0.1) spawns = spawns.concat(updateWave(s, 0.1));
  assert.ok(spawns.filter(x => x === 'mouse').length >= 1);
});

test('wave reports done after all groups spawned', () => {
  const s = createWaveState(0, config);
  for (let t = 0; t < 20; t += 0.1) updateWave(s, 0.1);
  assert.strictEqual(s.done, true);
  assert.deepStrictEqual(updateWave(s, 0.1), []);
});

test('isWaveCleared needs done state and no alive enemies', () => {
  const s = createWaveState(0, config);
  assert.strictEqual(isWaveCleared(s, []), false, 'still spawning');
  for (let t = 0; t < 20; t += 0.1) updateWave(s, 0.1);
  assert.strictEqual(isWaveCleared(s, [{ alive: true }]), false);
  assert.strictEqual(isWaveCleared(s, [{ alive: false }]), true);
  assert.strictEqual(isWaveCleared(s, []), true);
});
