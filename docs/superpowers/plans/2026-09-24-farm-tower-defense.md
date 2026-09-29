# 农场保卫战 Implementation Plan

> **当前实现已改为 Cocos Creator 3.8.8。** 下面的任务记录的是最初那版原生 Canvas 搭架子的步骤，不要再按「无引擎、只改 game.js」来改工程。现行结构、预览目录和两份规则如何对齐，以设计文档的「技术架构」为准：`docs/superpowers/specs/2026-09-24-farm-tower-defense-design.md`。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现设计文档 `docs/superpowers/specs/2026-09-24-farm-tower-defense-design.md` 描述的微信小游戏单关塔防：农场老板摆设施守粮仓，10 波 + Boss，含激励视频广告。

**Architecture:** 规则在 `js/`（CommonJS，Node 测试）和 `NewProject/assets/scripts/farm/`（ESM `.ts`）各有一份，必须对齐。Cocos 场景组件 `FarmStage` 把离屏 Canvas 贴进精灵并转发触摸。微信开发者工具打开的是 `NewProject/build/wechatgame`。

**Tech Stack:** Cocos Creator 3.8.8、微信小游戏构建（`separateEngine: false`）、CommonJS + ESM 双份规则、Node `node:test`（无需 npm 依赖）。

## Global Constraints

下列约束适用于当初的 Canvas 任务记录。现行工程改规则时以设计文档为准，并同时改 `js/` 与 `NewProject/assets/scripts/farm/`。

- 平台：微信小游戏，竖屏。预览目录是 `NewProject/build/wechatgame`，不要勾选分离引擎。
- `js/` 使用 CommonJS。Cocos 脚本使用 ESM，`import` 以 `.ts` 结尾。
- 禁止引入任何 npm 依赖；测试只用 Node 内置 `node:test` 和 `node:assert`，命令是 `node --test tests/*.test.js`
- 数值写在 `js/config.js`，并同步到 `config.ts`
- 广告位 ID 用占位符 `adunit-xxxxxxxxxxxxxxx`，上线前换成流量主里的真实广告位
- git 仓库已初始化（master 分支）

---

### Task 1: 项目脚手架

**Files:**
- Create: `game.json`
- Create: `project.config.json`
- Create: `game.js`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Consumes: 无
- Produces: 微信开发者工具可打开的项目结构；`node --test` 可运行测试

- [ ] **Step 1: 写冒烟测试**

```js
// tests/smoke.test.js
const test = require('node:test');
const assert = require('node:assert');

test('test runner works', () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 2: 运行测试确认通过**

Run: `node --test tests/smoke.test.js`
Expected: PASS（1 个测试通过）

- [ ] **Step 3: 写小游戏配置文件**

```json
// game.json
{
  "deviceOrientation": "portrait",
  "showStatusBar": false
}
```

```json
// project.config.json
{
  "description": "农场保卫战",
  "appid": "touristappid",
  "compileType": "game",
  "libVersion": "latest",
  "projectname": "farm-defense",
  "setting": {
    "es6": true,
    "minified": true
  }
}
```

```js
// game.js
// 入口文件，后续任务中接线。先保证开发者工具能打开项目。
console.log('农场保卫战 booting');
```

- [ ] **Step 4: 提交**

```bash
git add game.json project.config.json game.js tests/smoke.test.js
git commit -m "Scaffold WeChat mini-game project with test runner"
```

---

### Task 2: config.js 全部数值表

**Files:**
- Create: `js/config.js`
- Test: `tests/config.test.js`

**Interfaces:**
- Consumes: 无
- Produces: `module.exports = { GRID_COLS, GRID_ROWS, PATH_WAYPOINTS, TOWERS, ENEMIES, WAVES, UPGRADE_COST_MULTIPLIERS, INITIAL_GOLD, INITIAL_HP, SELL_REFUND_RATE, WAVE_REST, AD }`
  - `PATH_WAYPOINTS`: `[{col, row}, ...]`，网格坐标，允许 col/row 出界表示场外入口/出口
  - `TOWERS[type]`: `{ name, emoji, cost, levels: [level1, level2, level3] }`，level 字段按塔类型为 `{slow,range}` / `{damage,range,fireRate}` / `{dps,range}`
  - `ENEMIES[type]`: `{ name, emoji, hp, speed, reward, damage }`，speed 单位格/秒
  - `WAVES[i]`: `{ groups: [{ type, count, interval }] }`，共 10 波
  - `AD`: `{ HP_THRESHOLD: 0.3, GOLD_FALLBACK: 80, UNIT_ID: 'adunit-xxxxxxxxxxxxxxx' }`

- [ ] **Step 1: 写失败测试**

```js
// tests/config.test.js
const test = require('node:test');
const assert = require('node:assert');
const config = require('../js/config');

test('grid and path defined', () => {
  assert.strictEqual(config.GRID_COLS, 8);
  assert.strictEqual(config.GRID_ROWS, 12);
  assert.ok(config.PATH_WAYPOINTS.length >= 2);
});

test('four tower types with 3 levels each', () => {
  const types = Object.keys(config.TOWERS);
  assert.deepStrictEqual(types.sort(), ['scarecrow', 'sticky', 'web', 'windmill']);
  for (const t of types) {
    assert.strictEqual(config.TOWERS[t].levels.length, 3);
    assert.ok(config.TOWERS[t].cost > 0);
    assert.ok(config.TOWERS[t].emoji.length > 0);
  }
});

test('tower levels grow in power', () => {
  const s = config.TOWERS.scarecrow.levels;
  assert.ok(s[1].damage > s[0].damage);
  assert.ok(s[2].damage > s[1].damage);
  const st = config.TOWERS.sticky.levels;
  assert.ok(st[1].slow > st[0].slow);
  assert.ok(st[2].slow > st[1].slow);
});

test('five enemy types', () => {
  const types = Object.keys(config.ENEMIES);
  assert.deepStrictEqual(types.sort(), ['aphid', 'locust', 'mouse', 'snail', 'sparrow']);
  assert.strictEqual(config.ENEMIES.locust.damage, 5);
  for (const t of types) {
    assert.ok(config.ENEMIES[t].hp > 0);
    assert.ok(config.ENEMIES[t].speed > 0);
    assert.ok(config.ENEMIES[t].reward > 0);
  }
});

test('ten waves, wave 10 contains locust boss', () => {
  assert.strictEqual(config.WAVES.length, 10);
  const last = config.WAVES[9];
  assert.ok(last.groups.some(g => g.type === 'locust'));
  for (const w of config.WAVES) {
    for (const g of w.groups) {
      assert.ok(config.ENEMIES[g.type], `unknown enemy type ${g.type}`);
      assert.ok(g.count > 0 && g.interval > 0);
    }
  }
});

