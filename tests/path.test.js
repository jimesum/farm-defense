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
