import { BadRequestException } from '@nestjs/common';
import { PlaybackState, PlaybackTrack, QueueItem } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { fixtureQueueItem, playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { AddQueueItemCommand } from '../impl/add-queue-item.command';
import { AddQueueItemHandler } from './add-queue-item.handler';

describe('AddQueueItemHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const trackData: PlaybackTrack = {
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

  const track1: PlaybackTrack = { ...trackData, id: 'track-1' };
  const track2: PlaybackTrack = { ...trackData, id: 'track-2' };
  const track3: PlaybackTrack = { ...trackData, id: 'track-3' };

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData,
    queue: [
      fixtureQueueItem({
        track: track1,
        position: 0,
        originalPosition: 0,
        queueId: '01900000-0000-7000-8000-000000000001',
        type: 'queue',
      }),
      fixtureQueueItem({
        track: track2,
        position: 1,
        originalPosition: 1,
        queueId: '01900000-0000-7000-8000-000000000002',
        type: 'queue',
      }),
    ],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('appends item to the end of the queue by default', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new AddQueueItemHandler(persistence);
    const newTrack: QueueItem = fixtureQueueItem({
      track: track3,
      position: 99,
      queueId: '01900000-0000-7000-8000-000000000003',
      type: 'queue',
    });
    const command = new AddQueueItemCommand(userId, sessionId, {
      track: newTrack,
      position: null,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const merged = merge(initialState);
      return {
        ...initialState,
        ...merged,
        version: initialState.version + 1,
        updatedAt: new Date().toISOString(),
      };
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(3);
    expect(result.queue[2].track.id).toBe('track-3');
  });

  it('inserts item at explicit position', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new AddQueueItemHandler(persistence);
    const newTrack: QueueItem = fixtureQueueItem({
      track: track3,
      position: 99,
      queueId: '01900000-0000-7000-8000-000000000003',
      type: 'queue',
    });
    const command = new AddQueueItemCommand(userId, sessionId, {
      track: newTrack,
      position: 0,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const merged = merge(initialState);
      return {
        ...initialState,
        ...merged,
        version: initialState.version + 1,
        updatedAt: new Date().toISOString(),
      };
    });

    const result = await handler.execute(command);
    expect(result.queue[0].track.id).toBe('track-3');
    expect(result.queue[1].track.id).toBe('track-1');
    expect(result.queue[2].track.id).toBe('track-2');
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new AddQueueItemHandler(persistence);
    const command = new AddQueueItemCommand(userId, sessionId, {
      track: fixtureQueueItem({
        track: trackData,
        position: 0,
        queueId: '01900000-0000-7000-8000-000000000099',
      }),
      position: null,
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
