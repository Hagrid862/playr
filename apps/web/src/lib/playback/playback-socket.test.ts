import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createPlaybackSocket } from './playback-socket';
import { io } from 'socket.io-client';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ connected: true })),
}));

describe('playback-socket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_API_URL', 'http://api.test');
  });

  it('creates socket with correct url and options', () => {
    const options = {
      accessToken: 'token',
      playbackDeviceId: 'device-id',
      deviceName: 'Device',
      deviceIcon: 'desktop' as const,
    };

    createPlaybackSocket(options);

    expect(io).toHaveBeenCalledWith('http://api.test/playback', {
      auth: {
        token: 'token',
        playbackDeviceId: 'device-id',
        deviceName: 'Device',
        deviceIcon: 'desktop',
      },
      withCredentials: true,
    });
  });

  it('handles trailing slash in api url', () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');

    createPlaybackSocket({
      accessToken: 'token',
      playbackDeviceId: 'id',
      deviceName: 'device',
      deviceIcon: 'desktop',
    });

    expect(io).toHaveBeenCalledWith('http://api.test/playback', expect.anything());
  });

  it('uses default fallback if VITE_API_URL is missing', () => {
    vi.stubEnv('VITE_API_URL', '');

    createPlaybackSocket({
      accessToken: 'token',
      playbackDeviceId: 'id',
      deviceName: 'device',
      deviceIcon: 'desktop',
    });

    expect(io).toHaveBeenCalledWith('http://localhost:8000/playback', expect.anything());
  });
});
