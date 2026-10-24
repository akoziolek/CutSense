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
}
