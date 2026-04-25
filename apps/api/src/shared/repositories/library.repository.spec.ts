import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { libraryBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryRepository } from './library.repository';
import { PrismaService } from '../services/prisma.service';

describe('LibraryRepository', () => {
  let repository: LibraryRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(LibraryRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('find methods include deletedAt and relation defaults', async () => {
    await setup();
    mockTx.library.findFirst.mockResolvedValue({ id: 'l1' } as any);
    mockTx.library.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'l1' });
    await repository.findOneWithInclude({ id: 'l1' }, { user: true });
    await repository.findMany({ userId: 'u1' }, {});
    await repository.findManyWithInclude({ userId: 'u1' }, { user: true }, {});
    await repository.findManyWithInclude(
      { userId: 'u1' },
      { user: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );

    expect(mockTx.library.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'l1', deletedAt: null },
      include: { user: true },
    });
    expect(mockTx.library.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'l1', deletedAt: null },
      include: { user: true },
    });
    expect(mockTx.library.findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'u1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    expect(mockTx.library.findMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'u1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    expect(mockTx.library.findMany).toHaveBeenNthCalledWith(3, {
      where: { userId: 'u1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
  });

  it('exists/count and create/update/delete variants', async () => {
    await setup();
    mockTx.library.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(6);
    await expect(repository.exists({ id: 'l1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'l1' })).resolves.toBe(true);
    await expect(repository.count({ userId: 'u1' })).resolves.toBe(6);

    const row = libraryBuilder({ id: 'l1' });
    mockTx.library.create.mockResolvedValue(row);
    mockTx.library.createManyAndReturn.mockResolvedValue([row]);
    mockTx.library.update.mockResolvedValue(row);
    mockTx.library.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ userId: 'u1' } as any);
    expect(mockTx.library.create).toHaveBeenCalledTimes(1);
    expect(mockTx.library.create).toHaveBeenCalledWith({ data: { userId: 'u1' } });

    await repository.createMany([{ userId: 'u1' } as any]);
    expect(mockTx.library.createManyAndReturn).toHaveBeenCalledWith({ data: [{ userId: 'u1' }] });

    await repository.update('l1', { name: 'My Library' } as any);
    expect(mockTx.library.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'l1', deletedAt: null },
      data: { name: 'My Library' },
    });

    await repository.updateMany([{ id: 'l1', data: { name: 'My Library' } as any }]);
    expect(mockTx.library.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'l1', deletedAt: null },
      data: { name: 'My Library' },
    });
    expect(mockTx.$transaction).toHaveBeenCalledTimes(1);
    const txArg = mockTx.$transaction.mock.calls[0]?.[0];
    expect(Array.isArray(txArg)).toBe(true);
    if (Array.isArray(txArg)) {
      expect(txArg).toHaveLength(1);
    }

    await repository.delete('l1');
    expect(mockTx.library.delete).toHaveBeenCalledWith({ where: { id: 'l1' } });
  });

  it('deleteMany and soft/restore many branches', async () => {
    await setup();
    mockTx.library.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);

    const row = libraryBuilder({ id: 'l1' });
    mockTx.library.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);
    expect(mockTx.library.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['l1'] } } });

    mockTx.library.update.mockResolvedValue(row);
    await repository.softDelete('l1');
    await repository.restore('l1');

    mockTx.library.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);

    mockTx.library.updateManyAndReturn.mockResolvedValueOnce([row]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.library.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);

    mockTx.library.updateManyAndReturn.mockResolvedValueOnce([{ ...row, deletedAt: null }]);
    await expect(repository.restoreMany({})).resolves.toEqual([{ ...row, deletedAt: null }]);
  });
});
