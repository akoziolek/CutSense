import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { FabricResponseDto } from './dto/fabric-response.dto.js';
import { FabricService } from './fabrics.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';

@Controller('fabrics')
@ApiTags('Fabrics')
@UseGuards(SessionGuard)
@ApiCookieAuth('session')
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a fabric by ID',
    description:
      'Returns a fabric owned by the current user, including the names of its tags.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the fabric',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'The fabric was found and returned successfully.',
    type: FabricResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The fabric ID is not a valid integer.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The fabric does not exist or is not owned by the current user.',
  })
  async getFabricById(
    @Param('id', ParseIntPipe) fabricId: number,
    @CurrentUser() user: { id: number },
  ): Promise<FabricResponseDto> {
    return this.fabricService.getFabricById(fabricId, user.id);
  }
}
