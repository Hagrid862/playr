import { EditAlbumForm } from '@/components/library/albums/edit/EditAlbumForm';
import { useDeleteLibraryAlbumCover } from '@/hooks/api/library-albums/useDeleteLibraryAlbumCover';
import { useLibraryAlbum } from '@/hooks/api/library-albums/useLibraryAlbum';
import { useUpdateLibraryAlbum } from '@/hooks/api/library-albums/useUpdateLibraryAlbum';
import { useUploadLibraryAlbumCover } from '@/hooks/api/library-albums/useUploadLibraryAlbumCover';
import type { UpdateLibraryAlbumRequest } from '@repo/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/app/library/albums/$id/edit')({
  component: EditAlbumComponent,
});

function EditAlbumComponent() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const { data: albumResponse, isLoading: isLoadingAlbum } = useLibraryAlbum(id);
  const {
    mutateAsync: updateAlbum,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateLibraryAlbum();
  const { mutateAsync: uploadCover, isPending: isUploadingCover } = useUploadLibraryAlbumCover();
  const { mutateAsync: deleteCover, isPending: isDeletingCover } = useDeleteLibraryAlbumCover();

  const album = albumResponse?.data;

  if (isLoadingAlbum) {
    return (
      <div className="flex flex-col gap-8 max-w-3xl mx-auto py-8 px-4 animate-pulse">
        <div className="h-64 bg-stone-800 rounded-2xl" />
        <div className="h-48 bg-stone-800 rounded-2xl" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Album not found</p>
      </div>
    );
  }

  const handleUpdate = async (
    data: UpdateLibraryAlbumRequest,
    cover?: File,
    shouldDeleteCover?: boolean,
  ) => {
    try {
      if (shouldDeleteCover) {
        await deleteCover({ id });
      } else if (cover) {
        await uploadCover({ id, file: cover });
      }

      await updateAlbum({ id, data });

      navigate({ to: '/app/library/albums/$id', params: { id } });
    } catch (error) {
      console.error('Failed to update album:', error);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/app/library/albums/$id', params: { id } });
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto py-8 px-4">
      <EditAlbumForm
        album={album}
        isLoading={isUpdating || isUploadingCover || isDeletingCover}
        serverErrors={updateError?.status === 409 ? { name: updateError.message } : undefined}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
      />
    </div>
  );
}
