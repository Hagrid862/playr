import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { trackBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrackRepository } from './track.repository';
import { PrismaService } from '../services/prisma.service';

describe('TrackRepository', () => {
  let repository: TrackRepository;
  let mockTx: DeepMocked<PrismaClient>;
  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [TrackRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(TrackRepository);
  };
  afterEach(() => vi.clearAllMocks());

  it('finders apply deletedAt filter and include', async () => {
    await setup();
    mockTx.track.findFirst.mockResolvedValue({ id: 't1' } as any);
    mockTx.track.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 't1' });
    expect(mockTx.track.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 't1', deletedAt: null },
      include: { access: true },
    });

    await repository.findOneWithInclude({ id: 't1' }, { artists: true });
    expect(mockTx.track.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 't1', deletedAt: null },
      include: { artists: true },
    });

    await repository.findMany({ id: 't1' }, {});
    expect(mockTx.track.findMany).toHaveBeenNthCalledWith(1, {
      where: { id: 't1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { access: true },
    });

    await repository.findManyWithInclude({ id: 't1' }, { artists: true }, {});
    expect(mockTx.track.findMany).toHaveBeenNthCalledWith(2, {
      where: { id: 't1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { artists: true },
    });

    await repository.findManyWithInclude(
      { id: 't1' },
      { artists: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );
    expect(mockTx.track.findMany).toHaveBeenNthCalledWith(3, {
      where: { id: 't1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { artists: true },
    });
  });

  it('exists/count checkAccess cover boolean and OR / access branches', async () => {
    await setup();
    mockTx.track.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(9);
    await expect(repository.exists({ id: 't1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 't1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(9);

    expect(mockTx.track.count).toHaveBeenNthCalledWith(1, { where: { id: 't1', deletedAt: null } });
    expect(mockTx.track.count).toHaveBeenNthCalledWith(2, { where: { id: 't1', deletedAt: null } });
    expect(mockTx.track.count).toHaveBeenNthCalledWith(3, { where: { deletedAt: null } });

    mockTx.track.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 't1' } as any);
    await expect(repository.checkAccess({ id: 't1' })).resolves.toBe(false);
    expect(mockTx.track.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 't1',
        deletedAt: null,
        AND: [{ OR: [{ visibility: 'public' }] }],
      },
      select: { id: true },
    });

    await expect(repository.checkAccess({ id: 't1' }, 'u1')).resolves.toBe(true);
    expect(mockTx.track.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: 't1',
        deletedAt: null,
        AND: [
          {
            OR: [
              { visibility: 'public' },
              { access: { some: { userId: 'u1' } } },
              { album: { access: { some: { userId: 'u1' } } } },
              { artists: { some: { access: { some: { userId: 'u1' } } } } },
            ],
          },
        ],
      },
      select: { id: true },
    });
  });

  it('create/update/delete variants and updateMany transaction map to prisma', async () => {
    await setup();
    const row = trackBuilder({ id: 't1' });
    mockTx.track.create.mockResolvedValue(row);
    mockTx.track.createManyAndReturn.mockResolvedValue([row]);
    mockTx.track.update.mockResolvedValue(row);
    mockTx.track.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ title: 'x' } as any);
    await repository.createMany([{ title: 'x' } as any]);
    await repository.update('t1', { title: 'y' } as any);
    await repository.updateMany([{ id: 't1', data: { title: 'z' } as any }]);
    await repository.delete('t1');

    expect(mockTx.track.create).toHaveBeenCalledWith({ data: { title: 'x' } });
    expect(mockTx.track.createManyAndReturn).toHaveBeenCalledWith({ data: [{ title: 'x' }] });
    expect(mockTx.track.update).toHaveBeenCalledTimes(2);
    expect(mockTx.track.update).toHaveBeenNthCalledWith(1, {
      where: { id: 't1', deletedAt: null },
      data: { title: 'y' },
    });
    expect(mockTx.track.update).toHaveBeenNthCalledWith(2, {
      where: { id: 't1', deletedAt: null },
      data: { title: 'z' },
    });
    expect(mockTx.$transaction).toHaveBeenCalledTimes(1);
    const txArg = mockTx.$transaction.mock.calls[0]?.[0];
    expect(Array.isArray(txArg)).toBe(true);
    if (Array.isArray(txArg)) {
      expect(txArg).toHaveLength(1);
    }
    expect(mockTx.track.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('deleteMany returns [] for empty and rows otherwise, default deletedAt on filter', async () => {
    await setup();
    mockTx.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      throw new TypeError('expected callback or array');
    });

    mockTx.track.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    expect(mockTx.track.findMany).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(mockTx.track.deleteMany).not.toHaveBeenCalled();

    const row = trackBuilder({ id: 't1' });
    mockTx.track.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);
    expect(mockTx.track.findMany).toHaveBeenLastCalledWith({ where: { deletedAt: null } });
    expect(mockTx.track.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['t1'] } } });
  });

  it('softDelete non-cascade updates one row; cascade runs libraryTrack then track in transaction', async () => {
    await setup();
    const row = trackBuilder({ id: 't1' });
    mockTx.track.update.mockResolvedValue(row);
    await repository.softDelete('t1', { cascade: false });
    expect(mockTx.track.update).toHaveBeenCalledWith({
      where: { id: 't1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });

    const txCascade = {
      libraryTrack: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      track: { update: vi.fn().mockResolvedValue(row) },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txCascade));
    await expect(repository.softDelete('t1', { cascade: true })).resolves.toEqual(row);
    expect(txCascade.libraryTrack.updateMany).toHaveBeenCalledWith({
      where: { trackId: 't1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(txCascade.track.update).toHaveBeenCalledWith({
      where: { id: 't1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('softDeleteMany/restore/restoreMany handle empty, deletedAt filter, and bulk update shapes', async () => {
    await setup();
    mockTx.$transaction.mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockTx) => Promise<unknown>)(mockTx);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      throw new TypeError('expected callback or array');
    });

    const row = trackBuilder({ id: 't1' });

    mockTx.track.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    expect(mockTx.track.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });

    mockTx.track.updateManyAndReturn.mockResolvedValueOnce([row]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);
    expect(mockTx.track.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });

    mockTx.track.update.mockResolvedValue(row);
    await repository.restore('t1');
    expect(mockTx.track.update).toHaveBeenCalledWith({
      where: { id: 't1', deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    mockTx.track.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    expect(mockTx.track.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    mockTx.track.updateManyAndReturn.mockResolvedValueOnce([{ ...row, deletedAt: null }]);
    await expect(repository.restoreMany({})).resolves.toEqual([{ ...row, deletedAt: null }]);
    expect(mockTx.track.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  });
});
