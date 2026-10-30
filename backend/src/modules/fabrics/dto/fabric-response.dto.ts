import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FabricTagDto } from './fabric-tags.dto.js';
import { PointDto } from './create-fabric.dto.js';

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
    description:
      'Fabric boundaries as calibrated Cartesian point lists. A fabric currently has one shape.',
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          x: { type: 'number', example: -250 },
          y: { type: 'number', example: 125 },
        },
      },
    },
    example: [
      [
        { x: -250, y: 125 },
        { x: 250, y: 125 },
        { x: 250, y: 625 },
        { x: -250, y: 625 },
      ],
    ],
  })
  shapes!: PointDto[][];

  @ApiPropertyOptional({
    description:
      'Image width in calibrated boundary units; omitted for fabrics created before image dimensions were stored.',
    example: 60,
  })
  imageWidthCm?: number;

  @ApiPropertyOptional({
    description:
      'Image height in calibrated boundary units; omitted for fabrics created before image dimensions were stored.',
    example: 40,
  })
  imageHeightCm?: number;

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
