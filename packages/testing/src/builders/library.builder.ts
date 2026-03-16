import { randPastDate, randUuid } from "@ngneat/falso";
import { type Library } from "@repo/db";

export function libraryBuilder(overrides?: Partial<Library>): Library {
  return {
    id: randUuid(),
    userId: randUuid(),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    deletedAt: null,
    ...overrides,
  };
}
