import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { UnauthorizedException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { Gender, User } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateUserQuery } from '../queries/impl/validate-user.query';
import { LocalStrategy } from './local.strategy';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let queryBus: DeepMocked<QueryBus>;

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
    queryBus = createMock<QueryBus>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [LocalStrategy, { provide: QueryBus, useValue: queryBus }],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user if validation query succeeds', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(mockUser);

      // Act
      const result = await strategy.validate('test@example.com', 'password');

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(ValidateUserQuery));
      expect(result).toEqual({ user: mockUser });
    });

    it('should throw UnauthorizedException if validation query returns null', async () => {
      // Arrange
      queryBus.execute.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate('test@example.com', 'wrong')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });
});
