import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { UnitOfWorkService } from './unit-of-work.service';
import { createPrismaClient } from '@repo/db';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createMock, DeepMocked } from '@golevelup/ts-vitest';

// Mock the @repo/db module
vi.mock('@repo/db', async () => {
  const actual = await vi.importActual('@repo/db');
  return {
    ...actual,
    createPrismaClient: vi.fn(),
  };
});

describe('PrismaService', () => {
  let service: PrismaService;
  let unitOfWork: DeepMocked<UnitOfWorkService>;
  let mockPrismaClient: any;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/db';

    mockPrismaClient = {
      $connect: vi.fn().mockResolvedValue(undefined),
      $disconnect: vi.fn().mockResolvedValue(undefined),
      $transaction: vi.fn().mockImplementation((cb) => cb('mock-tx')),
    };

    (createPrismaClient as any).mockReturnValue(mockPrismaClient);
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

  it('should throw error if DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    expect(() => new PrismaService(unitOfWork)).toThrow(
      'DATABASE_URL environment variable is not set',
    );
  });

  it('should call createPrismaClient with DATABASE_URL', () => {
    expect(createPrismaClient).toHaveBeenCalledWith(process.env.DATABASE_URL);
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
      const mockTx = { user: {} };
      unitOfWork.getTransactionalClient.mockReturnValue(mockTx as any);

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
      unitOfWork.getTransactionalClient.mockReturnValue({ fake: 'tx' } as any);

      expect(service.mainClient).toBe(mockPrismaClient);
    });
  });
});
