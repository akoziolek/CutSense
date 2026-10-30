import { Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import {
  patterns,
  patternTags,
  tagsForPatterns,
} from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';
import { EditPatternDto } from './dto/edit-pattern.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { PatternsMapper } from './patterns.mapper.js';

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
    currentUserId: number,
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
      },
    });

    if (!pattern) {
      throw new ResourceNotFoundException(`Pattern`, patternId);
    }
    if (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId) {
      throw new AccessDeniedException(
        'This pattern is private and belongs to another user.',
      );
    }

    return {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description ?? undefined,
      size: pattern.size,
      visibility: pattern.visibility,
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
}
