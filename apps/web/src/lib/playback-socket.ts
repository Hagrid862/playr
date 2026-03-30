import { io } from 'socket.io-client';

const getApiBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function createPlaybackSocket(accessToken: string) {
  const apiBaseUrl = getApiBaseUrl().replace(/\/$/, '') + '/playback';

  const socket = io(apiBaseUrl, {
    auth: {
      token: accessToken,
    },
    withCredentials: true,
  });

  return socket;
}
