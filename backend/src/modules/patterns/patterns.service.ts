import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { patterns } from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';

const ringOf = (geojson: string): [number, number][] =>
  (JSON.parse(geojson) as { coordinates: [number, number][][] }).coordinates[0];

@Injectable()
export class PatternsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

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
}
