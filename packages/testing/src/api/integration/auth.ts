/**
 * Default user ID used across integration test fixtures.
 * Use this when building users and access records to ensure JWT sub, request.user, and mocks align.
 */
export const DEFAULT_TEST_USER_ID = 'user-123' as const;

/**
 * Factory that accepts JwtService + ConfigService from the bootstrapped app.
 * Use in integration tests to create auth headers without duplicating JWT logic.
 */
export function createAuthHeaderFactory(
  jwtService: {
    signAsync: (
      payload: object,
      opts: { secret: string; expiresIn: string },
    ) => Promise<string>;
  },
  config: { get: (key: string) => string },
) {
  return async (userId = DEFAULT_TEST_USER_ID) => {
    const token = await jwtService.signAsync(
      { sub: userId, username: 'testuser', sessionId: 'session-123' },
      { secret: config.get('JWT_ACCESS_SECRET'), expiresIn: '15m' },
    );
    return `Bearer ${token}`;
  };
}
