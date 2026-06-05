import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { cn } from '@/lib/utils';
import { useListenHistoryInfinite, useListenHistorySync } from '@/hooks/api/library';
import { usePlayerStore } from '@/stores/player-store/player.store';
import {
  detectNewHistoryHeadId,
  type HistoryHeadAnimationState,
} from '@/lib/playback/history-head-animation';
import {
  type ListenHistoryListItem,
  zodTrackToPlaybackTrack,
} from '@/lib/playback/playback-mappers';
import { ArrowLeftIcon, MusicNotesIcon, PlayIcon, XIcon, TrashIcon } from '@phosphor-icons/react';
import { useClearListenHistory } from '@/hooks/api/history/useClearListenHistory';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ZodTrack } from '@repo/contracts';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React from 'react';

const LISTEN_HISTORY_PAGE_LIMIT = 20;

const HISTORY_ROW_TRANSITION = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;
const HISTORY_LAYOUT_TRANSITION = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

const HISTORY_SKELETON_CLASS = 'bg-white/10';

function HistoryListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-2 rounded-md" aria-hidden>
      <Skeleton className={cn('h-10 w-10 shrink-0 rounded', HISTORY_SKELETON_CLASS)} />
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className={cn('h-4 w-[58%] max-w-xs', HISTORY_SKELETON_CLASS)} />
        <Skeleton className={cn('h-3 w-[36%] max-w-[10rem]', HISTORY_SKELETON_CLASS)} />
      </div>
    </div>
  );
}

function HistoryListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-0.5" role="status" aria-label="Loading history">
      {Array.from({ length: count }, (_, i) => (
        <HistoryListRowSkeleton key={i} />
      ))}
    </div>
  );
}

function HistoryListRow({
  item,
  isNewAtHead = false,
  onPlay,
}: {
  item: ListenHistoryListItem;
  isNewAtHead?: boolean;
  onPlay: (track: ZodTrack) => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={reduceMotion ? false : 'position'}
      initial={reduceMotion || !isNewAtHead ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{
        opacity: HISTORY_ROW_TRANSITION,
        scale: HISTORY_ROW_TRANSITION,
        layout: HISTORY_LAYOUT_TRANSITION,
      }}
      style={{ transformOrigin: 'top center' }}
      className="group flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors cursor-pointer outline-none focus-visible:bg-white/5 focus-visible:ring-1 focus-visible:ring-white/20"
      onClick={() => onPlay(item.track)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPlay(item.track);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Play ${item.track?.title || 'unknown track'} by ${item.track?.artists?.map((a) => (typeof a === 'string' ? a : a.name)).join(', ') || UNKNOWN_ARTIST_LABEL}`}
    >
      <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-stone-800">
        {item.track?.album?.cover?.url ? (
          <img
            src={item.track.album.cover.url}
            alt={item.track?.title || 'Cover art'}
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
          {item.track?.title}
        </div>
        <div className="text-xs text-white/50 truncate">
          {item.track?.artists?.map((a) => (typeof a === 'string' ? a : a.name)).join(', ') ||
            UNKNOWN_ARTIST_LABEL}
        </div>
      </div>
      <div className="text-xs text-white/30 tabular-nums" />
    </motion.div>
  );
}

interface HistoryProps {
  isVisible: boolean;
  onBack: () => void;
}

export function History({ isVisible, onBack }: HistoryProps) {
  const { playTrack, toggleQueue } = usePlayerStore();
  const { data, fetchNextPage, hasNextPage, isLoading, isFetching, isFetchingNextPage } =
    useListenHistoryInfinite({ limit: LISTEN_HISTORY_PAGE_LIMIT, enabled: isVisible });
  useListenHistorySync({ enabled: isVisible, limit: LISTEN_HISTORY_PAGE_LIMIT });
  const { mutate: clearHistory, isPending: isClearing } = useClearListenHistory();
  const [isClearPopoverOpen, setIsClearPopoverOpen] = React.useState(false);

  const historyItems = React.useMemo(() => {
    const items = data?.pages.flatMap((page) => page.data?.items ?? []) ?? [];
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [data]);

  const showInitialSkeleton = isLoading || (isFetching && historyItems.length === 0);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [headAnimationState, setHeadAnimationState] = React.useState<HistoryHeadAnimationState>({
    hasSeenList: false,
    prevHeadId: null,
  });
  const headId = historyItems[0]?.id;
  const newHeadListenId = detectNewHistoryHeadId(headId, headAnimationState);

  React.useEffect(() => {
    if (historyItems.length === 0) return;
    setHeadAnimationState({
      hasSeenList: true,
      prevHeadId: headId ?? null,
    });
  }, [headId, historyItems.length]);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: null, rootMargin: '150px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePlayTrack = (track: ZodTrack) => {
    playTrack(zodTrackToPlaybackTrack(track));
  };

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col transition-all duration-300 ease-out',
        isVisible
          ? 'opacity-100 scale-100 blur-0 pointer-events-auto'
          : 'opacity-0 scale-102 blur-xs pointer-events-none',
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0 h-16">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white -ml-2"
            onClick={onBack}
            title="Back to Queue"
          >
            <ArrowLeftIcon size={20} />
          </Button>
          <h2 className="text-lg font-semibold text-white">History</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {historyItems.length > 0 && (
            <Popover open={isClearPopoverOpen} onOpenChange={setIsClearPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/50 hover:text-rose-400 hover:bg-white/5 text-xs gap-1.5 px-2.5 h-8 font-medium transition-colors"
                  disabled={isClearing}
                >
                  <TrashIcon size={16} />
                  <span>Clear</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-80 bg-stone-900 border border-white/10 text-white p-4 shadow-xl rounded-xl flex flex-col gap-3 z-[100]"
              >
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-stone-200">Clear History?</h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    This will permanently clear your listening history. This action is irreversible.
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-stone-400 hover:text-white hover:bg-white/5 text-xs px-3 h-8"
                    onClick={() => setIsClearPopoverOpen(false)}
                    disabled={isClearing}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 h-8 font-medium transition-colors"
                    onClick={() => {
                      clearHistory();
                      setIsClearPopoverOpen(false);
                    }}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Clearing...' : 'Clear'}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/50 hover:text-white md:hidden"
            onClick={toggleQueue}
            aria-label="Close"
          >
            <XIcon size={20} />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {showInitialSkeleton ? (
          <HistoryListSkeleton count={LISTEN_HISTORY_PAGE_LIMIT} />
        ) : historyItems.length === 0 ? (
          <div className="text-sm text-white/30 italic text-center py-8">No listening history</div>
        ) : (
          <div className="space-y-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {historyItems.map((item) => (
                <HistoryListRow
                  key={item.id}
                  item={item}
                  isNewAtHead={item.id === newHeadListenId}
                  onPlay={handlePlayTrack}
                />
              ))}
            </AnimatePresence>
            {hasNextPage && <div ref={sentinelRef} className="h-4" />}
            {isFetchingNextPage && (
              <div className="space-y-0.5 pt-1" aria-hidden>
                {Array.from({ length: 3 }, (_, i) => (
                  <HistoryListRowSkeleton key={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
