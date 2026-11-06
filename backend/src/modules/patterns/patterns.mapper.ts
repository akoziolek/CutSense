import type { PointDto } from './dto/create-pattern.dto.js';
import { PatternListItemDto } from './dto/pattern-list.dto.js';
import { PatternSize, PatternVisibility } from './dto/pattern.enum.js';
import {
  PatternResponseDto,
  PatternImageDto,
} from './dto/pattern-response.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';

interface PatternListRow {
  id: number;
  name: string;
  size: `${PatternSize}`;
  isFavourite: boolean;
  createdAt: Date;
  userId: number;
  pictureS3Key?: string | null
}

export interface PatternWithRelations {
  id: number;
  name: string;
  description: string | null;
  size: `${PatternSize}`;
  visibility: `${PatternVisibility}`;
  starCount: number;
  starAverage: string;
  userId: number;
  createdAt: Date;
  tags: { tag: { id: number; name: string } }[];
  user: { id: number; nickname: string | null; name: string };
  images: {
    id: number;
    pictureS3Key: string;
    imageWidthMm: number;
    imageHeightMm: number;
    orderIndex: number;
    pieces: { id: number; normalCount: number; mirroredCount: number; geojson: string; grainline: number }[];
  }[];
  favoritedBy: { userId: number }[];
}

interface PatternTag {
  id: number;
  name: string;
}

export class PatternsMapper {
  static toListItemDto(
    row: PatternListRow,
    currentUserId?: number,
    imageUrl?: string
  ): PatternListItemDto {
    return Object.assign(new PatternListItemDto(), {
      id: row.id,
      name: row.name,
      size: row.size,
      isFavourite: row.isFavourite,
      createdAt: row.createdAt.toISOString(),
      isOwner: currentUserId !== undefined && row.userId === currentUserId,
      imageUrl: imageUrl
    });
  }

  static toResponseDto(
    pattern: PatternWithRelations,
    imageUrls: Map<string, string> = new Map(),
  ): PatternResponseDto {
    const allPieces = (pattern.images ?? []).flatMap((image) =>
      image.pieces.map((piece) => ({
        id: piece.id,
        normalCount: piece.normalCount,
        mirroredCount: piece.mirroredCount,
        patternImageId: image.id,
        grainline: piece.grainline,
        points: PatternsMapper.piecePointsFromGeoJson(piece.geojson),
      })),
    );

    const images: PatternImageDto[] = (pattern.images ?? []).map((img) => ({
      id: img.id,
      url: imageUrls.get(img.pictureS3Key) ?? img.pictureS3Key,
      imageWidthMm: img.imageWidthMm,
      imageHeightMm: img.imageHeightMm,
      orderIndex: img.orderIndex,
    }));

    return Object.assign(new PatternResponseDto(), {
      id: pattern.id,
      name: pattern.name,
      description: pattern.description ?? undefined,
      size: pattern.size,
      visibility: pattern.visibility,
      isFavourite: pattern.favoritedBy.length > 0,
      starCount: pattern.starCount,
      starAverage: pattern.starAverage,
      userId: pattern.userId,
      createdAt: pattern.createdAt.toISOString(),
      tags: pattern.tags.map((item) =>
        Object.assign(new PatternTagDto(), {
          id: item.tag.id,
          name: item.tag.name,
        }),
      ),
      author: {
        id: pattern.user.id,
        nickname: pattern.user.nickname ?? pattern.user.name,
      },
      images,
      pieces: allPieces,
    });
  }

  static toTagDtos(tags: PatternTag[]): PatternTagDto[] {
    return tags.map((tag) =>
      Object.assign(new PatternTagDto(), { id: tag.id, name: tag.name }),
    );
  }

  static pieceBoundaryToWkt(points: PointDto[]): string {
    const ring = [...points];
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first.x !== last.x || first.y !== last.y) ring.push(first);
    return `POLYGON((${ring.map((p) => `${p.x} ${p.y}`).join(', ')}))`;
  }

  static piecePointsFromGeoJson(geojson: string): [number, number][] {
    return (JSON.parse(geojson) as { coordinates: [number, number][][] })
      .coordinates[0];
  }
}
