import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';
import { AnalysisPointDto } from './analyze-fabric.dto.js';

export class AnalyzeFabricEngineResponseDto {
  @IsArray()
  @ArrayMinSize(1)
  shapes!: AnalysisPointDto[][];

  @IsInt()
  @IsPositive()
  imageWidth!: number;

  @IsInt()
  @IsPositive()
  imageHeight!: number;
}
