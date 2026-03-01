import {
  BulkTrackUploadForm,
  type BulkTrackItem,
} from '@/components/library/tracks/BulkTrackUploadForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { CircleNotchIcon, InfoIcon } from '@phosphor-icons/react';
import { createFileRoute, Link } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/$id/add-content/bulk')({
  component: BulkAddContentPage,
});

function BulkAddContentPage() {
  const { id } = Route.useParams();
  const { data: albumResponse, isLoading: isAlbumLoading, error: albumError } =
    useLibraryAlbum(id);

  const handleSubmit = (tracks: BulkTrackItem[]) => {
    console.log('Bulk upload submitted:', tracks);
  };

  if (isAlbumLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CircleNotchIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (albumError || !albumResponse || !albumResponse.success || !albumResponse.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">Failed to load album</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const album = albumResponse.data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Alert className="border-primary/20 bg-primary/5">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Bulk Add Tracks to Album</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="mb-2">
            Adding tracks to album{' '}
            <span className="font-medium text-foreground">{album.name}</span>. Drop
            or select multiple audio files, then edit details for each track.
          </div>

          <Button variant="outline" asChild>
            <Link to="..">Switch to single upload</Link>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="px-1">
        <BulkTrackUploadForm album={album} onSubmit={handleSubmit} />
      </div>
    </div>
  );
}
