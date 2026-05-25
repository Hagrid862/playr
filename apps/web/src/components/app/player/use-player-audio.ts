import {
  isControllingLocalAudio,
  isNoActivePlaybackDevice,
} from '@/lib/playback/playback-active-device';
import { getOrderedNextQueue } from '@/lib/playback/queue/playback-queue';
import { usePlaybackMediaSession } from '@/lib/playback/media-session/usePlaybackMediaSession';
import {
  emitCurrentTimeSync,
  firePlaybackCommand,
  isPlaybackSyncConnected,
} from '@/lib/playback/sync/playback-sync';
import { useAuthStore } from '@/stores/auth.store';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { StreamAudioQuality } from '@repo/contracts';
import { useEffect, useRef, useState } from 'react';

const PLAYBACK_TIME_SYNC_INTERVAL_MS = 1500;

/**
 * Hook to manage audio element synchronization with player store
 */
export function usePlayerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  usePlaybackMediaSession(audioRef);
  const timeToRestoreRef = useRef<number | null>(null);
  const lastTimeSyncAtRef = useRef<number>(0);
  const lastSyncedSecondRef = useRef<number | null>(null);
  const prevStoreTimeRef = useRef<number>(0);
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    queue,
    isShuffled,
    quality,
    setCurrentTime,
    setDuration,
    nextTrack,
    pause,
    repeatMode,
    setAvailableQualities,
    activeDeviceId,
    localPlaybackDeviceId,
    playbackVersion,
  } = usePlayerStore();

  const { accessToken } = useAuthStore();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [streamFormatOverrideState, setStreamFormatOverrideState] = useState<{
    trackId: string | null;
    format: 'default' | 'mp3';
  }>({
    trackId: null,
    format: 'default',
  });
  const streamFormatOverride =
    currentTrack?.id != null && streamFormatOverrideState.trackId === currentTrack.id
      ? streamFormatOverrideState.format
      : 'default';

  useEffect(() => {
    return usePlayerStore.subscribe((state, prevState) => {
      if (
        state.quality !== prevState.quality &&
        state.currentTrack?.id === prevState.currentTrack?.id
      ) {
        if (audioRef.current) {
          timeToRestoreRef.current = audioRef.current.currentTime;
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!currentTrack) return;

    const fetchQualities = async () => {
      try {
        const url = new URL(`${apiBaseUrl}/library/tracks/${currentTrack.id}/qualities`);

        const res = await fetch(url.toString(), {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });

        if (!res.ok) {
          console.error(
            `[AppPlayer] failed to fetch qualities for ${currentTrack.id}: ${res.status}`,
          );
          setAvailableQualities(['auto']);
          return;
        }

        const json = await res.json();
        const parsedQualities = Array.isArray(json?.data) ? json.data : [];
        const finalQualities: (StreamAudioQuality | 'auto')[] = ['auto', ...parsedQualities];

        setAvailableQualities(finalQualities);
      } catch (err) {
        console.error(`[AppPlayer] qualities fetch error:`, err);
        setAvailableQualities(['auto']);
      }
    };

    fetchQualities();
  }, [currentTrack, accessToken, apiBaseUrl, setAvailableQualities]);

  // Sync isPlaying with audio element (pause/play only — not queue/shuffle)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldOutputAudio = isControllingLocalAudio({
      isPlaybackSyncConnected: isPlaybackSyncConnected(),
      activeDeviceId,
      localPlaybackDeviceId,
    });

    if (!isPlaying || !shouldOutputAudio) {
      audio.pause();
      return;
    }

    if (!audio.src) return;

    const playPromise = async () => {
      try {
        if (audio.readyState === 0) {
          audio.load();
        }
        await audio.play();
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error('[AppPlayer] Playback Error:', {
            name: err.name,
            message: err.message,
            readyState: audio.readyState,
          });
        }
      }
    };

    void playPromise();
  }, [isPlaying, currentTrack, activeDeviceId, localPlaybackDeviceId, streamFormatOverride]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Seek: only apply large jumps to the element (avoids stutter from queue/reorder server echoes)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const prev = prevStoreTimeRef.current;
    prevStoreTimeRef.current = currentTime;
    const deltaAudio = Math.abs(audio.currentTime - currentTime);
    if (deltaAudio <= 1) return;
    const storeDelta = Math.abs(currentTime - prev);
    if (storeDelta < 0.75) return;
    audio.currentTime = currentTime;
  }, [currentTime]);

  useEffect(() => {
    lastSyncedSecondRef.current = null;
    lastTimeSyncAtRef.current = 0;
  }, [currentTrack?.id, activeDeviceId, localPlaybackDeviceId, isPlaying]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    const shouldOutputAudio = isControllingLocalAudio({
      isPlaybackSyncConnected: isPlaybackSyncConnected(),
      activeDeviceId,
      localPlaybackDeviceId,
    });
    if (!audio || !shouldOutputAudio) {
      return;
    }

    const localCurrentTime = audio.currentTime;
    setCurrentTime(localCurrentTime);

    if (
      !isPlaybackSyncConnected() ||
      !isPlaying ||
      !currentTrack ||
      isNoActivePlaybackDevice(activeDeviceId) ||
      activeDeviceId !== localPlaybackDeviceId ||
      playbackVersion === 0
    ) {
      return;
    }

    const currentSecond = Math.floor(localCurrentTime);
    const now = Date.now();
    if (
      lastSyncedSecondRef.current === currentSecond ||
      now - lastTimeSyncAtRef.current < PLAYBACK_TIME_SYNC_INTERVAL_MS
    ) {
      return;
    }

    lastSyncedSecondRef.current = currentSecond;
    lastTimeSyncAtRef.current = now;
    firePlaybackCommand(emitCurrentTimeSync(localCurrentTime), 'emitCurrentTimeSync');
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      if (timeToRestoreRef.current !== null) {
        audioRef.current.currentTime = timeToRestoreRef.current;
        setCurrentTime(timeToRestoreRef.current);
        if (isPlaying) {
          audioRef.current.play().catch((err: unknown) => {
            if (err instanceof Error && err.name !== 'AbortError') {
              console.error('[AppPlayer] Play after seek error:', err);
            }
          });
        }
        timeToRestoreRef.current = null;
      }
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err: unknown) => {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error('[AppPlayer] Repeat-one play error:', err);
          }
        });
      }
      return;
    }

    const ordered = getOrderedNextQueue(queue, isShuffled);
    const hasNext = ordered.length > 0;

    if (repeatMode === 'off' && !hasNext) {
      pause();
      return;
    }

    nextTrack();
  };

  const getAudioUrl = () => {
    if (!currentTrack) return '';
    const queryParams = new URLSearchParams();
    if (accessToken) queryParams.append('token', accessToken);
    if (quality !== 'auto') {
      queryParams.append('quality', quality);
    }
    if (streamFormatOverride === 'mp3') {
      queryParams.append('format', 'mp3');
    }
    return `${apiBaseUrl}/library/tracks/${currentTrack.id}/stream?${queryParams.toString()}`;
  };

  const handleStreamError = () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) {
      return;
    }
    if (streamFormatOverride === 'mp3') {
      console.error('[AppPlayer] Stream error after mp3 fallback', {
        trackId: currentTrack.id,
        error: audio.error,
      });
      return;
    }
    timeToRestoreRef.current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    setStreamFormatOverrideState({
      trackId: currentTrack.id,
      format: 'mp3',
    });
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeLeft = (time: number, total: number) => {
    const rawLeft = total - time;
    if (!Number.isFinite(time) || !Number.isFinite(total) || total <= 0) {
      return '--:--';
    }
    const clampedLeft = Math.max(0, rawLeft);
    return `-${formatTime(clampedLeft)}`;
  };

  return {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleTrackEnd,
    handleStreamError,
    getAudioUrl,
    formatTime,
    formatTimeLeft,
    nextTrack,
    isMp3FormatFallback: streamFormatOverride === 'mp3',
  };
}
