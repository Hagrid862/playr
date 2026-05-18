import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useLibraryPlaylists } from '@/hooks/api/library-playlists/useLibraryPlaylists';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/playlists')({
  component: PlaylistsLayout,
});

function PlaylistsLayout() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isIndex =
    location.pathname === '/app/playlists' || location.pathname === '/app/playlists/';
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
