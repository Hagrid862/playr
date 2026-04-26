import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus, Gender } from '@repo/db';
import { emailAddressBuilder, userBuilder } from '@repo/testing/builders';
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
  const { password, ...expectedPrincipal } = mockUser;
  void password;

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
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toEqual(expect.objectContaining(expectedPrincipal));
      expect(result).not.toHaveProperty('password');
    });

    it('should return null if user not found', async () => {
      emailAddressRepository.findOneWithInclude.mockResolvedValue(null);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));
      expect(result).toBeNull();
    });

    it('should return null if password invalid', async () => {
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(false);

      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'wrong'));
      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException if email not verified', async () => {
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.pending }),
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
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), {
          user: Object.assign({}, mockUser, { deletedAt: new Date() }),
          status: EmailStatus.verified,
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
      emailAddressRepository.findOneWithInclude.mockRejectedValue(new Error('DB Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('DB Error');
    });

    it('should throw error if hashing service fails', async () => {
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
      );
      hashingService.compare.mockRejectedValue(new Error('Hashing Error'));

      await expect(
        handler.execute(new ValidateUserQuery('test@example.com', 'password')),
      ).rejects.toThrow('Hashing Error');
    });

    it('returns nested user from email-address aggregate when credentials valid and email verified', async () => {
      // Arrange
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      // Act
      const result = await handler.execute(new ValidateUserQuery('test@example.com', 'password'));

      // Assert
      expect(result).toEqual(expect.objectContaining(expectedPrincipal));
      expect(result).not.toHaveProperty('password');
    });

    it('should handle mixed-case email by relying on repository normalization', async () => {
      // Arrange
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
      );
      hashingService.compare.mockResolvedValue(true);

      // Act
      const result = await handler.execute(new ValidateUserQuery('TEST@Example.Com', 'password'));

      // Assert
      expect(emailAddressRepository.findOneWithInclude).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          type: 'primary',
          deletedAt: null,
        },
        {
          user: true,
        },
      );
      expect(result).toEqual(expect.objectContaining(expectedPrincipal));
      expect(result).not.toHaveProperty('password');
    });

    it('should return null if password is an empty string', async () => {
      // Arrange
      emailAddressRepository.findOneWithInclude.mockResolvedValue(
        Object.assign(emailAddressBuilder(), { user: mockUser, status: EmailStatus.verified }),
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
