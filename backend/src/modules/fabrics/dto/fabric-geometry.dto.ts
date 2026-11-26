import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PointDto } from '../../../common/geometry/point.dto.js';

export class FabricGeometryDto {
  id!: number;
  name!: string;
  createdAt!: string;
  imageWidthMm!: number;
  imageHeightMm!: number;
  grainline!: number;
  @ApiProperty({
    description:
      'Open boundary ring as {x, y} points in millimeters, positive Y upward.',
    type: [PointDto],
  })
  boundary!: PointDto[];
  @ApiPropertyOptional({
    description: 'Presigned URL of the library fabric photo.',
  })
  pictureUrl?: string;
}
