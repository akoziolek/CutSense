import { Get, Controller, Param, ParseIntPipe } from '@nestjs/common';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { FabricService } from './fabrics.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('fabrics')
// add AUTH GUARD
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Get(':id')
  async getFabricById(
    @Param('id', ParseIntPipe) fabricId: number,
    @CurrentUser() user: { id: number },
  ): Promise<FabricResponseDto> {
    return this.fabricService.getFabricById(fabricId, user.id);
  }
}
