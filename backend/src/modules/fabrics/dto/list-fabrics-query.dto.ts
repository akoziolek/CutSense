import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { FilterableListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export enum FabricSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  AREA_ASC = 'area_asc',
  AREA_DESC = 'area_desc',
}

export class ListFabricsQueryDto extends FilterableListQueryDto {
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
    description: 'Minimum area (same unit as returned in "area")',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMin?: number;

  @ApiPropertyOptional({
    description: 'Maximum area (same unit as returned in "area")',
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  areaMax?: number;
}