import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { SessionGuard } from '../../auth/guards/session.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import { CheckNicknameDto } from './dto/check-nickname.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    const profile = await this.users.getProfileById(user.id);
    if (!profile) {
      throw new AuthenticationRequiredException('User not found');
    }
    return profile;
  }

  @Get('check-nickname')
  async checkNickname(@Query() query: CheckNicknameDto) {
    const exists = await this.users.nicknameExists(query.nickname);
    return { available: !exists };
  }
}
