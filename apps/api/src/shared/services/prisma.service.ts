import { forwardRef, Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@repo/db';
import { TRANSACTION_CONTEXT, type ITransactionContext } from '../interfaces/transaction-context.interface';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma: PrismaClient;

  constructor(
    @Inject(forwardRef(() => TRANSACTION_CONTEXT))
    private readonly transactionContext: ITransactionContext,
  ) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    this.prisma = createPrismaClient(databaseUrl);
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }

  get client() {
    return this.transactionContext.getTransactionalClient() ?? this.prisma;
  }

  get mainClient() {
    return this.prisma;
  }
}