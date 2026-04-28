import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRepository } from './user.repository';
import { PrismaService } from '../services/prisma.service';
import { EmailType, Prisma, User } from '@repo/db';

describe('UserRepository', () => {
  let repository: UserRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    emailAddress: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  });

  beforeEach(() => {
    mockPrismaClient = createMockPrismaClient();
    mockMainClient = createMockPrismaClient();

    const mockPrismaService = {
      get client() {
        return mockPrismaClient;
      },
      get mainClient() {
        return mockMainClient;
      },
    } as unknown as PrismaService;

    prismaService = mockPrismaService;
    repository = new UserRepository(prismaService);
  });

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    birthDate: null,
    gender: null,
    description: null,
    password: 'hashedpassword',
    avatarId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return user by id without include', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.getById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return user by id with include', async () => {
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithInclude as unknown as User);

      const result = await repository.getById('user-1', { include: { emailAddresses: true } });

      expect(result).toEqual(userWithInclude);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { emailAddresses: true },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if user is soft-deleted', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getByUsername', () => {
    it('should return user by username without include', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.getByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should return user by username with include', async () => {
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.user.findUnique.mockResolvedValue(userWithInclude as unknown as User);

      const result = await repository.getByUsername('testuser', { include: { emailAddresses: true } });

      expect(result).toEqual(userWithInclude);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        include: { emailAddresses: true },
      });
    });

    it('should return null if user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const result = await repository.getByUsername('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if user is soft-deleted', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getByUsername('testuser');

      expect(result).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return user by email without include', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: mockUser,
        type: EmailType.primary,
        deletedAt: null,
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: true } }>);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { user: true },
      });
    });

    it('should return user by email with include', async () => {
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: userWithInclude,
        type: EmailType.primary,
        deletedAt: null,
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: { include: { emailAddresses: true } } } }>);

      const result = await repository.getByEmail('test@example.com', { userInclude: { emailAddresses: true } });

      expect(result).toEqual(userWithInclude);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { user: { include: { emailAddresses: true } } },
      });
    });

    it('should return null if email not found', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(null);

      const result = await repository.getByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null if email is deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: mockUser,
        type: EmailType.primary,
        deletedAt: new Date(),
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: true } }>);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if email is not primary', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: mockUser,
        type: EmailType.recovery,
        deletedAt: null,
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: true } }>);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if user is null', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: null,
        type: EmailType.primary,
        deletedAt: null,
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: true } }>);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if user is deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        user: { ...mockUser, deletedAt: new Date() },
        type: EmailType.primary,
        deletedAt: null,
      } as unknown as Prisma.EmailAddressGetPayload<{ include: { user: true } }>);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated users without filter or orderBy', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([mockUser]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockUser]);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated users with filter and orderBy', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([mockUser]);
      const filter = { firstName: 'Test' } as Prisma.UserWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.UserOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockUser]);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { firstName: 'Test', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated users with deletedAt filter', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([mockUser]);
      const filter = { deletedAt: new Date('2024-01-02') };

      await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated users with include', async () => {
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.user.findMany.mockResolvedValue([userWithInclude] as unknown as User[]);

      await repository.getPaginated(1, 10, undefined, undefined, { include: { emailAddresses: true } });

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
        include: { emailAddresses: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if user exists', async () => {
      mockPrismaClient.user.count.mockResolvedValue(1);

      const result = await repository.exists('user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
      });
    });

    it('should return false if user does not exist', async () => {
      mockPrismaClient.user.count.mockResolvedValue(0);

      const result = await repository.exists('user-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count users without filter', async () => {
      mockPrismaClient.user.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count users with filter', async () => {
      mockPrismaClient.user.count.mockResolvedValue(3);
      const filter = { firstName: 'Test' } as Prisma.UserWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { firstName: 'Test', deletedAt: null },
      });
    });

    it('should count users with deletedAt filter', async () => {
      mockPrismaClient.user.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.user.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('create', () => {
    it('should create user without include', async () => {
      const createInput = {
        username: 'newuser',
        firstName: 'New',
        password: 'hash',
      } as Prisma.UserCreateInput;
      mockPrismaClient.user.create.mockResolvedValue(mockUser);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create user with include', async () => {
      const createInput = {
        username: 'newuser',
        firstName: 'New',
        password: 'hash',
      } as Prisma.UserCreateInput;
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.user.create.mockResolvedValue(userWithInclude as unknown as User);

      const result = await repository.create(createInput, { include: { emailAddresses: true } });

      expect(result).toEqual(userWithInclude);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: createInput,
        include: { emailAddresses: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many users without include', async () => {
      const createInputs = [
        { username: 'user1', firstName: 'User', password: 'hash1' },
        { username: 'user2', firstName: 'User', password: 'hash2' },
      ] as Prisma.UserCreateManyInput[];
      mockPrismaClient.user.createManyAndReturn.mockResolvedValue([mockUser]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockUser]);
      expect(mockPrismaClient.user.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many users with include', async () => {
      const createInputs = [{ username: 'user1', firstName: 'User', password: 'hash1' }] as Prisma.UserCreateManyInput[];
      const usersWithInclude = [{ ...mockUser, emailAddresses: [] }];
      mockPrismaClient.user.createManyAndReturn.mockResolvedValue(usersWithInclude as unknown as User[]);

      await repository.createMany(createInputs, { include: { emailAddresses: true } });

      expect(mockPrismaClient.user.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { emailAddresses: true },
      });
    });
  });

  describe('update', () => {
    it('should update user without include', async () => {
      const updateInput = { firstName: 'Updated' } as Prisma.UserUpdateInput;
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await repository.update('user-1', updateInput);

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'user-1' },
      });
    });

    it('should update user with include', async () => {
      const updateInput = { firstName: 'Updated' } as Prisma.UserUpdateInput;
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockPrismaClient.user.update.mockResolvedValue(userWithInclude as unknown as User);

      await repository.update('user-1', updateInput, { include: { emailAddresses: true } });

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        data: updateInput,
        where: { id: 'user-1' },
        include: { emailAddresses: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many users without include', async () => {
      const updates = [
        { id: 'user-1', data: { firstName: 'Updated 1' } as Prisma.UserUpdateInput },
        { id: 'user-2', data: { firstName: 'Updated 2' } as Prisma.UserUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.user.update.mockResolvedValue(mockUser);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many users with include', async () => {
      const updates = [
        { id: 'user-1', data: { firstName: 'Updated 1' } as Prisma.UserUpdateInput },
      ];
      const userWithInclude = { ...mockUser, emailAddresses: [] };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.user.update.mockResolvedValue(userWithInclude as unknown as User);

      await repository.updateMany(updates, { include: { emailAddresses: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hard delete user', async () => {
      mockPrismaClient.user.delete.mockResolvedValue(mockUser);

      const result = await repository.delete('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      const deletedUser = { ...mockUser, deletedAt: new Date() };
      mockPrismaClient.user.update.mockResolvedValue(deletedUser);

      const result = await repository.softDelete('user-1');

      expect(result).toEqual(deletedUser);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many users', async () => {
      mockPrismaClient.user.findMany.mockResolvedValue([mockUser]);
      mockPrismaClient.user.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['user-1', 'user-2']);

      expect(result).toEqual([mockUser]);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
      });
      expect(mockPrismaClient.user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many users', async () => {
      const usersToDelete = [
        { ...mockUser, id: 'user-1' },
        { ...mockUser, id: 'user-2' },
      ];
      mockPrismaClient.user.findMany.mockResolvedValue(usersToDelete);
      mockPrismaClient.user.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['user-1', 'user-2']);

      expect(result).toEqual(usersToDelete);
      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
