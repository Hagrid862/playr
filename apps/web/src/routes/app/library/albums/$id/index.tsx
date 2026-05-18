import { SongCard } from '@/components/library/SongCard';
import { AddToPlaylistSubmenu } from '@/components/playlists/AddToPlaylistSubmenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDeleteLibraryAlbum } from '@/hooks/api/library-albums/useDeleteLibraryAlbum';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useDeleteLibraryTrack } from '@/hooks/api/library-tracks/useDeleteLibraryTrack';
import { UNKNOWN_ALBUM_LABEL, UNKNOWN_ARTIST_LABEL } from '@/lib/display-constants';
import {
  albumTypeDisplayName,
  buildGenreMiddleSegment,
  formatAlbumReleaseDateSegment,
  genreNamesFromAlbumGenres,
} from '@/lib/library/albumDetailMeta';
import { zodTrackToPlaybackTrack } from '@/lib/playback/playback-mappers';
import { usePlayerStore } from '@/stores/player-store/player.store';
import { AlbumSystemKind } from '@repo/db';
import {
  DiscIcon,
  DotsThreeIcon,
  HeartIcon,
  PencilIcon,
  PlayIcon,
  ShareIcon,
  ShuffleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/albums/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [keepTracksOnDelete, setKeepTracksOnDelete] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);

  const { data: albumResponse, isLoading } = useLibraryAlbum(id);
  const { mutateAsync: deleteAlbum, isPending: isDeleting } = useDeleteLibraryAlbum();
  const { mutateAsync: deleteTrack, isPending: isDeletingTrack } = useDeleteLibraryTrack();

  const { playTrack, addToQueue, playNext } = usePlayerStore();

  const album = albumResponse?.data;

  const handleDelete = async () => {
    try {
      await deleteAlbum({ id, keepTracks: keepTracksOnDelete });
      setIsDeleteDialogOpen(false);
      setKeepTracksOnDelete(false);
      navigate({ to: '/app/library/albums' });
      toast.success('Album deleted successfully');
    } catch (error) {
      console.error('Failed to delete album:', error);
      toast.error('Failed to delete album');
    }
  };

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

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground animate-pulse">Loading album details...</p>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  const genreNames = genreNamesFromAlbumGenres(album.genres);
  const genreMiddle = buildGenreMiddleSegment(genreNames);
  const dateSegment = formatAlbumReleaseDateSegment(album.releaseDate ?? undefined);
  const typeLabel = albumTypeDisplayName(album.type);

  const genreMiddleEl = genreMiddle.showTooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="cursor-default underline decoration-dotted underline-offset-2"
          aria-label={`Genres: ${genreMiddle.tooltipLines.join(', ')}`}
        >
          {genreMiddle.text}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} className="max-w-xs px-3 pt-2.5 pb-2">
        <div className="flex flex-col gap-1 text-left text-sm">
          {genreMiddle.tooltipLines.map((line, i) => (
            <span key={`${i}-${line}`}>{line}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  ) : (
    <span>{genreMiddle.text}</span>
  );

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      {/* Header Area - No Banner, Restore Blurred Glow */}
      <div className="relative w-full px-6 mt-8">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Cover Art with Blurred Glow Shadow */}
          <div className="relative shrink-0">
            {album.cover?.url && (
              <img
                src={album.cover.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-48 rounded-2xl object-cover blur-lg opacity-35 scale-100 translate-y-4 saturate-150 pointer-events-none"
              />
            )}
            <div className="relative size-48 p-0 rounded-lg shadow-xl shrink-0 overflow-hidden bg-stone-800 flex items-center justify-center border border-white/10">
              {album.cover?.url ? (
                <img src={album.cover.url} alt={album.name} className="size-full object-cover" />
              ) : (
                <DiscIcon className="size-1/2 text-stone-400" weight="duotone" />
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="flex-1 pb-2">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 text-xs font-semibold">
              <span className="text-primary tracking-widest uppercase">{typeLabel}</span>
              <span className="text-stone-500" aria-hidden="true">
                -
              </span>
              <span className="text-muted-foreground">{genreMiddleEl}</span>
              {dateSegment ? (
                <>
                  <span className="text-stone-500" aria-hidden="true">
                    -
                  </span>
                  <span className="text-muted-foreground">{dateSegment}</span>
                </>
              ) : null}
            </div>
            <h2 className="text-3xl font-bold text-white opacity-90 truncate max-w-2xl mb-1">
              {album.name}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-stone-400 font-medium">
              {album.artists && album.artists.length > 0 ? (
                album.artists.map((artist, i) => (
                  <span key={artist.id} className="flex items-center">
                    {i > 0 && <span className="mr-1.5">•</span>}
                    <Link
                      to="/app/library/artists/$id"
                      params={{ id: artist.id }}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {artist.name}
                    </Link>
                  </span>
                ))
              ) : (
                <span className="text-stone-400">{UNKNOWN_ARTIST_LABEL}</span>
              )}
              {album.tracks && album.tracks.length > 0 && (
                <>
                  <span className="mx-1.5">•</span>
                  <span>
                    {album.tracks.length} {album.tracks.length === 1 ? 'song' : 'songs'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions & Content */}
      <div className="px-6 mt-12 flex flex-col gap-8">
        {/* Unified Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-12 rounded-lg gap-2 px-8 text-base font-bold shadow-md hover:shadow-primary/20 active:shadow-primary/35 active:scale-98 transition-all bg-primary text-primary-foreground"
            disabled={
              !album.tracks?.some((t) => t.audioFiles?.some((f) => f.status === 'complete'))
            }
            onClick={() => {
              const allTracks = [...(album.tracks ?? [])]
                .sort((a, b) => {
                  if (a.diskNumber !== b.diskNumber)
                    return (a.diskNumber || 1) - (b.diskNumber || 1);
                  return (a.trackNumber || 0) - (b.trackNumber || 0);
                })
                .filter(
                  (t) =>
                    !t.audioFiles?.some((f) => f.status === 'pending' || f.status === 'processing'),
                )
                .map((t) => ({ ...t, album }));
              const firstPlayable = allTracks[0];
              if (firstPlayable)
                playTrack(
                  zodTrackToPlaybackTrack(firstPlayable),
                  allTracks.map((t) => zodTrackToPlaybackTrack(t)),
                );
            }}
          >
            <PlayIcon weight="fill" size={20} /> Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-lg gap-2 px-8 text-base font-bold border-border bg-stone-900/20 backdrop-blur-md hover:bg-stone-800/40 active:scale-98 transition-all"
          >
            <ShuffleIcon weight="bold" size={20} /> Shuffle
          </Button>

          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-98 transition-all"
            >
              <HeartIcon size={24} />
            </Button>

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
                {album.systemKind === AlbumSystemKind.none ? (
                  <Link to="/app/library/albums/$id/edit" params={{ id: album.id }}>
                    <DropdownMenuItem className="gap-2">
                      <PencilIcon size={18} /> Edit
                    </DropdownMenuItem>
                  </Link>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <TrashIcon size={18} /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Tracks List */}
        <div className="flex flex-col gap-6 px-0 md:px-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white/90">Tracks</h3>
          </div>

          {!album.tracks || album.tracks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl bg-stone-900/10">
              <p className="text-muted-foreground text-sm font-medium">No tracks available</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Header Row */}
              <div className="grid grid-cols-[3rem_1fr_auto] gap-4 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-white/5 mb-2">
                <div className="text-center">#</div>
                <div>Title</div>
                <div className="pr-2">Time</div>
              </div>

              {(() => {
                const tracks = album.tracks || [];
                const discs = [...new Set(tracks.map((t) => t.diskNumber || 1))].sort(
                  (a, b) => a - b,
                );
                const hasMultipleDiscs = discs.length > 1;

                return discs.map((discNumber) => {
                  const discTracks = tracks
                    .filter((t) => (t.diskNumber || 1) === discNumber)
                    .sort((a, b) => (a.trackNumber || 0) - (b.trackNumber || 0));

                  if (discTracks.length === 0) return null;

                  return (
                    <div key={discNumber} className="flex flex-col gap-2">
                      {hasMultipleDiscs && (
                        <div className="flex items-center gap-4 px-4 py-2 mt-4 first:mt-0">
                          <DiscIcon size={20} className="text-primary" weight="duotone" />
                          <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">
                            Disc {discNumber}
                          </h4>
                        </div>
                      )}
                      <div className="flex flex-col">
                        {discTracks.map((track, i) => {
                          const isProcessing =
                            track.audioFiles?.some(
                              (f) => f.status === 'pending' || f.status === 'processing',
                            ) ?? false;
                          const isFailed =
                            (track.audioFiles?.length ?? 0) > 0 &&
                            track.audioFiles?.every((f) => f.status === 'failed') === true;

                          return (
                            <SongCard
                              key={track.id}
                              id={track.id}
                              trackNumber={track.trackNumber || i + 1}
                              title={track.title}
                              artists={track.artists}
                              duration={track.duration}
                              explicit={track.explicit}
                              isProcessing={isProcessing}
                              isFailed={isFailed}
                              onClick={() =>
                                playTrack(
                                  zodTrackToPlaybackTrack(track),
                                  discTracks.map((t) => zodTrackToPlaybackTrack(t)),
                                )
                              }
                              onEdit={(songId) =>
                                navigate({
                                  to: '/app/library/albums/$id/songs/$songId/edit',
                                  params: { id, songId },
                                })
                              }
                              onDelete={(trackInfo) => setTrackToDelete(trackInfo)}
                              onAddToQueue={() => addToQueue(zodTrackToPlaybackTrack(track))}
                              onPlayNext={() => playNext(zodTrackToPlaybackTrack(track))}
                              extraMenu={<AddToPlaylistSubmenu trackId={track.id} />}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) setKeepTracksOnDelete(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Album</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{album.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="keep-tracks"
                checked={keepTracksOnDelete}
                onCheckedChange={(v) => setKeepTracksOnDelete(v === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="keep-tracks" className="cursor-pointer font-medium">
                  Keep tracks
                </Label>
                <p className="text-muted-foreground text-sm">
                  When checked, songs stay in your library and move to{' '}
                  <span className="font-medium text-foreground">{UNKNOWN_ALBUM_LABEL}</span>. When
                  unchecked, the album and its songs are removed.
                </p>
              </div>
            </div>
            {keepTracksOnDelete ? (
              <Alert>
                <AlertDescription className="text-sm">
                  Tracks will be unlinked from this album and grouped under{' '}
                  <span className="font-medium">{UNKNOWN_ALBUM_LABEL}</span> in your library.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <Button
              variant="outline"
              onClick={() => setTrackToDelete(null)}
              disabled={isDeletingTrack}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTrack} disabled={isDeletingTrack}>
              {isDeletingTrack ? 'Deleting...' : 'Delete Track'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
