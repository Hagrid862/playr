import { Button } from '@/components/ui/button';
import {
  PlaylistEditDraftProvider,
  usePlaylistEditDraft,
} from '@/components/playlists/playlist-edit-draft.context';
import { Outlet, createFileRoute, useLocation, Link } from '@tanstack/react-router';
import { SubHeader } from '@/components/app/SubHeader.tsx';
import { PlusIcon } from '@phosphor-icons/react';
import { CompactSearch } from '@/components/search/CompactSearch.tsx';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';

export const Route = createFileRoute('/app/playlists')({
  component: PlaylistsLayout,
  staticData: {
    title: 'Playlists',
    description: 'Library',
  },
});

const addPlaylistButton = (
  <Button variant="outline" className="h-7" asChild>
    <Link to="/app/playlists/create">
      <PlusIcon />
      New playlist
    </Link>
  </Button>
);

function PlaylistsEditActions() {
  const { cancel, save, isDirty, isSaving } = usePlaylistEditDraft();

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" disabled={isSaving} onClick={cancel}>
        Cancel
      </Button>
      <Button type="button" disabled={!isDirty || isSaving} onClick={() => void save()}>
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
    </div>
  );
}

function PlaylistsLayout() {
  usePersistentNavigation('playlists', '/app/playlists');
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isIndex =
    segments.length === 3 &&
    segments[0] === 'app' &&
    segments[1] === 'library' &&
    segments[2] === 'artists';
  const isCreate = segments.includes('create');
  const isEdit = segments.includes('edit');
  const playlistId =
    segments.length >= 3 && segments[0] === 'app' && segments[1] === 'playlists' && !isCreate
      ? segments[2]
      : null;

  if (isEdit && playlistId) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <PlaylistEditDraftProvider key={playlistId} playlistId={playlistId}>
          <div className="flex justify-end mb-4">
            <PlaylistsEditActions />
          </div>
          <div className="flex-1">
            <Outlet />
          </div>
        </PlaylistEditDraftProvider>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SubHeader
        title="Playlists"
        search={<CompactSearch category="playlist" />}
        actions={addPlaylistButton}
        showBackButton={!isIndex}
      />
      <Outlet />
    </div>
  );
}
