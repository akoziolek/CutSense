import type { PointDto } from './dto/create-pattern.dto.js';
import { PatternListItemDto } from './dto/pattern-list.dto.js';
import { PatternSize, PatternVisibility } from './dto/pattern.enum.js';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';

interface PatternListRow {
  id: number;
  name: string;
  size: `${PatternSize}`;
  isFavourite: boolean;
  createdAt: Date;
}

interface PatternWithRelations {
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
  pieces: { id: number; geojson: string }[];
  favoritedBy: { userId: number }[];
}

// TODO change from geojson to points[]

interface PatternTag {
  id: number;
  name: string;
}

export class PatternsMapper {
  static toListItemDto(row: PatternListRow): PatternListItemDto {
    return Object.assign(new PatternListItemDto(), {
      id: row.id,
      name: row.name,
      size: row.size,
      isFavourite: row.isFavourite,
      createdAt: row.createdAt.toISOString(),
    });
  }

  static toResponseDto(pattern: PatternWithRelations): PatternResponseDto {
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
      pieces: pattern.pieces.map((piece) => ({
        id: piece.id,
        points: PatternsMapper.piecePointsFromGeoJson(piece.geojson),
      })),
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
