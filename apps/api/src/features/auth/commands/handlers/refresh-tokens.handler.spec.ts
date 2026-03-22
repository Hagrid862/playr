import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionRepository } from '../../../../shared/repositories/session.repository';
import { UserRepository } from '../../../../shared/repositories/user.repository';
import { TokenService } from '../../services/token.service';
import { RefreshTokensCommand } from '../impl/refresh-tokens.command';
import { RefreshTokensHandler } from './refresh-tokens.handler';

describe('RefreshTokensHandler', () => {
  let handler: RefreshTokensHandler;
  let tokenService: DeepMocked<TokenService>;
  let sessionRepository: DeepMocked<SessionRepository>;
  let userRepository: DeepMocked<UserRepository>;

  beforeEach(async () => {
    tokenService = createMock<TokenService>();
    sessionRepository = createMock<SessionRepository>();
    userRepository = createMock<UserRepository>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensHandler,
        { provide: TokenService, useValue: tokenService },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<RefreshTokensHandler>(RefreshTokensHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const mockRefreshToken = 'valid-refresh-token';
    const mockUserId = 'user-123';
    const mockSessionId = 'session-123';

    it('should successfully refresh tokens', async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: mockUserId,
        sessionId: mockSessionId,
        isRevoked: false,
      });

      userRepository.getById.mockResolvedValue(
        userBuilder({ id: mockUserId, username: 'test-user' }),
      );

      tokenService.generateAuthTokens.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const command = new RefreshTokensCommand(mockRefreshToken);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(tokenService.verifyRefreshToken).toHaveBeenCalledWith(mockRefreshToken);
      expect(userRepository.getById).toHaveBeenCalledWith(mockUserId);
      expect(tokenService.generateAuthTokens).toHaveBeenCalledWith(
        mockUserId,
        'test-user',
        mockSessionId,
        mockRefreshToken,
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException if token is invalid', async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue(null);
      const command = new RefreshTokensCommand(mockRefreshToken);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw if token is already revoked (no session revoke)', async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: mockUserId,
        sessionId: mockSessionId,
        isRevoked: true,
      });
      sessionRepository.revoke.mockResolvedValue({ id: mockSessionId } as never);
      const command = new RefreshTokensCommand(mockRefreshToken);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Security breach detected. Please login again.',
      );
      expect(sessionRepository.revoke).toHaveBeenCalledWith(mockSessionId);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Arrange
      tokenService.verifyRefreshToken.mockResolvedValue({
        userId: mockUserId,
        sessionId: mockSessionId,
        isRevoked: false,
      });
      userRepository.getById.mockResolvedValue(null);
      const command = new RefreshTokensCommand(mockRefreshToken);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
      await expect(handler.execute(command)).rejects.toThrow('User not found');
    });

    it('should throw UnauthorizedException if session is null (expired or missing)', async () => {
      // Arrange
      // verifyRefreshToken returns null if session is missing/deleted from DB
      tokenService.verifyRefreshToken.mockResolvedValue(null);
      const command = new RefreshTokensCommand(mockRefreshToken);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(UnauthorizedException);
      await expect(handler.execute(command)).rejects.toThrow('Invalid refresh token');
    });
  });
});
