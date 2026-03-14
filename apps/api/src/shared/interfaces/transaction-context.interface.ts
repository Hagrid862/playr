import type { Prisma } from '@repo/db';

export const TRANSACTION_CONTEXT = Symbol('TRANSACTION_CONTEXT');

export interface ITransactionContext {
  getTransactionalClient(): Prisma.TransactionClient | undefined;
}