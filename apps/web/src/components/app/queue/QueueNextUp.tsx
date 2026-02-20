import React from 'react';
import { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { motion, AnimatePresence } from 'framer-motion';
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { QueueItem } from './QueueItem';

interface QueueNextUpProps {
  nextUp: PlayrQueueItem[];
  isShuffled: boolean;
  onDragEnd: (event: DragEndEvent) => void;
  onPlayTrack: (track: PlayrQueueItem) => void;
  onRemoveTrack: (uniqueId: string, event: React.MouseEvent) => void;
}

export function QueueNextUp({
  nextUp,
  isShuffled,
  onDragEnd,
  onPlayTrack,
  onRemoveTrack,
}: QueueNextUpProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <div className="space-y-3">
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext
                items={nextUp.map((t) => t.uniqueId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {nextUp.map((track) => (
                      <QueueItem
                        key={track.uniqueId}
                        track={track}
                        onPlay={onPlayTrack}
                        onRemove={onRemoveTrack}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
