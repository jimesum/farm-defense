let nextId = 1;

function createEnemy(type, config) {
  const def = config.ENEMIES[type];
  return {
    id: nextId++,
    type,
    emoji: def.emoji,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    reward: def.reward,
    damage: def.damage,
    distance: 0,
    alive: true,
    reachedEnd: false,
  };
}

function applyWaveScale(enemy, waveIndex, config) {
  const step = Math.max(0, waveIndex);
  const lateFrom = config.WAVE_LATE_FROM == null ? 5 : config.WAVE_LATE_FROM;
  const finalFrom = config.WAVE_FINAL_FROM == null ? 7 : config.WAVE_FINAL_FROM;
  const hardFrom = config.WAVE_HARD_FROM == null ? 4 : config.WAVE_HARD_FROM;
  const late = step >= lateFrom;
  const final = step >= finalFrom;
  const hard = step >= hardFrom;
  const hpRate = 1 + step * config.WAVE_HP_STEP + (late ? config.WAVE_LATE_HP_STEP : 0) + (final ? config.WAVE_FINAL_HP_STEP : 0) + (hard ? config.WAVE_HARD_HP_STEP : 0);
  const speedRate = 1 + step * config.WAVE_SPEED_STEP + (late ? config.WAVE_LATE_SPEED_STEP : 0) + (final ? config.WAVE_FINAL_SPEED_STEP : 0) + (hard ? config.WAVE_HARD_SPEED_STEP : 0);
  const hpMult = config.WAVE_HP_MULT || 1;
  const hp = Math.round(enemy.hp * hpRate) * hpMult;
  enemy.hp = hp;
  enemy.maxHp = hp;
  enemy.speed *= speedRate;
  return enemy;
}

function updateEnemy(enemy, path, dt, slowFactor) {
  if (!enemy.alive) return;
  const speed = enemy.speed * (1 - slowFactor);
  enemy.distance += speed * dt;
  if (enemy.distance >= path.totalLength) {
    enemy.reachedEnd = true;
    enemy.alive = false;
  }
}

function applyDamage(enemy, amount) {
  enemy.hp -= amount;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    return true;
  }
  return false;
}

function _resetIds() {
  nextId = 1;
}

module.exports = { createEnemy, applyWaveScale, updateEnemy, applyDamage, _resetIds };
