import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';
import {
  DotsThreeIcon,
  QueueIcon,
  QuotesIcon,
  SpeakerHighIcon,
  StarIcon,
} from '@phosphor-icons/react';

export function PlayerActions() {
  const { volume, setVolume, isQueueOpen, setQueueOpen, sidebarView, setSidebarView } =
    usePlayerStore();

  return (
    <div
      className="flex h-14 items-center gap-0.5 px-2 py-2.5 bg-stone-900 border border-white/8 shadow-lg min-w-auto"
      style={{ borderRadius: '0.5rem 2rem 2rem 0.5rem' }}
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
        className={cn(
          'text-white/40 hover:text-white active:scale-95 h-9 w-9',
          isQueueOpen && sidebarView === 'lyrics' && 'text-white bg-white/10',
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
        <QuotesIcon size={20} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          'text-white/40 hover:text-white active:scale-95 h-9 w-9',
          isQueueOpen && sidebarView === 'queue' && 'text-white bg-white/10',
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
  );
}
