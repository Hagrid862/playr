import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
// @ts-expect-error - ignore type errors from testing package imports
import { buildUser } from '@repo/testing';
import type { Request } from 'express';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { extractTokenFromQuery, JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: DeepMocked<UserRepository>;
  let configService: DeepMocked<ConfigService>;

  const mockUser = buildUser();

  beforeEach(async () => {
    userRepository = createMock<UserRepository>();
    configService = createMock<ConfigService>();

    configService.get.mockReturnValue('secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: UserRepository, useValue: userRepository },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user and sessionId if user exists', async () => {
      // Arrange
      const payload = {
        sub: mockUser.id,
        username: mockUser.username,
        sessionId: 'session-456',
        iat: Date.now(),
        exp: Date.now() + 3600,
      };
      userRepository.getById.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(userRepository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ user: mockUser, sessionId: 'session-456' });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      // Arrange
      const payload = {
        sub: 'non-existent',
        username: 'non-existent',
        sessionId: 'session-456',
        iat: Date.now(),
        exp: Date.now() + 3600,
      };
      userRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('extractTokenFromQuery', () => {
  it('should return token from the query params if available', () => {
    const mockReq = createMock<Request>({ query: { token: 'my-token' } });
    expect(extractTokenFromQuery(mockReq)).toBe('my-token');
  });

  it('should return null if no token is available in the query params', () => {
    const mockReq = createMock<Request>({ query: {} });
    expect(extractTokenFromQuery(mockReq)).toBe(null);
  });

  it('should return null if req.query is undefined', () => {
    const mockReq = createMock<Request>();
    expect(extractTokenFromQuery(mockReq)).toBe(null);
  });
});
