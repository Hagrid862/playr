import { TokenService } from '@/features/auth/services/token.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let tokenService: DeepMocked<TokenService>;

  beforeEach(() => {
    tokenService = createMock<TokenService>();
    guard = new WsJwtGuard(tokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true and set user in client data when token is valid', async () => {
      // Arrange
      const mockUser = userBuilder();
      const mockSocket = {
        handshake: { auth: { token: 'valid-token' } },
        data: {},
      };

      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToWs.mockReturnValue({
        getClient: () => mockSocket,
      } as any);

      tokenService.authenticateWithAccessToken.mockResolvedValue({
        user: mockUser,
        sessionId: 'session-id',
      });

      // Act
      const result = await guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect((mockSocket as any).data.user).toEqual({
        user: mockUser,
        sessionId: 'session-id',
      });
      expect(tokenService.authenticateWithAccessToken).toHaveBeenCalledWith('valid-token');
    });

    it('should throw WsException when token is missing', async () => {
      // Arrange
      const mockSocket = {
        handshake: { auth: {} },
        data: {},
      };

      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToWs.mockReturnValue({
        getClient: () => mockSocket,
      } as any);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Unauthorized: No token provided',
      );
    });

    it('should throw WsException when token service throws UnauthorizedException', async () => {
      // Arrange
      const mockSocket = {
        handshake: { auth: { token: 'invalid-token' } },
      };

      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToWs.mockReturnValue({
        getClient: () => mockSocket,
      } as any);

      tokenService.authenticateWithAccessToken.mockRejectedValue(
        new UnauthorizedException('Invalid or expired token'),
      );

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow(WsException);
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Unauthorized: Invalid or expired token',
      );
    });

    it('should throw Internal server error and log when an unexpected error occurs', async () => {
      // Arrange
      const loggerSpy = vi.spyOn((guard as any).logger, 'error');
      const mockSocket = {
        handshake: { auth: { token: 'erroneous-token' } },
      };

      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToWs.mockReturnValue({
        getClient: () => mockSocket,
      } as any);

      const errorMessage = 'Database connection failed';
      const error = new Error(errorMessage);
      tokenService.authenticateWithAccessToken.mockRejectedValue(error);

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Internal server error');
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('WsJwtGuard: unexpected error — ' + errorMessage),
        error.stack,
      );
    });

    it('should handle non-Error objects being thrown gracefully', async () => {
      // Arrange
      vi.spyOn((guard as any).logger, 'error').mockImplementation(() => {});
      const mockSocket = {
        handshake: { auth: { token: 'strange-token' } },
      };

      const mockContext = createMock<ExecutionContext>();
      mockContext.switchToWs.mockReturnValue({
        getClient: () => mockSocket,
      } as any);

      tokenService.authenticateWithAccessToken.mockRejectedValue('String error');

      // Act & Assert
      await expect(guard.canActivate(mockContext)).rejects.toThrow('Internal server error');
    });
  });
});
