import { AuthenticatedUser } from '@/common/types/auth.types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from '../../../shared/repositories/user.repository';

interface JwtPayload {
  sub: string;
  username: string;
  sessionId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          return req?.query?.token as string;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.getById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // We can also extract sessionId from the token if we include it in the payload during generation
    return { user, sessionId: payload.sessionId };
  }
}
