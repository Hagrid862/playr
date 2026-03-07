/**
 * Shared cookie options for refresh token.
 * Must be consistent between set (interceptor) and clear (logout) for cookies to work correctly.
 */
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const REFRESH_TOKEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};