test('economy and ad constants', () => {
  assert.strictEqual(config.INITIAL_GOLD, 100);
  assert.strictEqual(config.INITIAL_HP, 20);
  assert.strictEqual(config.SELL_REFUND_RATE, 0.7);
  assert.strictEqual(config.AD.HP_THRESHOLD, 0.3);
  assert.strictEqual(config.AD.GOLD_FALLBACK, 80);
  assert.strictEqual(config.UPGRADE_COST_MULTIPLIERS.length, 2);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/config.test.js`
Expected: FAIL，提示 `Cannot find module '../js/config'`

- [ ] **Step 3: 实现 config.js**

```js
// js/config.js
const GRID_COLS = 8;
const GRID_ROWS = 12;

// 土路蛇形穿过田地：左进，下到粮仓（底部出场）
const PATH_WAYPOINTS = [
  { col: -1, row: 2 },
  { col: 6, row: 2 },
  { col: 6, row: 5 },
  { col: 1, row: 5 },
  { col: 1, row: 8 },
  { col: 6, row: 8 },
  { col: 6, row: 12 },
];

const TOWERS = {
  sticky: {
    name: '粘虫板', emoji: '🪤', cost: 30,
    levels: [
      { slow: 0.30, range: 1 },
      { slow: 0.45, range: 1 },
      { slow: 0.60, range: 2 },
    ],
  },
  scarecrow: {
    name: '稻草人', emoji: '🧍', cost: 50,
    levels: [
      { damage: 5, range: 2, fireRate: 1.0 },
      { damage: 10, range: 2, fireRate: 1.0 },
      { damage: 18, range: 3, fireRate: 1.2 },
    ],
  },
  windmill: {
    name: '驱鸟风车', emoji: '🎡', cost: 70,
    levels: [
      { damage: 3, range: 1, fireRate: 0.8 },
      { damage: 6, range: 2, fireRate: 0.8 },
      { damage: 10, range: 2, fireRate: 1.0 },
    ],
  },
  web: {
    name: '防虫网', emoji: '🕸️', cost: 60,
    levels: [
      { dps: 2, range: 1 },
      { dps: 4, range: 1 },
      { dps: 7, range: 2 },
    ],
  },
};

const ENEMIES = {
  aphid:   { name: '蚜虫', emoji: '🐛', hp: 10,  speed: 1.2, reward: 5,   damage: 1 },
  mouse:   { name: '田鼠', emoji: '🐭', hp: 15,  speed: 2.0, reward: 8,   damage: 1 },
  sparrow: { name: '麻雀', emoji: '🐦', hp: 8,   speed: 1.5, reward: 4,   damage: 1 },
  snail:   { name: '蜗牛', emoji: '🐌', hp: 60,  speed: 0.5, reward: 15,  damage: 1 },
  locust:  { name: '蝗虫', emoji: '🦗', hp: 300, speed: 0.8, reward: 100, damage: 5 },
};

const WAVES = [
  { groups: [{ type: 'aphid', count: 6, interval: 1.2 }] },
  { groups: [{ type: 'aphid', count: 8, interval: 1.0 }, { type: 'mouse', count: 2, interval: 1.5 }] },
  { groups: [{ type: 'sparrow', count: 5, interval: 0.9 }, { type: 'aphid', count: 4, interval: 0.8 }] },
  { groups: [{ type: 'mouse', count: 6, interval: 1.2 }] },
  { groups: [{ type: 'snail', count: 1, interval: 1.0 }, { type: 'aphid', count: 6, interval: 0.8 }] },
  { groups: [{ type: 'sparrow', count: 8, interval: 0.8 }, { type: 'mouse', count: 4, interval: 1.0 }] },
  { groups: [{ type: 'snail', count: 2, interval: 2.0 }, { type: 'mouse', count: 6, interval: 1.0 }] },
  { groups: [{ type: 'aphid', count: 10, interval: 0.6 }, { type: 'sparrow', count: 6, interval: 0.7 }, { type: 'snail', count: 2, interval: 1.5 }] },
  { groups: [{ type: 'snail', count: 3, interval: 1.5 }, { type: 'mouse', count: 8, interval: 0.8 }] },
  { groups: [{ type: 'locust', count: 1, interval: 1.0 }, { type: 'aphid', count: 6, interval: 1.0 }] },
];

module.exports = {
  GRID_COLS,
  GRID_ROWS,
  PATH_WAYPOINTS,
  TOWERS,
  ENEMIES,
  WAVES,
  UPGRADE_COST_MULTIPLIERS: [0.8, 1.2],
  INITIAL_GOLD: 100,
  INITIAL_HP: 20,
  SELL_REFUND_RATE: 0.7,
  WAVE_REST: 3,
  AD: {
    HP_THRESHOLD: 0.3,
    GOLD_FALLBACK: 80,
    UNIT_ID: 'adunit-xxxxxxxxxxxxxxx',
  },
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/config.test.js`
Expected: PASS（6 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/config.js tests/config.test.js
git commit -m "Add game balance config for towers, enemies, waves, economy, ads"
```

---

### Task 3: path.js 路径与寻路

**Files:**
- Create: `js/path.js`
- Test: `tests/path.test.js`

**Interfaces:**
- Consumes: `config.PATH_WAYPOINTS`
- Produces:
  - `buildPath(waypoints) -> { segments: [{x1,y1,x2,y2,length}], totalLength }`，坐标为格子中心（col+0.5, row+0.5）
  - `positionAt(path, distance) -> {x, y}`，distance  clamp 到 `[0, totalLength]`
  - `pathCells(waypoints, cols, rows) -> Set<string>`，键为 `"col,row"`，只含界内格子

- [ ] **Step 1: 写失败测试**

```js
// tests/path.test.js
const test = require('node:test');
const assert = require('node:assert');
const { buildPath, positionAt, pathCells } = require('../js/path');
const config = require('../js/config');

test('buildPath computes total length in cells', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  // 7 + 3 + 5 + 3 + 5 + 4 = 27
  assert.strictEqual(path.totalLength, 27);
});

test('positionAt interpolates along path', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  const start = positionAt(path, 0);
  assert.strictEqual(start.x, -0.5);
  assert.strictEqual(start.y, 2.5);
  const mid = positionAt(path, 3.5); // 第一段上，距入口 3.5 格
  assert.strictEqual(mid.x, 3.0);
  assert.strictEqual(mid.y, 2.5);
});

test('positionAt clamps to path end', () => {
  const path = buildPath(config.PATH_WAYPOINTS);
  const end = positionAt(path, 999);
  assert.strictEqual(end.x, 6.5);
  assert.strictEqual(end.y, 12.5);
});

test('pathCells marks in-grid path cells, excludes out-of-grid', () => {
  const cells = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);
  assert.ok(cells.has('0,2'));
  assert.ok(cells.has('6,2'));
  assert.ok(cells.has('6,11'));
  assert.ok(!cells.has('-1,2'), 'out-of-grid entry excluded');
  assert.ok(!cells.has('6,12'), 'out-of-grid exit excluded');
  assert.ok(!cells.has('3,3'), 'off-path cell not included');
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/path.test.js`
Expected: FAIL，提示 `Cannot find module '../js/path'`

- [ ] **Step 3: 实现 path.js**

```js
// js/path.js
function buildPath(waypoints) {
  const segments = [];
  let totalLength = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const x1 = a.col + 0.5;
    const y1 = a.row + 0.5;
    const x2 = b.col + 0.5;
    const y2 = b.row + 0.5;
    const length = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    segments.push({ x1, y1, x2, y2, length });
    totalLength += length;
  }
  return { segments, totalLength };
}

function positionAt(path, distance) {
  let d = Math.max(0, Math.min(distance, path.totalLength));
  for (const seg of path.segments) {
    if (d <= seg.length) {
      const t = seg.length === 0 ? 0 : d / seg.length;
      return {
        x: seg.x1 + (seg.x2 - seg.x1) * t,
        y: seg.y1 + (seg.y2 - seg.y1) * t,
      };
    }
    d -= seg.length;
  }
  const last = path.segments[path.segments.length - 1];
  return { x: last.x2, y: last.y2 };
}

function pathCells(waypoints, cols, rows) {
  const cells = new Set();
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    let col = a.col;
    let row = a.row;
    const steps = Math.abs(b.col - a.col) + Math.abs(b.row - a.row);
    for (let s = 0; s <= steps; s++) {
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        cells.add(col + ',' + row);
      }
      if (s < steps) {
        col += dc;
        row += dr;
      }
    }
  }
  return cells;
}

module.exports = { buildPath, positionAt, pathCells };
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/path.test.js`
Expected: PASS（4 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/path.js tests/path.test.js
git commit -m "Add grid path building, interpolation, and path cell lookup"
```

---

### Task 4: enemy.js 害虫行为

**Files:**
- Create: `js/enemy.js`
- Test: `tests/enemy.test.js`

**Interfaces:**
- Consumes: `config.ENEMIES`，`buildPath` 返回的 path 对象
- Produces:
  - `createEnemy(type, config) -> { id, type, emoji, hp, maxHp, speed, reward, damage, distance: 0, alive: true, reachedEnd: false }`
  - `updateEnemy(enemy, path, dt, slowFactor)`：按 `speed * (1 - slowFactor)` 前进；到达终点置 `reachedEnd = true, alive = false`
  - `applyDamage(enemy, amount) -> boolean`：返回是否死亡；死亡置 `alive = false`
  - `_resetIds()`：测试用，重置 id 计数

- [ ] **Step 1: 写失败测试**

```js
// tests/enemy.test.js
const test = require('node:test');
const assert = require('node:assert');
const { createEnemy, updateEnemy, applyDamage, _resetIds } = require('../js/enemy');
const { buildPath } = require('../js/path');
const config = require('../js/config');

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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/enemy.test.js`
Expected: FAIL，提示 `Cannot find module '../js/enemy'`

- [ ] **Step 3: 实现 enemy.js**

```js
// js/enemy.js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/enemy.test.js`
Expected: PASS（5 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/enemy.js tests/enemy.test.js
git commit -m "Add enemy creation, path movement with slow, and damage handling"
```

---

### Task 5: tower.js 防御设施

**Files:**
- Create: `js/tower.js`
- Test: `tests/tower.test.js`

**Interfaces:**
- Consumes: `config.TOWERS`、`config.UPGRADE_COST_MULTIPLIERS`、`config.SELL_REFUND_RATE`；`positionAt`（来自 path.js）
- Produces:
  - `createTower(type, col, row, config) -> { type, col, row, level: 1, cooldown: 0, invested }`
  - `stats(tower, config) -> level 对象`（`{slow,range}` 或 `{damage,range,fireRate}` 或 `{dps,range}`）
  - `canPlace(col, row, towers, blockedCells, cols, rows) -> boolean`
  - `upgradeCost(tower, config) -> number | null`（满级返回 null）
  - `applyUpgrade(tower, config)`：level+1 并累加 invested
  - `sellValue(tower, config) -> number`（`floor(invested * 0.7)`）
  - `inRange(tower, range, pos) -> boolean`（pos 为 `{x,y}` 格子中心坐标）
  - `updateTower(tower, enemies, dt, config, path) -> [{enemyId, amount}]`：减速塔返回空数组；dps 塔对范围内所有存活敌人按 `dps*dt` 出伤；攻击塔按 fireRate 冷却，windmill 打范围内全部，scarecrow 打 distance 最大的单个目标
  - `slowFactorAt(pos, towers, config) -> number`：范围内所有减速塔的最大 slow 值，无则 0

- [ ] **Step 1: 写失败测试**

```js
// tests/tower.test.js
const test = require('node:test');
const assert = require('node:assert');
const {
  createTower, stats, canPlace, upgradeCost, applyUpgrade,
  sellValue, inRange, updateTower, slowFactorAt,
} = require('../js/tower');
const { buildPath, pathCells } = require('../js/path');
const { createEnemy, _resetIds } = require('../js/enemy');
const config = require('../js/config');

const blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);

test('canPlace rejects path, occupied, and out-of-grid cells', () => {
  const towers = [createTower('scarecrow', 3, 3, config)];
  assert.strictEqual(canPlace(3, 3, towers, blocked, 8, 12), false, 'occupied');
  assert.strictEqual(canPlace(0, 2, towers, blocked, 8, 12), false, 'on path');
  assert.strictEqual(canPlace(-1, 0, towers, blocked, 8, 12), false, 'out of grid');
  assert.strictEqual(canPlace(4, 4, towers, blocked, 8, 12), true);
});

test('upgrade cost follows multipliers, null at max level', () => {
  const t = createTower('scarecrow', 3, 3, config); // cost 50
  assert.strictEqual(upgradeCost(t, config), 40);  // 50 * 0.8
  applyUpgrade(t, config);
  assert.strictEqual(t.level, 2);
  assert.strictEqual(t.invested, 90);
  assert.strictEqual(upgradeCost(t, config), 60);  // 50 * 1.2
  applyUpgrade(t, config);
  assert.strictEqual(t.level, 3);
  assert.strictEqual(upgradeCost(t, config), null);
});

test('sellValue returns 70% of invested', () => {
  const t = createTower('scarecrow', 3, 3, config);
  applyUpgrade(t, config); // invested 90
  assert.strictEqual(sellValue(t, config), 62);
});

test('inRange uses cell-center distance', () => {
  const t = createTower('scarecrow', 3, 3, config);
  assert.strictEqual(inRange(t, 2, { x: 5.5, y: 3.5 }), true);
  assert.strictEqual(inRange(t, 2, { x: 6.5, y: 3.5 }), false);
});

test('scarecrow attacks furthest enemy in range, respects fireRate', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('scarecrow', 3, 2, config); // range 2, center on the row-2 path
  const near = createEnemy('aphid', config);
  near.distance = 3.0; // pos (2.5, 2.5), 1 cell from tower
  const far = createEnemy('aphid', config);
  far.distance = 5.0;  // pos (4.5, 2.5), 1 cell from tower, further along the path
  const events = updateTower(t, [near, far], 0.1, config, path);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].enemyId, far.id);
  assert.strictEqual(events[0].amount, 5);
  // 冷却中不再攻击
  assert.strictEqual(updateTower(t, [near, far], 0.1, config, path).length, 0);
  // 冷却结束后再次攻击
  assert.strictEqual(updateTower(t, [near, far], 1.0, config, path).length, 1);
});

