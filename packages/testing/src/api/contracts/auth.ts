import { SessionType, EmailType, EmailStatus } from "@repo/db";
import type {
  ZodSession,
  ZodRefreshToken,
  ZodEmailAddress,
} from "@repo/contracts";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildZodSession(
  overrides: Partial<ZodSession> = {},
): ZodSession {
  const base: ZodSession = {
    id: "session-1",
    userId: "user-1",
    type: SessionType.user,
    createdAt: now,
    updatedAt: now,
    expiresAt: null,
    refreshedAt: null,
    revokedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodRefreshToken(
  overrides: Partial<ZodRefreshToken> = {},
): ZodRefreshToken {
  const base: ZodRefreshToken = {
    id: "refresh-token-1",
    token: "test-token",
    sessionId: "session-1",
    accessTokenId: null,
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildZodEmailAddress(
  overrides: Partial<ZodEmailAddress> = {},
): ZodEmailAddress {
  const base: ZodEmailAddress = {
    id: "email-1",
    email: "test@example.com",
    type: EmailType.primary,
    status: EmailStatus.verified,
    userId: "user-1",
    createdAt: now,
    updatedAt: now,
    verifiedAt: now,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
