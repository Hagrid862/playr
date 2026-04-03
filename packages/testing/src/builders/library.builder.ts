import { randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import { type Library } from "@repo/db";

export function libraryBuilder(overrides?: Partial<Library>): Library {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    userId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    deletedAt: null,
    ...overrides,
  };
}
