import type {
  OptimizerFabricInputDto,
  OptimizerInputDto,
  OptimizerPieceInputDto,
  OptimizerPointDto,
} from '../optimizations/dto/optimizer-input.dto.js';
import type {
  EngineFabric,
  EngineInput,
  EnginePiece,
  EnginePoint,
  EngineResult,
} from './optimizer-engine.types.js';

const pt = ({ x, y }: OptimizerPointDto): EnginePoint => ({ x, y });

export interface FabricJob {
  fabric: OptimizerFabricInputDto;
  pieces: OptimizerPieceInputDto[];
  seamAllowanceMm: number;
  cuttingAllowanceMm: number;
}

export function splitByFabric(input: OptimizerInputDto): FabricJob[] {
  return input.fabrics.map((fabric, index) => ({
    fabric,
    pieces: input.pieces.filter((piece) => piece.fabricIndex === index),
    seamAllowanceMm: input.seamAllowanceMm,
    cuttingAllowanceMm: input.cuttingAllowanceMm,
  }));
}

export function toEngineInput(job: FabricJob, algorithmId: number): EngineInput {
  const fabric: EngineFabric =
    job.fabric.fabricId === undefined
      ? { width: job.fabric.widthMm, length: job.fabric.lengthMm }
      : { boundary: job.fabric.boundary.map(pt), grainline: job.fabric.grainline ?? 0 };

  const enginePieces: EnginePiece[] = [];

  for (const [index, p] of job.pieces.entries()) {
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
        seamAllowance: job.seamAllowanceMm,
        cuttingAllowance: job.cuttingAllowanceMm,
        constraints,
      });
    }
  }

  return { fabric, pieces: enginePieces, algorithmId };
}

export function fromEngineResult(
  r: EngineResult,
  pieces: FabricJob['pieces'],
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
      return { ...p, id: patternPieceId };
    }),
  };
}