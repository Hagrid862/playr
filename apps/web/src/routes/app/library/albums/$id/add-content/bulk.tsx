import { BulkTrackUploadForm } from '@/components/library/tracks/bulk/BulkTrackUploadForm';
import type { BulkTrackItem } from '@/lib/types/library';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import { useBulkCreateLibraryTracks } from '@/hooks/api/library-tracks/useBulkCreateLibraryTracks';
import { useLibraryGenres } from '@/hooks/api/library-genres/useLibraryGenres';
import { CircleNotchIcon, InfoIcon } from '@phosphor-icons/react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { useMemo, useState, useCallback } from 'react';
import type { ZodGenreInfer } from '@repo/contracts';

export const Route = createFileRoute('/app/library/albums/$id/add-content/bulk')({
  component: BulkAddContentPage,
});

function BulkAddContentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: albumResponse, isLoading: isAlbumLoading, error: albumError } = useLibraryAlbum(id);
  const { mutateAsync: bulkCreateTracks, isPending: isUploading } = useBulkCreateLibraryTracks();
  const { mutateAsync: uploadCover, isPending: isUploadingCover } = useUploadLibraryAlbumCover();

  const handleSubmit = async (tracks: BulkTrackItem[], selectedCover: File | null) => {
    if (!albumResponse?.success || !albumResponse?.data) return;
    const album = albumResponse.data;

    try {
      if (selectedCover) {
        await uploadCover({ id, file: selectedCover });
        toast.success('Album cover updated');
      }

      await bulkCreateTracks({ album, tracks });
      toast.success(
        `Successfully uploaded ${tracks.length} track${tracks.length !== 1 ? 's' : ''}`,
      );
      navigate({ to: '/app/library/albums/$id', params: { id } });
    } catch (error) {
      toast.error('Failed to upload tracks. Please try again.');
      console.error(error);
      throw error;
    }
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

  const { data: genresResponse, isLoading: isLoadingGenres } = useLibraryGenres({
    page: 1,
    limit: 100,
  });
  const genres = useMemo<ZodGenreInfer[]>(() => genresResponse?.data?.items ?? [], [genresResponse]);
  const [pendingGenres, _setPendingGenres] = useState<{ id: string; name: string }[]>([]);

  const handleRequestCreateGenre = useCallback((_onCreated: (genreId: string) => void) => {
    // Currently BulkAddContentPage doesn't have the genre creation modal built-in
    // we'll just log an error or we can implement the modal here too.
    // However, it's out of scope for now if it doesn't have the modal.
    // For type safety, we provide the callback prop.
    console.warn("Genre creation is not supported directly in the bulk upload route yet");
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Alert className="border-primary/20 bg-primary/5">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Bulk Add Tracks to Album</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <div className="mb-2">
            Adding tracks to album <span className="font-medium text-foreground">{album.name}</span>
            . Drop or select multiple audio files, then edit details for each track.
          </div>

          <Button variant="outline" asChild>
            <Link to="..">Switch to single upload</Link>
          </Button>
        </AlertDescription>
      </Alert>

      <div className="px-1">
        <BulkTrackUploadForm
          album={album}
          onSubmit={handleSubmit}
          isLoading={isUploading || isUploadingCover}
          genres={genres}
          pendingGenres={pendingGenres}
          isLoadingGenres={isLoadingGenres}
          onRequestCreateGenre={handleRequestCreateGenre}
        />
      </div>
    </div>
  );
}
