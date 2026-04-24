import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
import { emailAddressBuilder } from '@repo/testing/builders';
import { createPrismaMock, DeepMocked } from '@repo/testing/nestjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmailAddressRepository } from './email-address.repository';
import { PrismaService } from '../services/prisma.service';

describe('EmailAddressRepository', () => {
  let repository: EmailAddressRepository;
  let mockTx: DeepMocked<PrismaClient>;

  const setup = async () => {
    const prismaMock = createPrismaMock(PrismaService);
    mockTx = prismaMock.mockTx;
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailAddressRepository, prismaMock.prismaProvider],
    }).compile();
    repository = module.get(EmailAddressRepository);
  };

  afterEach(() => vi.clearAllMocks());

  it('find methods include deletedAt guard and include defaults', async () => {
    await setup();
    mockTx.emailAddress.findFirst.mockResolvedValue({ id: 'e1' } as any);
    mockTx.emailAddress.findMany.mockResolvedValue([]);

    await repository.findOne({ id: 'e1' });
    expect(mockTx.emailAddress.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: 'e1', deletedAt: null },
      include: { user: true },
    });

    await repository.findOneWithInclude({ id: 'e1' }, { user: true });
    expect(mockTx.emailAddress.findFirst).toHaveBeenNthCalledWith(2, {
      where: { id: 'e1', deletedAt: null },
      include: { user: true },
    });

    await repository.findMany({ userId: 'u1' }, {});
    expect(mockTx.emailAddress.findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'u1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    await repository.findManyWithInclude({ userId: 'u1' }, {}, { user: true });
    expect(mockTx.emailAddress.findMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'u1', deletedAt: null },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });

    await repository.findManyWithInclude(
      { userId: 'u1' },
      { take: 2, skip: 1, orderBy: { createdAt: 'asc' } },
      { user: true },
    );
    expect(mockTx.emailAddress.findMany).toHaveBeenNthCalledWith(3, {
      where: { userId: 'u1', deletedAt: null },
      take: 2,
      skip: 1,
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });
  });

  it('exists and count are deletedAt-aware', async () => {
    await setup();
    mockTx.emailAddress.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7);

    await expect(repository.exists({ id: 'e1' })).resolves.toBe(false);
    await expect(repository.exists({ id: 'e1' })).resolves.toBe(true);
    await expect(repository.count({ userId: 'u1' })).resolves.toBe(7);
    expect(mockTx.emailAddress.count).toHaveBeenNthCalledWith(1, {
      where: { id: 'e1', deletedAt: null },
    });
    expect(mockTx.emailAddress.count).toHaveBeenNthCalledWith(2, {
      where: { id: 'e1', deletedAt: null },
    });
    expect(mockTx.emailAddress.count).toHaveBeenNthCalledWith(3, {
      where: { userId: 'u1', deletedAt: null },
    });
  });

  it('create/update/delete variants are forwarded correctly', async () => {
    await setup();
    const row = emailAddressBuilder({ id: 'e1' });
    mockTx.emailAddress.create.mockResolvedValue(row);
    mockTx.emailAddress.createManyAndReturn.mockResolvedValue([row]);
    mockTx.emailAddress.update.mockResolvedValue(row);
    mockTx.emailAddress.delete.mockResolvedValue(row);
    mockTx.$transaction.mockResolvedValue([row] as any);

    await repository.create({ address: 'x@test.dev' } as any);
    await repository.createMany([{ address: 'x@test.dev' } as any]);
    await repository.update('e1', { address: 'y@test.dev' } as any);
    await repository.updateMany([{ id: 'e1', data: { address: 'z@test.dev' } as any }]);
    await repository.delete('e1');

    expect(mockTx.emailAddress.create).toHaveBeenCalledWith({ data: { address: 'x@test.dev' } });
    expect(mockTx.emailAddress.createManyAndReturn).toHaveBeenCalledWith({
      data: [{ address: 'x@test.dev' }],
    });
    expect(mockTx.emailAddress.update).toHaveBeenCalledWith({
      where: { id: 'e1', deletedAt: null },
      data: { address: 'y@test.dev' },
    });
    expect(mockTx.emailAddress.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
  });

  it('deleteMany returns [] when empty and rows otherwise', async () => {
    await setup();
    mockTx.emailAddress.findMany.mockResolvedValueOnce([]);
    await expect(repository.deleteMany({ userId: 'u1' })).resolves.toEqual([]);
    expect(mockTx.emailAddress.deleteMany).not.toHaveBeenCalled();

    const rows = [emailAddressBuilder({ id: 'e1' })];
    mockTx.emailAddress.findMany.mockResolvedValueOnce(rows);
    await expect(repository.deleteMany({ userId: 'u1' })).resolves.toEqual(rows);
    expect(mockTx.emailAddress.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1'] } },
    });
  });

  it('softDelete/restore single record', async () => {
    await setup();
    const row = emailAddressBuilder({ id: 'e1' });
    mockTx.emailAddress.update.mockResolvedValue(row);

    await repository.softDelete('e1');
    expect(mockTx.emailAddress.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'e1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });

    await repository.restore('e1');
    expect(mockTx.emailAddress.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'e1', deletedAt: { not: null } },
      data: { deletedAt: null },
    });
  });

  it('softDeleteMany and restoreMany handle empty and non-empty branches', async () => {
    await setup();
    const row = emailAddressBuilder({ id: 'e1' });

    const txEmpty = {
      emailAddress: {
        findMany: vi.fn().mockResolvedValue([]),
        updateMany: vi.fn(),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txEmpty));
    await expect(repository.softDeleteMany({ userId: 'u1' })).resolves.toEqual([]);

    const txRows = {
      emailAddress: {
        findMany: vi.fn().mockResolvedValueOnce([row]).mockResolvedValueOnce([row]),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    mockTx.$transaction.mockImplementationOnce(async (cb: any) => cb(txRows));
    await expect(repository.softDeleteMany({ userId: 'u1' })).resolves.toEqual([row]);

    mockTx.emailAddress.findMany.mockResolvedValueOnce([]);
    await expect(repository.restoreMany({ userId: 'u1' })).resolves.toEqual([]);

    mockTx.emailAddress.findMany.mockResolvedValueOnce([row]).mockResolvedValueOnce([row]);
    mockTx.emailAddress.updateMany.mockResolvedValue({ count: 1 } as any);
    await expect(repository.restoreMany({ userId: 'u1' })).resolves.toEqual([row]);
    expect(mockTx.emailAddress.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['e1'] } },
      data: { deletedAt: null },
    });
  });
});
