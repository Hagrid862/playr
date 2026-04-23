import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { libraryArtistBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LibraryArtistRepository } from './library-artist.repository';
import { PrismaService } from '../services/prisma.service';

describe('LibraryArtistRepository', () => {
  let repository: LibraryArtistRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [LibraryArtistRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(LibraryArtistRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('find methods cover default/custom include and defaults/overrides', async () => {
    await setup();
    mockTx.libraryArtist.findFirst.mockResolvedValue({ id: 'la1' } as any);
    mockTx.libraryArtist.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 'la1' });
    await repository.findOneWithInclude({ id: 'la1' }, { artist: true });
    await repository.findMany({ libraryId: 'l1' }, {});
    await repository.findManyWithInclude({ libraryId: 'l1' }, {}, { artist: true });
    await repository.findManyWithInclude(
      { libraryId: 'l1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { artist: true },
    );
  });

  it('exists/count and CRUD/updateMany operations', async () => {
    await setup();
    mockTx.libraryArtist.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(3);
    await expect(repository.exists({ id: 'la1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'la1' })).resolves.toBe(true);
    await expect(repository.count({ libraryId: 'l1' })).resolves.toBe(3);

    const row = libraryArtistBuilder({ id: 'la1' });
    mockTx.libraryArtist.create.mockResolvedValue(row);
    mockTx.libraryArtist.createManyAndReturn.mockResolvedValue([row]);
    mockTx.libraryArtist.update.mockResolvedValue(row);
    mockTx.libraryArtist.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ libraryId: 'l1', artistId: 'a1' } as any);
    await repository.createMany([{ libraryId: 'l1', artistId: 'a1' } as any]);
    await repository.update('la1', { artistId: 'a2' } as any);
    await repository.updateMany([{ id: 'la1', data: { artistId: 'a2' } as any }]);
    await repository.delete('la1');
  });

  it('deleteMany/softDeleteMany/restoreMany branches', async () => {
    await setup();
    mockTx.libraryArtist.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = libraryArtistBuilder({ id: 'la1' });
    mockTx.libraryArtist.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.libraryArtist.update.mockResolvedValue(row);
    await repository.softDelete('la1');
    await repository.restore('la1');

    const txEmpty = { libraryArtist: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() } };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);

    const txRows = {
      libraryArtist: {
        findMany: vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.libraryArtist.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    mockTx.libraryArtist.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.libraryArtist.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});

