import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnalysisPointDto } from './analysis-point.dto.js';

export class ShapeEngineResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AnalysisPointDto)
  shapes!: AnalysisPointDto[][];

  @IsInt()
  @IsPositive()
  imageWidth!: number;

  @IsInt()
  @IsPositive()
  imageHeight!: number;
}
