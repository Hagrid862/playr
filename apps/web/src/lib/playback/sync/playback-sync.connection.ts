import { getLocalPlaybackDeviceMetadata } from '@/lib/playback/playback-device';
import { createPlaybackSocket } from '@/lib/playback/playback-socket';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { PlaybackState } from '@repo/contracts';
import type { Socket } from 'socket.io-client';
import { emitPresenceTouch, listPlaybackDevices } from './playback-sync.commands';
import { firePlaybackCommand } from './playback-sync.fire-and-forget';
import {
  getSocket,
  isPlaybackSocketConnected,
  resetPlaybackSyncModuleState,
  setSocket,
} from './playback-sync.state';
import { applyCurrentTimeServerUpdate, applyStateFromServer } from './playback-sync.store-bridge';

/** Must stay below the API `playback_devices` Redis key TTL (90s). */
export const PLAYBACK_PRESENCE_TOUCH_INTERVAL_MS = 45_000;

let presenceTouchInterval: ReturnType<typeof setInterval> | null = null;

function clearPresenceTouchInterval() {
  if (presenceTouchInterval !== null) {
    clearInterval(presenceTouchInterval);
    presenceTouchInterval = null;
  }
}

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
    if (payload) {
      applyStateFromServer(payload);
    } else {
      usePlayerStore.getState().clearSessionPlayback();
    }
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
    void emitPresenceTouch().catch(() => {
      /* presence is best-effort; next interval will retry */
    });
    clearPresenceTouchInterval();
    presenceTouchInterval = setInterval(() => {
      void emitPresenceTouch().catch(() => {
        /* best-effort */
      });
    }, PLAYBACK_PRESENCE_TOUCH_INTERVAL_MS);
  });

  sock.on('event:playback-state-updated', (state: PlaybackState) => {
    applyStateFromServer(state);
  });

  sock.on('event:playback-session-ended', () => {
    usePlayerStore.getState().clearSessionPlayback();
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
  clearPresenceTouchInterval();
  const sock = getSocket();
  if (!sock) return;
  sock.removeAllListeners();
  sock.disconnect();
  resetPlaybackSyncModuleState();
}
