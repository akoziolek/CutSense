import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiCreatedResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { CreateOptimizationDto } from './dto/create-optimization.dto.js';
import { OptimizationsService } from './optimizations.service.js';

@Controller('optimizations')
@ApiTags('Optimizations')
export class OptimizationsController {
  constructor(private readonly optimizationsService: OptimizationsService) {}

  @Post()
  @UseGuards(SessionGuard)
  @ApiCookieAuth('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and run a new optimization process' })
  @ApiCreatedResponse({ description: 'Optimization created and executed successfully.' })
  @ApiBadRequestResponse({ description: 'Validation failed or missing required configuration parameters.' })
  async createOptimization(
    @Body() dto: CreateOptimizationDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.optimizationsService.createAndRun(dto, user.id);
  }
}