import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  UseGuards,
  Body,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternsService } from './patterns.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { CreatePatternDto } from './dto/create-pattern.dto.js';
import { EditPatternDto } from './dto/edit-pattern.dto.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { OptionalSessionGuard } from '../../auth/guards/optional-session.guard.js';
import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PatternListResponseDto } from './dto/pattern-list.dto.js';
import { ListPatternsQueryDto } from './dto/list-patterns-query.dto.js';
import { FavouriteStateDto } from '../../common/dto/favourite-state.dto.js';
import { SetFavouriteDto } from '../../common/dto/set-favourite.dto.js';

@Controller('patterns')
@ApiTags('Patterns')
export class PatternController {
  constructor(private readonly patternsService: PatternsService) {}

  @Get()
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'List patterns',
    description:
      'Guests get public patterns only. A logged-in user gets public patterns plus their own private ones. Supports pagination (page, limit) and sorting (sort).',
  })
  @ApiOkResponse({
    description: 'A page of patterns was returned successfully.',
    type: PatternListResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'Invalid query parameters: page must be an integer >= 1, limit an integer between 1 and 50, sort one of the allowed values.',
  })
  async getPatterns(
    @Query() query: ListPatternsQueryDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<PatternListResponseDto> {
    return this.patternsService.getPatterns(query, user?.id);
  }

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
  async getPatternTags(): Promise<PatternTagDto[]> {
    return this.patternsService.getPatternTags();
  }

  @Post()
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a pattern',
    description:
      'Creates a pattern with its pieces and tags for the current user.',
  })
  @ApiCreatedResponse({ description: 'Returns the id of the new pattern.' })
  @ApiBadRequestResponse({ description: 'Validation failed or unknown tag' })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required' })
  async createPattern(
    @Body() dto: CreatePatternDto,
    @CurrentUser() user: { id: number },
  ): Promise<{ id: number }> {
    return this.patternsService.createPattern(dto, user.id);
  }

  @Patch(':id/favourite')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Add or remove a pattern from favourites',
    description: 'Sets the favourite flag of a pattern the current user can see (public, or their own). Idempotent.',
  })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: SetFavouriteDto })
  @ApiOkResponse({ type: FavouriteStateDto })
  @ApiBadRequestResponse({ description: 'Invalid ID or body.' })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required.' })
  @ApiNotFoundResponse({ description: 'The pattern does not exist or is private and owned by someone else.' })
  async setFavourite(
    @Param('id', ParseIntPipe) patternId: number,
    @Body() dto: SetFavouriteDto,
    @CurrentUser() user: { id: number },
  ): Promise<FavouriteStateDto> {
    return this.patternsService.setFavourite(patternId, dto.isFavourite, user.id);
  }

  @Patch(':id')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
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
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Get a pattern by ID',
    description:
      'Returns a pattern with its tags, author and pieces. Public patterns are visible to everyone; a private pattern only to its owner.',
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
  @ApiNotFoundResponse({
    description:
      'The pattern does not exist, or it is private and does not belong to the current user.',
  })
  async getPatternById(
    @Param('id', ParseIntPipe) patternId: number,
    @OptionalUser() user?: AuthUser,
  ): Promise<PatternResponseDto> {
    return this.patternsService.getPatternById(patternId, user?.id ?? null);
  }
}