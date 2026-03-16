import {
  rand,
  randBetweenDate,
  randFutureDate,
  randPastDate,
  randUuid,
} from "@ngneat/falso";
import { SessionType, type Session } from "@repo/db";

export function sessionBuilder(overrides?: Partial<Session>): Session {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    userId: randUuid(),
    type: rand([
      SessionType.user,
      SessionType.guest,
      SessionType.admin,
      SessionType.artist,
    ]),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    expiresAt: randFutureDate(),
    refreshedAt: null,
    revokedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
