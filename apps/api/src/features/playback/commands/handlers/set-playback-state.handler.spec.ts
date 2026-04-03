import { BadRequestException } from '@nestjs/common';
import {
  PLAYBACK_HISTORY_MAX_LENGTH,
  PlaybackState,
  SetPlaybackStateRequest,
} from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { fixtureQueueItem, playbackStateFixture } from '../../test-utils/playback-state.fixture';
import { SetPlaybackStateCommand } from '../impl/set-playback-state.command';
import { SetPlaybackStateHandler } from './set-playback-state.handler';

describe('SetPlaybackStateHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';

  const statePayload: SetPlaybackStateRequest['state'] = {
    devices: [],
    isPlaying: false,
    currentTime: 0,
    volume: 0.8,
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
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
    history: [],
  };

  const initialState: PlaybackState = playbackStateFixture({
    userId,
    ...statePayload,
    version: 1,
    updatedAt: new Date().toISOString(),
  });

  it('initializes state and claims device when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    const result = await handler.execute(command);
    expect(result).toEqual(initialState);
    expect(persistence.createIfAbsent).toHaveBeenCalled();

    const [, payload] = persistence.createIfAbsent.mock.calls[0]!;
    expect(payload.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'device-1', name: 'Web', icon: 'desktop' }),
      ]),
    );
  });

  it('initializes state without claiming device when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
      expectedVersion: 0,
      claimActiveDevice: false,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);
    const [, payload] = persistence.createIfAbsent.mock.calls[0]!;
    expect(payload).not.toHaveProperty('activeDeviceId');
  });

  it('updates state and claims device when expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-new',
      'New Device',
      'mobile',
      {
        state: statePayload,
        expectedVersion: 1,
        claimActiveDevice: true,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-new');
    expect(result.devices).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'device-new', icon: 'mobile' })]),
    );
  });

  it('updates state without claiming device when expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-new',
      'New Device',
      'mobile',
      {
        state: statePayload,
        expectedVersion: 1,
        claimActiveDevice: false,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(initialState);
      return { ...initialState, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-1');
  });

  it('throws BadRequestException on Zod validation failure', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: { ...statePayload, trackData: { ...statePayload.trackData, duration: -1 } } as any,
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('uses default expectedVersion: 0 and claimActiveDevice: true if omitted', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: statePayload,
    } as any);

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);

    expect(persistence.createIfAbsent).toHaveBeenCalled();
    expect(persistence.createIfAbsent).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        activeDeviceId: 'device-1',
      }),
    );
  });

  it('truncates history to PLAYBACK_HISTORY_MAX_LENGTH on create', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const filler = Array.from({ length: PLAYBACK_HISTORY_MAX_LENGTH + 3 }, (_, i) =>
      fixtureQueueItem({
        queueId: `01900000-0000-6000-8000-${i.toString(16).padStart(12, '0')}`,
      }),
    );
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: { ...statePayload, history: filler },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);

    const payload = persistence.createIfAbsent.mock.calls[0]![1];
    expect(payload.history).toHaveLength(PLAYBACK_HISTORY_MAX_LENGTH);
  });
});
