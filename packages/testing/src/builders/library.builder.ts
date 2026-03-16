import { type Library } from "@repo/db";
import { TEST_IDS } from "./constants";

export function libraryBuilder(overrides?: Partial<Library>): Library {
  const now = new Date();
  return {
    id: TEST_IDS.library,
    userId: TEST_IDS.user,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
