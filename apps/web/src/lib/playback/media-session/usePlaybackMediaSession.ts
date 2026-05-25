import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { isControllingLocalAudio } from '@/lib/playback/playback-active-device';
import {
  emitCurrentTimeSync,
  firePlaybackCommand,
  isPlaybackSyncConnected,
} from '@/lib/playback/sync/playback-sync';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { PlaybackTrack } from '@repo/contracts';
import { useEffect, type RefObject } from 'react';

const POSITION_STATE_INTERVAL_MS = 1000;
const DEFAULT_SEEK_SKIP_SEC = 10;

const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekbackward',
  'seekforward',
  'seekto',
  'stop',
];

function clearAllMediaSessionActionHandlers(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  for (const action of MEDIA_SESSION_ACTIONS) {
    try {
      navigator.mediaSession.setActionHandler(action, null);
    } catch {
      /* action unsupported */
    }
  }
}

function clearPositionState(ms: MediaSession): void {
  try {
    (ms.setPositionState as (state: MediaPositionState | null) => void)(null);
  } catch {
    /* noop */
  }
}

function clearMediaSessionPresentation(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  ms.metadata = null;
  ms.playbackState = 'none';
  clearPositionState(ms);
  clearAllMediaSessionActionHandlers();
}

/** Returns an absolute URL suitable for MediaMetadata artwork, or null. */
export function resolvePlaybackArtworkUrl(albumArt: string | null | undefined): string | null {
  if (typeof window === 'undefined') return null;
  const trimmed = albumArt?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  try {
    return new URL(trimmed, window.location.origin).href;
  } catch {
    return null;
  }
}

function buildMediaMetadata(track: PlaybackTrack): MediaMetadata {
  const artist = track.artists.length > 0 ? track.artists.join(', ') : UNKNOWN_ARTIST_LABEL;
  const artworkUrl = resolvePlaybackArtworkUrl(track.albumArt);
  const artwork: MediaImage[] = artworkUrl ? [{ src: artworkUrl }] : [];
  return new MediaMetadata({
    title: track.title,
    artist,
    album: track.albumName,
    artwork,
  });
}

function controllingNow(): boolean {
  const s = usePlayerStore.getState();
  return isControllingLocalAudio({
    isPlaybackSyncConnected: isPlaybackSyncConnected(),
    activeDeviceId: s.activeDeviceId,
    localPlaybackDeviceId: s.localPlaybackDeviceId,
  });
}

function commitSeek(
  time: number,
  audio: HTMLAudioElement | null,
  positionStateAudioRef: RefObject<HTMLAudioElement | null>,
): void {
  const { duration, setCurrentTime, currentTrack, playbackVersion } = usePlayerStore.getState();
  let max = time;
  if (Number.isFinite(duration) && duration > 0) {
    max = duration;
  } else if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
    max = audio.duration;
  }
  const clamped = Math.max(0, Math.min(time, max));
  if (audio) {
    audio.currentTime = clamped;
  }
  setCurrentTime(clamped);
  if (isPlaybackSyncConnected() && currentTrack && playbackVersion !== 0) {
    firePlaybackCommand(emitCurrentTimeSync(clamped), 'emitCurrentTimeSync');
  }
  queueMicrotask(() => flushPositionState(positionStateAudioRef));
}

function trySetActionHandler(
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
): void {
  try {
    navigator.mediaSession.setActionHandler(action, handler);
  } catch {
    /* unsupported */
  }
}

function flushPositionState(audioRef: RefObject<HTMLAudioElement | null>): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (!('setPositionState' in navigator.mediaSession)) return;

  if (!controllingNow()) {
    clearPositionState(navigator.mediaSession);
    return;
  }

  const s = usePlayerStore.getState();
  const audio = audioRef.current;
  const pos = audio ? audio.currentTime : s.currentTime;
  const dur =
    Number.isFinite(s.duration) && s.duration > 0
      ? s.duration
      : audio && Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : 0;

  if (!Number.isFinite(dur) || dur <= 0) {
    clearPositionState(navigator.mediaSession);
    return;
  }

  const clamped = Math.max(0, Math.min(pos, dur));
  try {
    navigator.mediaSession.setPositionState({
      duration: dur,
      position: clamped,
      playbackRate: 1,
    });
  } catch {
    /* Chromium throws if duration/position invalid */
  }
}

/**
 * Syncs OS / browser media session with the local player when this tab is the active output device.
 */
export function usePlaybackMediaSession(audioRef: RefObject<HTMLAudioElement | null>): void {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const duration = usePlayerStore((s) => s.duration);
  const activeDeviceId = usePlayerStore((s) => s.activeDeviceId);
  const localPlaybackDeviceId = usePlayerStore((s) => s.localPlaybackDeviceId);

  const isControlling = isControllingLocalAudio({
    isPlaybackSyncConnected: isPlaybackSyncConnected(),
    activeDeviceId,
    localPlaybackDeviceId,
  });

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    if (!currentTrack || !isControlling) {
      clearMediaSessionPresentation();
      return () => {
        clearMediaSessionPresentation();
      };
    }

    try {
      navigator.mediaSession.metadata = buildMediaMetadata(currentTrack);
    } catch (err) {
      console.error('[MediaSession] failed to set metadata', err);
    }

    trySetActionHandler('play', () => {
      if (!controllingNow()) return;
      usePlayerStore.getState().resume();
    });
    trySetActionHandler('pause', () => {
      if (!controllingNow()) return;
      usePlayerStore.getState().pause();
    });
    trySetActionHandler('stop', () => {
      if (!controllingNow()) return;
      usePlayerStore.getState().pause();
    });
    trySetActionHandler('previoustrack', () => {
      if (!controllingNow()) return;
      usePlayerStore.getState().previousTrack();
    });
    trySetActionHandler('nexttrack', () => {
      if (!controllingNow()) return;
      usePlayerStore.getState().nextTrack();
    });
    trySetActionHandler('seekbackward', (details) => {
      if (!controllingNow()) return;
      const audio = audioRef.current;
      const fromAudio = audio?.currentTime;
      const base = fromAudio ?? usePlayerStore.getState().currentTime;
      const offset = details?.seekOffset ?? DEFAULT_SEEK_SKIP_SEC;
      commitSeek(base - offset, audio, audioRef);
    });
    trySetActionHandler('seekforward', (details) => {
      if (!controllingNow()) return;
      const audio = audioRef.current;
      const fromAudio = audio?.currentTime;
      const base = fromAudio ?? usePlayerStore.getState().currentTime;
      const offset = details?.seekOffset ?? DEFAULT_SEEK_SKIP_SEC;
      commitSeek(base + offset, audio, audioRef);
    });
    trySetActionHandler('seekto', (details) => {
      if (!controllingNow()) return;
      if (details.seekTime == null || !Number.isFinite(details.seekTime)) return;
      commitSeek(details.seekTime, audioRef.current, audioRef);
    });

    return () => {
      clearAllMediaSessionActionHandlers();
    };
  }, [audioRef, currentTrack, isControlling]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    if (!currentTrack || !isControlling) {
      navigator.mediaSession.playbackState = 'none';
      return;
    }
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [currentTrack, isControlling, isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    if (!('setPositionState' in navigator.mediaSession)) {
      return;
    }

    if (!currentTrack || !isControlling) {
      flushPositionState(audioRef);
      return;
    }

    flushPositionState(audioRef);
    const id = window.setInterval(() => flushPositionState(audioRef), POSITION_STATE_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        clearPositionState(navigator.mediaSession);
      }
    };
  }, [audioRef, currentTrack, isControlling, isPlaying, duration]);
}
