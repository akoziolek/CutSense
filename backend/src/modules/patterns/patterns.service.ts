import { Injectable, Inject, BadRequestException } from '@nestjs/common';
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
  patternFavourites,
} from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { EditPatternDto } from './dto/edit-pattern.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { PatternsMapper } from './patterns.mapper.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { rotateAndAnchor } from './geometry.js';
import { PatternListResponseDto } from './dto/pattern-list.dto.js';
import {
  ListPatternsQueryDto,
  PatternSortOption,
} from './dto/list-patterns-query.dto.js';
import { assertDateRange, likePattern } from '../../common/utils/list-query.js';
import { FavouriteStateDto } from '../../common/dto/favourite-state.dto.js';
import { BulkDeleteResponseDto } from '../../common/dto/bulk-delete.dto.js';

// identity ids start at 1, so this never matches a favourite row (used for guests)
const NO_USER_ID = 0;

const toWkt = (points: { x: number; y: number }[]): string => {
  const ring = [...points];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first.x !== last.x || first.y !== last.y) ring.push(first);
  return `POLYGON((${ring.map((p) => `${p.x} ${p.y}`).join(', ')}))`;
};

const ringOf = (geojson: string): [number, number][] =>
  (JSON.parse(geojson) as { coordinates: [number, number][][] }).coordinates[0];

@Injectable()
export class PatternsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

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
        pieces: {
          columns: { id: true },
          extras: (piece, { sql }) => ({
            geojson: sql<string>`ST_AsGeoJSON(${piece.boundary})`.as('geojson'),
          }),
          orderBy: (piece, { asc }) => [asc(piece.id)],
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

    return {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description ?? undefined,
      size: pattern.size,
      visibility: pattern.visibility,
      isFavourite: pattern.favoritedBy.length > 0,
      starCount: pattern.starCount,
      starAverage: pattern.starAverage,
      userId: pattern.userId,
      createdAt: pattern.createdAt.toISOString(),
      tags: pattern.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
      })),
      author: {
        id: pattern.user.id,
        nickname: pattern.user.nickname ?? pattern.user.name,
      },
      pieces: pattern.pieces.map((piece) => ({
        id: piece.id,
        points: ringOf(piece.geojson),
      })),
    };
  }

  async getPatternTags(): Promise<PatternTagDto[]> {
    const tags = await this.db.query.tagsForPatterns.findMany({
      columns: { id: true, name: true },
      orderBy: (tag, { asc }) => [asc(tag.name)],
    });

    return PatternsMapper.toTagDtos(tags);
  }

  async createPattern(
    dto: CreatePatternDto,
    userId: number,
  ): Promise<{ id: number }> {
    const tagNames = [...new Set(dto.tags.map((t) => t.trim().toLowerCase()))];

    // one transaction: if anything fails, nothing is saved
    return this.db.transaction(async (tx) => {
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
        throw new BadRequestException([`Unknown tags: ${unknown.join(', ')}`]);
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

      if (tagRows.length) {
        await tx
          .insert(patternTags)
          .values(tagRows.map((t) => ({ patternId: created.id, tagId: t.id })));
      }

      await tx.insert(patternPieces).values(
        dto.pieces.map((piece) => ({
          patternId: created.id,
          boundary: sql`ST_GeomFromText(${toWkt(rotateAndAnchor(piece.points, piece.grainline))}, 0)`,
          normalCount: piece.normal,
          mirroredCount: piece.mirrored,
        })),
      );

      return { id: created.id };
    });
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
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select({
          id: patterns.id,
          name: patterns.name,
          size: patterns.size,
          createdAt: patterns.createdAt,
          isFavourite: sql<boolean>`${patternFavourites.userId} is not null`,
          userId: patterns.userId,
        })
        .from(patterns)
        .leftJoin(
          patternFavourites,
          and(
            eq(patternFavourites.patternId, patterns.id),
            eq(patternFavourites.userId, currentUserId ?? NO_USER_ID),
          ),
        )
        .where(where)
        .orderBy(...this.getOrderBy(sort))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(patterns).where(where),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        size: row.size,
        isFavourite: row.isFavourite,
        createdAt: row.createdAt.toISOString(),
        isOwner: currentUserId !== undefined && row.userId === currentUserId,
      })),
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
    if (!pattern || (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId)) {
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
        .where(and(eq(patternFavourites.patternId, patternId), eq(patternFavourites.userId, currentUserId)));
    }
    return { id: patternId, isFavourite };
  }

  private buildWhere(query: ListPatternsQueryDto, currentUserId?: number): SQL {
    const { createdFrom, createdTo, favourite, tagIds, sizes } = query;
    assertDateRange(createdFrom, createdTo);

    const visible =
      currentUserId === undefined
        ? eq(patterns.visibility, 'PUBLIC')
        : or(eq(patterns.visibility, 'PUBLIC'), eq(patterns.userId, currentUserId));

    const favouriteIds =
      currentUserId !== undefined && favourite !== undefined
        ? this.db
            .select({ id: patternFavourites.patternId })
            .from(patternFavourites)
            .where(eq(patternFavourites.userId, currentUserId))
        : undefined;

    let favouriteFilter: SQL | undefined;
    if (favourite === true) {
      favouriteFilter = favouriteIds ? inArray(patterns.id, favouriteIds) : sql`false`;
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
      pattern ? or(ilike(patterns.name, pattern), ilike(patterns.description, pattern)) : undefined,
    )!;
  }

  async deletePattern(patternId: number, currentUserId: number): Promise<void> {
    const [deleted] = await this.db
      .delete(patterns)
      .where(and(eq(patterns.id, patternId), eq(patterns.userId, currentUserId)))
      .returning({ id: patterns.id });

    if (!deleted) throw new ResourceNotFoundException('Pattern', patternId);
  }

  async deletePatterns(ids: number[], currentUserId: number): Promise<BulkDeleteResponseDto> {
    const deleted = await this.db
      .delete(patterns)
      .where(and(inArray(patterns.id, ids), eq(patterns.userId, currentUserId)))
      .returning({ id: patterns.id });

    return { deletedIds: deleted.map((p) => p.id) };
  }
}