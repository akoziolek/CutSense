import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { AnalyzeFabricPointDto } from './analyze-fabric.dto.js';

export class AnalyzeFabricEngineResponseDto {
  @IsArray()
  @ArrayMinSize(3)
  @ValidateNested({ each: true })
  @Type(() => AnalyzeFabricPointDto)
  points!: AnalyzeFabricPointDto[];

  @IsInt()
  @IsPositive()
  imageWidth!: number;

  @IsInt()
  @IsPositive()
  imageHeight!: number;
}
