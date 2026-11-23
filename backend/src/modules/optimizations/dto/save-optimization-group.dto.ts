import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsString, IsUUID, MaxLength, MinLength,
} from 'class-validator';
import { MAX_FABRICS } from '../optimizations.constants.js';

export class SaveOptimizationGroupDto {
  @ApiProperty({ type: [String], description: 'Runs to save together, one per fabric' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_FABRICS)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  runIds!: string[];

  @ApiProperty({ example: 'Summer shirt on linen', maxLength: 35 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(35)
  name!: string;
}