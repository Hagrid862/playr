import { UserRepository } from '@/shared/repositories/user.repository';
import { EmailAddressRepository } from '@/shared/repositories/email-address.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserSchema } from '@repo/contracts';
import { EmailStatus, Gender, PrismaClient } from '@repo/db';
import { emailAddressBuilder, userBuilder } from '@repo/testing/builders';
import { createMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterRequestDto } from '../../dto/register.request.dto';
import { RegisterCommand } from '../impl/register.command';
import { RegisterHandler } from './register.handler';

type ExistingUser = NonNullable<Awaited<ReturnType<UserRepository['findOne']>>>;
type ExistingEmailAddress = NonNullable<Awaited<ReturnType<EmailAddressRepository['findOne']>>>;

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: DeepMocked<UserRepository>;
  let emailAddressRepository: DeepMocked<EmailAddressRepository>;
  let hashingService: DeepMocked<HashingService>;
  let prismaService: DeepMocked<PrismaService>;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
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

  const existingUserBuilder = (id: string): ExistingUser =>
    ({
      ...userBuilder({ id }),
      avatar: null,
    }) as ExistingUser;

  const existingEmailAddressBuilder = (userId: string, email: string): ExistingEmailAddress =>
    ({
      ...emailAddressBuilder({ userId, email }),
      user: userBuilder({ id: userId }),
    }) as ExistingEmailAddress;

  beforeEach(async () => {
    userRepository = createMock<UserRepository>();
    emailAddressRepository = createMock<EmailAddressRepository>();
    hashingService = createMock<HashingService>();
    mockPrismaClient = createMock<PrismaClient>();
    unitOfWork = createMock<UnitOfWorkService>();

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
        { provide: EmailAddressRepository, useValue: emailAddressRepository },
        { provide: HashingService, useValue: hashingService },
        { provide: PrismaService, useValue: prismaService },
        { provide: UnitOfWorkService, useValue: unitOfWork },
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
      emailAddressRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      mockPrismaClient.emailAddress.create.mockResolvedValue(
        emailAddressBuilder({
          id: 'email-id',
          email: 'test@example.com',
          userId: mockUser.id,
          status: EmailStatus.verified,
        }),
      );

      const command = new RegisterCommand(mockPayload);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(emailAddressRepository.findOne).toHaveBeenCalledWith({
        email: mockPayload.email,
        type: 'primary',
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({ username: mockPayload.username });
      expect(hashingService.hash).toHaveBeenCalledWith(mockPayload.password);

      expect(unitOfWork.runInTransaction).toHaveBeenCalled();
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          username: mockPayload.username,
          password: 'hashed-password',
          firstName: mockPayload.firstName,
          lastName: mockPayload.lastName,
          birthDate: '2000-01-01', // ISO 8601 format (YYYY-MM-DD)
          gender: mockPayload.gender,
        },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          gender: true,
          description: true,
          avatarId: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });
      expect(mockPrismaClient.emailAddress.create).toHaveBeenCalledWith({
        data: {
          email: mockPayload.email,
          status: EmailStatus.verified,
          userId: mockUser.id,
        },
      });
      expect(result).toEqual(UserSchema.parse(mockUser));
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      emailAddressRepository.findOne.mockResolvedValue(
        existingEmailAddressBuilder('existing-email-id', mockPayload.email),
      );
      userRepository.findOne.mockResolvedValue(null);

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Email already exists');

      expect(emailAddressRepository.findOne).toHaveBeenCalledWith({
        email: mockPayload.email,
        type: 'primary',
      });
      // Username check is now called in parallel (not skipped)
      expect(userRepository.findOne).toHaveBeenCalledWith({ username: mockPayload.username });
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      emailAddressRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(existingUserBuilder('existing-user-id'));

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Username already exists');

      expect(emailAddressRepository.findOne).toHaveBeenCalledWith({
        email: mockPayload.email,
        type: 'primary',
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({ username: mockPayload.username });
    });

    it('should prioritize email conflict over username when both exist', async () => {
      // Arrange
      emailAddressRepository.findOne.mockResolvedValue(
        existingEmailAddressBuilder('existing-email-id', mockPayload.email),
      );
      userRepository.findOne.mockResolvedValue(existingUserBuilder('existing-user-id'));

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      // Email error should be thrown first (email check is prioritized)
      await expect(handler.execute(command)).rejects.toThrow('Email already exists');
      expect(emailAddressRepository.findOne).toHaveBeenCalledWith({
        email: mockPayload.email,
        type: 'primary',
      });
      expect(userRepository.findOne).toHaveBeenCalledWith({ username: mockPayload.username });
    });

    it('should throw error if user creation fails', async () => {
      // Arrange
      emailAddressRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');

      mockPrismaClient.user.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });

    it('should throw error if email creation fails', async () => {
      // Arrange
      emailAddressRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');

      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      mockPrismaClient.emailAddress.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });

    it('should successfully register a user with minimal fields', async () => {
      // Arrange
      const minimalPayload = {
        ...mockPayload,
        lastName: null,
      };
      const minimalUser = userBuilder({ lastName: null });

      emailAddressRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(minimalUser);
      mockPrismaClient.emailAddress.create.mockResolvedValue(emailAddressBuilder());

      const command = new RegisterCommand(minimalPayload as any);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.lastName).toBeNull();
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
