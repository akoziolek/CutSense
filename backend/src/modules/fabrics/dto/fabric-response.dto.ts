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

  @ApiProperty({
    description: 'Fabric area in square millimeters.',
    example: 4_320_000,
  })
  areaMm2!: number;

  @ApiProperty({
    description:
      'Fabric boundaries as calibrated Cartesian point lists in millimeters, ordered counter-clockwise. A fabric currently has one shape.',
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          x: { type: 'number', example: -2500 },
          y: { type: 'number', example: 1250 },
        },
      },
    },
    example: [
      [
        { x: -2500, y: 1250 },
        { x: 2500, y: 1250 },
        { x: 2500, y: 6250 },
        { x: -2500, y: 6250 },
      ],
    ],
  })
  shapes!: PointDto[][];

  @ApiPropertyOptional({
    description:
      'Image width in calibrated millimeters; omitted for fabrics created before image dimensions were stored.',
    example: 600,
  })
  imageWidthMm?: number;

  @ApiPropertyOptional({
    description:
      'Image height in calibrated millimeters; omitted for fabrics created before image dimensions were stored.',
    example: 400,
  })
  imageHeightMm?: number;

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
