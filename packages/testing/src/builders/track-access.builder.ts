import { rand, randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import type { TrackAccess } from "@repo/db";
import { AccessRole } from "@repo/db";

export function trackAccessBuilder(
  overrides?: Partial<TrackAccess>,
): TrackAccess {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    trackId: randUuid(),
    userId: randUuid(),
    role: rand([AccessRole.owner, AccessRole.editor, AccessRole.viewer]),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    ...overrides,
  };
}
