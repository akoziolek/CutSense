import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { patternSizeEnum } from '../../../db/schema/schema.js';
import { FilterableListQueryDto } from '../../../common/dto/base-list-query.dto.js';

export type PatternSize = (typeof patternSizeEnum.enumValues)[number];

export enum PatternSortOption {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  DATE_DESC = 'date_desc',
  DATE_ASC = 'date_asc',
}

export class ListPatternsQueryDto extends FilterableListQueryDto {
  @ApiPropertyOptional({
    description: 'Sort order: name A-Z / Z-A, newest / oldest first',
    enum: PatternSortOption, enumName: 'PatternSortOption', default: PatternSortOption.NAME_ASC,
  })
  @IsOptional() @IsEnum(PatternSortOption)
  sort: PatternSortOption = PatternSortOption.NAME_ASC;

  @ApiPropertyOptional({
    description: 'Only these sizes. Comma-separated (S,M) or repeated (sizes=S&sizes=M).',
    enum: patternSizeEnum.enumValues, isArray: true, example: 'S,M',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return value;
    const raw: unknown[] = Array.isArray(value) ? value : String(value).split(',');
    return [...new Set(raw.map(String))];
  })
  @IsArray() @ArrayMaxSize(6) @IsIn(patternSizeEnum.enumValues, { each: true })
  sizes?: PatternSize[];
}