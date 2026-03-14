import { createMock, DeepMocked } from '@golevelup/ts-vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createPrismaClient } from '@repo/db';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TRANSACTION_CONTEXT,
  type ITransactionContext,
} from '../interfaces/transaction-context.interface';
import { PrismaService } from './prisma.service';

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
  let transactionContext: DeepMocked<ITransactionContext>;
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
    transactionContext = createMock<ITransactionContext>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService, { provide: TRANSACTION_CONTEXT, useValue: transactionContext }],
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
    const mockContext = createMock<ITransactionContext>();
    expect(() => new PrismaService(mockContext)).toThrow(
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
      transactionContext.getTransactionalClient.mockReturnValue(mockTx as any);

      expect(service.client).toBe(mockTx);
      expect(transactionContext.getTransactionalClient).toHaveBeenCalled();
    });

    it('should return main client if no transaction is active', () => {
      transactionContext.getTransactionalClient.mockReturnValue(undefined);

      expect(service.client).toBe(mockPrismaClient);
      expect(transactionContext.getTransactionalClient).toHaveBeenCalled();
    });
  });

  describe('mainClient', () => {
    it('should always return the original prisma client even if transaction is active', () => {
      transactionContext.getTransactionalClient.mockReturnValue({ fake: 'tx' } as any);

      expect(service.mainClient).toBe(mockPrismaClient);
    });
  });
});
