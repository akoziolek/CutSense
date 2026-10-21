import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { fabrics } from '../../db/schema/schema.js';

type FabricWithTags = typeof fabrics.$inferSelect & {
  tags: { tag: { name: string } }[];
};

export class FabricMapper {
  static toResponseDto(
    fabric: FabricWithTags,
    pictureUrl?: string,
  ): FabricResponseDto {
    return Object.assign(new FabricResponseDto(), {
      id: fabric.id,
      name: fabric.name,
      description: fabric.description ?? undefined,
      pictureS3Key: fabric.pictureS3Key ?? undefined,
      pictureUrl,
      isFavourite: fabric.isFavourite,
      area: fabric.area,
      userId: fabric.userId,
      createdAt: fabric.createdAt.toISOString(),
      tags: fabric.tags.map((item) => item.tag.name),
    });
  }
}
