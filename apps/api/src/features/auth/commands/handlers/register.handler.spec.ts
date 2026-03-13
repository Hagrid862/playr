import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { UnitOfWorkService } from '@/shared/services/unit-of-work.service';
import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserSchema } from '@repo/contracts';
import { EmailStatus } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { buildUser, createMockPrismaClient, createMockPrismaService } from '@repo/testing';
import type { RegisterRequestDto } from '../../dto/register.request.dto';
import { RegisterCommand } from '../impl/register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: DeepMocked<UserRepository>;
  let hashingService: DeepMocked<HashingService>;
  let prismaService: ReturnType<typeof createMockPrismaService>;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

  const mockUser = buildUser();
  const mockPayload: RegisterRequestDto = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password1!',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male',
  };

  beforeEach(async () => {
    userRepository = createMock<UserRepository>();
    hashingService = createMock<HashingService>();
    mockPrismaClient = createMockPrismaClient();
    unitOfWork = createMock<UnitOfWorkService>();
    unitOfWork.runInTransaction.mockImplementation(async (work) => work());
    prismaService = createMockPrismaService({ client: mockPrismaClient });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterHandler,
        { provide: UserRepository, useValue: userRepository },
        { provide: HashingService, useValue: hashingService },
        { provide: PrismaService, useValue: prismaService },
        { provide: UnitOfWorkService, useValue: unitOfWork },
      ],
    }).compile();

    handler = module.get<RegisterHandler>(RegisterHandler);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      mockPrismaClient.emailAddress.create.mockResolvedValue({
        id: 'email-id',
        email: 'test@example.com',
        userId: mockUser.id,
        type: 'primary',
        status: EmailStatus.verified,
        updatedAt: new Date(),
        createdAt: new Date(),
        verifiedAt: null,
        deletedAt: null,
      });

      const command = new RegisterCommand(mockPayload);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
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
      userRepository.getByEmail.mockResolvedValue(buildUser({ id: 'existing-email-id' }));
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
      // Same assumption for getByUsername
      userRepository.getByUsername.mockResolvedValue(buildUser({ id: 'existing-user-id' }));

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Username already exists');

      expect(userRepository.getByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.getByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

    it('should prioritize email conflict over username when both exist', async () => {
      // Arrange
      userRepository.getByEmail.mockResolvedValue(buildUser({ id: 'existing-email-id' }));
      userRepository.getByUsername.mockResolvedValue(buildUser({ id: 'existing-user-id' }));

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

      mockPrismaClient.user.create.mockResolvedValue(mockUser);
      mockPrismaClient.emailAddress.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });

    it('should successfully register another user', async () => {
      // Arrange
      const minimalPayload: RegisterRequestDto = {
        email: 'test2@example.com',
        username: 'testuser2',
        password: 'Password1!',
        firstName: 'Bob',
        lastName: 'Smith',
        birthDate: '2000-01-01',
        gender: 'male',
      };

      const minimalUser = buildUser({ lastName: 'Smith' });

      userRepository.getByEmail.mockResolvedValue(null);
      userRepository.getByUsername.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      mockPrismaClient.user.create.mockResolvedValue(minimalUser);
      mockPrismaClient.emailAddress.create.mockResolvedValue({
        id: 'email-id',
        email: minimalPayload.email,
        userId: minimalUser.id,
        type: 'primary',
        status: EmailStatus.verified,
        updatedAt: new Date(),
        createdAt: new Date(),
        verifiedAt: null,
        deletedAt: null,
      });

      const command = new RegisterCommand(minimalPayload);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.lastName).toBe('Smith');
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lastName: 'Smith',
          }),
        }),
      );
    });
  });
});
