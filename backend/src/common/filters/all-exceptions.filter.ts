import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes.enum.js';

export interface ErrorResponse {
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ErrorCode.INTERNAL_ERROR;
    let message = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;

        // is an AppException
        if (body.errorCode) {
          errorCode = body.errorCode as string;
          message = (body.message as string) || message;
          details = body.details;
        } // built validation NestJS error
        else if (Array.isArray(body.message)) {
          errorCode = ErrorCode.VALIDATION_ERROR;
          message = 'Validation failed';
          details = body.message;
        } else {
          message = (body.message as string) || exception.message;
          errorCode = this.mapHttpStatusToCode(statusCode);
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        errorCode = this.mapHttpStatusToCode(statusCode);
      }
    }

    if (statusCode >= 500) {
      const internalReason =
        exception instanceof Error ? exception.message : message;

      this.logger.error(
        `[${request.method}] ${request.url} -> ${statusCode} (${errorCode}): ${internalReason}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      // mask from end client
      message =
        statusCode === HttpStatus.SERVICE_UNAVAILABLE ||
        statusCode === HttpStatus.BAD_GATEWAY
          ? 'External service is temporarily unavailable.'
          : 'Internal server error';
      details = undefined;
    }

    const payload: ErrorResponse = {
      statusCode,
      errorCode,
      message,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(payload);
  }

  private mapHttpStatusToCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
      case HttpStatus.PAYLOAD_TOO_LARGE:
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ErrorCode.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.ACCESS_DENIED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
