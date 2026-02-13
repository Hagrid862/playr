import { Button } from '@/components/ui/button';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useDeleteLibraryAlbum } from '@/hooks/api/library-albums/useDeleteLibraryAlbum';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import {
  CalendarBlankIcon,
  DiscIcon,
  DotsThreeIcon,
  HeartIcon,
  MusicNotesIcon,
  PencilIcon,
  PlayIcon,
  ShareIcon,
  ShuffleIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/app/library/albums/$id/')({
  component: RouteComponent,
});

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: albumResponse, isLoading } = useLibraryAlbum(id);
  const { mutateAsync: deleteAlbum, isPending: isDeleting } = useDeleteLibraryAlbum();

  const album = albumResponse?.data;

  const handleDelete = async () => {
    try {
      await deleteAlbum(id);
      setIsDeleteDialogOpen(false);
      navigate({ to: '/app/library/albums' });
    } catch (error) {
      console.error('Failed to delete album:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col w-full px-6 mt-6 animate-pulse">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          <div className="size-56 bg-stone-800 rounded-2xl" />
          <div className="flex-1 space-y-4 pb-2">
            <div className="h-4 w-24 bg-stone-800 rounded" />
            <div className="h-10 w-64 bg-stone-800 rounded" />
            <div className="h-4 w-40 bg-stone-800 rounded" />
          </div>
        </div>
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

  const releaseYear = album.releaseDate ? new Date(album.releaseDate).getFullYear() : null;

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      {/* Header Area */}
      <div className="relative w-full px-6 mt-6">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
          {/* Cover Art with Glow Shadow */}
          <div className="relative shrink-0">
            {/* Blurred glow underneath the artwork */}
            {album.cover?.url && (
              <img
                src={album.cover.url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 size-56 rounded-2xl object-cover blur-lg opacity-30 scale-100 translate-y-2 saturate-150 pointer-events-none"
              />
            )}
            {/* Actual cover */}
            <div className="relative size-56 rounded-2xl overflow-hidden bg-stone-800 flex items-center justify-center border border-white/10 ring-1 ring-white/5">
              {album.cover?.url ? (
                <img src={album.cover.url} alt={album.name} className="size-full object-cover" />
              ) : (
                <DiscIcon className="size-1/2 text-stone-600" weight="duotone" />
              )}
            </div>
          </div>

          {/* Album Info */}
          <div className="flex-1 pb-2 min-w-0 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <p className="text-xs font-bold uppercase tracking-widest text-primary/90">
                {album.type || 'Album'}
              </p>
              {releaseYear && (
                <>
                  <span className="text-stone-600">•</span>
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <CalendarBlankIcon /> {releaseYear}
                  </p>
                </>
              )}
            </div>

            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-3 truncate">
              {album.name}
            </h2>

            {album.description && (
              <p className="text-sm text-stone-400 mb-3 line-clamp-2 max-w-lg">
                {album.description}
              </p>
            )}

            <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-stone-300 font-medium flex-wrap">
              {album.artists && album.artists.length > 0 ? (
                album.artists.map((artist, i) => (
                  <span key={artist.id} className="flex items-center">
                    {i > 0 && <span className="mx-1 text-stone-500">,</span>}
                    <Link
                      to="/app/library/artists/$id"
                      params={{ id: artist.id }}
                      className="hover:text-primary hover:underline transition-colors"
                    >
                      {artist.name}
                    </Link>
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">Unknown Artist</span>
              )}

              {album.tracks && album.tracks.length > 0 && (
                <>
                  <span className="text-stone-600">•</span>
                  <span className="text-muted-foreground">
                    {album.tracks.length} {album.tracks.length === 1 ? 'song' : 'songs'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Actions & Content */}
      <div className="px-6 md:px-8 mt-10 flex flex-col gap-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-14 rounded-full gap-2 px-8 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all bg-primary text-primary-foreground"
          >
            <PlayIcon weight="fill" size={24} /> Play
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="h-14 rounded-full gap-2 px-6 text-base font-semibold bg-stone-800/50 hover:bg-stone-800 text-white border border-white/5 backdrop-blur-md transition-all active:scale-95"
          >
            <ShuffleIcon weight="bold" size={24} />
          </Button>

          <div className="flex items-center gap-1 ml-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-12 rounded-full text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-all active:scale-95"
            >
              <HeartIcon size={28} weight="regular" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-12 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                >
                  <DotsThreeIcon size={28} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 p-2" align="start">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <ShareIcon size={18} /> Share Album
                </DropdownMenuItem>
                <Link to="/app/library/albums/$id/edit" params={{ id: album.id }}>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <PencilIcon size={18} /> Edit Details
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                >
                  <TrashIcon size={18} /> Delete Album
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="bg-white/5" />

        {/* Tracks List */}
        <div className="flex flex-col pb-20">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MusicNotesIcon className="text-primary" weight="duotone" />
              Tracks
            </h3>
            <span className="text-sm text-muted-foreground font-medium">
              {album.tracks?.length || 0} songs
            </span>
          </div>

          {!album.tracks || album.tracks.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl bg-stone-900/20">
              <p className="text-muted-foreground font-medium">No tracks available</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header Row */}
              <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/5 mb-2">
                <div className="w-8 text-center">#</div>
                <div>Title</div>
                <div className="pr-2">Time</div>
              </div>

              {/* Tracks */}
              {album.tracks.map((track, i) => (
                <div
                  key={track.id}
                  className="group grid grid-cols-[auto_1fr_auto] gap-4 items-center px-4 py-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer active:bg-white/10"
                >
                  <div className="w-8 text-center text-stone-500 font-medium group-hover:text-white transition-colors">
                    <span className="group-hover:hidden">{track.trackNumber || i + 1}</span>
                    <PlayIcon
                      className="hidden group-hover:block mx-auto text-primary"
                      weight="fill"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium text-stone-200 group-hover:text-white truncate text-base">
                      {track.title}
                    </div>
                    {track.artists && track.artists.length > 0 && (
                      <div className="text-xs text-muted-foreground truncate group-hover:text-stone-400">
                        {track.artists.map((a) => a.name).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-stone-500 font-variant-numeric tabular-nums group-hover:text-stone-300">
                    {formatDuration(track.duration)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Album</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{album.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
    </div>
  );
}
