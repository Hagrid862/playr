import { SessionType, type Session } from "@repo/db";
import { TEST_IDS } from "./constants";

export function sessionBuilder(overrides?: Partial<Session>): Session {
  const now = new Date();
  return {
    id: TEST_IDS.session,
    userId: TEST_IDS.user,
    type: SessionType.user,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30),
    refreshedAt: null,
    revokedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
