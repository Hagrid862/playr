import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { imageBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageRepository } from './image.repository';
import { PrismaService } from '../services/prisma.service';

describe('ImageRepository', () => {
  let repository: ImageRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(ImageRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('finders use deletedAt filters and include defaults', async () => {
    await setup();
    mockTx.image.findFirst.mockResolvedValue({ id: 'im1' } as any);
    mockTx.image.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 'im1' });
    await repository.findOneWithInclude({ id: 'im1' }, { variants: true });
    await repository.findMany({ id: 'im1' }, {});
    await repository.findManyWithInclude({ id: 'im1' }, { variants: true }, {});
    await repository.findManyWithInclude(
      { id: 'im1' },
      { variants: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );

    expect(mockTx.image.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'im1', deletedAt: null },
      include: { variants: true },
    });
    expect(mockTx.image.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'im1', deletedAt: null },
      include: { variants: true },
    });
    expect(mockTx.image.findMany).toHaveBeenNthCalledWith(1, {
      where: { id: 'im1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { variants: true },
    });
    expect(mockTx.image.findMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'im1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { variants: true },
    });
    expect(mockTx.image.findMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'im1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { variants: true },
    });
  });

  it('exists/count, mutations, and deleteMany branches', async () => {
    await setup();
    mockTx.image.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(7);
    await expect(repository.exists({ id: 'im1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'im1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(7);

    const row = imageBuilder({ id: 'im1' });
    mockTx.image.create.mockResolvedValue(row);
    mockTx.image.createManyAndReturn.mockResolvedValue([row]);
    mockTx.image.update.mockResolvedValue(row);
    mockTx.image.delete.mockResolvedValue(row);
    mockTx.$transaction.mockImplementation(async (arg: any) =>
      typeof arg === 'function' ? arg(mockTx) : arg,
    );
    await repository.create({ key: 'k' } as any);
    await repository.createMany([{ key: 'k' } as any]);
    await repository.update('im1', { key: 'k2' } as any);
    await repository.updateMany([{ id: 'im1', data: { key: 'k3' } as any }]);
    await repository.delete('im1');

    mockTx.image.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const rows = [row];
    mockTx.image.findMany.mockResolvedValueOnce(rows);
    await expect(repository.deleteMany({})).resolves.toEqual(rows);
    expect(mockTx.image.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['im1'] } } });
  });

  it('softDelete/softDeleteMany/restore/restoreMany cover empty and non-empty', async () => {
    await setup();
    const row = imageBuilder({ id: 'im1' });
    mockTx.image.update.mockResolvedValue(row);
    await repository.softDelete('im1');
    await repository.restore('im1');

    mockTx.image.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);

    mockTx.image.updateManyAndReturn.mockResolvedValueOnce([row]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.image.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);

    mockTx.image.updateManyAndReturn.mockResolvedValueOnce([{ ...row, deletedAt: null }]);
    await expect(repository.restoreMany({})).resolves.toEqual([{ ...row, deletedAt: null }]);
  });
});
