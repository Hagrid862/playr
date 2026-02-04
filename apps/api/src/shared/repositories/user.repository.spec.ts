import { Test, TestingModule } from '@nestjs/testing';
import { UserRepository } from './user.repository';
import { PrismaService } from '../services/prisma.service';
import { User, Gender, EmailAddress, EmailType, UserCreateInput } from '@repo/db';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { PrismaClient } from '@repo/db';

describe('UserRepository', () => {
  let repository: UserRepository;

  const mockUser: User = {
    id: 'user-id-123',
    username: 'testuser',
    password: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    birthDate: '01-01-2000',
    gender: Gender.male,
    createdAt: new Date(),
    updatedAt: new Date(),
    avatarId: null,
    description: null,
    deletedAt: null,
  };

  let mockTx: DeepMocked<PrismaClient>;

  beforeEach(async () => {
    mockTx = createMock<PrismaClient>();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useValue: {
            client: mockTx,
          },
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getById', () => {
    it('should return a user if found', async () => {
      mockTx.user.findUnique.mockResolvedValue(mockUser);
      const result = await repository.getById('user-id-123');
      expect(result).toEqual(mockUser);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-id-123' } });
    });

    it('should return null if not found', async () => {
      mockTx.user.findUnique.mockResolvedValue(null);
      const result = await repository.getById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getByUsername', () => {
    it('should return a user if found', async () => {
      mockTx.user.findUnique.mockResolvedValue(mockUser);
      const result = await repository.getByUsername('testuser');
      expect(result).toEqual(mockUser);
      expect(mockTx.user.findUnique).toHaveBeenCalledWith({ where: { username: 'testuser' } });
    });
  });

  describe('getByEmail', () => {
    it('should return user associated with primary email', async () => {
      mockTx.emailAddress.findFirst.mockResolvedValue(
        createMock<EmailAddress & { user: User }>({
          id: 'email-id',
          email: 'test@example.com',
          type: EmailType.primary,
          user: mockUser,
        }),
      );

      const result = await repository.getByEmail('test@example.com');
      expect(result).toEqual(mockUser);
      expect(mockTx.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', type: 'primary' },
        include: { user: true },
      });
    });

    it('should return null if email not found', async () => {
      mockTx.emailAddress.findFirst.mockResolvedValue(null);
      const result = await repository.getByEmail('non-existent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a user', async () => {
      mockTx.user.create.mockResolvedValue(mockUser);
      const userCreateInput: UserCreateInput = {
        username: 'newuser',
        password: 'password',
        firstName: 'New',
        lastName: 'User',
        birthDate: '01-01-2000',
        gender: mockUser.gender,
      };

      const result = await repository.create(userCreateInput);
      expect(result).toEqual(mockUser);
      expect(mockTx.user.create).toHaveBeenCalledWith({ data: userCreateInput });
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updatedUser = { ...mockUser, firstName: 'Updated' };
      mockTx.user.update.mockResolvedValue(updatedUser);

      const result = await repository.update(mockUser.id, { firstName: 'Updated' });
      expect(result).toEqual(updatedUser);
      expect(mockTx.user.update).toHaveBeenCalledWith({
        data: { firstName: 'Updated' },
        where: { id: mockUser.id },
      });
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      mockTx.user.delete.mockResolvedValue(mockUser);
      const result = await repository.delete(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: mockUser.id } });
    });
  });
});
