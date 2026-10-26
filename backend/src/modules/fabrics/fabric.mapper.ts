import { FabricResponseDto } from './dto/fabric-response.dto.js';

interface FabricWithTags {
  id: number;
  name: string;
  description?: string | null;
  pictureS3Key?: string | null;
  isFavourite: boolean;
  area: number;
  userId: number;
  createdAt: Date;
  tags: {
    tag: {
      id: number;
      name: string;
    };
  }[];
}

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
      tags: fabric.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
      })),
    });
  }

  static toListItemDto(
    fabric: Pick<
      typeof fabrics.$inferSelect,
      'id' | 'name' | 'pictureS3Key' | 'isFavourite' | 'area' | 'createdAt'
    >,
    pictureUrl?: string,
  ): FabricListItemDto {
    return Object.assign(new FabricListItemDto(), {
      id: fabric.id,
      name: fabric.name,
      pictureUrl,
      isFavourite: fabric.isFavourite,
      area: fabric.area,
      createdAt: fabric.createdAt.toISOString(),
    });
  }
}
