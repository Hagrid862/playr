import { Button } from '@/components/ui/button';
import { usePlayerStore, type QueueItem } from '@/stores/player.store';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, MusicNotesIcon, PlayIcon, XIcon } from '@phosphor-icons/react';
import React from 'react';

interface HistoryProps {
  isVisible: boolean;
  onBack: () => void;
}

export function History({ isVisible, onBack }: HistoryProps) {
  const { history, playTrack, toggleQueue } = usePlayerStore();
  const [historyLimit, setHistoryLimit] = React.useState(20);

  const handlePlayTrack = (track: QueueItem) => {
    playTrack(track);
  };

  const handleLoadHistory = () => {
    setHistoryLimit((prev) => Math.min(prev + 20, history.length));
  };

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
          : 'opacity-0 scale-102 blur-xs pointer-events-none',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white -ml-2"
            onClick={onBack}
            title="Back to Queue"
          >
            <ArrowLeftIcon size={20} />
          </Button>
          <h2 className="text-lg font-semibold text-white">History</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white md:hidden"
            onClick={toggleQueue}
          >
            <XIcon size={20} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 ? (
          <div className="text-sm text-white/30 italic text-center py-8">No listening history</div>
        ) : (
          <div className="space-y-0.5">
            {history.slice(0, historyLimit).map((track, i) => (
              <div
                key={`${track.uniqueId}-${i}`}
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
                <div className="text-xs text-white/30 tabular-nums">
                  {/* Could show played time here if we tracked it, but keeping simple for now */}
                </div>
              </div>
            ))}
            {historyLimit < history.length && (
              <div className="flex justify-center py-4">
                <Button variant="ghost" size="sm" onClick={handleLoadHistory} className="text-xs">
                  Load more
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
