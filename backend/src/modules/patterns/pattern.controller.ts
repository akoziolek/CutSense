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
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { FavouriteStateDto } from '../../common/dto/favourite-state.dto.js';
import { SetFavouriteDto } from '../../common/dto/set-favourite.dto.js';

@Controller('patterns')
@ApiTags('Patterns')
@UseGuards(SessionGuard)
@ApiCookieAuth('session')
export class PatternController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get('tags')
  @ApiOperation({
    summary: 'Get available pattern tags',
    description:
      'Returns the IDs and names of all tags available for patterns.',
  })
  @ApiOkResponse({
    description: 'The available pattern tags were returned successfully.',
    type: PatternTagDto,
    isArray: true,
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  async getFabricTags(): Promise<PatternTagDto[]> {
    return this.patternsService.getPatternTags();
  }

  @Patch(':id/favourite')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Add or remove a pattern from favourites',
    description:
      'Sets the favourite flag of a pattern the current user can see (public, or their own). Idempotent.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: SetFavouriteDto })
  @ApiOkResponse({ type: FavouriteStateDto })
  @ApiBadRequestResponse({ description: 'Invalid ID or body.' })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required.' })
  @ApiNotFoundResponse({
    description: 'The pattern does not exist, or it is private and owned by someone else.',
  })
  async setFavourite(
    @Param('id', ParseIntPipe) patternId: number,
    @Body() dto: SetFavouriteDto,
    @CurrentUser() user: { id: number },
  ): Promise<FavouriteStateDto> {
    return this.patternsService.setFavourite(patternId, dto.isFavourite, user.id);
  }

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
