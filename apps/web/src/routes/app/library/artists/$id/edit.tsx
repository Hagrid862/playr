import { EditArtistForm } from '@/components/artists/EditArtistForm';
import { useUpdateArtist } from '@/hooks/api/artists/useUpdateArtist';
import { useUploadArtistAvatar } from '@/hooks/api/artists/useUploadArtistAvatar';
import { useUploadArtistBanner } from '@/hooks/api/artists/useUploadArtistBanner';
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

  const { mutateAsync: uploadAvatar, isPending: isUploadingAvatar } = useUploadArtistAvatar();
  const { mutateAsync: uploadBanner, isPending: isUploadingBanner } = useUploadArtistBanner();

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const handleUpdate = async (data: UpdateArtistRequest, avatar?: File, banner?: File) => {
    try {
      // First update artist data
      await updateArtist({ id, data });

      // If data update was successful, upload images in parallel (or sequential)
      // I'll do Promise.all for better performance if they are independent
      const uploads = [];
      if (avatar) {
        uploads.push(uploadAvatar({ id, file: avatar }));
      }
      if (banner) {
        uploads.push(uploadBanner({ id, file: banner }));
      }

      if (uploads.length > 0) {
        await Promise.all(uploads);
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
        isLoading={isUpdating || isUploadingAvatar || isUploadingBanner}
        serverErrors={updateError?.status === 409 ? { name: updateError.message } : undefined}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
      />
    </div>
  );
}
