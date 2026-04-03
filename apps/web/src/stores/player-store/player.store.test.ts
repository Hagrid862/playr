import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { resetPlayerStore } from './player-store.test-helpers';
import { usePlayerStore } from './player.store';

describe('player.store', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  it('exposes initial playback state', () => {
    const s = usePlayerStore.getState();
    expect(s.currentTrack).toBeNull();
    expect(s.isPlaying).toBe(false);
    expect(s.repeatMode).toBe('off');
    expect(s.queue).toEqual([]);
  });
});
