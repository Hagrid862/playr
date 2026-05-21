import { AlbumFavoriteStarGlyph } from '@/components/library/albums/AlbumFavoriteStarGlyph';
import { AddAlbumToPlaylistSubmenu } from '@/components/playlists/AddAlbumToPlaylistSubmenu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ContextMenuItem, ContextMenuSeparator } from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDeleteLibraryAlbum } from '@/hooks/api/library-albums/useDeleteLibraryAlbum';
import { useAlbumLibraryActions } from '@/hooks/useAlbumLibraryActions';
import { UNKNOWN_ALBUM_LABEL } from '@/lib/display-constants';
import type { ZodAlbum } from '@repo/contracts';
import { AlbumSystemKind } from '@repo/db';
import { PencilIcon, ShareIcon, TrashIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';

type AlbumRef = Pick<ZodAlbum, 'id' | 'name' | 'systemKind'>;

export function AlbumLibraryContextMenu({ album }: { album: AlbumRef }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [keepTracksOnDelete, setKeepTracksOnDelete] = useState(false);
  const { mutateAsync: deleteAlbum, isPending: isDeleting } = useDeleteLibraryAlbum();
  const {
    allInFavorites,
    favoritesMembershipPending,
    noLibraryTracks,
    favoritesActionDisabled,
    toggleAlbumFavorites,
    shareAlbum,
  } = useAlbumLibraryActions({
    albumId: album.id,
    albumName: album.name,
  });

  const handleDelete = async () => {
    try {
      await deleteAlbum({ id: album.id, keepTracks: keepTracksOnDelete });
      setDeleteOpen(false);
      setKeepTracksOnDelete(false);
      toast.success('Album deleted successfully');
    } catch (error) {
      console.error('Failed to delete album:', error);
      toast.error('Failed to delete album');
    }
  };

  return (
    <>
      <ContextMenuItem
        className="gap-2"
        disabled={favoritesActionDisabled}
        title={
          noLibraryTracks
            ? 'Add songs to this album in your library first'
            : favoritesMembershipPending
              ? 'Checking favorites…'
              : allInFavorites
                ? 'Remove from favorites'
                : 'Add to favorites'
        }
        onClick={() => void toggleAlbumFavorites()}
      >
        <AlbumFavoriteStarGlyph allInFavorites={allInFavorites} menuSize />
        {allInFavorites ? 'Remove from favorites' : 'Add to favorites'}
      </ContextMenuItem>
      <AddAlbumToPlaylistSubmenu albumId={album.id} />
      <ContextMenuSeparator />
      <ContextMenuItem className="gap-2" onClick={() => void shareAlbum()}>
        <ShareIcon size={16} />
        Share
      </ContextMenuItem>
      <ContextMenuSeparator />
      {album.systemKind === AlbumSystemKind.none ? (
        <ContextMenuItem asChild className="gap-2">
          <Link to="/app/library/albums/$id/edit" params={{ id: album.id }}>
            <PencilIcon size={16} />
            Edit
          </Link>
        </ContextMenuItem>
      ) : null}
      <ContextMenuItem
        className="gap-2 text-destructive focus:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <TrashIcon size={16} />
        Delete
      </ContextMenuItem>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
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
                id={`keep-tracks-grid-${album.id}`}
                checked={keepTracksOnDelete}
                onCheckedChange={(v) => setKeepTracksOnDelete(v === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label
                  htmlFor={`keep-tracks-grid-${album.id}`}
                  className="cursor-pointer font-medium"
                >
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
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete Album'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
