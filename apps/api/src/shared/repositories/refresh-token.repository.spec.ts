import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PrismaService } from '../services/prisma.service';
import { Prisma, RefreshToken } from '@repo/db';

describe('RefreshTokenRepository', () => {
  let repository: RefreshTokenRepository;
  let prismaService: PrismaService;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  let mockMainClient: ReturnType<typeof createMockPrismaClient>;

  const createMockPrismaClient = () => ({
    refreshToken: {
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
    repository = new RefreshTokenRepository(prismaService);
  });

  const mockRefreshToken: RefreshToken = {
    id: 'refresh-token-1',
    token: 'token123',
    userId: 'user-1',
    sessionId: 'session-1',
    expiresAt: new Date('2024-12-31'),
    revokedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  describe('getById', () => {
    it('should return refresh token by id without include', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);

      const result = await repository.getById('refresh-token-1');

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
      });
    });

    it('should return refresh token by id with include', async () => {
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.getById('refresh-token-1', { include: { user: true } });

      expect(result).toEqual(tokenWithInclude);
      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        include: { user: true },
      });
    });

    it('should return null if refresh token not found', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      const result = await repository.getById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null if refresh token is soft-deleted', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getById('refresh-token-1');

      expect(result).toBeNull();
    });
  });

  describe('getByToken', () => {
    it('should return refresh token by token string without include', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);

      const result = await repository.getByToken('token123');

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'token123' },
      });
    });

    it('should return refresh token by token string with include', async () => {
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.getByToken('token123', { include: { user: true } });

      expect(result).toEqual(tokenWithInclude);
      expect(mockPrismaClient.refreshToken.findUnique).toHaveBeenCalledWith({
        where: { token: 'token123' },
        include: { user: true },
      });
    });

    it('should return null if refresh token not found', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue(null);

      const result = await repository.getByToken('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if refresh token is soft-deleted', async () => {
      mockPrismaClient.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        deletedAt: new Date('2024-01-02'),
      });

      const result = await repository.getByToken('token123');

      expect(result).toBeNull();
    });
  });

  describe('getPaginated', () => {
    it('should return paginated refresh tokens without filter or orderBy', async () => {
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);

      const result = await repository.getPaginated(1, 10);

      expect(result).toEqual([mockRefreshToken]);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
      });
    });

    it('should return paginated refresh tokens with filter and orderBy', async () => {
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      const filter = { userId: 'user-1' } as Prisma.RefreshTokenWhereInput;
      const orderBy = { createdAt: 'desc' } as Prisma.RefreshTokenOrderByWithRelationInput;

      const result = await repository.getPaginated(2, 5, filter, orderBy);

      expect(result).toEqual([mockRefreshToken]);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 5,
        where: { userId: 'user-1', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return paginated refresh tokens with deletedAt filter', async () => {
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.getPaginated(1, 10, filter);

      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: new Date('2024-01-02') },
        orderBy: undefined,
      });
    });

    it('should return paginated refresh tokens with include', async () => {
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([tokenWithInclude] as unknown as RefreshToken[]);

      const result = await repository.getPaginated(1, 10, undefined, undefined, { include: { user: true } });

      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        where: { deletedAt: null },
        orderBy: undefined,
        include: { user: true },
      });
    });
  });

  describe('exists', () => {
    it('should return true if refresh token exists', async () => {
      mockPrismaClient.refreshToken.count.mockResolvedValue(1);

      const result = await repository.exists('refresh-token-1');

      expect(result).toBe(true);
      expect(mockPrismaClient.refreshToken.count).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1', deletedAt: null },
      });
    });

    it('should return false if refresh token does not exist', async () => {
      mockPrismaClient.refreshToken.count.mockResolvedValue(0);

      const result = await repository.exists('refresh-token-1');

      expect(result).toBe(false);
    });
  });

  describe('count', () => {
    it('should count refresh tokens without filter', async () => {
      mockPrismaClient.refreshToken.count.mockResolvedValue(5);

      const result = await repository.count();

      expect(result).toBe(5);
      expect(mockPrismaClient.refreshToken.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('should count refresh tokens with filter', async () => {
      mockPrismaClient.refreshToken.count.mockResolvedValue(3);
      const filter = { userId: 'user-1' } as Prisma.RefreshTokenWhereInput;

      const result = await repository.count(filter);

      expect(result).toBe(3);
      expect(mockPrismaClient.refreshToken.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', deletedAt: null },
      });
    });

    it('should count refresh tokens with deletedAt filter', async () => {
      mockPrismaClient.refreshToken.count.mockResolvedValue(1);
      const filter = { deletedAt: new Date('2024-01-02') };

      const result = await repository.count(filter);

      expect(mockPrismaClient.refreshToken.count).toHaveBeenCalledWith({
        where: { deletedAt: new Date('2024-01-02') },
      });
    });
  });

  describe('create', () => {
    it('should create refresh token without include', async () => {
      const createInput = { token: 'newtoken', userId: 'user-1', sessionId: 'session-1' } as Prisma.RefreshTokenCreateInput;
      mockPrismaClient.refreshToken.create.mockResolvedValue(mockRefreshToken);

      const result = await repository.create(createInput);

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalledWith({
        data: createInput,
      });
    });

    it('should create refresh token with include', async () => {
      const createInput = { token: 'newtoken', userId: 'user-1', sessionId: 'session-1' } as Prisma.RefreshTokenCreateInput;
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.create.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.create(createInput, { include: { user: true } });

      expect(result).toEqual(tokenWithInclude);
      expect(mockPrismaClient.refreshToken.create).toHaveBeenCalledWith({
        data: createInput,
        include: { user: true },
      });
    });
  });

  describe('createMany', () => {
    it('should create many refresh tokens without include', async () => {
      const createInputs = [{ token: 'token1' }, { token: 'token2' }] as Prisma.RefreshTokenCreateManyInput[];
      mockPrismaClient.refreshToken.createManyAndReturn.mockResolvedValue([mockRefreshToken]);

      const result = await repository.createMany(createInputs);

      expect(result).toEqual([mockRefreshToken]);
      expect(mockPrismaClient.refreshToken.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
      });
    });

    it('should create many refresh tokens with include', async () => {
      const createInputs = [{ token: 'token1' }] as Prisma.RefreshTokenCreateManyInput[];
      const tokensWithInclude = [{ ...mockRefreshToken, user: { id: 'user-1' } }];
      mockPrismaClient.refreshToken.createManyAndReturn.mockResolvedValue(tokensWithInclude as unknown as RefreshToken[]);

      const result = await repository.createMany(createInputs, { include: { user: true } });

      expect(mockPrismaClient.refreshToken.createManyAndReturn).toHaveBeenCalledWith({
        data: createInputs,
        include: { user: true },
      });
    });
  });

  describe('update', () => {
    it('should update refresh token without include', async () => {
      const updateInput = { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput;
      mockPrismaClient.refreshToken.update.mockResolvedValue(mockRefreshToken);

      const result = await repository.update('refresh-token-1', updateInput);

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        data: updateInput,
      });
    });

    it('should update refresh token with include', async () => {
      const updateInput = { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput;
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.update.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.update('refresh-token-1', updateInput, { include: { user: true } });

      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        data: updateInput,
        include: { user: true },
      });
    });
  });

  describe('updateByToken', () => {
    it('should update refresh token by token string without include', async () => {
      const updateInput = { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput;
      mockPrismaClient.refreshToken.update.mockResolvedValue(mockRefreshToken);

      const result = await repository.updateByToken('token123', updateInput);

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token123' },
        data: updateInput,
      });
    });

    it('should update refresh token by token string with include', async () => {
      const updateInput = { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput;
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.update.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.updateByToken('token123', updateInput, { include: { user: true } });

      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token123' },
        data: updateInput,
        include: { user: true },
      });
    });
  });

  describe('updateMany', () => {
    it('should update many refresh tokens without include', async () => {
      const updates = [
        { id: 'refresh-token-1', data: { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput },
        { id: 'refresh-token-2', data: { expiresAt: new Date('2025-01-02') } as Prisma.RefreshTokenUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.refreshToken.update.mockResolvedValue(mockRefreshToken);

      const result = await repository.updateMany(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many refresh tokens with include', async () => {
      const updates = [
        { id: 'refresh-token-1', data: { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput },
      ];
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.refreshToken.update.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.updateMany(updates, { include: { user: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('updateManyByToken', () => {
    it('should update many refresh tokens by token without include', async () => {
      const updates = [
        { token: 'token1', data: { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput },
        { token: 'token2', data: { expiresAt: new Date('2025-01-02') } as Prisma.RefreshTokenUpdateInput },
      ];
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.refreshToken.update.mockResolvedValue(mockRefreshToken);

      const result = await repository.updateManyByToken(updates);

      expect(mockMainClient.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should update many refresh tokens by token with include', async () => {
      const updates = [
        { token: 'token1', data: { expiresAt: new Date('2025-01-01') } as Prisma.RefreshTokenUpdateInput },
      ];
      const tokenWithInclude = { ...mockRefreshToken, user: { id: 'user-1' } };
      mockMainClient.$transaction.mockImplementation(async (cb) => {
        if (typeof cb === 'function') {
          return await cb(mockMainClient);
        }
        return await Promise.all(cb);
      });
      mockPrismaClient.refreshToken.update.mockResolvedValue(tokenWithInclude as unknown as RefreshToken);

      const result = await repository.updateManyByToken(updates, { include: { user: true } });

      expect(mockMainClient.$transaction).toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('should revoke refresh token without include', async () => {
      const revokedToken = { ...mockRefreshToken, revokedAt: new Date() };
      mockPrismaClient.refreshToken.update.mockResolvedValue(revokedToken);

      const result = await repository.revoke('refresh-token-1');

      expect(result).toEqual(revokedToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke refresh token with include', async () => {
      const revokedToken = { ...mockRefreshToken, revokedAt: new Date(), user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.update.mockResolvedValue(revokedToken as unknown as RefreshToken);

      const result = await repository.revoke('refresh-token-1', { include: { user: true } });

      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        data: { revokedAt: expect.any(Date) },
        include: { user: true },
      });
    });
  });

  describe('revokeByToken', () => {
    it('should revoke refresh token by token string without include', async () => {
      const revokedToken = { ...mockRefreshToken, revokedAt: new Date() };
      mockPrismaClient.refreshToken.update.mockResolvedValue(revokedToken);

      const result = await repository.revokeByToken('token123');

      expect(result).toEqual(revokedToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token123' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should revoke refresh token by token string with include', async () => {
      const revokedToken = { ...mockRefreshToken, revokedAt: new Date(), user: { id: 'user-1' } };
      mockPrismaClient.refreshToken.update.mockResolvedValue(revokedToken as unknown as RefreshToken);

      const result = await repository.revokeByToken('token123', { include: { user: true } });

      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token123' },
        data: { revokedAt: expect.any(Date) },
        include: { user: true },
      });
    });
  });

  describe('revokeAllBySessionId', () => {
    it('should revoke all refresh tokens by session id', async () => {
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await repository.revokeAllBySessionId('session-1');

      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { sessionId: 'session-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('delete', () => {
    it('should hard delete refresh token', async () => {
      mockPrismaClient.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      const result = await repository.delete('refresh-token-1');

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
      });
    });
  });

  describe('deleteByToken', () => {
    it('should hard delete refresh token by token string', async () => {
      mockPrismaClient.refreshToken.delete.mockResolvedValue(mockRefreshToken);

      const result = await repository.deleteByToken('token123');

      expect(result).toEqual(mockRefreshToken);
      expect(mockPrismaClient.refreshToken.delete).toHaveBeenCalledWith({
        where: { token: 'token123' },
      });
    });
  });

  describe('deleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.deleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.refreshToken.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many refresh tokens', async () => {
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteMany(['refresh-token-1', 'refresh-token-2']);

      expect(result).toEqual([mockRefreshToken]);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['refresh-token-1', 'refresh-token-2'] } },
      });
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['refresh-token-1', 'refresh-token-2'] } },
      });
    });
  });

  describe('deleteManyByToken', () => {
    it('should return empty array when tokens is empty', async () => {
      const result = await repository.deleteManyByToken([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.refreshToken.findMany).not.toHaveBeenCalled();
    });

    it('should hard delete many refresh tokens by token strings', async () => {
      mockPrismaClient.refreshToken.findMany.mockResolvedValue([mockRefreshToken]);
      mockPrismaClient.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await repository.deleteManyByToken(['token1', 'token2']);

      expect(result).toEqual([mockRefreshToken]);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        where: { token: { in: ['token1', 'token2'] } },
      });
      expect(mockPrismaClient.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: { in: ['token1', 'token2'] } },
      });
    });
  });

  describe('softDelete', () => {
    it('should soft delete refresh token', async () => {
      const deletedToken = { ...mockRefreshToken, deletedAt: new Date() };
      mockPrismaClient.refreshToken.update.mockResolvedValue(deletedToken);

      const result = await repository.softDelete('refresh-token-1');

      expect(result).toEqual(deletedToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'refresh-token-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('softDeleteByToken', () => {
    it('should soft delete refresh token by token string', async () => {
      const deletedToken = { ...mockRefreshToken, deletedAt: new Date() };
      mockPrismaClient.refreshToken.update.mockResolvedValue(deletedToken);

      const result = await repository.softDeleteByToken('token123');

      expect(result).toEqual(deletedToken);
      expect(mockPrismaClient.refreshToken.update).toHaveBeenCalledWith({
        where: { token: 'token123' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('softDeleteMany', () => {
    it('should return empty array when ids is empty', async () => {
      const result = await repository.softDeleteMany([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.refreshToken.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many refresh tokens', async () => {
      const tokensToDelete = [
        { ...mockRefreshToken, id: 'refresh-token-1' },
        { ...mockRefreshToken, id: 'refresh-token-2' },
      ];
      mockPrismaClient.refreshToken.findMany.mockResolvedValue(tokensToDelete);
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteMany(['refresh-token-1', 'refresh-token-2']);

      expect(result).toEqual(tokensToDelete);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['refresh-token-1', 'refresh-token-2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['refresh-token-1', 'refresh-token-2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('softDeleteManyByToken', () => {
    it('should return empty array when tokens is empty', async () => {
      const result = await repository.softDeleteManyByToken([]);

      expect(result).toEqual([]);
      expect(mockPrismaClient.refreshToken.findMany).not.toHaveBeenCalled();
    });

    it('should soft delete many refresh tokens by token strings', async () => {
      const tokensToDelete = [
        { ...mockRefreshToken, token: 'token1' },
        { ...mockRefreshToken, token: 'token2' },
      ];
      mockPrismaClient.refreshToken.findMany.mockResolvedValue(tokensToDelete);
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 2 });

      const result = await repository.softDeleteManyByToken(['token1', 'token2']);

      expect(result).toEqual(tokensToDelete);
      expect(mockPrismaClient.refreshToken.findMany).toHaveBeenCalledWith({
        where: { token: { in: ['token1', 'token2'] }, deletedAt: null },
      });
      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: { in: ['token1', 'token2'] }, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
