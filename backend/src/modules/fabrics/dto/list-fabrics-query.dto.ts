import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum FabricSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
  AREA_ASC = 'area_asc',
  AREA_DESC = 'area_desc',
}

export class ListFabricsQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @ApiPropertyOptional({
    enum: FabricSortOption,
    default: FabricSortOption.DATE_DESC,
  })
  @IsOptional()
  @IsEnum(FabricSortOption)
  sort: FabricSortOption = FabricSortOption.DATE_DESC;
}