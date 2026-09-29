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

// 紧贴土路的格子：上下左右与路相邻，不在路上，也不占粮仓和菜畦。
function roadsideCells(config) {
  const blocked = pathCells(config.PATH_WAYPOINTS, config.GRID_COLS, config.GRID_ROWS);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const cells = [];
  const seen = new Set();
  for (const key of blocked) {
    const parts = key.split(',');
    const col = Number(parts[0]);
    const row = Number(parts[1]);
    for (let i = 0; i < dirs.length; i++) {
      const nc = col + dirs[i][0];
      const nr = row + dirs[i][1];
      if (nc < 0 || nr < 0 || nc >= config.GRID_COLS || nr >= config.GRID_ROWS) continue;
      const id = nc + ',' + nr;
      if (blocked.has(id) || seen.has(id)) continue;
      if (nc === config.GRANARY.col && nr === config.GRANARY.row) continue;
      if (config.PLOT && nc === config.PLOT.col && nr === config.PLOT.row) continue;
      seen.add(id);
      cells.push({ col: nc, row: nr });
    }
  }
  return cells;
}

function rollBuildSlots(config, random) {
  const rng = random || Math.random;
  const cells = roadsideCells(config);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cells[i];
    cells[i] = cells[j];
    cells[j] = tmp;
  }
  const count = config.BUILD_SLOT_COUNT == null ? 22 : config.BUILD_SLOT_COUNT;
  return cells.slice(0, count);
}

module.exports = { buildPath, positionAt, pathCells, roadsideCells, rollBuildSlots };
