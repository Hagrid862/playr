import { getLocalPlaybackDeviceMetadata } from '@/lib/playback/playback-device';
import { createPlaybackSocket } from '@/lib/playback/playback-socket';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { PlaybackState } from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { listPlaybackDevices } from './playback-sync.commands';
import { firePlaybackCommand } from './playback-sync.fire-and-forget';
import {
  getSocket,
  isPlaybackSocketConnected,
  resetPlaybackSyncModuleState,
  setSocket,
} from './playback-sync.state';
import { applyCurrentTimeServerUpdate, applyStateFromServer } from './playback-sync.store-bridge';

export function getPlaybackSocket(): Socket | null {
  return getSocket();
}

export function isPlaybackSyncConnected(): boolean {
  return isPlaybackSocketConnected();
}

function hydrate() {
  const sock = getSocket();
  if (!sock?.connected) return;

  sock.emit('query:get-state', {}, (payload: PlaybackState | null) => {
    if (payload) applyStateFromServer(payload);
  });
}

export function connectPlaybackSync(accessToken: string) {
  disconnectPlaybackSync();
  const localDevice = getLocalPlaybackDeviceMetadata();
  usePlayerStore.getState().setLocalPlaybackDeviceId(localDevice.playbackDeviceId);

  setSocket(
    createPlaybackSocket({
      accessToken,
      playbackDeviceId: localDevice.playbackDeviceId,
      deviceName: localDevice.deviceName,
      deviceIcon: localDevice.deviceIcon,
    }),
  );

  const sock = getSocket()!;

  sock.on('connect', () => {
    hydrate();
    firePlaybackCommand(listPlaybackDevices(), 'listPlaybackDevices');
  });

  sock.on('event:playback-state-updated', (state: PlaybackState) => {
    applyStateFromServer(state);
  });

  sock.on('event:current-time-updated', (payload: { currentTime: number; version: number }) => {
    applyCurrentTimeServerUpdate(payload);
  });

  sock.on('connect_error', (err: Error) => {
    console.error('[playback] connect_error', err.message);
  });

  sock.on('exception', (err: unknown) => {
    console.error('[playback] exception', err);
  });
}

export function disconnectPlaybackSync() {
  const sock = getSocket();
  if (!sock) return;
  sock.removeAllListeners();
  sock.disconnect();
  resetPlaybackSyncModuleState();
}
