import { FavoritesPlaylistCover } from '@/components/playlists/FavoritesPlaylistCover';
import { SongCard } from '@/components/library/SongCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeleteLibraryPlaylist,
  useLibraryPlaylistDetail,
  useLibraryPlaylistPins,
  usePinPlaylist,
  useSortPlaylistTracks,
  useUnpinPlaylist,
} from '@/hooks/api/library-playlists';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { usePlayerStore } from '@/stores/player-store/player.store';
import type { SortPlaylistTracksRequest } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import {
  ArrowsDownUpIcon,
  DotsThreeIcon,
  PencilIcon,
  PlaylistIcon,
  PlayIcon,
  PushPinIcon,
  PushPinSlashIcon,
  ShareIcon,
  ShuffleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/playlists/$playlistId/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { playlistId } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSortConfirmOpen, setIsSortConfirmOpen] = useState(false);
  const [pendingSort, setPendingSort] = useState<SortPlaylistTracksRequest['sort'] | null>(null);
  const { data, isLoading } = useLibraryPlaylistDetail(playlistId, { page: 1, limit: 200 });
  const { mutateAsync: deletePlaylist, isPending: isDeleting } = useDeleteLibraryPlaylist();
  const { mutateAsync: sortPlaylistTracks, isPending: isSorting } = useSortPlaylistTracks();
  const { mutateAsync: pinPlaylist, isPending: isPinning } = usePinPlaylist();
  const { mutateAsync: unpinPlaylist, isPending: isUnpinning } = useUnpinPlaylist();
  const { data: pinsResponse } = useLibraryPlaylistPins();
  const { playTrack, addToQueue, playNext } = usePlayerStore();

  const detail = data?.data;
  const rows = detail?.tracks ?? [];
  const tracks = rows.map((r) => r.track);

  const pins = pinsResponse?.data ?? [];
  const currentPin = pins.find((pin) => pin.playlist.id === playlistId);
  const isPinned = !!currentPin;

  const handleDelete = async () => {
    if (detail?.systemRole === PlaylistSystemRole.favorites) return;
    try {
      await deletePlaylist(playlistId);
      setIsDeleteDialogOpen(false);
      toast.success('Playlist deleted');
      await navigate({ to: '/app/playlists' });
    } catch (e) {
      console.error(e);
      toast.error('Could not delete playlist');
    }
  };

  const handleSortDialogOpenChange = (open: boolean) => {
    setIsSortConfirmOpen(open);
    if (!open) {
      setPendingSort(null);
    }
  };

  const openSortConfirm = (sort: SortPlaylistTracksRequest['sort']) => {
    setPendingSort(sort);
    setIsSortConfirmOpen(true);
  };

  const handleConfirmSort = async () => {
    if (!pendingSort) return;
    try {
      await sortPlaylistTracks({ playlistId, body: { sort: pendingSort } });
      toast.success('Playlist order updated');
      setIsSortConfirmOpen(false);
      setPendingSort(null);
    } catch (e) {
      console.error(e);
      toast.error('Could not update playlist order');
    }
  };

  const playableTracks = tracks.filter(
    (t) => !t.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing'),
  );

  const handlePin = async () => {
    if (isPinned && currentPin) {
      try {
        await unpinPlaylist(currentPin.id);
        toast.success('Unpinned from sidebar');
      } catch {
        toast.error('Could not unpin playlist');
      }
    } else {
      try {
        await pinPlaylist({ playlistId });
        toast.success('Pinned to sidebar');
      } catch {
        toast.error('Could not pin playlist');
      }
    }
  };

  if (isLoading || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground animate-pulse">Loading playlist…</p>
      </div>
    );
  }

  const coverUrl =
    detail.cover?.url != null && detail.cover.url !== '' ? detail.cover.url : undefined;
  const showBlurGlow = Boolean(coverUrl);

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      <div className="relative w-full px-4 sm:px-6 mt-6 sm:mt-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          <div className="relative shrink-0">
            {showBlurGlow && (
              <img
                src={coverUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-36 sm:size-56 rounded-2xl object-cover blur-lg opacity-35 scale-100 translate-y-4 saturate-150 pointer-events-none"
              />
            )}
            <div className="relative size-36 sm:size-56 p-0 rounded-lg shadow-xl shrink-0 overflow-hidden bg-stone-800 flex items-center justify-center border border-white/10">
              {detail.systemRole === PlaylistSystemRole.favorites ? (
                <FavoritesPlaylistCover />
              ) : coverUrl ? (
                <img src={coverUrl} alt={detail.name} className="size-full object-cover" />
              ) : (
                <PlaylistIcon className="size-1/2 text-stone-400" weight="duotone" />
              )}
            </div>
          </div>

          <div className="flex-1 pb-2 text-center md:text-left">
            <div className="mb-1 flex flex-wrap items-center justify-center md:justify-start gap-x-2 text-[10px] sm:text-xs font-semibold">
              <span className="text-primary tracking-widest uppercase">Playlist</span>
              <span className="text-stone-500" aria-hidden="true">
                -
              </span>
              <span className="text-muted-foreground">
                {detail.totalTracks} {detail.totalTracks === 1 ? 'song' : 'songs'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white opacity-90 truncate max-w-2xl mb-1">
              {detail.name}
            </h2>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 mt-8 sm:mt-12 flex flex-col gap-6 sm:gap-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            size="lg"
            className="h-10 sm:h-12 rounded-lg gap-1.5 sm:gap-2 px-5 sm:px-8 text-sm sm:text-base font-bold shadow-md hover:shadow-primary/20 active:shadow-primary/35 active:scale-98 transition-all bg-primary text-primary-foreground"
            disabled={playableTracks.length === 0}
            onClick={() => {
              const mapped = playableTracks.map((t) => zodTrackToPlaybackTrack(t));
              const first = mapped[0];
              if (first) playTrack(first, mapped);
            }}
          >
            <PlayIcon weight="fill" size={18} className="sm:size-5" /> Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-10 sm:h-12 rounded-lg gap-1.5 sm:gap-2 px-5 sm:px-8 text-sm sm:text-base font-bold border-border bg-stone-900/20 backdrop-blur-md hover:bg-stone-800/40 active:scale-98 transition-all"
            disabled={playableTracks.length === 0}
            onClick={() => {
              const shuffled = [...playableTracks].sort(() => Math.random() - 0.5);
              const mapped = shuffled.map((t) => zodTrackToPlaybackTrack(t));
              const first = mapped[0];
              if (first) playTrack(first, mapped);
            }}
          >
            <ShuffleIcon weight="bold" size={18} className="sm:size-5" /> Shuffle
          </Button>

          <div className="flex items-center gap-0.5 sm:gap-1 ml-auto md:ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex size-9 sm:size-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-98 transition-all"
              aria-label={isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
              disabled={isPinning || isUnpinning}
              onClick={() => void handlePin()}
            >
              {isPinned ? (
                <PushPinIcon size={20} className="sm:size-5" weight="fill" />
              ) : (
                <PushPinSlashIcon size={20} className="sm:size-5" />
              )}
            </Button>
            {detail.systemRole !== PlaylistSystemRole.favorites ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 sm:size-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-98 transition-all"
                  >
                    <DotsThreeIcon size={20} className="sm:size-6" weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem className="gap-2">
                    <ShareIcon size={18} /> Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="gap-2" disabled={detail.totalTracks < 2}>
                      <ArrowsDownUpIcon size={18} /> Reorder
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="w-52">
                        <DropdownMenuItem onClick={() => openSortConfirm('addedAt_asc')}>
                          Added first
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openSortConfirm('addedAt_desc')}>
                          Added last
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <Link to="/app/playlists/$playlistId/edit" params={{ playlistId: detail.id }}>
                    <DropdownMenuItem className="gap-2">
                      <PencilIcon size={18} /> Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    <TrashIcon size={18} /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="flex flex-col gap-6 px-0 md:px-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white/90">Tracks</h3>
          </div>

          {tracks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl bg-stone-900/10">
              <p className="text-muted-foreground text-sm font-medium">
                No tracks in this playlist yet.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-[3rem_1fr_auto] gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 mb-2">
                <div className="text-center">#</div>
                <div>Title</div>
                <div className="pr-2">Time</div>
              </div>
              <div className="flex flex-col">
                {rows.map((row, i) => {
                  const track = row.track;
                  const isProcessing =
                    track.audioFiles?.some(
                      (f) => f.status === 'pending' || f.status === 'processing',
                    ) ?? false;
                  const isFailed =
                    (track.audioFiles?.length ?? 0) > 0 &&
                    track.audioFiles?.every((f) => f.status === 'failed') === true;
                  const trackArtworkUrl =
                    track.album?.cover?.url != null && track.album.cover.url !== ''
                      ? track.album.cover.url
                      : undefined;
                  return (
                    <SongCard
                      key={`${track.id}-${i}`}
                      id={track.id}
                      trackNumber={i + 1}
                      title={track.title}
                      artists={track.artists}
                      duration={track.duration}
                      explicit={track.explicit}
                      isProcessing={isProcessing}
                      isFailed={isFailed}
                      artworkUrl={trackArtworkUrl}
                      onClick={() =>
                        playTrack(
                          zodTrackToPlaybackTrack(track),
                          playableTracks.map((t) => zodTrackToPlaybackTrack(t)),
                        )
                      }
                      onAddToQueue={() => addToQueue(zodTrackToPlaybackTrack(track))}
                      onPlayNext={() => playNext(zodTrackToPlaybackTrack(track))}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {detail.systemRole !== PlaylistSystemRole.favorites ? (
        <>
          <AlertDialog open={isSortConfirmOpen} onOpenChange={handleSortDialogOpenChange}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Change track order?</AlertDialogTitle>
                <AlertDialogDescription>
                  Sorting will permanently change the track order in this playlist. Your current
                  manual order cannot be restored automatically. Continue?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSorting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={isSorting}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleConfirmSort();
                  }}
                >
                  {isSorting ? 'Updating…' : 'Continue'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove{' '}
                  <span className="font-medium text-foreground">{detail.name}</span> from your
                  library. Tracks stay in your library.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={isDeleting}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleDelete();
                  }}
                >
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
