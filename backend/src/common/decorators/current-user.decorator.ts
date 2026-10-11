import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthUser {
  id: number;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const user = req.user as AuthUser | undefined;

    if (!user) throw new UnauthorizedException();
    return user;
  },
);