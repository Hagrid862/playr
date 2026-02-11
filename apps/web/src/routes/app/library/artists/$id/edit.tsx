import { EditArtistForm } from '@/components/artists/EditArtistForm';
import { useUpdateArtist } from '@/hooks/api/artists/useUpdateArtist';
import { useUploadArtistAvatar } from '@/hooks/api/artists/useUploadArtistAvatar';
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

  const { mutateAsync: uploadAvatar, isPending: isUploading } = useUploadArtistAvatar();

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const handleUpdate = async (data: UpdateArtistRequest, avatar?: File) => {
    try {
      // First update artist data
      await updateArtist({ id, data });

      // If data update was successful and we have a new avatar, upload it
      if (avatar) {
        await uploadAvatar({ id, file: avatar });
      }

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
        isLoading={isUpdating || isUploading}
        serverErrors={updateError?.status === 409 ? { name: updateError.message } : undefined}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
      />
    </div>
  );
}
