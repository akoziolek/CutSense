import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
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
import { EditPatternDto } from './dto/edit-pattern.dto.js';

@Controller('patterns')
@ApiTags('Patterns')
@UseGuards(SessionGuard)
@ApiCookieAuth('session')
export class PatternController {
  constructor(private readonly patternsService: PatternsService) {}

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing pattern',
    description:
      'Updates the supplied pattern fields and optionally replaces its tags. The pattern must belong to the current user.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the pattern',
    type: Number,
    example: 1,
  })
  @ApiBody({ type: EditPatternDto })
  @ApiOkResponse({
    description: 'The pattern has been successfully updated.',
    type: PatternResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload or pattern ID.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The pattern does not exist or is not owned by the current user.',
  })
  async editPattern(
    @Param('id', ParseIntPipe) patternId: number,
    @Body() editPatternDto: EditPatternDto,
    @CurrentUser() user: { id: number },
  ): Promise<PatternResponseDto> {
    return this.patternsService.updatePattern(
      patternId,
      editPatternDto,
      user.id,
    );
  }

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
