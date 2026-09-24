const { positionAt } = require('./path');

function createTower(type, col, row, config) {
  return {
    type,
    col,
    row,
    level: 1,
    cooldown: 0,
    invested: config.TOWERS[type].cost,
  };
}

function stats(tower, config) {
  return config.TOWERS[tower.type].levels[tower.level - 1];
}

function canPlace(col, row, towers, blockedCells, cols, rows) {
  if (col < 0 || col >= cols || row < 0 || row >= rows) return false;
  if (blockedCells.has(col + ',' + row)) return false;
  return !towers.some(t => t.col === col && t.row === row);
}

function upgradeCost(tower, config) {
  if (tower.level >= config.TOWERS[tower.type].levels.length) return null;
  const mult = config.UPGRADE_COST_MULTIPLIERS[tower.level - 1];
  return Math.round(config.TOWERS[tower.type].cost * mult);
}

function applyUpgrade(tower, config) {
  const cost = upgradeCost(tower, config);
  if (cost === null) return;
  tower.level += 1;
  tower.invested += cost;
}

function sellValue(tower, config) {
  // 1e-9 avoids 90 * 0.7 === 62.999… in IEEE doubles
  return Math.floor(tower.invested * config.SELL_REFUND_RATE + 1e-9);
}

function inRange(tower, range, pos) {
  const dx = pos.x - (tower.col + 0.5);
  const dy = pos.y - (tower.row + 0.5);
  return Math.hypot(dx, dy) <= range;
}

function updateTower(tower, enemies, dt, config, path) {
  const s = stats(tower, config);
  const events = [];
  if (s.slow) return events; // 减速塔不出伤，由 slowFactorAt 统一处理

  const targets = enemies.filter(e =>
    e.alive && inRange(tower, s.range, positionAt(path, e.distance))
  );

  if (s.dps) {
    for (const e of targets) {
      events.push({ enemyId: e.id, amount: s.dps * dt });
    }
    return events;
  }

  tower.cooldown -= dt;
  if (tower.cooldown > 0 || targets.length === 0) return events;
  tower.cooldown = 1 / s.fireRate;

  if (tower.type === 'windmill') {
    for (const e of targets) {
      events.push({ enemyId: e.id, amount: s.damage });
    }
  } else {
    targets.sort((a, b) => b.distance - a.distance);
    events.push({ enemyId: targets[0].id, amount: s.damage });
  }
  return events;
}

function slowFactorAt(pos, towers, config) {
  let max = 0;
  for (const t of towers) {
    const s = stats(t, config);
    if (s.slow && inRange(t, s.range, pos)) {
      max = Math.max(max, s.slow);
    }
  }
  return max;
}

module.exports = {
  createTower, stats, canPlace, upgradeCost, applyUpgrade,
  sellValue, inRange, updateTower, slowFactorAt,
};
