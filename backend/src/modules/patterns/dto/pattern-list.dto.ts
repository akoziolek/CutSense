import { ApiProperty } from '@nestjs/swagger';

export class PatternListItemDto {
  @ApiProperty({ description: 'Unique identifier of the pattern', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Name of the pattern', example: 'Flowy shirt' })
  name!: string;

  @ApiProperty({
    description: 'Size of the pattern',
    example: 'S',
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  })
  size!: string;

  @ApiProperty({
    description:
      'Whether the current user marked the pattern as a favourite (always false for guests)',
    example: false,
  })
  isFavourite!: boolean;

  @ApiProperty({
    description: 'Date and time when created',
    example: '2026-10-17T10:30:00.000Z',
  })
  createdAt!: string;
}

export class PatternListResponseDto {
  @ApiProperty({ type: [PatternListItemDto] })
  items!: PatternListItemDto[];

  @ApiProperty({
    description: 'Total number of patterns visible to the requester',
    example: 234,
  })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({
    description: 'Total number of pages (0 when nothing is visible)',
    example: 20,
  })
  totalPages!: number;
}