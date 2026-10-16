import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes.enum.js';
import { AppException } from './app.exception.js';

export class AuthenticationRequiredException extends AppException {
  constructor(message = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED);
  }
}