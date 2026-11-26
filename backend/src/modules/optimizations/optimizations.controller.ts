import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  ParseEnumPipe,
  Res,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import {
  OptionalAuth,
  Public,
} from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { OptimizationsService } from './optimizations.service.js';
import { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import { AlgorithmDto } from './dto/algorithm.dto.js';
import { OptimizationDefaultsDto } from './dto/optimization-defaults.dto.js';
import { OptimizerInputDto } from './dto/optimizer-input.dto.js';
import { OptimizationViewDto } from './dto/optimization-view.dto.js';
import { SaveOptimizationDto } from './dto/save-optimization.dto.js';
import { ListOptimizationsQueryDto } from './dto/list-optimizations-query.dto.js';
import { OptimizationListResponseDto } from './dto/optimization-list.dto.js';
import type { Response } from 'express';
import {
  OptimizationPdfService,
  type OptimizationPdfFormat,
} from './pdf/optimization-pdf.service.js';
import { DefaultValuePipe } from '@nestjs/common';
import { OptimizationFilterOptionsDto } from './dto/optimization-filter-options.dto.js';
import {
  BulkDeleteDto,
  BulkDeleteResponseDto,
} from '../../common/dto/bulk-delete.dto.js';
import { RenameOptimizationDto } from './dto/rename-optimization.dto.js';

enum PdfFormatParam {
  A4 = 'a4',
  ACTUAL = 'actual',
}

enum PdfLangParam {
  PL = 'pl',
  EN = 'en',
}

@Controller('optimizations')
@ApiTags('Optimizations')
export class OptimizationController {
  constructor(
    private readonly optimizationsService: OptimizationsService,
    private readonly optimizationPdfService: OptimizationPdfService,
  ) {}

  @Get('algorithms')
  @Public()
  @ApiOperation({
    summary: 'List available nesting algorithms',
    description:
      'Returns the algorithms that can currently be used to run an optimization.',
  })
  @ApiOkResponse({ type: AlgorithmDto, isArray: true })
  async getAlgorithms(): Promise<AlgorithmDto[]> {
    return this.optimizationsService.getAlgorithms();
  }

  @Get('defaults')
  @Public()
  @ApiOperation({
    summary: 'Get default optimization parameters',
    description:
      'Returns the default seam and cutting allowance, in millimeters.',
  })
  @ApiOkResponse({ type: OptimizationDefaultsDto })
  getDefaults(): OptimizationDefaultsDto {
    return this.optimizationsService.getDefaults();
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
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
    description:
      'The pattern or fabric does not exist or is not accessible to the current user.',
  })
  async prepareOptimization(
    @Body() dto: CreateOptimizationDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<OptimizerInputDto> {
    return this.optimizationsService.prepareOptimization(dto, user?.id);
  }

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @OptionalAuth()
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
    description:
      'The pattern or fabric does not exist or is not accessible to the current user.',
  })
  async run(
    @Body() dto: CreateOptimizationDto,
    @OptionalUser() user?: AuthUser,
  ): Promise<OptimizationViewDto> {
    return this.optimizationsService.run(dto, user?.id);
  }

  @Get('runs/:runId')
  @OptionalAuth()
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Get a run that has not been saved yet (or was just saved)',
  })
  @ApiParam({ name: 'runId', type: String })
  @ApiOkResponse({ type: OptimizationViewDto })
  @ApiNotFoundResponse({
    description: 'The run expired, does not exist or belongs to someone else.',
  })
  getRun(
    @Param('runId', ParseUUIDPipe) runId: string,
    @OptionalUser() user?: AuthUser,
  ): Promise<OptimizationViewDto> {
    return this.optimizationsService.getRun(runId, user?.id);
  }

  @Post('runs/:runId/save')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Save a successful run',
    description:
      'Stores the cached run in the current user’s optimizations. Idempotent.',
  })
  @ApiParam({ name: 'runId', type: String })
  @ApiBody({ type: SaveOptimizationDto })
  @ApiOkResponse({
    schema: { type: 'object', properties: { id: { type: 'number' } } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid name or the run was not successful.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description: 'The run expired, does not exist or belongs to someone else.',
  })
  save(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Body() dto: SaveOptimizationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: number }> {
    return this.optimizationsService.save(runId, dto, user.id);
  }

  @Get()
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'List saved optimizations of the current user',
    description:
      'Supports pagination, sorting by name or date, and a text search in the name.',
  })
  @ApiOkResponse({ type: OptimizationListResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid pagination, sort or search parameters.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  getOptimizations(
    @Query() query: ListOptimizationsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OptimizationListResponseDto> {
    return this.optimizationsService.getOptimizations(query, user.id);
  }

  private async sendPdfResponse(
    view: OptimizationViewDto,
    format: PdfFormatParam,
    lang: PdfLangParam,
    res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.optimizationPdfService.generate(
      view,
      format as OptimizationPdfFormat,
      lang,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get('runs/:runId/pdf')
  @OptionalAuth()
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Download optimization run layout as PDF (A4 or 1:1 actual size)',
  })
  async downloadRunPdf(
    @Param('runId', ParseUUIDPipe) runId: string,
    @Query('format', new ParseEnumPipe(PdfFormatParam)) format: PdfFormatParam,
    @Query(
      'lang',
      new DefaultValuePipe(PdfLangParam.EN),
      new ParseEnumPipe(PdfLangParam),
    )
    lang: PdfLangParam,
    @Res({ passthrough: true }) res: Response,
    @OptionalUser() user?: AuthUser,
  ): Promise<StreamableFile> {
    const view = await this.optimizationsService.getRun(runId, user?.id);
    return this.sendPdfResponse(view, format, lang, res);
  }

  @Get(':id/pdf')
  @ApiCookieAuth('session')
  @ApiOperation({
    summary:
      'Download saved optimization layout as PDF (A4 or 1:1 actual size)',
  })
  async downloadSavedPdf(
    @Param('id', ParseIntPipe) id: number,
    @Query('format', new ParseEnumPipe(PdfFormatParam)) format: PdfFormatParam,
    @Query(
      'lang',
      new DefaultValuePipe(PdfLangParam.EN),
      new ParseEnumPipe(PdfLangParam),
    )
    lang: PdfLangParam,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthUser,
  ): Promise<StreamableFile> {
    const view = await this.optimizationsService.getSaved(id, user.id);
    return this.sendPdfResponse(view, format, lang, res);
  }

  @Get('filter-options')
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Get options for the list filters',
    description:
      "Patterns used in the user's optimizations, the user's fabrics and the available algorithms, each with a count.",
  })
  @ApiOkResponse({ type: OptimizationFilterOptionsDto })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  getFilterOptions(
    @CurrentUser() user: AuthUser,
  ): Promise<OptimizationFilterOptionsDto> {
    return this.optimizationsService.getFilterOptions(user.id);
  }

  // must stay after 'algorithms' and 'defaults'
  @Get(':id')
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Get optimization result by ID for visualization',
    description:
      'Returns complete nested optimization data including algorithm details, fabric dimensions/boundary, pattern metadata, and placed pieces transformed points in millimeters.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Unique identifier of the optimization result',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Optimization result found and returned successfully.',
    type: OptimizationViewDto,
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The optimization does not exist or is not owned by the current user.',
  })
  @ApiBadRequestResponse({
    description: 'The optimization ID is not a valid integer.',
  })
  getSaved(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<OptimizationViewDto> {
    return this.optimizationsService.getSaved(id, user.id);
  }

  @Patch(':id')
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Rename a saved optimization',
    description:
      'Changes only the name of an optimization owned by the current user.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiBody({ type: RenameOptimizationDto })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { id: { type: 'number' }, name: { type: 'string' } },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid optimization name or ID.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The optimization does not exist or is not owned by the current user.',
  })
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenameOptimizationDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: number; name: string }> {
    return this.optimizationsService.rename(id, dto.name, user.id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Delete several optimizations',
    description:
      'Permanently deletes the listed optimizations owned by the current user. IDs that do not exist or belong to someone else are skipped.',
  })
  @ApiBody({ type: BulkDeleteDto })
  @ApiOkResponse({ type: BulkDeleteResponseDto })
  @ApiBadRequestResponse({
    description: 'ids must be 1–100 unique positive integers.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  deleteOptimizations(
    @Body() dto: BulkDeleteDto,
    @CurrentUser() user: AuthUser,
  ): Promise<BulkDeleteResponseDto> {
    return this.optimizationsService.deleteOptimizations(dto.ids, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Delete a saved optimization',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 1,
  })
  @ApiNoContentResponse({
    description: 'The optimization was deleted.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({
    description:
      'The optimization does not exist or is not owned by the current user.',
  })
  delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.optimizationsService.delete(id, user.id);
  }
}
