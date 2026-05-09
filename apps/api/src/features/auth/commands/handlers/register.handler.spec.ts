import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailStatus, Gender, PrismaClient, EmailType } from '@repo/db';
import { emailAddressBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAuthService } from '../../services/email-auth.service';
import { RegisterRequestDto } from '../../dto/register.request.dto';
import { RegisterCommand } from '../impl/register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: DeepMocked<UserRepository>;
  let hashingService: DeepMocked<HashingService>;
  let prismaService: DeepMocked<PrismaService>;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let emailAuthService: DeepMocked<EmailAuthService>;
  let mockPrismaClient: DeepMocked<PrismaClient>;

  const mockUser = userBuilder({
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: Gender.male,
  });

  const mockPayload: RegisterRequestDto = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male',
  };

  const mockEmailAddress = emailAddressBuilder({
    id: 'email-id',
    email: 'test@example.com',
    userId: 'user-id-123',
    status: EmailStatus.created,
    type: EmailType.primary,
  });

  const mockUserWithEmails = {
    ...mockUser,
    emailAddresses: [mockEmailAddress],
  };

  beforeEach(async () => {
    userRepository = createMock<UserRepository>();
    hashingService = createMock<HashingService>();
    mockPrismaClient = createMock<PrismaClient>();
    unitOfWork = createMock<UnitOfWorkService>();
    emailAuthService = createMock<EmailAuthService>();

    // Mock runInTransaction to just execute the callback
    unitOfWork.runInTransaction.mockImplementation((work) => work());

    prismaService = createMock<PrismaService>();
    // In our implementation, repository/handler calls this.prisma.client
    // We want this to return our mockPrismaClient
    Object.defineProperty(prismaService, 'client', {
      get: () => mockPrismaClient,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterHandler,
        { provide: UserRepository, useValue: userRepository },
        { provide: HashingService, useValue: hashingService },
        { provide: PrismaService, useValue: prismaService },
        { provide: UnitOfWorkService, useValue: unitOfWork },
        { provide: EmailAuthService, useValue: emailAuthService },
      ],
    }).compile();

    handler = module.get<RegisterHandler>(RegisterHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(mockUserWithEmails as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(true);

      const command = new RegisterCommand(mockPayload);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
      expect(hashingService.hash).toHaveBeenCalledWith(mockPayload.password);

      expect(unitOfWork.runInTransaction).toHaveBeenCalled();
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: mockPayload.username,
            password: 'hashed-password',
            firstName: mockPayload.firstName,
            lastName: mockPayload.lastName,
            birthDate: '2000-01-01',
            gender: mockPayload.gender,
          }),
        }),
      );
      expect(emailAuthService.beginOtpVerificationViaEmail).toHaveBeenCalledWith(
        mockEmailAddress,
        'emailVerification',
      );
      expect(result).toEqual({
        user: expect.any(Object),
        isEmailSent: true,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(userBuilder({ id: 'existing-email-id' }));
      userRepository.getByUsername.mockResolvedValue(null);

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Email already exists');

      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      // Username check is now called in parallel (not skipped)
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(userBuilder({ id: 'existing-user-id' }));

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Username already exists');

      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

    it('should prioritize email conflict over username when both exist', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(userBuilder({ id: 'existing-email-id' }));
      userRepository.getByUsername.mockResolvedValue(userBuilder({ id: 'existing-user-id' }));

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      // Email error should be thrown first (email check is prioritized)
      await expect(handler.execute(command)).rejects.toThrow('Email already exists');
      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

    it('should throw error if user creation fails', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');

      mockPrismaClient.user.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });

    it('should throw error if email creation fails', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');

      mockPrismaClient.user.create.mockResolvedValue(mockUserWithEmails as any);
      emailAuthService.beginOtpVerificationViaEmail.mockRejectedValue(
        new Error('Email service error'),
      );

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Email service error');
    });

    it('should successfully register a user with minimal fields', async () => {
      // Arrange
      const minimalPayload = {
        ...mockPayload,
        lastName: null,
      };
      const minimalUser = {
        ...userBuilder({ lastName: null }),
        emailAddresses: [mockEmailAddress],
      };

      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(minimalUser as any);
      emailAuthService.beginOtpVerificationViaEmail.mockResolvedValue(true);

      const command = new RegisterCommand(minimalPayload as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.user.lastName).toBeNull();
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastName: null,
          }),
        }),
      );
    });
  });
});
