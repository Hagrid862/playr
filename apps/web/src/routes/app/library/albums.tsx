import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums')({
  component: AlbumLayout,
});

function AlbumLayout() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const isIndex =
    location.pathname === '/app/library/albums' || location.pathname === '/app/library/albums/';
  const isCreate = segments.includes('create');
  const isEdit = segments.includes('edit');
  const isAddContent = segments.includes('add-content');
  const isDetail = segments.length >= 4 && !isCreate && !isEdit && !isAddContent;

  // The album ID is the 4th segment in /app/library/albums/$id/...
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
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={title}
        actions={
          isIndex ? (
            <Button variant="outline" asChild>
              <Link to="/app/library/albums/create">
                <PlusIcon />
                Add Album
              </Link>
            </Button>
          ) : album?.visibility === 'private' && isDetail && albumId ? (
            <Button variant="outline" asChild>
              <Link to="/app/library/albums/$id/add-content" params={{ id: albumId }}>
                <PlusIcon />
                Add Content
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
