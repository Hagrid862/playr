import { AuthenticatedUser } from '@/common/types/auth.types';
import { JwtPayload } from '@/common/types/jwt.types';
import { UserRepository } from '@/shared/repositories/user.repository';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenRepository } from '../../../shared/repositories/refresh-token.repository';
import { SessionRepository } from '../../../shared/repositories/session.repository';
import { UnitOfWorkService } from '../../../shared/services/unit-of-work.service';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly unitOfWork: UnitOfWorkService,
  ) {}

  async generateAuthTokens(
    userId: string,
    username: string,
    sessionId?: string,
    oldRefreshToken?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.unitOfWork.runInTransaction(async () => {
      let currentSessionId = sessionId;

      if (!currentSessionId) {
        const session = await this.sessionRepository.create({
          user: { connect: { id: userId } },
        });
        currentSessionId = session.id;
      }

      const payload = { sub: userId, username, sessionId: currentSessionId };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(payload, {
          secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN') as never, // Using never to bypass legacy check, or better:
        }),
        this.jwtService.signAsync(payload, {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN') as never,
        }),
      ]);

      if (oldRefreshToken) {
        await this.refreshTokenRepository.revoke(oldRefreshToken);
      }

      await this.refreshTokenRepository.create({
        token: refreshToken,
        session: { connect: { id: currentSessionId } },
      });

      return { accessToken, refreshToken };
    });
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ userId: string; sessionId: string; isRevoked: boolean }> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const refreshTokenRecord = await this.refreshTokenRepository.getByToken(token);

      if (!refreshTokenRecord || refreshTokenRecord.deletedAt) {
        throw new UnauthorizedException('Invalid token');
      }

      if (refreshTokenRecord.revokedAt) {
        return {
          userId: payload.sub,
          sessionId: payload.sessionId,
          isRevoked: true,
        };
      }

      const session = await this.sessionRepository.getById(payload.sessionId);

      if (!session || session.deletedAt) {
        throw new UnauthorizedException('Invalid token');
      }

      if (session.revokedAt) {
        return {
          userId: payload.sub,
          sessionId: payload.sessionId,
          isRevoked: true,
        };
      }

      return {
        userId: payload.sub,
        sessionId: payload.sessionId,
        isRevoked: false,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async toAuthenticatedUser(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.sessionRepository.getById(payload.sessionId);
    if (!session || session.deletedAt) {
      throw new UnauthorizedException('Invalid token');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session revoked');
    }

    const user = await this.userRepository.getById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { user, sessionId: payload.sessionId };
  }

  async authenticateWithAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = await this.verifyAccessToken(token);
    return this.toAuthenticatedUser(payload);
  }
}
