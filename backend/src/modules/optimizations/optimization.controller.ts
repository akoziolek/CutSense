import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OptionalSessionGuard } from '../../auth/guards/optional-session.guard.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { OptimizationsService } from './optimizations.service.js';
import { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import { AlgorithmDto } from './dto/algorithm.dto.js';
import { OptimizationDefaultsDto } from './dto/optimization-defaults.dto.js';
import { OptimizerInputDto } from './dto/optimizer-input.dto.js';
import { OptimizationViewDto } from './dto/optimization-view.dto.js';
import { SaveOptimizationDto } from './dto/save-optimization.dto.js';
import { Query /* , ...existing */ } from '@nestjs/common';
import { ListOptimizationsQueryDto } from './dto/list-optimizations-query.dto.js';
import { OptimizationListResponseDto } from './dto/optimization-list.dto.js';

@Controller('optimizations')
@ApiTags('Optimizations')
export class OptimizationController {
  constructor(private readonly optimizationsService: OptimizationsService) {}

  @Get('algorithms')
  @ApiOperation({
    summary: 'List available nesting algorithms',
    description: 'Returns the algorithms that can currently be used to run an optimization.',
  })
  @ApiOkResponse({ type: AlgorithmDto, isArray: true })
  async getAlgorithms(): Promise<AlgorithmDto[]> {
    return this.optimizationsService.getAlgorithms();
  }

  @Get('defaults')
  @ApiOperation({
    summary: 'Get default optimization parameters',
    description: 'Returns the default seam and cutting allowance, in millimeters.',
  })
  @ApiOkResponse({ type: OptimizationDefaultsDto })
  getDefaults(): OptimizationDefaultsDto {
    return this.optimizationsService.getDefaults();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Prepare an optimization configuration',
    description:
      'Validates the configuration and returns pattern/fabric geometry with settings ready for the optimizer. This endpoint does not run or save an optimization.',
  })
  @ApiBody({ type: CreateOptimizationDto })
  @ApiOkResponse({ type: OptimizerInputDto })
  @ApiBadRequestResponse({
    description:
      'Invalid configuration, unavailable algorithm, pieces outside the pattern, or a guest attempting to use a library fabric.',
  })
  @ApiNotFoundResponse({
    description: 'The pattern or fabric does not exist or is not accessible to the current user.',
  })
  async prepareOptimization(
    @Body() dto: CreateOptimizationDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<OptimizerInputDto> {
    return this.optimizationsService.prepareOptimization(dto, user?.id);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Run an optimization',
    description:
      'Prepares the configuration, runs the nesting engine and returns the layout. The run is kept for one hour and can be saved by a logged-in user.',
  })
  @ApiBody({ type: CreateOptimizationDto })
  @ApiOkResponse({ type: OptimizationViewDto })
  @ApiBadRequestResponse({ description: 'Invalid configuration.' })
  @ApiNotFoundResponse({
    description: 'The pattern or fabric does not exist or is not accessible to the current user.',
  })
  async run(
    @Body() dto: CreateOptimizationDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<OptimizationViewDto> {
    return this.optimizationsService.run(dto, user?.id);
  }

  @Get('runs/:runId')
  @UseGuards(OptionalSessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Get a run that has not been saved yet (or was just saved)' })
  @ApiParam({ name: 'runId', type: String })
  @ApiOkResponse({ type: OptimizationViewDto })
  @ApiNotFoundResponse({ description: 'The run expired, does not exist or belongs to someone else.' })
  getRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @OptionalUser() user?: AuthUser,
  ): OptimizationViewDto {
    return this.optimizationsService.getRun(runId, user?.id);
  }

  @Post('runs/:runId/save')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Save a successful run',
    description: 'Stores the cached run in the current user’s optimizations. Idempotent.',
  })
  @ApiParam({ name: 'runId', type: String })
  @ApiBody({ type: SaveOptimizationDto })
  @ApiOkResponse({ schema: { type: 'object', properties: { id: { type: 'number' } } } })
  @ApiBadRequestResponse({ description: 'Invalid name or the run was not successful.' })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required.' })
  @ApiNotFoundResponse({ description: 'The run expired, does not exist or belongs to someone else.' })
  save(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: SaveOptimizationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: number }> {
    return this.optimizationsService.save(runId, dto, user.id);
  }



  @Get()
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'List saved optimizations of the current user',
    description: 'Supports pagination, sorting by name or date, and a text search in the name.',
  })
  @ApiOkResponse({ type: OptimizationListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid pagination, sort or search parameters.' })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required.' })
  getOptimizations(
    @Query() query: ListOptimizationsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OptimizationListResponseDto> {
    return this.optimizationsService.getOptimizations(query, user.id);
  }

  // must stay after 'algorithms' and 'defaults'
  @Get(':id')
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @ApiOperation({ summary: 'Get a saved optimization' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OptimizationViewDto })
  @ApiUnauthorizedResponse({ description: 'A valid session cookie is required.' })
  @ApiNotFoundResponse({ description: 'The optimization does not exist or is not owned by the current user.' })
  getSaved(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<OptimizationViewDto> {
    return this.optimizationsService.getSaved(id, user.id);
  }
}