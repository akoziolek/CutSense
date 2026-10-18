import { Injectable, Inject } from '@nestjs/common';
import { eq, and, or } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { patterns } from '../../db/schema/schema.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';

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
      where: and(
        eq(patterns.id, patternId),
        or(
          eq(patterns.visibility, 'PUBLIC'),
          eq(patterns.userId, currentUserId)
        )
      ),
      with: {
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!pattern) {
      throw new ResourceNotFoundException(`Pattern`, patternId);
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
      tags: pattern.tags.map((item) => item.tag.name),
    };
  }
}