import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import type { CartesianPoint } from './cartesian-point.js';

const COORDINATE_LIMIT_MM = 10_000_000;

export class PointDto implements CartesianPoint {
  @ApiProperty({
    description: 'X coordinate in millimeters.',
    example: -2500,
    minimum: -COORDINATE_LIMIT_MM,
    maximum: COORDINATE_LIMIT_MM,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORDINATE_LIMIT_MM)
  @Max(COORDINATE_LIMIT_MM)
  x!: number;

  @ApiProperty({
    description: 'Y coordinate in millimeters, positive upward.',
    example: 1250,
    minimum: -COORDINATE_LIMIT_MM,
    maximum: COORDINATE_LIMIT_MM,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORDINATE_LIMIT_MM)
  @Max(COORDINATE_LIMIT_MM)
  y!: number;
}
