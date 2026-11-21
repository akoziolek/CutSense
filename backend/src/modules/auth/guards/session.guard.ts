import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import {
  AUTH_TYPE_KEY,
  type AuthType,
} from '../../../common/decorators/auth.decorator.js';
import { AuthenticationRequiredException } from '../../../common/exceptions/authentication-required.exception.js';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const authType =
      this.reflector.getAllAndOverride<AuthType>(AUTH_TYPE_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? 'required';
    if (authType === 'public') return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.session as string | undefined;
    if (!token) {
      if (authType === 'optional') return true;
      throw new AuthenticationRequiredException();
    }

    try {
      const payload = this.jwt.verify<{ sub: string; purpose: string }>(token);
      if (payload.purpose !== 'session') throw new Error('wrong token type');
      req.user = { id: Number(payload.sub) } as Express.User;
      return true;
    } catch {
      if (authType === 'optional') return true;
      throw new AuthenticationRequiredException();
    }
  }
}
