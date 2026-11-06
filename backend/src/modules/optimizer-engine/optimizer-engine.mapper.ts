import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import type { OptimizerInputDto, OptimizerPointDto } from '../optimizations/dto/optimizer-input.dto.js';
import type {
  EngineFabric, EngineInput, EnginePiece, EnginePoint, EngineResult,
} from './optimizer-engine.types.js';

// engine int64 units per millimetre. CONFIRM with the engine author.
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
        seamAllowance: input.seamAllowanceMm * SCALE,
        cuttingAllowance: input.cuttingAllowanceMm * SCALE,
      };
      byId.set(p.patternPieceId, piece);
    }
    if (p.normalCount > 0) {
      piece.constraints.push({
        rotationAngle: p.direction, isMirrored: false,
        requiredQuantity: p.normalCount, twoWay: p.twoWay,
      });
    }
    if (p.mirroredCount > 0) {
      piece.constraints.push({
        rotationAngle: p.direction, isMirrored: true,
        requiredQuantity: p.mirroredCount, twoWay: p.twoWay,
      });
    }
  }

  const result = { fabric, pieces: [...byId.values()] };
  assertValidEngineInput(result);
  return result;
}

// The engine silently turns missing/NaN numbers into 0, so check here.
function assertValidEngineInput({ fabric, pieces }: EngineInput): void {
  const bad = (p: EnginePoint) => !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y);
  const polygons: EnginePoint[][] = pieces.map((p) => p.points);
  if ('boundary' in fabric) polygons.push(fabric.boundary);
  if (polygons.some((poly) => poly.length < 3 || poly.some(bad))) {
    throw new RequestValidationException('Optimizer input contains an invalid polygon.');
  }
  if (pieces.length === 0 || pieces.some((p) => p.constraints.length === 0)) {
    throw new RequestValidationException('Optimizer input contains a piece without copies.');
  }
}

export const fromEngineResult = (r: EngineResult): EngineResult => ({
  ...r,
  minLength: r.minLength / SCALE,
  positions: r.positions.map((p) => ({ ...p, x: p.x / SCALE, y: p.y / SCALE })),
});