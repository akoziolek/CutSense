import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import type { OptimizerInputDto, OptimizerPointDto } from '../optimizations/dto/optimizer-input.dto.js';
import type {
  EngineFabric,
  EngineInput,
  EnginePiece,
  EnginePoint,
  EngineResult,
} from './optimizer-engine.types.js';

export const SCALE = 1000;

const pt = ([x, y]: OptimizerPointDto): EnginePoint => ({
  x: Math.round(x * SCALE),
  y: Math.round(y * SCALE),
});

export function toEngineInput(input: OptimizerInputDto): EngineInput {
  const fabric: EngineFabric =
    input.fabric.fabricId === undefined
      ? {
          width: Math.round(input.fabric.widthMm * SCALE),
          length: Math.round(input.fabric.lengthMm * SCALE),
        }
      : { boundary: input.fabric.boundary.map(pt) };

  // The same pattern piece may appear several times in the DTO (duplicated cards).
  // The engine identifies pieces by id, so merge them into one piece with many constraints.
  const byId = new Map<number, EnginePiece>();
  for (const p of input.pieces) {
    let piece = byId.get(p.patternPieceId);
    if (!piece) {
      piece = {
        id: p.patternPieceId,
        points: p.boundary.map(pt),
        constraints: [],
        seamAllowance: Math.round(input.seamAllowanceMm * SCALE),
        cuttingAllowance: Math.round(input.cuttingAllowanceMm * SCALE),
      };
      byId.set(p.patternPieceId, piece);
    }
    if (p.normalCount > 0) {
      piece.constraints.push({
        rotationAngle: p.direction,
        isMirrored: false,
        requiredQuantity: p.normalCount,
        twoWay: p.twoWay,
      });
    }
    if (p.mirroredCount > 0) {
      piece.constraints.push({
        rotationAngle: p.direction,
        isMirrored: true,
        requiredQuantity: p.mirroredCount,
        twoWay: p.twoWay,
      });
    }
  }

  const result: EngineInput = { fabric, pieces: [...byId.values()] };
  assertValidEngineInput(result);
  return result;
}

// The engine would silently turn missing/NaN numbers into 0, so check here.
function assertValidEngineInput({ fabric, pieces }: EngineInput): void {
  const badNumber = (n: number) => !Number.isSafeInteger(n);
  const badPoint = (p: EnginePoint) => badNumber(p.x) || badNumber(p.y);

  if ('width' in fabric && (badNumber(fabric.width) || badNumber(fabric.length) || fabric.width <= 0 || fabric.length <= 0)) {
    throw new RequestValidationException('Optimizer input contains invalid fabric dimensions.');
  }

  const polygons: EnginePoint[][] = pieces.map((p) => p.points);
  if ('boundary' in fabric) polygons.push(fabric.boundary);
  if (polygons.some((poly) => poly.length < 3 || poly.some(badPoint))) {
    throw new RequestValidationException('Optimizer input contains an invalid polygon.');
  }
  if (pieces.length === 0 || pieces.some((p) => p.constraints.length === 0)) {
    throw new RequestValidationException('Optimizer input contains a piece without copies.');
  }
}

export const fromEngineResult = (r: EngineResult): EngineResult => ({
  ...r,
  minLength: r.minLength / SCALE,
  stats: {
    ...r.stats,
    usableScrapsArea: r.stats.usableScrapsArea / (SCALE * SCALE),
    remainingFabricArea: r.stats.remainingFabricArea / (SCALE * SCALE),
    wasteArea: r.stats.wasteArea / (SCALE * SCALE),
    remainingFabricLength: r.stats.remainingFabricLength / SCALE,
  },
  positions: r.positions.map((p) => ({ ...p, x: p.x / SCALE, y: p.y / SCALE })),
});