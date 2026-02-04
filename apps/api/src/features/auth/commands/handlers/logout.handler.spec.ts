import { Test, TestingModule } from '@nestjs/testing';
import { LogoutHandler } from './logout.handler';
import { LogoutCommand } from '../impl/logout.command';
import { SessionRepository } from '../../../../shared/repositories/session.repository';
import { RefreshTokenRepository } from '../../../../shared/repositories/refresh-token.repository';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let sessionRepository: DeepMocked<SessionRepository>;
  let refreshTokenRepository: DeepMocked<RefreshTokenRepository>;

  beforeEach(async () => {
    sessionRepository = createMock<SessionRepository>();
    refreshTokenRepository = createMock<RefreshTokenRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutHandler,
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
      ],
    }).compile();

    handler = module.get<LogoutHandler>(LogoutHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should revoke session and all refresh tokens for that session', async () => {
      // Arrange
      const sessionId = 'session-id-123';
      const command = new LogoutCommand(sessionId);

      sessionRepository.revoke.mockResolvedValue({ id: sessionId } as any);
      refreshTokenRepository.revokeAllBySessionId.mockResolvedValue({ count: 5 } as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(sessionRepository.revoke).toHaveBeenCalledWith(sessionId);
      expect(refreshTokenRepository.revokeAllBySessionId).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual({ success: true });
    });

    it('should handle errors if repository fails', async () => {
      // Arrange
      const sessionId = 'session-id-123';
      const command = new LogoutCommand(sessionId);

      sessionRepository.revoke.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });
  });
});
