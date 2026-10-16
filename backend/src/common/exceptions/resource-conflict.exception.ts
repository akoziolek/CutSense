import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';
import { AppException } from './app.exception.js';

export class ResourceConflictException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(ErrorCode.CONFLICT, message, HttpStatus.CONFLICT, details);
  }
}