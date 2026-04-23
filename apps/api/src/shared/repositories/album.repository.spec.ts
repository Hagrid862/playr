import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { albumBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlbumRepository } from './album.repository';
import { PrismaService } from '../services/prisma.service';

describe('AlbumRepository', () => {
  let repository: AlbumRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlbumRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(AlbumRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('finders apply deletedAt filter and include', async () => {
    await setup();
    mockTx.album.findFirst.mockResolvedValue({ id: 'al1' } as any);
    mockTx.album.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'al1' });
    expect(mockTx.album.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'al1', deletedAt: null },
      include: { access: true, cover: true },
    });

    await repository.findOneWithInclude({ id: 'al1' }, { artists: true });
    expect(mockTx.album.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'al1', deletedAt: null },
      include: { artists: true },
    });

    await repository.findMany({ name: { contains: 'x' } }, {});
    expect(mockTx.album.findMany).toHaveBeenNthCalledWith(1, {
      where: { name: { contains: 'x' }, deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { access: true, cover: true },
    });

    await repository.findManyWithInclude(
      { id: 'al1' },
      {},
      { artists: true },
    );
    expect(mockTx.album.findMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'al1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { artists: true },
    });

    await repository.findManyWithInclude(
      { id: 'al1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { artists: true },
    );
    expect(mockTx.album.findMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'al1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { artists: true },
    });
  });

  it('exists/count/checkAccess cover boolean branches', async () => {
    await setup();
    mockTx.album.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(9);
    await expect(repository.exists({ id: 'al1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'al1' })).resolves.toBe(true);
    await expect(repository.count({ visibility: 'public' as any })).resolves.toBe(9);

    mockTx.album.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'al1' } as any);
    await expect(repository.checkAccess({ id: 'al1' })).resolves.toBe(false);
    expect(mockTx.album.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'al1',
        deletedAt: null,
        OR: [
          { visibility: 'public' },
          { access: { some: { userId: 'GUEST' } } },
          { artists: { some: { access: { some: { userId: 'GUEST' } } } } },
        ],
      },
      select: { id: true },
    });

    await expect(repository.checkAccess({ id: 'al1' }, 'u1')).resolves.toBe(true);
  });

  it('create/update/delete variants map to prisma', async () => {
    await setup();
    const row = albumBuilder({ id: 'al1' });
    mockTx.album.create.mockResolvedValue(row);
    mockTx.album.createManyAndReturn.mockResolvedValue([row]);
    mockTx.album.update.mockResolvedValue(row);
    mockTx.album.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ title: 'x' } as any);
    await repository.createMany([{ title: 'x' } as any]);
    await repository.update('al1', { title: 'y' } as any);
    await repository.updateMany([{ id: 'al1', data: { title: 'z' } as any }]);
    await repository.delete('al1');

    expect(mockTx.album.create).toHaveBeenCalledWith({ data: { title: 'x' } });
    expect(mockTx.album.createManyAndReturn).toHaveBeenCalledWith({ data: [{ title: 'x' }] });
    expect(mockTx.album.update).toHaveBeenCalledWith({
      where: { id: 'al1', deletedAt: null },
      data: { title: 'y' },
    });
    expect(mockTx.album.delete).toHaveBeenCalledWith({ where: { id: 'al1' } });
  });

  it('deleteMany returns [] for empty and rows otherwise', async () => {
    await setup();
    mockTx.album.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    expect(mockTx.album.deleteMany).not.toHaveBeenCalled();

    const rows = [albumBuilder({ id: 'al1' }), albumBuilder({ id: 'al2' })];
    mockTx.album.findMany.mockResolvedValueOnce(rows);
    await expect(repository.deleteMany({})).resolves.toEqual(rows);
    expect(mockTx.album.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['al1', 'al2'] } },
    });
  });

  it('softDelete non-cascade updates one row', async () => {
    await setup();
    const row = albumBuilder({ id: 'al1' });
    mockTx.album.update.mockResolvedValue(row);
    await repository.softDelete('al1', false);
    expect(mockTx.album.update).toHaveBeenCalledWith({
      where: { id: 'al1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('softDelete cascade handles track branches', async () => {
    await setup();
    const row = albumBuilder({ id: 'al1' });
    const txNoTracks = {
      track: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
      libraryTrack: { updateMany: vi.fn() },
      libraryAlbum: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      album: { update: vi.fn().mockResolvedValue(row) },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txNoTracks));
    await expect(repository.softDelete('al1', true)).resolves.toEqual(row);
    expect(txNoTracks.libraryTrack.updateMany).not.toHaveBeenCalled();

    const txTracks = {
      track: {
        findMany: vi.fn().mockResolvedValue([{ id: 't1' }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      libraryTrack: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      libraryAlbum: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      album: { update: vi.fn().mockResolvedValue(row) },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txTracks));
    await expect(repository.softDelete('al1', true)).resolves.toEqual(row);
    expect(txTracks.libraryTrack.updateMany).toHaveBeenCalled();
    expect(txTracks.track.updateMany).toHaveBeenCalled();
  });

  it('softDeleteMany/restore/restoreMany handle empty and non-empty branches', async () => {
    await setup();
    const row = albumBuilder({ id: 'al1' });

    const txEmpty = { album: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() } };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);

    const txRows = {
      album: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([row])
          .mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.album.update.mockResolvedValue(row);
    await expect(repository.restore('al1')).resolves.toEqual(row);

    mockTx.album.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);

    mockTx.album.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.album.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});

