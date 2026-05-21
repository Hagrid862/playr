import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import {
  PlaylistEditDraftProvider,
  usePlaylistEditDraft,
} from '@/components/playlists/playlist-edit-draft.context';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/playlists')({
  component: PlaylistsLayout,
});

function PlaylistsEditHeaderShell({ title }: { title: string }) {
  const { cancel, save, isDirty, isSaving, handleBackRequest } = usePlaylistEditDraft();

  return (
    <PageHeader
      title={title}
      showBackButton
      onBackClick={handleBackRequest}
      actions={
        <>
          <Button type="button" variant="outline" disabled={isSaving} onClick={cancel}>
            Cancel
          </Button>
          <Button type="button" disabled={!isDirty || isSaving} onClick={() => void save()}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    />
  );
}

function PlaylistsLayout() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isIndex = location.pathname === '/app/playlists' || location.pathname === '/app/playlists/';
  const isCreate = segments.includes('create');
  const isEdit = segments.includes('edit');
  const playlistId =
    segments.length >= 3 && segments[0] === 'app' && segments[1] === 'playlists' && !isCreate
      ? segments[2]
      : null;

  const { data: playlistsResponse } = useLibraryPlaylists();
  const playlistName = playlistId
    ? playlistsResponse?.data?.items.find((p) => p.id === playlistId)?.name
    : null;

  const title = isCreate
    ? 'New playlist'
    : isEdit
      ? 'Edit playlist'
      : playlistId
        ? (playlistName ?? 'Playlist')
        : 'All Playlists';

  if (isEdit && playlistId) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <PlaylistEditDraftProvider key={playlistId} playlistId={playlistId}>
          <PlaylistsEditHeaderShell title={title} />
          <div className="flex-1">
            <Outlet />
          </div>
        </PlaylistEditDraftProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={title}
        actions={
          isIndex ? (
            <Button variant="outline" asChild>
              <Link to="/app/playlists/create">
                <PlusIcon />
                New playlist
              </Link>
            </Button>
          ) : null
        }
        showBackButton={!isIndex}
      />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
