import {
  Get,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBadGatewayResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiConsumes,
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
import { CreateFabricDto } from './dto/create-fabric.dto.js';
import { AnalyzeFabricDto } from './dto/analyze-fabric.dto.js';
import { EditFabricDto } from './dto/edit-fabric.dto.js';

@Controller('fabrics')
@ApiTags('Fabrics')
@UseGuards(SessionGuard)
@ApiCookieAuth('session')
export class FabricController {
  constructor(private readonly fabricService: FabricService) {}

  @Get('tags')
  @ApiOperation({
    summary: 'Get available fabric tags',
    description: 'Returns the IDs and names of all tags available for fabrics.',
  })
  @ApiOkResponse({
    description: 'The available fabric tags were returned successfully.',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'cotton' },
        },
        required: ['id', 'name'],
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  async getFabricTags(): Promise<{ id: number; name: string }[]> {
    return this.fabricService.getFabricTags();
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
    summary: 'Detect the fabric boundary in a photo',
    description:
      'Analyzes the uploaded photo and returns a normalized boundary and the original image dimensions.',
  })
  @ApiOkResponse({
    description: 'The fabric boundary was detected.',
    type: AnalyzeFabricDto,
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
  ): Promise<AnalyzeFabricDto> {
    return this.fabricService.analyzeFabricBoundary(picture);
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('picture', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'picture', 'boundary'],
      properties: {
        name: { type: 'string', maxLength: 35, example: 'Cotton canvas' },
        description: { type: 'string', maxLength: 400 },
        tagIds: {
          type: 'string',
          description: 'JSON-encoded array of fabric tag IDs.',
          example: '[1,2]',
        },
        boundary: {
          type: 'string',
          description: 'JSON-encoded array of { x, y } points.',
          example:
            '[{"x":-250,"y":125},{"x":250,"y":125},{"x":250,"y":625},{"x":-250,"y":625}]',
        },
        picture: {
          type: 'string',
          format: 'binary',
          description: 'Fabric photo (PNG, JPG, or WEBP; maximum 5 MB).',
        },
      },
    },
  })
  @ApiOperation({
    summary: 'Add a fabric',
    description:
      'Uploads a fabric photo to the current user’s S3 folder and creates a fabric using image-relative boundary points.',
  })
  @ApiCreatedResponse({
    description: 'The fabric was created successfully.',
    type: FabricResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'The fabric details or boundary are invalid.',
  })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  async createFabric(
    @Body() createFabricDto: CreateFabricDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    picture: Express.Multer.File,
    @CurrentUser() user: { id: number },
  ): Promise<FabricResponseDto> {
    return this.fabricService.createFabric(createFabricDto, picture, user.id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update an existing fabric',
    description:
      'Updates the supplied fabric fields and optionally replaces its tags. The fabric must belong to the current user.',
  })
  @ApiBody({ type: EditFabricDto })
  @ApiOkResponse({
    description: 'The fabric has been successfully updated.',
    type: FabricResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Fabric not found.' })
  @ApiBadRequestResponse({ description: 'Invalid payload or ID parameter.' })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  async editFabric(
    @Param('id', ParseIntPipe) fabricId: number,
    @Body() editFabricDto: EditFabricDto,
    @CurrentUser() user: { id: number },
  ): Promise<FabricResponseDto> {
    return this.fabricService.updateFabric(fabricId, editFabricDto, user.id);
  }

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
