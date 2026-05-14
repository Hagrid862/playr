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

  it('preserves existing payload devices when initializing state and claiming device', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const peerDevice = { id: 'peer-device', name: 'Peer', icon: 'speaker' as const };
    const command = new SetPlaybackStateCommand(userId, sessionId, 'device-1', 'Web', 'desktop', {
      state: { ...statePayload, devices: [peerDevice] },
      expectedVersion: 0,
      claimActiveDevice: true,
    });

    persistence.createIfAbsent.mockResolvedValue(initialState);

    await handler.execute(command);

    const [, payload] = persistence.createIfAbsent.mock.calls[0]!;
    expect(payload.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'peer-device' }),
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

  it('keeps current devices when payload has no devices and claimActiveDevice is false', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const existingDevice = { id: 'device-old', name: 'Old', icon: 'desktop' as const };
    const stateWithDevices = playbackStateFixture({
      userId,
      ...statePayload,
      devices: [existingDevice],
      version: 1,
      activeDeviceId: 'device-old',
    });

    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-new',
      'New Device',
      'mobile',
      {
        state: { ...statePayload, devices: [] },
        expectedVersion: 1,
        claimActiveDevice: false,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(stateWithDevices);
      return { ...stateWithDevices, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);

    expect(result.devices).toEqual([existingDevice]);
    expect(result.activeDeviceId).toBe('device-old');
  });

  it('handles missing current.devices by defaulting to empty array when expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const stateWithoutDevices = playbackStateFixture({
      userId,
      ...statePayload,
      devices: undefined as any, // Simulate missing devices field
      version: 1,
    });

    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-active',
      'Active Device',
      'speaker',
      {
        state: statePayload,
        expectedVersion: 1,
        claimActiveDevice: true,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(stateWithoutDevices);
      return { ...stateWithoutDevices, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);

    // Should contain only the active device since payload.devices is empty and base was undefined
    expect(result.devices).toHaveLength(1);
    expect(result.devices[0].id).toBe('device-active');
  });

  it('merges devices when payload contains devices and expectedVersion > 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const existingDevice = { id: 'device-old', name: 'Old', icon: 'desktop' as const };
    const stateWithDevices = playbackStateFixture({
      userId,
      ...statePayload,
      devices: [existingDevice],
      version: 1,
    });

    const newDevice = { id: 'device-new-payload', name: 'New Payload', icon: 'mobile' as const };
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-active',
      'Active Device',
      'speaker',
      {
        state: { ...statePayload, devices: [newDevice] },
        expectedVersion: 1,
        claimActiveDevice: true,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(stateWithDevices);
      return { ...stateWithDevices, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);

    // Should contain:
    // 1. Existing device from state
    // 2. New device from payload
    // 3. Active device from command (because claimActiveDevice is true)
    expect(result.devices).toHaveLength(3);
    expect(result.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'device-old' }),
        expect.objectContaining({ id: 'device-new-payload' }),
        expect.objectContaining({ id: 'device-active', name: 'Active Device', icon: 'speaker' }),
      ]),
    );
    expect(result.activeDeviceId).toBe('device-active');
  });

  it('merges devices without claiming active device when payload contains devices and claimActiveDevice is false', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const handler = new SetPlaybackStateHandler(persistence);
    const existingDevice = { id: 'device-old', name: 'Old', icon: 'desktop' as const };
    const stateWithDevices = playbackStateFixture({
      userId,
      ...statePayload,
      devices: [existingDevice],
      version: 1,
      activeDeviceId: 'device-old',
    });

    const newDevice = { id: 'device-new-payload', name: 'New Payload', icon: 'mobile' as const };
    const command = new SetPlaybackStateCommand(
      userId,
      sessionId,
      'device-active',
      'Active Device',
      'speaker',
      {
        state: { ...statePayload, devices: [newDevice] },
        expectedVersion: 1,
        claimActiveDevice: false,
      },
    );

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      const result = merge(stateWithDevices);
      return { ...stateWithDevices, ...result } as PlaybackState;
    });

    const result = await handler.execute(command);

    // Should contain:
    // 1. Existing device from state
    // 2. New device from payload
    // (Active device from command should NOT be added because claimActiveDevice is false)
    expect(result.devices).toHaveLength(2);
    expect(result.devices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'device-old' }),
        expect.objectContaining({ id: 'device-new-payload' }),
      ]),
    );
    expect(result.activeDeviceId).toBe('device-old');
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
