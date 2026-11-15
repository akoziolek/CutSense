import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AlgorithmDto {
  @ApiProperty({ description: 'Unique identifier of the algorithm', example: 1 })
  id!: number;

  @ApiProperty({ description: 'Name of the algorithm', example: 'Bottom-Left Decreasing' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Short description of the algorithm',
    example: 'Sorts pieces by area descending before placing them.',
  })
  description?: string;
}
