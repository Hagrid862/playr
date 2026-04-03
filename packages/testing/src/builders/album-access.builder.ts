import { rand, randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import type { AlbumAccess } from "@repo/db";
import { AccessRole } from "@repo/db";

export function albumAccessBuilder(
  overrides?: Partial<AlbumAccess>,
): AlbumAccess {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    albumId: randUuid(),
    userId: randUuid(),
    role: rand([AccessRole.owner, AccessRole.editor, AccessRole.viewer]),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    ...overrides,
  };
}
