import { PlaylistEditHero } from '@/components/playlists/PlaylistEditHero';
import { PlaylistEditTrackList } from '@/components/playlists/PlaylistEditTrackList';
import { usePlaylistEditDraft } from '@/components/playlists/playlist-edit-draft.context';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { PlaylistSystemRole } from '@repo/db';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/playlists/$playlistId/edit')({
  component: RouteComponent,
});

function RouteComponent() {
  const { playlistId } = Route.useParams();
  const navigate = useNavigate();
  const { detail, isLoading, initialSnapshot } = usePlaylistEditDraft();

  useEffect(() => {
    if (!detail) return;
    if (detail.systemRole === PlaylistSystemRole.favorites) {
      toast.error('You cannot edit the favorites playlist');
      void navigate({ to: '/app/playlists/$playlistId', params: { playlistId } });
    }
  }, [detail, navigate, playlistId]);

  if (isLoading || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground animate-pulse">Loading playlist…</p>
      </div>
    );
  }

  if (detail.systemRole === PlaylistSystemRole.favorites) {
    return null;
  }

  if (!initialSnapshot) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Spinner className="size-8" />
        <p className="text-muted-foreground animate-pulse">Loading playlist…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full pb-8">
      <PlaylistEditHero />
      <Separator className="mt-10 mx-6 opacity-50" />
      <div className="mt-12">
        <PlaylistEditTrackList />
      </div>
    </div>
  );
}
