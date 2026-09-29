const GRID_COLS = 8;
const GRID_ROWS = 12;

// 土路蛇形穿过田地：左进，下到粮仓（底部出场）
// 对局里的布防空位每次开局沿路两边重抽，个数见 BUILD_SLOT_COUNT。
// 下面这份固定点只给测试用，保证指定格子可放。
const BUILD_SLOT_COUNT = 22;
const BUILD_SLOTS = [
  { col: 3, row: 1 }, { col: 5, row: 1 },
  { col: 2, row: 3 }, { col: 4, row: 3 }, { col: 3, row: 3 },
  { col: 7, row: 3 }, { col: 7, row: 4 },
  { col: 3, row: 4 }, { col: 5, row: 4 }, { col: 4, row: 4 },
  { col: 0, row: 6 }, { col: 2, row: 6 }, { col: 4, row: 6 }, { col: 5, row: 6 },
  { col: 0, row: 7 }, { col: 3, row: 7 }, { col: 7, row: 7 },
  { col: 2, row: 9 }, { col: 4, row: 9 }, { col: 7, row: 9 },
  { col: 5, row: 10 }, { col: 7, row: 10 },
];

const GRANARY = { col: 6, row: 11 };

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
      { damage: 10, range: 2, fireRate: 1.35 },
      { damage: 18, range: 3, fireRate: 1.8 },
    ],
  },
  windmill: {
    name: '驱鸟风车', emoji: '🎡', cost: 70,
    levels: [
      { damage: 3, range: 1, fireRate: 0.8 },
      { damage: 6, range: 2, fireRate: 1.1 },
      { damage: 10, range: 2, fireRate: 1.5 },
    ],
  },
  web: {
    name: '防虫网', emoji: '🕸️', cost: 60,
    levels: [
      { dps: 2, range: 1, fireRate: 1.0 },
      { dps: 4, range: 1, fireRate: 1.35 },
      { dps: 7, range: 2, fireRate: 1.8 },
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
  GRANARY,
  BUILD_SLOT_COUNT,
  BUILD_SLOTS,
  TOWERS,
  ENEMIES,
  WAVES,
  UPGRADE_COST_MULTIPLIERS: [0.8, 1.2],
  INITIAL_GOLD: 100,
  INITIAL_HP: 20,
  SELL_REFUND_RATE: 0.7,
  WAVE_REST: 3,
  PLOT: { col: 0, row: 11, interval: 10, value: 8, max: 3 },
  AD: {
    HP_PROMPT: 15,
    GOLD_FALLBACK: 80,
    UNIT_ID: 'adunit-xxxxxxxxxxxxxxx',
  },
  MOMENT: {
    CHANCE: 0.4,
    DURATION: 20,
  },
  // 第 1 波不加。从第 2 波起，每一波血量和移速比上一波 +5%。
  WAVE_HP_STEP: 0.05,
  WAVE_SPEED_STEP: 0.05,
  // 第 5 波起，血量和移速在现有增幅上再加 10%。
  WAVE_HARD_FROM: 4,
  WAVE_HARD_HP_STEP: 0.1,
  WAVE_HARD_SPEED_STEP: 0.1,
  // 第 8、9 波各加 1 只蝗虫，不参与数量翻倍。
  WAVE_LOCUST_AT: [7, 8],
  // 第 5 波起，每一波再多 3 只蚜虫。
  WAVE_EXTRA_FROM: 4,
  WAVE_EXTRA_COUNT: 3,
  WAVE_EXTRA_TYPE: 'aphid',
  WAVE_EXTRA_INTERVAL: 0.8,
  // 第 6 到第 10 波（下标从 5 起），在上面的增幅上再加 5%。
  WAVE_LATE_FROM: 5,
  WAVE_LATE_HP_STEP: 0.05,
  WAVE_LATE_SPEED_STEP: 0.05,
  // 第 8 到第 10 波，害虫数量在当时的基础上再翻一倍。
  WAVE_DOUBLE_FROM: 7,
  // 全部 10 波，在目前出场数量上再翻一倍。
  WAVE_COUNT_MULT: 2,
  // 害虫血量在目前数值上再翻一倍。移速不变。
  WAVE_HP_MULT: 2,
  // 最后 3 波（第 8 到第 10 波）再加一档 5%。
  WAVE_FINAL_FROM: 7,
  WAVE_FINAL_HP_STEP: 0.05,
  WAVE_FINAL_SPEED_STEP: 0.05,
};
