import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { artistBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ArtistRepository } from './artist.repository';
import { PrismaService } from '../services/prisma.service';

describe('ArtistRepository', () => {
  let repository: ArtistRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [ArtistRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(ArtistRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('findOne applies deletedAt null and default include', async () => {
    await setup();
    const row = { ...artistBuilder(), avatar: null, banner: null };
    mockTx.artist.findFirst.mockResolvedValue(row as any);

    const where = { id: 'a1' };
    const result = await repository.findOne(where);

    expect(result).toBe(row);
    expect(mockTx.artist.findFirst).toHaveBeenCalledWith({
      where: { ...where, deletedAt: null },
      include: { avatar: true, banner: true },
    });
  });

  it('findOneWithInclude forwards include', async () => {
    await setup();
    mockTx.artist.findFirst.mockResolvedValue({ id: 'a1' } as any);
    await repository.findOneWithInclude({ id: 'a1' }, { access: true });
    expect(mockTx.artist.findFirst).toHaveBeenCalledWith({
      where: { id: 'a1', deletedAt: null },
      include: { access: true },
    });
  });

  it('findMany uses defaults and custom options', async () => {
    await setup();
    mockTx.artist.findMany.mockResolvedValue([]);
    await repository.findMany({ name: { contains: 'x' } }, {});
    expect(mockTx.artist.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'x' }, deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { avatar: true, banner: true },
    });

    await repository.findMany({ id: 'a1' }, { take: 3, skip: 4, orderBy: { name: 'asc' } as any });
    expect(mockTx.artist.findMany).toHaveBeenLastCalledWith({
      where: { id: 'a1', deletedAt: null },
      take: 3,
      skip: 4,
      orderBy: { name: 'asc' },
      include: { avatar: true, banner: true },
    });
  });

  it('findManyWithInclude forwards include and options', async () => {
    await setup();
    mockTx.artist.findMany.mockResolvedValue([]);
    await repository.findManyWithInclude({ id: 'a1' }, { access: true }, {});
    expect(mockTx.artist.findMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'a1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { access: true },
    });
    await repository.findManyWithInclude(
      { id: 'a1' },
      { access: true },
      { take: 3, skip: 2, orderBy: { name: 'asc' } as any },
    );
    expect(mockTx.artist.findMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'a1', deletedAt: null },
      take: 3,
      skip: 2,
      orderBy: { name: 'asc' },
      include: { access: true },
    });
  });

  it('exists returns boolean from count', async () => {
    await setup();
    mockTx.artist.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    await expect(repository.exists({ id: 'a1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'a1' })).resolves.toBe(true);
  });

  it('count applies deletedAt null', async () => {
    await setup();
    mockTx.artist.count.mockResolvedValue(5);
    await expect(repository.count({ visibility: 'public' as any })).resolves.toBe(5);
    expect(mockTx.artist.count).toHaveBeenCalledWith({
      where: { visibility: 'public', deletedAt: null },
    });
  });

  it('checkAccess uses guest fallback and returns boolean', async () => {
    await setup();
    mockTx.artist.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'a1' } as any);

    await expect(repository.checkAccess({ id: 'a1' })).resolves.toBe(false);
    expect(mockTx.artist.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'a1',
        deletedAt: null,
        AND: [{ OR: [{ visibility: 'public' }] }],
      },
      select: { id: true },
    });

    await expect(repository.checkAccess({ id: 'a1' }, 'u1')).resolves.toBe(true);
    expect(mockTx.artist.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'a1',
        deletedAt: null,
        AND: [{ OR: [{ visibility: 'public' }, { access: { some: { userId: 'u1' } } }] }],
      },
      select: { id: true },
    });
  });

  it('create/createMany/update/updateMany/delete forward to prisma', async () => {
    await setup();
    const artist = artistBuilder({ id: 'a1' });
    mockTx.artist.create.mockResolvedValue(artist);
    mockTx.artist.createManyAndReturn.mockResolvedValue([artist]);
    mockTx.artist.update.mockResolvedValue(artist);
    mockTx.artist.delete.mockResolvedValue(artist);
    mockTx.$transaction.mockResolvedValue([artist] as any);

    await repository.create({ name: 'n' } as any);
    await repository.createMany([{ name: 'n' } as any]);
    await repository.update('a1', { name: 'n2' } as any);
    await repository.updateMany([{ id: 'a1', data: { name: 'n3' } as any }]);
    await repository.delete('a1');

    expect(mockTx.artist.create).toHaveBeenCalledWith({ data: { name: 'n' } });
    expect(mockTx.artist.createManyAndReturn).toHaveBeenCalledWith({ data: [{ name: 'n' }] });
    expect(mockTx.artist.update).toHaveBeenCalledWith({
      where: { id: 'a1', deletedAt: null },
      data: { name: 'n2' },
    });
    expect(mockTx.artist.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('deleteMany returns empty when nothing found', async () => {
    await setup();
    mockTx.artist.findMany.mockResolvedValue([]);
    const result = await repository.deleteMany({ visibility: 'public' as any });
    expect(result).toEqual([]);
    expect(mockTx.artist.deleteMany).not.toHaveBeenCalled();
  });

  it('deleteMany deletes and returns found rows', async () => {
    await setup();
    const rows = [artistBuilder({ id: 'a1' }), artistBuilder({ id: 'a2' })];
    mockTx.artist.findMany.mockResolvedValue(rows);
    const result = await repository.deleteMany({} as any);
    expect(result).toEqual(rows);
    expect(mockTx.artist.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1', 'a2'] } },
    });
  });

  it('softDelete non-cascade updates only artist', async () => {
    await setup();
    const artist = artistBuilder({ id: 'a1' });
    mockTx.artist.update.mockResolvedValue(artist);
    await repository.softDelete('a1', { cascade: false });
    expect(mockTx.artist.update).toHaveBeenCalledWith({
      where: { id: 'a1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('softDelete cascade handles no albums/tracks branch', async () => {
    await setup();
    const deleted = artistBuilder({ id: 'a1' });
    mockTx.$transaction.mockImplementation(async (cb: any) =>
      cb({
        album: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
        track: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
        libraryTrack: { updateMany: vi.fn() },
        libraryAlbum: { updateMany: vi.fn() },
        libraryArtist: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        artist: { update: vi.fn().mockResolvedValue(deleted) },
      }),
    );
    const result = await repository.softDelete('a1', { cascade: true });
    expect(result).toEqual(deleted);
  });

  it('softDelete cascade handles albums and tracks branch', async () => {
    await setup();
    const deleted = artistBuilder({ id: 'a1' });
    const tx = {
      album: {
        findMany: vi.fn().mockResolvedValue([{ id: 'al1' }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      track: {
        findMany: vi.fn().mockResolvedValue([{ id: 't1' }]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      libraryTrack: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      libraryAlbum: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      libraryArtist: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      artist: { update: vi.fn().mockResolvedValue(deleted) },
    };
    mockTx.$transaction.mockImplementation(async (cb: any) => cb(tx));
    const result = await repository.softDelete('a1', { cascade: true });
    expect(result).toEqual(deleted);
    expect(tx.libraryTrack.updateMany).toHaveBeenCalled();
    expect(tx.track.updateMany).toHaveBeenCalled();
    expect(tx.libraryAlbum.updateMany).toHaveBeenCalled();
    expect(tx.album.updateMany).toHaveBeenCalled();
    expect(tx.libraryArtist.updateMany).toHaveBeenCalled();
  });

  it('softDeleteMany returns empty when none found', async () => {
    await setup();
    mockTx.artist.updateManyAndReturn.mockResolvedValue([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    expect(mockTx.artist.updateManyAndReturn).toHaveBeenCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('softDeleteMany updates and returns rows', async () => {
    await setup();
    const rows = [artistBuilder({ id: 'a1' })];
    mockTx.artist.updateManyAndReturn.mockResolvedValue(rows as any);
    await expect(repository.softDeleteMany({})).resolves.toEqual(rows);
    expect(mockTx.artist.updateManyAndReturn).toHaveBeenCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('restore and restoreMany branches', async () => {
    await setup();
    const row = artistBuilder({ id: 'a1' });
    mockTx.artist.update.mockResolvedValue(row);
    await expect(repository.restore('a1')).resolves.toEqual(row);
    expect(mockTx.artist.update).toHaveBeenCalledWith({
      where: { id: 'a1', deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    mockTx.artist.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    expect(mockTx.artist.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    mockTx.artist.updateManyAndReturn.mockResolvedValueOnce([row] as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
    expect(mockTx.artist.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  });
});
