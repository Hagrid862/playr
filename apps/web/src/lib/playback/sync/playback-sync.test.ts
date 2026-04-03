import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackSocket } from '../playback-socket';
import {
  connectPlaybackSync,
  disconnectPlaybackSync,
  isPlaybackSyncConnected,
} from './playback-sync';

vi.mock('../playback-socket', () => ({
  createPlaybackSocket: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: true,
  })),
}));

vi.mock('../playback-device', () => ({
  getLocalPlaybackDeviceMetadata: vi.fn(() => ({
    playbackDeviceId: 'device-1',
    deviceName: 'Web',
    deviceIcon: 'desktop',
  })),
}));

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: {
    getState: vi.fn(() => ({
      currentTrack: { id: 't1' },
      playbackVersion: 1,
      isPlaying: false,
      applyPlaybackStateFromServer: vi.fn(),
      setPlaybackDevices: vi.fn(),
      setLocalPlaybackDeviceId: vi.fn(),
    })),
    setState: vi.fn(),
  },
}));

describe('playback/sync/playback-sync', () => {
  afterEach(() => {
    disconnectPlaybackSync();
  });

  it('exports a connectable sync module', () => {
    expect(isPlaybackSyncConnected()).toBe(false);
    connectPlaybackSync('token');
    expect(isPlaybackSyncConnected()).toBe(true);
    expect(createPlaybackSocket).toHaveBeenCalled();
  });
});
