import { PlaylistFormCover } from '@/components/playlists/PlaylistFormCover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useCreateLibraryPlaylist,
  useUploadLibraryPlaylistCover,
} from '@/hooks/api/library-playlists/useLibraryPlaylistMutations';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useObjectUrl } from '@/hooks/useObjectUrl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/playlists/create')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const filePreviewUrl = useObjectUrl(coverFile);
  const { mutateAsync: createPlaylist, isPending: isCreating } = useCreateLibraryPlaylist();
  const { mutateAsync: uploadCover, isPending: isUploading } = useUploadLibraryPlaylistCover();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Enter a playlist name');
      return;
    }
    try {
      const res = await createPlaylist({ name: trimmed });
      const id = res.data.id;
      if (coverFile) {
        await uploadCover({ playlistId: id, file: coverFile });
      }
      toast.success('Playlist created');
      await navigate({ to: '/app/playlists/$playlistId', params: { playlistId: id } });
    } catch (err) {
      console.error(err);
      toast.error('Could not create playlist');
    }
  };

  const busy = isCreating || isUploading;

  const clearCoverSelection = () => {
    setCoverFile(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mx-auto flex w-full max-w-md flex-col gap-7 px-3 pb-6 pt-1 sm:px-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="playlist-name">Name</Label>
        <Input
          id="playlist-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My playlist"
          autoFocus
          className="h-11 text-base"
        />
      </div>

      <PlaylistFormCover
        id="playlist-cover"
        coverInputRef={coverInputRef}
        disabled={busy}
        displayUrl={filePreviewUrl}
        hasSavedCover={false}
        removalPending={false}
        hasNewFile={Boolean(coverFile)}
        onPickFiles={(f) => setCoverFile(f)}
        onDiscardNewFile={clearCoverSelection}
      />

      <div className="flex flex-col gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        <Button type="submit" disabled={busy} className="w-full sm:w-auto sm:min-w-[9rem]">
          {busy ? 'Creating…' : 'Create playlist'}
        </Button>
      </div>
    </form>
  );
}
