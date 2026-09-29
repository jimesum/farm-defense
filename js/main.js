// js/main.js
const { buildPath, positionAt, pathCells, rollBuildSlots } = require('./path');
const { createEnemy, applyWaveScale, updateEnemy, applyDamage } = require('./enemy');
const tower = require('./tower');
const { createWaveState, updateWave, isWaveCleared } = require('./wave');

const TOWER_TYPES = ['sticky', 'scarecrow', 'windmill', 'web'];

class Game {
  constructor(config, buildSlots) {
    this.config = config;
    this.path = buildPath(config.PATH_WAYPOINTS);
    this.blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);
    this.buildSlots = buildSlots || rollBuildSlots(config);
    this.gold = config.INITIAL_GOLD;
    this.hp = config.INITIAL_HP;
    this.towers = [];
    this.enemies = [];
    this.waveIndex = -1;
    this.waveState = null;
    this.state = 'prep';
    this.restTimer = config.WAVE_REST;
    this.bossAdOffered = false;
    this.adPrompt = null;
    this.nextHpAd = config.AD.HP_PROMPT;
    this.events = [];
    this.fx = [];
    this.plotReady = 0;
    this.plotTimer = 0;
    this.granaryFlash = 0;
    this.moment = null;
  }

  towerAt(col, row) {
    return this.towers.find(t => t.col === col && t.row === row);
  }

  placeTower(type, col, row) {
    const def = this.config.TOWERS[type];
    if (!def) return { ok: false, reason: 'unknown' };
    if (!this.isBuildSlot(col, row) || !tower.canPlace(col, row, this.towers, this.blocked, this.config.GRID_COLS, this.config.GRID_ROWS)) {
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

  moveTower(fromCol, fromRow, toCol, toRow) {
    const t = this.towerAt(fromCol, fromRow);
    if (!t) return { ok: false, reason: 'empty' };
    if (fromCol === toCol && fromRow === toRow) return { ok: true, swapped: false };
    if (!this.isBuildSlot(toCol, toRow)) return { ok: false, reason: 'blocked' };
    const other = this.towerAt(toCol, toRow);
    if (other) {
      other.col = fromCol;
      other.row = fromRow;
    }
    t.col = toCol;
    t.row = toRow;
    return { ok: true, swapped: !!other };
  }

  canMerge(source, target) {
    if (!source || !target || source === target) return false;
    if (source.type !== target.type || source.level !== target.level) return false;
    return source.level < this.config.TOWERS[source.type].levels.length;
  }

  mergeTower(fromCol, fromRow, toCol, toRow) {
    const source = this.towerAt(fromCol, fromRow);
    const target = this.towerAt(toCol, toRow);
    if (!this.canMerge(source, target)) return { ok: false, reason: 'mismatch' };
    target.level += 1;
    target.invested += source.invested;
    this.towers = this.towers.filter(x => x !== source);
    return { ok: true, level: target.level };
  }

  absorbTower(type, col, row) {
    const def = this.config.TOWERS[type];
    if (!def) return { ok: false, reason: 'unknown' };
    const old = this.towerAt(col, row);
    if (!old) return this.placeTower(type, col, row);
    // 工具栏拿出的是 1 级。叠到同种 1 级上，升到 2 级。
    if (old.type === type && old.level === 1 && def.levels.length > 1) {
      if (this.gold < def.cost) return { ok: false, reason: 'gold' };
      this.gold -= def.cost;
      old.level = 2;
      old.invested += def.cost;
      return { ok: true, upgraded: true, level: 2 };
    }
    if (old.type === type) return { ok: false, reason: 'level' };
    return { ok: false, reason: 'occupied' };
  }

  replaceTower(type, col, row) {
    const def = this.config.TOWERS[type];
    if (!def) return { ok: false, reason: 'unknown' };
    const old = this.towerAt(col, row);
    if (!old) return this.placeTower(type, col, row);
    if (!this.isBuildSlot(col, row)) return { ok: false, reason: 'blocked' };
    const refund = tower.sellValue(old, this.config);
    if (this.gold + refund < def.cost) return { ok: false, reason: 'gold' };
    this.towers = this.towers.filter(x => x !== old);
    this.gold += refund;
    this.gold -= def.cost;
    this.towers.push(tower.createTower(type, col, row, this.config));
    return { ok: true };
  }

  rollAdReward() {
    return 'tower';
  }

  tryMoment() {
    const moment = this.config.MOMENT;
    if (Math.random() >= moment.CHANCE) return null;
    const kind = Math.random() < 0.5 ? 'crit' : 'slow';
    this.moment = { kind, timer: moment.DURATION };
    return this.moment;
  }

  consumeAdPrompt() {
    if (this.adPrompt === 'boss') this.bossAdOffered = true;
    this.adPrompt = null;
  }

  declineAd() {
    this.consumeAdPrompt();
  }

  _spawnHitFx(towerObj, enemy, pos, amount) {
    const from = { x: towerObj.col + 0.5, y: towerObj.row + 0.5 };
    if (towerObj.type === 'web') {
      enemy.chip = (enemy.chip || 0) + amount;
      if ((towerObj.fxCooldown || 0) <= 0) {
        towerObj.fxCooldown = 0.28;
        this.fx.push({
          kind: 'pulse', x: pos.x, y: pos.y, color: '#3dff9a', life: 0.4, max: 0.4,
        });
      }
      if (enemy.chip >= 1) {
        const n = Math.floor(enemy.chip);
        enemy.chip -= n;
        this.fx.push({
          kind: 'float', x: pos.x, y: pos.y - 0.15,
          text: '-' + n, color: '#ff6b6b', life: 0.55, max: 0.55,
        });
      }
      return;
    }
    if (towerObj.type === 'scarecrow') {
      towerObj.stab = { x: pos.x, y: pos.y, at: Date.now() / 1000 };
      if (amount >= 1) {
        this.fx.push({
          kind: 'float', x: pos.x, y: pos.y - 0.15,
          text: '-' + Math.round(amount), color: '#ff6b6b', life: 0.55, max: 0.55,
        });
      }
      return;
    }
    this.fx.push({
      kind: 'bolt', x1: from.x, y1: from.y, x2: pos.x, y2: pos.y,
      color: '#7ecbff', life: 0.42, max: 0.42,
    });
    if (amount >= 1) {
      this.fx.push({
        kind: 'float', x: pos.x, y: pos.y - 0.15,
        text: '-' + Math.round(amount), color: '#ff6b6b', life: 0.55, max: 0.55,
      });
    }
  }

  isBuildSlot(col, row) {
    return this.buildSlots.some(s => s.col === col && s.row === row);
  }

  grantRandomTower(col, row) {
    if (!this.isBuildSlot(col, row) || !tower.canPlace(col, row, this.towers, this.blocked, this.config.GRID_COLS, this.config.GRID_ROWS)) {
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
    if (this.waveIndex === this.config.WAVES.length - 1 && !this.bossAdOffered && !this.adPrompt) {
      this.adPrompt = 'boss';
    }
  }

  _tickPlot(dt) {
    const plot = this.config.PLOT;
    if (this.plotReady >= plot.max) return;
    this.plotTimer += dt;
    while (this.plotTimer >= plot.interval && this.plotReady < plot.max) {
      this.plotTimer -= plot.interval;
      this.plotReady += 1;
    }
    if (this.plotReady >= plot.max) this.plotTimer = 0;
  }

  collectPlot() {
    if (this.plotReady <= 0) return { ok: false, gold: 0 };
    const gold = this.plotReady * this.config.PLOT.value;
    this.gold += gold;
    this.plotReady = 0;
    this.plotTimer = 0;
    return { ok: true, gold };
  }

  _ageFx(dt) {
    if (this.granaryFlash > 0) this.granaryFlash -= dt;
    for (const fx of this.fx) fx.life -= dt;
    this.fx = this.fx.filter(fx => fx.life > 0).slice(-48);
    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
    }
  }

  update(dt) {
    this._ageFx(dt);
    if (this.moment) {
      this.moment.timer -= dt;
      if (this.moment.timer <= 0) this.moment = null;
    }
    if (this.state === 'won' || this.state === 'lost') return;
    this._tickPlot(dt);

    if (this.state === 'prep') {
      this.restTimer -= dt;
      if (this.restTimer <= 0) this._startNextWave();
      return;
    }

    // combat：生成
    const spawns = updateWave(this.waveState, dt);
    for (const type of spawns) {
      const enemy = createEnemy(type, this.config);
      applyWaveScale(enemy, this.waveIndex, this.config);
      this.enemies.push(enemy);
    }

    // 塔攻击
    for (const t of this.towers) {
      const events = tower.updateTower(t, this.enemies, dt, this.config, this.path, this.moment);
      if (t.fxCooldown > 0) t.fxCooldown -= dt;
      for (const ev of events) {
        const e = this.enemies.find(x => x.id === ev.enemyId);
        if (!e || !e.alive) continue;
        const pos = positionAt(this.path, e.distance);
        e.hitFlash = 0.15;
        this._spawnHitFx(t, e, pos, ev.amount);
        if (applyDamage(e, ev.amount)) {
          this.gold += e.reward;
          this.events.push({ type: 'kill', enemyType: e.type, reward: e.reward });
          this.fx.push({
            kind: 'pop', x: pos.x, y: pos.y, emoji: e.emoji,
            scale: e.type === 'locust' ? 1.45 : e.type === 'snail' ? 1.15 : 1,
            spin: e.id % 2 === 0 ? 1 : -1,
            life: 0.48, max: 0.48,
          });
          this.fx.push({
            kind: 'float', x: pos.x, y: pos.y - 0.35,
            text: '+' + e.reward, color: '#ffd94d', life: 0.7, max: 0.7,
          });
        }
      }
    }

    // 敌人移动与漏怪
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const pos = positionAt(this.path, e.distance);
      const slow = tower.slowFactorAt(pos, this.towers, this.config, this.moment);
      updateEnemy(e, this.path, dt, slow);
      if (e.reachedEnd) {
        this.hp -= e.damage;
        this.granaryFlash = 0.45;
        const granary = this.config.GRANARY;
        this.fx.push({
          kind: 'float', x: granary.col + 0.5, y: granary.row + 0.15,
          text: '-' + e.damage, color: '#ff5a5a', life: 0.8, max: 0.8,
        });
        this.events.push({ type: 'leak', enemyType: e.type, damage: e.damage });
      }
    }
    this.enemies = this.enemies.filter(e => e.alive);

    // 血量广告触发
    // 血量到 15 提示一次。关掉之后，再降 3 点再提示。框还开着就不重复弹。
    if (!this.adPrompt && this.hp > 0 && this.hp <= this.nextHpAd) {
      this.adPrompt = 'hp';
      this.nextHpAd = this.hp - 3;
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
