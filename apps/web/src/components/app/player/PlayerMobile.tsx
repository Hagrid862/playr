import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player.store';
import { MusicNotesIcon, PauseIcon, PlayIcon } from '@phosphor-icons/react';

export function PlayerMobile() {
  const { currentTrack, isPlaying, togglePlay } = usePlayerStore();

  const trackTitle = currentTrack?.title || 'No track selected';
  const trackArtist = currentTrack?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const coverUrl = currentTrack?.album?.cover?.url;

  return (
    <div className="w-full h-full flex items-center justify-between px-2">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="h-10 w-10 shrink-0 bg-stone-900 rounded-md flex items-center justify-center overflow-hidden border border-white/10 shadow-lg">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="size-full object-cover" />
          ) : (
            <MusicNotesIcon size={20} className="text-stone-500" />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-white font-semibold truncate text-sm" data-testid="track-title">
            {trackTitle}
          </div>
          <div className="text-white/50 text-xs truncate font-medium" data-testid="track-artist">
            {trackArtist}
          </div>
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
