import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsEnum
} from 'class-validator';
import { PatternVisibility, PatternSize } from './pattern.enum.js';

const COORD_LIMIT = 10_000_000; // mm

// TODO use TransformJson decorator!!!

export class PointDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORD_LIMIT)
  @Max(COORD_LIMIT)
  x!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-COORD_LIMIT)
  @Max(COORD_LIMIT)
  y!: number;
}

export class PieceInputDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];

  @IsInt()
  @Min(0)
  @Max(359)
  grainline!: number;

  @IsInt()
  @Min(0)
  @Max(99)
  normal!: number;

  @IsInt()
  @Min(0)
  @Max(99)
  mirrored!: number;
}

export class CreatePatternDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Pattern name is required' })
  @MaxLength(35, { message: 'Pattern name can have at most 35 characters' })
  name!: string;

  @IsEnum(PatternSize, {
    message: 'Visibility must be a valid visibility enum value',
  })
  size!: PatternSize;

  @IsOptional()
  @IsString()
  @MaxLength(400, { message: 'Description can have at most 400 characters' })
  description?: string;

  @IsEnum(PatternVisibility, {
    message: 'Visibility must be a valid visibility enum value',
  })
  visibility!: PatternVisibility;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags!: string[];

  @IsArray()
  @ArrayMinSize(1, { message: 'A pattern needs at least one piece' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PieceInputDto)
  pieces!: PieceInputDto[];
}
