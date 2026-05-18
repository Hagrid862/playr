import { FavoritesPlaylistCover } from '@/components/playlists/FavoritesPlaylistCover';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  useDeleteLibraryPlaylist,
  usePinPlaylist,
  useUnpinPlaylist,
} from '@/hooks/api/library-playlists/useLibraryPlaylistMutations';
import { cn } from '@/lib/utils';
import type { LibraryPlaylistListItem } from '@repo/contracts';
import { PlaylistSystemRole } from '@repo/db';
import {
  PencilSimpleIcon,
  PlaylistIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

export function PlaylistLibraryCard({ playlist }: { playlist: LibraryPlaylistListItem }) {
  const navigate = useNavigate();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { mutateAsync: pinPlaylist, isPending: isPinning } = usePinPlaylist();
  const { mutateAsync: unpinPlaylist, isPending: isUnpinning } = useUnpinPlaylist();
  const { mutateAsync: deletePlaylist, isPending: isDeleting } = useDeleteLibraryPlaylist();

  const isFavorites = playlist.systemRole === PlaylistSystemRole.favorites;
  const coverUrl = playlist.cover?.url ?? undefined;

  const handlePin = async () => {
    try {
      await pinPlaylist({ playlistId: playlist.id });
      toast.success('Pinned to sidebar');
    } catch {
      toast.error('Could not pin playlist');
    }
  };

  const handleUnpin = async () => {
    if (!playlist.pinId) return;
    try {
      await unpinPlaylist(playlist.pinId);
      toast.success('Unpinned from sidebar');
    } catch {
      toast.error('Could not unpin playlist');
    }
  };

  const handleDelete = async () => {
    try {
      await deletePlaylist(playlist.id);
      setConfirmDeleteOpen(false);
      toast.success('Playlist deleted');
    } catch {
      toast.error('Could not delete playlist');
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'group/playlist relative rounded-lg p-2 transition-all duration-150',
              'hover:bg-stone-800/30 hover:scale-[1.02] active:scale-100 active:bg-stone-800/45',
            )}
          >
            <Link
              to="/app/playlists/$playlistId"
              params={{ playlistId: playlist.id }}
              className="block cursor-pointer"
            >
              <div className="aspect-square w-full overflow-hidden rounded bg-stone-800">
                {isFavorites ? (
                  <FavoritesPlaylistCover />
                ) : coverUrl ? (
                  <img src={coverUrl} alt={playlist.name} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <PlaylistIcon className="size-1/2 text-stone-400" weight="duotone" />
                  </div>
                )}
              </div>
              <div className="pt-4">
                <h3 className="line-clamp-1 text-sm font-semibold">{playlist.name}</h3>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {playlist.trackCount} {playlist.trackCount === 1 ? 'song' : 'songs'}
                </p>
              </div>
            </Link>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {!playlist.pinned ? (
            <ContextMenuItem
              className="gap-2"
              disabled={isPinning}
              onSelect={(e) => {
                e.preventDefault();
                void handlePin();
              }}
            >
              <PushPinIcon size={18} /> Pin to sidebar
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              className="gap-2"
              disabled={isUnpinning || !playlist.pinId}
              onSelect={(e) => {
                e.preventDefault();
                void handleUnpin();
              }}
            >
              <PushPinSlashIcon size={18} /> Unpin from sidebar
            </ContextMenuItem>
          )}
          {!isFavorites ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  void navigate({
                    to: '/app/playlists/$playlistId/edit',
                    params: { playlistId: playlist.id },
                  });
                }}
              >
                <PencilSimpleIcon size={18} /> Edit playlist
              </ContextMenuItem>
              <ContextMenuItem
                className="gap-2 text-destructive focus:text-destructive"
                disabled={isDeleting}
                onSelect={(e) => {
                  e.preventDefault();
                  setConfirmDeleteOpen(true);
                }}
              >
                <TrashIcon size={18} /> Delete playlist
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>

      {!isFavorites ? (
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete playlist?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove{' '}
                <span className="font-medium text-foreground">{playlist.name}</span> from your
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
    </>
  );
}
