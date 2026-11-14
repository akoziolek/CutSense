import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import {
  algorithmTypes,
  fabrics,
  optimizationResults,
  optimizationRuns,
  patternPieces,
  patterns,
  placedPieces,
} from '../../db/schema/schema.js';
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
import type { OptimizationViewDto } from './dto/optimization-view.dto.js';
import {
  AVAILABLE_ALGORITHMS,
  DEFAULT_CUTTING_ALLOWANCE_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
  ENGINE_ALGORITHM_IDS,
  MAX_TOTAL_COPIES,
} from './optimizations.constants.js';
import { OptimizationRunsStore } from './optimization-runs.store.js';
import {
  OPTIMIZER_ENGINE,
  type OptimizerEngine,
} from '../optimizer-engine/optimizer-engine.types.js';
import {
  fromEngineResult,
  toEngineInput,
} from '../optimizer-engine/optimizer-engine.mapper.js';
import { patternImages } from '../../db/schema/schema.js';
import { likePattern } from '../../common/utils/list-query.js';
import { StorageService } from '../storage/storage.service.js';
import {
  ListOptimizationsQueryDto,
  OptimizationSortOption,
} from './dto/list-optimizations-query.dto.js';
import type { OptimizationListResponseDto } from './dto/optimization-list.dto.js';
import type { StoredRun } from './optimization-runs.store.js';
import type { SaveOptimizationDto } from './dto/save-optimization.dto.js';
import { OptimizationViewMapper } from './optimization-view.mapper.js';

const isSet = (value: unknown) => value !== undefined && value !== null;

