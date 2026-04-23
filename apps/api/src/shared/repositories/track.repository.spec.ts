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

  it('finds/counts/creates/updates/deletes and checkAccess branches', async () => {
    await setup();
    mockTx.track.findFirst.mockResolvedValue({ id: 't1' } as any);
    mockTx.track.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 't1' });
    await repository.findOneWithInclude({ id: 't1' }, { artists: true });
    await repository.findMany({ id: 't1' }, {});
    await repository.findManyWithInclude({ id: 't1' }, {}, { artists: true });
    await repository.findManyWithInclude(
      { id: 't1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { artists: true },
    );
    mockTx.track.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(9);
    await expect(repository.exists({ id: 't1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 't1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(9);

    mockTx.track.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 't1' } as any);
    await expect(repository.checkAccess({ id: 't1' })).resolves.toBe(false);
    await expect(repository.checkAccess({ id: 't1' }, 'u1')).resolves.toBe(true);
    expect(mockTx.track.findFirst).toHaveBeenLastCalledWith({
      where: {
        id: 't1',
        deletedAt: null,
        OR: [
          { visibility: 'public' },
          { access: { some: { userId: 'u1' } } },
          { album: { access: { some: { userId: 'u1' } } } },
          { artists: { some: { access: { some: { userId: 'u1' } } } } },
        ],
      },
      select: { id: true },
    });

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
  });

  it('deleteMany + softDelete cascade/no-cascade + soft/restore many branches', async () => {
    await setup();
    mockTx.track.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = trackBuilder({ id: 't1' });
    mockTx.track.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.track.update.mockResolvedValue(row);
    await repository.softDelete('t1', false);
    const txCascade = {
      libraryTrack: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      track: { update: vi.fn().mockResolvedValue(row) },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txCascade));
    await expect(repository.softDelete('t1', true)).resolves.toEqual(row);

    const txEmpty = { track: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() } };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    const txRows = {
      track: {
        findMany: vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    await repository.restore('t1');
    mockTx.track.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    mockTx.track.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.track.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});

