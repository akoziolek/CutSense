import { fabrics } from '../../db/schema/schema.js';
import { FabricListItemDto } from './dto/fabric-list.dto.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { PointDto } from './dto/create-fabric.dto.js';

interface FabricWithTags {
  id: number;
  name: string;
  description?: string | null;
  pictureS3Key?: string | null;
  isFavourite: boolean;
  area: number;
  imageWidthCm?: number | null;
  imageHeightCm?: number | null;
  userId: number;
  createdAt: Date;
  tags: {
    tag: {
      id: number;
      name: string;
    };
  }[];
  boundary: PointDto[];
}

export class FabricMapper {
  static boundaryFromGeoJson(
    boundaryGeoJson: string | object | null,
  ): PointDto[] {
    if (!boundaryGeoJson) return [];

    const parsed: unknown =
      typeof boundaryGeoJson === 'string'
        ? JSON.parse(boundaryGeoJson)
        : boundaryGeoJson;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('coordinates' in parsed) ||
      !Array.isArray(parsed.coordinates) ||
      !Array.isArray(parsed.coordinates[0])
    ) {
      throw new Error('Fabric boundary is not a valid GeoJSON polygon.');
    }

    const ring = parsed.coordinates[0];
    const points: PointDto[] = ring.map((position: unknown) => {
      if (
        !Array.isArray(position) ||
        typeof position[0] !== 'number' ||
        typeof position[1] !== 'number'
      ) {
        throw new Error('Fabric boundary contains an invalid coordinate.');
      }

      return { x: position[0], y: position[1] };
    });

    return FabricMapper.withoutClosingPoint(points);
  }

  static toResponseDto(
    fabric: FabricWithTags,
    pictureUrl?: string,
  ): FabricResponseDto {
    const shape = FabricMapper.withoutClosingPoint(fabric.boundary);

    return Object.assign(new FabricResponseDto(), {
      id: fabric.id,
      name: fabric.name,
      description: fabric.description ?? undefined,
      pictureS3Key: fabric.pictureS3Key ?? undefined,
      pictureUrl,
      isFavourite: fabric.isFavourite,
      area: fabric.area,
      imageWidthCm: fabric.imageWidthCm ?? undefined,
      imageHeightCm: fabric.imageHeightCm ?? undefined,
      userId: fabric.userId,
      createdAt: fabric.createdAt.toISOString(),
      tags: fabric.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
      })),
      shapes: shape.length > 0 ? [shape] : [],
    });
  }

  private static withoutClosingPoint(points: PointDto[]): PointDto[] {
    if (points.length < 2) return points;

    const boundary = [...points];
    const first = boundary[0];
    const last = boundary.at(-1);

    if (first && last && first.x === last.x && first.y === last.y) {
      boundary.pop();
    }
    return boundary;
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
