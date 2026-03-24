import { sessionBuilder, userBuilder } from '@repo/testing/builders';
import { PrismaServiceMock } from '@repo/testing/nestjs';

type JwtAuthMockOverrides = {
  userId?: string;
  sessionId?: string;
  username?: string;
};

export const DEFAULT_AUTH_USER_ID = 'user-123';
export const DEFAULT_AUTH_SESSION_ID = 'session-123';
export const DEFAULT_AUTH_USERNAME = 'testuser';

export function setupJwtAuthPrismaMocks(
  prismaMock: PrismaServiceMock,
  overrides: JwtAuthMockOverrides = {},
): void {
  const userId = overrides.userId ?? DEFAULT_AUTH_USER_ID;
  const sessionId = overrides.sessionId ?? DEFAULT_AUTH_SESSION_ID;
  const username = overrides.username ?? DEFAULT_AUTH_USERNAME;

  prismaMock.client.session.findUnique.mockResolvedValue(
    sessionBuilder({
      id: sessionId,
      userId,
      revokedAt: null,
      deletedAt: null,
    }),
  );

  prismaMock.client.user.findUnique.mockResolvedValue(
    userBuilder({
      id: userId,
      username,
      deletedAt: null,
    }),
  );
}
