import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Gender, User } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractTokenFromQuery, JwtStrategy } from './jwt.strategy';
import { Request } from 'express';
import { UserRepository } from '../../../shared/repositories/user.repository';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: DeepMocked<UserRepository>;
  let configService: DeepMocked<ConfigService>;

  const mockUser: User = {
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: Gender.male,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatarId: null,
    description: null,
    deletedAt: null,
  };

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
