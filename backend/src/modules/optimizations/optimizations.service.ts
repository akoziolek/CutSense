import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  AnyColumn,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import {
  algorithmTypes,
  fabrics,
  optimizationResults,
  optimizationRuns,
  patterns,
  placedPieces,
} from '../../db/schema/schema.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { PatternsService } from '../patterns/patterns.service.js';
import { FabricService } from '../fabrics/fabrics.service.js';
import type { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import type {
  OptimizerFabricInputDto,
  OptimizerInputDto,
} from './dto/optimizer-input.dto.js';
import type { AlgorithmDto } from './dto/algorithm.dto.js';
import type { OptimizationDefaultsDto } from './dto/optimization-defaults.dto.js';
import type {
  FabricMetadataDto,
  OptimizationViewDto,
} from './dto/optimization-view.dto.js';
import {
  AVAILABLE_ALGORITHM_IDS,
  DEFAULT_CUTTING_ALLOWANCE_MM,
  DEFAULT_SEAM_ALLOWANCE_MM,
  ENGINE_ALGORITHM_IDS,
} from './optimizations.constants.js';
import {
  OptimizationRunsStore,
  type StoredRun,
} from './optimization-runs.store.js';
import {
  OPTIMIZER_ENGINE,
  type OptimizerEngine,
  type EngineResult,
} from '../optimizer-engine/optimizer-engine.types.js';
import {
  fromEngineResult,
  toEngineInput,
} from '../optimizer-engine/optimizer-engine.mapper.js';
import { assertDateRange, likeTerm } from '../../common/utils/list-query.js';
import {
  ListOptimizationsQueryDto,
  OptimizationSortOption,
} from './dto/list-optimizations-query.dto.js';
import type { OptimizationListResponseDto } from './dto/optimization-list.dto.js';
import type { SaveOptimizationDto } from './dto/save-optimization.dto.js';
import { OptimizationViewMapper } from './optimization-view.mapper.js';
import { OptimizationFilterOptionsDto } from './dto/optimization-filter-options.dto.js';
import { BulkDeleteResponseDto } from '../../common/dto/bulk-delete.dto.js';
import { assertValidOptimizationRequest } from './optimization-request.validator.js';
import { UpdateRunPlacementsDto } from './dto/update-run-placement.dto.js';

@Injectable()
export class OptimizationsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    @Inject(OPTIMIZER_ENGINE) private readonly engine: OptimizerEngine,
    private readonly runs: OptimizationRunsStore,
    private readonly fabricsService: FabricService,
    private readonly patternsService: PatternsService,
  ) {}

  getDefaults(): OptimizationDefaultsDto {
    return {
      seamAllowanceMm: DEFAULT_SEAM_ALLOWANCE_MM,
      cuttingAllowanceMm: DEFAULT_CUTTING_ALLOWANCE_MM,
    };
  }

  async getAlgorithms(): Promise<AlgorithmDto[]> {
    const rows = await this.db.query.algorithmTypes.findMany({
      where: inArray(algorithmTypes.id, AVAILABLE_ALGORITHM_IDS),
      columns: { id: true, name: true, description: true },
      orderBy: (algorithm, { asc }) => [asc(algorithm.id)],
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
    }));
  }

  async run(
    dto: CreateOptimizationDto,
    currentUserId?: number,
  ): Promise<OptimizationViewDto> {
    const { input, fabricMetadata } =
      await this.prepareOptimizationWithMetadata(dto, currentUserId);
    const pattern = await this.patternsService.getPatternSummary(
      input.patternId,
    );
    const engineInput = toEngineInput(
      input,
      ENGINE_ALGORITHM_IDS[input.algorithmName]!,
    );
    const result = fromEngineResult(
      await this.engine.run(engineInput),
      input.pieces,
    );

    const runId = await this.runs.put({
      userId: currentUserId ?? null,
      input,
      result,
    });

    console.log('=== ENGINE INPUT ===', JSON.stringify(engineInput));
    console.log('=== RAW ENGINE RESULT ===', JSON.stringify(result));

    return OptimizationViewMapper.toView(
      OptimizationViewMapper.sourceFromInput(
        input,
        result,
        pattern,
        fabricMetadata,
        await this.getAlgorithmName(input.algorithmId),
      ),
      { runId, isSaved: false },
    );
  }

  async getRun(
    runId: string,
    currentUserId?: number,
  ): Promise<OptimizationViewDto> {
    const run = await this.findRun(runId, currentUserId);
    const source = OptimizationViewMapper.sourceFromInput(
      run.input,
      run.result,
      undefined,
      undefined,
      await this.getAlgorithmName(run.input.algorithmId),
    );
    source.fabricMetadata = await this.getFabricMetadata(
      run.input.fabric.fabricId,
      currentUserId,
    );
    if (!source.pattern) {
      source.pattern = await this.patternsService.getPatternSummary(
        run.input.patternId,
      );
    }

    return OptimizationViewMapper.toView(source, {
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

  private async getFabricMetadata(
    fabricId?: number,
    currentUserId?: number,
  ): Promise<FabricMetadataDto | undefined> {
    if (fabricId === undefined) return undefined;
    if (currentUserId === undefined) {
      throw new ResourceNotFoundException('Fabric', fabricId);
    }

    return this.fabricsService.getOwnedFabricSummary(fabricId, currentUserId);
  }

  async getOptimizations(
    query: ListOptimizationsQueryDto,
    userId: number,
  ): Promise<OptimizationListResponseDto> {
    const {
      page,
      limit,
      sort,
      createdFrom,
      createdTo,
      patternIds,
      fabricIds,
      algorithmIds,
    } = query;
    assertDateRange(createdFrom, createdTo);
    const term = likeTerm(query.q);
    const where = and(
      eq(optimizationResults.userId, userId),
      term ? ilike(optimizationResults.name, term) : undefined,
      createdFrom
        ? gte(optimizationResults.createdAt, new Date(createdFrom))
        : undefined,
      createdTo
        ? lte(optimizationResults.createdAt, new Date(createdTo))
        : undefined,
      patternIds?.length
        ? inArray(optimizationResults.patternId, patternIds)
        : undefined,
      fabricIds?.length
        ? inArray(optimizationResults.customFabricId, fabricIds)
        : undefined,
      algorithmIds?.length
        ? inArray(optimizationResults.algorithmId, algorithmIds)
        : undefined,
    )!;

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: optimizationResults.id,
          name: optimizationResults.name,
          createdAt: optimizationResults.createdAt,
          patternId: optimizationResults.patternId,
          patternName: patterns.name,
          algorithmName: algorithmTypes.name,
          fabricName: fabrics.name,
        })
        .from(optimizationResults)
        .innerJoin(patterns, eq(patterns.id, optimizationResults.patternId))
        .innerJoin(
          algorithmTypes,
          eq(algorithmTypes.id, optimizationResults.algorithmId),
        )
        .leftJoin(fabrics, eq(fabrics.id, optimizationResults.customFabricId))
        .where(where)
        .orderBy(...this.getOrderBy(sort))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(optimizationResults).where(where),
    ]);
    const covers = await this.patternsService.getPatternCovers(
      rows.map((r) => r.patternId),
      userId,
    );
    const coverByPatternId = new Map(
      covers.map((c) => [c.patternId, c.imageUrl]),
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.toISOString(),
        patternId: row.patternId,
        patternName: row.patternName,
        fabricName: row.fabricName ?? undefined,
        algorithmName: row.algorithmName,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getOrderBy(sort: OptimizationSortOption): SQL[] {
    const lower = (c: SQL | AnyColumn) => sql`lower(${c})`;
    const id = optimizationResults.id;
    switch (sort) {
      case OptimizationSortOption.NAME_ASC:
        return [asc(lower(optimizationResults.name)), asc(id)];
      case OptimizationSortOption.NAME_DESC:
        return [desc(lower(optimizationResults.name)), desc(id)];
      case OptimizationSortOption.DATE_ASC:
        return [asc(optimizationResults.createdAt), asc(id)];
      case OptimizationSortOption.PATTERN_ASC:
        return [asc(lower(patterns.name)), asc(id)];
      case OptimizationSortOption.PATTERN_DESC:
        return [desc(lower(patterns.name)), desc(id)];
      case OptimizationSortOption.FABRIC_ASC:
        return [asc(lower(sql`coalesce(${fabrics.name}, '')`)), asc(id)];
      case OptimizationSortOption.FABRIC_DESC:
        return [desc(lower(sql`coalesce(${fabrics.name}, '')`)), desc(id)];
      case OptimizationSortOption.ALGORITHM_ASC:
        return [asc(sql`lower(${algorithmTypes.name}->>'en')`), asc(id)];
      case OptimizationSortOption.ALGORITHM_DESC:
        return [desc(sql`lower(${algorithmTypes.name}->>'en')`), desc(id)];
      case OptimizationSortOption.DATE_DESC:
      default:
        return [desc(optimizationResults.createdAt), desc(id)];
    }
  }

  async delete(id: number, userId: number): Promise<void> {
    const [deleted] = await this.db
      .delete(optimizationResults)
      .where(
        and(
          eq(optimizationResults.id, id),
          eq(optimizationResults.userId, userId),
        ),
      )
      .returning({ id: optimizationResults.id });
    if (!deleted) throw new ResourceNotFoundException('Optimization', id);
  }

  async rename(
    id: number,
    name: string,
    userId: number,
  ): Promise<{ id: number; name: string }> {
    const [updated] = await this.db
      .update(optimizationResults)
      .set({ name })
      .where(
        and(
          eq(optimizationResults.id, id),
          eq(optimizationResults.userId, userId),
        ),
      )
      .returning({
        id: optimizationResults.id,
        name: optimizationResults.name,
      });
    if (!updated) throw new ResourceNotFoundException('Optimization', id);
    return updated;
  }

  async deleteOptimizations(
    ids: number[],
    userId: number,
  ): Promise<BulkDeleteResponseDto> {
    const deleted = await this.db
      .delete(optimizationResults)
      .where(
        and(
          inArray(optimizationResults.id, ids),
          eq(optimizationResults.userId, userId),
        ),
      )
      .returning({ id: optimizationResults.id });
    return { deletedIds: deleted.map((row) => row.id) };
  }

  async prepareOptimization(
    dto: CreateOptimizationDto,
    currentUserId?: number,
  ): Promise<OptimizerInputDto> {
    return (await this.prepareOptimizationWithMetadata(dto, currentUserId))
      .input;
  }

  private async prepareOptimizationWithMetadata(
    dto: CreateOptimizationDto,
    currentUserId?: number,
  ): Promise<{
    input: OptimizerInputDto;
    fabricMetadata?: FabricMetadataDto;
  }> {
    assertValidOptimizationRequest(dto, currentUserId);

    const algorithm = await this.db.query.algorithmTypes.findFirst({
      where: and(
        eq(algorithmTypes.id, dto.algorithmId),
        inArray(algorithmTypes.id, AVAILABLE_ALGORITHM_IDS),
      ),
      columns: { id: true },
    });
    if (!algorithm) {
      throw new RequestValidationException(
        'The selected algorithm is not available.',
      );
    }

    const pieces = await this.patternsService.getAccessiblePatternPieces(
      dto.patternId,
      currentUserId,
    );
    const patternPiecesById = new Map(pieces.map((p) => [p.id, p]));

    const preparedPieces = dto.pieces.map((piece) => {
      const pieceData = patternPiecesById.get(piece.patternPieceId);
      if (!pieceData) {
        throw new RequestValidationException(
          'One or more pieces do not belong to the selected pattern.',
        );
      }

      return {
        patternPieceId: piece.patternPieceId,
        boundary: OptimizationViewMapper.toOptimizerPoints(pieceData.boundary),
        grainline: pieceData.grainline,
        normalCount: piece.normalCount,
        mirroredCount: piece.mirroredCount,
        direction: piece.direction,
        twoWay: piece.twoWay,
      };
    });

    let fabricMetadata: FabricMetadataDto | undefined;
    let fabric: OptimizerFabricInputDto;
    if (dto.fabricId !== undefined && dto.fabricId !== null) {
      const rawFabric = await this.fabricsService.getOwnedFabricGeometry(
        dto.fabricId,
        currentUserId!,
      );
      fabric = OptimizationViewMapper.libraryFabric(rawFabric);
      fabricMetadata = OptimizationViewMapper.fabricMetadata(rawFabric);
    } else {
      fabric = OptimizationViewMapper.customFabric(
        dto.fabricWidthMm!,
        dto.fabricLengthMm!,
      );
    }

    return {
      input: {
        patternId: dto.patternId,
        algorithmId: algorithm.id,
        algorithmName: this.getEngineAlgorithmName(algorithm.id),
        fabric,
        seamAllowanceMm: dto.seamAllowanceMm,
        cuttingAllowanceMm: dto.cuttingAllowanceMm,
        pieces: preparedPieces,
      },
      fabricMetadata,
    };
  }

  async save(
    runId: string,
    dto: SaveOptimizationDto,
    currentUserId: number,
  ): Promise<{ id: number }> {
    const run = await this.findRun(runId, currentUserId);
    if (run.savedId !== undefined) return { id: run.savedId };
    if (!run.result.wasSuccessful) {
      throw new RequestValidationException(
        'Only a successful optimization can be saved.',
      );
    }
    return { id: await this.persistRun(run, dto.name, currentUserId) };
  }

  private async persistRun(
    run: StoredRun,
    name: string,
    userId: number,
  ): Promise<number> {
    const { input, result } = run;
    const { stats } = result;
    const isLibrary = input.fabric.fabricId !== undefined;
    const { placements } = OptimizationViewMapper.toView(
      OptimizationViewMapper.sourceFromInput(input, result),
      { isSaved: false },
    );

    try {
      return await this.db.transaction(async (tx) => {
        const [locked] = await tx
          .select({
            userId: optimizationRuns.userId,
            savedId: optimizationRuns.savedId,
          })
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
            spentTime: Math.round(result.executionTime),
            usableScrapsArea: Math.round(stats.usableScrapsArea),
            usableScrapsPercentage: Math.round(stats.usableScrapsPercentage),
            wasteScrapsArea: Math.round(stats.wasteArea),
            wasteScrapsPercentage: Math.round(stats.wastePercentage),
            remainingFabricArea: Math.round(stats.remainingFabricArea),
            remainingAreaPercentage: Math.round(
              stats.remainingFabricPercentage,
            ),
          })
          .returning({ id: optimizationResults.id });

        if (!created)
          throw new Error('Optimization insert did not return a row.');

        if (placements.length > 0) {
          await tx.insert(placedPieces).values(
            placements.map((p) => ({
              patternPieceId: p.patternPieceId,
              optimizationResultId: created.id,
              rotationAngle:
                (p.rotationAngle + (p.isFlipped180 ? 180 : 0)) % 360,
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
      if (err.code === '23503')
        throw new ResourceNotFoundException('Pattern', input.patternId);
      throw e;
    }
  }

  async getSaved(id: number, userId: number): Promise<OptimizationViewDto> {
    const row = await this.db.query.optimizationResults.findFirst({
      where: and(
        eq(optimizationResults.id, id),
        eq(optimizationResults.userId, userId),
      ),
      with: { algorithm: { columns: { name: true } } },
    });
    if (!row) throw new ResourceNotFoundException('Optimization', id);

    const pattern = await this.patternsService.getPatternSummary(row.patternId);
    let fabricMetadata: FabricMetadataDto | undefined;
    let fabric: OptimizerFabricInputDto;
    if (row.customFabricId !== null) {
      const rawFabric = await this.fabricsService.getOwnedFabricGeometry(
        row.customFabricId,
        userId,
      );
      fabric = OptimizationViewMapper.libraryFabric(rawFabric);
      fabricMetadata = OptimizationViewMapper.fabricMetadata(rawFabric);
    } else {
      fabric = OptimizationViewMapper.customFabric(
        row.fabricWidth ?? 0,
        row.fabricLength ?? 0,
      );
    }

    const placed = await this.db
      .select({
        patternPieceId: placedPieces.patternPieceId,
        rotationAngle: placedPieces.rotationAngle,
        isMirrored: placedPieces.isMirrored,
        placement: placedPieces.placement,
      })
      .from(placedPieces)
      .where(eq(placedPieces.optimizationResultId, id))
      .orderBy(asc(placedPieces.id));

    const pieces = await this.patternsService.getPiecesGeometryByIds(
      placed.map((p) => p.patternPieceId),
    );
    const pieceById = new Map(pieces.map((p) => [p.id, p]));

    return {
      id: row.id,
      name: row.name,
      isSaved: true,
      algorithmName: row.algorithm.name,
      fabric: { ...fabric, ...fabricMetadata },
      pattern,
      seamAllowanceMm: row.seamAllowance,
      cuttingAllowanceMm: row.cuttingAllowance,
      wasSuccessful: true,
      executionTime: row.spentTime,
      stats: {
        usableScrapsArea: row.usableScrapsArea,
        usableScrapsPercentage: row.usableScrapsPercentage,
        remainingFabricArea: row.remainingFabricArea,
        remainingFabricPercentage: row.remainingAreaPercentage,
        wasteArea: row.wasteScrapsArea,
        wastePercentage: row.wasteScrapsPercentage,
      },
      placements: placed.flatMap((p) => {
        const piece = pieceById.get(p.patternPieceId);
        if (!piece) return [];
        return [
          OptimizationViewMapper.placeOne(
            {
              boundary: OptimizationViewMapper.toOptimizerPoints(
                piece.boundary,
              ),
              grainline: piece.grainline,
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
            fabric.grainline,
          ),
        ];
      }),
    };
  }

  async getFilterOptions(
    userId: number,
  ): Promise<OptimizationFilterOptionsDto> {
    const [patternRows, fabricRows, algorithmRows] = await Promise.all([
      // only patterns that appear in the user's optimizations
      this.db
        .select({ id: patterns.id, name: patterns.name, count: count() })
        .from(optimizationResults)
        .innerJoin(patterns, eq(patterns.id, optimizationResults.patternId))
        .where(eq(optimizationResults.userId, userId))
        .groupBy(patterns.id, patterns.name)
        .orderBy(asc(sql`lower(${patterns.name})`)),
      // all of the user's fabrics, also those with 0 optimizations (like "Satin (0)" in the mockup)
      this.db
        .select({
          id: fabrics.id,
          name: fabrics.name,
          count: count(optimizationResults.id),
        })
        .from(fabrics)
        .leftJoin(
          optimizationResults,
          and(
            eq(optimizationResults.customFabricId, fabrics.id),
            eq(optimizationResults.userId, userId),
          ),
        )
        .where(eq(fabrics.userId, userId))
        .groupBy(fabrics.id, fabrics.name)
        .orderBy(asc(sql`lower(${fabrics.name})`)),
      this.db
        .select({
          id: algorithmTypes.id,
          name: algorithmTypes.name,
          count: count(optimizationResults.id),
        })
        .from(algorithmTypes)
        .leftJoin(
          optimizationResults,
          and(
            eq(optimizationResults.algorithmId, algorithmTypes.id),
            eq(optimizationResults.userId, userId),
          ),
        )
        .where(inArray(algorithmTypes.id, AVAILABLE_ALGORITHM_IDS))
        .groupBy(algorithmTypes.id, algorithmTypes.name)
        .orderBy(asc(algorithmTypes.id)),
    ]);

    return {
      patterns: patternRows,
      fabrics: fabricRows,
      algorithms: algorithmRows,
    };
  }

  private getEngineAlgorithmName(algorithmId: number): string {
    const algorithm = Object.entries(ENGINE_ALGORITHM_IDS).find(
      ([, id]) => id === algorithmId,
    );
    if (!algorithm) {
      throw new RequestValidationException(
        'The selected algorithm is not available.',
      );
    }
    return algorithm[0];
  }

  private async getAlgorithmName(algorithmId: number) {
    const algorithm = await this.db.query.algorithmTypes.findFirst({
      where: eq(algorithmTypes.id, algorithmId),
      columns: { name: true },
    });
    if (!algorithm) {
      throw new ResourceNotFoundException('Algorithm', algorithmId);
    }
    return algorithm.name;
  }

  async updateRunPlacements(
    runId: string,
    dto: UpdateRunPlacementsDto,
    currentUserId?: number,
  ): Promise<OptimizationViewDto> {
    const run = await this.findRun(runId, currentUserId);

    if (run.savedId !== undefined) {
      throw new RequestValidationException(
        'Saved optimizations cannot be modified.',
      );
    }

    if (!run.result.wasSuccessful) {
      throw new RequestValidationException(
        'Only a successful optimization run can be modified.',
      );
    }

    const seenIndices = new Set<number>();
    for (const item of dto.placements) {
      if (seenIndices.has(item.index)) {
        throw new RequestValidationException(
          `Duplicate placement index: ${item.index}.`,
        );
      }
      if (item.index < 0 || item.index >= run.result.positions.length) {
        throw new RequestValidationException(
          `Placement index ${item.index} is out of bounds.`,
        );
      }
      seenIndices.add(item.index);
    }

    const updatesByIndex = new Map(
      dto.placements.map((item) => [item.index, { x: item.x, y: item.y }]),
    );

    const updatedPositions = run.result.positions.map((pos, index) => {
      const patch = updatesByIndex.get(index);
      if (!patch) return pos;

      return {
        ...pos,
        x: patch.x,
        y: patch.y,
      };
    });

    // TODO: Call dedicated engine endpoint to recalculate  layout stats
    // (usableScraps, waste, remainingFabric) after manual placement changes.
    const updatedResult: EngineResult = {
      ...run.result,
      positions: updatedPositions,
    };

    await this.runs.updateResult(run.id, updatedResult);

    return this.getRun(runId, currentUserId);
  }
}
