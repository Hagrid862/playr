import { connectPlaybackSync, disconnectPlaybackSync } from '@/lib/playback/sync/playback-sync';
import type { AuthState } from '@/stores/auth.store';
import { useAuthStore } from '@/stores/auth.store';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackSync } from './PlaybackSync';

function mockAuthState(partial: Pick<AuthState, 'accessToken' | '_hasHydrated'>): AuthState {
  return {
    accessToken: partial.accessToken,
    user: null,
    isAuthenticated: false,
    _hasHydrated: partial._hasHydrated,
    setAuth: vi.fn(),
    updateAccessToken: vi.fn(),
    logout: vi.fn(),
  };
}

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/lib/playback/sync/playback-sync', () => ({
  connectPlaybackSync: vi.fn(),
  disconnectPlaybackSync: vi.fn(),
}));

describe('components/app/PlaybackSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects when hydrated and has token', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector(mockAuthState({ accessToken: 'token', _hasHydrated: true }));
    });

    render(<PlaybackSync />);

    expect(connectPlaybackSync).toHaveBeenCalledWith('token');
  });

  it('disconnects when missing token', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector(mockAuthState({ accessToken: null, _hasHydrated: true }));
    });

    render(<PlaybackSync />);

    expect(disconnectPlaybackSync).toHaveBeenCalled();
    expect(connectPlaybackSync).not.toHaveBeenCalled();
  });

  it('disconnects when not hydrated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector(mockAuthState({ accessToken: 'token', _hasHydrated: false }));
    });

    render(<PlaybackSync />);

    expect(disconnectPlaybackSync).toHaveBeenCalled();
    expect(connectPlaybackSync).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    vi.mocked(useAuthStore).mockImplementation((selector) => {
      return selector(mockAuthState({ accessToken: 'token', _hasHydrated: true }));
    });

    const { unmount } = render(<PlaybackSync />);
    unmount();

    expect(disconnectPlaybackSync).toHaveBeenCalled();
  });
});
