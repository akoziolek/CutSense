import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.session as string | undefined;
    if (!token) return true;
    try {
      const payload = this.jwt.verify<{ sub: string; purpose: string }>(token);
      if (payload.purpose === 'session') {
        req.user = { id: Number(payload.sub) } as Express.User;
      }
    } catch {
      // invalid or expired session is treated as a guest
    }
    return true;
  }
}