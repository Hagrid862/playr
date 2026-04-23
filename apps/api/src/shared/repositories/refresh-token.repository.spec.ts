import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { refreshTokenBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RefreshTokenRepository } from './refresh-token.repository';
import { PrismaService } from '../services/prisma.service';

describe('RefreshTokenRepository', () => {
  let repository: RefreshTokenRepository;
  let mockTx: DeepMocked<PrismaClient>;
  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefreshTokenRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(RefreshTokenRepository);
  };
  afterEach(() => vi.clearAllMocks());

  it('find/count/checkAccess branches plus CRUD/revoke operations', async () => {
    await setup();
    mockTx.refreshToken.findFirst.mockResolvedValue({ id: 'rt1' } as any);
    mockTx.refreshToken.findMany.mockResolvedValue([]);
    await repository.findOne({ id: 'rt1' });
    await repository.findOneWithInclude({ id: 'rt1' }, { session: true });
    await repository.findMany({ sessionId: 's1' }, {});
    await repository.findManyWithInclude({ sessionId: 's1' }, {}, { session: true });
    await repository.findManyWithInclude(
      { sessionId: 's1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { session: true },
    );

    mockTx.refreshToken.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5);
    await expect(repository.exists({ id: 'rt1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'rt1' })).resolves.toBe(true);
    await expect(repository.count({})).resolves.toBe(5);

    await expect(repository.checkAccess({ id: 'rt1' })).resolves.toBe(false);
    mockTx.refreshToken.findFirst.mockResolvedValueOnce({ id: 'rt1' } as any);
    await expect(repository.checkAccess({ id: 'rt1' }, 'u1')).resolves.toBe(true);

    const row = refreshTokenBuilder({ id: 'rt1' });
    mockTx.refreshToken.create.mockResolvedValue(row);
    mockTx.refreshToken.createManyAndReturn.mockResolvedValue([row]);
    mockTx.refreshToken.update.mockResolvedValue(row);
    mockTx.refreshToken.delete.mockResolvedValue(row);
    mockTx.refreshToken.updateManyAndReturn.mockResolvedValue([row] as any);
    mockTx.$transaction.mockResolvedValue([row] as any);
    await repository.create({ token: 'x' } as any);
    await repository.createMany([{ token: 'x' } as any]);
    await repository.update('rt1', { token: 'y' } as any);
    await repository.updateMany([{ id: 'rt1', data: { token: 'z' } as any }]);
    await repository.delete('rt1');
    await repository.revoke('rt1');
    await repository.revokeAllBySessionId('s1');
  });

  it('deleteMany/softDeleteMany/restoreMany branches', async () => {
    await setup();
    mockTx.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({})).resolves.toEqual([]);
    const row = refreshTokenBuilder({ id: 'rt1' });
    mockTx.refreshToken.findMany.mockResolvedValueOnce([row]);
    await expect(repository.deleteMany({})).resolves.toEqual([row]);

    mockTx.refreshToken.update.mockResolvedValue(row);
    await repository.softDelete('rt1');
    await repository.restore('rt1');

    const txEmpty = {
      refreshToken: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({})).resolves.toEqual([]);
    const txRows = {
      refreshToken: {
        findMany: vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({})).resolves.toEqual([row]);

    mockTx.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({})).resolves.toEqual([]);
    mockTx.refreshToken.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.refreshToken.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({})).resolves.toEqual([row]);
  });
});
