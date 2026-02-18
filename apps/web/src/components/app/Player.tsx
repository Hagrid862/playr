import {
  DotsThreeIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  QuotesIcon,
  RepeatIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SpeakerHighIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { Button } from '../ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useRef, useEffect } from 'react';
import { usePlayerStore } from '@/stores/player.store';
import { useAuthStore } from '@/stores/auth.store';

export function AppPlayer() {
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    currentTrack,
    isPlaying,
    volume,
    currentTime,
    duration,
    quality,
    togglePlay,
    setCurrentTime,
    setDuration,
    nextTrack,
    previousTrack,
  } = usePlayerStore();

  const { accessToken } = useAuthStore();
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Sync isPlaying with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    const playPromise = async () => {
      try {
        if (isPlaying) {
          // If we just changed tracks or the first track is loaded, ensures the audio pipeline is ready
          if (audio.readyState === 0) {
            audio.load();
          }
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (err: any) {
        // AbortError is common when switching tracks quickly or pausing before play finishes
        if (err.name !== 'AbortError') {
          console.error('[AppPlayer] Playback Error:', {
            name: err.name,
            message: err.message,
            readyState: audio.readyState,
            src: audio.src.split('?')[0] + '?...', // Hide token
          });
        }
      }
    };

    playPromise();
  }, [isPlaying, currentTrack]);

  // Handle media errors
  const handleMediaError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const error = e.currentTarget.error;
    console.error('Audio element error:', {
      code: error?.code,
      message: error?.message,
    });
  };

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
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const getAudioUrl = () => {
    if (!currentTrack) return '';
    return `${apiBaseUrl}/library/tracks/${currentTrack.id}/stream?quality=${quality}&token=${accessToken}`;
  };

  const renderActions = (isDropdown = false) => {
    const items = [
      { icon: StarIcon, label: 'Favorite' },
      { icon: QuotesIcon, label: 'Lyrics' },
      { icon: QueueIcon, label: 'Queue' },
      { icon: SpeakerHighIcon, label: 'Volume' },
    ];

    if (isDropdown) {
      return (
        <DropdownMenuContent align="end" className="bg-stone-900 border-white/10 text-white">
          {items.map((item) => (
            <DropdownMenuItem key={item.label} className="hover:bg-white/10 cursor-pointer">
              <item.icon className="mr-2" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      );
    }

    return (
      <>
        {items.map((item) => (
          <Button key={item.label} size="icon-lg" variant="ghost" className="active:scale-95">
            <item.icon />
          </Button>
        ))}
      </>
    );
  };

  const trackTitle = currentTrack?.title || 'No track selected';
  const trackArtist = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const coverUrl = currentTrack?.album?.cover?.url;

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMobile) {
    return (
      <div className="w-full h-full flex items-center justify-between px-2">
        <audio
          ref={audioRef}
          src={getAudioUrl()}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={nextTrack}
          onError={handleMediaError}
        />
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 shrink-0 bg-white/10 rounded-md flex items-center justify-center overflow-hidden border border-white/5">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <MusicNotesIcon size={20} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="text-white font-semibold truncate text-sm">{trackTitle}</div>
            <div className="text-white/50 text-xs truncate font-medium">{trackArtist}</div>
          </div>
        </div>
        <Button
          size="icon-lg"
          variant="ghost"
          className="active:scale-95 shrink-0"
          onClick={togglePlay}
        >
          {isPlaying ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white/0 flex items-center justify-between gap-4">
      <audio
        ref={audioRef}
        src={getAudioUrl()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={nextTrack}
      />
      {/* Controls Section */}
      <div className="flex flex-row gap-1 items-center justify-center shrink-0 min-w-[180px]">
        <Button
          size="icon"
          variant="ghost"
          className="active:scale-95 text-white/70 hover:text-white"
        >
          <ShuffleIcon size={18} />
        </Button>
        <Button size="icon-lg" variant="ghost" className="active:scale-95" onClick={previousTrack}>
          <SkipBackIcon weight="fill" />
        </Button>
        <Button size="icon-lg" variant="ghost" className="active:scale-95" onClick={togglePlay}>
          {isPlaying ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
        </Button>
        <Button size="icon-lg" variant="ghost" className="active:scale-95" onClick={nextTrack}>
          <SkipForwardIcon weight="fill" />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="active:scale-95 text-white/70 hover:text-white"
        >
          <RepeatIcon size={16} />
        </Button>
      </div>

      {/* Info & Waveform Section - Grows/Shrinks */}
      <div className="flex-1 flex flex-row gap-3 items-center min-w-0">
        <div className="h-12 w-12 shrink-0 bg-white/10 rounded-md flex items-center justify-center overflow-hidden border border-white/5">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <MusicNotesIcon size={28} />
          )}
        </div>
        <div className="flex-1 flex flex-col gap-0.5 min-w-0">
          <div className="text-white font-semibold truncate">{trackTitle}</div>
          <div className="text-white/50 text-xs truncate font-medium">{trackArtist}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-white/40 tabular-nums w-8">
              {formatTime(currentTime)}
            </span>
            <div
              className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                const newTime = percent * duration;
                if (audioRef.current) audioRef.current.currentTime = newTime;
                setCurrentTime(newTime);
              }}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary w-full origin-left transition-transform duration-100 ease-linear"
                style={{ transform: `scaleX(${duration > 0 ? currentTime / duration : 0})` }}
              />
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-[10px] text-white/40 tabular-nums w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="flex flex-row gap-1 items-center justify-end shrink-0">
        {/* Desktop View (>= 800px) */}
        <div className="hidden min-[1000px]:flex items-center gap-1">
          <Button size="icon-lg" variant="ghost" className="active:scale-95">
            <DotsThreeIcon weight="bold" />
          </Button>
          {renderActions()}
        </div>

        {/* Tablet View (< 800px) */}
        <div className="min-[1000px]:hidden flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-lg" variant="ghost" className="active:scale-95">
                <DotsThreeIcon weight="bold" />
              </Button>
            </DropdownMenuTrigger>
            {renderActions(true)}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
