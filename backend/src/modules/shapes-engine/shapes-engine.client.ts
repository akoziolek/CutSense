import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ExternalServiceException } from '../../common/exceptions/external-service.exception.js';
import { RequestValidationException } from '../../common/exceptions/request-validation.exception.js';

@Injectable()
export class ShapesEngineClient {
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService
      .get<string>('SHAPES_ENGINE_URL', 'http://localhost:8000')
      .replace(/\/$/, '');
  }

  async analyzeBoundary<T extends object>(
    endpoint: string,
    picture: Express.Multer.File,
    dtoClass: ClassConstructor<T>,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': picture.mimetype },
      body: new Uint8Array(picture.buffer),
      signal: AbortSignal.timeout(30_000),
    }).catch((error) => {
      throw new ExternalServiceException(
        error instanceof Error
          ? `Shape analysis service is unavailable: ${error.message}`
          : 'Shape analysis service is unavailable.',
      );
    });

    const payload = await response.json().catch(() => {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid response.',
      );
    });

    if (!response.ok) {
      const detail =
        typeof payload?.detail === 'string'
          ? payload.detail
          : 'Shape analysis failed.';
      if (response.status >= 400 && response.status < 500) {
        throw new RequestValidationException(detail);
      }
      throw new ExternalServiceException(detail);
    }

    const instance = plainToInstance(dtoClass, payload);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new ExternalServiceException(
        'Shape analysis returned an invalid boundary.',
      );
    }

    return instance;
  }
}
