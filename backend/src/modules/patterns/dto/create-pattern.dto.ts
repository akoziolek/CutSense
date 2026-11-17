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
  IsEnum,
  IsPositive,
} from 'class-validator';
import { PatternVisibility, PatternSize } from './pattern.enum.js';
import {
  TransformJson,
  TransformJsonToInstance,
} from '../../../common/decorators/transform-json.decorator.js';
import { ApiProperty } from '@nestjs/swagger';

const COORD_LIMIT = 10_000_000; // mm

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
  @IsInt()
  @Min(0)
  @Max(19)
  imageIndex!: number;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  points!: PointDto[];

  @ApiProperty({
    description: 'Grainline angle in degrees [0, 359]',
    example: 90,
    minimum: 0,
    maximum: 359,
  })
  @Transform(({ value }) => {
    const num = Number(value);
    if (isNaN(num)) return value;
    return ((Math.round(num) % 360) + 360) % 360;
  })
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

export class PatternImageInputDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageWidthMm!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageHeightMm!: number;
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
  @TransformJson()
  @IsString({ each: true })
  @MaxLength(20, { each: true })
  tags!: string[];

  @TransformJsonToInstance(PatternImageInputDto)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PatternImageInputDto)
  images!: PatternImageInputDto[];

  @TransformJsonToInstance(PieceInputDto)
  @IsArray()
  @ArrayMinSize(1, { message: 'A pattern needs at least one piece' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PieceInputDto)
  pieces!: PieceInputDto[];
}

export class CreatePatternUploadDto extends CreatePatternDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Pattern photos (PNG, JPG, or WEBP; maximum 5 MB per file).',
  })
  pictures!: Express.Multer.File[];
}