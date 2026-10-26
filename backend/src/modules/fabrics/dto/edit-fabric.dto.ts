import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  MinLength,
  IsPositive,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class EditFabricDto {
  @ApiPropertyOptional({ example: 'Cotton canvas', maxLength: 35 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(35)
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the fabric',
    example: 'Durable cotton',
    maxLength: 400,
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @ApiPropertyOptional({
    description: 'JSON-encoded IDs of selected fabric tags.',
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
}
