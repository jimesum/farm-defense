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

module.exports = { createEnemy, updateEnemy, applyDamage, _resetIds };
