import {Body, Controller, Get, Post, Req, Res, UseGuards} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { GoogleAuthGuard } from './google-auth.guard.js';
import { GoogleProfile } from './google.strategy.js';
import { SessionGuard } from './session.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { RegisterDto } from './dto/register.dto.js';

const SESSION_MAX_AGE = 7 * 24 * 3600 * 1000;
const REGISTRATION_MAX_AGE = 15 * 60 * 1000;

const cookieOpts = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge,
});

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService, private readonly config: ConfigService) {}

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    googleLogin() {}

    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    async googleCallback(@Req() req: Request, @Res() res: Response) {
        const front = this.config.getOrThrow<string>('FRONTEND_URL');
        const profile = req.user as GoogleProfile | null;

        if (!profile) {
        return res.redirect(`${front}/login?error=google_auth_failed`);
        }

        const result = await this.auth.handleGoogleCallback(profile);

        if (result.status === 'existing') {
        res.cookie('session', result.sessionToken, cookieOpts(SESSION_MAX_AGE));
        return res.redirect(`${front}/`);
        }

        res.cookie(
        'registration_token',
        result.registrationToken,
        cookieOpts(REGISTRATION_MAX_AGE),
        );
        return res.redirect(`${front}/register/nickname`);
    }

    // for nickname screen to check if the registration session is valid
    @Get('registration-session')
    registrationSession(@Req() req: Request) {
        const { email, avatar } = this.auth.readRegistrationToken(
        req.cookies?.registration_token as string | undefined,
        );
        return { email, avatar };
    }

    // Frontend endpoint
    @Get('me')
    @UseGuards(SessionGuard)
    me(@CurrentUser() user: AuthUser) {
    return this.auth.getCurrentUser(user.id);
    }


    //POST endpoint
    @Post('register')
    async register(
        @Req() req: Request,
        @Body() dto: RegisterDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { sessionToken, nickname } = await this.auth.register(
        req.cookies?.registration_token as string | undefined,
        dto.nickname,
        );
        res.clearCookie('registration_token');
        res.cookie('session', sessionToken, cookieOpts(SESSION_MAX_AGE));
        return { nickname };
    }
}