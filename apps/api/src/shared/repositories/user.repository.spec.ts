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
    await repository.findManyWithInclude({ id: 'u1' }, {}, { avatar: true });
    await repository.findManyWithInclude(
      { id: 'u1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { avatar: true },
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
