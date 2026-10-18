import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    example: 'XS',
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  })
  size!: string;

  @ApiProperty({
    description: 'Visibility level of the pattern',
    example: 'PRIVATE',
    enum: ['PUBLIC', 'PRIVATE'],
  })
  visibility!: string;

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
    description: 'Names of the tags',
    example: ['summer', 'tops'],
    type: [String],
  })
  tags!: string[];
}