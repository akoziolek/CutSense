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
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternsService } from './patterns.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';

@Controller('patterns')
@ApiTags('Patterns')
@UseGuards(SessionGuard)
@ApiCookieAuth('session')
export class PatternController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get a pattern by ID',
    description:
      'Returns a pattern owned by the current user, including the names of its tags.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the pattern',
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: 'The pattern was found and returned successfully.',
    type: PatternResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The pattern ID is not a valid integer.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The pattern does not exist or is not owned by the current user.',
  })
  async getPatternById(
    @Param('id', ParseIntPipe) patternId: number,
    @CurrentUser() user: { id: number },
  ): Promise<PatternResponseDto> {
    return this.patternsService.getPatternById(patternId, user.id);
  }
}
