import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FabricListItemDto {
  @ApiProperty({ 
    description: 'Unique identifier of the fabric',
    example: 1 })
  id!: number;

  @ApiProperty({ 
    description: 'Name of the fabric',
    example: 'Cotton canvas' })
  name!: string;

  @ApiPropertyOptional({ 
    description: 'Presigned S3 photo URL', 
    example: 'https://...' })
  pictureUrl?: string;

  @ApiProperty({ 
    description: 'Whether the fabric is marked as a favourite',
    example: false })
  isFavourite!: boolean;

  @ApiProperty({ 
    description: 'Fabric area',
    example: 4.32 })
  area!: number;

  @ApiProperty({ 
    description: 'Date and time when created',
    example: '2026-10-17T10:30:00.000Z' })
  createdAt!: string;
}

export class FabricListResponseDto {
  @ApiProperty({ 
    description: 'Fabrics on the requested page',
    type: [FabricListItemDto] })
  items!: FabricListItemDto[];

  @ApiProperty({ 
    description: 'Total number of fabrics of the user', 
    example: 234 })
  total!: number;

  @ApiProperty({ 
    description: 'Current page number',
    example: 1 })
  page!: number;

  @ApiProperty({ 
    description: 'Page size used for this response',
    example: 12 })
  limit!: number;

  @ApiProperty({ 
    description: 'Total number of pages (0 when the user has no fabrics)',
    example: 20 })
  totalPages!: number;
}