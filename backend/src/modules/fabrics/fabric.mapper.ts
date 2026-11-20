import { fabrics } from '../../db/schema/schema.js';
import { FabricListItemDto } from './dto/fabric-list.dto.js';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { PointDto } from '../../common/geometry/point.dto.js';
import { withoutClosingPoint } from '../../common/geometry/shapes-geometry.js';
import { FabricGeometryDto } from './dto/fabric-geometry.dto.js';

interface FabricWithTags {
  id: number;
  name: string;
  description?: string | null;
  isFavourite: boolean;
  areaMm2: number;
  imageWidthMm?: number | null;
  imageHeightMm?: number | null;
  userId: number;
  createdAt: Date;
  tags: {
    tag: {
      id: number;
      name: string;
    };
  }[];
  boundary: PointDto[];
  grainline: number;
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

    return withoutClosingPoint(
      points,
      (first, last) => first.x === last.x && first.y === last.y,
    );
  }

  static toResponseDto(
    fabric: FabricWithTags,
    pictureUrl?: string,
  ): FabricResponseDto {
    const shape = withoutClosingPoint(
      fabric.boundary,
      (first, last) => first.x === last.x && first.y === last.y,
    );

    return Object.assign(new FabricResponseDto(), {
      id: fabric.id,
      name: fabric.name,
      description: fabric.description ?? undefined,
      pictureUrl,
      isFavourite: fabric.isFavourite,
      areaMm2: fabric.areaMm2,
      imageWidthMm: fabric.imageWidthMm ?? undefined,
      imageHeightMm: fabric.imageHeightMm ?? undefined,
      userId: fabric.userId,
      createdAt: fabric.createdAt.toISOString(),
      tags: fabric.tags.map((item) => ({
        id: item.tag.id,
        name: item.tag.name,
      })),
      shapes: shape.length > 0 ? [shape] : [],
      grainline: fabric.grainline,
    });
  }

  static toListItemDto(
    fabric: Pick<
      typeof fabrics.$inferSelect,
      'id' | 'name' | 'isFavourite' | 'areaMm2' | 'createdAt'
    >,
    pictureUrl?: string,
  ): FabricListItemDto {
    return Object.assign(new FabricListItemDto(), {
      id: fabric.id,
      name: fabric.name,
      pictureUrl,
      isFavourite: fabric.isFavourite,
      areaMm2: fabric.areaMm2,
      createdAt: fabric.createdAt.toISOString(),
    });
  }

  static toGeometryDto(fabric: {
    id: number;
    name: string;
    createdAt: Date;
    imageWidthMm: number;
    imageHeightMm: number;
    grainline: number;
    boundaryGeoJson: string;
  }): FabricGeometryDto {
    return {
      id: fabric.id,
      name: fabric.name,
      createdAt: fabric.createdAt.toISOString(),
      widthMm: fabric.imageWidthMm,
      lengthMm: fabric.imageHeightMm,
      grainline: fabric.grainline,
      boundary: this.boundaryFromGeoJson(fabric.boundaryGeoJson),
    };
  }
}