@Injectable()
export class OptimizationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(OPTIMIZER_ENGINE) private readonly engine: OptimizerEngine,
    private readonly runs: OptimizationRunsStore,
    private readonly storageService: StorageService,
    private readonly viewMapper: OptimizationViewMapper,
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

  async run(dto: CreateOptimizationDto, currentUserId?: number): Promise<OptimizationViewDto> {
    const input = await this.prepareOptimization(dto, currentUserId);
    const engineInput = toEngineInput(input, ENGINE_ALGORITHM_IDS[input.algorithmName]!);
    const result = fromEngineResult(await this.engine.run(engineInput));

    const runId = await this.runs.put({ userId: currentUserId ?? null, input, result });
    return this.viewMapper.toView(this.viewMapper.sourceFromInput(input, result), { runId, isSaved: false });
  }

  async getRun(runId: string, currentUserId?: number): Promise<OptimizationViewDto> {
    const run = await this.findRun(runId, currentUserId);
    return this.viewMapper.toView(this.viewMapper.sourceFromInput(run.input, run.result), {
      runId,
      id: run.savedId,
      name: run.savedName,
      isSaved: run.savedId !== undefined,
    });
  }

  private async findRun(runId: string, currentUserId?: number) {
    const run = await this.runs.get(runId);
    if (!run || (run.userId !== null && run.userId !== currentUserId)) {
      throw new ResourceNotFoundException('Optimization run', runId);
    }
    return run;
  }

  async getOptimizations(
    query: ListOptimizationsQueryDto,
    userId: number,
  ): Promise<OptimizationListResponseDto> {
    const { page, limit, sort } = query;
    const term = likePattern(query.q);
    const where = and(
      eq(optimizationResults.userId, userId),
      term ? ilike(optimizationResults.name, term) : undefined,
    )!;

    const firstImage = this.db
      .selectDistinctOn([patternImages.patternId], {
        patternId: patternImages.patternId,
        pictureS3Key: patternImages.pictureS3Key,
      })
      .from(patternImages)
      .orderBy(patternImages.patternId, asc(patternImages.orderIndex), asc(patternImages.id))
      .as('first_image');

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: optimizationResults.id,
          name: optimizationResults.name,
          createdAt: optimizationResults.createdAt,
          patternId: optimizationResults.patternId,
          patternName: patterns.name,
          pictureS3Key: firstImage.pictureS3Key,
          minLengthMm: optimizationResults.minLengthMm,
        })
        .from(optimizationResults)
        .innerJoin(patterns, eq(patterns.id, optimizationResults.patternId))
        .leftJoin(firstImage, eq(firstImage.patternId, optimizationResults.patternId))
        .where(where)
        .orderBy(...this.getOrderBy(sort))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(optimizationResults).where(where),
    ]);

    const keys = rows.flatMap((row) => (row.pictureS3Key ? [row.pictureS3Key] : []));
    const imageUrls = await this.storageService.generatePresignedUrls(keys);

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        patternId: row.patternId,
        patternName: row.patternName,
        imageUrl: row.pictureS3Key ? imageUrls.get(row.pictureS3Key) : undefined,
        minLengthMm: row.minLengthMm,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getOrderBy(sort: OptimizationSortOption): SQL[] {
    const nameLower = sql`lower(${optimizationResults.name})`;
    switch (sort) {
      case OptimizationSortOption.NAME_ASC:
        return [asc(nameLower), asc(optimizationResults.id)];
      case OptimizationSortOption.NAME_DESC:
        return [desc(nameLower), desc(optimizationResults.id)];
      case OptimizationSortOption.DATE_ASC:
        return [asc(optimizationResults.createdAt), asc(optimizationResults.id)];
      case OptimizationSortOption.DATE_DESC:
      default:
        return [desc(optimizationResults.createdAt), desc(optimizationResults.id)];
    }
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
        images: {
          with: {
            pieces: {
              columns: { id: true, grainline: true },
              extras: (piece, { sql }) => ({
                geojson: sql<string>`ST_AsGeoJSON(${piece.boundary})`.as('geojson'),
              }),
            },
          },
        },
      },
    });
    if (!pattern || (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId)) {
      throw new ResourceNotFoundException('Pattern', dto.patternId);
    }

    const patternPiecesById = new Map(
      pattern.images.flatMap((image) =>
        image.pieces.map((piece) => [
          piece.id,
          {
            boundary: PatternsMapper.piecePointsFromGeoJson(piece.geojson),
            grainline: piece.grainline,
          }
        ]),
      ),
    );
    const preparedPieces = dto.pieces.map((piece) => {
      const pieceData = patternPiecesById.get(piece.patternPieceId);
      if (!pieceData) {
        throw new RequestValidationException(
          'One or more pieces do not belong to the selected pattern.',
        );
      }

      return {
        patternPieceId: piece.patternPieceId,
        boundary: this.toOptimizerPoints(pieceData.boundary),
        grainline: pieceData.grainline,
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
        throw new RequestValidationException('Provide both custom fabric width and length.');
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

  private async getLibraryFabric(
    fabricId: number,
    currentUserId: number,
  ): Promise<OptimizerFabricInputDto> {
    const fabric = await this.db.query.fabrics.findFirst({
      where: and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
      columns: { id: true, imageWidthMm: true, imageHeightMm: true },
      extras: {
        boundaryGeoJson: sql<string>`ST_AsGeoJSON(${fabrics.boundary})`.as('boundary_geo_json'),
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

  private assertValidRequest(dto: CreateOptimizationDto, currentUserId?: number): void {
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
    const totalCopies = dto.pieces.reduce((sum, p) => sum + p.normalCount + p.mirroredCount, 0);
    if (totalCopies > MAX_TOTAL_COPIES) {
      throw new RequestValidationException(
        `At most ${MAX_TOTAL_COPIES} piece copies can be optimized at once.`,
      );
    }
  }

  async save(runId: string, dto: SaveOptimizationDto, currentUserId: number): Promise<{ id: number }> {
    const run = await this.findRun(runId, currentUserId);
    if (run.savedId !== undefined) return { id: run.savedId };
    if (!run.result.wasSuccessful) {
      throw new RequestValidationException('Only a successful optimization can be saved.');
    }
    return { id: await this.persistRun(run, dto.name, currentUserId) };
  }

  private async persistRun(run: StoredRun, name: string, userId: number): Promise<number> {
    const { input, result } = run;
    const { stats } = result;
    const isLibrary = input.fabric.fabricId !== undefined;
    const { placements } = this.viewMapper.toView(this.viewMapper.sourceFromInput(input, result), { isSaved: false });

    try {
      return await this.db.transaction(async (tx) => {
        const [locked] = await tx
          .select({ userId: optimizationRuns.userId, savedId: optimizationRuns.savedId })
          .from(optimizationRuns)
          .where(eq(optimizationRuns.id, run.id))
          .for('update');
        if (!locked || (locked.userId !== null && locked.userId !== userId)) {
          throw new ResourceNotFoundException('Optimization run', run.id);
        }
        if (locked.savedId !== null) return locked.savedId;
        const [created] = await tx
          .insert(optimizationResults)
          .values({
            name,
            userId,
            patternId: input.patternId,
            algorithmId: input.algorithmId,
            customFabricId: input.fabric.fabricId ?? null,
            fabricWidth: isLibrary ? null : input.fabric.widthMm,
            fabricLength: isLibrary ? null : input.fabric.lengthMm,
            seamAllowance: input.seamAllowanceMm,
            cuttingAllowance: input.cuttingAllowanceMm,
            minLengthMm: Math.round(result.minLength),
            spentTime: Math.min(Math.round(result.executionTime), 32_767), // smallint
            usableScrapsArea: Math.round(stats.usableScrapsArea),
            usableScrapsPercentage: Math.round(stats.usableScrapsPercentage),
            wasteScrapsArea: Math.round(stats.wasteArea),
            wasteScrapsPercentage: Math.round(stats.wastePercentage),
            remainingFabricArea: Math.round(stats.remainingFabricArea),
            remainingAreaPercentage: Math.round(stats.remainingFabricPercentage),
          })
          .returning({ id: optimizationResults.id });

        if (!created) throw new Error('Optimization insert did not return a row.');

        if (placements.length > 0) {
          await tx.insert(placedPieces).values(
            placements.map((p) => ({
              patternPieceId: p.patternPieceId,
              optimizationResultId: created.id,
              rotationAngle: (p.rotationAngle + (p.isFlipped180 ? 180 : 0)) % 360,
              isMirrored: p.isMirrored,
              placement: { x: p.x, y: p.y },
            })),
          );
        }

        await tx
          .update(optimizationRuns)
          .set({ savedId: created.id, savedName: name, userId })
          .where(eq(optimizationRuns.id, run.id));

        return created.id;
      });
    } catch (e) {
      const err = ((e as { cause?: unknown }).cause ?? e) as { code?: string };
      if (err.code === '23503') throw new ResourceNotFoundException('Pattern', input.patternId);
      throw e;
    }
  }

  async getSaved(id: number, userId: number): Promise<OptimizationViewDto> {
    const row = await this.db.query.optimizationResults.findFirst({
      where: and(eq(optimizationResults.id, id), eq(optimizationResults.userId, userId)),
      with: { algorithm: { columns: { name: true } } },
    });
    if (!row) throw new ResourceNotFoundException('Optimization', id);

    const fabric: OptimizerFabricInputDto =
      row.customFabricId !== null
        ? await this.getLibraryFabric(row.customFabricId, userId)
        : {
            fabricId: undefined,
            widthMm: row.fabricWidth ?? 0,
            lengthMm: row.fabricLength ?? 0,
            boundary: this.rectangularBoundary(row.fabricWidth ?? 0, row.fabricLength ?? 0),
          };

    const placed = await this.db
      .select({
        patternPieceId: placedPieces.patternPieceId,
        rotationAngle: placedPieces.rotationAngle,
        isMirrored: placedPieces.isMirrored,
        placement: placedPieces.placement,
        grainline: patternPieces.grainline,
        geojson: sql<string>`ST_AsGeoJSON(${patternPieces.boundary})`,
      })
      .from(placedPieces)
      .innerJoin(patternPieces, eq(patternPieces.id, placedPieces.patternPieceId))
      .where(eq(placedPieces.optimizationResultId, id))
      .orderBy(asc(placedPieces.id));

    return {
      id: row.id,
      name: row.name,
      isSaved: true,
      algorithmName: row.algorithm.name,
      fabric,
      seamAllowanceMm: row.seamAllowance,
      cuttingAllowanceMm: row.cuttingAllowance,
      wasSuccessful: true,
      minLengthMm: row.minLengthMm,
      stats: {
        usableScrapsArea: row.usableScrapsArea,
        usableScrapsPercentage: row.usableScrapsPercentage,
        remainingFabricArea: row.remainingFabricArea,
        remainingFabricPercentage: row.remainingAreaPercentage,
        wasteArea: row.wasteScrapsArea,
        wastePercentage: row.wasteScrapsPercentage,
      },
      placements: placed.map((p) =>
        this.viewMapper.placeOne(
          {
            boundary: this.toOptimizerPoints(PatternsMapper.piecePointsFromGeoJson(p.geojson)),
            grainline: p.grainline,
          },
          {
            id: p.patternPieceId,
            rotationAngle: p.rotationAngle,
            isMirrored: p.isMirrored,
            isFlipped180: false,
            x: p.placement.x,
            y: p.placement.y,
          },
          p.placement.x,
          p.placement.y,
        ),
      ),
    };
  }
}