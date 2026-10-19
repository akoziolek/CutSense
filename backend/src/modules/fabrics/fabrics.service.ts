import { BadRequestException, Injectable, Inject } from '@nestjs/common';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider.js';
import { fabrics, fabricTags, tagsForFabrics } from '../../db/schema/schema.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { ResourceNotFoundException } from '../../common/exceptions/resource-not-found.exception.js';
import { StoragePaths, StorageService } from '../storage/storage.service.js';
import { FabricMapper } from './fabric.mapper.js';
import { CreateFabricDto } from './dto/create-fabric.dto.js';

@Injectable()
export class FabricService {
  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly storageService: StorageService,
  ) {}

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
      throw new BadRequestException(
        'One or more selected fabric tags do not exist.',
      );
    }

    const points = [...createFabricDto.boundary];
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last || points.length < 3) {
      throw new BadRequestException(
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
        tags: selectedTags.map((tag) => ({ tag })),
      },
      pictureUrl,
    );
  }

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

    const pictureUrl = fabric.pictureS3Key
      ? await this.storageService.generatePresignedUrl(fabric.pictureS3Key)
      : undefined;

    return FabricMapper.toResponseDto(fabric, pictureUrl);
  }
}
