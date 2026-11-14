import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type OptimizerPointDto = [number, number];

export class OptimizerFabricInputDto {
  @ApiPropertyOptional({ description: 'Library fabric ID; omitted for custom dimensions.' })
  fabricId?: number;

  @ApiProperty({ description: 'Fabric width in millimeters.' })
  widthMm!: number;

  @ApiProperty({ description: 'Fabric length in millimeters.' })
  lengthMm!: number;

  @ApiProperty({
    description: 'Fabric boundary points in millimeters, without a repeated closing point.',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
    example: [
      [0, 0],
      [1450, 0],
      [1450, 2900],
      [0, 2900],
    ],
  })
  boundary!: OptimizerPointDto[];
}

export class OptimizerPieceInputDto {
  @ApiProperty({ description: 'ID of the source pattern piece.' })
  patternPieceId!: number;

  @ApiProperty({
    description: 'Pattern piece boundary points, without a repeated closing point.',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  boundary!: OptimizerPointDto[];

  @ApiProperty({ description: 'Number of normal copies.' })
  normalCount!: number;

  @ApiProperty({ description: 'Number of mirrored copies.' })
  mirroredCount!: number;

  @ApiProperty({
    description:
      'Grainline of the pattern piece in degrees, clockwise from vertical, in the piece boundary coordinates.',
  })
  grainline!: number;

  @ApiProperty({ description: 'Allowed direction in degrees.' })
  direction!: number;

  @ApiProperty({ description: 'Whether the piece may also be turned by 180 degrees.' })
  twoWay!: boolean;
}

export class OptimizerInputDto {
  @ApiProperty({ description: 'Source pattern ID.' })
  patternId!: number;

  @ApiProperty({ description: 'Selected algorithm ID.' })
  algorithmId!: number;

  @ApiProperty({ description: 'Selected algorithm name.' })
  algorithmName!: string;

  @ApiProperty({ type: OptimizerFabricInputDto })
  fabric!: OptimizerFabricInputDto;

  @ApiProperty({ description: 'Seam allowance in millimeters.' })
  seamAllowanceMm!: number;

  @ApiProperty({ description: 'Cutting allowance in millimeters.' })
  cuttingAllowanceMm!: number;

  @ApiProperty({ type: [OptimizerPieceInputDto] })
  pieces!: OptimizerPieceInputDto[];
}
