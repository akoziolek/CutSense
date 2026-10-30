import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class AnalysisPointDto {
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
  @ArrayMaxSize(1)
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
