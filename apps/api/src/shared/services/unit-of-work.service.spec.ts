import { DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@repo/db';
// @ts-expect-error - ignore type errors from testing package imports
import { createMockPrismaClient, createMockPrismaService } from '@repo/testing';
import { PrismaService } from './prisma.service';
import { UnitOfWorkService } from './unit-of-work.service';

describe('UnitOfWorkService', () => {
  let service: UnitOfWorkService;
  let prismaService: ReturnType<typeof createMockPrismaService>;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrismaClient = createMockPrismaClient();
    prismaService = createMockPrismaService({ client: mockPrismaClient });

    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitOfWorkService, { provide: PrismaService, useValue: prismaService }],
    }).compile();

    service = module.get<UnitOfWorkService>(UnitOfWorkService);
  });

  it('should run work in a transaction and make client available via ALS', async () => {
    const mockTransactionClient = createMockPrismaClient();
    mockPrismaClient.$transaction.mockImplementationOnce(
      async (callback: (tx: DeepMocked<PrismaClient>) => unknown) => {
        return callback(mockTransactionClient);
      },
    );

    await service.runInTransaction(async () => {
      const client = service.getTransactionalClient();
      expect(client).toBe(mockTransactionClient);
    });

    expect(mockPrismaClient.$transaction).toHaveBeenCalled();
  });

  it('should return undefined client outside of transaction', async () => {
    const client = service.getTransactionalClient();
    expect(client).toBeUndefined();
  });

  it('should reuse existing transaction if already in one', async () => {
    await service.runInTransaction(async () => {
      await service.runInTransaction(async () => {
        expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });
});
