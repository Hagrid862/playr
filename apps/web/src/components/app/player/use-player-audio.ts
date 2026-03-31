import { useAuthStore } from '@/stores/auth.store';
import { usePlayerStore } from '@/stores/player.store';
import { isPlaybackSyncConnected } from '@/lib/playback-sync';
import { StreamAudioQuality } from '@repo/contracts';
import { useEffect, useRef } from 'react';

/**
 * Hook to manage audio element synchronization with player store
 */
export function usePlayerAudio() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const timeToRestoreRef = useRef<number | null>(null);
  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    queue,
    quality,
    setCurrentTime,
    setDuration,
    nextTrack,
    pause,
    repeatMode,
    setAvailableQualities,
    activeDeviceId,
    localPlaybackDeviceId,
  } = usePlayerStore();

  const { accessToken } = useAuthStore();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

  // Sync isPlaying with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const shouldOutputAudio =
      !isPlaybackSyncConnected() || !activeDeviceId || activeDeviceId === localPlaybackDeviceId;

    // If not playing, always try to pause (even if src is not loaded yet)
    if (!isPlaying || !shouldOutputAudio) {
      audio.pause();
      return;
    }

    // If playing, we need src to be loaded
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

    playPromise();
  }, [isPlaying, currentTrack, activeDeviceId, localPlaybackDeviceId]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // Sync currentTime from store (for seeking)
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 1) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    const shouldOutputAudio =
      !isPlaybackSyncConnected() || !activeDeviceId || activeDeviceId === localPlaybackDeviceId;
    if (audioRef.current && shouldOutputAudio) {
      setCurrentTime(audioRef.current.currentTime);
    }
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
        audioRef.current.play();
      }
      return;
    }

    const currentIndex = queue.findIndex((t) => t.track.id === currentTrack?.id);
    const hasNext = currentIndex > -1 && currentIndex < queue.length - 1;

    // If the queue ended and repeat is off, stop playback.
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
    return `${apiBaseUrl}/library/tracks/${currentTrack.id}/stream?${queryParams.toString()}`;
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeLeft = (time: number, total: number) => {
    const timeLeft = total - time;
    return `-${formatTime(timeLeft)}`;
  };

  return {
    audioRef,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleTrackEnd,
    getAudioUrl,
    formatTime,
    formatTimeLeft,
    nextTrack,
  };
}
