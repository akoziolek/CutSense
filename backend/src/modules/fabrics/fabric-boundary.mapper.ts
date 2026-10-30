import { AnalysisShapesDto } from './dto/analyze-fabric.dto.js';
import { AnalyzeFabricEngineResponseDto } from './dto/analyze-fabric-engine-response.dto.js';

export class FabricBoundaryMapper {
  static toAnalysisShapesDto(
    result: AnalyzeFabricEngineResponseDto,
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
