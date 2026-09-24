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
