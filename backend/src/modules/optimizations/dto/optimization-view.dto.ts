import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { NestingStats } from '../../optimizer-engine/optimizer-engine.types.js';
import { OptimizerFabricInputDto } from './optimizer-input.dto.js';
import type { ViewStats } from '../../optimizer-engine/optimizer-engine.types.js';

export class PlacementDto {
  @ApiProperty({ description: 'Source pattern piece' })
  patternPieceId!: number;

  @ApiProperty()
  isMirrored!: boolean;

  @ApiProperty()
  rotationAngle!: number;

  @ApiProperty()
  isFlipped180!: boolean;

  @ApiProperty({ description: 'Translation in millimeters' })
  x!: number;

  @ApiProperty({ description: 'Translation in millimeters' })
  y!: number;

  @ApiProperty({
    description: 'Final polygon in fabric coordinates (mm), ready to draw. The Y axis points up.',
    type: 'array',
    items: { type: 'array', items: { type: 'number' } },
  })
  polygon!: [number, number][];
}

export class OptimizationViewDto {
  @ApiPropertyOptional({ description: 'Present while the run is cached' })
  runId?: string;

  @ApiPropertyOptional({ description: 'Present once the optimization is saved' })
  id?: number;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty()
  isSaved!: boolean;

  @ApiProperty()
  algorithmName!: string;

  @ApiProperty({ type: OptimizerFabricInputDto })
  fabric!: OptimizerFabricInputDto;

  @ApiProperty()
  seamAllowanceMm!: number;

  @ApiProperty()
  cuttingAllowanceMm!: number;

  @ApiProperty()
  wasSuccessful!: boolean;

  @ApiProperty({ description: 'Used fabric length in millimeters' })
  minLengthMm!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  stats!: ViewStats;

  @ApiProperty({ type: [PlacementDto] })
  placements!: PlacementDto[];
}