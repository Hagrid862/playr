import { EditArtistForm } from '@/components/artists/EditArtistForm';
import { useUpdateArtist } from '@/hooks/api/artists/useUpdateArtist';
import { useLibraryStore } from '@/stores/library.store';
import { UpdateArtistRequest } from '@repo/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/artists/$id/edit')({
  component: EditArtistComponent,
});

function EditArtistComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const artist = useLibraryStore((state) => state.privateArtists.find((a) => a.id === id));
  const {
    mutateAsync: updateArtist,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateArtist();

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const handleUpdate = async (data: UpdateArtistRequest) => {
    try {
      await updateArtist({ id, data });
      navigate({ to: '/app/library/artists/$id', params: { id } });
    } catch (error) {
      console.error('Failed to update artist:', error);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/app/library/artists/$id', params: { id } });
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto py-8 px-4">
      <EditArtistForm
        artist={artist}
        isLoading={isUpdating}
        serverErrors={updateError?.status === 409 ? { name: updateError.message } : undefined}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
      />
    </div>
  );
}
