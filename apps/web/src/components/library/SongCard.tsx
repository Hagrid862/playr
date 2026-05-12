import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Spinner } from '@/components/ui/spinner';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { cn } from '@/lib/utils';
import { PencilIcon, PlayIcon, QueueIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react';
import type { ZodArtist } from '@repo/contracts';

interface SongCardProps {
  id: string;
  trackNumber: number;
  title: string;
  artists?: Pick<ZodArtist, 'id' | 'name'>[];
  duration: number;
  explicit?: boolean;
  isActive?: boolean;
  isPlaying?: boolean;
  isProcessing?: boolean;
  isFailed?: boolean;
  onClick?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (track: { id: string; title: string }) => void;
  onAddToQueue?: () => void;
  onPlayNext?: () => void;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function SongCard({
  id,
  trackNumber,
  title,
  artists,
  duration,
  explicit,
  isActive,
  isPlaying,
  isProcessing,
  isFailed,
  onClick,
  onEdit,
  onDelete,
  onAddToQueue,
  onPlayNext,
}: SongCardProps) {
  const isDisabled = isProcessing || isFailed;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          className={cn(
            'group grid grid-cols-[3rem_1fr_auto] gap-4 items-center px-4 py-3 rounded-xl transition-all active:scale-[1]',
            isDisabled
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-stone-900/40 cursor-pointer hover:scale-101',
            isActive ? 'bg-white/10' : '',
          )}
          onClick={isDisabled ? undefined : onClick}
        >
          <div className="text-center text-sm font-bold text-stone-500 group-hover:text-primary transition-colors flex justify-center items-center">
            {isProcessing ? (
              <Spinner className="size-4 mx-auto" aria-label="Processing" />
            ) : isFailed ? (
              <WarningIcon
                className="mx-auto text-amber-500"
                size={16}
                weight="fill"
                aria-label="Processing failed"
              />
            ) : isActive && isPlaying ? (
              <div className="flex items-end gap-0.5 h-3">
                <div className="w-1 h-3 bg-green-500 animate-music-bar-1" />
                <div className="w-1 h-2 bg-green-500 animate-music-bar-2" />
                <div className="w-1 h-3 bg-green-500 animate-music-bar-3" />
              </div>
            ) : (
              <>
                <span className={cn('group-hover:hidden', isActive && !isPlaying ? 'hidden' : '')}>
                  {trackNumber}
                </span>
                <PlayIcon
                  className={cn(
                    'hidden group-hover:block mx-auto',
                    isActive && !isPlaying ? 'block' : '',
                  )}
                  weight="fill"
                  size={16}
                />
              </>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'font-bold truncate text-base',
                  isActive ? 'text-green-500' : 'text-stone-200 group-hover:text-white',
                )}
              >
                {title}
              </div>
              {explicit && (
                <span className="flex items-center justify-center size-3.5 bg-stone-500 text-[10px] font-bold text-stone-950 rounded-[2px] shrink-0 translate-y-px">
                  E
                </span>
              )}
            </div>
            <div className="text-xs font-medium text-stone-500 group-hover:text-stone-400">
              {artists?.length ? artists.map((a) => a.name).join(', ') : UNKNOWN_ARTIST_LABEL}
            </div>
          </div>

          <div className="text-sm font-bold text-stone-500 tabular-nums group-hover:text-stone-300">
            {formatDuration(duration)}
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onEdit?.(id)} className="gap-2">
          <PencilIcon size={16} />
          Edit
        </ContextMenuItem>
        {onPlayNext && (
          <ContextMenuItem onClick={onPlayNext} className="gap-2" disabled={isDisabled}>
            <PlayIcon size={16} />
            Play Next
          </ContextMenuItem>
        )}
        {onAddToQueue && (
          <ContextMenuItem onClick={onAddToQueue} className="gap-2" disabled={isDisabled}>
            <QueueIcon size={16} />
            Add to Queue
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onClick={() => onDelete?.({ id, title })}
          variant="destructive"
          className="gap-2"
        >
          <TrashIcon size={16} />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
