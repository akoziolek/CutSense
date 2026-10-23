import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum PatternSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
}

export class ListPatternsQueryDto {
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
    description: 'Number of patterns per page',
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

  @ApiPropertyOptional({
    description: 'Sort order: name A-Z / Z-A, newest / oldest first',
    enum: PatternSortOption,
    enumName: 'PatternSortOption',
    default: PatternSortOption.NAME_ASC,
  })
  @IsOptional()
  @IsEnum(PatternSortOption)
  sort: PatternSortOption = PatternSortOption.NAME_ASC;
}