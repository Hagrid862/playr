import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import {
  emitFavoriteStateSync,
  firePlaybackCommand,
  isPlaybackSyncConnected,
  emitCurrentTimeSync,
} from '@/lib/playback/sync/playback-sync';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import {
  CaretDownIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  QueueIcon,
  QuotesIcon,
  RepeatIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SpeakerHighIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

function formatTime(time: number) {
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTimeLeft(time: number, total: number) {
  const rawLeft = total - time;
  if (!Number.isFinite(time) || !Number.isFinite(total) || total <= 0) {
    return '--:--';
  }
  const clampedLeft = Math.max(0, rawLeft);
  return `-${formatTime(clampedLeft)}`;
}

export function PlayerFullPage() {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    playbackFavorited,
    playbackVersion,
    currentTime,
    duration,
    setCurrentTime,
    nextTrack,
    previousTrack,
    repeatMode,
    toggleRepeatMode,
    isShuffled,
    toggleShuffle,
    volume,
    setVolume,
    isPlayerExpanded,
    setPlayerExpanded,
    isQueueOpen,
    sidebarView,
    setQueueOpen,
    setSidebarView,
  } = usePlayerStore();

  const latestSeekTimeRef = useRef<number | null>(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);

  const trackTitle = currentTrack?.title || 'No track selected';
  const trackArtist = currentTrack?.artists?.join(', ') || UNKNOWN_ARTIST_LABEL;
  const coverUrl = currentTrack?.albumArt;
  const isFavorited = playbackFavorited === 'favorited';
  const isRepeatEnabled = repeatMode !== 'off';

  const handleFavorite = useCallback(async () => {
    if (!currentTrack || playbackVersion === 0) return;
    const prev = playbackFavorited;
    const next = prev === 'favorited' ? 'not-set' : 'favorited';
    usePlayerStore.setState({ playbackFavorited: next });
    try {
      await emitFavoriteStateSync(next);
    } catch (e) {
      console.error(e);
      usePlayerStore.setState({ playbackFavorited: prev });
      toast.error('Could not update favorite');
    }
  }, [currentTrack, playbackFavorited, playbackVersion]);

  const handleSeekCommit = useCallback(
    (time: number) => {
      if (!isPlaybackSyncConnected() || !currentTrack || playbackVersion === 0) return;
      firePlaybackCommand(emitCurrentTimeSync(time), 'emitCurrentTimeSync');
    },
    [currentTrack, playbackVersion],
  );

  // Lock body scroll when expanded
  useEffect(() => {
    if (isPlayerExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPlayerExpanded]);

  return (
    <AnimatePresence>
      {isPlayerExpanded && (
        <motion.div
          className="absolute inset-0 z-[60] bg-stone-950 flex flex-col overflow-hidden"
          initial={{ y: '100%', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
          animate={{
            y: 0,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
          }}
          exit={{ y: '100%', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}
          transition={{
            type: 'tween',
            duration: 0.35,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          {/* Header: Close button */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              aria-label="Close player"
              className="text-white/60 hover:text-white h-10 w-10 rounded-full"
              onClick={() => setPlayerExpanded(false)}
            >
              <CaretDownIcon size={24} weight="bold" />
            </Button>
            <span className="text-white/40 text-xs font-medium tracking-wide uppercase">
              Now Playing
            </span>
            <div className="w-10" />
          </div>

          {/* Album Art */}
          <div className="flex items-center justify-center px-10 pb-4 min-h-0 mt-6 shrink-0">
            <div className="w-full max-w-[clamp(280px,88vw,340px)] aspect-square bg-stone-900 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl shadow-black/60 border border-white/5">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="size-full object-cover" />
              ) : (
                <MusicNotesIcon size={84} className="text-stone-700" />
              )}
            </div>
          </div>

          {/* Track Info & Progress */}
          <div className="flex flex-col gap-8 px-8 mt-8 pb-4 shrink-0">
            {/* Title & Artist */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-white font-bold leading-tight truncate text-[clamp(1.25rem,4vw,1.5rem)]">
                  {trackTitle}
                </h1>
                <p className="text-white/40 font-medium truncate mt-1.5 text-[clamp(0.875rem,2.5vw,1rem)]">
                  {trackArtist}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Favorite"
                disabled={!currentTrack || playbackVersion === 0}
                className={cn(
                  'shrink-0 rounded-full h-[clamp(2.5rem,5vw,3rem)] w-[clamp(2.5rem,5vw,3rem)]',
                  isFavorited
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-white/40 hover:text-white',
                )}
                onClick={handleFavorite}
              >
                <StarIcon
                  className="w-[clamp(22px,5vw,28px)] h-[clamp(22px,5vw,28px)]"
                  weight={isFavorited ? 'fill' : 'regular'}
                />
              </Button>
            </div>

            {/* Progress Slider */}
            <div className="flex flex-col gap-2.5">
              <Slider
                data-testid="progress-slider"
                value={currentTime}
                max={duration || 100}
                showThumb={isDraggingSlider}
                onPointerDown={() => setIsDraggingSlider(true)}
                onPointerUp={() => {
                  setIsDraggingSlider(false);
                  const committedTime = latestSeekTimeRef.current ?? currentTime;
                  handleSeekCommit(committedTime);
                  latestSeekTimeRef.current = null;
                }}
                onChange={(newTime) => {
                  latestSeekTimeRef.current = newTime;
                  setCurrentTime(newTime);
                }}
                className="w-full"
              />
              <div className="flex items-center justify-between text-white/40 tabular-nums font-medium text-[clamp(0.75rem,2vw,0.875rem)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTimeLeft(currentTime, duration)}</span>
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center justify-center gap-[clamp(1rem,4vw,2rem)] px-6 pt-6 pb-6 shrink-0">
            <Button
              size="icon"
              aria-label="Toggle Shuffle"
              className={cn(
                'rounded-full bg-transparent active:scale-95 transition-transform h-[clamp(2.5rem,5vw,3rem)] w-[clamp(2.5rem,5vw,3rem)]',
                isShuffled ? 'text-emerald-400' : 'text-white/40 hover:text-white',
              )}
              onClick={toggleShuffle}
            >
              <ShuffleIcon className="w-[clamp(20px,5vw,24px)] h-[clamp(20px,5vw,24px)]" />
            </Button>

            <Button
              size="icon"
              aria-label="Previous Track"
              className="rounded-full bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all h-[clamp(3rem,7vw,3.5rem)] w-[clamp(3rem,7vw,3.5rem)]"
              onClick={previousTrack}
            >
              <SkipBackIcon
                className="w-[clamp(24px,6vw,30px)] h-[clamp(24px,6vw,30px)]"
                weight="fill"
              />
            </Button>

            <Button
              size="icon"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="rounded-full bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-xl shadow-black/40 h-[clamp(4rem,10vw,5rem)] w-[clamp(4rem,10vw,5rem)]"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <PauseIcon
                  className="w-[clamp(30px,8vw,38px)] h-[clamp(30px,8vw,38px)]"
                  weight="fill"
                />
              ) : (
                <PlayIcon
                  className="w-[clamp(30px,8vw,38px)] h-[clamp(30px,8vw,38px)] ml-[clamp(0.25rem,0.3vw,0.375rem)]"
                  weight="fill"
                />
              )}
            </Button>

            <Button
              size="icon"
              aria-label="Next Track"
              className="rounded-full bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all h-[clamp(3rem,7vw,3.5rem)] w-[clamp(3rem,7vw,3.5rem)]"
              onClick={nextTrack}
            >
              <SkipForwardIcon
                className="w-[clamp(24px,6vw,30px)] h-[clamp(24px,6vw,30px)]"
                weight="fill"
              />
            </Button>

            <Button
              size="icon"
              aria-label={repeatMode === 'one' ? 'Repeat Once' : 'Toggle Repeat'}
              className={cn(
                'rounded-full bg-transparent active:scale-95 transition-transform h-[clamp(2.5rem,5vw,3rem)] w-[clamp(2.5rem,5vw,3rem)]',
                isRepeatEnabled ? 'text-emerald-400' : 'text-white/40 hover:text-white',
              )}
              onClick={toggleRepeatMode}
            >
              {repeatMode === 'one' ? (
                <RepeatOnceIcon className="w-[clamp(20px,5vw,24px)] h-[clamp(20px,5vw,24px)]" />
              ) : (
                <RepeatIcon className="w-[clamp(20px,5vw,24px)] h-[clamp(20px,5vw,24px)]" />
              )}
            </Button>
          </div>

          {/* Lyrics & Queue Buttons */}
          <div className="flex items-center justify-center gap-3 px-6 pt-4 shrink-0">
            <Button
              variant="ghost"
              aria-label="Lyrics"
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium border border-white/10 bg-white/5 backdrop-blur-sm transition-all active:scale-95',
                isQueueOpen && sidebarView === 'lyrics'
                  ? 'text-white bg-white/15 border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              )}
              onClick={() => {
                if (isQueueOpen && sidebarView === 'lyrics') {
                  setQueueOpen(false);
                } else {
                  setSidebarView('lyrics');
                  setQueueOpen(true);
                }
              }}
            >
              <QuotesIcon size={18} />
              Lyrics
            </Button>
            <Button
              variant="ghost"
              aria-label="Queue"
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium border border-white/10 bg-white/5 backdrop-blur-sm transition-all active:scale-95',
                isQueueOpen && sidebarView === 'queue'
                  ? 'text-white bg-white/15 border-white/20'
                  : 'text-white/60 hover:text-white hover:bg-white/10',
              )}
              onClick={() => {
                if (isQueueOpen && sidebarView === 'queue') {
                  setQueueOpen(false);
                } else {
                  setSidebarView('queue');
                  setQueueOpen(true);
                }
              }}
            >
              <QueueIcon size={18} />
              Queue
            </Button>
          </div>

          {/* Elastyczny spacer wypychający głośność na dół */}
          <div className="flex-1 min-h-0" />

          {/* Volume Control - Przywrócony na stałe na dole */}
          <div className="flex items-center gap-[clamp(0.75rem,2vw,1rem)] px-8 pb-10 pt-4 shrink-0 bg-stone-950">
            <SpeakerHighIcon className="text-white/40 shrink-0 w-[clamp(18px,4vw,22px)] h-[clamp(18px,4vw,22px)]" />
            <Slider
              value={volume * 100}
              min={0}
              max={100}
              onChange={(val) => setVolume(val / 100)}
              className="flex-1"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
