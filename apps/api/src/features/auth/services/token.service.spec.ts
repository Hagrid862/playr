import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { refreshTokenBuilder, sessionBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshTokenRepository } from '../../../shared/repositories/refresh-token.repository';
import { SessionRepository } from '../../../shared/repositories/session.repository';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { PrismaService } from '../../../shared/services/prisma.service';
import { UnitOfWorkService } from '../../../shared/services/unit-of-work.service';
import { TokenService } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: DeepMocked<JwtService>;
  let configService: DeepMocked<ConfigService>;
  let sessionRepository: DeepMocked<SessionRepository>;
  let refreshTokenRepository: DeepMocked<RefreshTokenRepository>;
  let userRepository: DeepMocked<UserRepository>;
  let unitOfWork: DeepMocked<UnitOfWorkService>;

  beforeEach(async () => {
    jwtService = createMock<JwtService>();
    configService = createMock<ConfigService>();
    sessionRepository = createMock<SessionRepository>();
    refreshTokenRepository = createMock<RefreshTokenRepository>();
    userRepository = createMock<UserRepository>();
    unitOfWork = createMock<UnitOfWorkService>();

    // Mock unit of work transaction
    unitOfWork.runInTransaction.mockImplementation((work) => work());

    // Mock config
    const configSecret = (key: string) => {
      if (key.includes('SECRET')) return 'secret';
      if (key.includes('EXPIRES_IN')) return '1h';
      return null;
    };
    configService.get.mockImplementation(configSecret);
    configService.getOrThrow.mockImplementation((key: string) => {
      const v = configSecret(key);
      if (v === null || v === undefined) {
        throw new Error(`Missing config: ${key}`);
      }
      return v;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: SessionRepository, useValue: sessionRepository },
        { provide: RefreshTokenRepository, useValue: refreshTokenRepository },
        { provide: UserRepository, useValue: userRepository },
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAuthTokens', () => {
    it('should generate tokens and create a new session if sessionId is not provided', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('mock-token');
      sessionRepository.create.mockResolvedValue(sessionBuilder({ id: 'new-session-id' }));

      // Act
      const result = await service.generateAuthTokens('user-123', 'username');

      // Assert
      expect(sessionRepository.create).toHaveBeenCalled();
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        token: 'mock-token',
        session: { connect: { id: 'new-session-id' } },
      });
      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
      });
    });

    it('should use existing sessionId and revoke old token if provided', async () => {
      // Arrange
      jwtService.signAsync.mockResolvedValue('new-token');
      const oldToken = 'old-token';
      const sessionId = 'existing-session-id';

      // Act
      await service.generateAuthTokens('user-123', 'username', sessionId, oldToken);

      // Assert
      expect(sessionRepository.create).not.toHaveBeenCalled();
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(oldToken);
      expect(refreshTokenRepository.create).toHaveBeenCalledWith({
        token: 'new-token',
        session: { connect: { id: sessionId } },
      });
    });
  });

  describe('verifyRefreshToken', () => {
    const mockToken = 'some-jwt-token';
    const mockPayload = { sub: 'user-123', sessionId: 'session-123' };

    it('should return decoded info if token and session are valid', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.getByToken.mockResolvedValue(
        refreshTokenBuilder({ revokedAt: null, deletedAt: null }),
      );
      sessionRepository.getById.mockResolvedValue(
        sessionBuilder({ revokedAt: null, deletedAt: null }),
      );

      // Act
      const result = await service.verifyRefreshToken(mockToken);

      // Assert
      expect(result).toEqual({
        userId: mockPayload.sub,
        sessionId: mockPayload.sessionId,
        isRevoked: false,
      });
    });

    it('should throw UnauthorizedException if JWT verification fails', async () => {
      // Arrange
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      // Act
      const promise = service.verifyRefreshToken(mockToken);

      // Assert
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Invalid token');
    });

    it('should throw UnauthorizedException if token is not found in database', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.getByToken.mockResolvedValue(null);

      // Act & Assert
      const promise = service.verifyRefreshToken(mockToken);
      await expect(promise).rejects.toThrow(UnauthorizedException);
      await expect(promise).rejects.toThrow('Invalid token');
    });

    it('should return isRevoked: true if token is revoked in database', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.getByToken.mockResolvedValue(
        refreshTokenBuilder({ revokedAt: new Date() }),
      );

      // Act
      const result = await service.verifyRefreshToken(mockToken);

      // Assert
      expect(result).toEqual({
        userId: mockPayload.sub,
        sessionId: mockPayload.sessionId,
        isRevoked: true,
      });
    });

    it('should return isRevoked: true if session is revoked in database', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.getByToken.mockResolvedValue(refreshTokenBuilder({ revokedAt: null }));
      sessionRepository.getById.mockResolvedValue(sessionBuilder({ revokedAt: new Date() }));

      // Act
      const result = await service.verifyRefreshToken(mockToken);

      // Assert
      expect(result?.isRevoked).toBe(true);
    });

    it('should throw UnauthorizedException if session is deleted', async () => {
      // Arrange
      jwtService.verifyAsync.mockResolvedValue(mockPayload);
      refreshTokenRepository.getByToken.mockResolvedValue(refreshTokenBuilder({ revokedAt: null }));
      sessionRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyRefreshToken(mockToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.verifyRefreshToken(mockToken)).rejects.toThrow('Invalid token');
    });
  });
});
