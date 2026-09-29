const test = require('node:test');
const assert = require('node:assert');
const config = require('../js/config');
const Game = require('../js/main');
const { pathCells, roadsideCells, rollBuildSlots } = require('../js/path');

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('roadside cells sit on both sides of the path', () => {
  const blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);
  const cells = roadsideCells(config);
  assert.ok(cells.length > config.BUILD_SLOT_COUNT);
  for (const cell of cells) {
    const key = cell.col + ',' + cell.row;
    assert.strictEqual(blocked.has(key), false);
    assert.ok(!(cell.col === config.GRANARY.col && cell.row === config.GRANARY.row));
    assert.ok(!(cell.col === config.PLOT.col && cell.row === config.PLOT.row));
    const beside = blocked.has((cell.col + 1) + ',' + cell.row)
      || blocked.has((cell.col - 1) + ',' + cell.row)
      || blocked.has(cell.col + ',' + (cell.row + 1))
      || blocked.has(cell.col + ',' + (cell.row - 1));
    assert.strictEqual(beside, true, key);
  }
});

test('each game rolls exactly 22 roadside slots', () => {
  const a = rollBuildSlots(config, mulberry32(1));
  const b = rollBuildSlots(config, mulberry32(2));
  assert.strictEqual(a.length, 22);
  assert.strictEqual(b.length, 22);
  const ids = a.map(s => s.col + ',' + s.row);
  assert.strictEqual(new Set(ids).size, 22);
  assert.notDeepStrictEqual(
    ids,
    b.map(s => s.col + ',' + s.row),
  );
  const g = new Game(config, a);
  assert.strictEqual(g.buildSlots.length, 22);
  assert.strictEqual(g.isBuildSlot(a[0].col, a[0].row), true);
  assert.strictEqual(g.isBuildSlot(0, 0), false);
  const live = new Game(config);
  assert.strictEqual(live.buildSlots.length, 22);
});
