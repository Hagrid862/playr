import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus, EmailType, Gender } from '@repo/db';
import { userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidateUserQuery } from '../impl/validate-user.query';
import { ValidateUserHandler } from './validate-user.handler';

describe('ValidateUserHandler', () => {
  let handler: ValidateUserHandler;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
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

  const primaryEmailRow = (status: EmailStatus, user = mockUser) =>
    ({
      id: 'ea-1',
      email: 'test@example.com',
      type: EmailType.primary,
      status,
      userId: user.id,
      user,
      createdAt: new Date(),
      updatedAt: new Date(),
      verifiedAt: null,
      deletedAt: null,
    }) as Awaited<ReturnType<EmailAddressRepository['getPrimaryByEmailWithUser']>>;

  beforeEach(async () => {
    emailAddressRepository = createMock<EmailAddressRepository>();
    hashingService = createMock<HashingService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidateUserHandler,
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
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
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toEqual({ user: mockUser, isEmailVerified: true });
    });

    it('should return null if user not found', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(null);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toBeNull();
    });

    it('should return null if password invalid', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockResolvedValue(false);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'wrong'));
      expect(result).toBeNull();
    });

    it('should return user with isEmailVerified false if email not verified', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.pending),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toEqual({ user: mockUser, isEmailVerified: false });
    });

    it('should throw UnauthorizedException if account is deleted', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified, { ...mockUser, deletedAt: new Date() }),
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
      emailAddressRepository.getPrimaryByEmailWithUser.mockRejectedValue(new Error('DB Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('DB Error');
    });

    it('should throw error if hashing service fails', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockRejectedValue(new Error('Hashing Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('Hashing Error');
    });

    it('should return User without email row fields', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));

      expect(result?.user).not.toHaveProperty('emailStatus');
      expect(result).not.toHaveProperty('status');
      expect(result).toEqual({ user: mockUser, isEmailVerified: true });
    });

    it('should handle mixed-case email by relying on repository normalization', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('TEST@Example.Com', 'password'));

      expect(emailAddressRepository.getPrimaryByEmailWithUser).toHaveBeenCalledWith(
        'TEST@Example.Com',
      );
      expect(result).toEqual({ user: mockUser, isEmailVerified: true });
    });

    it('should return null if password is an empty string', async () => {
      emailAddressRepository.getPrimaryByEmailWithUser.mockResolvedValue(
        primaryEmailRow(EmailStatus.verified),
      );
      hashingService.compare.mockResolvedValue(false);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', ''));

      expect(hashingService.compare).toHaveBeenCalledWith('', mockUser.password);
      expect(result).toBeNull();
    });
  });
});
