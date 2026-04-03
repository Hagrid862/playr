import { testQueueItem } from '@/test-utils/queue-test-fixtures';
import type { PlaybackState, PlaybackTrack, ZodTrack } from '@repo/contracts';
import { trackBuilder } from '@repo/testing/builders';
import { describe, expect, it } from 'vitest';
import { zodTrackToPlaybackTrack } from '../../lib/playback/playback-mappers';
import { mapServerPlaybackToPatch } from './player-store.map-server-state';

const createTrack = (id: string, title = 'Test Track'): PlaybackTrack =>
  zodTrackToPlaybackTrack(
    trackBuilder({ id, title, visibility: 'public', albumId: 'test-album' }) as ZodTrack,
  );

describe('mapServerPlaybackToPatch', () => {
  it('maps server state including ordered queue and metadata', () => {
    const t1 = createTrack('t1', 'Title');
    const t2 = createTrack('t2');
    const server = {
      version: 10,
      devices: [],
      favorited: 'favorited' as const,
      inLibrary: true,
      activeDeviceId: 'device-1',
      trackData: t1,
      isPlaying: true,
      currentTime: 50,
      volume: 0.8,
      repeatMode: 'all' as const,
      shuffle: true,
      queue: [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000e1',
          track: t1,
          position: 1,
          originalPosition: 1,
        }),
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000e2',
          track: t2,
          position: 0,
          originalPosition: 0,
        }),
      ],
      history: [],
    } as unknown as PlaybackState;

    const patch = mapServerPlaybackToPatch(
      { localPlaybackDeviceId: '', playbackVersion: 0, currentTime: 0 },
      server,
    );

    expect(patch.playbackVersion).toBe(10);
    expect(patch.playbackFavorited).toBe('favorited');
    expect(patch.isPlaying).toBe(true);
    expect(patch.currentTime).toBe(50);
    expect(patch.volume).toBe(0.8);
    expect(patch.repeatMode).toBe('all');
    expect(patch.isShuffled).toBe(true);
    expect(patch.queue[0]?.queueId).toBe('01900000-0000-7000-8000-0000000000e2');
    expect(patch.queue[1]?.queueId).toBe('01900000-0000-7000-8000-0000000000e1');
  });

  it('maps history from server', () => {
    const t1 = createTrack('t1');
    const t2 = createTrack('t2');
    const histItem = testQueueItem({
      queueId: '01900000-0000-7000-8000-0000000000h1',
      track: t2,
      position: 0,
      originalPosition: 0,
      type: 'playingNext',
    });
    const server = {
      version: 3,
      userId: 'u1',
      devices: [],
      favorited: 'not-set' as const,
      inLibrary: false,
      activeDeviceId: null,
      trackData: t1,
      isPlaying: true,
      currentTime: 0,
      volume: 1,
      repeatMode: 'off' as const,
      shuffle: false,
      updatedAt: new Date().toISOString(),
      queue: [],
      history: [histItem],
    } as unknown as PlaybackState;

    const patch = mapServerPlaybackToPatch(
      { localPlaybackDeviceId: '', playbackVersion: 0, currentTime: 0 },
      server,
    );

    expect(patch.history).toHaveLength(1);
    expect(patch.history[0]?.track.id).toBe('t2');
  });

  it('preserves client currentTime for active audio owner when server time differs while playing', () => {
    const t1 = createTrack('t1', 'Title');
    const t2 = createTrack('t2');
    const t3 = createTrack('t3');

    const server = {
      version: 6,
      userId: 'u1',
      devices: [],
      favorited: 'not-set' as const,
      inLibrary: false,
      activeDeviceId: 'this-device',
      trackData: t1,
      isPlaying: true,
      currentTime: 1,
      volume: 1,
      repeatMode: 'off' as const,
      shuffle: false,
      updatedAt: new Date().toISOString(),
      queue: [
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000f1',
          track: t2,
          position: 0,
          originalPosition: 0,
        }),
        testQueueItem({
          queueId: '01900000-0000-7000-8000-0000000000f2',
          track: t3,
          position: 1,
          originalPosition: 1,
        }),
      ],
      history: [],
    } as unknown as PlaybackState;

    const patch = mapServerPlaybackToPatch(
      {
        localPlaybackDeviceId: 'this-device',
        playbackVersion: 5,
        currentTime: 42,
      },
      server,
    );

    expect(patch.currentTime).toBe(42);
    expect(patch.playbackVersion).toBe(6);
    expect(patch.queue).toHaveLength(2);
  });
});
