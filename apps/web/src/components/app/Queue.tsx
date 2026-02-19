import { Button } from '@/components/ui/button';
import React from 'react';
import { usePlayerStore, type QueueItem } from '@/stores/player.store';
import { cn } from '@/lib/utils';
import {
  ClockCounterClockwiseIcon,
  DotsSixVerticalIcon,
  MusicNotesIcon,
  PlayIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { History as QueueHistory } from './History';

interface SortableTrackItemProps {
  track: QueueItem;
  onPlay: (track: QueueItem) => void;
  onRemove: (uniqueId: string, event: React.MouseEvent) => void;
}

function SortableTrackItem({ track, onPlay, onRemove }: SortableTrackItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.uniqueId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => onPlay(track)}
    >
      <div
        {...attributes}
        {...listeners}
        className="text-white/20 hover:text-white/50 cursor-grab active:cursor-grabbing p-1 -ml-1"
        onClick={(e) => e.stopPropagation()}
      >
        <DotsSixVerticalIcon size={20} />
      </div>

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
        onClick={(e) => onRemove(track.uniqueId, e)}
      >
        <TrashIcon />
      </Button>
    </div>
  );
}

export function Queue() {
  const {
    queue,
    currentTrack,
    playTrack,
    removeFromQueue,
    toggleQueue,
    reorderQueue,
    isQueueOpen,
  } = usePlayerStore();
  const [view, setView] = React.useState<'main' | 'history'>('main');

  React.useEffect(() => {
    if (!isQueueOpen) {
      setView('main');
    }
  }, [isQueueOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleRemoveTrack = (uniqueId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    removeFromQueue(uniqueId);
  };

  const handlePlayTrack = (track: QueueItem) => {
    playTrack(track);
  };

  const currentIndex = currentTrack
    ? queue.findIndex((t) => t.uniqueId === currentTrack.uniqueId)
    : -1;

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Queue</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/50 hover:text-white"
              onClick={() => setView('history')}
              title="Show History"
            >
              <ClockCounterClockwiseIcon size={20} />
            </Button>
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
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={nextUp.map((t) => t.uniqueId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0.5">
                    {nextUp.map((track) => (
                      <SortableTrackItem
                        key={track.uniqueId}
                        track={track}
                        onPlay={handlePlayTrack}
                        onRemove={handleRemoveTrack}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <QueueHistory isVisible={view === 'history'} onBack={() => setView('main')} />
    </div>
  );
}
