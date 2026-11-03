import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  eq,
  and,
  or,
  sql,
  asc,
  desc,
  count,
  inArray,
  type SQL,
  gte,
  ilike,
  lte,
  notInArray,
} from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import {
  patternPieces,
  patternTags,
  patterns,
  tagsForPatterns,
  patternImages,
} from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { EditPatternDto } from './dto/edit-pattern.dto.js';
import { PatternsMapper } from './patterns.mapper.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { rotateAndAnchor } from '../../common/geometry/shapes-geometry.js';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import { AnalysisShapesDto } from '../shapes-engine/dto/analysis-shapes.dto.js';
import { ShapeEngineMapper } from '../shapes-engine/shapes-engine.mapper.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';
import { ShapeEngineResponseDto } from '../shapes-engine/dto/shapes-engine-response.dto.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { PatternListResponseDto } from './dto/pattern-list.dto.js';
import {
  ListPatternsQueryDto,
  PatternSortOption,
} from './dto/list-patterns-query.dto.js';
import { assertDateRange, likePattern } from '../../common/utils/list-query.js';
import { FavouriteStateDto } from '../../common/dto/favourite-state.dto.js';
import { patternFavourites } from '../../db/schema/schema.js';
import { BulkDeleteResponseDto } from '../../common/dto/bulk-delete.dto.js';
import { StoragePaths, StorageService } from '../storage/storage.service.js';

// identity ids start at 1, so this never matches a favourite row (used for guests)
const NO_USER_ID = 0;

