import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { algorithmTypes, fabrics, patterns } from '../../db/schema/schema.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { FabricMapper } from '../fabrics/fabric.mapper.js';
import { PatternsMapper } from '../patterns/patterns.mapper.js';
import type { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import type {
  OptimizerFabricInputDto,
  OptimizerInputDto,
  OptimizerPointDto,
} from './dto/optimizer-input.dto.js';
import type { AlgorithmDto } from './dto/algorithm.dto.js';
import type { OptimizationDefaultsDto } from './dto/optimization-defaults.dto.js';
import {
  AVAILABLE_ALGORITHMS,
  DEFAULT_CUTTING_ALLOWANCE_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
} from './optimizations.constants.js';

const isSet = (value: unknown) => value !== undefined && value !== null;

@Injectable()
export class OptimizationsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  getDefaults(): OptimizationDefaultsDto {
    return {
      seamAllowanceMm: DEFAULT_SEAM_ALLOWANCE_MM,
      cuttingAllowanceMm: DEFAULT_CUTTING_ALLOWANCE_MM,
    };
  }

  async getAlgorithms(): Promise<AlgorithmDto[]> {
    const rows = await this.db.query.algorithmTypes.findMany({
      where: inArray(algorithmTypes.name, AVAILABLE_ALGORITHMS),
      columns: { id: true, name: true, description: true },
      orderBy: (algorithm, { asc }) => [asc(algorithm.id)],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
    }));
  }

  async prepareOptimization(
    dto: CreateOptimizationDto,
    currentUserId?: number,
  ): Promise<OptimizerInputDto> {
    this.assertValidRequest(dto, currentUserId);

    const algorithm = await this.db.query.algorithmTypes.findFirst({
      where: and(
        eq(algorithmTypes.id, dto.algorithmId),
        inArray(algorithmTypes.name, AVAILABLE_ALGORITHMS),
      ),
      columns: { id: true, name: true },
    });
    if (!algorithm) {
      throw new RequestValidationException('The selected algorithm is not available.');
    }

    const pattern = await this.db.query.patterns.findFirst({
      where: eq(patterns.id, dto.patternId),
      columns: { id: true, userId: true, visibility: true },
      with: {
        pieces: {
          columns: { id: true },
          extras: (piece, { sql }) => ({
            geojson: sql<string>`ST_AsGeoJSON(${piece.boundary})`.as('geojson'),
          }),
        },
      },
    });
    if (
      !pattern ||
      (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId)
    ) {
      throw new ResourceNotFoundException('Pattern', dto.patternId);
    }

    const patternPieces = new Map(
      pattern.pieces.map((piece) => [
        piece.id,
        PatternsMapper.piecePointsFromGeoJson(piece.geojson),
      ]),
    );
    const preparedPieces = dto.pieces.map((piece) => {
      const boundary = patternPieces.get(piece.patternPieceId);
      if (!boundary) {
        throw new RequestValidationException(
          'One or more pieces do not belong to the selected pattern.',
        );
      }

      return {
        patternPieceId: piece.patternPieceId,
        boundary: this.toOptimizerPoints(boundary),
        normalCount: piece.normalCount,
        mirroredCount: piece.mirroredCount,
        direction: piece.direction,
        twoWay: piece.twoWay,
      };
    });

    let fabric: OptimizerFabricInputDto;
    if (dto.fabricId !== undefined && dto.fabricId !== null) {
      if (currentUserId === undefined) {
        throw new RequestValidationException(
          'Guests can only optimize using custom fabric dimensions.',
        );
      }
      fabric = await this.getLibraryFabric(dto.fabricId, currentUserId);
    } else {
      const widthMm = dto.fabricWidthMm;
      const lengthMm = dto.fabricLengthMm;
      if (widthMm === undefined || lengthMm === undefined) {
        throw new RequestValidationException(
          'Provide both custom fabric width and length.',
        );
      }
      fabric = {
        fabricId: undefined,
        widthMm,
        lengthMm,
        boundary: this.rectangularBoundary(widthMm, lengthMm),
      };
    }

    return {
      patternId: pattern.id,
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      fabric,
      seamAllowanceMm: dto.seamAllowanceMm,
      cuttingAllowanceMm: dto.cuttingAllowanceMm,
      pieces: preparedPieces,
    };
  }

  private async getLibraryFabric(fabricId: number, currentUserId: number) {
    const fabric = await this.db.query.fabrics.findFirst({
      where: and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
      columns: {
        id: true,
        imageWidthMm: true,
        imageHeightMm: true,
      },
      extras: {
        boundaryGeoJson: sql<string>`ST_AsGeoJSON(${fabrics.boundary})`.as(
          'boundary_geo_json',
        ),
      },
    });
    if (!fabric) throw new ResourceNotFoundException('Fabric', fabricId);

    return {
      fabricId: fabric.id,
      widthMm: fabric.imageWidthMm,
      lengthMm: fabric.imageHeightMm,
      boundary: this.toOptimizerPoints(
        FabricMapper.boundaryFromGeoJson(fabric.boundaryGeoJson).map(
          ({ x, y }): OptimizerPointDto => [x, y],
        ),
      ),
    };
  }

  private rectangularBoundary(widthMm: number, lengthMm: number): OptimizerPointDto[] {
    return [
      [0, 0],
      [widthMm, 0],
      [widthMm, lengthMm],
      [0, lengthMm],
    ];
  }

  private toOptimizerPoints(points: [number, number][]): OptimizerPointDto[] {
    const boundary = points.map(([x, y]) => [x, y] as OptimizerPointDto);
    const first = boundary[0];
    const last = boundary.at(-1);
    if (first && last && first[0] === last[0] && first[1] === last[1]) {
      boundary.pop();
    }
    return boundary;
  }

  private assertValidRequest(
    dto: CreateOptimizationDto,
    currentUserId?: number,
  ): void {
    const hasLibraryFabric = isSet(dto.fabricId);
    const hasWidth = isSet(dto.fabricWidthMm);
    const hasLength = isSet(dto.fabricLengthMm);

    if (!currentUserId && hasLibraryFabric) {
      throw new RequestValidationException(
        'Guests can only optimize using custom fabric dimensions.',
      );
    }
    if (hasLibraryFabric && (hasWidth || hasLength)) {
      throw new RequestValidationException(
        'Choose either a fabric from the library or custom dimensions, not both.',
      );
    }
    if (!hasLibraryFabric && !(hasWidth && hasLength)) {
      throw new RequestValidationException(
        'Provide a fabric from the library or both the custom width and length.',
      );
    }
    if (dto.pieces.some((piece) => piece.normalCount + piece.mirroredCount < 1)) {
      throw new RequestValidationException(
        'Every piece needs at least one normal or mirrored copy.',
      );
    }
  }
}
