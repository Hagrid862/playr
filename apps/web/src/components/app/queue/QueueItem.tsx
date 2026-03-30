import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { QueueItem as PlayrQueueItem } from '@/stores/player.store';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVerticalIcon, MusicNotesIcon, PlayIcon, TrashIcon } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import React from 'react';

export interface QueueItemProps {
  track: PlayrQueueItem;
  onPlay: (track: PlayrQueueItem) => void;
  onRemove: (uniqueId: string, event: React.MouseEvent) => void;
  /** When true, disables hover effects (e.g. when another item is being dragged) */
  isDragActive?: boolean;
}

/** Renders the overlay preview for drag - no useSortable (rendered outside SortableContext) */
export function QueueItemOverlay({ track }: { track: PlayrQueueItem }) {
  return (
    <div>
      <div
        className="group flex items-center gap-2 p-2 rounded-md opacity-50 bg-stone-800/80 transition-colors cursor-grabbing"
        style={{ transform: 'scale(0.85)', transformOrigin: 'center center' }}
      >
        <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-stone-800">
          {track.albumArt ? (
            <img
              src={track.albumArt}
              alt={track.title}
              className="h-full w-full object-cover opacity-80"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center opacity-80">
              <MusicNotesIcon className="text-white/20" size={16} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/60 truncate">{track.title}</div>
          <div className="text-xs text-white/40 truncate">
            {track.artists?.join(', ') || 'Unknown Artist'}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QueueItem({ track, onPlay, onRemove, isDragActive = false }: QueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.uniqueId,
  });

  const style = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.2 : 1,
  };

  const hoverDisabled = isDragActive || isDragging;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)', transition: { duration: 0.2 } }}
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md transition-colors cursor-pointer',
        !hoverDisabled && 'hover:bg-white/5',
      )}
      onClick={() => onPlay(track)}
    >
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'text-white/20 cursor-grab active:cursor-grabbing p-1 -ml-1',
          !hoverDisabled && 'hover:text-white/50',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DotsSixVerticalIcon size={20} />
      </div>

      <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-stone-800">
        {track.albumArt ? (
          <img
            src={track.albumArt}
            alt={track.title}
            className={cn(
              'h-full w-full object-cover transition-opacity',
              !hoverDisabled && 'group-hover:opacity-40',
            )}
          />
        ) : (
          <div
            className={cn(
              'h-full w-full flex items-center justify-center transition-opacity',
              !hoverDisabled && 'group-hover:opacity-40',
            )}
          >
            <MusicNotesIcon className="text-white/20" size={16} />
          </div>
        )}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-opacity opacity-0',
            !hoverDisabled && 'group-hover:opacity-100',
          )}
        >
          <PlayIcon weight="fill" className="text-white" size={16} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'text-sm font-medium text-white/90 truncate',
            !hoverDisabled && 'group-hover:text-white',
          )}
        >
          {track.title}
        </div>
        <div className="text-xs text-white/50 truncate">
          {track.artists?.join(', ') || 'Unknown Artist'}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 text-white/20 transition-all opacity-0',
          !hoverDisabled && 'group-hover:opacity-100 hover:text-red-400 hover:bg-red-400/10',
        )}
        onClick={(e) => onRemove(track.uniqueId, e)}
      >
        <TrashIcon />
      </Button>
    </motion.div>
  );
}
