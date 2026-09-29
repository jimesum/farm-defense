const GROUP_GAP = 2;

function createWaveState(waveIndex, config) {
  const groups = config.WAVES[waveIndex].groups.map(g => ({
    type: g.type,
    count: g.count,
    interval: g.interval,
    spawned: 0,
    timer: 0,
  }));
  const from = config.WAVE_EXTRA_FROM == null ? 4 : config.WAVE_EXTRA_FROM;
  const extra = config.WAVE_EXTRA_COUNT || 0;
  if (waveIndex >= from && extra > 0) {
    groups.push({
      type: config.WAVE_EXTRA_TYPE || 'aphid',
      count: extra,
      interval: config.WAVE_EXTRA_INTERVAL || 0.8,
      spawned: 0,
      timer: 0,
    });
  }
  const doubleFrom = config.WAVE_DOUBLE_FROM == null ? 7 : config.WAVE_DOUBLE_FROM;
  if (waveIndex >= doubleFrom) {
    for (const g of groups) g.count *= 2;
  }
  const locustAt = config.WAVE_LOCUST_AT || [];
  if (locustAt.indexOf(waveIndex) !== -1) {
    groups.push({
      type: 'locust',
      count: 1,
      interval: 1.0,
      spawned: 0,
      timer: 0,
    });
  }
  const countMult = config.WAVE_COUNT_MULT || 1;
  if (countMult !== 1) {
    for (const g of groups) g.count *= countMult;
  }
  return { waveIndex, groups, activeGroup: 0, gapTimer: 0, done: false };
}

function updateWave(state, dt) {
  const spawns = [];
  if (state.done) return spawns;
  if (state.gapTimer > 0) {
    state.gapTimer -= dt;
    return spawns;
  }
  const g = state.groups[state.activeGroup];
  if (!g) {
    state.done = true;
    return spawns;
  }
  g.timer -= dt;
  while (g.spawned < g.count && g.timer <= 0) {
    spawns.push(g.type);
    g.spawned += 1;
    g.timer += g.interval;
  }
  if (g.spawned >= g.count) {
    state.activeGroup += 1;
    if (state.activeGroup >= state.groups.length) {
      state.done = true;
    } else {
      state.gapTimer = GROUP_GAP;
    }
  }
  return spawns;
}

function isWaveCleared(state, enemies) {
  return state.done && enemies.every(e => !e.alive);
}

module.exports = { createWaveState, updateWave, isWaveCleared };
