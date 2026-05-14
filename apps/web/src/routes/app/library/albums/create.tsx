import { LibraryAlbumFromFilesForm } from '@/components/library/albums/create/LibraryAlbumFromFilesForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLibraryStore } from '@/stores/library.store';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

type AlbumsCreateSearch = {
  artistId?: string;
};

export const Route = createFileRoute('/app/library/albums/create')({
  validateSearch: (raw: Record<string, unknown>): AlbumsCreateSearch => ({
    artistId: typeof raw.artistId === 'string' ? raw.artistId : undefined,
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { artistId } = Route.useSearch();
  const libraryId = useLibraryStore((state) => state.libraryId);

  return (
    <div className="-mx-4 flex max-lg:h-full min-h-0 w-[calc(100%+2rem)] min-w-0 flex-col gap-6 overflow-y-auto px-4 pb-6 md:pb-8 lg:h-[calc(100dvh-15rem)] lg:max-h-[calc(100dvh-15rem)] lg:min-h-[calc(100dvh-15rem)] lg:px-6 xl:px-8">
      <div className="mx-auto flex min-h-0 w-full min-w-0 max-w-[1920px] flex-col gap-6 overflow-visible lg:flex-1 lg:min-h-0">
        <div className="flex shrink-0 flex-col gap-2">
          <Alert className="border-primary/20 bg-primary/5">
            <AlertTitle className="text-primary">Create album with tracks</AlertTitle>
            <AlertDescription className="text-muted-foreground">
              Fill in album details, then add audio files. Metadata and embedded artwork are read
              automatically; you can edit everything before publishing.
            </AlertDescription>
          </Alert>

          {!libraryId && (
            <Alert variant="destructive">
              <WarningCircleIcon size={20} />
              <AlertTitle>Library unavailable</AlertTitle>
              <AlertDescription>
                Your library is not ready yet. Please try again later.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <LibraryAlbumFromFilesForm cancelTo="/app/library/albums" initialArtistId={artistId} />
      </div>
    </div>
  );
}
