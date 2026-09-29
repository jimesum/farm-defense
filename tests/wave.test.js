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
  const s = createWaveState(1, config); // 蚜虫打完才到田鼠
  const aphidCount = s.groups[0].count;
  let spawns = [];
  for (let t = 0; t < aphidCount; t += 0.1) spawns = spawns.concat(updateWave(s, 0.1));
  assert.strictEqual(spawns.filter(x => x === 'aphid').length, aphidCount);
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

test('waves from the fifth add extra aphids', () => {
  const early = createWaveState(3, config);
  assert.strictEqual(early.groups.reduce((n, g) => n + g.count, 0), 12);
  const wave5 = createWaveState(4, config);
  assert.strictEqual(wave5.groups.filter(g => g.type === 'aphid').reduce((n, g) => n + g.count, 0), 18);
  assert.strictEqual(wave5.groups.find(g => g.type === 'snail').count, 2);
  const wave7 = createWaveState(6, config);
  assert.strictEqual(wave7.groups.find(g => g.type === 'mouse').count, 12);
  const wave8 = createWaveState(7, config);
  assert.strictEqual(wave8.groups.find(g => g.type === 'sparrow').count, 24);
  assert.strictEqual(wave8.groups.find(g => g.type === 'snail').count, 8);
  assert.strictEqual(wave8.groups.filter(g => g.type === 'aphid').reduce((n, g) => n + g.count, 0), 52);
  assert.strictEqual(wave8.groups.find(g => g.type === 'locust').count, 2);
  const wave9 = createWaveState(8, config);
  assert.strictEqual(wave9.groups.find(g => g.type === 'locust').count, 2);
  const wave10 = createWaveState(9, config);
  assert.strictEqual(wave10.groups.find(g => g.type === 'locust').count, 4);
  assert.strictEqual(wave10.groups.filter(g => g.type === 'aphid').reduce((n, g) => n + g.count, 0), 36);
});

test('isWaveCleared needs done state and no alive enemies', () => {
  const s = createWaveState(0, config);
  assert.strictEqual(isWaveCleared(s, []), false, 'still spawning');
  for (let t = 0; t < 20; t += 0.1) updateWave(s, 0.1);
  assert.strictEqual(isWaveCleared(s, [{ alive: true }]), false);
  assert.strictEqual(isWaveCleared(s, [{ alive: false }]), true);
  assert.strictEqual(isWaveCleared(s, []), true);
});
