import { createPlayerStateMock } from '@/components/app/test-utils/player-test-utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyCurrentTimeServerUpdate,
  applyStateFromServer,
  buildSetStateBody,
} from './playback-sync.store-bridge';
import { playbackStateFixture, playbackTrackStub } from './playback-sync.test-helpers';

vi.mock('@/stores/player-store/player.store', () => ({
  usePlayerStore: {
    getState: vi.fn(),
    setState: vi.fn(),
  },
}));

describe('playback-sync.store-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyCurrentTimeServerUpdate', () => {
    it('returns early when payload version is stale', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ playbackVersion: 5 }),
      );
      applyCurrentTimeServerUpdate({ currentTime: 1, version: 3 });
      expect(usePlayerStore.setState).not.toHaveBeenCalled();
    });

    it('when this device plays audio, only bumps playbackVersion', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          playbackVersion: 1,
          activeDeviceId: 'same-device',
          localPlaybackDeviceId: 'same-device',
        }),
      );
      applyCurrentTimeServerUpdate({ currentTime: 99, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({ playbackVersion: 2 });
    });

    it('when another device is active, updates currentTime and version', () => {
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          playbackVersion: 1,
          activeDeviceId: 'remote',
          localPlaybackDeviceId: 'local',
        }),
      );
      applyCurrentTimeServerUpdate({ currentTime: 42, version: 2 });
      expect(usePlayerStore.setState).toHaveBeenCalledWith({
        playbackVersion: 2,
        currentTime: 42,
      });
    });
  });

  describe('buildSetStateBody', () => {
    it('maps playbackDevices into state devices', () => {
      const track = playbackTrackStub('t1', 200);
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({
          currentTrack: track,
          playbackDevices: [
            { id: 'd1', name: 'Desk', icon: 'desktop', isActive: true, isCurrentDevice: true },
          ],
          currentTime: 10,
          volume: 0.75,
          isPlaying: true,
          isShuffled: false,
          repeatMode: 'all',
          queue: [],
          history: [],
          playbackFavorited: 'favorited',
          playbackInLibrary: true,
        }),
      );
      const body = buildSetStateBody(track);
      expect(body.devices).toEqual([{ id: 'd1', name: 'Desk', icon: 'desktop' }]);
      expect(body.isPlaying).toBe(true);
      expect(body.trackData).toEqual(track);
    });
  });

  describe('applyStateFromServer', () => {
    it('delegates to the store', () => {
      const apply = vi.fn();
      vi.mocked(usePlayerStore.getState).mockReturnValue(
        createPlayerStateMock({ applyPlaybackStateFromServer: apply }),
      );
      const server = playbackStateFixture({ version: 9 });
      applyStateFromServer(server);
      expect(apply).toHaveBeenCalledWith(server);
    });
  });
});
