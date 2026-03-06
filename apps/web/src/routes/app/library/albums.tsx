import { PageHeader } from '@/components/app/PageHeader';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLibraryStore } from '@/stores/library.store';
import { CaretDownIcon, PlusIcon, PlusSquareIcon } from '@phosphor-icons/react';
import { Link, Outlet, createFileRoute, useLocation } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums')({
  component: AlbumLayout,
});

function AlbumLayout() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const isIndex =
    location.pathname === '/app/library/albums' || location.pathname === '/app/library/albums/';
  const isBulkCreate = segments.includes('bulk-create');
  const isCreate = segments.includes('create');
  const isEdit = segments.includes('edit');
  const isAddContent = segments.includes('add-content');
  const isDetail = segments.length >= 4 && !isCreate && !isEdit && !isAddContent;

  // The album ID is the 4th segment in /app/library/albums/$id/...
  const albumId = segments.length >= 4 ? segments[3] : null;

  const album = useLibraryStore((state) =>
    albumId ? state.privateAlbums.find((a) => a.id === albumId) : null,
  );

  const title = isBulkCreate
    ? 'Bulk Create Album'
    : isCreate
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
            <ButtonGroup>
              <Button variant="outline" asChild>
                <Link to="/app/library/albums/$id/add-content" params={{ id: albumId }}>
                  <PlusIcon />
                  Add Content
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <CaretDownIcon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/app/library/albums/$id/add-content/bulk" params={{ id: albumId }}>
                      <PlusSquareIcon size={18} className="mr-2" />
                      Bulk Upload
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
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
