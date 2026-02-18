import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/stores/player.store';
import { MusicNotesIcon, PlayIcon, TrashIcon, XIcon } from '@phosphor-icons/react';

export function Queue() {
  const { queue, currentTrack, playTrack, removeFromQueue, toggleQueue } = usePlayerStore();

  const handleRemoveTrack = (uniqueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromQueue(uniqueId);
  };

  const handlePlayTrack = (track: import('@repo/contracts').ZodTrack) => {
    playTrack(track);
  };

  const currentIndex = currentTrack
    ? queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId)
    : -1;

  const nextUp = queue.slice(currentIndex + 1);

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-white/5 w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
        <h2 className="text-lg font-semibold text-white">Queue</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white md:hidden"
          onClick={toggleQueue}
        >
          <XIcon size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Now Playing */}
        {currentTrack && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">
              Now Playing
            </h3>
            <div className="group flex items-center gap-3 p-2 rounded-md bg-white/5 border border-white/5 transition-colors hover:bg-white/10">
              <div className="relative h-12 w-12 shrink-0 rounded overflow-hidden bg-stone-800">
                {currentTrack.album?.cover?.url ? (
                  <img
                    src={currentTrack.album.cover.url}
                    alt={currentTrack.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <MusicNotesIcon className="text-white/20" size={20} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-1 h-3 bg-green-500 animate-music-bar-1" />
                    <div className="w-1 h-2 bg-green-500 animate-music-bar-2" />
                    <div className="w-1 h-3 bg-green-500 animate-music-bar-3" />
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-green-500 truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {currentTrack.artists?.map((a: { name: string }) => a.name).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Up */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Next Up</h3>

          {nextUp.length === 0 ? (
            <div className="text-sm text-white/30 italic text-center py-8">Queue is empty</div>
          ) : (
            <div className="space-y-0.5">
              {nextUp.map((track) => (
                <div
                  key={track.uniqueId}
                  className="group flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => handlePlayTrack(track)}
                >
                  <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-stone-800">
                    {track.album?.cover?.url ? (
                      <img
                        src={track.album.cover.url}
                        alt={track.title}
                        className="h-full w-full object-cover group-hover:opacity-40 transition-opacity"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center group-hover:opacity-40 transition-opacity">
                        <MusicNotesIcon className="text-white/20" size={16} />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayIcon weight="fill" className="text-white" size={16} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/90 truncate group-hover:text-white">
                      {track.title}
                    </div>
                    <div className="text-xs text-white/50 truncate">
                      {track.artists?.map((a: { name: string }) => a.name).join(', ')}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    onClick={(e) => handleRemoveTrack(track.uniqueId, e)}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
