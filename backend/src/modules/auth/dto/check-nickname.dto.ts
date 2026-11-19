import { IsString, Matches, Length } from 'class-validator';

export class CheckNicknameDto {
  @IsString()
  @Length(3, 20, { message: 'Nickname must be between 3 and 20 characters' })
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'Nickname can only contain letters, numbers and _ . -',
  })
  nickname: string;
}
