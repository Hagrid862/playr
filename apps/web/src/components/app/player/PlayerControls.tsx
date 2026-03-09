import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player.store';
import {
  PauseIcon,
  PlayIcon,
  RepeatIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from '@phosphor-icons/react';

export function PlayerControls() {
  const {
    isPlaying,
    togglePlay,
    nextTrack,
    previousTrack,
    repeatMode,
    toggleRepeatMode,
    isShuffled,
    toggleShuffle,
  } = usePlayerStore();

  const isRepeatEnabled = repeatMode !== 'off';

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 border border-white/8 shadow-lg h-14"
      style={{ borderRadius: '2rem 0.5rem 0.5rem 2rem' }}
    >
      <Button
        size="icon"
        className={`bg-transparent hover:bg-white/2 active:bg-white/5 rounded-full h-8 w-8 active:scale-95 transition-all ${
          isShuffled ? 'text-emerald-500' : 'text-white/40 hover:text-white'
        }`}
        onClick={toggleShuffle}
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
        className={`bg-transparent hover:bg-white/2 active:bg-white/5 rounded-full h-8 w-8 active:scale-95 transition-all ${
          isRepeatEnabled ? 'text-emerald-500' : 'text-white/40 hover:text-white'
        }`}
        onClick={toggleRepeatMode}
      >
        {repeatMode === 'one' ? <RepeatOnceIcon size={16} /> : <RepeatIcon size={16} />}
      </Button>
    </div>
  );
}
