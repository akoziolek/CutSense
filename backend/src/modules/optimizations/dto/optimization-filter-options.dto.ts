import { ApiProperty } from '@nestjs/swagger';

export class FilterOptionDto {
  @ApiProperty({ example: 1 }) id!: number;
  @ApiProperty({ example: 'Flowy shirt' }) name!: string;
  @ApiProperty({ description: 'Number of the user\'s optimizations using this option', example: 4 })
  count!: number;
}

export class OptimizationFilterOptionsDto {
  @ApiProperty({ type: [FilterOptionDto] }) patterns!: FilterOptionDto[];
  @ApiProperty({ type: [FilterOptionDto] }) fabrics!: FilterOptionDto[];
  @ApiProperty({ type: [FilterOptionDto] }) algorithms!: FilterOptionDto[];
}