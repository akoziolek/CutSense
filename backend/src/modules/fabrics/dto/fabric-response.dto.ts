import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FabricResponseDto {
  @ApiProperty({ description: 'Unique identifier of the fabric', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Name of the fabric', example: 'Cotton canvas' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the fabric',
    example: 'Durable medium-weight cotton fabric',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'URL of the fabric image',
    example: 'https://example.com/fabrics/cotton-canvas.jpg',
  })
  pictureS3Key?: string;

  @ApiPropertyOptional({
    description: 'Whether the fabric is marked as a favourite',
    example: false,
  })
  isFavourite?: boolean;

  @ApiProperty({
    description: 'Identifier of the user who owns the fabric',
    example: 42,
  })
  userId!: number;

  @ApiProperty({
    description:
      'Date and time when the fabric was created, in ISO 8601 format',
    example: '2025-01-15T10:30:00.000Z',
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Names of the tags assigned to the fabric',
    example: ['cotton', 'canvas'],
    type: [String],
  })
  tags!: string[];
}
