import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { SessionRepository } from '../../../../shared/repositories/session.repository';
import { UserRepository } from '../../../../shared/repositories/user.repository';
import { TokenService } from '../../services/token.service';
import { RefreshTokensCommand } from '../impl/refresh-tokens.command';

@CommandHandler(RefreshTokensCommand)
export class RefreshTokensHandler implements ICommandHandler<RefreshTokensCommand> {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionRepository: SessionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(command: RefreshTokensCommand) {
    const { refreshToken } = command;

    const decoded = await this.tokenService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const { userId, sessionId, isRevoked } = decoded;

    if (isRevoked) {
      // If a revoked token is used, it's a potential breach.
      // Revoke the entire session to protect the user.
      await this.sessionRepository.revoke(sessionId);
      throw new UnauthorizedException('Security breach detected. Please login again.');
    }

    const user = await this.userRepository.getById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new tokens (Rotation)
    return this.tokenService.generateAuthTokens(user.id, user.username, sessionId, refreshToken);
  }
}
