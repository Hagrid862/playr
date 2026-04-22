import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RefreshTokenRepository } from '@/shared/repositories/refresh-token.repository';
import { SessionRepository } from '@/shared/repositories/session.repository';
import { LogoutCommand } from '../impl/logout.command';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async execute(command: LogoutCommand) {
    const { sessionId } = command;

    await Promise.all([
      this.sessionRepository.revoke(sessionId),
      this.refreshTokenRepository.revokeAllBySessionId(sessionId),
    ]);

    return { success: true };
  }
}
