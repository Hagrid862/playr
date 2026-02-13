import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@repo/db';
import { AuthenticatedUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authContext = request.user as AuthenticatedUser;

    if (!authContext) return null;

    return data ? authContext.user[data] : authContext.user;
  },
);
