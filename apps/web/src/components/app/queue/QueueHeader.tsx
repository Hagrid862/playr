import { Button } from '@/components/ui/button';
import { ClockCounterClockwiseIcon, XIcon } from '@phosphor-icons/react';

interface QueueHeaderProps {
  onShowHistory: () => void;
  onToggleQueue: () => void;
}

export function QueueHeader({ onShowHistory, onToggleQueue }: QueueHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-white">Queue</h2>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/50 hover:text-white"
          onClick={onShowHistory}
          title="Show History"
        >
          History
          <ClockCounterClockwiseIcon size={20} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/50 hover:text-white md:hidden"
          onClick={onToggleQueue}
        >
          <XIcon size={20} />
        </Button>
      </div>
    </div>
  );
}
