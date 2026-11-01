import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

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
