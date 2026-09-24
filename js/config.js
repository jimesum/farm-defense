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
