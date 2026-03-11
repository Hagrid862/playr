import {
  SessionType,
  EmailType,
  EmailStatus,
  type Session,
  type RefreshToken,
  type EmailAddress,
} from "@repo/db";
import { buildWithOverrides } from "../../shared";
import { now } from "../internal/time";

export function buildSession(overrides: Partial<Session> = {}): Session {
  const base: Session = {
    id: "session-id-123",
    userId: "user-id-123",
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

export function buildRefreshToken(
  overrides: Partial<RefreshToken> = {},
): RefreshToken {
  const base: RefreshToken = {
    id: "refresh-token-id-123",
    token: "refresh-token-string",
    sessionId: "session-id-123",
    createdAt: now,
    updatedAt: now,
    revokedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}

export function buildEmailAddress(
  overrides: Partial<EmailAddress> = {},
): EmailAddress {
  const base: EmailAddress = {
    id: "email-id-123",
    email: "test@example.com",
    userId: "user-id-123",
    type: EmailType.primary,
    status: EmailStatus.pending,
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
    deletedAt: null,
  };

  return buildWithOverrides(base, overrides);
}
