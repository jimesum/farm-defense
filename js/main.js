// js/main.js
const { buildPath, positionAt, pathCells } = require('./path');
const { createEnemy, updateEnemy, applyDamage } = require('./enemy');
const tower = require('./tower');
const { createWaveState, updateWave, isWaveCleared } = require('./wave');

const TOWER_TYPES = ['sticky', 'scarecrow', 'windmill', 'web'];

class Game {
  constructor(config) {
    this.config = config;
    this.path = buildPath(config.PATH_WAYPOINTS);
    this.blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);
    this.gold = config.INITIAL_GOLD;
    this.hp = config.INITIAL_HP;
    this.towers = [];
    this.enemies = [];
    this.waveIndex = -1;
    this.waveState = null;
    this.state = 'prep';
    this.restTimer = config.WAVE_REST;
    this.adOffered = false;
    this.adPrompt = null;
    this.events = [];
  }

  towerAt(col, row) {
    return this.towers.find(t => t.col === col && t.row === row);
  }

  placeTower(type, col, row) {
    const def = this.config.TOWERS[type];
    if (!def) return { ok: false, reason: 'unknown' };
    if (!tower.canPlace(col, row, this.towers, this.blocked, this.config.GRID_COLS, this.config.GRID_ROWS)) {
      return { ok: false, reason: 'blocked' };
    }
    if (this.gold < def.cost) return { ok: false, reason: 'gold' };
    this.gold -= def.cost;
    this.towers.push(tower.createTower(type, col, row, this.config));
    return { ok: true };
  }

  upgradeTowerAt(col, row) {
    const t = this.towerAt(col, row);
    if (!t) return { ok: false, reason: 'empty' };
    const cost = tower.upgradeCost(t, this.config);
    if (cost === null) return { ok: false, reason: 'maxed' };
    if (this.gold < cost) return { ok: false, reason: 'gold' };
    this.gold -= cost;
    tower.applyUpgrade(t, this.config);
    return { ok: true };
  }

  sellTowerAt(col, row) {
    const t = this.towerAt(col, row);
    if (!t) return { ok: false };
    this.gold += tower.sellValue(t, this.config);
    this.towers = this.towers.filter(x => x !== t);
    return { ok: true };
  }

  rollAdReward() {
    return Math.random() < 0.5 ? 'tower' : 'upgrade';
  }

  consumeAdPrompt() {
    this.adOffered = true;
    this.adPrompt = null;
  }

  declineAd() {
    this.consumeAdPrompt();
  }

  grantRandomTower(col, row) {
    if (!tower.canPlace(col, row, this.towers, this.blocked, this.config.GRID_COLS, this.config.GRID_ROWS)) {
      return { ok: false, reason: 'blocked' };
    }
    const type = TOWER_TYPES[Math.floor(Math.random() * TOWER_TYPES.length)];
    const t = tower.createTower(type, col, row, this.config);
    t.invested = 0; // 免费塔出售不返金币，防刷
    this.towers.push(t);
    return { ok: true, type };
  }

  grantRandomUpgrade() {
    const upgradeable = this.towers.filter(t => tower.upgradeCost(t, this.config) !== null);
    if (upgradeable.length === 0) {
      this.gold += this.config.AD.GOLD_FALLBACK;
      return { applied: 'gold' };
    }
    const t = upgradeable[Math.floor(Math.random() * upgradeable.length)];
    tower.applyUpgrade(t, this.config);
    return { applied: 'upgrade', tower: t };
  }

  _startNextWave() {
    this.waveIndex += 1;
    this.waveState = createWaveState(this.waveIndex, this.config);
    this.state = 'combat';
    this.events.push({ type: 'waveStart', wave: this.waveIndex + 1 });
    if (this.waveIndex === this.config.WAVES.length - 1 && !this.adOffered) {
      this.adPrompt = 'boss';
    }
  }

  update(dt) {
    if (this.state === 'won' || this.state === 'lost') return;

    if (this.state === 'prep') {
      this.restTimer -= dt;
      if (this.restTimer <= 0) this._startNextWave();
      return;
    }

    // combat：生成
    const spawns = updateWave(this.waveState, dt);
    for (const type of spawns) {
      this.enemies.push(createEnemy(type, this.config));
    }

    // 塔攻击
    for (const t of this.towers) {
      const events = tower.updateTower(t, this.enemies, dt, this.config, this.path);
      for (const ev of events) {
        const e = this.enemies.find(x => x.id === ev.enemyId);
        if (!e || !e.alive) continue;
        if (applyDamage(e, ev.amount)) {
          this.gold += e.reward;
          this.events.push({ type: 'kill', enemyType: e.type, reward: e.reward });
        }
      }
    }

    // 敌人移动与漏怪
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const pos = positionAt(this.path, e.distance);
      const slow = tower.slowFactorAt(pos, this.towers, this.config);
      updateEnemy(e, this.path, dt, slow);
      if (e.reachedEnd) {
        this.hp -= e.damage;
        this.events.push({ type: 'leak', enemyType: e.type, damage: e.damage });
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // 血量广告触发
    if (!this.adOffered && this.hp > 0 && this.hp <= this.config.INITIAL_HP * this.config.AD.HP_THRESHOLD) {
      this.adPrompt = 'hp';
    }

    // 胜负判定
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'lost';
      this.events.push({ type: 'lose' });
      return;
    }
    if (isWaveCleared(this.waveState, this.enemies)) {
      if (this.waveIndex >= this.config.WAVES.length - 1) {
        this.state = 'won';
        this.events.push({ type: 'win' });
      } else {
        this.state = 'prep';
        this.restTimer = this.config.WAVE_REST;
      }
    }
  }
}

module.exports = Game;
