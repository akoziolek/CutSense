import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';

export enum FabricSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  AREA_ASC = 'area_asc',
  AREA_DESC = 'area_desc',
}

export class ListFabricsQueryDto {
  @ApiPropertyOptional({ 
    description: 'Page number, starting from 1', 
    minimum: 1, 
    default: 1, 
    example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of fabrics per page', 
    minimum: 1, 
    maximum: 50, 
    default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @ApiPropertyOptional({
    description:
      'Sort order: name A-Z / Z-A, newest / oldest first, smallest / biggest area first',
    enum: FabricSortOption,
    enumName: 'FabricSortOption',
    default: FabricSortOption.DATE_DESC,
  })
  @IsOptional()
  @IsEnum(FabricSortOption)
  sort: FabricSortOption = FabricSortOption.DATE_DESC;

  @ApiPropertyOptional({ 
    description: 'Only fabrics added at or after this moment (ISO 8601)', 
    example: '2026-03-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({ 
    description: 'Only fabrics added at or before this moment (ISO 8601)', 
    example: '2026-03-31T23:59:59.999Z' })
  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @ApiPropertyOptional({ 
    description: 'true: favourites only, false: non-favourites only, omitted: all' })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  favourite?: boolean;

  @ApiPropertyOptional({ 
    type: [Number], 
    description: 'Fabric must have at least one of these tags. Comma-separated (1,2) or repeated (tagIds=1&tagIds=2).', 
    example: '1,2' })
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

  @ApiPropertyOptional({ 
    description: 'Minimum area (same unit as returned in "area")', 
    minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMin?: number;

  @ApiPropertyOptional({ 
    description: 'Maximum area (same unit as returned in "area")', 
    minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMax?: number;
}