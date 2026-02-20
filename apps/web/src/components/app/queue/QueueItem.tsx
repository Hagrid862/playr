import React from 'react';
import { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { Button } from '@/components/ui/button';
import { DotsSixVerticalIcon, MusicNotesIcon, PlayIcon, TrashIcon } from '@phosphor-icons/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';

export interface QueueItemProps {
  track: PlayrQueueItem;
  onPlay: (track: PlayrQueueItem) => void;
  onRemove: (uniqueId: string, event: React.MouseEvent) => void;
}

export function QueueItem({ track, onPlay, onRemove }: QueueItemProps) {
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
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)', transition: { duration: 0.2 } }}
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
    </motion.div>
  );
}
