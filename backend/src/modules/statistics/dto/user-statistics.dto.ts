import { ApiProperty } from '@nestjs/swagger';

export class ResourceStatDto {
  @ApiProperty({ description: 'Total number of items', example: 43 })
  total!: number;

  @ApiProperty({ description: 'Items added in the current week', example: 2 })
  thisWeek!: number;
}

export class UserStatisticsDto {
  @ApiProperty({
    type: ResourceStatDto,
    description: 'Optimizations statistics',
  })
  optimizations!: ResourceStatDto;

  @ApiProperty({ type: ResourceStatDto, description: 'Fabrics statistics' })
  fabrics!: ResourceStatDto;

  @ApiProperty({ type: ResourceStatDto, description: 'Patterns statistics' })
  patterns!: ResourceStatDto;
}
