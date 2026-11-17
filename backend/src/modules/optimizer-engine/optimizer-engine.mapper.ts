import type {
  OptimizerInputDto,
  OptimizerPointDto,
} from '../optimizations/dto/optimizer-input.dto.js';
import type {
  EngineFabric,
  EngineInput,
  EnginePiece,
  EnginePoint,
  EngineResult,
} from './optimizer-engine.types.js';
const toInt = (v: number) => Math.trunc(v);

const pt = ([x, y]: OptimizerPointDto): EnginePoint => ({
  x: toInt(x),
  y: toInt(y),
});

export function toEngineInput(
  input: OptimizerInputDto,
  algorithmId: number,
): EngineInput {
  const fabric: EngineFabric =
    input.fabric.fabricId === undefined
      ? {
          width: toInt(input.fabric.widthMm),
          length: toInt(input.fabric.lengthMm),
        }
      : {
          boundary: input.fabric.boundary.map(pt),
          grainline: input.fabric.grainline ?? 0,
        };

  const seamAllowance = toInt(input.seamAllowanceMm);
  const cuttingAllowance = toInt(input.cuttingAllowanceMm);
  const enginePieces: EnginePiece[] = [];

  for (const [index, p] of input.pieces.entries()) {
    const constraints = [];

    if (p.normalCount > 0) {
      constraints.push({
        rotationAngle: p.direction,
        isMirrored: false,
        requiredQuantity: p.normalCount,
        twoWay: p.twoWay,
      });
    }

    if (p.mirroredCount > 0) {
      constraints.push({
        rotationAngle: p.direction,
        isMirrored: true,
        requiredQuantity: p.mirroredCount,
        twoWay: p.twoWay,
      });
    }

    if (constraints.length > 0) {
      enginePieces.push({
        id: index + 1,
        points: p.boundary.map(pt),
        grainline: p.grainline,
        seamAllowance,
        cuttingAllowance,
        constraints,
      });
    }
  }

  return { fabric, pieces: enginePieces, algorithmId };
}

export function fromEngineResult(
  r: EngineResult,
  pieces: OptimizerInputDto['pieces'],
): EngineResult {
  const patternPieceIdByEngineId = new Map(
    pieces.map((piece, index) => [index + 1, piece.patternPieceId]),
  );

  return {
    ...r,
    positions: r.positions.map((p) => {
      const patternPieceId = patternPieceIdByEngineId.get(p.id);
      if (patternPieceId === undefined) {
        throw new Error(`Optimizer returned unknown piece ID ${p.id}`);
      }

      return {
        ...p,
        id: patternPieceId,
      };
    }),
  };
}