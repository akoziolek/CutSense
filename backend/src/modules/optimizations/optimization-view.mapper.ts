import { Injectable } from '@nestjs/common';
import type { OptimizerFabricInputDto, OptimizerInputDto, OptimizerPointDto } from './dto/optimizer-input.dto.js';
import type { OptimizationViewDto, PlacementDto } from './dto/optimization-view.dto.js';
import type { EnginePosition, EngineResult } from '../optimizer-engine/optimizer-engine.types.js';
import { fabricOriginYMm } from '../optimizer-engine/optimizer-engine.mapper.js';
import { placePiece } from '../../common/geometry/shapes-geometry.js';

export interface ViewSource {
  algorithmName: string;
  fabric: OptimizerFabricInputDto;
  seamAllowanceMm: number;
  cuttingAllowanceMm: number;
  geometry: Map<number, { boundary: OptimizerPointDto[]; grainline: number }>;
  result: EngineResult;
}

export type ViewExtra = Partial<Pick<OptimizationViewDto, 'runId' | 'id' | 'name'>> & {
  isSaved: boolean;
};

@Injectable()
export class OptimizationViewMapper {
  sourceFromInput(input: OptimizerInputDto, result: EngineResult): ViewSource {
    return {
      algorithmName: input.algorithmName,
      fabric: input.fabric,
      seamAllowanceMm: input.seamAllowanceMm,
      cuttingAllowanceMm: input.cuttingAllowanceMm,
      geometry: new Map(
        input.pieces.map((p) => [
          p.patternPieceId,
          { boundary: p.boundary, grainline: p.grainline },
        ]),
      ),
      result,
    };
  }

  toView(src: ViewSource, extra: ViewExtra): OptimizationViewDto {
    const allowanceMm = src.seamAllowanceMm + src.cuttingAllowanceMm;
    const originYMm = fabricOriginYMm(src.fabric);

    return {
      ...extra,
      algorithmName: src.algorithmName,
      fabric: src.fabric,
      seamAllowanceMm: src.seamAllowanceMm,
      cuttingAllowanceMm: src.cuttingAllowanceMm,
      wasSuccessful: src.result.wasSuccessful,
      minLengthMm: src.result.minLength,
      stats: src.result.stats,

      placements: src.result.positions.flatMap((pos) => {
        const piece = src.geometry.get(pos.id);
        if (!piece) return [];
        return [this.placeOne(piece, pos, pos.x - allowanceMm, pos.y + allowanceMm + originYMm)];
      }),
    };
  }

  public placeOne(
    piece: { boundary: OptimizerPointDto[]; grainline: number },
    pos: EnginePosition,
    x: number,
    y: number,
  ): PlacementDto {
    const polygon = placePiece(
      piece.boundary.map(([px, py]) => ({ x: px, y: py })),
      { ...pos, grainline: piece.grainline, x, y },
    ).map(({ x: px, y: py }): [number, number] => [px, py]);

    return {
      patternPieceId: pos.id,
      isMirrored: pos.isMirrored,
      rotationAngle: pos.rotationAngle,
      isFlipped180: pos.isFlipped180,
      x,
      y,
      polygon,
    };
  }
}