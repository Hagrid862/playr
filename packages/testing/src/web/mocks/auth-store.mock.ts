/**
 * Creates a default auth store state for tests. Override any field via overrides.
 * Use with vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock({ isAuthenticated: true }))
 *
 * @example
 * ```ts
 * vi.mock('@/stores/auth.store', () => ({ useAuthStore: vi.fn() }));
 * vi.mocked(useAuthStore).mockReturnValue(createAuthStoreMock({ isAuthenticated: true }));
 * ```
 */
export function createAuthStoreMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const noop = () => {};
  return {
    accessToken: null,
    user: null,
    isAuthenticated: false,
    _hasHydrated: false,
    setAuth: noop,
    updateAccessToken: noop,
    logout: noop,
    ...overrides,
  };
}