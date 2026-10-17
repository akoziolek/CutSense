import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception.js';
import { ErrorCode } from '../constants/error-codes.enum.js';

export class AccessDeniedException extends AppException {
  constructor(message = 'You do not have permission to access this resource') {
    super(ErrorCode.ACCESS_DENIED, message, HttpStatus.FORBIDDEN);
  }
}
