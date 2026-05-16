import { describe, expect, it } from 'vitest';
import { isControllingLocalAudio, isNoActivePlaybackDevice } from './playback-active-device';

describe('isNoActivePlaybackDevice', () => {
  it('returns true for null, undefined, or empty string', () => {
    expect(isNoActivePlaybackDevice(null)).toBe(true);
    expect(isNoActivePlaybackDevice(undefined)).toBe(true);
    expect(isNoActivePlaybackDevice('')).toBe(true);
  });

  it('returns false when an id is set', () => {
    expect(isNoActivePlaybackDevice('device-1')).toBe(false);
  });
});

describe('isControllingLocalAudio', () => {
  it('returns true when playback sync is not connected', () => {
    expect(
      isControllingLocalAudio({
        isPlaybackSyncConnected: false,
        activeDeviceId: 'other',
        localPlaybackDeviceId: 'me',
      }),
    ).toBe(true);
  });

  it('returns true when no active device is assigned', () => {
    expect(
      isControllingLocalAudio({
        isPlaybackSyncConnected: true,
        activeDeviceId: null,
        localPlaybackDeviceId: 'me',
      }),
    ).toBe(true);
  });

  it('returns true when this device is the active device', () => {
    expect(
      isControllingLocalAudio({
        isPlaybackSyncConnected: true,
        activeDeviceId: 'me',
        localPlaybackDeviceId: 'me',
      }),
    ).toBe(true);
  });

  it('returns false when another device is active', () => {
    expect(
      isControllingLocalAudio({
        isPlaybackSyncConnected: true,
        activeDeviceId: 'other',
        localPlaybackDeviceId: 'me',
      }),
    ).toBe(false);
  });
});
