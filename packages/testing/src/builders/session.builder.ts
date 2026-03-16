import { rand, randFutureDate, randPastDate, randUuid } from "@ngneat/falso";
import { SessionType, type Session } from "@repo/db";

export function sessionBuilder(overrides?: Partial<Session>): Session {
  return {
    id: randUuid(),
    userId: randUuid(),
    type: rand([
      SessionType.user,
      SessionType.guest,
      SessionType.admin,
      SessionType.artist,
    ]),
    createdAt: randPastDate(),
    updatedAt: randPastDate(),
    expiresAt: randFutureDate(),
    refreshedAt: null,
    revokedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
