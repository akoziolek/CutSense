import {
  Clipper,
  EndType,
  JoinType,
  type Path64,
  type Point64,
} from 'clipper2-ts';
import type {
  OptimizationViewDto,
  PlacementDto,
} from '../dto/optimization-view.dto.js';
import type { PointDto } from '../../../common/geometry/point.dto.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface TileGridPlan {
  useLandscape: boolean;
  tileWmm: number;
  tileHmm: number;
  cols: number;
  rows: number;
  activeCells: Map<string, number>;
  totalPages: number;
}

const REGULAR_FONT_PATH = path.resolve(
  process.cwd(),
  'assets/fonts/Inter_18pt-Regular.ttf',
);

const BOLD_FONT_PATH = path.resolve(
  process.cwd(),
  'assets/fonts/Inter_18pt-Regular.ttf',
);

export function registerPdfFonts(doc: PDFKit.PDFDocument): void {
  doc.registerFont('Inter', REGULAR_FONT_PATH);
  doc.registerFont('Inter-Bold', BOLD_FONT_PATH);
}

export function getFabricPolygon(
  view: OptimizationViewDto,
): [number, number][] {
  const boundary = view.fabric.boundary ?? [];
  if (boundary.length >= 3) return toTuplePolygon(boundary);
  return [
    [0, 0],
    [view.fabric.widthMm, 0],
    [view.fabric.widthMm, view.fabric.lengthMm],
    [0, view.fabric.lengthMm],
  ];
}

export function toTuplePolygon(points: PointDto[]): [number, number][] {
  return points.map(({ x, y }) => [x, y]);
}

export function computeBounds(polygons: [number, number][][]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const poly of polygons) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function offsetPolygon(
  mmPts: [number, number][],
  offsetMm: number,
): [number, number][] {
  if (mmPts.length < 3 || offsetMm <= 0) return mmPts;
  const scale = 1000;
  const rawPath: Path64 = mmPts.map(([x, y]): Point64 => ({
    x: Math.round(x * scale),
    y: Math.round(y * scale),
  }));

  const simplified = Clipper.simplifyPath(rawPath, 0.1 * scale);
  const inflated = Clipper.inflatePaths(
    [simplified],
    offsetMm * scale,
    JoinType.Miter,
    EndType.Polygon,
    2,
  );

  const resultPath = inflated[0];
  if (!resultPath || resultPath.length < 3) return mmPts;

  return resultPath.map((pt: Point64) => [pt.x / scale, pt.y / scale]);
}

export function getPolygonCentroid(pts: [number, number][]): [number, number] {
  if (pts.length === 0) return [0, 0];
  if (pts.length < 3) {
    return [
      pts.reduce((acc, p) => acc + p[0], 0) / pts.length,
      pts.reduce((acc, p) => acc + p[1], 0) / pts.length,
    ];
  }

  let area2 = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]!;
    const p2 = pts[(i + 1) % pts.length]!;
    const cross = p1[0] * p2[1] - p2[0] * p1[1];
    area2 += cross;
    cx += (p1[0] + p2[0]) * cross;
    cy += (p1[1] + p2[1]) * cross;
  }

  if (Math.abs(area2) < 1e-6) {
    return [
      pts.reduce((acc, p) => acc + p[0], 0) / pts.length,
      pts.reduce((acc, p) => acc + p[1], 0) / pts.length,
    ];
  }

  return [cx / (3 * area2), cy / (3 * area2)];
}

