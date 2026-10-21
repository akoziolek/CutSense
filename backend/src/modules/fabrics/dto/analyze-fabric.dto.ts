import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AnalyzeFabricPointDto {
  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  pctX!: number;

  @ApiProperty({ example: 20, minimum: 0, maximum: 100 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(100)
  pctY!: number;
}

export class AnalyzeFabricDto {
  @ApiProperty({
    type: [AnalyzeFabricPointDto],
    description: 'Normalized points describing the detected fabric boundary.',
  })
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => AnalyzeFabricPointDto)
  points!: AnalyzeFabricPointDto[];

  @ApiProperty({ example: 800, minimum: 1 })
  @IsInt()
  @IsPositive()
  imageWidth!: number;

  @ApiProperty({ example: 600, minimum: 1 })
  @IsInt()
  @IsPositive()
  imageHeight!: number;
}
