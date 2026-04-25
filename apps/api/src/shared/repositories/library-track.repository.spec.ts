import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { libraryTrackBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryTrackRepository } from './library-track.repository';
import { PrismaService } from '../services/prisma.service';

describe('LibraryTrackRepository', () => {
  let repository: LibraryTrackRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryTrackRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(LibraryTrackRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('find methods include defaults/custom include and options branches', async () => {
    await setup();
    mockTx.libraryTrack.findFirst.mockResolvedValue({ id: 'lt1' } as any);
    mockTx.libraryTrack.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'lt1' });
    await repository.findOneWithInclude({ id: 'lt1' }, { track: true });
    await repository.findMany({ libraryId: 'l1' }, {});
    await repository.findManyWithInclude({ libraryId: 'l1' }, { track: true }, {});
    await repository.findManyWithInclude(
      { libraryId: 'l1' },
      { track: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );

    expect(mockTx.libraryTrack.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'lt1', deletedAt: null },
      include: {
        track: { include: { artists: true, album: true, genres: { include: { genre: true } } } },
      },
    });
    expect(mockTx.libraryTrack.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'lt1', deletedAt: null },
      include: { track: true },
    });

    const defaultTrackInclude = {
      track: { include: { artists: true, album: true, genres: { include: { genre: true } } } },
    };

    expect(mockTx.libraryTrack.findMany).toHaveBeenNthCalledWith(1, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: defaultTrackInclude,
    });
    expect(mockTx.libraryTrack.findMany).toHaveBeenNthCalledWith(2, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { track: true },
    });
    expect(mockTx.libraryTrack.findMany).toHaveBeenNthCalledWith(3, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { track: true },
    });
  });

  it('count/existence and mutations/deletes/restore flows', async () => {
    await setup();
    mockTx.libraryTrack.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(8);
    await expect(repository.exists({ id: 'lt1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'lt1' })).resolves.toBe(true);
    await expect(repository.count({ libraryId: 'l1' })).resolves.toBe(8);

    const row = libraryTrackBuilder({ id: 'lt1' });
    mockTx.libraryTrack.create.mockResolvedValue(row);
    mockTx.libraryTrack.createManyAndReturn.mockResolvedValue([row]);
    mockTx.libraryTrack.update.mockResolvedValue(row);
    mockTx.libraryTrack.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ libraryId: 'l1', trackId: 't1' } as any);
    await repository.createMany([{ libraryId: 'l1', trackId: 't1' } as any]);
    await repository.update('lt1', { trackId: 't2' } as any);
    await repository.updateMany([{ id: 'lt1', data: { trackId: 't2' } as any }]);
    await repository.delete('lt1');
  });

  it('deleteMany/softDeleteMany/restoreMany cover empty and non-empty branches', async () => {
    await setup();
    mockTx.libraryTrack.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = libraryTrackBuilder({ id: 'lt1' });
    mockTx.libraryTrack.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.libraryTrack.update.mockResolvedValue(row);
    await repository.softDelete('lt1');
    await repository.restore('lt1');

    mockTx.libraryTrack.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);

    mockTx.libraryTrack.updateManyAndReturn.mockResolvedValueOnce([row]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);
    expect(mockTx.libraryTrack.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });

    vi.mocked(mockTx.libraryTrack.updateManyAndReturn).mockClear();
    mockTx.libraryTrack.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    expect(mockTx.libraryTrack.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    vi.mocked(mockTx.libraryTrack.updateManyAndReturn).mockClear();
    mockTx.libraryTrack.updateManyAndReturn.mockResolvedValueOnce([{ ...row, deletedAt: null }]);
    await expect(repository.restoreMany({})).resolves.toEqual([{ ...row, deletedAt: null }]);
    expect(mockTx.libraryTrack.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  });
});
