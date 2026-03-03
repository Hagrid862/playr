import { BulkAlbumUploadForm } from '@/components/library/albums/bulk/BulkAlbumUploadForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLibraryStore } from '@/stores/library.store';
import { InfoIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/bulk-create')({
  component: BulkCreateAlbumPage,
});

function BulkCreateAlbumPage() {
  const libraryId = useLibraryStore((state) => state.libraryId);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Alert className="border-primary/20 bg-primary/5">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Create Album from MP3 Files</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Drop multiple audio files to create a new album. Metadata will be extracted from the
          files—you can edit album details and track info before uploading.
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

      <BulkAlbumUploadForm />
    </div>
  );
}
