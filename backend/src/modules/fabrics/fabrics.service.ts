import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, and, or, inArray, sql, asc, desc, count, type SQL, gte, lte, ilike } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { fabrics, fabricTags, tagsForFabrics } from '../../db/schema/schema.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { StoragePaths, StorageService } from '../storage/storage.service.js';
import { FabricMapper } from './fabric.mapper.js';
import { CreateFabricDto } from './dto/create-fabric.dto.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AnalyzeFabricDto } from './dto/analyze-fabric.dto.js';
import { AnalyzeFabricEngineResponseDto } from './dto/analyze-fabric-engine-response.dto.js';
import { FabricBoundaryMapper } from './fabric-boundary.mapper.js';
import { EditFabricDto } from './dto/edit-fabric.dto.js';
import { FabricListResponseDto } from './dto/fabric-list.dto.js';
import { FabricSortOption, ListFabricsQueryDto } from './dto/list-fabrics-query.dto.js';
import { FavouriteStateDto } from '../../common/dto/favourite-state.dto.js';
import { BulkDeleteResponseDto } from '../../common/dto/bulk-delete.dto.js';

@Injectable()
export class FabricService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {}

  async analyzeFabricBoundary(
    picture: Express.Multer.File,
  ): Promise<AnalyzeFabricDto> {
    const engineUrl = this.configService
      .get<string>('SHAPES_ENGINE_URL', 'http://localhost:8000')
      .replace(/\/$/, '');

    const imageBytes = new Uint8Array(
      new ArrayBuffer(picture.buffer.byteLength),
    );
    imageBytes.set(picture.buffer);

    const response = await fetch(`${engineUrl}/analyze-fabric-boundary`, {
      method: 'POST',
      headers: { 'Content-Type': picture.mimetype },
      body: new Blob([imageBytes], { type: picture.mimetype }),
      signal: AbortSignal.timeout(30_000),
    }).catch((error) => {
      throw new ExternalServiceException(
        error instanceof Error
          ? `Shape analysis service is unavailable: ${error.message}`
          : 'Shape analysis service is unavailable.',
      );
    });

    const payload = await response.json().catch(() => {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid response.',
      );
    });

    if (!response.ok) {
      const detail =
        typeof payload?.detail === 'string'
          ? payload.detail
          : 'Shape analysis failed.';
      if (response.status >= 400 && response.status < 500) {
        throw new RequestValidationException(detail);
      }
      throw new ExternalServiceException(detail);
    }

    if (typeof payload !== 'object' || !payload || Array.isArray(payload)) {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid boundary.',
      );
    }

    const engineResult = plainToInstance(
      AnalyzeFabricEngineResponseDto,
      payload,
    );
    const validationErrors = await validate(engineResult, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length > 0) {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid boundary.',
      );
    }

    return FabricBoundaryMapper.toAnalyzeFabricDto(engineResult);
  }

  async getFabricTags(): Promise<{ id: number; name: string }[]> {
    const tags = await this.db.query.tagsForFabrics.findMany({
      columns: { id: true, name: true },
      orderBy: (tag, { asc }) => [asc(tag.name)],
    });

    return tags;
  }

  async createFabric(
    createFabricDto: CreateFabricDto,
    picture: Express.Multer.File,
    currentUserId: number,
  ): Promise<FabricResponseDto> {
    const selectedTagIds = [...new Set(createFabricDto.tagIds ?? [])];
    const selectedTags = selectedTagIds.length
      ? await this.db.query.tagsForFabrics.findMany({
          where: inArray(tagsForFabrics.id, selectedTagIds),
          columns: { id: true, name: true },
        })
      : [];

    if (selectedTags.length !== selectedTagIds.length) {
      throw new RequestValidationException(
        'One or more selected fabric tags do not exist.',
      );
    }

    const points = [...createFabricDto.boundary];
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last || points.length < 3) {
      throw new RequestValidationException(
        'A fabric boundary needs at least three points.',
      );
    }
    if (first.x !== last.x || first.y !== last.y) {
      points.push(first);
    }

    const polygonWkt = `POLYGON((${points
      .map(({ x, y }) => `${x} ${y}`)
      .join(', ')}))`;
    const geometry = sql`ST_GeomFromText(${polygonWkt}, 0)`;
    const pictureS3Key = await this.storageService.uploadFile(
      picture,
      StoragePaths.fabrics(currentUserId),
    );

    let fabric: typeof fabrics.$inferSelect;
    try {
      fabric = await this.db.transaction(async (transaction) => {
        const [createdFabric] = await transaction
          .insert(fabrics)
          .values({
            name: createFabricDto.name,
            description: createFabricDto.description,
            pictureS3Key,
            boundary: geometry,
            imageWidthCm: createFabricDto.imageWidthCm,
            imageHeightCm: createFabricDto.imageHeightCm,
            area: sql<number>`ST_Area(${geometry})`,
            userId: currentUserId,
          })
          .returning();

        if (!createdFabric) {
          throw new Error('Fabric creation did not return the created fabric.');
        }

        if (selectedTagIds.length > 0) {
          await transaction.insert(fabricTags).values(
            selectedTagIds.map((tagId) => ({
              fabricId: createdFabric.id,
              tagId,
            })),
          );
        }

        return createdFabric;
      });
    } catch (error) {
      await this.storageService.deleteFile(pictureS3Key);
      throw error;
    }

    const pictureUrl = await this.storageService.generatePresignedUrl(
      fabric.pictureS3Key,
    );

    return FabricMapper.toResponseDto(
      {
        ...fabric,
        boundary: points,
        tags: selectedTags.map((tag) => ({ tag })),
      },
      pictureUrl,
    );
  }

  async updateFabric(
    fabricId: number,
    editFabricDto: EditFabricDto,
    currentUserId: number,
  ): Promise<FabricResponseDto> {
    const { tagIds, ...fabricFields } = editFabricDto;
    const selectedTagIds =
      tagIds === undefined ? undefined : [...new Set(tagIds)];

    if (
      Object.keys(fabricFields).length === 0 &&
      selectedTagIds === undefined
    ) {
      throw new RequestValidationException(
        'At least one fabric field or tag must be provided.',
      );
    }

    if (selectedTagIds) {
      const selectedTags = selectedTagIds.length
        ? await this.db.query.tagsForFabrics.findMany({
            where: inArray(tagsForFabrics.id, selectedTagIds),
            columns: { id: true },
          })
        : [];

      if (selectedTags.length !== selectedTagIds.length) {
        throw new RequestValidationException(
          'One or more selected fabric tags do not exist.',
        );
      }
    }

    await this.db.transaction(async (tx) => {
      if (Object.keys(fabricFields).length > 0) {
        const [updatedFabric] = await tx
          .update(fabrics)
          .set(fabricFields)
          .where(
            and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
          )
          .returning();

        if (!updatedFabric) {
          throw new ResourceNotFoundException('Fabric', fabricId);
        }
      } else {
        const [ownedFabric] = await tx
          .select({ id: fabrics.id })
          .from(fabrics)
          .where(
            and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
          );

        if (!ownedFabric) {
          throw new ResourceNotFoundException('Fabric', fabricId);
        }
      }

      if (selectedTagIds !== undefined) {
        await tx.delete(fabricTags).where(eq(fabricTags.fabricId, fabricId));
      }
      if (selectedTagIds && selectedTagIds.length > 0) {
        await tx.insert(fabricTags).values(
          selectedTagIds.map((tagId) => ({
            fabricId: fabricId,
            tagId,
          })),
        );
      }
    });

    return this.getFabricById(fabricId, currentUserId);
  }

  async getFabricById(
    fabricId: number,
    currentUserId: number,
  ): Promise<FabricResponseDto> {
    const fabric = await this.db.query.fabrics.findFirst({
      where: and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
      columns: { boundary: false },
      extras: {
        boundaryGeoJson:
          sql<string>`ST_AsGeoJSON(${fabrics.boundary})::json`.as(
            'boundary_geo_json',
          ),
      },
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!fabric) {
      throw new ResourceNotFoundException(`Fabric`, fabricId);
    }

    const pictureUrl = fabric.pictureS3Key
      ? await this.storageService.generatePresignedUrl(fabric.pictureS3Key)
      : undefined;

    return FabricMapper.toResponseDto(
      {
        ...fabric,
        boundary: FabricMapper.boundaryFromGeoJson(fabric.boundaryGeoJson),
      },
      pictureUrl,
    );
  }

  private getOrderBy(sort: FabricSortOption): SQL[] {
    const nameLower = sql`lower(${fabrics.name})`;
    switch (sort) {
      case FabricSortOption.NAME_ASC:
        return [asc(nameLower), asc(fabrics.id)];
      case FabricSortOption.NAME_DESC:
        return [desc(nameLower), desc(fabrics.id)];
      case FabricSortOption.DATE_ASC:
        return [asc(fabrics.createdAt), asc(fabrics.id)];
      case FabricSortOption.AREA_ASC:
        return [asc(fabrics.area), asc(fabrics.id)];
      case FabricSortOption.AREA_DESC:
        return [desc(fabrics.area), desc(fabrics.id)];
      case FabricSortOption.DATE_DESC:
      default:
        return [desc(fabrics.createdAt), desc(fabrics.id)];
    }
  }

  async getFabrics(
    query: ListFabricsQueryDto,
    currentUserId: number,
  ): Promise<FabricListResponseDto> {
    const { page, limit, sort } = query;
    const where = this.buildWhere(query, currentUserId);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.fabrics.findMany({
        where,
        columns: {
          id: true,
          name: true,
          pictureS3Key: true,
          isFavourite: true,
          area: true,
          createdAt: true,
        },
        orderBy: this.getOrderBy(sort),
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ total: count() }).from(fabrics).where(where),
    ]);

    const items = await Promise.all(
      rows.map(async (fabric) => {
        const pictureUrl = fabric.pictureS3Key
          ? await this.storageService.generatePresignedUrl(fabric.pictureS3Key)
          : undefined;
        return FabricMapper.toListItemDto(fabric, pictureUrl);
      }),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async setFavourite(
    fabricId: number,
    isFavourite: boolean,
    currentUserId: number,
  ): Promise<FavouriteStateDto> {
    const [updated] = await this.db
      .update(fabrics)
      .set({ isFavourite })
      .where(and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)))
      .returning({ id: fabrics.id, isFavourite: fabrics.isFavourite});

    if (!updated) throw new ResourceNotFoundException('Fabric', fabricId);
    return updated;
    }

    private readonly logger = new Logger(FabricService.name);

  async deleteFabric(fabricId: number, currentUserId: number): Promise<void> {
    const [deleted] = await this.db
      .delete(fabrics)
      .where(and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)))
      .returning({ pictureS3Key: fabrics.pictureS3Key });

    if (!deleted) throw new ResourceNotFoundException('Fabric', fabricId);

    if (deleted.pictureS3Key) {
      try {
        await this.storageService.deleteFile(deleted.pictureS3Key);
      } catch (error) {
        this.logger.warn(
          `Fabric ${fabricId} deleted, but its picture ${deleted.pictureS3Key} was not removed: ${String(error)}`,
        );
      }
    }
  }

  async deleteFabrics(ids: number[], currentUserId: number): Promise<BulkDeleteResponseDto> {
    const deleted = await this.db
      .delete(fabrics)
      .where(and(inArray(fabrics.id, ids), eq(fabrics.userId, currentUserId)))
      .returning({ id: fabrics.id, pictureS3Key: fabrics.pictureS3Key });

    const results = await Promise.allSettled(
      deleted.flatMap((f) => (f.pictureS3Key ? [this.storageService.deleteFile(f.pictureS3Key)] : [])),
    );
    results.forEach((r) => {
      if (r.status === 'rejected') this.logger.warn(`Picture was not removed: ${String(r.reason)}`);
    });

    return { deletedIds: deleted.map((f) => f.id) };
  }

  private buildWhere(query: ListFabricsQueryDto, currentUserId: number): SQL {
    const { createdFrom, createdTo, favourite, tagIds, areaMin, areaMax } = query;

    if (createdFrom && createdTo && new Date(createdFrom) > new Date(createdTo)) {
      throw new RequestValidationException('createdFrom must not be later than createdTo.');
    }
    if (areaMin !== undefined && areaMax !== undefined && areaMin > areaMax) {
      throw new RequestValidationException('areaMin must not be greater than areaMax.');
    }

    const withAllTags = tagIds?.length
      ? this.db
          .select({ id: fabricTags.fabricId })
          .from(fabricTags)
          .where(inArray(fabricTags.tagId, tagIds))
      : undefined;

    const escapeLike = (text: string) => text.replace(/[\\%_]/g, '\\$&');

    const term = query.q?.trim();
    const pattern = term ? `%${escapeLike(term)}%` : undefined;

    return and(
      eq(fabrics.userId, currentUserId),
      createdFrom ? gte(fabrics.createdAt, new Date(createdFrom)) : undefined,
      createdTo ? lte(fabrics.createdAt, new Date(createdTo)) : undefined,
      favourite === undefined ? undefined : eq(fabrics.isFavourite, favourite),
      areaMin === undefined ? undefined : gte(fabrics.area, areaMin),
      areaMax === undefined ? undefined : lte(fabrics.area, areaMax),
      withAllTags ? inArray(fabrics.id, withAllTags) : undefined,
      pattern ? or(ilike(fabrics.name, pattern), ilike(fabrics.description, pattern)) : undefined,
    )!;
  }
}
