import { ZodUser } from '@repo/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

const mockUser: ZodUser = {
  id: 'user-1',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  gender: 'male',
  birthDate: '2000-01-01',
  description: null,
  avatarId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

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
