import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsPositive } from 'class-validator';
import { AnalysisPointDto } from './analysis-point.dto.js';

export class AnalysisShapesDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pctX: { type: 'number', minimum: 0, maximum: 100 },
          pctY: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
    },
    description:
      'Normalized points for each detected boundary. Fabric analysis currently returns one shape.',
  })
  @IsArray()
  @ArrayMinSize(1)
  shapes!: AnalysisPointDto[][];

  @ApiProperty({ example: 800, minimum: 1 })
  @IsInt()
  @IsPositive()
  imageWidth!: number;

  @ApiProperty({ example: 600, minimum: 1 })
  @IsInt()
  @IsPositive()
  imageHeight!: number;
}
