import type { CartesianPoint } from './cartesian-point.js';

export type Point = CartesianPoint;

export function withoutClosingPoint<T>(
  points: T[],
  pointsAreEqual: (first: T, last: T) => boolean,
): T[] {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points.at(-1);
  return first !== undefined && last !== undefined && pointsAreEqual(first, last)
    ? points.slice(0, -1)
    : points;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000 + 0;

export function pointsToWktPolygon(points: Point[]): string {
  if (points.length === 0) return 'POLYGON(())';
  const openPoints = withoutClosingPoint(
    points,
    (first, last) => first.x === last.x && first.y === last.y,
  );
  const ring = [...openPoints, openPoints[0]!];

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

export interface Placement {
  rotationAngle: number;
  grainline: number;
  fabricGrainline: number;
  isMirrored: boolean;
  isFlipped180: boolean;
  x: number;
  y: number;
}

function rotateClockwise(point: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: point.x * cos + point.y * sin,
    y: -point.x * sin + point.y * cos,
  };
}

export function placePiece(points: Point[], p: Placement): Point[] {
  const alpha = (((p.grainline + p.rotationAngle) % 360) + 360) % 360;
  const transformed = points.map((point) => rotateClockwise(point, alpha));

  if (p.isMirrored) {
    for (const point of transformed) point.x = -point.x;
    transformed.reverse();
  }

  if (p.isFlipped180 && transformed.length > 0) {
    const minX = Math.min(...transformed.map(({ x }) => x));
    const maxX = Math.max(...transformed.map(({ x }) => x));
    const minY = Math.min(...transformed.map(({ y }) => y));
    const maxY = Math.max(...transformed.map(({ y }) => y));

    for (const point of transformed) {
      point.x = minX + maxX - point.x;
      point.y = minY + maxY - point.y;
    }
  }

  const inverseFabricGrainline =
    (((360 - p.fabricGrainline) % 360) + 360) % 360;
  return transformed.map((point) => {
    const worldPoint = rotateClockwise(point, inverseFabricGrainline);
    return {
      x: round3(worldPoint.x + p.x),
      y: round3(worldPoint.y + p.y),
    };
  });
}
