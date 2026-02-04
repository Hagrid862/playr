import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailAddress, EmailType, Gender, PrismaClient, User, UserCreateInput } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../services/prisma.service';
import { UserRepository } from './user.repository';

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
            mainClient: mockTx,
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

  describe('getByEmailWithStatus', () => {
    it('should return user with email status', async () => {
      const mockResult = { ...mockUser, emailStatus: 'verified' };
      mockTx.emailAddress.findFirst.mockResolvedValue({
        user: mockUser,
        status: 'verified',
      } as any);

      const result = await repository.getByEmailWithStatus('test@example.com');
      expect(result).toEqual(mockResult);
      expect(mockTx.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com', type: 'primary' },
        include: { user: true },
      });
    });

    it('should return null if email not found for status check', async () => {
      mockTx.emailAddress.findFirst.mockResolvedValue(null);
      const result = await repository.getByEmailWithStatus('missing@example.com');
      expect(result).toBeNull();
      expect(mockTx.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { email: 'missing@example.com', type: 'primary' },
        include: { user: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated users', async () => {
      mockTx.user.findMany.mockResolvedValue([mockUser]);
      const result = await repository.getPaginated(1, 10);
      expect(result).toEqual([mockUser]);
      expect(mockTx.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: undefined,
        orderBy: undefined,
      });
    });
  });

  describe('EXISTS & COUNT', () => {
    it('exists should return true if user exists', async () => {
      mockTx.user.count.mockResolvedValue(1);
      const result = await repository.exists('user-id');
      expect(result).toBe(true);
      expect(mockTx.user.count).toHaveBeenCalledWith({ where: { id: 'user-id' } });
    });

    it('count should return total number of users', async () => {
      mockTx.user.count.mockResolvedValue(5);
      const result = await repository.count();
      expect(result).toBe(5);
      expect(mockTx.user.count).toHaveBeenCalledWith({ where: undefined });
    });
  });

  describe('createMany', () => {
    it('should create multiple users', async () => {
      mockTx.user.createManyAndReturn.mockResolvedValue([mockUser]);
      const result = await repository.createMany([{} as any]);
      expect(result).toEqual([mockUser]);
      expect(mockTx.user.createManyAndReturn).toHaveBeenCalled();
    });
  });

  describe('updateMany', () => {
    it('should update multiple users in transaction', async () => {
      mockTx.$transaction.mockResolvedValue([mockUser]);
      const updates = [{ id: '1', data: { firstName: 'Updated' } }];
      const result = await repository.updateMany(updates);
      expect(result).toEqual([mockUser]);
      expect(mockTx.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple users', async () => {
      mockTx.user.findMany.mockResolvedValue([mockUser]);
      mockTx.user.deleteMany.mockResolvedValue({ count: 1 } as any);
      const result = await repository.deleteMany({ username: 'test' });
      expect(result).toEqual([mockUser]);
      expect(mockTx.user.deleteMany).toHaveBeenCalledWith({ where: { username: 'test' } });
    });
  });
});
