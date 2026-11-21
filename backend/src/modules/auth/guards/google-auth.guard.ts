import {Injectable, Logger} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';
import type { ExecutionContext } from '@nestjs/common';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    private readonly logger = new Logger(GoogleAuthGuard.name);

    getAuthenticateOptions(_context: ExecutionContext) {
        return { prompt: 'select_account' };
    }

    // the controller redirects with an error failed/cancelled auth; 
    handleRequest<T>(err: unknown, user: T): T | null {
        if (err) this.logger.warn(`Google auth failed: ${String(err)}`);
            return user || null;
        }
}