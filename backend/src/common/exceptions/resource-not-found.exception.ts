import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from '../constants/error-codes.enum.js';

export class ResourceNotFoundException extends AppException {
  constructor(resource: string, id: number | string) {
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      `${resource} with ID ${id} not found`,
      HttpStatus.NOT_FOUND,
      { resource, id },
    );
  }
}
