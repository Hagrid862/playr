import { cn } from '@/lib/utils';
import { usePlayerStore, type QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import React from 'react';
import { History as QueueHistory } from './History';
import { QueueHeader } from './queue/QueueHeader';
import { QueueNextUp } from './queue/QueueNextUp';
import { QueueNowPlaying } from './queue/QueueNowPlaying';

export function Queue() {
  const {
    queue,
    currentTrack,
    playTrack,
    removeFromQueue,
    toggleQueue,
    reorderQueue,
    isQueueOpen,
    isShuffled,
  } = usePlayerStore();
  const [view, setView] = React.useState<'main' | 'history'>('main');

  React.useEffect(() => {
    if (!isQueueOpen) {
      setView('main');
    }
  }, [isQueueOpen]);

  const handleRemoveTrack = (uniqueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromQueue(uniqueId);
  };

  const handlePlayTrack = (track: PlayrQueueItem) => {
    playTrack(track);
  };

  const currentIndex = currentTrack ? queue.findIndex((t) => t.id === currentTrack.id) : -1;

  const nextUp = queue.slice(currentIndex + 1);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = queue.findIndex((t) => t.uniqueId === active.id);
      const newIndex = queue.findIndex((t) => t.uniqueId === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newQueue = arrayMove(queue, oldIndex, newIndex);
        reorderQueue(newQueue);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-900 border-l border-white/5 w-full relative overflow-hidden">
      {/* Main Queue View */}
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
          <QueueNowPlaying currentTrack={currentTrack as PlayrQueueItem} />
          <QueueNextUp
            nextUp={nextUp}
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
