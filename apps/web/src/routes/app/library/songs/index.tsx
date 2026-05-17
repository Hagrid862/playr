import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteLibraryTrack } from '@/hooks/api/library-tracks/useDeleteLibraryTrack';
import { useLibraryTracksInfinite } from '@/hooks/api/library-tracks/useLibraryTracksInfinite';
import { useIsMobile } from '@/hooks/use-mobile';
import { UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import { sortLibraryTracksForDisplay } from '@/lib/library/sortLibraryTracks';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { cn } from '@/lib/utils';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type {
  LibraryTrackListSortBy,
  LibraryTrackListSortOrder,
  PlaybackTrack,
  ZodTrack,
} from '@repo/contracts';
import { CaretDownIcon, CaretUpIcon, DiscIcon, PencilIcon, PlayIcon, QueueIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/songs/')({
  component: LibrarySongsPage,
});

const PAGE_SIZE = 100;
const FETCH_THRESHOLD = 20;
const MOBILE_ROW_ESTIMATE = 88;
const DESKTOP_ROW_ESTIMATE = 72;
const COL_COUNT = 6;
/** Space between the rounded header card and the first track row (desktop table). */
const DESKTOP_HEADER_BODY_GAP_CLASS = 'h-4 min-h-4';

/** Sticky thead only; rounding + surface live on header cells (see row class). */
const songsTableHeaderStickyClass =
  'sticky top-0 z-20 border-0 bg-background p-0 shadow-none [&_tr]:border-0';

/**
 * Header row chrome: with `border-separate`, rounding + border on the end cells
 * (`border-collapse: collapse` ignores radius on thead/tr in browsers).
 */
const songsTableHeaderRowClass =
  'shadow-md hover:bg-transparent [&>th]:border-b [&>th]:border-t [&>th]:border-border/60 [&>th]:bg-card [&>th]:dark:bg-muted [&>th:first-child]:rounded-bl-xl [&>th:first-child]:rounded-tl-xl [&>th:first-child]:border-l [&>th:last-child]:rounded-br-xl [&>th:last-child]:rounded-tr-xl [&>th:last-child]:border-r';

/** Inset wash for the playing row; hover/active repeat the same shadow so hover does not apply the default row hover wash. */
const songsTablePlaybackRowShadowClass =
  'shadow-[inset_0_0_0_100vmax_rgb(255_255_255/0.06)] hover:shadow-[inset_0_0_0_100vmax_rgb(255_255_255/0.06)] active:shadow-[inset_0_0_0_100vmax_rgb(255_255_255/0.06)]';

/** Same inset geometry at rest (alpha 0) so hover/active can interpolate; `shadow-none`→inset does not animate. */
const songsTableDataRowClass =
  'relative z-0 overflow-hidden rounded-xl border-b-0 bg-transparent shadow-[inset_0_0_0_100vmax_rgb(41_37_36/0)] transition-shadow duration-300 ease-out hover:z-10 [&>td]:border-0 [&>td]:bg-transparent';

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function getTrackPlayability(track: ZodTrack) {
  const isProcessing =
    track.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing') ?? false;
  const isFailed =
    (track.audioFiles?.length ?? 0) > 0 &&
    track.audioFiles?.every((f) => f.status === 'failed') === true;
  const isDisabled = isProcessing || isFailed;
  return { isProcessing, isFailed, isDisabled };
}

function LibrarySongContextMenuContent({
  track,
  isDisabled,
  onEdit,
  onPlayNext,
  onAddToQueue,
  onDelete,
}: {
  track: ZodTrack;
  isDisabled: boolean;
  onEdit: (track: ZodTrack) => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onDelete: (t: { id: string; title: string }) => void;
}) {
  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={() => onEdit(track)} className="gap-2">
        <PencilIcon size={16} />
        Edit
      </ContextMenuItem>
      <ContextMenuItem onClick={onPlayNext} className="gap-2" disabled={isDisabled}>
        <PlayIcon size={16} />
        Play Next
      </ContextMenuItem>
      <ContextMenuItem onClick={onAddToQueue} className="gap-2" disabled={isDisabled}>
        <QueueIcon size={16} />
        Add to Queue
      </ContextMenuItem>
      <ContextMenuItem
        onClick={() => onDelete({ id: track.id, title: track.title })}
        variant="destructive"
        className="gap-2"
      >
        <TrashIcon size={16} />
        Delete
      </ContextMenuItem>
    </ContextMenuContent>
  );
}

