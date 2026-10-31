import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class BaseListQueryDto {
  @ApiPropertyOptional({
    description: 'Page number, starting from 1',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 50,
    default: 12,
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;
}

export class FilterableListQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive text to look for in the name and description',
    maxLength: 100,
    example: 'linen',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Only items added at or after this moment (ISO 8601)',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: 'Only items added at or before this moment (ISO 8601)',
    example: '2026-03-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({
    description: 'true: favourites only, false: non-favourites only, omitted: all',
  })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  favourite?: boolean;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Item must have at least one of these tags. Comma-separated (1,2) or repeated (tagIds=1&tagIds=2).',
    example: '1,2',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    const raw: unknown[] = Array.isArray(value) ? value : String(value).split(',');
    return [...new Set(raw.map(Number))];
  })
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  tagIds?: number[];
}