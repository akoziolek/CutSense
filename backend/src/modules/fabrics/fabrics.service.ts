import { Injectable, Inject } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { fabrics } from '../../db/schema/schema.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';

@Injectable()
export class FabricService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
  ) {}

  async getFabricById(
    fabricId: number,
    currentUserId: number,
  ): Promise<FabricResponseDto> {
    const fabric = await this.db.query.fabrics.findFirst({
      where: and(eq(fabrics.id, fabricId), eq(fabrics.userId, currentUserId)),
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

    return {
      id: fabric.id,
      name: fabric.name,
      description: fabric.description ?? undefined,
      pictureUrl: fabric.pictureUrl ?? undefined,
      isFavourite: fabric.isFavourite,
      userId: fabric.userId,
      createdAt: fabric.createdAt.toISOString(),
      tags: fabric.tags.map((item) => item.tag.name),
    };
  }
}
