import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { libraryAlbumBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryAlbumRepository } from './library-album.repository';
import { PrismaService } from '../services/prisma.service';

describe('LibraryAlbumRepository', () => {
  let repository: LibraryAlbumRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryAlbumRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(LibraryAlbumRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('find methods use expected default include and options', async () => {
    await setup();
    mockTx.libraryAlbum.findFirst.mockResolvedValue({ id: 'la1' } as any);
    mockTx.libraryAlbum.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'la1' });
    expect(mockTx.libraryAlbum.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'la1', deletedAt: null },
      include: { album: { include: { cover: true, artists: true } } },
    });

    await repository.findOneWithInclude({ id: 'la1' }, { album: true });
    expect(mockTx.libraryAlbum.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'la1', deletedAt: null },
      include: { album: true },
    });

    await repository.findMany({ libraryId: 'l1' }, {});
    await repository.findManyWithInclude({ libraryId: 'l1' }, { album: true }, {});
    await repository.findManyWithInclude(
      { libraryId: 'l1' },
      { album: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );
    expect(mockTx.libraryAlbum.findMany).toHaveBeenNthCalledWith(1, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { album: { include: { cover: true, artists: true } } },
    });
    expect(mockTx.libraryAlbum.findMany).toHaveBeenNthCalledWith(2, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { album: true },
    });
    expect(mockTx.libraryAlbum.findMany).toHaveBeenNthCalledWith(3, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { album: true },
    });
  });

  it('exists/count return count-backed values', async () => {
    await setup();
    mockTx.libraryAlbum.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(8);
    await expect(repository.exists({ id: 'la1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'la1' })).resolves.toBe(true);
    await expect(repository.count({ libraryId: 'l1' })).resolves.toBe(8);
  });

  it('create/update/delete variants map correctly', async () => {
    await setup();
    const row = libraryAlbumBuilder({ id: 'la1' });
    mockTx.libraryAlbum.create.mockResolvedValue(row);
    mockTx.libraryAlbum.createManyAndReturn.mockResolvedValue([row]);
    mockTx.libraryAlbum.update.mockResolvedValue(row);
    mockTx.libraryAlbum.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ libraryId: 'l1', albumId: 'a1' } as any);
    await repository.createMany([{ libraryId: 'l1', albumId: 'a1' } as any]);
    await repository.update('la1', { albumId: 'a2' } as any);
    await repository.updateMany([{ id: 'la1', data: { albumId: 'a2' } as any }]);
    await repository.delete('la1');

    expect(mockTx.libraryAlbum.create).toHaveBeenCalled();
    expect(mockTx.libraryAlbum.createManyAndReturn).toHaveBeenCalled();
    expect(mockTx.libraryAlbum.update).toHaveBeenCalledWith({
      where: { id: 'la1', deletedAt: null },
      data: { albumId: 'a2' },
    });
    expect(mockTx.libraryAlbum.delete).toHaveBeenCalledWith({ where: { id: 'la1' } });
  });

  it('deleteMany covers empty and non-empty branches', async () => {
    await setup();
    mockTx.libraryAlbum.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    expect(mockTx.libraryAlbum.deleteMany).not.toHaveBeenCalled();

    const rows = [libraryAlbumBuilder({ id: 'la1' })];
    mockTx.libraryAlbum.findMany.mockResolvedValueOnce(rows);
    await expect(repository.deleteMany({})).resolves.toEqual(rows);
    expect(mockTx.libraryAlbum.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['la1'] } },
    });
  });

  it('softDelete/softDeleteMany/restore/restoreMany branches', async () => {
    await setup();
    const row = libraryAlbumBuilder({ id: 'la1' });
    mockTx.libraryAlbum.update.mockResolvedValue(row);
    await repository.softDelete('la1');
    await repository.restore('la1');

    mockTx.libraryAlbum.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({ libraryId: 'l1' })).resolves.toEqual([]);

    mockTx.libraryAlbum.updateManyAndReturn.mockResolvedValueOnce([row]);
    await expect(repository.softDeleteMany({ libraryId: 'l1' })).resolves.toEqual([row]);

    mockTx.libraryAlbum.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({ libraryId: 'l1' })).resolves.toEqual([]);

    mockTx.libraryAlbum.updateManyAndReturn.mockResolvedValueOnce([{ ...row, deletedAt: null }]);
    await expect(repository.restoreMany({ libraryId: 'l1' })).resolves.toEqual([
      { ...row, deletedAt: null },
    ]);
  });
});
