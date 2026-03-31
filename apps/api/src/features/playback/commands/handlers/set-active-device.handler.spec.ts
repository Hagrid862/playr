import { BadRequestException } from '@nestjs/common';
import { PlaybackState } from '@repo/contracts';
import { createMock } from '@repo/testing/nestjs';
import { describe, expect, it } from 'vitest';
import { PlaybackDeviceRegistryService } from '../../services/playback-device-registry.service';
import { PlaybackStatePersistenceService } from '../../services/playback-state-persistence.service';
import { SetActiveDeviceCommand } from '../impl/set-active-device.command';
import { SetActiveDeviceHandler } from './set-active-device.handler';

describe('SetActiveDeviceHandler', () => {
  const userId = 'user-1';
  const sessionId = 'session-1';
  const initialState: PlaybackState = {
    userId,
    sessionId,
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
    repeatMode: 'off',
    shuffle: false,
    favorited: 'not-set',
    inLibrary: false,
    version: 1,
    updatedAt: new Date().toISOString(),
    deviceName: 'Web',
    deviceIcon: 'desktop',
    isPlaying: true,
  };

  it('sets the active device when device exists', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const registry = createMock<PlaybackDeviceRegistryService>();
    const handler = new SetActiveDeviceHandler(persistence, registry);
    const command = new SetActiveDeviceCommand(userId, sessionId, {
      deviceId: 'device-2',
      expectedVersion: 1,
    });

    registry.getDevice.mockResolvedValue({
      deviceName: 'Mobile App',
      deviceIcon: 'mobile',
      userId,
      lastSeen: new Date().toISOString(),
    });

    persistence.applyMutation.mockImplementation(async (_uid, _ver, merge) => {
      return { ...initialState, ...merge(initialState) } as PlaybackState;
    });

    const result = await handler.execute(command);
    expect(result.activeDeviceId).toBe('device-2');
    expect(result.deviceName).toBe('Mobile App');
    expect(result.deviceIcon).toBe('mobile');
  });

  it('throws BadRequestException when device is missing in registry', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const registry = createMock<PlaybackDeviceRegistryService>();
    const handler = new SetActiveDeviceHandler(persistence, registry);
    const command = new SetActiveDeviceCommand(userId, sessionId, {
      deviceId: 'device-99',
      expectedVersion: 1,
    });

    registry.getDevice.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when expectedVersion is 0', async () => {
    const persistence = createMock<PlaybackStatePersistenceService>();
    const registry = createMock<PlaybackDeviceRegistryService>();
    const handler = new SetActiveDeviceHandler(persistence, registry);
    const command = new SetActiveDeviceCommand(userId, sessionId, {
      deviceId: 'device-2',
      expectedVersion: 0,
    });

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });
});
