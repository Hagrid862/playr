import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { sessionBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SessionRepository } from './session.repository';
import { PrismaService } from '../services/prisma.service';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockTx: DeepMocked<PrismaClient>;
  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(SessionRepository);
  };

  beforeEach(setup);

  describe('findOne', () => {
    it('calls findFirst with deletedAt null and user include', async () => {
      const row = { id: 's1' } as any;
      mockTx.session.findFirst.mockResolvedValue(row);
      const result = await repository.findOne({ id: 's1' });
      expect(result).toBe(row);
      expect(mockTx.session.findFirst).toHaveBeenCalledTimes(1);
      expect(mockTx.session.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('findOneWithInclude', () => {
    it('calls findFirst with given include and deletedAt null', async () => {
      const row = { id: 's1' } as any;
      mockTx.session.findFirst.mockResolvedValue(row);
      const result = await repository.findOneWithInclude({ id: 's1' }, { user: true });
      expect(result).toBe(row);
      expect(mockTx.session.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
        include: { user: true },
      });
    });
  });

  describe('findMany', () => {
    it('applies default take, skip, orderBy and user include', async () => {
      mockTx.session.findMany.mockResolvedValue([]);
      await repository.findMany({ userId: 'u1' }, {});
      expect(mockTx.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', deletedAt: null },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });
  });

  describe('findManyWithInclude', () => {
    it('applies default pagination and order with custom include', async () => {
      mockTx.session.findMany.mockResolvedValue([]);
      await repository.findManyWithInclude({ userId: 'u1' }, { user: true }, {});
      expect(mockTx.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', deletedAt: null },
        take: 10,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      });
    });

    it('passes explicit take, skip, and orderBy', async () => {
      mockTx.session.findMany.mockResolvedValue([]);
      await repository.findManyWithInclude(
        { userId: 'u1' },
        { user: true },
        { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      );
      expect(mockTx.session.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1', deletedAt: null },
        take: 2,
        skip: 1,
        orderBy: { createdAt: 'asc' },
        include: { user: true },
      });
    });
  });

  describe('exists and count', () => {
    it('exists is false when count is 0', async () => {
      mockTx.session.count.mockResolvedValue(0);
      await expect(repository.exists({ id: 's1' })).resolves.toBe(false);
      expect(mockTx.session.count).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
      });
    });

    it('exists is true when count is positive', async () => {
      mockTx.session.count.mockResolvedValue(1);
      await expect(repository.exists({ id: 's1' })).resolves.toBe(true);
      expect(mockTx.session.count).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
      });
    });

    it('count merges empty where with deletedAt null', async () => {
      mockTx.session.count.mockResolvedValue(4);
      await expect(repository.count({})).resolves.toBe(4);
      expect(mockTx.session.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });
  });

  describe('checkAccess', () => {
    it('returns false and does not query when userId is omitted', async () => {
      await expect(repository.checkAccess({ id: 's1' })).resolves.toBe(false);
      expect(mockTx.session.findFirst).not.toHaveBeenCalled();
    });

    it('uses findFirst with userId, where, and id select', async () => {
      mockTx.session.findFirst.mockResolvedValue({ id: 's1' } as any);
      await expect(repository.checkAccess({ id: 's1' }, 'u1')).resolves.toBe(true);
      expect(mockTx.session.findFirst).toHaveBeenCalledWith({
        where: { id: 's1', userId: 'u1', deletedAt: null },
        select: { id: true },
      });
    });
  });

  describe('create and createMany', () => {
    it('create calls session.create with data', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.create.mockResolvedValue(row);
      const data = { userId: 'u1' } as any;
      await expect(repository.create(data)).resolves.toBe(row);
      expect(mockTx.session.create).toHaveBeenCalledWith({ data });
    });

    it('createMany uses createManyAndReturn with data', async () => {
      const row = sessionBuilder({ id: 's1' });
      const data = [{ userId: 'u1' } as any];
      mockTx.session.createManyAndReturn.mockResolvedValue([row] as any);
      await expect(repository.createMany(data)).resolves.toEqual([row]);
      expect(mockTx.session.createManyAndReturn).toHaveBeenCalledWith({ data });
    });
  });

  describe('update and updateMany', () => {
    it('update uses where id, deletedAt null, and data', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.update.mockResolvedValue(row);
      await expect(repository.update('s1', { ip: 'x' } as any)).resolves.toBe(row);
      expect(mockTx.session.update).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
        data: { ip: 'x' },
      });
    });

    it('updateMany uses $transaction with one update per id', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.$transaction.mockResolvedValue([row] as any);
      await expect(
        repository.updateMany([{ id: 's1', data: { ip: 'x' } as any }]),
      ).resolves.toEqual([row]);
      expect(mockTx.$transaction).toHaveBeenCalledTimes(1);
      expect(mockTx.session.update).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
        data: { ip: 'x' },
      });
    });
  });

  describe('delete', () => {
    it('hard delete by id', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.delete.mockResolvedValue(row);
      await expect(repository.delete('s1')).resolves.toBe(row);
      expect(mockTx.session.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
    });
  });

  describe('revoke and revokeAllByUserId', () => {
    it('revoke uses updateManyAndReturn and returns first row or null', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.updateManyAndReturn.mockResolvedValue([row] as any);
      const result = await repository.revoke('s1');
      expect(result).toBe(row);
      expect(mockTx.session.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1', deletedAt: null, revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('revokeAllByUserId revokes all active sessions for user', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.updateManyAndReturn.mockResolvedValue([row] as any);
      await expect(repository.revokeAllByUserId('u1')).resolves.toEqual([row]);
      expect(mockTx.session.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', deletedAt: null, revokedAt: null },
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });
  });

  describe('deleteMany', () => {
    beforeEach(() => {
      mockTx.$transaction.mockImplementation(async (arg: any) =>
        typeof arg === 'function' ? arg(mockTx) : arg,
      );
    });

    it('returns [] when no rows match and does not delete', async () => {
      mockTx.session.findMany.mockResolvedValueOnce([]);
      await expect(repository.deleteMany({})).resolves.toEqual([]);
      expect(mockTx.session.findMany).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(mockTx.session.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes by ids in batch and returns found rows', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.findMany.mockResolvedValueOnce([row]);
      await expect(repository.deleteMany({})).resolves.toEqual([row]);
      expect(mockTx.session.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1'] } },
      });
    });
  });

  describe('softDelete and restore (single row)', () => {
    it('softDelete sets deletedAt for active row', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.update.mockResolvedValue(row);
      await expect(repository.softDelete('s1')).resolves.toBe(row);
      expect(mockTx.session.update).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('restore clears deletedAt for soft-deleted row', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.update.mockResolvedValue(row);
      await expect(repository.restore('s1')).resolves.toBe(row);
      expect(mockTx.session.update).toHaveBeenCalledWith({
        where: { id: 's1', deletedAt: { not: null } },
        data: { deletedAt: null },
      });
    });
  });

  describe('softDeleteMany and restoreMany', () => {
    it('softDeleteMany returns [] when no rows to soft-delete', async () => {
      mockTx.session.updateManyAndReturn.mockResolvedValueOnce([]);
      await expect(repository.softDeleteMany({})).resolves.toEqual([]);
      expect(mockTx.session.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('softDeleteMany returns updated rows when any match', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.updateManyAndReturn.mockResolvedValueOnce([row] as any);
      await expect(repository.softDeleteMany({})).resolves.toEqual([row]);
    });

    it('restoreMany returns [] when no soft-deleted rows match', async () => {
      mockTx.session.updateManyAndReturn.mockResolvedValueOnce([]);
      await expect(repository.restoreMany({})).resolves.toEqual([]);
      expect(mockTx.session.updateManyAndReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: { not: null } },
          data: { deletedAt: null },
        }),
      );
    });

    it('restoreMany returns rows with deletedAt cleared when any match', async () => {
      const row = sessionBuilder({ id: 's1' });
      mockTx.session.updateManyAndReturn.mockResolvedValueOnce([row] as any);
      await expect(repository.restoreMany({})).resolves.toEqual([row]);
    });
  });
});
