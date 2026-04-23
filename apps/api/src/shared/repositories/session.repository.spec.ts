import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { sessionBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionRepository } from './session.repository';
import { PrismaService } from '../services/prisma.service';

describe('SessionRepository', () => {
  let repository: SessionRepository;
  let mockTx: DeepMocked<PrismaClient>;
  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(SessionRepository);
  };
  afterEach(() => vi.clearAllMocks());

  it('find/count/checkAccess branches and base CRUD', async () => {
    await setup();
    mockTx.session.findFirst.mockResolvedValue({ id: 's1' } as any);
    mockTx.session.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 's1' });
    await repository.findOneWithInclude({ id: 's1' }, { user: true });
    await repository.findMany({ userId: 'u1' }, {});
    await repository.findManyWithInclude({ userId: 'u1' }, {}, { user: true });
    await repository.findManyWithInclude(
      { userId: 'u1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { user: true },
    );

    mockTx.session.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(4);
    await expect(repository.exists({ id: 's1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 's1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(4);

    await expect(repository.checkAccess({ id: 's1' })).resolves.toBe(false);
    mockTx.session.findFirst.mockResolvedValueOnce({ id: 's1' } as any);
    await expect(repository.checkAccess({ id: 's1' }, 'u1')).resolves.toBe(true);

    const row = sessionBuilder({ id: 's1' });
    mockTx.session.create.mockResolvedValue(row);
    mockTx.session.createManyAndReturn.mockResolvedValue([row]);
    mockTx.session.update.mockResolvedValue(row);
    mockTx.session.delete.mockResolvedValue(row);
    mockTx.session.updateManyAndReturn.mockResolvedValue([row] as any);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ userId: 'u1' } as any);
    await repository.createMany([{ userId: 'u1' } as any]);
    await repository.update('s1', { ip: 'x' } as any);
    await repository.updateMany([{ id: 's1', data: { ip: 'x' } as any }]);
    await repository.delete('s1');
    await repository.revoke('s1');
    await repository.revokeAllByUserId('u1');
  });

  it('delete/softDelete/restore many branches', async () => {
    await setup();
    mockTx.session.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = sessionBuilder({ id: 's1' });
    mockTx.session.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.session.update.mockResolvedValue(row);
    await repository.softDelete('s1');
    await repository.restore('s1');

    const txEmpty = { session: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() } };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    const txRows = {
      session: {
        findMany: vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.session.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    mockTx.session.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.session.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});