@Injectable()
export class PatternsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly shapesEngineClient: ShapesEngineClient,
    private readonly storageService: StorageService,
  ) {}

  async analyzePatternBoundary(
    picture: Express.Multer.File,
  ): Promise<AnalysisShapesDto> {
    const engineResult = await this.shapesEngineClient.analyzeBoundary(
      'analyze-pattern-boundary',
      picture,
      ShapeEngineResponseDto,
    );

    return ShapeEngineMapper.toAnalysisShapesDto(engineResult);
  }

  async updatePattern(
    patternId: number,
    editPatternDto: EditPatternDto,
    currentUserId: number,
  ): Promise<PatternResponseDto> {
    const { tagIds, ...patternFields } = editPatternDto;
    const selectedTagIds =
      tagIds === undefined ? undefined : [...new Set(tagIds)];

    if (
      Object.keys(patternFields).length === 0 &&
      selectedTagIds === undefined
    ) {
      throw new RequestValidationException(
        'At least one pattern field or tag must be provided.',
      );
    }

    if (selectedTagIds !== undefined) {
      const selectedTags = selectedTagIds.length
        ? await this.db.query.tagsForPatterns.findMany({
            where: inArray(tagsForPatterns.id, selectedTagIds),
            columns: { id: true },
          })
        : [];

      if (selectedTags.length !== selectedTagIds.length) {
        throw new RequestValidationException(
          'One or more selected pattern tags do not exist.',
        );
      }
    }

    await this.db.transaction(async (tx) => {
      if (Object.keys(patternFields).length > 0) {
        const [updatedPattern] = await tx
          .update(patterns)
          .set(patternFields)
          .where(
            and(eq(patterns.id, patternId), eq(patterns.userId, currentUserId)),
          )
          .returning();

        if (!updatedPattern) {
          throw new ResourceNotFoundException('Pattern', patternId);
        }
      } else {
        const [ownedPattern] = await tx
          .select({ id: patterns.id })
          .from(patterns)
          .where(
            and(eq(patterns.id, patternId), eq(patterns.userId, currentUserId)),
          );

        if (!ownedPattern) {
          throw new ResourceNotFoundException('Pattern', patternId);
        }
      }

      if (selectedTagIds !== undefined) {
        await tx
          .delete(patternTags)
          .where(eq(patternTags.patternId, patternId));

        if (selectedTagIds.length > 0) {
          await tx.insert(patternTags).values(
            selectedTagIds.map((tagId) => ({
              patternId,
              tagId,
            })),
          );
        }
      }
    });

    return this.getPatternById(patternId, currentUserId);
  }

  async getPatternById(
    patternId: number,
    currentUserId: number | null,
  ): Promise<PatternResponseDto> {
    const pattern = await this.db.query.patterns.findFirst({
      where: eq(patterns.id, patternId),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
        user: {
          columns: { id: true, nickname: true, name: true },
        },
        images: {
          orderBy: (img, { asc }) => [asc(img.orderIndex), asc(img.id)],
          with: {
            pieces: {
              columns: { id: true, grainline: true, normalCount: true, mirroredCount: true },
              extras: (piece, { sql }) => ({
                geojson: sql<string>`ST_AsGeoJSON(${piece.boundary})`.as(
                  'geojson',
                ),
              }),
              orderBy: (piece, { asc }) => [asc(piece.id)],
            },
          },
        },
        favoritedBy: {
          columns: { userId: true },
          where: (fav, { eq }) => eq(fav.userId, currentUserId ?? NO_USER_ID),
        },
      },
    });

    if (!pattern) {
      throw new ResourceNotFoundException('Pattern', patternId);
    }
    if (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId) {
      throw new ResourceNotFoundException('Pattern', patternId);
    }

    const imageUrls = await this.storageService.generatePresignedUrls(
      pattern.images.map((i) => i.pictureS3Key),
    );

    return PatternsMapper.toResponseDto(pattern, imageUrls);
  }

  async createPattern(
    dto: CreatePatternDto,
    photos: Express.Multer.File[],
    userId: number,
  ): Promise<{ id: number }> {
    if (
      photos.length !== dto.images.length ||
      dto.pieces.some((piece) => piece.imageIndex >= photos.length)
    ) {
      throw new RequestValidationException(
        'Each pattern photo must have image dimensions, and every piece must reference an uploaded photo.',
      );
    }

    const tagNames = [...new Set(dto.tags.map((t) => t.trim().toLowerCase()))];
    const uploadedKeys: string[] = [];

    try {
      for (const photo of photos) {
        uploadedKeys.push(
          await this.storageService.uploadFile(
            photo,
            StoragePaths.patterns(userId),
          ),
        );
      }

      return await this.db.transaction(async (tx) => {
        const tagRows = tagNames.length
          ? await tx
              .select({ id: tagsForPatterns.id, name: tagsForPatterns.name })
              .from(tagsForPatterns)
              .where(inArray(tagsForPatterns.name, tagNames))
          : [];

        const unknown = tagNames.filter(
          (n) => !tagRows.some((r) => r.name === n),
        );
        if (unknown.length) {
          throw new BadRequestException([
            `Unknown tags: ${unknown.join(', ')}`,
          ]);
        }

        const [created] = await tx
          .insert(patterns)
          .values({
            name: dto.name,
            description: dto.description?.trim() || null,
            size: dto.size,
            visibility: dto.visibility,
            userId,
          })
          .returning({ id: patterns.id });

        if (!created) {
          throw new Error(
            'Pattern creation did not return the created pattern.',
          );
        }

        if (tagRows.length) {
          await tx
            .insert(patternTags)
            .values(
              tagRows.map((t) => ({ patternId: created.id, tagId: t.id })),
            );
        }

        const imageRows = await tx
          .insert(patternImages)
          .values(
            dto.images.map((image, orderIndex) => {
              const pictureS3Key = uploadedKeys[orderIndex];
              if (!pictureS3Key) {
                throw new Error(
                  `Pattern photo ${orderIndex} was not uploaded.`,
                );
              }

              return {
                patternId: created.id,
                pictureS3Key,
                imageWidthMm: image.imageWidthMm,
                imageHeightMm: image.imageHeightMm,
                orderIndex,
              };
            }),
          )
          .returning({
            id: patternImages.id,
            orderIndex: patternImages.orderIndex,
          });
        const imageIds = new Map(
          imageRows.map((image) => [image.orderIndex, image.id]),
        );

        await tx.insert(patternPieces).values(
          dto.pieces.map((piece) => {
            const patternImageId = imageIds.get(piece.imageIndex);
            if (patternImageId === undefined) {
              throw new Error(
                `Pattern image ${piece.imageIndex} was not saved.`,
              );
            }

            return {
              patternImageId,
              boundary: sql`ST_GeomFromText(${PatternsMapper.pieceBoundaryToWkt(piece.points)}, 0)`,
              normalCount: piece.normal,
              mirroredCount: piece.mirrored,
              grainline: piece.grainline,
            };
          }),
        );

        return { id: created.id };
      });
    } catch (error) {
      await Promise.allSettled(
        uploadedKeys.map((key) => this.storageService.deleteFile(key)),
      );

      throw error;
    }
  }

  async getPatternTags(): Promise<PatternTagDto[]> {
    const tags = await this.db.query.tagsForPatterns.findMany({
      columns: { id: true, name: true },
      orderBy: (tag, { asc }) => [asc(tag.name)],
    });

    return PatternsMapper.toTagDtos(tags);
  }

  private getOrderBy(sort: PatternSortOption): SQL[] {
    const nameLower = sql`lower(${patterns.name})`;
    switch (sort) {
      case PatternSortOption.NAME_DESC:
        return [desc(nameLower), desc(patterns.id)];
      case PatternSortOption.DATE_DESC:
        return [desc(patterns.createdAt), desc(patterns.id)];
      case PatternSortOption.DATE_ASC:
        return [asc(patterns.createdAt), asc(patterns.id)];
      case PatternSortOption.NAME_ASC:
      default:
        return [asc(nameLower), asc(patterns.id)];
    }
  }

  async getPatterns(
    query: ListPatternsQueryDto,
    currentUserId?: number,
  ): Promise<PatternListResponseDto> {
    const { page, limit, sort } = query;

    const where = this.buildWhere(query, currentUserId);

    const firstImageSubquery = this.db
      .selectDistinctOn([patternImages.patternId], {
        patternId: patternImages.patternId,
        pictureS3Key: patternImages.pictureS3Key,
      })
      .from(patternImages)
      .orderBy(
        patternImages.patternId,
        asc(patternImages.orderIndex),
        asc(patternImages.id),
      )
      .as('first_image');

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: patterns.id,
          name: patterns.name,
          size: patterns.size,
          createdAt: patterns.createdAt,
          isFavourite: sql<boolean>`${patternFavourites.userId} is not null`,
          userId: patterns.userId,
          pictureS3Key: firstImageSubquery.pictureS3Key,
        })
        .from(patterns)
        .leftJoin(
          patternFavourites,
          and(
            eq(patternFavourites.patternId, patterns.id),
            eq(patternFavourites.userId, currentUserId ?? NO_USER_ID),
          ),
        )
        .leftJoin(
          firstImageSubquery,
          eq(firstImageSubquery.patternId, patterns.id),
        )
        .where(where)
        .orderBy(...this.getOrderBy(sort))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(patterns).where(where),
    ]);

    const s3Keys = rows
      .map((row) => row.pictureS3Key)
      .filter((key): key is string => Boolean(key));

    const imageUrls = await this.storageService.generatePresignedUrls(s3Keys);

    const items = rows.map((row) =>
      PatternsMapper.toListItemDto(
        row,
        currentUserId,
        row.pictureS3Key ? imageUrls.get(row.pictureS3Key) : undefined,
      ),
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
    patternId: number,
    isFavourite: boolean,
    currentUserId: number,
  ): Promise<FavouriteStateDto> {
    const pattern = await this.db.query.patterns.findFirst({
      where: eq(patterns.id, patternId),
      columns: { id: true, userId: true, visibility: true },
    });
    if (
      !pattern ||
      (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId)
    ) {
      throw new ResourceNotFoundException('Pattern', patternId);
    }

    if (isFavourite) {
      await this.db
        .insert(patternFavourites)
        .values({ patternId, userId: currentUserId })
        .onConflictDoNothing();
    } else {
      await this.db
        .delete(patternFavourites)
        .where(
          and(
            eq(patternFavourites.patternId, patternId),
            eq(patternFavourites.userId, currentUserId),
          ),
        );
    }
    return { id: patternId, isFavourite };
  }

  private buildWhere(query: ListPatternsQueryDto, currentUserId?: number): SQL {
    const { createdFrom, createdTo, favourite, tagIds, sizes, community } =
      query;
    assertDateRange(createdFrom, createdTo);

    const visible =
      currentUserId === undefined
        ? eq(patterns.visibility, 'PUBLIC')
        : community === false
          ? eq(patterns.userId, currentUserId)
          : or(
              eq(patterns.visibility, 'PUBLIC'),
              eq(patterns.userId, currentUserId),
            );

    const favouriteIds =
      currentUserId !== undefined && favourite !== undefined
        ? this.db
            .select({ id: patternFavourites.patternId })
            .from(patternFavourites)
            .where(eq(patternFavourites.userId, currentUserId))
        : undefined;

    let favouriteFilter: SQL | undefined;
    if (favourite === true) {
      favouriteFilter = favouriteIds
        ? inArray(patterns.id, favouriteIds)
        : sql`false`;
    } else if (favourite === false && favouriteIds) {
      favouriteFilter = notInArray(patterns.id, favouriteIds);
    }

    const withAnyTag = tagIds?.length
      ? this.db
          .select({ id: patternTags.patternId })
          .from(patternTags)
          .where(inArray(patternTags.tagId, tagIds))
      : undefined;

    const pattern = likePattern(query.q);

    return and(
      visible,
      createdFrom ? gte(patterns.createdAt, new Date(createdFrom)) : undefined,
      createdTo ? lte(patterns.createdAt, new Date(createdTo)) : undefined,
      favouriteFilter,
      sizes?.length ? inArray(patterns.size, sizes) : undefined,
      withAnyTag ? inArray(patterns.id, withAnyTag) : undefined,
      pattern
        ? or(
            ilike(patterns.name, pattern),
            ilike(patterns.description, pattern),
          )
        : undefined,
    )!;
  }

  async deletePattern(patternId: number, currentUserId: number): Promise<void> {
    const images = await this.db
      .select({ key: patternImages.pictureS3Key })
      .from(patternImages)
      .innerJoin(patterns, eq(patterns.id, patternImages.patternId))
      .where(
        and(eq(patterns.id, patternId), eq(patterns.userId, currentUserId)),
      );

    const [deleted] = await this.db
      .delete(patterns)
      .where(
        and(eq(patterns.id, patternId), eq(patterns.userId, currentUserId)),
      )
      .returning({ id: patterns.id });

    if (!deleted) throw new ResourceNotFoundException('Pattern', patternId);

    await Promise.allSettled(
      images.map((img) => this.storageService.deleteFile(img.key)),
    );
  }

  async deletePatterns(
    ids: number[],
    currentUserId: number,
  ): Promise<BulkDeleteResponseDto> {
    const images = await this.db
      .select({ key: patternImages.pictureS3Key })
      .from(patternImages)
      .innerJoin(patterns, eq(patterns.id, patternImages.patternId))
      .where(
        and(inArray(patterns.id, ids), eq(patterns.userId, currentUserId)),
      );

    const deleted = await this.db
      .delete(patterns)
      .where(and(inArray(patterns.id, ids), eq(patterns.userId, currentUserId)))
      .returning({ id: patterns.id });

    const deletedIds = deleted.map((p) => p.id);

    if (deletedIds.length > 0) {
      await Promise.allSettled(
        images.map((img) => this.storageService.deleteFile(img.key)),
      );
    }

    return { deletedIds };
  }
}
