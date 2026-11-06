import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiTags,
} from '@nestjs/swagger';
import { OptionalSessionGuard } from '../../auth/guards/optional-session.guard.js';
import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { OptimizationsService } from './optimizations.service.js';
import { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import { AlgorithmDto } from './dto/algorithm.dto.js';
import { OptimizationDefaultsDto } from './dto/optimization-defaults.dto.js';
import { OptimizerInputDto } from './dto/optimizer-input.dto.js';

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
}
