import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  emitFavoriteStateSync,
} from '@/lib/playback/sync/playback-sync';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import {
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  StarIcon,
} from '@phosphor-icons/react';
import { toast } from 'sonner';

interface PlayerMobileProps {
  formatTime: (time: number) => string;
  formatTimeLeft: (time: number, total: number) => string;
  /** When true, only shows essential controls (fav + play). When false, shows full transport controls. */
  compact?: boolean;
}

export function PlayerMobile({ formatTime, formatTimeLeft, compact = true }: PlayerMobileProps) {
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
  } = usePlayerStore();

  const trackTitle = currentTrack?.title || 'No track selected';
  const coverUrl = currentTrack?.albumArt;
  const isFavorited = playbackFavorited === 'favorited';
  const isRepeatEnabled = repeatMode !== 'off';

  const handleFavorite = async () => {
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
  };

  return (
    <div className="w-full h-full flex flex-col justify-center gap-1 px-3">
      <div className="flex items-center gap-2">
        {/* Track Cover */}
        <div className="h-9 w-9 shrink-0 bg-stone-800 rounded-md flex items-center justify-center overflow-hidden border border-white/10 shadow-md">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <MusicNotesIcon size={16} className="text-stone-500" />
          )}
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-[12px] leading-tight truncate">
            {trackTitle}
          </div>
          <div className="text-white/50 text-[10px] tabular-nums font-medium leading-tight">
            {formatTime(currentTime)}{' '}
            <span className="text-white/30">/</span>{' '}
            {formatTimeLeft(currentTime, duration)}
          </div>
        </div>

        {/* Transport Controls — shown only when not compact (medium screens) */}
        {!compact && (
          <>
            <Button
              size="icon"
              aria-label="Toggle Shuffle"
              className={cn(
                'active:scale-95 shrink-0 h-7 w-7 rounded-full bg-transparent',
                isShuffled ? 'text-emerald-400' : 'text-white/40 hover:text-white',
              )}
              onClick={toggleShuffle}
            >
              <ShuffleIcon size={14} />
            </Button>
            <Button
              size="icon"
              aria-label={repeatMode === 'one' ? 'Repeat Once' : 'Toggle Repeat'}
              className={cn(
                'active:scale-95 shrink-0 h-7 w-7 rounded-full bg-transparent',
                isRepeatEnabled ? 'text-emerald-400' : 'text-white/40 hover:text-white',
              )}
              onClick={toggleRepeatMode}
            >
              {repeatMode === 'one' ? <RepeatOnceIcon size={14} /> : <RepeatIcon size={14} />}
            </Button>
          </>
        )}

        {/* Favorite Button */}
        <Button
          size="icon"
          variant="ghost"
          aria-label="Favorite"
          disabled={!currentTrack || playbackVersion === 0}
          className={cn(
            'active:scale-95 shrink-0 h-8 w-8 rounded-full',
            isFavorited
              ? 'text-emerald-400 hover:text-emerald-300'
              : 'text-white/40 hover:text-white',
          )}
          onClick={handleFavorite}
        >
          <StarIcon size={16} weight={isFavorited ? 'fill' : 'regular'} />
        </Button>

        {/* Transport: prev/next flanking play on the far right */}
        {!compact && (
          <Button
            size="icon"
            aria-label="Previous Track"
            className="active:scale-95 shrink-0 h-7 w-7 rounded-full text-white/60 hover:text-white bg-transparent"
            onClick={previousTrack}
          >
            <SkipBackIcon size={16} weight="fill" />
          </Button>
        )}

        {/* Play/Pause Button — always on the far right */}
        <Button
          size="icon"
          variant="ghost"
          className="active:scale-95 shrink-0 h-8 w-8 rounded-full text-white hover:bg-white/10"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <PauseIcon size={18} weight="fill" />
          ) : (
            <PlayIcon size={18} weight="fill" className="ml-0.5" />
          )}
        </Button>

        {!compact && (
          <Button
            size="icon"
            aria-label="Next Track"
            className="active:scale-95 shrink-0 h-7 w-7 rounded-full text-white/60 hover:text-white bg-transparent"
            onClick={nextTrack}
          >
            <SkipForwardIcon size={16} weight="fill" />
          </Button>
        )}
      </div>

      {/* Progress Slider */}
      <Slider
        value={currentTime}
        max={duration || 100}
        showThumb={false}
        onChange={(newTime) => setCurrentTime(newTime)}
        className="w-full"
      />
    </div>
  );
}
