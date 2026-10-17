import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from '../constants/error-codes.enum.js';

export class StorageOperationFailedException extends AppException {
  constructor(operation: 'upload' | 'delete' | 'read', details?: unknown) {
    super(
      ErrorCode.INTERNAL_ERROR,
      `Failed to ${operation} file in storage`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      { operation, details },
    );
  }
}
