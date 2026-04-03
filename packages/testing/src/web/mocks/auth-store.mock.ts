interface AuthStoreMock {
  accessToken: string | null;
  user: unknown | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: () => void;
  updateAccessToken: () => void;
  logout: () => void;
}

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
  overrides: Partial<AuthStoreMock> = {},
): AuthStoreMock {
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
