import { Test, TestingModule } from '@nestjs/testing';
import { UnitOfWorkService } from './unit-of-work.service';
import { PrismaService } from './prisma.service';

describe('UnitOfWorkService', () => {
  let service: UnitOfWorkService;
  let prisma: PrismaService;

  const mockTransactionClient = {
    $transaction: vi.fn(),
    session: { create: vi.fn() },
    refreshToken: { create: vi.fn() },
  };

  const mockPrismaClient = {
    $transaction: vi.fn(async (callback) => {
      return callback(mockTransactionClient);
    }),
  };

  const mockPrismaService = {
    get mainClient() {
      return mockPrismaClient;
    },
    get client() {
      // In real PrismaService, this calls unitOfWork.getTransactionalClient()
      // For testing, we verify if service.getTransactionalClient() returns the right thing
      return service.getTransactionalClient() || mockPrismaClient;
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitOfWorkService, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();

    service = module.get<UnitOfWorkService>(UnitOfWorkService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should run work in a transaction and make client available via ALS', async () => {
    await service.runInTransaction(async () => {
      const client = service.getTransactionalClient();
      expect(client).toBe(mockTransactionClient);

      // Verify that prisma.client returns the transactional client
      expect(prisma.client).toBe(mockTransactionClient);
    });

    expect(mockPrismaClient.$transaction).toHaveBeenCalled();
  });

  it('should return undefined client outside of transaction', async () => {
    const client = service.getTransactionalClient();
    expect(client).toBeUndefined();
    expect(prisma.client).toBe(mockPrismaClient);
  });

  it('should reuse existing transaction if already in one', async () => {
    await service.runInTransaction(async () => {
      await service.runInTransaction(async () => {
        expect(mockPrismaClient.$transaction).toHaveBeenCalledTimes(1);
      });
    });
  });
});
