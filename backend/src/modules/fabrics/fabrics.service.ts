import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray, sql, asc, desc, count, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { fabrics, fabricTags, tagsForFabrics } from '../../db/schema/schema.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { StoragePaths, StorageService } from '../storage/storage.service.js';
import { FabricMapper } from './fabric.mapper.js';
import { CreateFabricDto } from './dto/create-fabric.dto.js';
import { AnalysisShapesDto } from '../shapes-engine/dto/analysis-shapes.dto.js';
import { ShapeEngineMapper } from '../shapes-engine/shapes-engine.mapper.js';
import { EditFabricDto } from './dto/edit-fabric.dto.js';
import { FabricListResponseDto } from './dto/fabric-list.dto.js';
import { pointsToWktPolygon } from '../../common/geometry/shapes-geometry.js';
import {
  FabricSortOption,
  ListFabricsQueryDto,
} from './dto/list-fabrics-query.dto.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';
import { ShapeEngineResponseDto } from '../shapes-engine/dto/shapes-engine-response.dto.js';

@Injectable()
export class FabricService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
    private readonly shapesEngineClient: ShapesEngineClient,
  ) {}

  async analyzeFabricBoundary(
    picture: Express.Multer.File,
  ): Promise<AnalysisShapesDto> {
    const engineResult = await this.shapesEngineClient.analyzeBoundary(
      'analyze-fabric-boundary',
      picture,
      ShapeEngineResponseDto,
    );

    if (engineResult.shapes.length !== 1) {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid boundary.',
      );
    }
    return ShapeEngineMapper.toAnalysisShapesDto(engineResult);
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
    const polygonWkt = pointsToWktPolygon(createFabricDto.boundary);
    const geometry = sql`ST_MakeValid(ST_SimplifyPreserveTopology(ST_ForcePolygonCCW(ST_GeomFromText(${polygonWkt}, 0)), 0))`;
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
            imageWidthMm: createFabricDto.imageWidthMm,
            imageHeightMm: createFabricDto.imageHeightMm,
            areaMm2: sql<number>`ROUND(ST_Area(${geometry}))::bigint`,
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
        return [asc(fabrics.areaMm2), asc(fabrics.id)];
      case FabricSortOption.AREA_DESC:
        return [desc(fabrics.areaMm2), desc(fabrics.id)];
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
    const where = eq(fabrics.userId, currentUserId);

    const [rows, [{ total }]] = await Promise.all([
      this.db.query.fabrics.findMany({
        where,
        columns: {
          id: true,
          name: true,
          pictureS3Key: true,
          isFavourite: true,
          areaMm2: true,
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
}
