import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/playback-sync', () => ({
  afterLocalPlaybackMutation: vi.fn(),
  afterLocalPlaybackMutationWithClaim: vi.fn(),
  syncPlayingStateToServer: vi.fn(),
  isPlaybackSyncConnected: vi.fn(() => false),
}));

import { getState, resetPlayerStore } from './player-store.test-helpers';

describe('player-store.actions.ui', () => {
  beforeEach(() => {
    resetPlayerStore();
  });

  it('toggles queue open state', () => {
    getState().toggleQueue();
    expect(getState().isQueueOpen).toBe(true);
    getState().toggleQueue();
    expect(getState().isQueueOpen).toBe(false);
  });

  it('sets queue open directly', () => {
    getState().setQueueOpen(true);
    expect(getState().isQueueOpen).toBe(true);
  });

  it('sets sidebar view', () => {
    getState().setSidebarView('lyrics');
    expect(getState().sidebarView).toBe('lyrics');
  });
});
