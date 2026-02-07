import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ValidateUserQuery } from '../queries/impl/validate-user.query';
import { User } from '@repo/db';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private queryBus: QueryBus) {
    super({
      usernameField: 'email',
    });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.queryBus.execute(new ValidateUserQuery(email, password));
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}
