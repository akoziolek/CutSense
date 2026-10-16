import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

export const NICKNAME_REGEX = /^[a-zA-Z0-9_.-]{3,20}$/;

export class RegisterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Nickname is required' })
  @Matches(NICKNAME_REGEX, {
    message: 'Nickname must contain 3–20 characters: letters, numbers and _ . -',
  })
  nickname: string;
}