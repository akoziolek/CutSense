import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  MAX_CUTTING_ALLOWANCE_MM,
  MAX_FABRIC_SIDE_MM,
  MAX_PIECE_COPIES,
  MAX_SEAM_ALLOWANCE_MM,
} from '../optimizations.constants.js';

export class OptimizationPieceDto {
  @ApiProperty({ description: 'ID of a piece of the selected pattern', example: 101 })
  @IsInt()
  @IsPositive()
  patternPieceId!: number;

  @ApiProperty({ description: 'Number of normal copies', minimum: 0, maximum: MAX_PIECE_COPIES, example: 2 })
  @IsInt()
  @Min(0)
  @Max(MAX_PIECE_COPIES)
  normalCount!: number;

  @ApiProperty({ description: 'Number of mirrored copies', minimum: 0, maximum: MAX_PIECE_COPIES, example: 1 })
  @IsInt()
  @Min(0)
  @Max(MAX_PIECE_COPIES)
  mirroredCount!: number;

  @ApiProperty({ description: 'Allowed direction of the piece in degrees', minimum: 0, maximum: 359, example: 90 })
  @IsInt()
  @Min(0)
  @Max(359)
  direction!: number;

  @ApiProperty({ description: 'Whether the piece may also be turned by 180 degrees', example: false })
  @IsBoolean()
  twoWay!: boolean;
}

export class CreateOptimizationDto {
  @ApiProperty({ description: 'Pattern to prepare (public or accessible to the current user)', example: 17 })
  @IsInt()
  @IsPositive()
  patternId!: number;

  @ApiProperty({ description: 'Nesting algorithm (see GET /optimizations/algorithms)', example: 1 })
  @IsInt()
  @IsPositive()
  algorithmId!: number;

  @ApiPropertyOptional({
    description:
      "Fabric from the current user's library. Guests must provide custom dimensions instead.",
    example: 9,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  fabricId?: number;

  @ApiPropertyOptional({
    description: 'Custom fabric width in millimeters. Requires fabricLengthMm, excludes fabricId.',
    minimum: 1,
    maximum: MAX_FABRIC_SIDE_MM,
    example: 1450,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FABRIC_SIDE_MM)
  fabricWidthMm?: number;

  @ApiPropertyOptional({
    description: 'Custom fabric length in millimeters. Requires fabricWidthMm, excludes fabricId.',
    minimum: 1,
    maximum: MAX_FABRIC_SIDE_MM,
    example: 2900,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_FABRIC_SIDE_MM)
  fabricLengthMm?: number;

  @ApiProperty({ description: 'Seam allowance in millimeters', minimum: 0, maximum: MAX_SEAM_ALLOWANCE_MM, example: 5 })
  @IsInt()
  @Min(0)
  @Max(MAX_SEAM_ALLOWANCE_MM)
  seamAllowanceMm!: number;

  @ApiProperty({ description: 'Cutting allowance in millimeters', minimum: 0, maximum: MAX_CUTTING_ALLOWANCE_MM, example: 20 })
  @IsInt()
  @Min(0)
  @Max(MAX_CUTTING_ALLOWANCE_MM)
  cuttingAllowanceMm!: number;

  @ApiProperty({
    description:
      'Configuration of the pattern pieces. A piece may be listed more than once to give copies different settings.',
    type: [OptimizationPieceDto],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one piece is required' })
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => OptimizationPieceDto)
  pieces!: OptimizationPieceDto[];
}
