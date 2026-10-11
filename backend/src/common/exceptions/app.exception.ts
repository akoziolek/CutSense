import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';

export class AppException extends HttpException {
  constructor(
    errorCode: ErrorCode,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown> | unknown[],
  ) {
    super({ errorCode, message, details }, status);
  }
}
