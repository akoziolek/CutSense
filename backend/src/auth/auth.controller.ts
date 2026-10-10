import {Controller, Get, Req, Res, UseGuards} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { GoogleAuthGuard } from './google-auth.guard.js';
import { GoogleProfile } from './google.strategy.js';

@Controller('auth')
export class AuthController {
    constructor(private readonly config: ConfigService) {}

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    googleLogin() {}

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    googleCallback(@Req() req: Request, @Res() res: Response) {
        const profile = req.user as GoogleProfile | null;
        if(!profile) {
            const front = this.config.getOrThrow<string>('FRONTEND_URL');
            return res.redirect(`${front}/login?error=google_auth_failed`);
        }

        return res.json(profile);
    }
}