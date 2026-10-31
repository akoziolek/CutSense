import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { eq, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import {
  patternPieces,
  patternTags,
  patterns,
  tagsForPatterns,
} from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import type { CreatePatternDto } from './dto/create-pattern.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { AccessDeniedException } from '../../common/exceptions/access-denied.exception.js';
import { rotateAndAnchor } from '../../common/geometry/shapes-geometry.js';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import { PatternsMapper } from './patterns.mapper.js';
import { AnalysisShapesDto } from '../shapes-engine/dto/analysis-shapes.dto.js';
import { ShapeEngineMapper } from '../shapes-engine/shapes-engine.mapper.js';
import { ShapesEngineClient } from '../shapes-engine/shapes-engine.client.js';
import { ShapeEngineResponseDto } from '../shapes-engine/dto/shapes-engine-response.dto.js';

@Injectable()
export class PatternsService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly shapesEngineClient: ShapesEngineClient,
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
      },
    });

    if (!pattern) {
      throw new ResourceNotFoundException(`Pattern`, patternId);
    }
    if (pattern.visibility === 'PRIVATE' && pattern.userId !== currentUserId) {
      if (currentUserId === null) {
        throw new AuthenticationRequiredException(
          'Sign in to view this pattern.',
        );
      }
      throw new AccessDeniedException(
        'This pattern is private and belongs to another user.',
      );
    }

    return PatternsMapper.toResponseDto(pattern);
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
          boundary: sql`ST_GeomFromText(${PatternsMapper.pieceBoundaryToWkt(rotateAndAnchor(piece.points, piece.grainline))}, 0)`,
          normalCount: piece.normal,
          mirroredCount: piece.mirrored,
        })),
      );

      return { id: created.id };
    });
  }

  async getPatternTags(): Promise<PatternTagDto[]> {
    const tags = await this.db.query.tagsForPatterns.findMany({
      columns: { id: true, name: true },
      orderBy: (tag, { asc }) => [asc(tag.name)],
    });

    return PatternsMapper.toTagDtos(tags);
  }
}
