import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { userBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UserRepository } from './user.repository';
import { PrismaService } from '../services/prisma.service';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockTx: DeepMocked<PrismaClient>;
  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(UserRepository);
  };
  afterEach(() => vi.clearAllMocks());

  it('find methods, exists/count, and create/update/delete/updateMany', async () => {
    await setup();
    mockTx.user.findFirst.mockResolvedValue({ id: 'u1' } as any);
    mockTx.user.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 'u1' });
    await repository.findOneWithInclude({ id: 'u1' }, { avatar: true });
    await repository.findMany({ username: { contains: 'a' } }, {});
    await repository.findManyWithInclude({ id: 'u1' }, { avatar: true }, {});
    await repository.findManyWithInclude(
      { id: 'u1' },
      { avatar: true },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
    );

    mockTx.user.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(5);
    await expect(repository.exists({ id: 'u1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'u1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(5);

    const row = userBuilder({ id: 'u1' });
    mockTx.user.create.mockResolvedValue(row);
    mockTx.user.createManyAndReturn.mockResolvedValue([row]);
    mockTx.user.update.mockResolvedValue(row);
    mockTx.user.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ username: 'u' } as any);
    await repository.createMany([{ username: 'u' } as any]);
    await repository.update('u1', { username: 'u2' } as any);
    await repository.updateMany([{ id: 'u1', data: { username: 'u3' } as any }]);
    await repository.delete('u1');

    expect(mockTx.user.findFirst).toHaveBeenCalledTimes(2);
    expect(mockTx.user.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'u1', deletedAt: null },
      include: { avatar: true },
    });
    expect(mockTx.user.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'u1', deletedAt: null },
      include: { avatar: true },
    });

    expect(mockTx.user.findMany).toHaveBeenCalledTimes(3);
    expect(mockTx.user.findMany).toHaveBeenNthCalledWith(1, {
      where: { username: { contains: 'a' }, deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { avatar: true },
    });
    expect(mockTx.user.findMany).toHaveBeenNthCalledWith(2, {
      where: { id: 'u1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { avatar: true },
    });
    expect(mockTx.user.findMany).toHaveBeenNthCalledWith(3, {
      where: { id: 'u1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { avatar: true },
    });

    expect(mockTx.user.count).toHaveBeenCalledTimes(3);
    expect(mockTx.user.count).toHaveBeenNthCalledWith(1, { where: { id: 'u1', deletedAt: null } });
    expect(mockTx.user.count).toHaveBeenNthCalledWith(2, { where: { id: 'u1', deletedAt: null } });
    expect(mockTx.user.count).toHaveBeenNthCalledWith(3, { where: { deletedAt: null } });

    expect(mockTx.user.create).toHaveBeenCalledWith({ data: { username: 'u' } });
    expect(mockTx.user.createManyAndReturn).toHaveBeenCalledWith({ data: [{ username: 'u' }] });

    expect(mockTx.user.update).toHaveBeenCalledTimes(2);
    expect(mockTx.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'u1', deletedAt: null },
      data: { username: 'u2' },
    });
    expect(mockTx.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'u1', deletedAt: null },
      data: { username: 'u3' },
    });

    expect(mockTx.$transaction).toHaveBeenCalledTimes(1);
    const txArg = mockTx.$transaction.mock.calls[0]?.[0];
    expect(Array.isArray(txArg)).toBe(true);
    if (Array.isArray(txArg)) {
      expect(txArg).toHaveLength(1);
    }

    expect(mockTx.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('deleteMany/softDeleteMany/restoreMany empty and non-empty paths', async () => {
    await setup();
    mockTx.$transaction.mockImplementation(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: typeof mockTx) => Promise<unknown>)(mockTx) : arg,
    );
    mockTx.user.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = userBuilder({ id: 'u1' });
    mockTx.user.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.user.update.mockResolvedValue(row);
    await repository.softDelete('u1');
    await repository.restore('u1');

    mockTx.user.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    mockTx.user.updateManyAndReturn.mockResolvedValueOnce([row] as any);
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.user.updateManyAndReturn.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    mockTx.user.updateManyAndReturn.mockResolvedValueOnce([row] as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});
