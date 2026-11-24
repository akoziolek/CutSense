import type {
  OptimizerFabricInputDto,
  OptimizerInputDto,
  OptimizerPointDto,
} from './dto/optimizer-input.dto.js';
import { withoutClosingPoint } from '../../common/geometry/shapes-geometry.js';
import type {
  OptimizationViewDto,
  FabricMetadataDto,
  PatternSummaryDto,
  PlacementDto,
} from './dto/optimization-view.dto.js';
import type {
  EnginePosition,
  EngineResult,
} from '../optimizer-engine/optimizer-engine.types.js';
import { placePiece } from '../../common/geometry/shapes-geometry.js';

export interface ViewSource {
  algorithmName: string;
  fabric: OptimizerFabricInputDto;
  fabricMetadata?: FabricMetadataDto;
  pattern?: PatternSummaryDto;
  seamAllowanceMm: number;
  cuttingAllowanceMm: number;
  geometry: Map<number, { boundary: OptimizerPointDto[]; grainline: number }>;
  result: EngineResult;
}

export type ViewExtra = Partial<
  Pick<OptimizationViewDto, 'runId' | 'id' | 'name'>
> & {
  isSaved: boolean;
};

function isPointTuple(point: unknown): point is [number, number] {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    typeof point[0] === 'number' &&
    typeof point[1] === 'number'
  );
}

function isPointObject(point: unknown): point is OptimizerPointDto {
  if (typeof point !== 'object' || point === null) return false;
  return (
    'x' in point &&
    typeof point.x === 'number' &&
    'y' in point &&
    typeof point.y === 'number'
  );
}

export class OptimizationViewMapper {
  static toOptimizerPoints(points: unknown[]): OptimizerPointDto[] {
    const normalized = points.map((point) => {
      if (isPointObject(point)) return { x: point.x, y: point.y };
      if (isPointTuple(point)) return { x: point[0], y: point[1] };
      throw new Error('Optimization boundary contains an invalid point.');
    });

    return withoutClosingPoint(
      normalized,
      (first, last) => first.x === last.x && first.y === last.y,
    );
  }

  static rectangularBoundary(
    widthMm: number,
    lengthMm: number,
  ): OptimizerPointDto[] {
    return [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: lengthMm },
      { x: 0, y: lengthMm },
    ];
  }

  static customFabric(
    widthMm: number,
    lengthMm: number,
  ): OptimizerFabricInputDto {
    return {
      fabricId: undefined,
      widthMm,
      lengthMm,
      grainline: 0,
      boundary: this.rectangularBoundary(widthMm, lengthMm),
    };
  }

  static libraryFabric(raw: {
    id: number;
    widthMm: number;
    lengthMm: number;
    grainline: number;
    boundary: OptimizerPointDto[];
  }): OptimizerFabricInputDto {
    const pts = this.toOptimizerPoints(raw.boundary);
    if (pts.length === 0) {
      return {
        fabricId: raw.id,
        widthMm: raw.widthMm,
        lengthMm: raw.lengthMm,
        grainline: raw.grainline,
        boundary: [],
      };
    }

    return {
      fabricId: raw.id,
      widthMm: raw.widthMm,
      lengthMm: raw.lengthMm,
      grainline: raw.grainline,
      boundary: pts,
    };
  }

  static fabricMetadata(raw: FabricMetadataDto): FabricMetadataDto {
    return {
      name: raw.name,
      createdAt: raw.createdAt,
    };
  }

  static sourceFromInput(
    input: OptimizerInputDto,
    result: EngineResult,
    pattern?: PatternSummaryDto,
    fabricMetadata?: FabricMetadataDto,
  ): ViewSource {
    return {
      algorithmName: input.algorithmName,
      fabric: {
        ...input.fabric,
        boundary: this.toOptimizerPoints(input.fabric.boundary),
      },
      fabricMetadata,
      pattern,
      seamAllowanceMm: input.seamAllowanceMm,
      cuttingAllowanceMm: input.cuttingAllowanceMm,
      geometry: new Map(
        input.pieces.map((p) => [
          p.patternPieceId,
          {
            boundary: this.toOptimizerPoints(p.boundary),
            grainline: p.grainline,
          },
        ]),
      ),
      result,
    };
  }

  static toView(src: ViewSource, extra: ViewExtra): OptimizationViewDto {
    return {
      ...extra,
      algorithmName: src.algorithmName,
      fabric: { ...src.fabric, ...src.fabricMetadata },
      ...(src.pattern ? { pattern: src.pattern } : {}),
      seamAllowanceMm: src.seamAllowanceMm,
      cuttingAllowanceMm: src.cuttingAllowanceMm,
      wasSuccessful: src.result.wasSuccessful,
      minLengthMm: src.result.minLength,
      executionTime: src.result.executionTime,
      stats: src.result.stats,
      placements: src.result.positions.flatMap((pos) => {
        const piece = src.geometry.get(pos.id);
        if (!piece) return [];
        return [
          this.placeOne(piece, pos, pos.x, pos.y, src.fabric.grainline ?? 0),
        ];
      }),
    };
  }

  static placeOne(
    piece: { boundary: OptimizerPointDto[]; grainline: number },
    pos: EnginePosition,
    x: number,
    y: number,
    fabricGrainline = 0,
  ): PlacementDto {
    const polygon = placePiece(piece.boundary, {
      ...pos,
      grainline: piece.grainline,
      fabricGrainline,
      x,
      y,
    });

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