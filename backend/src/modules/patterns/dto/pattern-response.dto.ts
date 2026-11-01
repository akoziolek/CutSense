import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PatternTagDto } from './pattern-tag.dto.js';
import { PatternVisibility, PatternSize } from './pattern.enum.js';


class PatternAuthorDto {
  @ApiProperty({ description: 'Unique identifier of the author', example: 42 })
  id!: number;

  @ApiProperty({ description: 'Nickname of the author', example: 'user_1' })
  nickname!: string;
}

class PatternPieceDto {
  @ApiProperty({ description: 'Identifier of the pattern piece', example: 1 })
  id!: number;

  @ApiProperty({
    description: 'Outer ring of the piece polygon as [x, y] pairs',
    type: 'array',
    items: {
      type: 'array',
      items: { type: 'number' },
    },
    example: [
      [0, 0],
      [15, 0],
      [15, 9],
    ],
  })
  points!: [number, number][];
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
    description: 'Visibility level of the pattern',
    example: 'PRIVATE',
    enum: PatternVisibility,
  })
  visibility!: string;

  @ApiProperty({
    description: 'Whether the current user marked the pattern as a favourite (always false for guests)',
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
    description: 'All pieces that make up the pattern',
    type: [PatternPieceDto],
  })
  pieces!: PatternPieceDto[];
}