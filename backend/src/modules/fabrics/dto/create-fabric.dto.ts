import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const COORD_LIMIT = 1_000_000;

export class PointDto {
  @ApiProperty({
    description: 'X coordinate in calibrated millimeters.',
    example: -2500,
    minimum: -COORD_LIMIT,
    maximum: COORD_LIMIT,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORD_LIMIT)
  @Max(COORD_LIMIT)
  x!: number;

  @ApiProperty({
    description: 'Y coordinate in calibrated millimeters.',
    example: 1250,
    minimum: -COORD_LIMIT,
    maximum: COORD_LIMIT,
  })
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORD_LIMIT)
  @Max(COORD_LIMIT)
  y!: number;
}

export class CreateFabricDto {
  @ApiProperty({ example: 'Cotton canvas', maxLength: 35 })
  @IsString()
  @MinLength(1)
  @MaxLength(35)
  name!: string;

  @ApiProperty({
    description:
      'JSON-encoded array of boundary points in calibrated millimeters. Provide at least three points; the boundary is closed automatically.',
    type: String,
    example:
      '[{"x":-2500,"y":1250},{"x":2500,"y":1250},{"x":2500,"y":6250},{"x":-2500,"y":6250}]',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? plainToInstance(PointDto, parsed) : parsed;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  boundary!: PointDto[];

  @ApiProperty({
    description: 'Image width in calibrated millimeters.',
    example: 600,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageWidthMm!: number;

  @ApiProperty({
    description: 'Image height in calibrated millimeters.',
    example: 400,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageHeightMm!: number;

  @ApiPropertyOptional({
    description: 'Description of the fabric',
    example: 'Durable cotton',
    maxLength: 400,
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded IDs of selected fabric tags.',
    type: String,
    example: '[1,2]',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(Number) : parsed;
    } catch {
      return value;
    }
  })
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  tagIds?: number[];
}
