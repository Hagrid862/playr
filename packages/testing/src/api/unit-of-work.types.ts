/**
 * Minimal UnitOfWorkService interface for testing.
 */
export interface UnitOfWorkService {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;
}
