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
      boundary: FabricMapper.withoutClosingPoint(fabric.boundary),
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
}
