import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GenreRepository } from './genre.repository';
import { PrismaService } from '../services/prisma.service';

describe('GenreRepository', () => {
  let repository: GenreRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [GenreRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(GenreRepository);
  };

  const genreRow = (id = 'g1') =>
    ({
      id,
      name: 'Rock',
      slug: 'rock',
      libraryId: 'l1',
      kind: 'custom',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    }) as any;

  afterEach(() => vi.clearAllMocks());

  it('findOne/findOneWithInclude and findMany/findManyWithInclude map args', async () => {
    await setup();
    mockTx.genre.findFirst.mockResolvedValue(genreRow());
    mockTx.genre.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'g1' });
    await repository.findOneWithInclude({ id: 'g1' }, { library: true });
    expect(mockTx.genre.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'g1', deletedAt: null },
      include: { library: true },
    });
    expect(mockTx.genre.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'g1', deletedAt: null },
      include: { library: true },
    });

    await repository.findMany({ name: { contains: 'r' } }, {});
    await repository.findManyWithInclude({ libraryId: 'l1' }, {}, { library: true });
    await repository.findManyWithInclude(
      { libraryId: 'l1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { library: true },
    );
    expect(mockTx.genre.findMany).toHaveBeenNthCalledWith(1, {
      where: { name: { contains: 'r' }, deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { library: true },
    });
    expect(mockTx.genre.findMany).toHaveBeenNthCalledWith(2, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { library: true },
    });
    expect(mockTx.genre.findMany).toHaveBeenNthCalledWith(3, {
      where: { libraryId: 'l1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { library: true },
    });
  });

  it('exists/count return count-backed values', async () => {
    await setup();
    mockTx.genre.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2).mockResolvedValueOnce(9);
    await expect(repository.exists({ id: 'g1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'g1' })).resolves.toBe(true);
    await expect(repository.count({ libraryId: 'l1' })).resolves.toBe(9);
    expect(mockTx.genre.count).toHaveBeenNthCalledWith(1, {
      where: { id: 'g1', deletedAt: null },
    });
    expect(mockTx.genre.count).toHaveBeenNthCalledWith(2, {
      where: { id: 'g1', deletedAt: null },
    });
    expect(mockTx.genre.count).toHaveBeenNthCalledWith(3, {
      where: { libraryId: 'l1', deletedAt: null },
    });
  });

  it('create/createMany/update/updateMany/delete map to prisma', async () => {
    await setup();
    const row = genreRow();
    mockTx.genre.create.mockResolvedValue(row);
    mockTx.genre.createManyAndReturn.mockResolvedValue([row]);
    mockTx.genre.update.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ name: 'Rock' } as any);
    await repository.createMany([{ name: 'Rock' } as any]);
    await repository.update('g1', { name: 'Metal' } as any);
    await repository.updateMany([{ id: 'g1', data: { name: 'Pop' } as any }]);
    await repository.delete('g1');

    expect(mockTx.genre.create).toHaveBeenCalledWith({ data: { name: 'Rock' } });
    expect(mockTx.genre.createManyAndReturn).toHaveBeenCalledWith({ data: [{ name: 'Rock' }] });
    expect(mockTx.genre.update).toHaveBeenCalledWith({
      where: { id: 'g1', deletedAt: null },
      data: { name: 'Metal' },
    });
    expect(mockTx.genre.update).toHaveBeenLastCalledWith({
      where: { id: 'g1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(mockTx.genre.delete).not.toHaveBeenCalled();
  });

  it('deleteMany covers empty and non-empty branches', async () => {
    await setup();
    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    expect(mockTx.genre.deleteMany).not.toHaveBeenCalled();

    const rows = [genreRow('g1'), genreRow('g2')];
    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce(rows as any);
    await expect(repository.deleteMany({})).resolves.toEqual(rows);
    expect(mockTx.genre.updateManyAndReturn).toHaveBeenLastCalledWith({
      where: { deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('softDelete/softDeleteMany/restore/restoreMany branches', async () => {
    await setup();
    const row = genreRow();
    mockTx.genre.update.mockResolvedValue(row);
    await repository.softDelete('g1');
    expect(mockTx.genre.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'g1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    await repository.restore('g1');
    expect(mockTx.genre.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'g1', deletedAt: { not: null } },
      data: { deletedAt: null },
    });

    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({ libraryId: 'l1' })).resolves.toEqual([]);

    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce([row] as any);
    await expect(repository.softDeleteMany({ libraryId: 'l1' })).resolves.toEqual([row]);

    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({ libraryId: 'l1' })).resolves.toEqual([]);
    mockTx.genre.updateManyAndReturn.mockResolvedValueOnce([row] as any);
    await expect(repository.restoreMany({ libraryId: 'l1' })).resolves.toEqual([row]);
  });
});
