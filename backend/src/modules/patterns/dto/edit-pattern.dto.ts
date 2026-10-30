import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
  IsPositive,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PatternSize, PatternVisibility } from './pattern.enum.js';

export class EditPatternDto {
  @ApiPropertyOptional({ example: 'Flowy dress', maxLength: 35 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(35)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the pattern',
    example: 'Ideal for hot summer days.',
    maxLength: 400,
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded IDs of selected pattern tags.',
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

  @ApiPropertyOptional({
    description: 'Size of the pattern',
    example: 'XS',
    enum: PatternSize,
  })
  @IsOptional()
  @IsEnum(PatternSize, { message: 'Size must be a valid size enum value' })
  size?: PatternSize;

  @ApiPropertyOptional({
    description: 'Visibility level of the pattern',
    example: 'PRIVATE',
    enum: PatternVisibility,
  })
  @IsOptional()
  @IsEnum(PatternVisibility, {
    message: 'Visibility must be a valid visibility enum value',
  })
  visibility?: PatternVisibility;
}
