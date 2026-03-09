import { Button } from '@/components/ui/button';
import { XIcon } from '@phosphor-icons/react';
import { usePlayerStore } from '@/stores/player.store';

export function Lyrics() {
  const { toggleQueue, currentTrack } = usePlayerStore();

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-white/5 w-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
        <h2 className="text-lg font-semibold text-white">Lyrics</h2>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white md:hidden"
          onClick={toggleQueue}
        >
          <XIcon size={20} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        {currentTrack ? (
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-white">{currentTrack.title}</h3>
            <p className="text-white/50">Lyrics not available yet.</p>
          </div>
        ) : (
          <div className="text-white/30 italic">No track playing</div>
        )}
      </div>
    </div>
  );
}
