import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { QueueItem } from '@repo/contracts';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { QueueItem as QueueItemComponent, QueueItemOverlay } from './QueueItem';

interface QueueNextUpProps {
  nextUp: QueueItem[];
  isShuffled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onPlayTrack: (track: QueueItem) => void;
  onRemoveTrack: (uniqueId: string, event: React.MouseEvent) => void;
}

type DropLinePosition = 'top' | 'bottom';

export function QueueNextUp({
  nextUp,
  isShuffled,
  onDragEnd,
  onPlayTrack,
  onRemoveTrack,
}: QueueNextUpProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  const [dropLinePosition, setDropLinePosition] = React.useState<DropLinePosition | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (over) {
      setOverId(String(over.id));
      const activeIndex = nextUp.findIndex((t) => t.queueId === active.id);
      const overIndex = nextUp.findIndex((t) => t.queueId === over.id);
      if (activeIndex > overIndex) {
        setDropLinePosition('top');
      } else {
        setDropLinePosition('bottom');
      }
    } else {
      setOverId(null);
      setDropLinePosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverId(null);
    setDropLinePosition(null);
    onDragEnd(event);
  };

  const activeTrack = activeId ? nextUp.find((t) => t.queueId === activeId) : null;

  const dropLineClassNames = (visible: boolean) =>
    cn(
      'w-full rounded-full transition-all duration-200',
      visible ? 'h-0.5 bg-white/60 opacity-100' : 'h-0 opacity-0',
    );

  return (
    <div className="space-y-3" aria-label="Next Up" role="region">
      <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider">Next Up</h3>
      <AnimatePresence mode="wait">
        {nextUp.length === 0 ? (
          <motion.div
            key="empty-queue"
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{
              opacity: 0,
              scale: 0.98,
              filter: 'blur(4px)',
              transition: { duration: 0.2 },
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-sm text-white/30 italic text-center py-8"
          >
            Queue is empty
          </motion.div>
        ) : (
          <motion.div
            key={isShuffled ? 'shuffled-list' : 'unshuffled-list'}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{
              opacity: 0,
              scale: 0.98,
              filter: 'blur(4px)',
              transition: { duration: 0.2 },
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full"
          >
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={nextUp.map((t) => t.queueId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {nextUp.map((track) => (
                      <div key={track.queueId}>
                        <div
                          className={dropLineClassNames(
                            overId === track.queueId &&
                              dropLinePosition === 'top' &&
                              overId !== activeId,
                          )}
                        />
                        <QueueItemComponent
                          track={track}
                          onPlay={onPlayTrack}
                          onRemove={onRemoveTrack}
                          isDragActive={activeId !== null}
                        />
                        <div
                          className={dropLineClassNames(
                            overId === track.queueId &&
                              dropLinePosition === 'bottom' &&
                              overId !== activeId,
                          )}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
              <DragOverlay dropAnimation={null}>
                {activeTrack ? <QueueItemOverlay track={activeTrack} /> : null}
              </DragOverlay>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
