export interface Point {
  x: number;
  y: number;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000 + 0;

export function pointsToWktPolygon(points: Point[]): string {
  if (points.length === 0) return 'POLYGON(())';
  const ring = [...points];
  const first = ring[0]!;
  const last = ring.at(-1);

  if (first && last && (first.x !== last.x || first.y !== last.y)) {
    ring.push(first);
  }

  return `POLYGON((${ring.map((p) => `${p.x} ${p.y}`).join(', ')}))`;
}

// Rotates the polygon clockwise by `degrees` (Cartesian system, Y up) and moves it
// so that its bounding box starts at (0, 0). Rotation keeps the vertex order.

export function rotateAndAnchor(points: Point[], degrees: number): Point[] {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotated = points.map(({ x, y }) => ({
    x: x * cos + y * sin,
    y: -x * sin + y * cos,
  }));

  const minX = Math.min(...rotated.map((p) => p.x));
  const minY = Math.min(...rotated.map((p) => p.y));

  return rotated.map((p) => ({ x: round3(p.x - minX), y: round3(p.y - minY) }));
}
