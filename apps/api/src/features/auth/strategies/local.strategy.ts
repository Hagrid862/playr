import { AuthenticatedUser } from '@/common/types/auth.types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ValidateUserQuery } from '../queries/impl/validate-user.query';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private queryBus: QueryBus) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = await this.queryBus.execute(
      new ValidateUserQuery(email, password),
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
