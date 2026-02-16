import { EditTrackForm } from '@/components/library/tracks/EditTrackForm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLibraryTrack } from '@/hooks/api/library-tracks/useLibraryTrack';
import { useUpdateLibraryTrack } from '@/hooks/api/library-tracks/useUpdateLibraryTrack';
import { CircleNotchIcon, InfoIcon } from '@phosphor-icons/react';
import { UpdateLibraryTrackRequest } from '@repo/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { toast } from 'sonner';

export const Route = createFileRoute('/app/library/albums/$id/songs/$songId/edit')({
  component: EditTrackPage,
});

function EditTrackPage() {
  const { id: albumId, songId } = Route.useParams();
  const queryClient = useQueryClient();

  const {
    data: trackResponse,
    isLoading: isTrackLoading,
    error: trackError,
  } = useLibraryTrack(songId);

  const { mutateAsync: updateTrack, isPending: isUpdating } = useUpdateLibraryTrack();

  const handleSubmit = async (values: UpdateLibraryTrackRequest) => {
    try {
      await updateTrack({ id: songId, data: values });
      toast.success('Track updated successfully');
      queryClient.invalidateQueries({ queryKey: ['library', 'albums', albumId] });
    } catch (error) {
      toast.error('Failed to update track');
      console.error(error);
    }
  };

  if (isTrackLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <CircleNotchIcon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (trackError || !trackResponse || !trackResponse.success || !trackResponse.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <p className="text-destructive">Failed to load track</p>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const track = trackResponse.data;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Alert className="bg-primary/5 border-primary/20">
        <InfoIcon size={20} className="text-primary" />
        <AlertTitle className="text-primary">Edit Track</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          Editing track <span className="font-medium text-foreground">{track.title}</span>. Update
          the details below.
        </AlertDescription>
      </Alert>

      <div className="px-1">
        <EditTrackForm
          track={track}
          albumId={albumId}
          isLoading={isUpdating}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
