import {ConflictException, Injectable, UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {UsersService} from '../users/users.service.js';
import { GoogleProfile } from './google.strategy.js';

export type GoogleCallbackResult = 
    | {status: 'existing'; sessionToken: string}
    | {status: 'new'; registrationToken: string};

@Injectable()
export class AuthService {
    constructor(
        private readonly users: UsersService,
        private readonly jwt: JwtService,
    ) {}

    async handleGoogleCallback(profile: GoogleProfile): Promise<GoogleCallbackResult> {
        const user = await this.users.findByEmail(profile.email);

        if(user){
            return {status: 'existing', sessionToken: this.signSession(user.id)};
        }

        // New user: nothing is being saved until correct nickname. Google data travels in a short-lived signed token.
        const registrationToken = this.jwt.sign(
        { ...profile, purpose: 'registration' },
        { expiresIn: '15m' },
        );
        return { status: 'new', registrationToken };
    }

    readRegistrationToken(token?: string): GoogleProfile {
        if (!token) throw new UnauthorizedException('No registration session');
        try {
        const { purpose, email, name, surname, avatar } = this.jwt.verify<
            GoogleProfile & { purpose: string }
        >(token);
        if (purpose !== 'registration') throw new Error('wrong token type');
        return { email, name, surname, avatar };
        } catch {
        throw new UnauthorizedException('Registration session expired');
        }
    }

    async getCurrentUser(id: number) {
        const user = await this.users.findById(id);
        if (!user) throw new UnauthorizedException();
        return {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.pictureUrl,
        };
    }

    signSession(userId: number): string {
        return this.jwt.sign(
        { sub: String(userId), purpose: 'session' },
        { expiresIn: '7d' },
        );
    }
}

