import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuardForSearch extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // If there's an error or no user, just return null (Guest mode)
    // The controller will still proceed, but the userId will be null.
    if (err || !user) {
      return null;
    }
    return user;
  }
}
