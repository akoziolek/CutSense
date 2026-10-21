import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FabricListItemDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Cotton canvas' })
  name!: string;

  @ApiPropertyOptional({ description: 'Presigned S3 photo URL' })
  pictureUrl?: string;

  @ApiProperty({ example: false })
  isFavourite!: boolean;

  @ApiProperty({ example: 4.32 })
  area!: number;

  @ApiProperty({ example: '2026-10-17T10:30:00.000Z' })
  createdAt!: string;
}

export class FabricListResponseDto {
  @ApiProperty({ type: [FabricListItemDto] })
  items!: FabricListItemDto[];

  @ApiProperty({ description: 'Total number of fabrics of the user', example: 234 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;

  @ApiProperty({ example: 20 })
  totalPages!: number;
}