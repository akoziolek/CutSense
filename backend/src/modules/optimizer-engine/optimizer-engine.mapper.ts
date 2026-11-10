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

export const UNITS = {
  inputPerMm: 1,
  positionPerMm: 1,
  lengthMm: 1,
  areaMm2: 1,
};

const pt = ([x, y]: OptimizerPointDto): EnginePoint => ({
  x: Math.round(x * UNITS.inputPerMm),
  y: Math.round(y * UNITS.inputPerMm),
});

export function fabricOriginYMm(fabric: OptimizerInputDto['fabric']): number {
  if (fabric.fabricId === undefined || fabric.boundary.length === 0) return 0;
  return Math.min(...fabric.boundary.map(([, y]) => Math.round(y * UNITS.inputPerMm)));
}

export function toEngineInput(
  input: OptimizerInputDto,
  algorithmId: number,
): EngineInput {
  const fabric: EngineFabric =
    input.fabric.fabricId === undefined
      ? {
          width: Math.round(input.fabric.widthMm * UNITS.inputPerMm),
          length: Math.round(input.fabric.lengthMm * UNITS.inputPerMm),
        }
      : {
          boundary: input.fabric.boundary.map(([x, y]) => ({
            x: Math.round(x * UNITS.inputPerMm),
            y: Math.round(y * UNITS.inputPerMm),
          })),
        };

  const enginePieces: EnginePiece[] = [];

  for (const p of input.pieces) {
    const seamAllowance = Math.round(input.seamAllowanceMm * UNITS.inputPerMm);
    const cuttingAllowance = Math.round(
      input.cuttingAllowanceMm * UNITS.inputPerMm,
    );
    const points = p.boundary.map(pt);

    for (let i = 0; i < p.normalCount; i++) {
      enginePieces.push({
        id: p.patternPieceId,
        points,
        grainline: p.grainline,
        seamAllowance,
        cuttingAllowance,
        constraints: [
          {
            rotationAngle: p.direction,
            isMirrored: false,
            requiredQuantity: 1,
            twoWay: p.twoWay,
          },
        ],
      });
    }

    for (let i = 0; i < p.mirroredCount; i++) {
      enginePieces.push({
        id: p.patternPieceId,
        points,
        grainline: p.grainline,
        seamAllowance,
        cuttingAllowance,
        constraints: [
          {
            rotationAngle: p.direction,
            isMirrored: true,
            requiredQuantity: 1,
            twoWay: p.twoWay,
          },
        ],
      });
    }
  }

  return { fabric, pieces: enginePieces, algorithmId };
}

export const fromEngineResult = (r: EngineResult): EngineResult => ({
  ...r,
  minLength: r.minLength * UNITS.lengthMm,
  stats: {
    ...r.stats,
    usableScrapsArea: r.stats.usableScrapsArea * UNITS.areaMm2,
    remainingFabricArea: r.stats.remainingFabricArea * UNITS.areaMm2,
    wasteArea: r.stats.wasteArea * UNITS.areaMm2,
    remainingFabricLength: r.stats.remainingFabricLength * UNITS.lengthMm,
  },
  positions: r.positions.map((p) => ({
    ...p,
    x: p.x / UNITS.positionPerMm,
    y: p.y / UNITS.positionPerMm,
  })),
});