export function isPolygonInRect(
  poly: [number, number][],
  rect: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  if (poly.length < 3 || rect.maxX <= rect.minX || rect.maxY <= rect.minY) {
    return false;
  }

  const polyBounds = computeBounds([poly]);
  if (
    polyBounds.maxX < rect.minX ||
    polyBounds.minX > rect.maxX ||
    polyBounds.maxY < rect.minY ||
    polyBounds.minY > rect.maxY
  ) {
    return false;
  }

  for (const [x, y] of poly) {
    if (x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY) {
      return true;
    }
  }

  const rectCorners: [number, number][] = [
    [rect.minX, rect.minY],
    [rect.maxX, rect.minY],
    [rect.maxX, rect.maxY],
    [rect.minX, rect.maxY],
  ];
  for (const corner of rectCorners) {
    if (pointInPolygon(corner, poly)) {
      return true;
    }
  }

  const rectEdges: [[number, number], [number, number]][] = [
    [rectCorners[0]!, rectCorners[1]!],
    [rectCorners[1]!, rectCorners[2]!],
    [rectCorners[2]!, rectCorners[3]!],
    [rectCorners[3]!, rectCorners[0]!],
  ];

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    for (const [c, d] of rectEdges) {
      if (segmentsIntersect(a, b, c, d)) {
        return true;
      }
    }
  }

  return false;
}

export function buildTileGridPlan(
  tileBounds: Bounds,
  activePolygons: [number, number][][],
  portraitTileWmm: number,
  portraitTileHmm: number,
): TileGridPlan {
  const epsMm = 0.5;

  const evaluateOrientation = (wMm: number, hMm: number) => {
    const cols = Math.max(1, Math.ceil(tileBounds.width / wMm));
    const rows = Math.max(1, Math.ceil(tileBounds.height / hMm));
    const nonEmpty = new Set<string>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tileRect = {
          minX: tileBounds.minX + c * wMm + epsMm,
          maxX: tileBounds.minX + (c + 1) * wMm - epsMm,
          maxY: tileBounds.maxY - r * hMm - epsMm,
          minY: tileBounds.maxY - (r + 1) * hMm + epsMm,
        };
        if (
          activePolygons.length === 0 ||
          activePolygons.some((poly) => isPolygonInRect(poly, tileRect))
        ) {
          nonEmpty.add(`${r}:${c}`);
        }
      }
    }

    if (nonEmpty.size === 0) {
      nonEmpty.add('0:0');
    }

    return { cols, rows, nonEmpty };
  };

  const portrait = evaluateOrientation(portraitTileWmm, portraitTileHmm);
  const landscape = evaluateOrientation(portraitTileHmm, portraitTileWmm);

  const useLandscape = landscape.nonEmpty.size < portrait.nonEmpty.size;
  const tileWmm = useLandscape ? portraitTileHmm : portraitTileWmm;
  const tileHmm = useLandscape ? portraitTileWmm : portraitTileHmm;
  const { cols, rows, nonEmpty } = useLandscape ? landscape : portrait;

  const activeCells = new Map<string, number>();
  let pageCounter = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r}:${c}`;
      if (nonEmpty.has(key)) {
        pageCounter++;
        activeCells.set(key, pageCounter);
      }
    }
  }

  return {
    useLandscape,
    tileWmm,
    tileHmm,
    cols,
    rows,
    activeCells,
    totalPages: pageCounter,
  };
}

export function getTileCode(row: number, col: number): string {
  let rowLabel = '';
  let n = row;
  do {
    rowLabel = String.fromCharCode(65 + (n % 26)) + rowLabel;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${rowLabel}${col + 1}`;
}

export function formatPieceLabel(
  placement: PlacementDto,
  pieceNumber: number,
): string {
  const totalRotation =
    ((((placement.rotationAngle ?? 0) + (placement.isFlipped180 ? 180 : 0)) %
      360) +
      360) %
    360;
  const parts = [`#${pieceNumber}`];
  if (placement.isMirrored) parts.push('M');
  if (totalRotation !== 0) parts.push(`${totalRotation}°`);
  return parts.join('·');
}

function pointInPolygon(
  pt: [number, number],
  poly: [number, number][],
): boolean {
  let inside = false;
  const [px, py] = pt;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number],
): boolean {
  const ccw = (
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
  ) => (p3[1] - p1[1]) * (p2[0] - p1[0]) > (p2[1] - p1[1]) * (p3[0] - p1[0]);
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}
