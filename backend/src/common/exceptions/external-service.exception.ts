import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';
import { AppException } from './app.exception.js';

export class ExternalServiceException extends AppException {
  constructor(message: string) {
    super(
      ErrorCode.UPSTREAM_SERVICE_ERROR,
      message,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
