import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { LocalizedText } from '../../../db/schema/schema.js';
import { OptimizerFabricInputDto } from './optimizer-input.dto.js';
import type { ViewStats } from '../../optimizer-engine/optimizer-engine.types.js';
import { PointDto } from '../../../common/geometry/point.dto.js';

export interface PatternSummaryDto {
  id: number;
  name: string;
  size: string;
  createdAt: string;
}

export interface FabricMetadataDto {
  name: string;
  createdAt: string;
}

export class OptimizationFabricViewDto extends OptimizerFabricInputDto {
  @ApiPropertyOptional({ description: 'Name of the library fabric.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Date the library fabric was added.' })
  createdAt?: string;
}

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
    description:
      'Open final polygon in fabric coordinates as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
  })
  polygon!: PointDto[];
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
  algorithmName!: LocalizedText;

  @ApiProperty({ type: OptimizationFabricViewDto })
  fabric!: OptimizationFabricViewDto;

  @ApiPropertyOptional({
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      size: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
    },
  })
  pattern?: PatternSummaryDto;

  @ApiProperty()
  seamAllowanceMm!: number;

  @ApiProperty()
  cuttingAllowanceMm!: number;

  @ApiProperty()
  wasSuccessful!: boolean;

  @ApiProperty({ description: 'Used fabric length in millimeters' })
  minLengthMm!: number;

  @ApiProperty({ description: 'Optimizer execution time in milliseconds' })
  executionTime!: number;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
  stats!: ViewStats;

  @ApiProperty({ type: [PlacementDto] })
  placements!: PlacementDto[];
}