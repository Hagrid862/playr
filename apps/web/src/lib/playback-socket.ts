import { io } from 'socket.io-client';
import type { PlaybackState } from '@repo/contracts';

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

type CreatePlaybackSocketOptions = {
  accessToken: string;
  playbackDeviceId: string;
  deviceName: string;
  deviceIcon: PlaybackState['deviceIcon'];
};

export function createPlaybackSocket({
  accessToken,
  playbackDeviceId,
  deviceName,
  deviceIcon,
}: CreatePlaybackSocketOptions) {
  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, '') + '/playback';

  const socket = io(apiBaseUrl, {
    auth: {
      token: accessToken,
      playbackDeviceId,
      deviceName,
      deviceIcon,
    },
    withCredentials: true,
  });

  return socket;
}
