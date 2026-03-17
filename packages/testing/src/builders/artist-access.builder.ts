import { rand, randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import type { ArtistAccess } from "@repo/db";
import { AccessRole } from "@repo/db";

export function artistAccessBuilder(
  overrides?: Partial<ArtistAccess>,
): ArtistAccess {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    artistId: randUuid(),
    userId: randUuid(),
    role: rand([AccessRole.owner, AccessRole.editor, AccessRole.viewer]),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    ...overrides,
  };
}
