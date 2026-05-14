import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailAddressRepository } from './email-address.repository';
import { PrismaService } from '../services/prisma.service';
import { EmailAddress, EmailStatus, EmailType, Prisma, User } from '@repo/db';

describe('EmailAddressRepository', () => {
  let repository: EmailAddressRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    emailAddress: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      createManyAndReturn: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
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
    repository = new EmailAddressRepository(prismaService);
  });

  const mockUser: User = {
    id: 'user-1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    birthDate: null,
    gender: null,
    description: null,
    password: 'hash',
    avatarId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockEmailAddress: EmailAddress = {
    id: 'email-1',
    email: 'test@example.com',
    userId: 'user-1',
    type: EmailType.primary,
    status: EmailStatus.verified,
    verifiedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return email address by id without include', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(mockEmailAddress);

      const result = await repository.getById('email-1');

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { id: 'email-1' },
      });
    });

    it('should return email address by id with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.getById('email-1', { include: { user: true } });

      expect(result).toEqual(emailWithInclude);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        include: { user: true },
      });
    });

    it('should return null if email not found', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if email is soft-deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('email-1');

      expect(result).toBeNull();
    });
  });

  describe('getByEmail', () => {
    it('should return email address by email without include', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(mockEmailAddress);

      const result = await repository.getByEmail('test@example.com');

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return email address by email with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.getByEmail('test@example.com', { include: { user: true } });

      expect(result).toEqual(emailWithInclude);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { user: true },
      });
    });

    it('should return null if email not found', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(null);

      const result = await repository.getByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });

    it('should return null if email is soft-deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getByEmail('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getPrimaryByEmailWithUser', () => {
    it('should return primary email with user', async () => {
      const emailWithUser = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(
        emailWithUser as unknown as EmailAddress,
      );

      const result = await repository.getPrimaryByEmailWithUser('test@example.com');

      expect(result).toEqual(emailWithUser);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { user: true },
      });
    });

    it('should return primary email with user include', async () => {
      const emailWithUser = { ...mockEmailAddress, user: { ...mockUser, emailAddresses: [] } };
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue(
        emailWithUser as unknown as EmailAddress,
      );

      const result = await repository.getPrimaryByEmailWithUser('test@example.com', {
        includeUser: { emailAddresses: true },
      });

      expect(result).toEqual(emailWithUser);
      expect(mockPrismaClient.emailAddress.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: { user: { include: { emailAddresses: true } } },
      });
    });

    it('should return null if email is deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        deletedAt: new Date(),
        user: mockUser,
      } as unknown as EmailAddress);

      const result = await repository.getPrimaryByEmailWithUser('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if email is not primary', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        type: EmailType.recovery,
        user: mockUser,
      } as unknown as EmailAddress);

      const result = await repository.getPrimaryByEmailWithUser('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if user is deleted', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        user: { ...mockUser, deletedAt: new Date() },
      } as unknown as EmailAddress);

      const result = await repository.getPrimaryByEmailWithUser('test@example.com');

      expect(result).toBeNull();
    });

    it('should return null if user is missing', async () => {
      mockPrismaClient.emailAddress.findUnique.mockResolvedValue({
        ...mockEmailAddress,
        user: null,
      } as unknown as EmailAddress);

      const result = await repository.getPrimaryByEmailWithUser('test@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated email addresses without filter or orderBy', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated email addresses with filter and orderBy', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);
      const filter = { userId: 'user-1' } as Prisma.EmailAddressWhereInput;
      const orderBy = { email: 'asc' } as Prisma.EmailAddressOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { email: 'asc' },
      });
    });

    it('should return paginated email addresses with deletedAt filter', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated email addresses with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        emailWithInclude,
      ] as unknown as EmailAddress[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, {
        include: { user: true },
      });

      expect(result).toEqual([emailWithInclude]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });
  });

  describe('getAllByUserId', () => {
    it('should return all email addresses for user without include', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);

      const result = await repository.getAllByUserId('user-1');

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should return all email addresses for user with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        emailWithInclude,
      ] as unknown as EmailAddress[]);

      const result = await repository.getAllByUserId('user-1', { include: { user: true } });

      expect(result).toEqual([emailWithInclude]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('getPrimaryByUserId', () => {
    it('should return primary email for user without include', async () => {
      mockPrismaClient.emailAddress.findFirst.mockResolvedValue(mockEmailAddress);

      const result = await repository.getPrimaryByUserId('user-1');

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.primary, deletedAt: null },
      });
    });

    it('should return primary email for user with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findFirst.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.getPrimaryByUserId('user-1', { include: { user: true } });

      expect(result).toEqual(emailWithInclude);
      expect(mockPrismaClient.emailAddress.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.primary, deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('getRecoveryByUserId', () => {
    it('should return recovery emails for user without include', async () => {
      const recoveryEmail = { ...mockEmailAddress, type: EmailType.recovery };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([recoveryEmail]);

      const result = await repository.getRecoveryByUserId('user-1');

      expect(result).toEqual([recoveryEmail]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.recovery, deletedAt: null },
      });
    });

    it('should return recovery emails for user with include', async () => {
      const recoveryEmail = { ...mockEmailAddress, type: EmailType.recovery, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        recoveryEmail,
      ] as unknown as EmailAddress[]);

      const result = await repository.getRecoveryByUserId('user-1', { include: { user: true } });

      expect(result).toEqual([recoveryEmail]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.recovery, deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('getByTypeAndUserId', () => {
    it('should return emails by type for user without include', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);

      const result = await repository.getByTypeAndUserId(EmailType.primary, 'user-1');

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.primary, deletedAt: null },
      });
    });

    it('should return emails by type for user with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        emailWithInclude,
      ] as unknown as EmailAddress[]);

      const result = await repository.getByTypeAndUserId(EmailType.recovery, 'user-1', {
        include: { user: true },
      });

      expect(result).toEqual([emailWithInclude]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: EmailType.recovery, deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('getByStatusAndUserId', () => {
    it('should return emails by status for user without include', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);

      const result = await repository.getByStatusAndUserId(EmailStatus.verified, 'user-1');

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { status: EmailStatus.verified, userId: 'user-1', deletedAt: null },
      });
    });

    it('should return emails by status for user with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        emailWithInclude,
      ] as unknown as EmailAddress[]);

      const result = await repository.getByStatusAndUserId(EmailStatus.pending, 'user-1', {
        include: { user: true },
      });

      expect(result).toEqual([emailWithInclude]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { status: EmailStatus.pending, userId: 'user-1', deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('getVerifiedByUserId', () => {
    it('should return verified emails for user without include', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);

      const result = await repository.getVerifiedByUserId('user-1');

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: EmailStatus.verified, deletedAt: null },
      });
    });

    it('should return verified emails for user with include', async () => {
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([
        emailWithInclude,
      ] as unknown as EmailAddress[]);

      const result = await repository.getVerifiedByUserId('user-1', { include: { user: true } });

      expect(result).toEqual([emailWithInclude]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: EmailStatus.verified, deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if email address exists', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(1);

      const result = await repository.exists('email-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { id: 'email-1', deletedAt: null },
      });
    });

    it('should return false if email address does not exist', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(0);

      const result = await repository.exists('email-1');

      expect(result).toBe(false);
    });
  });

  describe('existsByEmail', () => {
    it('should return true if email exists', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(1);

      const result = await repository.existsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { email: 'test@example.com', deletedAt: null },
      });
    });

    it('should return false if email does not exist', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(0);

      const result = await repository.existsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });
  });

  describe('existsByUserId', () => {
    it('should return true if user has any email', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(2);

      const result = await repository.existsByUserId('user-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should return false if user has no emails', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(0);

      const result = await repository.existsByUserId('user-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count email addresses without filter', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count email addresses with filter', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(3);
      const filter = { userId: 'user-1' } as Prisma.EmailAddressWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should count email addresses with deletedAt filter', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(result).toBe(1);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('countPerUserId', () => {
    it('should count email addresses for user', async () => {
      mockPrismaClient.emailAddress.count.mockResolvedValue(3);

      const result = await repository.countPerUserId('user-1');

      expect(result).toBe(3);
      expect(mockPrismaClient.emailAddress.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });
  });

  describe('create', () => {
    it('should create email address without include', async () => {
      const createInput: Prisma.EmailAddressCreateInput = {
        email: 'new@example.com',
        type: EmailType.primary,
        status: EmailStatus.pending,
        user: { connect: { id: 'user-1' } },
      };
      mockPrismaClient.emailAddress.create.mockResolvedValue(mockEmailAddress);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create email address with include', async () => {
      const createInput: Prisma.EmailAddressCreateInput = {
        email: 'new@example.com',
        type: EmailType.primary,
        status: EmailStatus.pending,
        user: { connect: { id: 'user-1' } },
      };
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.create.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.create(createInput, { include: { user: true } });

      expect(result).toEqual(emailWithInclude);
      expect(mockPrismaClient.emailAddress.create).toHaveBeenCalledWith({
        data: createInput,
        include: { user: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many email addresses without include', async () => {
      const createInputs: Prisma.EmailAddressCreateManyInput[] = [
        {
          email: 'email1@example.com',
          userId: 'user-1',
          type: EmailType.primary,
          status: EmailStatus.pending,
        },
        {
          email: 'email2@example.com',
          userId: 'user-1',
          type: EmailType.recovery,
          status: EmailStatus.pending,
        },
      ];
      mockPrismaClient.emailAddress.createManyAndReturn.mockResolvedValue([mockEmailAddress]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many email addresses with include', async () => {
      const createInputs: Prisma.EmailAddressCreateManyInput[] = [
        {
          email: 'email1@example.com',
          userId: 'user-1',
          type: EmailType.primary,
          status: EmailStatus.pending,
        },
      ];
      const emailsWithInclude = [{ ...mockEmailAddress, user: mockUser }];
      mockPrismaClient.emailAddress.createManyAndReturn.mockResolvedValue(
        emailsWithInclude as unknown as EmailAddress[],
      );

      const result = await repository.createMany(createInputs, { include: { user: true } });

      expect(result).toEqual(emailsWithInclude);
      expect(mockPrismaClient.emailAddress.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { user: true },
      });
    });
  });

  describe('update', () => {
    it('should update email address without include', async () => {
      const updateInput = { email: 'updated@example.com' } as Prisma.EmailAddressUpdateInput;
      mockPrismaClient.emailAddress.update.mockResolvedValue(mockEmailAddress);

      const result = await repository.update('email-1', updateInput);

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: updateInput,
      });
    });

    it('should update email address with include', async () => {
      const updateInput = { email: 'updated@example.com' } as Prisma.EmailAddressUpdateInput;
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockPrismaClient.emailAddress.update.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.update('email-1', updateInput, { include: { user: true } });

      expect(result).toEqual(emailWithInclude);
      expect(mockPrismaClient.emailAddress.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: updateInput,
        include: { user: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many email addresses without include', async () => {
      const updates = [
        {
          id: 'email-1',
          data: { email: 'updated1@example.com' } as Prisma.EmailAddressUpdateInput,
        },
        {
          id: 'email-2',
          data: { email: 'updated2@example.com' } as Prisma.EmailAddressUpdateInput,
        },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.emailAddress.update.mockResolvedValue(mockEmailAddress);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many email addresses with include', async () => {
      const updates = [
        {
          id: 'email-1',
          data: { email: 'updated1@example.com' } as Prisma.EmailAddressUpdateInput,
        },
      ];
      const emailWithInclude = { ...mockEmailAddress, user: mockUser };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.emailAddress.update.mockResolvedValue(
        emailWithInclude as unknown as EmailAddress,
      );

      const result = await repository.updateMany(updates, { include: { user: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toEqual([emailWithInclude]);
    });
  });

  describe('delete', () => {
    it('should hard delete email address', async () => {
      mockPrismaClient.emailAddress.delete.mockResolvedValue(mockEmailAddress);

      const result = await repository.delete('email-1');

      expect(result).toEqual(mockEmailAddress);
      expect(mockPrismaClient.emailAddress.delete).toHaveBeenCalledWith({
        where: { id: 'email-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete email address', async () => {
      const deletedEmail = { ...mockEmailAddress, deletedAt: new Date() };
      mockPrismaClient.emailAddress.update.mockResolvedValue(deletedEmail);

      const result = await repository.softDelete('email-1');

      expect(result).toEqual(deletedEmail);
      expect(mockPrismaClient.emailAddress.update).toHaveBeenCalledWith({
        where: { id: 'email-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.emailAddress.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many email addresses', async () => {
      mockPrismaClient.emailAddress.findMany.mockResolvedValue([mockEmailAddress]);
      mockPrismaClient.emailAddress.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['email-1', 'email-2']);

      expect(result).toEqual([mockEmailAddress]);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['email-1', 'email-2'] } },
      });
      expect(mockPrismaClient.emailAddress.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['email-1', 'email-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.emailAddress.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many email addresses', async () => {
      const emailsToDelete = [
        { ...mockEmailAddress, id: 'email-1' },
        { ...mockEmailAddress, id: 'email-2' },
      ];
      mockPrismaClient.emailAddress.findMany.mockResolvedValue(emailsToDelete);
      mockPrismaClient.emailAddress.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['email-1', 'email-2']);

      expect(result).toEqual(emailsToDelete);
      expect(mockPrismaClient.emailAddress.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['email-1', 'email-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.emailAddress.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['email-1', 'email-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
