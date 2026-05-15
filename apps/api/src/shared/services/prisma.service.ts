import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createPrismaClient,
  createExtendedPrismaClient,
  type PrismaClient,
  ExtendedPrismaClient,
} from '@repo/db';
import {
  TRANSACTION_CONTEXT,
  type ITransactionContext,
} from '../interfaces/transaction-context.interface';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private basePrisma: PrismaClient;
  private extendedPrisma: ExtendedPrismaClient;

  constructor(
    @Inject(forwardRef(() => TRANSACTION_CONTEXT))
    private readonly transactionContext: ITransactionContext,
  ) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    this.basePrisma = createPrismaClient(databaseUrl);
    this.extendedPrisma = createExtendedPrismaClient(databaseUrl);
  }

  async onModuleInit() {
    await this.basePrisma.$connect();
    await this.extendedPrisma.$connect();
  }

  async onModuleDestroy() {
    await this.basePrisma.$disconnect();
    await this.extendedPrisma.$disconnect();
  }

  get client() {
    return this.transactionContext.getTransactionalClient() ?? this.basePrisma;
  }

  get extended() {
    // NOTE: The extendedPrisma client uses a separate database connection pool
    // and does not participate in transactions managed by transactionContext.
    // If a transactional client exists (via transactionContext.getTransactionalClient()),
    // callers that need transactional behavior should use the `client` getter instead.
    // The extended client provides additional helper methods not available on the
    // transactional Prisma.TransactionClient.
    // a way to extend the transactional client from transactionContext.getTransactionalClient()
    // rather than always returning this.extendedPrisma.
    return this.extendedPrisma;
  }

  get mainClient() {
    return this.basePrisma;
  }
}
