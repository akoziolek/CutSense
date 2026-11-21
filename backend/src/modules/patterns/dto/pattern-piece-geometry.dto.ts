import { ApiProperty } from '@nestjs/swagger';
import { PointDto } from '../../../common/geometry/point.dto.js';

export class PatternPieceGeometryDto {
  id!: number;
  @ApiProperty({
    description: 'Open boundary ring as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
  })
  boundary!: PointDto[];
  grainline!: number;
}
