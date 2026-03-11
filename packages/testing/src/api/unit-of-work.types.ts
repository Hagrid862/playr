import type { Prisma } from '@repo/db';

/**
 * Minimal UnitOfWorkService interface for testing.
 */
export interface UnitOfWorkService {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
  getTransactionalClient(): Prisma.TransactionClient | undefined;
}