test('windmill hits all enemies in range', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('windmill', 3, 2, config); // range 1, center (3.5, 2.5) on the path
  const a = createEnemy('aphid', config);
  a.distance = 3.5; // (3.0, 2.5), 0.5 cells away
  const b = createEnemy('aphid', config);
  b.distance = 4.5; // (4.0, 2.5), 0.5 cells away
  const c = createEnemy('aphid', config);
  c.distance = 10.0; // vertical segment, out of range
  const events = updateTower(t, [a, b, c], 0.1, config, path);
  assert.strictEqual(events.length, 2);
});

test('web deals dps * dt to all in range without cooldown', () => {
  _resetIds();
  const path = buildPath(config.PATH_WAYPOINTS);
  const t = createTower('web', 3, 2, config); // dps 2, range 1, center on the path
  const a = createEnemy('aphid', config);
  a.distance = 4.0;
  const e1 = updateTower(t, [a], 0.5, config, path);
  const e2 = updateTower(t, [a], 0.5, config, path);
  assert.strictEqual(e1[0].amount, 1);
  assert.strictEqual(e2.length, 1, 'no cooldown for dps towers');
});

test('slowFactorAt takes max slow in range', () => {
  const t1 = createTower('sticky', 3, 1, config); // slow 0.3
  const t2 = createTower('sticky', 3, 3, config);
  t2.level = 3; // slow 0.6, range 2
  const pos = { x: 3.5, y: 2.5 };
  assert.strictEqual(slowFactorAt(pos, [t1, t2], config), 0.6);
  assert.strictEqual(slowFactorAt({ x: 0.5, y: 11.5 }, [t1, t2], config), 0);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/tower.test.js`
Expected: FAIL，提示 `Cannot find module '../js/tower'`

- [ ] **Step 3: 实现 tower.js**

```js
// js/tower.js
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
  return Math.floor(tower.invested * config.SELL_REFUND_RATE);
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/tower.test.js`
Expected: PASS（7 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/tower.js tests/tower.test.js
git commit -m "Add tower placement, upgrade, sell, attack, and slow logic"
```

---

### Task 6: wave.js 波次调度

**Files:**
- Create: `js/wave.js`
- Test: `tests/wave.test.js`

**Interfaces:**
- Consumes: `config.WAVES`
- Produces:
  - `createWaveState(waveIndex, config) -> { waveIndex, groups, activeGroup, gapTimer, done }`
  - `updateWave(state, dt) -> string[]`：本 tick 应生成的害虫类型数组；组内按 interval 生成，组间间隔 `GROUP_GAP = 2` 秒；首只立即生成
  - `isWaveCleared(state, enemies) -> boolean`：`state.done` 且没有存活敌人

- [ ] **Step 1: 写失败测试**

```js
// tests/wave.test.js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/wave.test.js`
Expected: FAIL，提示 `Cannot find module '../js/wave'`

- [ ] **Step 3: 实现 wave.js**

```js
// js/wave.js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/wave.test.js`
Expected: PASS（4 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/wave.js tests/wave.test.js
git commit -m "Add wave spawning with per-group intervals and gaps"
```

---

### Task 7: main.js 游戏状态机（纯逻辑）

**Files:**
- Create: `js/main.js`
- Test: `tests/main.test.js`

**Interfaces:**
- Consumes: path.js（`buildPath`, `positionAt`, `pathCells`）、enemy.js（`createEnemy`, `updateEnemy`, `applyDamage`）、tower.js（全部）、wave.js（全部）、config
- Produces: `class Game`
  - `constructor(config)`：字段 `gold, hp, towers, enemies, waveIndex(-1), waveState, state('prep'|'combat'|'won'|'lost'), restTimer, adOffered(false), adPrompt(null|'hp'|'boss'), events[]`
  - `placeTower(type, col, row) -> { ok, reason? }`
  - `upgradeTowerAt(col, row) -> { ok, reason? }`
  - `sellTowerAt(col, row) -> { ok }`
  - `towerAt(col, row) -> tower | undefined`
  - `update(dt)`：推进波次、塔攻击、敌人移动、结算血量与胜负；事件推入 `this.events`（`{type:'kill'|'leak'|'waveStart'|'win'|'lose', ...}`）
  - `rollAdReward() -> 'tower' | 'upgrade'`（Math.random < 0.5）
  - `consumeAdPrompt()`：置 `adOffered = true, adPrompt = null`
  - `declineAd()`：同 consumeAdPrompt（拒绝后本局不再弹出）
  - `grantRandomTower(col, row) -> { ok, reason? }`：随机类型 1 级塔，`invested = 0`（防出售刷金币）
  - `grantRandomUpgrade() -> { applied: 'upgrade' | 'gold', tower? }`：随机升级一个未满级塔；无塔时调用方应改用 grantRandomTower；全满级时发 `config.AD.GOLD_FALLBACK` 金币

- [ ] **Step 1: 写失败测试**

```js
// tests/main.test.js
const test = require('node:test');
const assert = require('node:assert');
const Game = require('../js/main');
const config = require('../js/config');

function newGame() {
  return new Game(config);
}

test('initial state', () => {
  const g = newGame();
  assert.strictEqual(g.gold, 100);
  assert.strictEqual(g.hp, 20);
  assert.strictEqual(g.state, 'prep');
  assert.strictEqual(g.waveIndex, -1);
});

test('placeTower deducts gold and rejects invalid placements', () => {
  const g = newGame();
  assert.strictEqual(g.placeTower('scarecrow', 0, 2).ok, false, 'on path');
  const r = g.placeTower('scarecrow', 3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.gold, 50);
  assert.strictEqual(g.placeTower('scarecrow', 3, 3).ok, false, 'occupied');
  g.gold = 10;
  assert.strictEqual(g.placeTower('scarecrow', 4, 4).ok, false, 'insufficient gold');
});

test('upgrade and sell flow', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  const r = g.upgradeTowerAt(3, 3);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(g.gold, 100 - 50 - 40);
  const s = g.sellTowerAt(3, 3);
  assert.strictEqual(s.ok, true);
  assert.strictEqual(g.gold, 10 + 62); // floor(90 * 0.7) === 62 in JS floats
  assert.strictEqual(g.towerAt(3, 3), undefined);
});

test('wave starts after rest countdown and spawns enemies', () => {
  const g = newGame();
  g.update(config.WAVE_REST + 0.1); // 倒计时结束
  assert.strictEqual(g.state, 'combat');
  assert.strictEqual(g.waveIndex, 0);
  g.update(0.016);
  assert.ok(g.enemies.length >= 1, 'first aphid spawned');
});

test('kills grant gold, leaks cost hp', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 1); // 覆盖第一段路
  g.update(config.WAVE_REST + 0.1);
  // 跑 30 秒模拟
  for (let t = 0; t < 30; t += 0.05) g.update(0.05);
  assert.ok(g.gold > 50, 'earned gold from kills');
  assert.ok(g.hp <= 20);
});

