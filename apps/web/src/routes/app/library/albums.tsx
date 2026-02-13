import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums')({
  component: AlbumLayout,
});

function AlbumLayout() {
  const location = useLocation();
  const isIndex =
    location.pathname === '/app/library/albums' || location.pathname === '/app/library/albums/';
  const isEdit = location.pathname.endsWith('/edit');

  const title = isEdit ? 'Edit Album' : 'Albums';

  return (
    <div className="flex flex-col gap-4 p-4">
      <PageHeader
        title={title}
        actions={
          isIndex && (
            <Button variant="outline" asChild>
              <Link to="/app/library/albums/create">
                <PlusIcon />
                Add Content
              </Link>
            </Button>
          )
        }
        showBackButton={!isIndex}
      />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
