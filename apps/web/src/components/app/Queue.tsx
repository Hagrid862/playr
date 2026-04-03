import { getOrderedNextQueue, reorderKeepingPartitions } from '@/lib/playback-queue';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player.store';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import type { QueueItem } from '@repo/contracts';
import React from 'react';
import { History as QueueHistory } from './History';
import { QueueHeader } from './queue/QueueHeader';
import { QueueNextUp } from './queue/QueueNextUp';

export function Queue() {
  const {
    queue,
    playQueueItem,
    removeFromQueue,
    toggleQueue,
    reorderQueue,
    isQueueOpen,
    isShuffled,
  } = usePlayerStore();
  const [view, setView] = React.useState<'main' | 'history'>('main');

  const orderedQueue = React.useMemo(
    () => getOrderedNextQueue(queue, isShuffled),
    [queue, isShuffled],
  );

  React.useEffect(() => {
    if (!isQueueOpen) {
      setView('main');
    }
  }, [isQueueOpen]);

  const handleRemoveTrack = (uniqueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromQueue(uniqueId);
  };

  const handlePlayTrack = (track: QueueItem) => {
    playQueueItem(track.queueId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedQueue.findIndex((t) => t.queueId === active.id);
      const newIndex = orderedQueue.findIndex((t) => t.queueId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newQueue = reorderKeepingPartitions(arrayMove(orderedQueue, oldIndex, newIndex));
        reorderQueue(newQueue);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-white/5 w-full relative overflow-hidden">
      <div
        className={cn(
          'absolute inset-0 flex flex-col transition-all duration-300 ease-out',
          view === 'main'
            ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
            : 'opacity-0 scale-98 blur-xs pointer-events-none',
        )}
      >
        <QueueHeader onShowHistory={() => setView('history')} onToggleQueue={toggleQueue} />

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <QueueNextUp
            nextUp={orderedQueue}
            isShuffled={isShuffled}
            onDragEnd={handleDragEnd}
            onPlayTrack={handlePlayTrack}
            onRemoveTrack={handleRemoveTrack}
          />
        </div>
      </div>

      <QueueHistory isVisible={view === 'history'} onBack={() => setView('main')} />
    </div>
  );
}
