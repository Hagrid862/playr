import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus, Gender } from '@repo/db';
import { userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateUserQuery } from '../impl/validate-user.query';
import { ValidateUserHandler } from './validate-user.handler';

describe('ValidateUserHandler', () => {
  let handler: ValidateUserHandler;
  let userRepository: DeepMocked<UserRepository>;
  let hashingService: DeepMocked<HashingService>;

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
    userRepository = createMock<UserRepository>();
    hashingService = createMock<HashingService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserHandler,
        { provide: UserRepository, useValue: userRepository },
        { provide: HashingService, useValue: hashingService },
      ],
    }).compile();

    handler = module.get<ValidateUserHandler>(ValidateUserHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should return user if credentials are valid and email is verified', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(null);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toBeNull();
    });

    it('should return null if password invalid', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(false);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'wrong'));
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.pending }),
      );
      hashingService.compare.mockResolvedValue(true);

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('Email not verified');
    });

    it('should throw UnauthorizedException if account is deleted', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, {
          emailStatus: EmailStatus.verified,
          deletedAt: new Date(),
        }),
      );
      hashingService.compare.mockResolvedValue(true);

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('Account has been deleted');
    });

    it('should throw error if repository fails', async () => {
      userRepository.getByEmailWithStatus.mockRejectedValue(new Error('DB Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('DB Error');
    });

    it('should throw error if hashing service fails', async () => {
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockRejectedValue(new Error('Hashing Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('Hashing Error');
    });

    it('should strip emailStatus from the returned user object', async () => {
      // Arrange
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      // Act
      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));

      // Assert
      expect(result).not.toHaveProperty('emailStatus');
      expect(result).toEqual(mockUser);
    });

    it('should handle mixed-case email by relying on repository normalization', async () => {
      // Arrange
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      // Act
      const result = await handler.execute(new ValidateUserQuery('TEST@Example.Com', 'password'));

      // Assert
      expect(userRepository.getByEmailWithStatus).toHaveBeenCalledWith('TEST@Example.Com');
      expect(result).toEqual(mockUser);
    });

    it('should return null if password is an empty string', async () => {
      // Arrange
      userRepository.getByEmailWithStatus.mockResolvedValue(
        Object.assign({}, mockUser, { emailStatus: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(false);

      // Act
      const result = await handler.execute(new ValidateUserQuery('test@example.com', ''));

      // Assert
      expect(hashingService.compare).toHaveBeenCalledWith('', mockUser.password);
      expect(result).toBeNull();
    });
  });
});
