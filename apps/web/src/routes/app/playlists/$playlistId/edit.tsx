import { PlaylistFormCover } from '@/components/playlists/PlaylistFormCover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeleteLibraryPlaylistCover,
  useUpdateLibraryPlaylist,
  useUploadLibraryPlaylistCover,
} from '@/hooks/api/library-playlists/useLibraryPlaylistMutations';
import { useLibraryPlaylistDetail } from '@/hooks/api/library-playlists/useLibraryPlaylistDetail';
import { PlaylistSystemRole } from '@repo/db';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/playlists/$playlistId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { playlistId } = Route.useParams();
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useLibraryPlaylistDetail(playlistId, { page: 1, limit: 1 });
  const detail = data?.data;

  const [name, setName] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);

  const { mutateAsync: updatePlaylist, isPending: isUpdating } = useUpdateLibraryPlaylist();
  const { mutateAsync: uploadCover, isPending: isUploading } = useUploadLibraryPlaylistCover();
  const { mutateAsync: deleteCover, isPending: isDeletingCover } = useDeleteLibraryPlaylistCover();

  useEffect(() => {
    if (!coverFile) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  useEffect(() => {
    if (detail?.name) setName(detail.name);
  }, [detail?.name]);

  useEffect(() => {
    if (!detail) return;
    if (detail.systemRole === PlaylistSystemRole.favorites) {
      toast.error('You cannot edit the favorites playlist');
      void navigate({ to: '/app/playlists/$playlistId', params: { playlistId } });
    }
  }, [detail, navigate, playlistId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || detail.systemRole === PlaylistSystemRole.favorites) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter a playlist name');
      return;
    }
    try {
      let changed = false;
      if (trimmed !== detail.name) {
        await updatePlaylist({ playlistId, body: { name: trimmed } });
        changed = true;
      }
      if (removeCover) {
        await deleteCover(playlistId);
        changed = true;
      } else if (coverFile) {
        await uploadCover({ playlistId, file: coverFile });
        changed = true;
      }
      if (changed) {
        toast.success('Playlist updated');
      }
      await navigate({ to: '/app/playlists/$playlistId', params: { playlistId } });
    } catch (err) {
      console.error(err);
      toast.error('Could not update playlist');
    }
  };

  const busy = isUpdating || isUploading || isDeletingCover;

  const clearNewCoverSelection = () => {
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  if (isLoading || !detail) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 px-3 py-16 text-muted-foreground sm:px-4">
        <Spinner className="size-7" />
        <p className="text-sm">Loading playlist…</p>
      </div>
    );
  }

  if (detail.systemRole === PlaylistSystemRole.favorites) {
    return null;
  }

  const existingCoverUrl =
    detail.cover?.url != null && detail.cover.url !== '' ? detail.cover.url : null;
  const hasSavedCover = Boolean(existingCoverUrl);
  const displayUrl = filePreviewUrl ?? (!removeCover ? existingCoverUrl : null);
  const removalPending = removeCover && hasSavedCover;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto flex w-full max-w-md flex-col gap-7 px-3 pb-6 pt-1 sm:px-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="playlist-edit-name">Name</Label>
        <Input
          id="playlist-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My playlist"
          className="h-11 text-base"
        />
      </div>

      <PlaylistFormCover
        id="playlist-edit-cover"
        coverInputRef={coverInputRef}
        disabled={busy}
        displayUrl={displayUrl}
        hasSavedCover={hasSavedCover}
        removalPending={removalPending}
        hasNewFile={Boolean(coverFile)}
        onPickFiles={(f) => {
          setCoverFile(f);
          if (f) setRemoveCover(false);
        }}
        onDiscardNewFile={clearNewCoverSelection}
        onScheduleRemoveSavedCover={() => {
          setRemoveCover(true);
          clearNewCoverSelection();
        }}
        onUndoRemoval={() => setRemoveCover(false)}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() =>
            void navigate({ to: '/app/playlists/$playlistId', params: { playlistId } })
          }
          className="w-full sm:w-auto sm:min-w-[6.5rem]"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:min-w-[9rem]">
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}
