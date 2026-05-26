import { SubHeader } from '@/components/app/SubHeader';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { CompactSearch } from '@/components/search/CompactSearch.tsx';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';

export const Route = createFileRoute('/app/library/albums')({
  component: AlbumLayout,
});

function AlbumLayout() {
  usePersistentNavigation('albums', '/app/library/albums');
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const isIndex =
    location.pathname === '/app/library/albums' || location.pathname === '/app/library/albums/';
  const isCreate = segments.includes('create');
  const isEdit = segments.includes('edit');
  const isAddContent = segments.includes('add-content');
  const isDetail = segments.length >= 4 && !isCreate && !isEdit && !isAddContent;

  const albumId = segments.length >= 4 ? segments[3] : null;

  const album = useLibraryStore((state) =>
    albumId ? state.privateAlbums.find((a) => a.id === albumId) : null,
  );

  const title = isCreate
    ? 'Create Album'
    : isEdit
      ? `Edit ${album?.name ?? 'Album'}`
      : isAddContent
        ? 'Add Content'
        : isDetail
          ? (album?.name ?? 'Album Detail')
          : 'Albums';

  return (
    <div className="flex flex-col h-full w-full">
      <SubHeader
        title={title}
        search={<CompactSearch category="album" />}
        showBackButton={!isIndex}
        actions={
          <>
            {isIndex && (
              <Button variant="outline" className="h-7" asChild>
                <Link to="/app/library/albums/create">
                  <PlusIcon size={12} className="mr-1" />
                  Add Album
                </Link>
              </Button>
            )}
            {album?.visibility === 'private' && isDetail && albumId && (
              <Button variant="outline" className="h-7" asChild>
                <Link to="/app/library/albums/$id/add-content" params={{ id: albumId }}>
                  <PlusIcon size={12} className="mr-1" />
                  Add Content
                </Link>
              </Button>
            )}
          </>
        }
      />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
