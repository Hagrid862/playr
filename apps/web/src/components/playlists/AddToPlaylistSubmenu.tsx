import { Button } from '@/components/ui/button';
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { FavoritesPlaylistCover } from '@/components/playlists/FavoritesPlaylistCover';
import {
  useAddPlaylistTrack,
  useCreateLibraryPlaylist,
  useLibraryPlaylists,
} from '@/hooks/api/library-playlists';
import { PlaylistSystemRole } from '@repo/db';
import { ListPlusIcon, PlaylistIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

export function AddToPlaylistSubmenu({ trackId }: { trackId: string }) {
  const { data } = useLibraryPlaylists();
  const items = data?.data?.items ?? [];
  const { mutateAsync: addTrack, isPending: isAdding } = useAddPlaylistTrack();
  const { mutateAsync: createPlaylist, isPending: isCreating } = useCreateLibraryPlaylist();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const handleAdd = async (playlistId: string) => {
    try {
      await addTrack({ playlistId, body: { trackId } });
      toast.success('Added to playlist');
    } catch (e) {
      console.error(e);
      toast.error('Could not add to playlist');
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error('Enter a name');
      return;
    }
    try {
      const res = await createPlaylist({ name });
      const playlistId = res.data.id;
      await addTrack({ playlistId, body: { trackId } });
      setDialogOpen(false);
      setNewName('');
      toast.success('Playlist created and track added');
    } catch (e) {
      console.error(e);
      toast.error('Could not create playlist');
    }
  };

  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger className="gap-2">
          <PlaylistIcon size={16} />
          Add to playlist
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-52">
          {items.map((p) => (
            <ContextMenuItem
              key={p.id}
              className="gap-2"
              disabled={isAdding}
              onClick={() => void handleAdd(p.id)}
            >
              {p.systemRole === PlaylistSystemRole.favorites ? (
                <span className="flex size-6 shrink-0 overflow-hidden rounded">
                  <FavoritesPlaylistCover />
                </span>
              ) : p.cover?.url ? (
                <img src={p.cover.url} alt="" className="size-6 shrink-0 rounded object-cover" />
              ) : (
                <PlaylistIcon className="size-6 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{p.name}</span>
            </ContextMenuItem>
          ))}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="gap-2"
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <ListPlusIcon size={16} />
            New playlist…
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New playlist</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Playlist name"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isCreating || isAdding} onClick={() => void handleCreate()}>
              Create & add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
