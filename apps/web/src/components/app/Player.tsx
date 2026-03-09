import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { usePlayerStore } from '@/stores/player.store';
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
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Slider } from '../ui/slider';

export function AppPlayer() {
  const isMobile = useIsMobile();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isHoveringSlider, setIsHoveringSlider] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

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
    setVolume,
    isQueueOpen,
    toggleQueue,
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
          if (audio.readyState === 0) {
            audio.load();
          }
          await audio.play();
        } else {
          audio.pause();
        }
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
  }, [isPlaying, currentTrack]);

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

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeLeft = (time: number, total: number) => {
    const timeLeft = total - time;
    return `-${formatTime(timeLeft)}`;
  };

  const trackTitle = currentTrack?.title || 'No track selected';
  const trackArtist = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const coverUrl = currentTrack?.album?.cover?.url;

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
        />
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-10 w-10 shrink-0 bg-stone-900 rounded-md flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <MusicNotesIcon size={20} className="text-stone-500" />
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
    <div className="w-full h-full flex items-center justify-center px-6 gap-2 bg-transparent">
      <audio
        ref={audioRef}
        src={getAudioUrl()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={nextTrack}
      />

      {/* Island 1: Controls (Left) */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-white/8 shadow-lg h-14"
        style={{ borderRadius: '2rem 0.75rem 0.75rem 2rem' }}
      >
        <Button
          size="icon"
          className="text-white/40 bg-transparent hover:text-white hover:bg-white/2 active:bg-white/5 rounded-full h-8 w-8 active:scale-95 transition-all"
        >
          <ShuffleIcon size={16} />
        </Button>
        <Button
          size="icon"
          className="text-white/60 hover:text-white bg-transparent hover:bg-white/5 active:bg-white/10 rounded-full h-9 w-9 active:scale-95 transition-all"
          onClick={previousTrack}
        >
          <SkipBackIcon size={22} weight="fill" />
        </Button>
        <Button
          size="icon"
          className="bg-white/15 text-white hover:bg-white/20 active:bg-white/25 rounded-full h-11 w-11 flex items-center justify-center active:scale-95 transition-all"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <PauseIcon size={24} weight="fill" />
          ) : (
            <PlayIcon size={24} weight="fill" className="ml-0.5" />
          )}
        </Button>
        <Button
          size="icon"
          className="text-white/60 hover:text-white bg-transparent hover:bg-white/5 active:bg-white/10 rounded-full h-9 w-9 active:scale-95 transition-all"
          onClick={nextTrack}
        >
          <SkipForwardIcon size={22} weight="fill" />
        </Button>
        <Button
          size="icon"
          className="text-white/40 bg-transparent hover:text-white hover:bg-white/2 active:bg-white/5 rounded-full h-8 w-8 active:scale-95 transition-all"
        >
          <RepeatIcon size={16} />
        </Button>
      </div>

      {/* Island 2: Track Info & Progress (Center) - The Main "Island" */}
      <div
        className={cn(
          'flex-1 max-w-[600px] border border-white/8 bg-stone-900 flex items-stretch relative overflow-hidden shadow-xl h-14',
        )}
        style={{ borderRadius: '0.75rem' }}
      >
        {/* Floating Rounded Square Artwork */}
        <div className="p-1.5 shrink-0">
          <div className="h-full aspect-square bg-stone-800 rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
            {coverUrl ? (
              <img src={coverUrl} alt="" className="size-full object-cover" />
            ) : (
              <MusicNotesIcon size={20} className="text-stone-600" />
            )}
          </div>
        </div>

        {/* Right Content Area: Stacked Rows */}
        <div className="flex-1 flex flex-col justify-center min-w-0 pr-3 pl-0 py-1.5 relative">
          {/* Top Row: Title & Artist / Time Reveal */}
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="text-white font-semibold truncate text-[14px] leading-tight">
              {trackTitle}
            </div>
            <div
              className={cn(
                'text-white/50 text-[12px] truncate font-medium transition-all duration-300',
                isHoveringSlider || isDraggingSlider
                  ? 'opacity-0 translate-y-1'
                  : 'opacity-100 translate-y-0',
              )}
            >
              {trackArtist}
            </div>

            {/* Hover-reveal times */}
            <div
              className={cn(
                'absolute left-0 right-3 top-[26px] flex items-center justify-between text-[11px] text-white/40 tabular-nums transition-all duration-300 pointer-events-none',
                isHoveringSlider || isDraggingSlider
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 -translate-y-1',
              )}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTimeLeft(currentTime, duration)}</span>
            </div>
          </div>

          {/* Bottom Row: Progress Slider */}
          <Slider
            value={currentTime}
            max={duration || 100}
            showThumb={false}
            onMouseEnter={() => setIsHoveringSlider(true)}
            onMouseLeave={() => setIsHoveringSlider(false)}
            onPointerDown={() => setIsDraggingSlider(true)}
            onPointerUp={() => setIsDraggingSlider(false)}
            onChange={(newTime) => {
              if (audioRef.current) audioRef.current.currentTime = newTime;
              setCurrentTime(newTime);
            }}
            className="mt-auto w-full"
          />
        </div>
      </div>

      {/* Island 3: Actions (Right) */}
      <div
        className="flex h-14 items-center gap-0.5 px-2 py-2.5 bg-stone-900 border border-white/8 shadow-lg min-w-auto"
        style={{ borderRadius: '0.75rem 2rem 2rem 0.75rem' }}
      >
        <Button
          size="icon"
          variant="ghost"
          className="text-white/40 hover:text-white active:scale-95 h-9 w-9"
        >
          <DotsThreeIcon size={20} weight="bold" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-white/40 hover:text-white active:scale-95 h-9 w-9"
        >
          <StarIcon size={20} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-white/40 hover:text-white active:scale-95 h-9 w-9"
        >
          <QuotesIcon size={20} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'text-white/40 hover:text-white active:scale-95 h-9 w-9',
            isQueueOpen && 'text-white bg-white/10',
          )}
          onClick={toggleQueue}
        >
          <QueueIcon size={20} />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="text-white/40 hover:text-white active:scale-95 h-9 w-9 ml-1"
            >
              <SpeakerHighIcon size={20} />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="top"
            align="end"
            className="w-40 bg-stone-900/95 backdrop-blur-xl border-white/10 p-3 mb-2 shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
            sideOffset={16}
          >
            <Slider
              value={volume * 100}
              min={0}
              max={100}
              onChange={(val) => setVolume(val / 100)}
              className="h-4"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
