import { EditArtistForm } from '@/components/artists/EditArtistForm';
import { useUpdateLibraryArtist } from '@/hooks/api/library-artists/useUpdateLibraryArtist';
import { useUploadLibraryArtistAvatar } from '@/hooks/api/library-artists/useUploadLibraryArtistAvatar';
import { useUploadLibraryArtistBanner } from '@/hooks/api/library-artists/useUploadLibraryArtistBanner';
import { useLibraryStore } from '@/stores/library.store';
import { UpdateLibraryArtistRequest } from '@repo/contracts';
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
  } = useUpdateLibraryArtist();

  const { mutateAsync: uploadAvatar, isPending: isUploadingAvatar } =
    useUploadLibraryArtistAvatar();
  const { mutateAsync: uploadBanner, isPending: isUploadingBanner } =
    useUploadLibraryArtistBanner();

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Artist not found</p>
      </div>
    );
  }

  const handleUpdate = async (data: UpdateLibraryArtistRequest, avatar?: File, banner?: File) => {
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
