import type { PlaybackDevice } from '@repo/contracts';
import { io } from 'socket.io-client';

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

type CreatePlaybackSocketOptions = {
  accessToken: string;
  playbackDeviceId: string;
  deviceName: string;
  deviceIcon: PlaybackDevice['icon'];
};

export function createPlaybackSocket({
  accessToken,
  playbackDeviceId,
  deviceName,
  deviceIcon,
}: CreatePlaybackSocketOptions) {
  const apiBaseUrl = new URL('/playback', getApiBaseUrl()).toString();

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
