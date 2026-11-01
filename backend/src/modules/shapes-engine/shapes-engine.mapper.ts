import { AnalysisShapesDto } from './dto/analysis-shapes.dto.js';
import { ShapeEngineResponseDto } from './dto/shapes-engine-response.dto.js';

export class ShapeEngineMapper {
  static toAnalysisShapesDto(
    result: ShapeEngineResponseDto,
  ): AnalysisShapesDto {
    return Object.assign(new AnalysisShapesDto(), {
      shapes: result.shapes.map((shape) =>
        shape.map(({ pctX, pctY }) => ({ pctX, pctY })),
      ),
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
    });
  }
}
