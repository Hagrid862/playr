import { CreateTrackForm } from '@/components/library/tracks/CreateTrackForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useCreateLibraryTrack } from '@/hooks/api/library-tracks/useCreateLibraryTrack';
import { useUploadTrackAudio } from '@/hooks/api/library-tracks/useUploadTrackAudio';
import { CircleNotchIcon, InfoIcon } from '@phosphor-icons/react';
import { CreateLibraryTrackRequest } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/albums/$id/add-content')({
  component: AddContentPage,
});

function AddContentPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: albumResponse, isLoading: isAlbumLoading, error: albumError } = useLibraryAlbum(id);

  const { mutateAsync: createTrack, isPending: isCreating } = useCreateLibraryTrack();
  const { mutateAsync: uploadAudio, isPending: isUploading } = useUploadTrackAudio();

  const handleSubmit = async (values: CreateLibraryTrackRequest, audioFile: File) => {
    try {
      const trackResponse = await createTrack(values);
      if (!trackResponse.success || !trackResponse.data) {
        throw new Error('Failed to create track metadata');
      }

      const track = trackResponse.data;
      toast.info('Uploading audio file...', { duration: 0, id: 'uploading-audio' });

      await uploadAudio({ trackId: track.id, file: audioFile });

      toast.dismiss('uploading-audio');
      toast.success('Track created and audio uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['library-albums', id] });
    } catch (error) {
      toast.dismiss('uploading-audio');
      toast.error('Failed to create track or upload audio');
      console.error(error);
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

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Alert className="bg-primary/5 border-primary/20">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Add Track to Album</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Adding track to album <span className="font-medium text-foreground">{album.name}</span>.
          Fill in the details below to add a new song to this album.
        </AlertDescription>
      </Alert>

      <div className="px-1">
        <CreateTrackForm
          album={album}
          isLoading={isCreating || isUploading}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
