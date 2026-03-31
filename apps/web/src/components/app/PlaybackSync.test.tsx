import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaybackSync } from './PlaybackSync';
import { useAuthStore } from '@/stores/auth.store';
import { connectPlaybackSync, disconnectPlaybackSync } from '@/lib/playback-sync';

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/lib/playback-sync', () => ({
  connectPlaybackSync: vi.fn(),
  disconnectPlaybackSync: vi.fn(),
}));

describe('PlaybackSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connects when hydrated and has token', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { accessToken: 'token', _hasHydrated: true };
      return selector(state);
    });

    render(<PlaybackSync />);

    expect(connectPlaybackSync).toHaveBeenCalledWith('token');
  });

  it('disconnects when missing token', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { accessToken: null, _hasHydrated: true };
      return selector(state);
    });

    render(<PlaybackSync />);

    expect(disconnectPlaybackSync).toHaveBeenCalled();
    expect(connectPlaybackSync).not.toHaveBeenCalled();
  });

  it('disconnects when not hydrated', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { accessToken: 'token', _hasHydrated: false };
      return selector(state);
    });

    render(<PlaybackSync />);

    expect(disconnectPlaybackSync).toHaveBeenCalled();
    expect(connectPlaybackSync).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = { accessToken: 'token', _hasHydrated: true };
      return selector(state);
    });

    const { unmount } = render(<PlaybackSync />);
    unmount();

    expect(disconnectPlaybackSync).toHaveBeenCalled();
  });
});