function artistLine(track: ZodTrack) {
  const names = track.artists?.map((a) => a.name).filter(Boolean);
  if (names?.length) return names.join(', ');
  return UNKNOWN_ARTIST_LABEL;
}

type LibrarySongsSortState = {
  sortBy: LibraryTrackListSortBy;
  sortOrder: LibraryTrackListSortOrder;
} | null;

function SortableColumnHead({
  label,
  column,
  sortState,
  onSortColumn,
  className,
  align = 'start',
}: {
  label: string;
  column: LibraryTrackListSortBy;
  sortState: LibrarySongsSortState;
  onSortColumn: (column: LibraryTrackListSortBy) => void;
  className?: string;
  align?: 'start' | 'end';
}) {
  const active = sortState?.sortBy === column;
  const order = active ? sortState.sortOrder : null;

  return (
    <TableHead
      className={cn(
        'px-3 text-muted-foreground',
        align === 'end' && 'text-right',
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          '-mx-1 inline-flex max-w-full items-center gap-1 rounded-md px-1 py-0.5 text-left font-medium text-foreground/90 hover:bg-muted/60 hover:text-foreground',
          align === 'end' && 'w-full justify-end',
          active && 'text-foreground',
          className,
        )}
        aria-sort={
          order === 'asc' ? 'ascending' : order === 'desc' ? 'descending' : 'none'
        }
        onClick={() => onSortColumn(column)}
      >
        <span className="truncate">{label}</span>
        {order === 'asc' ? (
          <CaretUpIcon className="size-3.5 shrink-0 opacity-70" weight="bold" aria-hidden />
        ) : order === 'desc' ? (
          <CaretDownIcon className="size-3.5 shrink-0 opacity-70" weight="bold" aria-hidden />
        ) : null}
      </button>
    </TableHead>
  );
}

function LibrarySongsDesktopTableChrome({
  sortState,
  onSortColumn,
}: {
  sortState: LibrarySongsSortState;
  onSortColumn: (column: LibraryTrackListSortBy) => void;
}) {
  return (
    <>
      <colgroup>
        <col style={{ width: 56 }} />
        <col style={{ width: '38%' }} />
        <col style={{ width: '21%' }} />
        <col style={{ width: '21%' }} />
        <col style={{ width: 52 }} />
        <col style={{ width: 72 }} />
      </colgroup>
      <TableHeader className={songsTableHeaderStickyClass}>
        <TableRow className={songsTableHeaderRowClass}>
          <TableHead className="px-3 text-muted-foreground" />
          <SortableColumnHead
            label="Title"
            column="title"
            sortState={sortState}
            onSortColumn={onSortColumn}
          />
          <SortableColumnHead
            label="Artist"
            column="artist"
            sortState={sortState}
            onSortColumn={onSortColumn}
          />
          <SortableColumnHead
            label="Album"
            column="album"
            sortState={sortState}
            onSortColumn={onSortColumn}
          />
          <SortableColumnHead
            label="#"
            column="trackNumber"
            sortState={sortState}
            onSortColumn={onSortColumn}
            align="end"
            className="tabular-nums"
          />
          <SortableColumnHead
            label="Time"
            column="duration"
            sortState={sortState}
            onSortColumn={onSortColumn}
            align="end"
            className="tabular-nums"
          />
        </TableRow>
      </TableHeader>
    </>
  );
}

