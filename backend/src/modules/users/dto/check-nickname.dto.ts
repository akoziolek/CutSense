import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class CheckNicknameDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 20)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname can only contain letters, numbers, and underscores',
  })
  nickname!: string;
}
