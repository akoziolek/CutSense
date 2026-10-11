import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    // TODO: Change to proper read from request.user after implementing AuthGuard
    return {
      id: 1,
      email: 'dev@example.com',
    };
  },
);
