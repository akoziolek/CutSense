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

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value))
  @IsBoolean()
  favourite?: boolean;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMax?: number;
}