import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsOptional,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointDto } from '../../../common/geometry/point.dto.js';
import {
  TransformJson,
  TransformJsonToInstance,
} from '../../../common/decorators/transform-json.decorator.js';

export class CreateFabricDto {
  @ApiProperty({ example: 'Cotton canvas', maxLength: 35 })
  @IsString()
  @MinLength(1)
  @MaxLength(35)
  name!: string;

  @ApiProperty({
    description:
      'JSON-encoded open boundary ring of {x, y} points in millimeters, with Y positive upward. Provide at least three points; the ring is closed when stored.',
    type: String,
    example:
      '[{"x":-2500,"y":1250},{"x":2500,"y":1250},{"x":2500,"y":6250},{"x":-2500,"y":6250}]',
  })
  @TransformJsonToInstance(PointDto)
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => PointDto)
  boundary!: PointDto[];

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

  @ApiProperty({
    description: 'Image width in calibrated millimeters.',
    example: 600,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageWidthMm!: number;

  @ApiProperty({
    description: 'Image height in calibrated millimeters.',
    example: 400,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  imageHeightMm!: number;

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
  @TransformJson()
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  tagIds?: number[];
}

export class CreateFabricUploadDto extends CreateFabricDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Fabric photo (PNG, JPG, or WEBP; maximum 5 MB).',
  })
  picture!: Express.Multer.File;
}