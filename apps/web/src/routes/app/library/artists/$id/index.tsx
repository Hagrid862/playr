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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useDeleteLibraryArtist } from '@/hooks/api/library-artists/useDeleteLibraryArtist';
import {
  DiscIcon,
  DotsThreeIcon,
  HeartIcon,
  ListBulletsIcon,
  MusicNoteIcon,
  MusicNotesIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  ShuffleIcon,
  TrashIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { AlbumType } from '@repo/db';
import { useLibraryArtistAlbums } from '@/hooks/api/library-artists/useLibraryArtistAlbums';
import { useLibraryArtist } from '@/hooks/api/library-artists/useLibraryArtist';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { MediaCard } from '@/components/library/MediaCard';
import { Spinner } from '@/components/ui/spinner';

export const Route = createFileRoute('/app/library/artists/$id/')({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: artistResponse, isLoading: isArtistLoading } = useLibraryArtist(id);
  const artist = artistResponse?.data?.artist;

  const { mutateAsync: deleteArtist, isPending: isDeleting } = useDeleteLibraryArtist();
  const { data: albumsData, isLoading: isAlbumsLoading } = useLibraryArtistAlbums(
    id,
    1,
    10,
    AlbumType.album,
  );

  const { data: epsData, isLoading: isEpsLoading } = useLibraryArtistAlbums(
    id,
    1,
    10,
    AlbumType.ep,
  );

  const { data: singlesData, isLoading: isSinglesLoading } = useLibraryArtistAlbums(
    id,
    1,
    10,
    AlbumType.single,
  );

  const { data: compilationsData, isLoading: isCompilationsLoading } = useLibraryArtistAlbums(
    id,
    1,
    10,
    AlbumType.compilation,
  );

  const albums = albumsData?.data?.items?.map((item) => item.album) || [];
  const eps = epsData?.data?.items?.map((item) => item.album) || [];
  const singles = singlesData?.data?.items?.map((item) => item.album) || [];
  const compilations = compilationsData?.data?.items?.map((item) => item.album) || [];

  const handleDelete = async () => {
    try {
      await deleteArtist(id);
      setIsDeleteDialogOpen(false);
      navigate({ to: '/app/library/artists' });
    } catch (error) {
      console.error('Failed to delete artist:', error);
    }
  };

  if (isArtistLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground animate-pulse">Loading artist details...</p>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      {/* Banner Area */}
      <div className="relative w-full px-2 mt-4">
        {/* Banner with glass effect or premium stone look */}
        <div className="h-64 w-full bg-stone-900/40 rounded-2xl shadow-sm border border-border/50 overflow-hidden relative group">
          {artist.banner?.url || artist.bannerId ? (
            <img
              src={artist.banner?.url || `/api/images/${artist.bannerId}`}
              alt="Banner"
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
            />
          ) : (
            <div className="size-full bg-linear-to-b from-stone-950 to-neutral-900 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15),transparent_70%)]" />
            </div>
          )}
          <div className="absolute inset-0 bg-linear-to-t from-background/80 to-transparent" />
        </div>

        {/* Avatar & Quick Info */}
        <div className="px-6 -mt-24 flex flex-col md:flex-row items-end gap-6 relative z-10">
          {/* Avatar */}
          <div className="size-44 p-0 rounded-2xl shadow-2xl shadow-black shrink-0 overflow-hidden bg-stone-800 flex items-center justify-center border border-border">
            {artist.avatar?.url || artist.avatarId ? (
              <img
                src={artist.avatar?.url || `/api/images/${artist.avatarId}`}
                alt={artist.name}
                className="size-full object-cover"
              />
            ) : (
              <UserIcon className="size-1/2 text-stone-400" weight="duotone" />
            )}
          </div>

          <div className="flex-1 pb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">
              {artist.isCommunity ? 'Community Artist' : 'Private Artist'}
            </p>
            <h2 className="text-2xl font-bold text-white opacity-90">{artist.name}</h2>
          </div>
        </div>
      </div>

      {/* Actions & Content */}
      <div className="px-2 mt-12 flex flex-col gap-8">
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            size="lg"
            className="h-12 rounded-xl gap-2 px-8 text-base font-bold shadow-md hover:shadow-primary/20 active:shadow-primary/35 active:scale-98 transition-all bg-primary text-primary-foreground"
          >
            <PlayIcon weight="fill" size={20} /> Play
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-xl gap-2 px-8 text-base font-bold border-border bg-stone-900/20 backdrop-blur-md hover:bg-stone-800/40 active:scale-98 transition-all"
          >
            <ShuffleIcon weight="bold" size={20} /> Shuffle
          </Button>
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              aria-label="Add to favorites"
            >
              <HeartIcon size={24} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                  aria-label="More options"
                >
                  <DotsThreeIcon size={24} weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-36">
                <DropdownMenuItem>
                  <ShareIcon size={20} /> Share
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/app/library/artists/$id/add-content" params={{ id }}>
                    <PlusIcon className="mr-2" />
                    Add Content
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/library/artists/$id/edit" params={{ id }}>
                    <PencilIcon className="mr-2" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Albums Section */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white/90">Albums</h3>
            {albums.length > 5 && (
              <Button
                variant="link"
                className="text-muted-foreground hover:text-primary p-0 h-auto"
              >
                Show all
              </Button>
            )}
          </div>

          {isAlbumsLoading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col gap-3">
                  <div className="aspect-square w-full rounded-xl bg-stone-800 animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-stone-800 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-stone-800 animate-pulse" />
                </div>
              ))}
            </div>
          ) : albums.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {albums.map((album) => {
                if (!album) return null;
                return (
                  <MediaCard
                    key={album.id}
                    id={album.id}
                    title={album.name}
                    subtitle={album.releaseDate?.getFullYear().toString() ?? 'Unknown'}
                    coverUrl={album.cover?.url ?? undefined}
                    link={`/app/library/albums/${album.id}`}
                    placeholderIcon={
                      <DiscIcon className="size-1/2 text-stone-400" weight="duotone" />
                    }
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center border border-dashed border-border/40 rounded-2xl bg-stone-900/10">
              <p className="text-muted-foreground text-sm font-medium">No albums yet</p>
              <Button variant="link" asChild className="mt-2 h-auto p-0 text-primary">
                <Link to="/app/library/artists/$id/add-content" params={{ id }}>
                  Add your first album
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* EPs Section */}
        {(isEpsLoading || eps.length > 0) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white/90">EPs</h3>
              {eps.length > 5 && (
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-primary p-0 h-auto"
                >
                  Show all
                </Button>
              )}
            </div>

            {isEpsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="aspect-square w-full rounded-xl bg-stone-800 animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-stone-800 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-stone-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {eps.map((album) => {
                  if (!album) return null;
                  return (
                    <MediaCard
                      key={album.id}
                      id={album.id}
                      title={album.name}
                      subtitle={album.releaseDate?.getFullYear().toString() ?? 'Unknown'}
                      coverUrl={album.cover?.url ?? undefined}
                      link={`/app/library/albums/${album.id}`}
                      placeholderIcon={
                        <MusicNotesIcon className="size-1/2 text-stone-400" weight="duotone" />
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Singles Section */}
        {(isSinglesLoading || singles.length > 0) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white/90">Singles</h3>
              {singles.length > 5 && (
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-primary p-0 h-auto"
                >
                  Show all
                </Button>
              )}
            </div>

            {isSinglesLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="aspect-square w-full rounded-xl bg-stone-800 animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-stone-800 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-stone-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {singles.map((album) => {
                  if (!album) return null;
                  return (
                    <MediaCard
                      key={album.id}
                      id={album.id}
                      title={album.name}
                      subtitle={album.releaseDate?.getFullYear().toString() ?? 'Unknown'}
                      coverUrl={album.cover?.url ?? undefined}
                      link={`/app/library/albums/${album.id}`}
                      placeholderIcon={
                        <MusicNoteIcon className="size-1/2 text-stone-400" weight="duotone" />
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Compilations Section */}
        {(isCompilationsLoading || compilations.length > 0) && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white/90">Compilations</h3>
              {compilations.length > 5 && (
                <Button
                  variant="link"
                  className="text-muted-foreground hover:text-primary p-0 h-auto"
                >
                  Show all
                </Button>
              )}
            </div>

            {isCompilationsLoading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex flex-col gap-3">
                    <div className="aspect-square w-full rounded-xl bg-stone-800 animate-pulse" />
                    <div className="h-4 w-3/4 rounded bg-stone-800 animate-pulse" />
                    <div className="h-3 w-1/2 rounded bg-stone-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {compilations.map((album) => {
                  if (!album) return null;
                  return (
                    <MediaCard
                      key={album.id}
                      id={album.id}
                      title={album.name}
                      subtitle={album.releaseDate?.getFullYear().toString() ?? 'Unknown'}
                      coverUrl={album.cover?.url ?? undefined}
                      link={`/app/library/albums/${album.id}`}
                      placeholderIcon={
                        <ListBulletsIcon className="size-1/2 text-stone-400" weight="duotone" />
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Artist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{artist.name}</span>? This action
              cannot be undone and will remove all associated local data.
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
              {isDeleting ? 'Deleting...' : 'Delete Artist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
