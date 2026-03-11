import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { UnitOfWorkService } from './unit-of-work.service';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { createMockPrismaClient } from '@repo/testing';
import { createPrismaClient } from '@repo/db';

vi.mock('@repo/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@repo/db')>();
  return {
    ...actual,
    createPrismaClient: vi.fn(),
  };
});

describe('PrismaService', () => {
  let service: PrismaService;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let mockPrismaClient: ReturnType<typeof createMockPrismaClient>;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://user:password@localhost:5432/db',
    };

    mockPrismaClient = createMockPrismaClient();
    vi.mocked(createPrismaClient).mockReturnValue(mockPrismaClient as any);
    unitOfWork = createMock<UnitOfWorkService>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, { provide: UnitOfWorkService, useValue: unitOfWork }],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should throw an error if DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      expect(() => new PrismaService(unitOfWork)).toThrowError(
        'DATABASE_URL environment variable is not set',
      );
    });
  });

  describe('onModuleInit', () => {
    it('should call prisma.$connect', async () => {
      await service.onModuleInit();
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should call prisma.$disconnect', async () => {
      await service.onModuleDestroy();
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
    });
  });

  describe('client selector', () => {
    it('should return transactional client if available from UnitOfWork', () => {
      const mockTx = createMockPrismaClient();
      unitOfWork.getTransactionalClient.mockReturnValue(mockTx);

      expect(service.client).toBe(mockTx);
      expect(unitOfWork.getTransactionalClient).toHaveBeenCalled();
    });

    it('should return main client if no transaction is active', () => {
      unitOfWork.getTransactionalClient.mockReturnValue(undefined);

      expect(service.client).toBe(mockPrismaClient);
      expect(unitOfWork.getTransactionalClient).toHaveBeenCalled();
    });
  });

  describe('mainClient', () => {
    it('should always return the original prisma client even if transaction is active', () => {
      unitOfWork.getTransactionalClient.mockReturnValue(createMockPrismaClient());

      expect(service.mainClient).toBe(mockPrismaClient);
    });
  });
});
