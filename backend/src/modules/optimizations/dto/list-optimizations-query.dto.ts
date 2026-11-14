import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { BaseListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export enum OptimizationSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
}

export class ListOptimizationsQueryDto extends BaseListQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive text to look for in the name',
    maxLength: 100,
    example: 'shirt',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({
    description: 'Sort order: name A-Z / Z-A, newest / oldest first',
    enum: OptimizationSortOption,
    enumName: 'OptimizationSortOption',
    default: OptimizationSortOption.DATE_DESC,
  })
  @IsOptional()
  @IsEnum(OptimizationSortOption)
  sort: OptimizationSortOption = OptimizationSortOption.DATE_DESC;
}