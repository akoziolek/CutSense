import { AnalyzeFabricDto } from './dto/analyze-fabric.dto.js';
import { AnalyzeFabricEngineResponseDto } from './dto/analyze-fabric-engine-response.dto.js';

export class FabricBoundaryMapper {
  static toAnalyzeFabricDto(
    result: AnalyzeFabricEngineResponseDto,
  ): AnalyzeFabricDto {
    return Object.assign(new AnalyzeFabricDto(), {
      points: result.points.map(({ pctX, pctY }) => ({ pctX, pctY })),
      imageWidth: result.imageWidth,
      imageHeight: result.imageHeight,
    });
  }
}
