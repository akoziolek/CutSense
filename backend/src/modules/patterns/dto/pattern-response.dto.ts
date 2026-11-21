import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatternTagDto } from './pattern-tag.dto.js';
import { PatternVisibility, PatternSize } from './pattern.enum.js';
import { PointDto } from '../../../common/geometry/point.dto.js';

class PatternAuthorDto {
  @ApiProperty({ description: 'Unique identifier of the author', example: 42 })
  id!: number;

  @ApiProperty({ description: 'Nickname of the author', example: 'user_1' })
  nickname!: string;
}

export class PatternImageDto {
  @ApiProperty({ description: 'Identifier of the image', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Public or presigned URL to view the image',
    example: 'https://storage.example.com/...',
  })
  url!: string;

  @ApiProperty({ description: 'Width of sheet in millimeters', example: 900 })
  imageWidthMm!: number;

  @ApiProperty({ description: 'Height of sheet in millimeters', example: 1200 })
  imageHeightMm!: number;

  @ApiProperty({ description: 'Display order index', example: 0 })
  orderIndex!: number;
}

class PatternPieceDto {
  @ApiProperty({ description: 'Identifier of the pattern piece', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Default number of normal copies', example: 1 })
  normalCount!: number;

  @ApiProperty({ description: 'Default number of mirrored copies', example: 0 })
  mirroredCount!: number;

  @ApiProperty({
    description: 'ID of the image this piece belongs to',
    example: 5,
  })
  patternImageId!: number;

  @ApiProperty({
    description: 'Grainline angle in degrees [0, 359]',
    example: 90,
    minimum: 0,
    maximum: 359,
  })
  grainline!: number;

  @ApiProperty({
    description:
      'Open outer ring of the piece polygon as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
    example: [
      { x: 0, y: 0 },
      { x: 15, y: 0 },
      { x: 15, y: 9 },
    ],
  })
  points!: PointDto[];
}

export class PatternResponseDto {
  @ApiProperty({ description: 'Unique identifier of the pattern', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Name of the pattern', example: 'Flowy shirt' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the pattern',
    example: 'Relaxed-fit summer shirt',
  })
  description?: string;

  @ApiProperty({
    description: 'Size of the pattern',
    enum: PatternSize,
    enumName: 'PatternSize',
    example: 'S',
  })
  size!: PatternSize;

  @ApiProperty({
    description:
      'Minimum required fabric length in millimeters for the reference width',
    type: Number,
    nullable: true,
    example: 1450,
  })
  minFabricLengthMM!: number | null;

  @ApiProperty({
    description:
      'Reference fabric width in millimeters used to calculate minimum length',
    type: Number,
    nullable: true,
    example: 1400,
  })
  minFabricWidthMM!: number | null;

  @ApiProperty({
    description: 'Visibility level of the pattern',
    example: 'PRIVATE',
    enum: PatternVisibility,
  })
  visibility!: string;

  @ApiProperty({
    description:
      'Whether the current user marked the pattern as a favourite (always false for guests)',
    example: false,
  })
  isFavourite!: boolean;

  @ApiProperty({ description: 'Star count', example: 12 })
  starCount!: number;

  @ApiProperty({ description: 'Star average rating', example: '4.43' })
  starAverage!: string;

  @ApiProperty({
    description: 'Identifier of the user who owns the pattern',
    example: 42,
  })
  userId!: number;

  @ApiProperty({
    description: 'Date and time when created',
    example: '2026-10-17T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Tags associated with the pattern',
    example: [{ id: 1, name: 'summer' }],
    type: [PatternTagDto],
  })
  tags!: PatternTagDto[];

  @ApiProperty({ type: PatternAuthorDto })
  author!: PatternAuthorDto;

  @ApiProperty({
    description: 'Images associated with the pattern',
    type: [PatternImageDto],
  })
  images!: PatternImageDto[];

  @ApiProperty({
    description: 'All pieces that make up the pattern',
    type: [PatternPieceDto],
  })
  pieces!: PatternPieceDto[];
}
