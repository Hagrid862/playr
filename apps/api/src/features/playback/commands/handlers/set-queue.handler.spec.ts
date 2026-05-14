import { BadRequestException } from '@nestjs/common';
import type { PlaybackState, QueueItem } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { fixtureQueueItem, playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetQueueCommand } from '../impl/set-queue.command';
import { SetQueueHandler } from './set-queue.handler';

describe('SetQueueHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = playbackStateFixture({
    userId,
    activeDeviceId: 'device-1',
    trackData: {
      id: 'track-1',
      trackId: 't1',
      title: 'Track',
      artists: ['Artist'],
      albumArt: null,
      albumName: 'Album',
      albumId: 'album-1',
      duration: 120,
      explicit: false,
    },
    queue: [],
    currentTime: 10,
    volume: 0.5,
    version: 1,
    isPlaying: true,
  });

  it('updates the queue items', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetQueueHandler(persistence);
    const newQueue: QueueItem[] = [
      fixtureQueueItem({
        queueId: '01900000-0000-7000-8000-000000000001',
        track: initialState.trackData,
        position: 0,
        originalPosition: 0,
        type: 'queue',
      }),
    ];
    const command = new SetQueueCommand(userId, sessionId, {
      items: newQueue,
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue).toHaveLength(1);
    expect(result.queue[0].track.title).toBe('Track');
  });

  it('preserves missing originalPosition if not provided', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetQueueHandler(persistence);
    const itemWithoutOriginalPos = fixtureQueueItem({
      queueId: '01900000-0000-7000-8000-000000000001',
      track: initialState.trackData,
      position: 0,
      originalPosition: undefined as any,
      type: 'queue',
    });
    const command = new SetQueueCommand(userId, sessionId, {
      items: [itemWithoutOriginalPos],
      expectedVersion: 1,
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.queue[0].position).toBe(0);
    expect(result.queue[0].originalPosition).toBeUndefined();
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetQueueHandler(persistence);
    const command = new SetQueueCommand(userId, sessionId, {
      items: [],
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
