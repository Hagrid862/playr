import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { fixtureQueueItem, playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetNextQueueItemCommand } from '../impl/set-next-queue-item.command';
import { SetNextQueueItemHandler } from './add-next-queue-item.handler';

describe('SetNextQueueItemHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const trackData = {
    id: 'track-1',
    trackId: 't1',
    title: 'Track',
    artists: ['Artist'],
    albumArt: null,
    albumName: 'Album',
    albumId: 'album-1',
    duration: 120,
    explicit: false,
  };

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData,
    queue: [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        track: trackData,
        position: 0,
        originalPosition: 0,
        type: 'queue',
      }),
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000002',
        track: { ...trackData, id: 'track-2' },
        position: 1,
        originalPosition: 1,
        type: 'playingNext',
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    isPlaying: true,
  });

  it('inserts as first playingNext after manual queue and reindexes positions', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = fixtureQueueItem({
      queueId: '01900000-0000-7000-8000-0000000000aa',
      track: { ...trackData, id: 'track-next' },
      position: 0,
      originalPosition: 0,
      type: 'queue',
    });
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(3);
    expect(result.queue[0].track.id).toBe('track-1');
    expect(result.queue[0].type).toBe('queue');
    expect(result.queue[1].track.id).toBe('track-next');
    expect(result.queue[1].type).toBe('playingNext');
    expect(result.queue[2].track.id).toBe('track-2');
    expect(result.queue[0].position).toBe(0);
    expect(result.queue[1].position).toBe(1);
    expect(result.queue[2].position).toBe(2);
  });

  it('inserts at position 0 when shuffled', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = fixtureQueueItem({
      queueId: '01900000-0000-7000-8000-0000000000dd',
      track: { ...trackData, id: 'track-next' },
      position: 0,
      originalPosition: 0,
      type: 'queue',
    });
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    const shuffledState: PlaybackState = { ...initialState, shuffle: true };
    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...shuffledState, ...merge(shuffledState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].track.id).toBe('track-next');
    expect(result.queue[0].type).toBe('playingNext');
    expect(result.queue[0].position).toBe(0);
  });

  it('inserts as first playingNext when current track is not represented in queue items', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = fixtureQueueItem({
      queueId: '01900000-0000-7000-8000-0000000000bb',
      track: { ...trackData, id: 'track-next' },
      position: 0,
      type: 'queue',
    });
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const stateWithoutCurrentTrack = {
        ...initialState,
        trackData: { ...trackData, id: 'other' },
      };
      return { ...stateWithoutCurrentTrack, ...merge(stateWithoutCurrentTrack) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].track.id).toBe('track-1');
    expect(result.queue[1].track.id).toBe('track-next');
    expect(result.queue[1].type).toBe('playingNext');
    expect(result.queue[1].position).toBe(1);
  });

  it('sets originalPosition if not provided', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const newTrack = fixtureQueueItem({
      queueId: '01900000-0000-7000-8000-0000000000bb',
      track: { ...trackData, id: 'track-next' },
      position: 0,
      originalPosition: undefined as any,
      type: 'queue',
    });
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: newTrack,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    // maxOriginalPos in initialState is 1 (from track-2), so new item should get 1 + 1 = 2
    expect(result.queue[1].originalPosition).toBe(2);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetNextQueueItemHandler(persistence);
    const command = new SetNextQueueItemCommand(userId, sessionId, {
      track: fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-0000000000cc',
        track: trackData,
      }),
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
