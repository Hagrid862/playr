import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { AsyncLocalStorage } from 'async_hooks';
import type { ITransactionContext } from '../interfaces/transaction-context.interface';
import { PrismaService } from './prisma.service';

@Injectable()
export class UnitOfWorkService implements ITransactionContext {
  private readonly als = new AsyncLocalStorage<Prisma.TransactionClient>();

    constructor(private readonly prisma: PrismaService) {}

  /**
   * Runs the provided work within a transaction.
   * If a transaction is already active in the current context, it uses the existing one.
   */
  async runInTransaction<T>(work: () => Promise<T>): Promise<T> {
    const existingTx = this.als.getStore();
    if (existingTx) return work();
    return this.prisma.mainClient.$transaction(async (tx: Prisma.TransactionClient) => {
      return this.als.run(tx, work);
    });
  }

  /**
   * Returns the transactional client if available in the current context.
   */
  getTransactionalClient(): Prisma.TransactionClient | undefined {
    return this.als.getStore();
  }
}