function LibrarySongsDesktopInitialLoadShell({
  sortState,
  onSortColumn,
}: {
  sortState: LibrarySongsSortState;
  onSortColumn: (column: LibraryTrackListSortBy) => void;
}) {
  const scrollBottomPadClass = 'pb-0 max-md:pb-[env(safe-area-inset-bottom,0px)]';
  const desktopScrollClass = cn(
    'min-h-0 flex-1 overflow-y-auto overflow-x-auto custom-scrollbar',
    scrollBottomPadClass,
  );

  return (
    <div className={desktopScrollClass}>
      <div className="relative min-w-0">
        <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-0 caption-bottom text-sm">
          <LibrarySongsDesktopTableChrome sortState={sortState} onSortColumn={onSortColumn} />
          <TableBody>
            <TableRow
              aria-hidden
              className="pointer-events-none border-0 hover:bg-transparent [&>td]:border-0"
            >
              <TableCell colSpan={COL_COUNT} className={cn('border-0 p-0', DESKTOP_HEADER_BODY_GAP_CLASS)} />
            </TableRow>
            <TableRow className="border-0 hover:bg-transparent [&>td]:border-0">
              <TableCell colSpan={COL_COUNT} className="border-0 p-0 py-14 md:py-20">
                <div className="flex flex-col items-center justify-center gap-5 px-4">
                  <div className="relative">
                    <div
                      className="absolute inset-0 scale-150 rounded-full bg-primary/10 blur-2xl motion-safe:animate-pulse"
                      aria-hidden
                    />
                    <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-card to-muted/40 shadow-md ring-1 ring-white/5">
                      <DiscIcon className="size-9 text-primary/75" weight="duotone" />
                    </div>
                  </div>
                  <Spinner className="size-7 text-primary" aria-label="Loading songs" />
                  <p className="max-w-xs text-center text-sm font-medium leading-relaxed text-muted-foreground">
                    Loading your library…
                  </p>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </table>
      </div>
    </div>
  );
}

type LibrarySongsVirtualListProps = {
  variant: 'mobile' | 'desktop';
  tracks: ZodTrack[];
  playbackTracks: PlaybackTrack[];
  playTrack: (track: PlaybackTrack, remainder?: PlaybackTrack[]) => void;
  addToQueue: (track: PlaybackTrack) => void;
  playNext: (track: PlaybackTrack) => void;
  onEditTrack: (track: ZodTrack) => void;
  onRequestDeleteTrack: (track: { id: string; title: string }) => void;
  currentTrack: PlaybackTrack | null;
  isPlaying: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  sortState: LibrarySongsSortState;
  onSortColumn: (column: LibraryTrackListSortBy) => void;
};

