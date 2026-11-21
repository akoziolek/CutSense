import { Controller, Get, Patch, Query, Body } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/auth.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { AuthenticationRequiredException } from '../../common/exceptions/authentication-required.exception.js';
import { CheckNicknameDto } from './dto/check-nickname.dto.js';
import { UserProfileDto } from './dto/user-profile.dto.js';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthUser): Promise<UserProfileDto> {
    const profile = await this.users.getProfileById(user.id);
    if (!profile) {
      throw new AuthenticationRequiredException('User not found');
    }
    return profile;
  }

  @Get('check-nickname')
  @Public()
  async checkNickname(@Query() query: CheckNicknameDto) {
    const exists = await this.users.nicknameExists(query.nickname);
    return { available: !exists };
  }

  @Patch('me')
  @ApiCookieAuth('session')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates profile data of the currently authenticated user.',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserProfileDto })
  @ApiBadRequestResponse({ description: 'Invalid request body.' })
  @ApiUnauthorizedResponse({
    description: 'A valid session cookie is required.',
  })
  @ApiNotFoundResponse({ description: 'User not found.' })
  @ApiConflictResponse({ description: 'This nickname is already taken.' })
  async updateMe(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UserProfileDto> {
    return this.users.updateUser(dto, user.id);
  }
}
