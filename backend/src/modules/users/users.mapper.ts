import type { User } from './users.service.js';
import { UserProfileDto } from './dto/user-profile.dto.js';

export class UsersMapper {
  static toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      nickname: user.nickname,
      email: user.email,
    };
  }
}
