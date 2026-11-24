import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointDto } from '../../../common/geometry/point.dto.js';

export type OptimizerPointDto = PointDto;

export class OptimizerFabricInputDto {
  @ApiPropertyOptional({ description: 'Library fabric ID; omitted for custom dimensions.' })
  fabricId?: number;

  @ApiProperty({ description: 'Fabric width in millimeters.' })
  widthMm!: number;

  @ApiProperty({ description: 'Fabric length in millimeters.' })
  lengthMm!: number;

  @ApiProperty({ description: 'Fabric grainline in degrees.' })
  grainline!: number;

  @ApiProperty({
    description:
      'Open fabric boundary ring as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
    example: [
      { x: 0, y: 0 },
      { x: 1450, y: 0 },
      { x: 1450, y: 2900 },
      { x: 0, y: 2900 },
    ],
  })
  boundary!: OptimizerPointDto[];
}

export class OptimizerPieceInputDto {
  @ApiProperty({ description: 'ID of the source pattern piece.' })
  patternPieceId!: number;

  @ApiProperty({
    description:
      'Open pattern piece boundary ring as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
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
