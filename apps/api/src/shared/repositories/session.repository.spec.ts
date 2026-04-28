import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionRepository } from './session.repository';
import { PrismaService } from '../services/prisma.service';
import { Prisma, Session } from '@repo/db';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    session: {
      findUnique: vi.fn(),
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
    repository = new SessionRepository(prismaService);
  });

  const mockSession: Session = {
    id: 'session-1',
    userId: 'user-1',
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0',
    expiresAt: new Date('2024-12-31'),
    revokedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return session by id without include', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(mockSession);

      const result = await repository.getById('session-1');

      expect(result).toEqual(mockSession);
      expect(mockPrismaClient.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });

    it('should return session by id with include', async () => {
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockPrismaClient.session.findUnique.mockResolvedValue(sessionWithInclude as unknown as Session);

      const result = await repository.getById('session-1', { include: { user: true } });

      expect(result).toEqual(sessionWithInclude);
      expect(mockPrismaClient.session.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        include: { user: true },
      });
    });

    it('should return null if session not found', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if session is soft-deleted', async () => {
      mockPrismaClient.session.findUnique.mockResolvedValue({
        ...mockSession,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('session-1');

      expect(result).toBeNull();
    });
  });

  describe('getActiveByUserId', () => {
    it('should return active sessions by user id without include', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([mockSession]);

      const result = await repository.getActiveByUserId('user-1');

      expect(result).toEqual([mockSession]);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return active sessions by user id with include', async () => {
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockPrismaClient.session.findMany.mockResolvedValue([sessionWithInclude] as unknown as Session[]);

      const result = await repository.getActiveByUserId('user-1', { include: { user: true } });

      expect(result).toEqual([sessionWithInclude]);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });
  });

  describe('getPaginated', () => {
    it('should return paginated sessions without filter or orderBy', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([mockSession]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockSession]);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated sessions with filter and orderBy', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([mockSession]);
      const filter = { userId: 'user-1' } as Prisma.SessionWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.SessionOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockSession]);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated sessions with deletedAt filter', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([mockSession]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: undefined,
      });
    });

    it('should return paginated sessions with include', async () => {
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockPrismaClient.session.findMany.mockResolvedValue([sessionWithInclude] as unknown as Session[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { user: true } });

      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
        include: { user: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if session exists', async () => {
      mockPrismaClient.session.count.mockResolvedValue(1);

      const result = await repository.exists('session-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
        where: { id: 'session-1', deletedAt: null },
      });
    });

    it('should return false if session does not exist', async () => {
      mockPrismaClient.session.count.mockResolvedValue(0);

      const result = await repository.exists('session-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count sessions without filter', async () => {
      mockPrismaClient.session.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count sessions with filter', async () => {
      mockPrismaClient.session.count.mockResolvedValue(3);
      const filter = { userId: 'user-1' } as Prisma.SessionWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should count sessions with deletedAt filter', async () => {
      mockPrismaClient.session.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('countActiveByUserId', () => {
    it('should count active sessions by user id', async () => {
      mockPrismaClient.session.count.mockResolvedValue(3);

      const result = await repository.countActiveByUserId('user-1');

      expect(result).toBe(3);
      expect(mockPrismaClient.session.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          revokedAt: null,
          deletedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }],
        },
      });
    });
  });

  describe('create', () => {
    it('should create session without include', async () => {
      const createInput = { userId: 'user-1', ipAddress: '127.0.0.1' } as Prisma.SessionCreateInput;
      mockPrismaClient.session.create.mockResolvedValue(mockSession);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockSession);
      expect(mockPrismaClient.session.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create session with include', async () => {
      const createInput = { userId: 'user-1', ipAddress: '127.0.0.1' } as Prisma.SessionCreateInput;
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockPrismaClient.session.create.mockResolvedValue(sessionWithInclude as unknown as Session);

      const result = await repository.create(createInput, { include: { user: true } });

      expect(result).toEqual(sessionWithInclude);
      expect(mockPrismaClient.session.create).toHaveBeenCalledWith({
        data: createInput,
        include: { user: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many sessions without include', async () => {
      const createInputs = [{ userId: 'user-1' }, { userId: 'user-2' }] as Prisma.SessionCreateManyInput[];
      mockPrismaClient.session.createManyAndReturn.mockResolvedValue([mockSession]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockSession]);
      expect(mockPrismaClient.session.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many sessions with include', async () => {
      const createInputs = [{ userId: 'user-1' }] as Prisma.SessionCreateManyInput[];
      const sessionsWithInclude = [{ ...mockSession, user: { id: 'user-1' } }];
      mockPrismaClient.session.createManyAndReturn.mockResolvedValue(sessionsWithInclude as unknown as Session[]);

      const result = await repository.createMany(createInputs, { include: { user: true } });

      expect(mockPrismaClient.session.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { user: true },
      });
    });
  });

  describe('update', () => {
    it('should update session without include', async () => {
      const updateInput = { ipAddress: '192.168.1.1' } as Prisma.SessionUpdateInput;
      mockPrismaClient.session.update.mockResolvedValue(mockSession);

      const result = await repository.update('session-1', updateInput);

      expect(result).toEqual(mockSession);
      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: updateInput,
      });
    });

    it('should update session with include', async () => {
      const updateInput = { ipAddress: '192.168.1.1' } as Prisma.SessionUpdateInput;
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockPrismaClient.session.update.mockResolvedValue(sessionWithInclude as unknown as Session);

      const result = await repository.update('session-1', updateInput, { include: { user: true } });

      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: updateInput,
        include: { user: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many sessions without include', async () => {
      const updates = [
        { id: 'session-1', data: { ipAddress: '192.168.1.1' } as Prisma.SessionUpdateInput },
        { id: 'session-2', data: { ipAddress: '192.168.1.2' } as Prisma.SessionUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.session.update.mockResolvedValue(mockSession);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many sessions with include', async () => {
      const updates = [
        { id: 'session-1', data: { ipAddress: '192.168.1.1' } as Prisma.SessionUpdateInput },
      ];
      const sessionWithInclude = { ...mockSession, user: { id: 'user-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.session.update.mockResolvedValue(sessionWithInclude as unknown as Session);

      const result = await repository.updateMany(updates, { include: { user: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('should revoke session without include', async () => {
      const revokedSession = { ...mockSession, revokedAt: new Date() };
      mockPrismaClient.session.update.mockResolvedValue(revokedSession);

      const result = await repository.revoke('session-1');

      expect(result).toEqual(revokedSession);
      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke session with include', async () => {
      const revokedSession = { ...mockSession, revokedAt: new Date(), user: { id: 'user-1' } };
      mockPrismaClient.session.update.mockResolvedValue(revokedSession as unknown as Session);

      const result = await repository.revoke('session-1', { include: { user: true } });

      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
        include: { user: true },
      });
    });
  });

  describe('revokeAllByUserId', () => {
    it('should revoke all sessions by user id', async () => {
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 3 });

      await repository.revokeAllByUserId('user-1');

      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('delete', () => {
    it('should hard delete session', async () => {
      mockPrismaClient.session.delete.mockResolvedValue(mockSession);

      const result = await repository.delete('session-1');

      expect(result).toEqual(mockSession);
      expect(mockPrismaClient.session.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete session', async () => {
      const deletedSession = { ...mockSession, deletedAt: new Date() };
      mockPrismaClient.session.update.mockResolvedValue(deletedSession);

      const result = await repository.softDelete('session-1');

      expect(result).toEqual(deletedSession);
      expect(mockPrismaClient.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.session.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many sessions', async () => {
      mockPrismaClient.session.findMany.mockResolvedValue([mockSession]);
      mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['session-1', 'session-2']);

      expect(result).toEqual([mockSession]);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
      });
      expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] } },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.session.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many sessions', async () => {
      const sessionsToDelete = [
        { ...mockSession, id: 'session-1' },
        { ...mockSession, id: 'session-2' },
      ];
      mockPrismaClient.session.findMany.mockResolvedValue(sessionsToDelete);
      mockPrismaClient.session.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['session-1', 'session-2']);

      expect(result).toEqual(sessionsToDelete);
      expect(mockPrismaClient.session.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.session.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['session-1', 'session-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('deleteExpired', () => {
    it('should delete expired sessions', async () => {
      mockPrismaClient.session.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.deleteExpired();

      expect(result).toBe(5);
      expect(mockPrismaClient.session.deleteMany).toHaveBeenCalledWith({
        where: {
          OR: [{ expiresAt: { lt: expect.any(Date) } }, { revokedAt: { not: null } }],
        },
      });
    });
  });
});
