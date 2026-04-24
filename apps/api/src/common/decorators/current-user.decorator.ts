import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPrincipal, AuthenticatedUser } from '../types/auth.types';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedPrincipal | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const authContext = request.user as AuthenticatedUser;

    if (!authContext) return null;

    return data ? authContext.user[data] : authContext.user;
  },
);
