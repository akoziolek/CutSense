import {Injectable, UnauthorizedException} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PassportStrategy} from '@nestjs/passport';
import {Profile, Strategy} from 'passport-google-oauth20';

export interface GoogleProfile {
    email: string;
    name: string;
    surname?: string;
    avatar?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(config: ConfigService) {
        super({
        clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
        clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
        callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
        scope: ['email', 'profile'],
        });
    }

      validate(_at: string, _rt: string, profile: Profile): GoogleProfile {
    const email = profile.emails?.[0]?.value?.toLowerCase();
    const verified = profile.emails?.[0]?.verified;
    if (!email || verified === false) {
      throw new UnauthorizedException('Google account has no verified e-mail');
    }

    const name = profile.name?.givenName || profile.displayName || email.split('@')[0];
    return {
      email,
      name: name.slice(0, 60),
      surname: profile.name?.familyName?.slice(0, 60),
      avatar: profile.photos?.[0]?.value,
    };
  }
}