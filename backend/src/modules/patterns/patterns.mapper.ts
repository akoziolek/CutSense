import { PointDto } from '../../common/geometry/point.dto.js';
import {
  pointsToWktPolygon,
  withoutClosingPoint,
} from '../../common/geometry/shapes-geometry.js';
import { PatternListItemDto } from './dto/pattern-list.dto.js';
import { PatternSize, PatternVisibility } from './dto/pattern.enum.js';
import {
  PatternResponseDto,
  PatternImageDto,
} from './dto/pattern-response.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { type CreatePatternDto } from './dto/create-pattern.dto.js';
import type { EnginePiece } from '../optimizer-engine/optimizer-engine.types.js';
import type { PatternPieceGeometryDto } from './dto/pattern-piece-geometry.dto.js';
import type { PatternCoverDto } from './dto/pattern-cover.dto.js';

interface PatternListRow {
  id: number;
  name: string;
  size: `${PatternSize}`;
  isFavourite: boolean;
  createdAt: Date;
  userId: number;
  pictureS3Key?: string | null;
}

export interface PatternWithRelations {
  id: number;
  name: string;
  description: string | null;
  size: `${PatternSize}`;
  minFabricLengthMM: number | null;
  minFabricWidthMM: number | null;
  visibility: `${PatternVisibility}`;
  starCount: number;
  starAverage: string;
  userId: number;
  createdAt: Date;
  tags: { tag: { id: number; name: string } }[];
  user: { id: number; nickname: string | null };
  images: {
    id: number;
    pictureS3Key: string;
    imageWidthMm: number;
    imageHeightMm: number;
    orderIndex: number;
    pieces: {
      id: number;
      normalCount: number;
      mirroredCount: number;
      geojson: string;
      grainline: number;
    }[];
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
    imageUrl?: string,
  ): PatternListItemDto {
    return Object.assign(new PatternListItemDto(), {
      id: row.id,
      name: row.name,
      size: row.size,
      isFavourite: row.isFavourite,
      createdAt: row.createdAt.toISOString(),
      isOwner: currentUserId !== undefined && row.userId === currentUserId,
      imageUrl: imageUrl,
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
      minFabricLengthMM: pattern.minFabricLengthMM ?? null,
      minFabricWidthMM: pattern.minFabricWidthMM ?? null,
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
        nickname: pattern.user.nickname,
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
    return pointsToWktPolygon(points);
  }

  static piecePointsFromGeoJson(geojson: string): PointDto[] {
    const coordinates =
      (JSON.parse(geojson) as { coordinates: [number, number][][] })
        .coordinates[0] ?? [];
    return withoutClosingPoint(
      coordinates.map(([x, y]) => ({ x, y })),
      (first, last) => first.x === last.x && first.y === last.y,
    );
  }

  static toPieceGeometryDto(piece: {
    id: number;
    grainline: number;
    geojson: string;
  }): PatternPieceGeometryDto {
    return {
      id: piece.id,
      grainline: piece.grainline,
      boundary: this.piecePointsFromGeoJson(piece.geojson),
    };
  }

  static toCoverDto(patternId: number, imageUrl?: string): PatternCoverDto {
    return {
      patternId,
      imageUrl,
    };
  }

  static mapPiecesForEngine(pieces: CreatePatternDto['pieces']): EnginePiece[] {
    return pieces.flatMap((piece, index) => {
      const constraints: EnginePiece['constraints'] = [];
      if (piece.normal > 0) {
        constraints.push({
          rotationAngle: 0,
          isMirrored: false,
          requiredQuantity: piece.normal,
          twoWay: false,
        });
      }
      if (piece.mirrored > 0) {
        constraints.push({
          rotationAngle: 0,
          isMirrored: true,
          requiredQuantity: piece.mirrored,
          twoWay: false,
        });
      }

      if (constraints.length === 0) return [];

      return [
        {
          id: index + 1,
          points: piece.points,
          grainline: piece.grainline,
          constraints,
          seamAllowance: 0,
          cuttingAllowance: 0,
        },
      ];
    });
  }
}
