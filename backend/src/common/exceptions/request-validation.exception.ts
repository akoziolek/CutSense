import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';
import { AppException } from './app.exception.js';

export class RequestValidationException extends AppException {
  constructor(message: string) {
    super(ErrorCode.VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST);
  }
}
