import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  UseGuards,
  Body,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
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
  ApiCreatedResponse,
  ApiBadGatewayResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { PatternResponseDto } from './dto/pattern-response.dto.js';
import { PatternsService } from './patterns.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { CreatePatternDto } from './dto/create-pattern.dto.js';
import { OptionalSessionGuard } from '../../auth/guards/optional-session.guard.js';
import { OptionalUser } from '../../common/decorators/optional-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PatternTagDto } from './dto/pattern-tag.dto.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalysisShapesDto } from '../shapes-engine/dto/analysis-shapes.dto.js';

@Controller('patterns')
@ApiTags('Patterns')
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

  @Post('analyze-boundary')
  @UseInterceptors(
    FileInterceptor('picture', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['picture'],
      properties: {
        picture: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Detect the pattern boundary in a photo',
    description:
      'Analyzes the uploaded photo and returns normalized detected shapes and the original image dimensions.',
  })
  @ApiOkResponse({
    description: 'The detected pattern shape was returned.',
    type: AnalysisShapesDto,
  })
  @ApiBadRequestResponse({
    description: 'The uploaded image could not be analyzed.',
  })
  @ApiBadGatewayResponse({
    description:
      'The shape analysis service is unavailable or returned invalid data.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  async analyzeFabricBoundary(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    picture: Express.Multer.File,
  ): Promise<AnalysisShapesDto> {
    return this.patternsService.analyzePatternBoundary(picture);
  }

  @Get(':id')
  @UseGuards(OptionalSessionGuard)
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
    @OptionalUser() user?: AuthUser,
  ): Promise<PatternResponseDto> {
    return this.patternsService.getPatternById(patternId, user?.id ?? null);
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
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required',
  })
  async createPattern(
    @Body() dto: CreatePatternDto,
    @CurrentUser() user: { id: number },
  ): Promise<{ id: number }> {
    return this.patternsService.createPattern(dto, user.id);
  }
}
