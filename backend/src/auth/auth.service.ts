import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../modules/users/users.service.js';
import { GoogleProfile } from './strategies/google.strategy.js';
import { AuthenticationRequiredException } from '../common/exceptions/authentication-required.exception.js';
import { ResourceConflictException } from '../common/exceptions/resource-conflict.exception.js';

export type GoogleCallbackResult =
  | { status: 'existing'; sessionToken: string }
  | { status: 'new'; registrationToken: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async handleGoogleCallback(
    profile: GoogleProfile,
  ): Promise<GoogleCallbackResult> {
    const user = await this.users.findByGoogleId(profile.googleId);

    if (user) {
      return { status: 'existing', sessionToken: this.signSession(user.id) };
    }

    // New user: nothing is being saved until correct nickname. Google data travels in a short-lived signed token.
    const registrationToken = this.jwt.sign(
      { ...profile, purpose: 'registration' },
      { expiresIn: '15m' },
    );
    return { status: 'new', registrationToken };
  }

  readRegistrationToken(token?: string): GoogleProfile {
    if (!token)
      throw new AuthenticationRequiredException('No registration session');
    try {
      const { purpose, googleId, email, name, surname, avatar } =
        this.jwt.verify<GoogleProfile & { purpose: string }>(token);
      if (purpose !== 'registration') throw new Error('wrong token type');
      return { googleId, email, name, surname, avatar };
    } catch {
      throw new AuthenticationRequiredException('Registration session expired');
    }
  }

  async getCurrentUser(id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new AuthenticationRequiredException('User not found');
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

  async register(registrationToken: string | undefined, nickname: string) {
    const profile = this.readRegistrationToken(registrationToken);

    // Account may have appeared meanwhile so just log in
    const existing = await this.users.findByGoogleId(profile.googleId);
    if (existing) {
      return {
        sessionToken: this.signSession(existing.id),
        nickname: existing.nickname,
      };
    }

    if (await this.users.nicknameExists(nickname)) {
      throw new ResourceConflictException('This nickname is already taken');
    }

    const user = await this.users.create({
      googleId: profile.googleId,
      email: profile.email,
      name: profile.name,
      surname: profile.surname,
      pictureUrl: profile.avatar,
      nickname,
    });

    return { sessionToken: this.signSession(user.id), nickname: user.nickname };
  }
}
