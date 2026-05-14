import type { ZodUser } from '@repo/contracts';
import { userBuilder } from '@repo/testing/builders';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './auth.store';

vi.mock('./idb-storage', () => ({
  idbStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUser = (() => {
  const { password, ...user } = userBuilder({ id: 'user-1', username: 'testuser' });
  void password; // Omitted for ZodUser
  return user as ZodUser;
})();

describe('auth.store', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
  });

  it('initializes with null state', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('sets auth via setAuth', () => {
    useAuthStore.getState().setAuth(mockUser, 'token-123');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe('token-123');
    expect(state.isAuthenticated).toBe(true);
  });

  it('updates access token via updateAccessToken', () => {
    useAuthStore.getState().setAuth(mockUser, 'old-token');
    useAuthStore.getState().updateAccessToken('new-token');

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('new-token');
    expect(state.user).toEqual(mockUser);
  });

  it('clears state on logout', () => {
    useAuthStore.getState().setAuth(mockUser, 'token-123');
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