function LibrarySongsVirtualList({
  variant,
  tracks,
  playbackTracks,
  playTrack,
  addToQueue,
  playNext,
  onEditTrack,
  onRequestDeleteTrack,
  currentTrack,
  isPlaying,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  sortState,
  onSortColumn,
}: LibrarySongsVirtualListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const estimateSize = variant === 'mobile' ? MOBILE_ROW_ESTIMATE : DESKTOP_ROW_ESTIMATE;

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: 12,
    /** ~1¼ row of space after the last song when scrolled to the end. */
    paddingEnd: Math.round(estimateSize * 1.25),
  });

  const lastVisibleIndex = virtualizer.getVirtualItems().at(-1)?.index ?? 0;

  useEffect(() => {
    if (
      tracks.length > 0 &&
      lastVisibleIndex >= tracks.length - FETCH_THRESHOLD &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [tracks.length, lastVisibleIndex, hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** Flush to layout bottom; player floats above. Safe area only on notched phones. */
  const scrollBottomPadClass = 'pb-0 max-md:pb-[env(safe-area-inset-bottom,0px)]';

  const mobileScrollClass = cn(
    'min-h-0 flex-1 overflow-y-auto custom-scrollbar',
    'max-h-[min(560px,calc(100dvh-12rem))]',
    scrollBottomPadClass,
  );

  const desktopScrollClass = cn(
    'min-h-0 flex-1 overflow-y-auto overflow-x-auto custom-scrollbar',
    scrollBottomPadClass,
  );

  if (variant === 'mobile') {
    return (
      <div ref={scrollRef} className={mobileScrollClass}>
        <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const track = tracks[virtualRow.index];
            if (!track) return null;
            const { isProcessing, isFailed, isDisabled } = getTrackPlayability(track);
            const coverUrl = track.album?.cover?.url;
            const active = currentTrack?.id === track.id && isPlaying;

            return (
              <div
                key={track.id}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={isDisabled}
                      aria-disabled={isDisabled}
                      aria-label={`Play ${track.title} by ${artistLine(track)}`}
                      onClick={() => playTrack(zodTrackToPlaybackTrack(track), playbackTracks)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        isDisabled
                          ? 'cursor-not-allowed opacity-60'
                          : 'cursor-pointer hover:bg-stone-900/40 active:scale-[0.99]',
                        active ? 'bg-white/10' : '',
                      )}
                    >
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
                        {coverUrl ? (
                          <img src={coverUrl} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-stone-800">
                            <DiscIcon className="size-7 text-stone-400" weight="duotone" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isProcessing ? (
                            <Spinner className="size-4 shrink-0" aria-label="Processing" />
                          ) : isFailed ? (
                            <WarningIcon
                              className="size-4 shrink-0 text-amber-500"
                              weight="fill"
                              aria-label="Processing failed"
                            />
                          ) : null}
                          <span className="line-clamp-2 font-semibold text-foreground">{track.title}</span>
                        </div>
                        <div className="line-clamp-2 text-sm text-muted-foreground">
                          {track.artists && track.artists.length > 0 ? (
                            track.artists.map((artist, i) => (
                              <span key={artist.id} className="inline">
                                {i > 0 && <span className="text-muted-foreground/80"> · </span>}
                                <Link
                                  to="/app/library/artists/$id"
                                  params={{ id: artist.id }}
                                  className="text-primary underline-offset-4 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {artist.name}
                                </Link>
                              </span>
                            ))
                          ) : (
                            <span>{UNKNOWN_ARTIST_LABEL}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </ContextMenuTrigger>
                  <LibrarySongContextMenuContent
                    track={track}
                    isDisabled={isDisabled}
                    onEdit={onEditTrack}
                    onPlayNext={() => playNext(zodTrackToPlaybackTrack(track))}
                    onAddToQueue={() => addToQueue(zodTrackToPlaybackTrack(track))}
                    onDelete={onRequestDeleteTrack}
                  />
                </ContextMenu>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className={desktopScrollClass}>
      <div className="relative min-w-0">
        <table className="w-full min-w-[44rem] table-fixed border-separate border-spacing-0 caption-bottom text-sm">
          <LibrarySongsDesktopTableChrome sortState={sortState} onSortColumn={onSortColumn} />
          <TableBody>
            <TableRow
              aria-hidden
              className="pointer-events-none border-0 hover:bg-transparent [&>td]:border-0"
            >
              <TableCell colSpan={COL_COUNT} className={cn('border-0 p-0', DESKTOP_HEADER_BODY_GAP_CLASS)} />
            </TableRow>
            {virtualizer.getVirtualItems().length > 0 &&
            virtualizer.getVirtualItems()[0]!.start > 0 ? (
              <TableRow className="border-b-0 hover:bg-transparent [&>td]:border-0">
                <TableCell
                  colSpan={COL_COUNT}
                  className="p-0"
                  style={{ height: `${virtualizer.getVirtualItems()[0]!.start}px` }}
                />
              </TableRow>
            ) : null}
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const track = tracks[virtualRow.index];
              if (!track) return null;
              const { isProcessing, isFailed, isDisabled } = getTrackPlayability(track);
              const coverUrl = track.album?.cover?.url;
              const active = currentTrack?.id === track.id && isPlaying;
              const albumName = track.album?.name?.trim() || '—';

              return (
                <ContextMenu key={track.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      className={cn(
                        songsTableDataRowClass,
                        'cursor-pointer',
                        active && songsTablePlaybackRowShadowClass,
                        !isDisabled &&
                          !active &&
                          'hover:shadow-[inset_0_0_0_100vmax_rgb(41_37_36/0.25)] active:shadow-[inset_0_0_0_100vmax_rgb(41_37_36/0.35)]',
                        isDisabled && 'cursor-not-allowed opacity-60',
                      )}
                      aria-disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        playTrack(zodTrackToPlaybackTrack(track), playbackTracks);
                      }}
                    >
                      <TableCell className="px-3 py-2 align-middle">
                        <div className="relative mx-auto size-10 shrink-0 overflow-hidden rounded ring-1 ring-white/10">
                          {coverUrl ? (
                            <img src={coverUrl} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center bg-stone-800">
                              <DiscIcon className="size-5 text-stone-400" weight="duotone" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="overflow-hidden px-3 py-2 align-middle">
                        <div className="flex min-w-0 items-center gap-2">
                          {isProcessing ? (
                            <Spinner className="size-4 shrink-0" aria-label="Processing" />
                          ) : isFailed ? (
                            <WarningIcon
                              className="size-4 shrink-0 text-amber-500"
                              weight="fill"
                              aria-label="Processing failed"
                            />
                          ) : null}
                          <span className="min-w-0 truncate font-medium">{track.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="overflow-hidden px-3 py-2 align-middle whitespace-normal">
                        <div className="line-clamp-2 text-muted-foreground">
                          {track.artists && track.artists.length > 0 ? (
                            track.artists.map((artist, i) => (
                              <span key={artist.id} className="inline">
                                {i > 0 && <span className="text-muted-foreground/80"> · </span>}
                                <Link
                                  to="/app/library/artists/$id"
                                  params={{ id: artist.id }}
                                  className="text-primary underline-offset-4 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {artist.name}
                                </Link>
                              </span>
                            ))
                          ) : (
                            <span>{UNKNOWN_ARTIST_LABEL}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="overflow-hidden px-3 py-2 align-middle">
                        <Link
                          to="/app/library/albums/$id"
                          params={{ id: track.albumId }}
                          className="block truncate text-primary underline-offset-4 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {albumName}
                        </Link>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {track.diskNumber && track.diskNumber > 1
                          ? `${track.diskNumber}-${track.trackNumber}`
                          : track.trackNumber}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                        {formatDuration(track.duration)}
                      </TableCell>
                    </TableRow>
                  </ContextMenuTrigger>
                  <LibrarySongContextMenuContent
                    track={track}
                    isDisabled={isDisabled}
                    onEdit={onEditTrack}
                    onPlayNext={() => playNext(zodTrackToPlaybackTrack(track))}
                    onAddToQueue={() => addToQueue(zodTrackToPlaybackTrack(track))}
                    onDelete={onRequestDeleteTrack}
                  />
                </ContextMenu>
              );
            })}
            {(() => {
              const items = virtualizer.getVirtualItems();
              const last = items.at(-1);
              if (!last) return null;
              const pad = virtualizer.getTotalSize() - (last.start + last.size);
              if (pad <= 0) return null;
              return (
                <TableRow className="border-b-0 hover:bg-transparent [&>td]:border-0">
                  <TableCell colSpan={COL_COUNT} className="p-0" style={{ height: `${pad}px` }} />
                </TableRow>
              );
            })()}
          </TableBody>
        </table>
      </div>
    </div>
  );
}

function LibrarySongsPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [sortState, setSortState] = useState<LibrarySongsSortState>(null);

  const handleSortColumn = useCallback((column: LibraryTrackListSortBy) => {
    setSortState((prev) => {
      if (!prev || prev.sortBy !== column) return { sortBy: column, sortOrder: 'asc' };
      if (prev.sortOrder === 'asc') return { sortBy: column, sortOrder: 'desc' };
      return null;
    });
  }, []);

  const tracksQuery = useLibraryTracksInfinite({
    limit: PAGE_SIZE,
    ...(sortState ? { sortBy: sortState.sortBy, sortOrder: sortState.sortOrder } : {}),
  });
  const { playTrack, addToQueue, playNext, currentTrack, isPlaying } = usePlayerStore();
  const { mutateAsync: deleteTrack, isPending: isDeletingTrack } = useDeleteLibraryTrack();

  const rawTracks = useMemo<ZodTrack[]>(() => {
    const pages = tracksQuery.data?.pages;
    if (!pages?.length) return [];
    return pages.flatMap((page) => page.data?.items ?? []);
  }, [tracksQuery.data]);

  const tracks = useMemo(() => {
    if (sortState) return rawTracks;
    return sortLibraryTracksForDisplay(rawTracks);
  }, [rawTracks, sortState]);

  const playbackTracks = useMemo(() => tracks.map(zodTrackToPlaybackTrack), [tracks]);

  const totalFromFirstPage = tracksQuery.data?.pages[0]?.data?.total;
  const lastKnownTotalRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (typeof totalFromFirstPage === 'number') {
      lastKnownTotalRef.current = totalFromFirstPage;
    }
  }, [totalFromFirstPage]);

  const displayTotal =
    typeof totalFromFirstPage === 'number' ? totalFromFirstPage : lastKnownTotalRef.current;

  const countsSubtitle = useMemo(() => {
    if (displayTotal == null) return undefined;
    return `${displayTotal} ${displayTotal === 1 ? 'song' : 'songs'}`;
  }, [displayTotal]);

  const hasNextPage = tracksQuery.hasNextPage === true;
  const isInitialLoad = tracksQuery.isPending && tracksQuery.data === undefined;
  const isError = tracksQuery.isError;

  const handleDeleteTrack = async () => {
    if (!trackToDelete) return;
    try {
      await deleteTrack(trackToDelete.id);
      setTrackToDelete(null);
      toast.success('Track deleted successfully');
    } catch (error) {
      console.error('Failed to delete track:', error);
      toast.error('Failed to delete track');
    }
  };

  const handleEditTrack = (track: ZodTrack) => {
    navigate({
      to: '/app/library/albums/$id/songs/$songId/edit',
      params: { id: track.albumId, songId: track.id },
    });
  };

  const deleteTrackDialog = (
    <Dialog open={!!trackToDelete} onOpenChange={(open) => !open && setTrackToDelete(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Track</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">{trackToDelete?.title}</span>? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setTrackToDelete(null)} disabled={isDeletingTrack}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteTrack} disabled={isDeletingTrack}>
            {isDeletingTrack ? 'Deleting...' : 'Delete Track'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const paddedShellClass =
    'flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-0 max-md:pb-[env(safe-area-inset-bottom,0px)]';

  /** Loaded list: no bottom shell padding so the list meets the viewport edge (player overlays). */
  const songsLoadedShellClass =
    'flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden px-4 pt-4 pb-0 max-md:pb-[env(safe-area-inset-bottom,0px)]';

  if (isError) {
    return (
      <div className={paddedShellClass}>
        <PageHeader title="Songs" />
        <p className="text-sm text-destructive">Could not load songs. Try again later.</p>
      </div>
    );
  }

  if (isInitialLoad) {
    if (isMobile) {
      return (
        <>
          <div className={paddedShellClass}>
            <PageHeader title="Songs" description={countsSubtitle} />
            <div className="flex min-h-[min(360px,52dvh)] flex-1 flex-col items-center justify-center gap-5 rounded-2xl border border-border/30 bg-gradient-to-b from-card/90 via-card/50 to-muted/15 px-6 py-16 shadow-sm ring-1 ring-white/[0.04] dark:ring-white/[0.06]">
              <div className="flex size-[4.5rem] items-center justify-center rounded-2xl border border-border/35 bg-background/70 shadow-inner">
                <DiscIcon className="size-10 text-muted-foreground/85" weight="duotone" />
              </div>
              <Spinner className="size-8 text-primary" aria-label="Loading songs" />
              <p className="max-w-[16rem] text-center text-sm font-medium leading-relaxed text-muted-foreground">
                Gathering your tracks…
              </p>
            </div>
          </div>
          {deleteTrackDialog}
        </>
      );
    }

    return (
      <>
        <div className={songsLoadedShellClass}>
          <PageHeader title="Songs" description={countsSubtitle} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <LibrarySongsDesktopInitialLoadShell
              sortState={sortState}
              onSortColumn={handleSortColumn}
            />
          </div>
        </div>
        {deleteTrackDialog}
      </>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className={paddedShellClass}>
        <PageHeader title="Songs" description={countsSubtitle} />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/40 bg-stone-900/10 py-16">
          <p className="text-sm font-medium text-muted-foreground">No songs in your library.</p>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <>
        <div className={songsLoadedShellClass}>
          <PageHeader title="Songs" description={countsSubtitle} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <LibrarySongsVirtualList
              key="mobile"
              variant="mobile"
              tracks={tracks}
              playbackTracks={playbackTracks}
              playTrack={playTrack}
              addToQueue={addToQueue}
              playNext={playNext}
              onEditTrack={handleEditTrack}
              onRequestDeleteTrack={setTrackToDelete}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              hasNextPage={hasNextPage}
              isFetchingNextPage={tracksQuery.isFetchingNextPage}
              fetchNextPage={tracksQuery.fetchNextPage}
              sortState={sortState}
              onSortColumn={handleSortColumn}
            />
          </div>
        </div>
        {deleteTrackDialog}
      </>
    );
  }

  return (
    <>
      <div className={songsLoadedShellClass}>
        <PageHeader title="Songs" description={countsSubtitle} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <LibrarySongsVirtualList
            key="desktop"
            variant="desktop"
            tracks={tracks}
            playbackTracks={playbackTracks}
            playTrack={playTrack}
            addToQueue={addToQueue}
            playNext={playNext}
            onEditTrack={handleEditTrack}
            onRequestDeleteTrack={setTrackToDelete}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            hasNextPage={hasNextPage}
            isFetchingNextPage={tracksQuery.isFetchingNextPage}
            fetchNextPage={tracksQuery.fetchNextPage}
            sortState={sortState}
            onSortColumn={handleSortColumn}
          />
        </div>
      </div>
      {deleteTrackDialog}
    </>
  );
}
