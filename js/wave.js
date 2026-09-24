const GROUP_GAP = 2;

function createWaveState(waveIndex, config) {
  const groups = config.WAVES[waveIndex].groups.map(g => ({
    type: g.type,
    count: g.count,
    interval: g.interval,
    spawned: 0,
    timer: 0,
  }));
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
