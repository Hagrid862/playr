import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists')({
  component: ArtistsLayout,
});

function ArtistsLayout() {
  const location = useLocation();
  const isCreate = location.pathname.includes('/create');
  const isIndex =
    location.pathname === '/app/library/artists' || location.pathname === '/app/library/artists/';

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={isCreate ? 'Create Artist' : 'Artists'}
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