test('hp ad prompt triggers at low hp, once per game', () => {
  const g = newGame();
  g.hp = 5; // <= 20 * 0.3
  g.update(config.WAVE_REST + 0.1);
  g.update(0.05);
  assert.strictEqual(g.adPrompt, 'hp');
  g.declineAd();
  assert.strictEqual(g.adPrompt, null);
  assert.strictEqual(g.adOffered, true);
  g.hp = 1;
  g.update(0.05);
  assert.strictEqual(g.adPrompt, null, 'no second prompt');
});

test('boss ad prompt triggers before wave 10', () => {
  const g = newGame();
  g.waveIndex = 8;
  g.state = 'prep';
  g.restTimer = 0;
  g.update(0.1); // 进入第 10 波
  assert.strictEqual(g.adPrompt, 'boss');
  assert.strictEqual(g.waveIndex, 9);
});

test('losing sets state lost', () => {
  const g = newGame();
  g.hp = 1;
  g.update(config.WAVE_REST + 0.1);
  // 不放塔，蚜虫 22.5 秒走完全程
  for (let t = 0; t < 30 && g.state !== 'lost'; t += 0.1) g.update(0.1);
  assert.strictEqual(g.state, 'lost');
});

test('winning all 10 waves sets state won', () => {
  const g = newGame();
  // 铺满高等级塔
  g.gold = 99999;
  const spots = [[3,1],[2,3],[4,3],[5,4],[7,3],[0,4],[2,6],[3,7],[5,6],[7,7],[4,9],[5,10],[7,9],[0,7]];
  for (const [c, r] of spots) {
    if (g.placeTower('scarecrow', c, r).ok) {
      g.upgradeTowerAt(c, r);
      g.upgradeTowerAt(c, r);
    }
  }
  for (let t = 0; t < 600 && g.state !== 'won' && g.state !== 'lost'; t += 0.1) g.update(0.1);
  assert.strictEqual(g.state, 'won');
});

