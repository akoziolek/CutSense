import { SetMetadata } from '@nestjs/common';

export const AUTH_TYPE_KEY = 'authType';

export type AuthType = 'public' | 'optional';

export const Public = () => SetMetadata(AUTH_TYPE_KEY, 'public');

export const OptionalAuth = () => SetMetadata(AUTH_TYPE_KEY, 'optional');
