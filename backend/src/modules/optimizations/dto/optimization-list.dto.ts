import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OptimizationListItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Summer shirt on linen' })
  name!: string;

  @ApiProperty({ example: '2026-11-08T10:30:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: 17 })
  patternId!: number;

  @ApiProperty({ example: 'Flowy shirt' })
  patternName!: string;

  @ApiPropertyOptional({ description: 'Library fabric name; omitted for custom dimensions', example: 'Silk' })
  fabricName?: string;

  @ApiProperty({ example: 'Bottom-Left Decreasing' })
  algorithmName!: string;
}

export class OptimizationListResponseDto {
  @ApiProperty({ type: [OptimizationListItemDto] })
  items!: OptimizationListItemDto[];

  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ description: 'Total number of pages (0 when there is nothing to show)', example: 3 })
  totalPages!: number;
}