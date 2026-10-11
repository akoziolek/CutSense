import { CanActivate, ExecutionContext, Injectable, UnauthorizedException} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies?.session as string | undefined;
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify<{ sub: string; purpose: string }>(token);
      if (payload.purpose !== 'session') throw new Error('wrong token type');
      req.user = { id: Number(payload.sub) } as Express.User;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}