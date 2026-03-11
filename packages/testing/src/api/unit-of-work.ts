import type { UnitOfWorkService } from "./unit-of-work.types";
import { createMock, type DeepMocked } from "@golevelup/ts-vitest";

/**
 * Creates a UnitOfWorkService mock that executes the callback directly
 * (no real transaction). Use for handler tests.
 */
export function createMockUnitOfWork(): DeepMocked<UnitOfWorkService> {
  const mock = createMock<UnitOfWorkService>();
  mock.runInTransaction.mockImplementation(async (work) => work());
  mock.getTransactionalClient.mockReturnValue(undefined);
  return mock;
}
