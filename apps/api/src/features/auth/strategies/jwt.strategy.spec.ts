import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Gender } from '@repo/db';
import { userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { Request } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from '../services/token.service';
import { extractTokenFromQuery, JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let tokenService: DeepMocked<TokenService>;
  let configService: DeepMocked<ConfigService>;

  const mockUser = userBuilder({
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: Gender.male,
  });

  beforeEach(async () => {
    tokenService = createMock<TokenService>();
    configService = createMock<ConfigService>();

    configService.getOrThrow.mockReturnValue('secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: TokenService, useValue: tokenService },
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
      tokenService.toAuthenticatedUser.mockResolvedValue({
        user: mockUser,
        sessionId: 'session-456',
      });

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(tokenService.toAuthenticatedUser).toHaveBeenCalledWith(payload);
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
      tokenService.toAuthenticatedUser.mockRejectedValue(new UnauthorizedException());

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});

describe('extractTokenFromQuery', () => {
  it('should return token from the query params if available', () => {
    const mockReq: Partial<Request> = { query: { token: 'my-token' } };
    expect(extractTokenFromQuery(mockReq as Request)).toBe('my-token');
  });

  it('should return null if no token is available in the query params', () => {
    const mockReq: Partial<Request> = { query: {} };
    expect(extractTokenFromQuery(mockReq as Request)).toBe(null);
  });

  it('should return null if req.query is undefined', () => {
    const mockReq: Partial<Request> = {};
    expect(extractTokenFromQuery(mockReq as Request)).toBe(null);
  });
});
