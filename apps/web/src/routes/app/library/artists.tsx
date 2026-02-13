import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists')({
  component: ArtistsLayout,
});

function ArtistsLayout() {
  const location = useLocation();
  const isCreate = location.pathname.endsWith('/create');
  const isEdit = location.pathname.endsWith('/edit');
  const isIndex =
    location.pathname === '/app/library/artists' || location.pathname === '/app/library/artists/';
  const isDetail = !isIndex && !isCreate && !isEdit;

  // Extract ID: /app/library/artists/$id or /app/library/artists/$id/edit
  const segments = location.pathname.split('/');
  const artistId = isEdit
    ? segments[segments.length - 2]
    : isDetail
      ? segments[segments.length - 1]
      : null;

  const artistName = useLibraryStore((state) =>
    isDetail || isEdit ? state.privateArtists.find((a) => a.id === artistId)?.name : null,
  );

  const title = isCreate
    ? 'Create Artist'
    : isEdit
      ? `Edit ${artistName ?? 'Artist'}`
      : isDetail
        ? (artistName ?? 'Artist Detail')
        : 'Artists';

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={title}
        actions={
          isIndex ? (
            <Button variant="outline" asChild>
              <Link to="/app/library/artists/create">
                <PlusIcon />
                Add Artist
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
