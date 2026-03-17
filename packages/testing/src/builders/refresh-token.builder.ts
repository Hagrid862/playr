import { randBetweenDate, randPastDate, randUuid } from "@ngneat/falso";
import { RefreshToken } from "@repo/db";

export function refreshTokenBuilder(
  overrides?: Partial<RefreshToken>,
): RefreshToken {
  const createdAt = randPastDate();
  return {
    id: randUuid(),
    token: randUuid(),
    sessionId: randUuid(),
    createdAt,
    updatedAt: randBetweenDate({ from: createdAt, to: new Date() }),
    revokedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
