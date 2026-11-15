import { ApiProperty } from '@nestjs/swagger';

export class OptimizationDefaultsDto {
  @ApiProperty({ description: 'Default seam allowance in millimeters', example: 5 })
  seamAllowanceMm!: number;

  @ApiProperty({ description: 'Default cutting allowance in millimeters', example: 20 })
  cuttingAllowanceMm!: number;
}
