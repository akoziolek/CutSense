import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FabricTagDto {
  @ApiProperty({
    description: 'Unique tag ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Tag name',
    example: 'cotton',
  })
  name!: string;
}

export class FabricResponseDto {
  @ApiProperty({ description: 'Unique identifier of the fabric', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Name of the fabric', example: 'Cotton canvas' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the fabric',
    example: 'Durable cotton',
  })
  description?: string;

  @ApiProperty({
    description: 'S3 key of the fabric image',
    example: 'users/1/fabrics/uuid.jpg',
  })
  pictureS3Key!: string;

  @ApiPropertyOptional({
    description: 'S3 signed photo URL',
    example: 'https://...',
  })
  pictureUrl?: string;

  @ApiProperty({
    description: 'Whether the fabric is marked as a favourite',
    example: false,
  })
  isFavourite!: boolean;

  @ApiProperty({ description: 'Fabric area', example: 4.32 })
  area!: number;

  @ApiProperty({
    description: 'Identifier of the user who owns the fabric',
    example: 42,
  })
  userId!: number;

  @ApiProperty({
    description: 'Date and time when created',
    example: '2026-10-17T10:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Tags associated with the fabric',
    example: [{ id: 1, name: 'cotton' }],
    type: [FabricTagDto],
  })
  tags!: FabricTagDto[];
}
