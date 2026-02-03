import { Test, TestingModule } from '@nestjs/testing';
import { RegisterHandler } from './register.handler';
import { RegisterCommand } from '../impl/register.command';
import { UserRepository } from '@/shared/repositories/user.repository';
import { HashingService } from '@/shared/services/hashing.service';
import { PrismaService } from '@/shared/services/prisma.service';
import { ConflictException } from '@nestjs/common';
import { EmailStatus, User, Gender } from '@repo/db';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RegisterRequestDto } from '../../dto/register.request.dto';

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: UserRepository;
  let hashingService: HashingService;
  let prismaService: PrismaService;

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

  const mockPayload: RegisterRequestDto = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '2000-01-01',
    gender: 'male', // The DTO likely expects the string literal or enum values if it validates against them. Zod schema usually allows strings matching enum.
  };

  const mockTx = {
    user: {
      create: vi.fn(),
    },
    emailAddress: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterHandler,
        {
          provide: UserRepository,
          useValue: {
            GetByEmail: vi.fn(),
            GetByUsername: vi.fn(),
          },
        },
        {
          provide: HashingService,
          useValue: {
            hash: vi.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            client: {
              $transaction: vi.fn((cb) => cb(mockTx)),
            },
          },
        },
      ],
    }).compile();

    handler = module.get<RegisterHandler>(RegisterHandler);
    userRepository = module.get<UserRepository>(UserRepository);
    hashingService = module.get<HashingService>(HashingService);
    prismaService = module.get<PrismaService>(PrismaService);
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
      vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue(null);
      vi.spyOn(hashingService, 'hash').mockResolvedValue('hashed-password');
      mockTx.user.create.mockResolvedValue(mockUser);
      mockTx.emailAddress.create.mockResolvedValue({
        id: 'email-id',
        email: 'test@example.com',
        userId: mockUser.id,
      });

      const command = new RegisterCommand(mockPayload);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(userRepository.GetByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.GetByUsername).toHaveBeenCalledWith(mockPayload.username);
      expect(hashingService.hash).toHaveBeenCalledWith(mockPayload.password);

      expect(prismaService.client.$transaction).toHaveBeenCalled();
      expect(mockTx.user.create).toHaveBeenCalledWith({
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
      expect(mockTx.emailAddress.create).toHaveBeenCalledWith({
        data: {
          email: mockPayload.email,
          status: EmailStatus.verified,
          userId: mockUser.id,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      // Arrange
      vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue({ id: 'existing-email-id' } as any);
      vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue(null);

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Email already exists');

      expect(userRepository.GetByEmail).toHaveBeenCalledWith(mockPayload.email);
      // Username check is now called in parallel (not skipped)
      expect(userRepository.GetByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

    it('should throw ConflictException if username already exists', async () => {
      // Arrange
      vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue(null);
      // Same assumption for GetByUsername
      vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue({
        id: 'existing-user-id',
      } as any);

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow('Username already exists');

      expect(userRepository.GetByEmail).toHaveBeenCalledWith(mockPayload.email);
      expect(userRepository.GetByUsername).toHaveBeenCalledWith(mockPayload.username);
    });

   it('should prioritize email conflict over username when both exist', async () => {
     // Arrange
     vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue({ id: 'existing-email-id' } as any);
     vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue({ id: 'existing-user-id' } as any);

     const command = new RegisterCommand(mockPayload);

     // Act & Assert
     // Email error should be thrown first (email check is prioritized)
     await expect(handler.execute(command)).rejects.toThrow('Email already exists');
     expect(userRepository.GetByEmail).toHaveBeenCalledWith(mockPayload.email);
     expect(userRepository.GetByUsername).toHaveBeenCalledWith(mockPayload.username);
   });

    it('should throw error if user creation fails', async () => {
      // Arrange
      vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue(null);
      vi.spyOn(hashingService, 'hash').mockResolvedValue('hashed-password');

      mockTx.user.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });

    it('should throw error if email creation fails', async () => {
      // Arrange
      vi.spyOn(userRepository, 'GetByEmail').mockResolvedValue(null);
      vi.spyOn(userRepository, 'GetByUsername').mockResolvedValue(null);
      vi.spyOn(hashingService, 'hash').mockResolvedValue('hashed-password');

      mockTx.user.create.mockResolvedValue(mockUser);
      mockTx.emailAddress.create.mockRejectedValue(new Error('Database error')); // Simulate failure

      const command = new RegisterCommand(mockPayload);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Database error');
    });
  });
});