test('grantRandomTower places a free level-1 tower with zero invested', () => {
  const g = newGame();
  const r = g.grantRandomTower(4, 4);
  assert.strictEqual(r.ok, true);
  const t = g.towerAt(4, 4);
  assert.strictEqual(t.level, 1);
  assert.strictEqual(t.invested, 0);
  assert.strictEqual(g.gold, 100, 'no gold spent');
});

test('grantRandomUpgrade upgrades a random tower or falls back to gold', () => {
  const g = newGame();
  g.placeTower('scarecrow', 3, 3);
  const r = g.grantRandomUpgrade();
  assert.strictEqual(r.applied, 'upgrade');
  assert.strictEqual(g.towerAt(3, 3).level, 2);
  // 全满级时发金币。2 级升 3 级花费 60，先补足金币
  g.gold = 100;
  g.upgradeTowerAt(3, 3);
  const goldBefore = g.gold;
  const r2 = g.grantRandomUpgrade();
  assert.strictEqual(r2.applied, 'gold');
  assert.strictEqual(g.gold, goldBefore + config.AD.GOLD_FALLBACK);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/main.test.js`
Expected: FAIL，提示 `Cannot find module '../js/main'`

- [ ] **Step 3: 实现 main.js**

```js
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/main.test.js`
Expected: PASS（11 个测试全部通过）

- [ ] **Step 5: 跑全部测试确认无回归**

Run: `node --test tests/`
Expected: PASS（config 6 + path 4 + enemy 5 + tower 7 + wave 4 + main 11 + smoke 1 = 38 个测试全部通过）

- [ ] **Step 6: 提交**

```bash
git add js/main.js tests/main.test.js
git commit -m "Add game state machine integrating towers, enemies, waves, and ad triggers"
```

---

### Task 8: ad.js 激励视频广告封装

**Files:**
- Create: `js/ad.js`
- Test: `tests/ad.test.js`

**Interfaces:**
- Consumes: 注入的 wxApi（`{ createRewardedVideoAd }`），便于测试；`config.AD.UNIT_ID`
- Produces: `createAdController(wxApi, config) -> { load(), show({ onReward, onSkip }) }`
  - `load()`：创建并预加载广告实例；无 `createRewardedVideoAd` 时静默降级（`available = false`）
  - `show({onReward, onSkip})`：看完调 `onReward()`；中途关闭、加载失败、实例不可用都调 `onSkip()`，不抛异常

- [ ] **Step 1: 写失败测试**

```js
// tests/ad.test.js
const test = require('node:test');
const assert = require('node:assert');
const createAdController = require('../js/ad');
const config = require('../js/config');

function fakeWxApi(behavior) {
  const handlers = {};
  const ad = {
    onClose(fn) { handlers.close = fn; },
    onError(fn) { handlers.error = fn; },
    load() { return Promise.resolve(); },
    show() {
      handlers.shown = true;
      if (behavior === 'error') handlers.error(new Error('load fail'));
      return Promise.resolve();
    },
    _close(res) { handlers.close(res); },
    _handlers: handlers,
  };
  return {
    ad,
    createRewardedVideoAd(opts) {
      assert.strictEqual(opts.adUnitId, config.AD.UNIT_ID);
      return ad;
    },
  };
}

test('reward callback when ad watched to the end', () => {
  const wxApi = fakeWxApi('complete');
  const c = createAdController(wxApi, config);
  c.load();
  let rewarded = false;
  c.show({ onReward: () => { rewarded = true; }, onSkip: () => {} });
  wxApi.ad._close({ isEnded: true });
  assert.strictEqual(rewarded, true);
});

test('skip callback when ad closed early', () => {
  const wxApi = fakeWxApi('early');
  const c = createAdController(wxApi, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  wxApi.ad._close({ isEnded: false });
  assert.strictEqual(skipped, true);
});

test('skip callback when ad errors', () => {
  const wxApi = fakeWxApi('error');
  const c = createAdController(wxApi, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  assert.strictEqual(skipped, true);
});

test('degrades silently without createRewardedVideoAd', () => {
  const c = createAdController({}, config);
  c.load();
  let skipped = false;
  c.show({ onReward: () => {}, onSkip: () => { skipped = true; } });
  assert.strictEqual(skipped, true);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test tests/ad.test.js`
Expected: FAIL，提示 `Cannot find module '../js/ad'`

- [ ] **Step 3: 实现 ad.js**

```js
// js/ad.js
function createAdController(wxApi, config) {
  let ad = null;
  let available = false;
  let callbacks = null;

  function load() {
    if (typeof wxApi.createRewardedVideoAd !== 'function') {
      available = false;
      return;
    }
    ad = wxApi.createRewardedVideoAd({ adUnitId: config.AD.UNIT_ID });
    available = true;
    ad.onClose(res => {
      const cb = callbacks;
      callbacks = null;
      if (!cb) return;
      if (res && res.isEnded) cb.onReward();
      else cb.onSkip();
    });
    ad.onError(() => {
      const cb = callbacks;
      callbacks = null;
      if (cb) cb.onSkip();
    });
    ad.load().catch(() => {});
  }

  function show(cb) {
    if (!available || !ad) {
      cb.onSkip();
      return;
    }
    callbacks = cb;
    ad.show().catch(() => {
      // show 失败时尝试重新加载后再播一次，仍失败则跳过
      ad.load()
        .then(() => ad.show())
        .catch(() => {
          const c = callbacks;
          callbacks = null;
          if (c) c.onSkip();
        });
    });
  }

  return { load, show };
}

module.exports = createAdController;
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test tests/ad.test.js`
Expected: PASS（4 个测试全部通过）

- [ ] **Step 5: 提交**

```bash
git add js/ad.js tests/ad.test.js
git commit -m "Add rewarded video ad controller with silent degradation"
```

---

### Task 9: render.js 渲染 + game.js 接线

**Files:**
- Create: `js/render.js`
- Modify: `game.js`

**Interfaces:**
- Consumes: `Game`（main.js）、config
- Produces:
  - `computeLayout(canvas, config) -> { w, h, hudH, panelH, cell, offsetX, offsetY }`：顶部 HUD 区（高 8%）、底部面板区（高 14%）、中间田地
  - `cellToPixel(layout, col, row) -> {x, y}`（格子左上角像素）
  - `pixelToCell(layout, px, py) -> {col, row}`（可能出界，调用方判断）
  - `draw(ctx, game, layout, uiState)`：画田地、土路、粮仓、塔（含选中塔范围圈）、害虫（含血条）、HUD；`uiState` 结构见 Task 10，本任务只需兼容 `{ selected: null, toast: null, overlay: null }`

- [ ] **Step 1: 实现 render.js**

```js
// js/render.js
const { positionAt } = require('./path');
const { stats } = require('./tower');

function computeLayout(canvas, config) {
  const w = canvas.width;
  const h = canvas.height;
  const hudH = Math.round(h * 0.08);
  const panelH = Math.round(h * 0.14);
  const fieldH = h - hudH - panelH;
  const cell = Math.floor(Math.min(w / config.GRID_COLS, fieldH / config.GRID_ROWS));
  const offsetX = Math.floor((w - cell * config.GRID_COLS) / 2);
  const offsetY = hudH + Math.floor((fieldH - cell * config.GRID_ROWS) / 2);
  return { w, h, hudH, panelH, cell, offsetX, offsetY };
}

function cellToPixel(layout, col, row) {
  return { x: layout.offsetX + col * layout.cell, y: layout.offsetY + row * layout.cell };
}

function pixelToCell(layout, px, py) {
  return {
    col: Math.floor((px - layout.offsetX) / layout.cell),
    row: Math.floor((py - layout.offsetY) / layout.cell),
  };
}

function draw(ctx, game, layout, uiState) {
  const { config } = game;
  const cell = layout.cell;

  // 背景与田地
  ctx.fillStyle = '#8fbf5a';
  ctx.fillRect(0, 0, layout.w, layout.h);
  ctx.fillStyle = '#7ab648';
  ctx.fillRect(layout.offsetX, layout.offsetY, cell * config.GRID_COLS, cell * config.GRID_ROWS);

  // 土路
  ctx.fillStyle = '#d9b382';
  for (const key of game.blocked) {
    const [col, row] = key.split(',').map(Number);
    const p = cellToPixel(layout, col, row);
    ctx.fillRect(p.x, p.y, cell, cell);
  }

  // 粮仓（路径最后一格旁的标识）
  const granary = cellToPixel(layout, 6, 11);
  ctx.font = `${Math.floor(cell * 0.7)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🏠', granary.x + cell / 2, granary.y + cell / 2);

  // 选中塔的范围圈
  if (uiState.selected) {
    const t = game.towerAt(uiState.selected.col, uiState.selected.row);
    if (t) {
      const s = stats(t, config);
      const c = cellToPixel(layout, t.col, t.row);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c.x + cell / 2, c.y + cell / 2, s.range * cell, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 塔
  for (const t of game.towers) {
    const p = cellToPixel(layout, t.col, t.row);
    ctx.font = `${Math.floor(cell * 0.7)}px sans-serif`;
    ctx.fillText(config.TOWERS[t.type].emoji, p.x + cell / 2, p.y + cell / 2);
    // 等级点
    ctx.fillStyle = '#fff';
    for (let i = 0; i < t.level; i++) {
      ctx.fillRect(p.x + 4 + i * 7, p.y + cell - 7, 5, 5);
    }
  }

  // 害虫与血条
  for (const e of game.enemies) {
    const pos = positionAt(game.path, e.distance);
    const px = layout.offsetX + pos.x * cell;
    const py = layout.offsetY + pos.y * cell;
    ctx.font = `${Math.floor(cell * 0.6)}px sans-serif`;
    ctx.fillText(e.emoji, px, py);
    const bw = cell * 0.6;
    const ratio = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = '#000';
    ctx.fillRect(px - bw / 2, py - cell * 0.42, bw, 4);
    ctx.fillStyle = ratio > 0.4 ? '#3ec76b' : '#e74c3c';
    ctx.fillRect(px - bw / 2, py - cell * 0.42, bw * ratio, 4);
  }

  // HUD
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, layout.w, layout.hudH);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(layout.hudH * 0.38)}px sans-serif`;
  ctx.textAlign = 'left';
  const waveText = game.waveIndex < 0 ? 1 : game.waveIndex + 1;
  ctx.fillText(`💰 ${game.gold}`, 12, layout.hudH / 2);
  ctx.fillText(`❤️ ${game.hp}`, layout.w * 0.38, layout.hudH / 2);
  ctx.fillText(`🌊 ${Math.min(waveText, config.WAVES.length)}/${config.WAVES.length}`, layout.w * 0.68, layout.hudH / 2);

  // 准备倒计时
  if (game.state === 'prep') {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = `${Math.floor(cell * 0.5)}px sans-serif`;
    ctx.fillText(`第 ${game.waveIndex + 2} 波来袭：${Math.ceil(game.restTimer)}s`, layout.w / 2, layout.offsetY - cell * 0.35);
  }

  // toast
  if (uiState.toast && uiState.toast.until > Date.now()) {
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.font = `${Math.floor(cell * 0.42)}px sans-serif`;
    ctx.fillText(uiState.toast.text, layout.w / 2, layout.h - layout.panelH - cell * 0.4);
  }
}

module.exports = { computeLayout, cellToPixel, pixelToCell, draw };
```

- [ ] **Step 2: 接线 game.js**

```js
// game.js
const config = require('./js/config');
const Game = require('./js/main');
const render = require('./js/render');
const createAdController = require('./js/ad');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');

const game = new Game(config);
const layout = render.computeLayout(canvas, config);
const uiState = { selected: null, toast: null, overlay: null, panelButtons: [] };
const ad = createAdController(wx, config);
ad.load();

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  render.draw(ctx, game, layout, uiState);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Task 10 将在此接入 wx.onTouchStart 与 ui 模块
```

- [ ] **Step 3: 跑全部测试确认无回归**

Run: `node --test tests/`
Expected: PASS（render.js/game.js 依赖 wx，不出现在 Node 测试中，既有 42 个测试全部通过）

- [ ] **Step 4: 模拟器人工验证**

用微信开发者工具打开项目（小游戏模式，测试号），确认：
- 田地、土路、粮仓 🏠 正确绘制
- 第一波蚜虫 🐛 自动出现并沿路移动，头顶有血条
- HUD 显示 💰 100、❤️ 20、🌊 1/10
- 波次间显示倒计时
- 漏怪时 ❤️ 减少

- [ ] **Step 5: 提交**

```bash
git add js/render.js game.js
git commit -m "Add canvas renderer and wire main loop in game entry"
```

---

### Task 10: ui.js 触摸交互

**Files:**
- Create: `js/ui.js`
- Modify: `game.js`

**Interfaces:**
- Consumes: `Game`、`render.cellToPixel/pixelToCell/computeLayout`、config
- Produces:
  - `createUIState() -> { selected, toast, overlay, panelButtons, placementMode }`
  - `panelButtons(layout, uiState, game, config) -> [{ key, label, sub, rect: {x,y,w,h}, enabled }]`：建造面板 4 个塔按钮 / 已选塔的 升级+出售 按钮
  - `handleTouch(x, y, game, layout, uiState, config, hooks) -> void`：田地点击选中/取消、面板按钮点击建造/升级/出售、结算覆盖层点击重开、广告弹窗按钮；`hooks = { onRestart, onAdWatch, onAdSkip }` 由 game.js 提供
  - `drawPanel(ctx, layout, uiState, game, config)`：底部面板、结算覆盖层（胜利/失败 + 点击重开）、广告弹窗（观看/放弃）、援助放置提示条
  - `showToast(uiState, text)`：2 秒提示

- [ ] **Step 1: 实现 ui.js**

```js
// js/ui.js
const { cellToPixel, pixelToCell } = require('./render');
const { upgradeCost, sellValue, stats } = require('./tower');

const TOWER_ORDER = ['sticky', 'scarecrow', 'windmill', 'web'];

function createUIState() {
  return {
    selected: null,        // {col,row} 当前选中格子
    toast: null,           // {text, until}
    overlay: null,         // 'won' | 'lost' | null
    panelButtons: [],      // 本帧按钮，供触摸命中
    placementMode: false,  // 广告奖励的免费塔放置模式
    adModal: false,        // 广告弹窗是否显示
  };
}

function showToast(uiState, text) {
  uiState.toast = { text, until: Date.now() + 2000 };
}

function panelButtons(layout, uiState, game, config) {
  const buttons = [];
  const y = layout.h - layout.panelH;
  const h = layout.panelH;
  if (uiState.placementMode) return buttons;

  if (uiState.selected) {
    const t = game.towerAt(uiState.selected.col, uiState.selected.row);
    if (t) {
      const cost = upgradeCost(t, config);
      const half = layout.w / 2;
      buttons.push({
        key: 'upgrade',
        label: cost === null ? '已满级' : `⬆️ 升级`,
        sub: cost === null ? '' : `💰${cost}`,
        rect: { x: 0, y, w: half, h },
        enabled: cost !== null,
      });
      buttons.push({
        key: 'sell',
        label: '💲 出售',
        sub: `+${sellValue(t, config)}`,
        rect: { x: half, y, w: half, h },
        enabled: true,
      });
      return buttons;
    }
  }

  const bw = layout.w / TOWER_ORDER.length;
  TOWER_ORDER.forEach((type, i) => {
    const def = config.TOWERS[type];
    buttons.push({
      key: 'build:' + type,
      label: `${def.emoji} ${def.name}`,
      sub: `💰${def.cost}`,
      rect: { x: i * bw, y, w: bw, h },
      enabled: game.gold >= def.cost,
    });
  });
  return buttons;
}

function handleTouch(x, y, game, layout, uiState, config, hooks) {
  // 结算覆盖层：点击重开
  if (game.state === 'won' || game.state === 'lost') {
    hooks.onRestart();
    return;
  }

  // 广告弹窗
  if (uiState.adModal) {
    const bw = layout.w / 2;
    const by = layout.h * 0.55;
    const bh = layout.panelH * 0.8;
    if (y >= by && y <= by + bh) {
      if (x < bw) hooks.onAdWatch();
      else hooks.onAdSkip();
    }
    return;
  }

  // 面板按钮
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
      if (b.key.startsWith('build:')) {
        const type = b.key.slice(6);
        if (!uiState.selected) return;
        const r2 = game.placeTower(type, uiState.selected.col, uiState.selected.row);
        if (!r2.ok) showToast(uiState, r2.reason === 'gold' ? '金币不足' : '无法建造');
      } else if (b.key === 'upgrade') {
        if (!b.enabled) return;
        const r2 = game.upgradeTowerAt(uiState.selected.col, uiState.selected.row);
        if (!r2.ok) showToast(uiState, r2.reason === 'gold' ? '金币不足' : '无法升级');
      } else if (b.key === 'sell') {
        game.sellTowerAt(uiState.selected.col, uiState.selected.row);
        uiState.selected = null;
      }
      return;
    }
  }

  // 田地点击
  const { col, row } = pixelToCell(layout, x, y);
  if (col < 0 || col >= config.GRID_COLS || row < 0 || row >= config.GRID_ROWS) {
    uiState.selected = null;
    return;
  }

  if (uiState.placementMode) {
    const r = game.grantRandomTower(col, row);
    if (r.ok) {
      uiState.placementMode = false;
      showToast(uiState, `获得援助：${config.TOWERS[r.type].name}`);
    } else {
      showToast(uiState, '这里不能放置');
    }
    return;
  }

  const t = game.towerAt(col, row);
  if (t) {
    uiState.selected = { col, row };
    return;
  }
  if (game.blocked.has(col + ',' + row)) {
    uiState.selected = null;
    return;
  }
  uiState.selected = { col, row };
}

function drawPanel(ctx, layout, uiState, game, config) {
  const y = layout.h - layout.panelH;

  // 面板底
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, y, layout.w, layout.panelH);

  if (uiState.placementMode) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = `${Math.floor(layout.panelH * 0.3)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎁 选择一块空地放置援助设施', layout.w / 2, y + layout.panelH / 2);
    return;
  }

  // 按钮
  uiState.panelButtons = panelButtons(layout, uiState, game, config);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const b of uiState.panelButtons) {
    const r = b.rect;
    ctx.fillStyle = b.enabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
    ctx.fillRect(r.x + 2, r.y + 4, r.w - 4, r.h - 8);
    ctx.fillStyle = b.enabled ? '#fff' : '#888';
    ctx.font = `${Math.floor(r.h * 0.26)}px sans-serif`;
    ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h * 0.36);
    ctx.font = `${Math.floor(r.h * 0.2)}px sans-serif`;
    ctx.fillText(b.sub, r.x + r.w / 2, r.y + r.h * 0.7);
  }

  // 广告弹窗
  if (uiState.adModal) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(layout.cell * 0.5)}px sans-serif`;
    ctx.fillText('⚠️ 粮仓告急！', layout.w / 2, layout.h * 0.4);
    ctx.font = `${Math.floor(layout.cell * 0.38)}px sans-serif`;
    ctx.fillText('观看广告获得援助', layout.w / 2, layout.h * 0.47);
    const bw = layout.w / 2;
    const by = layout.h * 0.55;
    const bh = layout.panelH * 0.8;
    ctx.fillStyle = '#3ec76b';
    ctx.fillRect(0, by, bw, bh);
    ctx.fillStyle = '#666';
    ctx.fillRect(bw, by, bw, bh);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(bh * 0.32)}px sans-serif`;
    ctx.fillText('📺 观看', bw / 2, by + bh / 2);
    ctx.fillText('放弃', bw + bw / 2, by + bh / 2);
  }

  // 结算覆盖层
  if (game.state === 'won' || game.state === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(layout.cell * 0.8)}px sans-serif`;
    ctx.fillText(game.state === 'won' ? '🎉 丰收了！' : '💥 粮仓被吃光了', layout.w / 2, layout.h * 0.42);
    ctx.font = `${Math.floor(layout.cell * 0.4)}px sans-serif`;
    ctx.fillText('点击任意处重新开始', layout.w / 2, layout.h * 0.55);
  }
}

module.exports = { createUIState, panelButtons, handleTouch, drawPanel, showToast };
```

- [ ] **Step 2: 修改 render.js，在 draw 末尾调用 drawPanel**

在 `js/render.js` 的 `draw` 函数末尾（toast 绘制之后）追加：

```js
  require('./ui').drawPanel(ctx, layout, uiState, game, game.config);
```

（放在函数内 require 避免与 ui.js 循环依赖：ui.js 需要 render.js 的坐标函数，render.js 的 draw 需要 ui.js 的 drawPanel。）

- [ ] **Step 3: 修改 game.js 接入触摸与广告流程**

用以下内容整体替换 `game.js`：

```js
// game.js
const config = require('./js/config');
const Game = require('./js/main');
const render = require('./js/render');
const ui = require('./js/ui');
const createAdController = require('./js/ad');

const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const layout = render.computeLayout(canvas, config);

let game = new Game(config);
const uiState = ui.createUIState();
const ad = createAdController(wx, config);
ad.load();

const hooks = {
  onRestart() {
    game = new Game(config);
    uiState.selected = null;
    uiState.placementMode = false;
    uiState.adModal = false;
  },
  onAdWatch() {
    uiState.adModal = false;
    game.consumeAdPrompt();
    ad.show({
      onReward() {
        const roll = game.rollAdReward();
        if (roll === 'upgrade' && game.towers.length > 0) {
          const r = game.grantRandomUpgrade();
          ui.showToast(uiState, r.applied === 'gold' ? `援助：💰${config.AD.GOLD_FALLBACK}` : `援助：${config.TOWERS[r.tower.type].name}升级！`);
        } else {
          uiState.placementMode = true;
        }
      },
      onSkip() {
        ui.showToast(uiState, '广告未播放完成');
      },
    });
  },
  onAdSkip() {
    uiState.adModal = false;
    game.declineAd();
  },
};

wx.onTouchStart(e => {
  const t = e.touches[0];
  ui.handleTouch(t.clientX, t.clientY, game, layout, uiState, config, hooks);
});

let last = Date.now();
function loop() {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  // 广告触发：血量告急或 Boss 波前
  if (game.adPrompt && !uiState.adModal) {
    uiState.adModal = true;
  }
  render.draw(ctx, game, layout, uiState);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

注意：触摸坐标 `clientX/clientY` 是 CSS 像素，而 canvas 尺寸可能按设备像素比放大。若模拟器中发现点击位置偏移，在 `game.js` 顶部把 canvas 缩放到与窗口一致：

```js
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
canvas.width = info.windowWidth * info.pixelRatio;
canvas.height = info.windowHeight * info.pixelRatio;
ctx.scale(info.pixelRatio, info.pixelRatio);
// layout 用 CSS 像素尺寸计算
const cssCanvas = { width: info.windowWidth, height: info.windowHeight };
const layout = render.computeLayout(cssCanvas, config);
```

- [ ] **Step 4: 跑全部测试确认无回归**

Run: `node --test tests/`
Expected: PASS（既有 42 个测试全部通过；ui.js 依赖 wx 边界，由模拟器验证）

- [ ] **Step 5: 模拟器人工验证**

在微信开发者工具中确认：
- 点空地出现建造面板，4 个设施按钮显示 emoji、名称、价格；金币不足的按钮变灰
- 建造后金币扣减，塔出现在格子上，等级点显示 1 级
- 点已建塔出现 升级/出售 面板，并显示攻击范围圈；升级后等级点增加、威力增强；出售返还 70%
- 点路面或界外取消选中
- 胜利（可用 config 里把 WAVES 临时改短验证后改回，或正常打）显示 🎉 覆盖层，点击重开
- 失败显示 💥 覆盖层，点击重开
- 触摸位置无偏移（有偏移则按 Step 3 注释处理 DPR）

- [ ] **Step 6: 提交**

```bash
git add js/ui.js js/render.js game.js
git commit -m "Add touch UI: build panel, upgrade/sell, overlays, ad modal"
```

---

### Task 11: 广告全流程与整体验证

**Files:**
- Modify: 无新文件（按需微调 `js/config.js` 便于验证后还原）

**Interfaces:**
- Consumes: 全部既有模块
- Produces: 无新接口

- [ ] **Step 1: 跑全部测试**

Run: `node --test tests/`
Expected: PASS（42 个测试全部通过）

- [ ] **Step 2: 模拟器验证广告触发（血量告急路径）**

临时把 `config.INITIAL_HP` 改为 3 并减少初始金币（如 0），开局不放塔让害虫漏怪：
- ❤️ 降到 1（≤ 3×0.3）时弹出广告弹窗
- 点"放弃"：弹窗关闭，本局不再弹出
- 重开一局再触发，点"📺 观看"：开发者工具会模拟广告播放；看完（模拟器自动 isEnded）后进入放置模式或升级提示
- 放置模式下点空地：免费塔落地，出售它金币 +0（invested 为 0）
- 验证完把 `INITIAL_HP` 和 `INITIAL_GOLD` 改回 20 / 100

- [ ] **Step 3: 模拟器验证广告触发（Boss 波路径）**

临时把 `config.WAVES` 裁成 2 波（第 2 波含 locust）：
- 第 1 波清完进入第 2 波（即 Boss 波）时弹出广告弹窗
- 看完广告获得援助
- 验证完还原 WAVES

- [ ] **Step 4: 完整通关体验验证**

正常打一局：
- 10 波节奏、组间间隔、Boss 波蝗虫 🦗 血量明显更厚
- 4 种塔各司其职：粘虫板减速可见、稻草人单体、风车范围、防虫网持续伤害
- 胜利与失败两条路径都走到
- 数值手感明显不合理时只调 `js/config.js`

- [ ] **Step 5: 提交验证中发现并修复的问题**

```bash
git add -A
git commit -m "Polish balance and fix issues found in simulator playtest"
```

---

## Self-Review 记录

- **Spec coverage**：4 塔（Task 2/5）、5 害虫（Task 2/4）、10 波 + Boss（Task 2/6）、经济与出售 70%（Task 2/5/7）、等级属性（Task 2/5）、广告触发与奖励（Task 7/8/10/11）、状态机（Task 7）、渲染与交互（Task 9/10）、模拟器验证（Task 9/10/11）——全覆盖。
- **Placeholder scan**：广告位 ID 为占位符属 Global Constraints 明确允许；无 TBD/TODO。
- **Type consistency**：`positionAt`/`pathCells`/`buildPath`（path.js）在 tower.js、main.js、render.js 中签名一致；`updateTower` 返回 `{enemyId, amount}` 与 main.js 消费一致；`panelButtons` 在 ui.js 内部生产消费一致；`hooks.onRestart/onAdWatch/onAdSkip` 在 game.js 提供、ui.js 消费一致。
