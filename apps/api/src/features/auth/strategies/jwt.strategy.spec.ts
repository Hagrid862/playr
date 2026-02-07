import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from '../../../shared/repositories/user.repository';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { User, Gender } from '@repo/db';

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
      const payload = { sub: mockUser.id, sessionId: 'session-456' };
      userRepository.getById.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(userRepository.getById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ user: mockUser, sessionId: 'session-456' });
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      // Arrange
      const payload = { sub: 'non-existent', sessionId: 'session-456' };
      userRepository.getById.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});
