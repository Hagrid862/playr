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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeleteLibraryPlaylist,
  useLibraryPlaylistDetail,
} from '@/hooks/api/library-playlists';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { PlaylistSystemRole } from '@repo/db';
import {
  DotsThreeIcon,
  PencilIcon,
  PlaylistIcon,
  PlayIcon,
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
  const { data, isLoading } = useLibraryPlaylistDetail(playlistId, { page: 1, limit: 200 });
  const { mutateAsync: deletePlaylist, isPending: isDeleting } = useDeleteLibraryPlaylist();
  const { playTrack, addToQueue, playNext } = usePlayerStore();

  const detail = data?.data;
  const rows = detail?.tracks ?? [];
  const tracks = rows.map((r) => r.track);

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

  const playableTracks = tracks.filter(
    (t) => !t.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing'),
  );

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
      <div className="relative w-full px-6 mt-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="relative shrink-0">
            {showBlurGlow && (
              <img
                src={coverUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-48 rounded-2xl object-cover blur-lg opacity-35 scale-100 translate-y-4 saturate-150 pointer-events-none"
              />
            )}
            <div className="relative size-48 p-0 rounded-lg shadow-xl shrink-0 overflow-hidden bg-stone-800 flex items-center justify-center border border-white/10">
              {detail.systemRole === PlaylistSystemRole.favorites ? (
                <FavoritesPlaylistCover />
              ) : coverUrl ? (
                <img src={coverUrl} alt={detail.name} className="size-full object-cover" />
              ) : (
                <PlaylistIcon className="size-1/2 text-stone-400" weight="duotone" />
              )}
            </div>
          </div>

          <div className="flex-1 pb-2">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold">
              <span className="text-primary tracking-widest uppercase">Playlist</span>
              <span className="text-stone-500" aria-hidden="true">
                -
              </span>
              <span className="text-muted-foreground">
                {detail.totalTracks} {detail.totalTracks === 1 ? 'song' : 'songs'}
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white opacity-90 truncate max-w-2xl mb-1">
              {detail.name}
            </h2>
          </div>
        </div>
      </div>

      <div className="px-6 mt-12 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-12 rounded-lg gap-2 px-8 text-base font-bold shadow-md hover:shadow-primary/20 active:shadow-primary/35 active:scale-98 transition-all bg-primary text-primary-foreground"
            disabled={playableTracks.length === 0}
            onClick={() => {
              const mapped = playableTracks.map((t) => zodTrackToPlaybackTrack(t));
              const first = mapped[0];
              if (first) playTrack(first, mapped);
            }}
          >
            <PlayIcon weight="fill" size={20} /> Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-lg gap-2 px-8 text-base font-bold border-border bg-stone-900/20 backdrop-blur-md hover:bg-stone-800/40 active:scale-98 transition-all"
            disabled={playableTracks.length === 0}
            onClick={() => {
              const shuffled = [...playableTracks].sort(() => Math.random() - 0.5);
              const mapped = shuffled.map((t) => zodTrackToPlaybackTrack(t));
              const first = mapped[0];
              if (first) playTrack(first, mapped);
            }}
          >
            <ShuffleIcon weight="bold" size={20} /> Shuffle
          </Button>

          {detail.systemRole !== PlaylistSystemRole.favorites ? (
            <div className="flex items-center gap-1 ml-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-98 transition-all"
                  >
                    <DotsThreeIcon size={24} weight="bold" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem className="gap-2">
                    <ShareIcon size={18} /> Share
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
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
            </div>
          ) : null}
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
      ) : null}
    </div>
  );
}
