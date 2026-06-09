import { Button } from '@/components/ui/button';
import { useLibraryStore } from '@/stores/library.store';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';
import { SubHeader } from '@/components/app/SubHeader.tsx';
import { CompactSearch } from '@/components/search/CompactSearch.tsx';
import { usePersistentNavigation } from '@/hooks/usePersistentNavigation';

export const Route = createFileRoute('/app/library/artists')({
  component: ArtistsLayout,
});

function ArtistsLayout() {
  usePersistentNavigation('artists', '/app/library/artists');
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isIndex =
    segments.length === 3 &&
    segments[0] === 'app' &&
    segments[1] === 'library' &&
    segments[2] === 'artists';
  const isCreate = segments[3] === 'create';
  const isEdit = segments[segments.length - 1] === 'edit';
  const isAddContent = segments.includes('add-content');
  const isDetail =
    !isIndex &&
    !isCreate &&
    !isEdit &&
    !isAddContent &&
    segments[2] === 'artists' &&
    Boolean(segments[3]) &&
    segments[3] !== 'create' &&
    segments.length === 4;

  const artistId =
    segments[2] === 'artists' && segments[3] && segments[3] !== 'create'
      ? isEdit
        ? segments[segments.length - 2]
        : segments[3]
      : null;

  const artist = useLibraryStore((state) =>
    isDetail || isEdit || isAddContent ? state.privateArtists.find((a) => a.id === artistId) : null,
  );

  const title = isCreate
    ? 'Create Artist'
    : isEdit
      ? `Edit ${artist?.name ?? 'Artist'}`
      : isAddContent
        ? 'Create Album'
        : isDetail
          ? (artist?.name ?? 'Artist Detail')
          : 'Artists';

  return (
    <div className="flex flex-col gap-4">
      <SubHeader
        title={title}
        search={<CompactSearch category="artist" />}
        actions={
          <Button variant="outline" className="h-7" asChild>
            <Link to="/app/library/artists/create">
              <PlusIcon />
              Add Content
            </Link>
          </Button>
        }
        showBackButton={!isIndex}
      />
      <Outlet />
    </div>
  );
}
